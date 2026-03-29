import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkToolAccess } from '@/lib/toolAccess';
import { validateCsrf } from '@/lib/csrf';
import { incrementToolStat } from '@/lib/toolStats';
import { parseAiJson } from '@/lib/parseAiJson';
import { STANDARD_MODEL } from '@/lib/models';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const access = checkToolAccess(req, 'contract');
  if (access.status === 'email_gate') {
    return NextResponse.json(
      { error: 'Daily limit reached. Verify your email for 20 uses per day.', code: 'email_gate' },
      { status: 402 }
    );
  }
  if (access.status === 'capped') {
    return NextResponse.json(
      { error: 'Daily limit reached. Resets at midnight.', code: 'capped' },
      { status: 429 }
    );
  }

  const csrfValid = await validateCsrf(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { text, context, role } = body as {
      text?: string;
      context?: string;
      role?: string;
    };

    const validRoles = ['business', 'customer', 'employee'];

    if (!text || text.length < 10 || text.length > 8000) {
      return NextResponse.json(
        { error: 'Text must be between 10 and 8,000 characters.' },
        { status: 400 }
      );
    }

    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Role must be one of: business, customer, employee.' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a contract analysis AI for Australian users. Analyse the provided contract text from the perspective of the specified role. Use plain English. This is not legal advice.

Return valid JSON only — no markdown, no backticks, no explanation.

Return exactly this structure:
{
  "plainEnglish": "string — plain English explanation of what this contract text means",
  "risks": [
    {
      "risk": "string — short name of the risk",
      "severity": "High" | "Medium" | "Low",
      "explanation": "string — what this means in practice"
    }
  ],
  "redFlags": ["string", "..."],
  "missingProtections": ["string", "..."],
  "negotiationPoints": ["string", "..."],
  "overallAssessment": "Fair" | "Somewhat one-sided" | "One-sided" | "Heavily one-sided",
  "disclaimer": "string — standard disclaimer that this is not legal advice"
}

Rules:
- Analyse from the stated role's perspective (business owner, customer, or employee)
- Be practical and specific — avoid vague warnings
- Red flags are clauses that significantly disadvantage the stated role
- Missing protections are standard clauses that should be present but aren't
- Negotiation points are reasonable changes to request
- Australian law context where relevant
- Always include a clear disclaimer that this is not legal advice`;

    const userMessage = `Role: ${role}${context ? `\nContext: ${context}` : ''}\n\nContract text:\n${text}`;

    const response = await client.messages.create({
      model: STANDARD_MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const rawText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    console.log(
      JSON.stringify({
        tool: 'contract',
        usage: response.usage,
        timestamp: new Date().toISOString(),
      })
    );

    let result;
    try {
      result = parseAiJson(rawText);
      incrementToolStat('contracts');
    } catch (parseErr) {
      console.error('Failed to parse AI response:', parseErr instanceof Error ? parseErr.message : parseErr);
      console.error('Raw AI text:', rawText);
      return NextResponse.json({ error: 'Invalid response format. Please try again.' }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Contract API error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Contract analysis failed. Please try again.' }, { status: 500 });
  }
}

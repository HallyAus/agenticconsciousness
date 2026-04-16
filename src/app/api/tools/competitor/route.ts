import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkToolAccess } from '@/lib/toolAccess';
import { validateCsrf } from '@/lib/csrf';
import { incrementToolStat } from '@/lib/toolStats';
import { parseAiJson } from '@/lib/parseAiJson';
import { STANDARD_MODEL, getClient } from '@/lib/models';

export async function POST(req: NextRequest) {
  const csrfValid = await validateCsrf(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Your session has expired. Refresh the page and try again.' }, { status: 403 });
  }

  const access = await checkToolAccess(req, 'competitor');
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

  try {
    const body = await req.json();
    const { companyName, context, yourCompany } = body as {
      companyName?: string;
      context?: string;
      yourCompany?: string;
    };

    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
    }

    if (companyName.length < 2 || companyName.length > 200) {
      return NextResponse.json(
        { error: 'Company name must be between 2 and 200 characters.' },
        { status: 400 }
      );
    }

    if (context && context.length > 1000) {
      return NextResponse.json(
        { error: 'Context must be 1,000 characters or less.' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a competitive intelligence analyst specialising in Australian and global markets. Analyse the given company and provide strategic insights.

Return valid JSON only — no markdown, no backticks, no explanation.

Return exactly this structure:
{
  "companyName": "string — normalised company name",
  "positioning": "string — 2-3 sentences describing how they position themselves in the market",
  "strengths": [
    "string — specific, substantive strength",
    "string",
    "string"
  ],
  "weaknesses": [
    "string — specific, substantive weakness or vulnerability",
    "string",
    "string"
  ],
  "pricingStrategy": "string — 2-3 sentences on their pricing approach (premium/value/freemium/etc)",
  "differentiationOpportunities": [
    "string — specific opportunity to differentiate from this competitor",
    "string",
    "string",
    "string"
  ],
  "aiAdvantage": "string — 2-3 sentences specifically on where AI could give an edge over this competitor",
  "confidenceLevel": "High" or "Medium" or "Low"
}

Rules:
- Be specific and substantive — generic observations are useless
- Base analysis on publicly known information about the company
- If the company is obscure or you have limited data, set confidenceLevel to "Low" and be transparent about uncertainty
- Differentiation opportunities should be actionable, not vague
- Australian English spelling
- If yourCompany is provided, tailor the differentiation opportunities specifically to their context`;

    const userContent = `Company to analyse: ${companyName}
${context ? `Additional context: ${context}` : ''}
${yourCompany ? `My company (for tailored insights): ${yourCompany}` : ''}`;

    const client = getClient();
    const response = await client.messages.create({
      model: STANDARD_MODEL,
      max_tokens: 1000,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const cacheRead = response.usage.cache_read_input_tokens ?? 0;
    const cacheWrite = response.usage.cache_creation_input_tokens ?? 0;
    const isHit = cacheRead > 0;
    console.log(
      `[CACHE${isHit ? ' HIT' : ''}] model=${STANDARD_MODEL} input=${response.usage.input_tokens} cache_write=${cacheWrite} cache_read=${cacheRead} output=${response.usage.output_tokens}${isHit ? ' savings=~90%' : ''}`
    );
    console.log(
      JSON.stringify({
        tool: 'competitor',
        usage: response.usage,
        cache_read_input_tokens: cacheRead,
        cache_creation_input_tokens: cacheWrite,
        timestamp: new Date().toISOString(),
      })
    );

    let result;
    try {
      result = parseAiJson(rawText);
      await incrementToolStat('competitors');
    } catch (parseErr) {
      console.error('Failed to parse AI response:', parseErr instanceof Error ? parseErr.message : parseErr);
      console.error('Raw AI text:', rawText);
      return NextResponse.json({ error: 'The AI produced an unexpected response. Try again or simplify your input.' }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Competitor API error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Competitor analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}

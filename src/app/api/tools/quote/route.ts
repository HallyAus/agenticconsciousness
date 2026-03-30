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

  const access = checkToolAccess(req, 'quote');
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
    const { businessName, clientName, industry, jobDescription, estimatedValue, type } = body as {
      businessName?: string;
      clientName?: string;
      industry?: string;
      jobDescription?: string;
      estimatedValue?: string;
      type?: string;
    };

    if (!businessName || !clientName || !jobDescription) {
      return NextResponse.json(
        { error: 'Business name, client name, and job description are required.' },
        { status: 400 }
      );
    }

    if (jobDescription.length < 10 || jobDescription.length > 3000) {
      return NextResponse.json(
        { error: 'Job description must be between 10 and 3,000 characters.' },
        { status: 400 }
      );
    }

    // Normalise type — ToggleGroup may send "Simple Quote" or "Detailed Proposal"
    const normalizedType = (type || '').toLowerCase();
    const isDetailed = normalizedType === 'detailed' || normalizedType === 'detailed proposal';

    const systemPrompt = `You are a professional quote generator for Australian businesses. Generate a realistic, professional quote based on the job description provided.

Return valid JSON only — no markdown, no backticks, no explanation.

Return exactly this structure:
{
  "reference": "QUO-XXXXXX — a 6-digit random number",
  "date": "today's date in DD/MM/YYYY format",
  "validUntil": "30 days from today in DD/MM/YYYY format",
  "businessName": "string",
  "clientName": "string",
  "scopeOfWork": "${isDetailed ? 'Detailed 3-5 paragraph description of scope, deliverables, timeline, and methodology' : '2-3 sentence summary of the scope of work'}",
  "lineItems": [
    {
      "description": "string — ${isDetailed ? 'detailed description of each deliverable' : 'concise item name'}",
      "qty": "number as string",
      "unit": "hr, day, item, lot, etc.",
      "unitPrice": "number as string — realistic AUD amount",
      "amount": "number as string — qty × unitPrice"
    }
  ],
  "subtotal": "number as string — sum of all amounts",
  "gst": "number as string — 10% of subtotal",
  "total": "number as string — subtotal + gst",
  "terms": [
    "${isDetailed ? '5-6 professional payment and delivery terms' : '3-4 standard terms'}"
  ],
  "nextSteps": [
    "${isDetailed ? '4-5 specific next steps with rough timeframes' : '2-3 clear next steps'}"
  ]
}

Rules:
- Generate realistic pricing for the Australian market
- Line items should be specific and professional
- ${isDetailed ? 'Provide comprehensive detail — this is a formal proposal document' : 'Keep it concise and clear — this is a simple quote'}
- If an estimated value is provided, use it to calibrate pricing (but break it into line items that add up plausibly)
- Australian English spelling
- All monetary values in AUD
- Do not include dollar signs in the number fields — just numbers with 2 decimal places`;

    const userContent = `Business: ${businessName}
Client: ${clientName}
Industry: ${industry || 'Not specified'}
Job Description: ${jobDescription}
${estimatedValue ? `Estimated Value: ${estimatedValue}` : ''}
Quote Type: ${isDetailed ? 'Detailed Proposal' : 'Simple Quote'}`;

    const client = getClient();
    const response = await client.messages.create({
      model: STANDARD_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    console.log(
      JSON.stringify({
        tool: 'quote',
        usage: response.usage,
        timestamp: new Date().toISOString(),
      })
    );

    let result;
    try {
      result = parseAiJson(rawText);
      incrementToolStat('quotes');
    } catch (parseErr) {
      console.error('Failed to parse AI response:', parseErr instanceof Error ? parseErr.message : parseErr);
      console.error('Raw AI text:', rawText);
      return NextResponse.json({ error: 'The AI produced an unexpected response. Try again or simplify your input.' }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Quote API error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Quote generation failed. Please try again.' }, { status: 500 });
  }
}

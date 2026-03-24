import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rateLimit.retryAfter}s.` },
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

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    console.log(
      JSON.stringify({
        tool: 'competitor',
        usage: response.usage,
        timestamp: new Date().toISOString(),
      })
    );

    const result = JSON.parse(rawText);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Competitor API error:', error);
    return NextResponse.json(
      { error: 'Competitor analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}

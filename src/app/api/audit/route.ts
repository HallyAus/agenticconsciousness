import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateCsrf } from '@/lib/csrf';
import { parseAiJson } from '@/lib/parseAiJson';
import { STANDARD_MODEL } from '@/lib/models';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const VALID_INDUSTRIES = ['Manufacturing', 'Professional Services', 'Construction & Trades', 'Healthcare', 'Retail & E-commerce', 'Finance & Insurance', 'Education', 'Hospitality & Tourism', 'Technology', 'Government', 'Transport & Logistics', 'Agriculture', 'Other'];
const VALID_SIZES = ['Solo / Freelancer', '2-10 employees', '11-50 employees', '51-200 employees', '200+ employees'];

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${retryAfter}s.` },
      { status: 429 }
    );
  }

  const csrfValid = await validateCsrf(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Your session has expired. Refresh the page and try again.' }, { status: 403 });
  }

  try {
    const { industry, businessSize, painPoint } = await req.json();

    if (!industry || !businessSize || !painPoint) {
      return NextResponse.json({ error: 'Select your industry, business size, and describe your pain point.' }, { status: 400 });
    }

    if (!VALID_INDUSTRIES.includes(industry)) {
      return NextResponse.json({ error: 'Select an industry from the list.' }, { status: 400 });
    }
    if (!VALID_SIZES.includes(businessSize)) {
      return NextResponse.json({ error: 'Select a business size from the list.' }, { status: 400 });
    }

    if (painPoint.length > 500) {
      return NextResponse.json({ error: 'Keep your pain point under 500 characters.' }, { status: 400 });
    }

    const auditSystemPrompt = `You are the AI analyst for Agentic Consciousness, an Australian AI consulting company.

Given a business profile, produce an "AI Opportunity Snapshot" — exactly 3 opportunities where AI could create measurable impact for this specific business.

Format your response as valid JSON only, no markdown, no backticks:
{
  "headline": "A punchy 5-8 word headline summarising the biggest opportunity",
  "opportunities": [
    {
      "title": "Short opportunity title (3-5 words)",
      "description": "2-3 sentences explaining what AI could do here and the expected impact. Be specific to their industry and pain point. Include a rough estimate of time/cost savings where possible.",
      "impact": "High | Medium",
      "timeframe": "Quick win (1-2 weeks) | Medium term (1-2 months) | Strategic (3+ months)"
    }
  ],
  "nextStep": "A single compelling sentence encouraging them to book a free consultation to explore these opportunities."
}

Rules:
- Be specific to their industry — generic advice is useless
- Reference their actual pain point in at least 2 of the 3 opportunities
- Include realistic estimates, not hype
- Australian English spelling
- First opportunity should always be the quickest win
- Tone: direct, knowledgeable, zero fluff`;

    const response = await client.messages.create({
      model: STANDARD_MODEL,
      max_tokens: 600,
      system: [
        {
          type: 'text',
          text: auditSystemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Industry: ${industry}\nBusiness size: ${businessSize}\nBiggest pain point: ${painPoint}`,
        },
      ],
    });

    const cacheRead = response.usage.cache_read_input_tokens ?? 0;
    const cacheWrite = response.usage.cache_creation_input_tokens ?? 0;
    const isHit = cacheRead > 0;
    console.log(
      `[CACHE${isHit ? ' HIT' : ''}] model=${STANDARD_MODEL} input=${response.usage.input_tokens} cache_write=${cacheWrite} cache_read=${cacheRead} output=${response.usage.output_tokens}${isHit ? ' savings=~90%' : ''}`
    );

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    let result;
    try {
      result = parseAiJson(text);
    } catch (parseErr) {
      console.error('Failed to parse AI response:', parseErr instanceof Error ? parseErr.message : parseErr);
      console.error('Raw AI text:', text);
      return NextResponse.json({ error: 'The AI produced an unexpected response. Try again or rephrase your pain point.' }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Audit API error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Analysis failed. Refresh the page and try again.' }, { status: 500 });
  }
}

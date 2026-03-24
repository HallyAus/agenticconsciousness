import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { industry, businessSize, painPoint } = await req.json();

    if (!industry || !businessSize || !painPoint) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    if (painPoint.length > 500) {
      return NextResponse.json({ error: 'Pain point too long (500 char max)' }, { status: 400 });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: `You are the AI analyst for Agentic Consciousness, an Australian AI consulting company.

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
- Tone: direct, knowledgeable, zero fluff`,
      messages: [
        {
          role: 'user',
          content: `Industry: ${industry}\nBusiness size: ${businessSize}\nBiggest pain point: ${painPoint}`,
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const result = JSON.parse(text);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Audit API error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

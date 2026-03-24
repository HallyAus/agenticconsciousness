import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${retryAfter}s.` },
      { status: 429 }
    );
  }

  try {
    const { challenge } = await req.json();

    if (!challenge || challenge.length > 1000) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: `You are the intake AI for Agentic Consciousness, an Australian AI consulting company.

A potential client has described their biggest business challenge. Analyse it and recommend which of the company's three services would help most.

Services:
1. AI Strategy & Workshops — Best for: businesses that are AI-curious, need education, want a roadmap before committing
2. AI Tool Implementation — Best for: businesses that know they want AI tools (ChatGPT, Claude, Copilot) but need help deploying and training
3. Automation & Agents — Best for: businesses with clear repetitive workflows that should be automated end-to-end

Respond in valid JSON only:
{
  "recommendedService": "Strategy & Workshops | Tool Implementation | Automation & Agents",
  "reason": "2-3 sentences explaining why this service fits their challenge.",
  "quickWin": "One specific thing they could start doing with AI this week.",
  "confidence": "High | Medium"
}

Rules:
- Be specific to what they described
- The quickWin should be genuinely useful, not a sales pitch
- Australian English spelling
- Tone: direct, helpful, knowledgeable`,
      messages: [
        { role: 'user', content: `Client challenge: ${challenge}` },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      console.error('Failed to parse AI response');
      return NextResponse.json({ error: 'Invalid response format. Please try again.' }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Smart contact error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

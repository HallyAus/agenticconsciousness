import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { incrementToolStat } from '@/lib/toolStats';

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
    const { text, context } = body as {
      text?: string;
      context?: string;
    };

    if (!text || text.length < 10 || text.length > 5000) {
      return NextResponse.json(
        { error: 'Text must be between 10 and 5,000 characters.' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert meeting notes processor for Australian businesses. Extract structured information from meeting notes or transcripts. Use Australian English spelling.

Return valid JSON only — no markdown, no backticks, no explanation.

Return exactly this structure:
{
  "meetingSummary": "string — 2-3 sentence overview of the meeting",
  "actionItems": [
    {
      "action": "string — what needs to be done",
      "owner": "string or null — who is responsible",
      "deadline": "string or null — when it is due",
      "priority": "High" | "Medium" | "Low"
    }
  ],
  "decisions": ["string", "..."],
  "followUps": ["string", "..."],
  "nextMeeting": "string or null — date/time if mentioned",
  "attendees": ["string", "..."]
}

Rules:
- Extract only what is explicitly mentioned; do not invent details
- Action items must be specific and actionable
- Decisions are conclusions reached, not discussions had
- Follow-ups are items needing further investigation or discussion
- Australian English spelling throughout`;

    const userMessage = `${context ? `Context: ${context}\n\n` : ''}Meeting notes:\n${text}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const rawText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    console.log(
      JSON.stringify({
        tool: 'meeting',
        usage: response.usage,
        timestamp: new Date().toISOString(),
      })
    );

    let result;
    try {
      result = JSON.parse(rawText);
      incrementToolStat('meetings');
    } catch {
      console.error('Failed to parse AI response');
      return NextResponse.json({ error: 'Invalid response format. Please try again.' }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Meeting API error:', error);
    return NextResponse.json({ error: 'Meeting processing failed. Please try again.' }, { status: 500 });
  }
}

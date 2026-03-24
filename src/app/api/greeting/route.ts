import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const cache = new Map<string, { greeting: string; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function POST(req: NextRequest) {
  try {
    const { timeOfDay, dayOfWeek, hour } = await req.json();

    const cacheKey = `${timeOfDay}-${hour}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ greeting: cached.greeting });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      system: `You write short, punchy greetings for Agentic Consciousness, an AI consulting company.

Rules:
- Maximum 2 sentences
- Reference the time of day naturally
- Mention AI or automation in a way that's relevant to the time
- Tone: direct, confident, no corporate fluff
- Australian English spelling
- Never use greetings like "G'day" or stereotypical Australian phrases
- Make the visitor curious about what AI can do for their business
- Each greeting should feel unique and slightly different`,
      messages: [
        {
          role: 'user',
          content: `Write a homepage greeting for a visitor arriving on a ${dayOfWeek} ${timeOfDay} (${hour}:00). One to two sentences max.`,
        },
      ],
    });

    const greeting = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .replace(/^["']|["']$/g, '');

    cache.set(cacheKey, { greeting, timestamp: Date.now() });

    return NextResponse.json({ greeting });
  } catch (error) {
    console.error('Greeting API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate greeting' },
      { status: 500 }
    );
  }
}

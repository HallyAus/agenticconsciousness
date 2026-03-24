import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const cache = new Map<string, { greeting: string; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function POST(req: NextRequest) {
  try {
    const { timeOfDay, dayOfWeek, hour, returning } = await req.json();

    // Cloudflare geo headers (CDN proxy adds these, tunnel forwards them)
    const city = req.headers.get('cf-ipcity') || req.headers.get('x-forwarded-city') || null;
    const region = req.headers.get('cf-region') || req.headers.get('cf-ipregion') || null;
    const country = req.headers.get('cf-ipcountry') || null;

    // Log headers for debugging (remove once geo is confirmed working)
    console.log(JSON.stringify({
      event: 'greeting_geo_debug',
      city, region, country,
      allCfHeaders: Object.fromEntries(
        [...req.headers.entries()].filter(([k]) => k.startsWith('cf-') || k.startsWith('x-forwarded'))
      ),
    }));

    // Cache key includes location for geo-aware greetings
    const locationKey = city || region || 'unknown';
    const cacheKey = `${timeOfDay}-${hour}-${locationKey}-${returning ? 'ret' : 'new'}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ greeting: cached.greeting });
    }

    // Build context string
    let context = `a ${dayOfWeek} ${timeOfDay} (${hour}:00)`;
    if (city && region) {
      context += `, visiting from ${city}, ${region}`;
    } else if (region) {
      context += `, visiting from ${region}`;
    } else if (country) {
      context += `, visiting from ${country}`;
    }
    if (returning) {
      context += `. This is a returning visitor.`;
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      system: `You write short, punchy greetings for Agentic Consciousness, an AI consulting company based in Australia.

Rules:
- Maximum 2 sentences
- Reference the time of day naturally
- If a city/region is provided, weave it in naturally (e.g. "Melbourne's buzzing today" or "Late night in Sydney?") — but don't force it if it feels awkward
- If the visitor is returning, acknowledge it subtly (e.g. "Back again?" or "Good to see you again") — but keep it brief
- Mention AI or automation in a way that's relevant to the context
- Tone: direct, confident, no corporate fluff
- Australian English spelling
- Never use "G'day" or stereotypical Australian phrases
- Make the visitor curious about what AI can do for their business
- Each greeting should feel unique and slightly different
- If the visitor is from outside Australia, acknowledge it with something welcoming`,
      messages: [
        {
          role: 'user',
          content: `Write a homepage greeting for a visitor arriving on ${context}. One to two sentences max.`,
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

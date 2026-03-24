import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const cache = new Map<string, { greeting: string; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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
    const { timeOfDay, dayOfWeek, hour, returning } = await req.json();

    // Cloudflare Tunnel provides cf-ipcountry only (no city/region on free plan)
    const country = req.headers.get('cf-ipcountry') || null;

    const cacheKey = `${timeOfDay}-${hour}-${country || 'unknown'}-${returning ? 'ret' : 'new'}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ greeting: cached.greeting });
    }

    // Build context string
    const countryNames: Record<string, string> = {
      AU: 'Australia', US: 'the United States', GB: 'the UK', NZ: 'New Zealand',
      CA: 'Canada', DE: 'Germany', FR: 'France', JP: 'Japan', SG: 'Singapore',
      IN: 'India', IE: 'Ireland', HK: 'Hong Kong',
    };
    const countryName = country ? (countryNames[country] || country) : null;

    let context = `a ${dayOfWeek} ${timeOfDay} (${hour}:00)`;
    if (country === 'AU') {
      context += `. Visitor is in Australia — reference Australian business context naturally`;
    } else if (countryName) {
      context += `. Visitor is from ${countryName}`;
    }
    if (returning) {
      context += `. This is a returning visitor — acknowledge briefly.`;
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      system: `You write short, punchy greetings for Agentic Consciousness, an AI consulting company in Australia.

Rules:
- Maximum 2 sentences
- Reference the time of day naturally
- For Australian visitors: reference something specific to Australian business (e.g. "Australian businesses are waking up to AI", "Across Australia, the smart ones are automating", mention EOFY if near June, mention the season). Make it feel local without stereotypes.
- For international visitors: acknowledge their country warmly (e.g. "Connecting from the UK? AI doesn't care about timezones.")
- If returning visitor: acknowledge it subtly ("Back for more?", "Good to see you again")
- Mention AI or automation naturally
- Tone: direct, confident, no corporate fluff
- Australian English spelling
- NEVER use "G'day" or stereotypical phrases
- Make them curious about what AI can do for their business
- Each greeting should feel unique`,
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

import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { FAST_MODEL } from '@/lib/models';

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

    const country = req.headers.get('cf-ipcountry') || null;

    // IP geolocation for city (free API, cached per IP)
    let city: string | null = null;
    let region: string | null = null;
    const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ip && ip !== 'unknown' && IP_REGEX.test(ip)) {
      try {
        const geoRes = await fetch(`https://ip-api.com/json/${ip}?fields=city,regionName,country`, {
          signal: AbortSignal.timeout(2000), // 2s timeout, don't slow down the greeting
        });
        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (geo.city) city = geo.city;
          if (geo.regionName) region = geo.regionName;
        }
      } catch {
        // Geo lookup failed — continue without it
      }
    }

    const locationKey = city || country || 'unknown';
    const cacheKey = `${timeOfDay}-${hour}-${locationKey}-${returning ? 'ret' : 'new'}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ greeting: cached.greeting });
    }

    const countryNames: Record<string, string> = {
      AU: 'Australia', US: 'the United States', GB: 'the UK', NZ: 'New Zealand',
      CA: 'Canada', DE: 'Germany', FR: 'France', JP: 'Japan', SG: 'Singapore',
      IN: 'India', IE: 'Ireland', HK: 'Hong Kong',
    };
    const countryName = country ? (countryNames[country] || country) : null;

    let context = `a ${dayOfWeek} ${timeOfDay} (${hour}:00)`;
    if (city && country === 'AU') {
      context += `. Visitor is in ${city}${region ? `, ${region}` : ''}, Australia`;
    } else if (city) {
      context += `. Visitor is in ${city}${countryName ? `, ${countryName}` : ''}`;
    } else if (country === 'AU') {
      context += `. Visitor is in Australia`;
    } else if (countryName) {
      context += `. Visitor is from ${countryName}`;
    }
    if (returning) {
      context += `. This is a returning visitor — acknowledge briefly.`;
    }

    const response = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 150,
      system: `You write short, punchy greetings for Agentic Consciousness, an AI consulting company in Australia.

Rules:
- Maximum 2 sentences
- Reference the time of day naturally
- If a city is provided, reference it naturally (e.g. "Morning in Melbourne — perfect time to automate", "Brisbane's buzzing with AI adoption"). Make it feel personal, not forced.
- For Australian visitors without a city: reference Australian business context generally.
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

    const cacheRead = response.usage.cache_read_input_tokens ?? 0;
    const cacheWrite = response.usage.cache_creation_input_tokens ?? 0;
    const isHit = cacheRead > 0;
    console.log(
      `[CACHE${isHit ? ' HIT' : ''}] model=${FAST_MODEL} input=${response.usage.input_tokens} cache_write=${cacheWrite} cache_read=${cacheRead} output=${response.usage.output_tokens}${isHit ? ' savings=~90%' : ''}`
    );
    console.log(
      JSON.stringify({
        tool: 'greeting',
        usage: response.usage,
        cache_read_input_tokens: cacheRead,
        cache_creation_input_tokens: cacheWrite,
        stop_reason: response.stop_reason,
        timestamp: new Date().toISOString(),
      })
    );

    cache.set(cacheKey, { greeting, timestamp: Date.now() });

    return NextResponse.json({ greeting });
  } catch (error) {
    console.error('Greeting API error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to generate greeting' },
      { status: 500 }
    );
  }
}

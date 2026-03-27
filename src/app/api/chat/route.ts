import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '@/lib/constants';
import { checkRateLimit } from '@/lib/rate-limit';
import { STANDARD_MODEL } from '@/lib/models';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CACHED_RESPONSES: Array<{ patterns: string[]; response: string }> = [
  {
    patterns: ['what do you do', 'what services', 'what do you offer'],
    response:
      'We provide three core services: AI Strategy & Workshops (roadmaps, audits, team training), Tool Implementation (ChatGPT, Claude, Copilot deployment), and Automation & Agents (autonomous pipelines, document processing, AI customer service). Want to know more about any of these?',
  },
  {
    patterns: ['how much', 'cost', 'price', 'pricing'],
    response:
      'The initial consultation is completely free — no obligation. After we understand your needs, projects are scoped and priced individually. No cookie-cutter packages. Want to book a free intro session? Reach us at ai@agenticconsciousness.com.au',
  },
  {
    patterns: ['where', 'location', 'based'],
    response:
      "We're based in Australia and work nationally — both remote and on-site. Distance isn't a barrier.",
  },
  {
    patterns: ['who', 'founder', 'daniel'],
    response:
      'Agentic Consciousness was founded by Daniel — 21+ years of hands-on industry experience across enterprise systems, automation, and technology. This isn\'t theory — it\'s applied intelligence.',
  },
];

const CONVERSATION_LIMIT = 30;
const CONVERSATION_LIMIT_SUFFIX =
  '\n\nThis has been a great conversation! For a deeper dive, book a free consultation at ai@agenticconsciousness.com.au';

function getCachedResponse(message: string): string | null {
  const lower = message.toLowerCase();
  for (const entry of CACHED_RESPONSES) {
    if (entry.patterns.some((pattern) => lower.includes(pattern))) {
      return entry.response;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed, retryAfter } = checkRateLimit(ip);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter || 60) } }
      );
    }

    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
      }
      if (!['user', 'assistant'].includes(msg.role)) {
        return NextResponse.json({ error: 'Invalid message role' }, { status: 400 });
      }
      if (typeof msg.content !== 'string' || msg.content.length > 2000) {
        return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 });
      }
    }

    // Check cache against the last user message
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMessage) {
      const cached = getCachedResponse(lastUserMessage.content as string);
      if (cached) {
        const exchangeCount = messages.filter((m) => m.role === 'user').length;
        const reply = exchangeCount >= CONVERSATION_LIMIT ? cached + CONVERSATION_LIMIT_SUFFIX : cached;
        console.log(JSON.stringify({ event: 'cache_hit', ip, timestamp: new Date().toISOString() }));
        return NextResponse.json({ reply });
      }
    }

    // Check conversation length limit before API call
    const exchangeCount = messages.filter((m) => m.role === 'user').length;
    const atLimit = exchangeCount >= CONVERSATION_LIMIT;

    const trimmedMessages = messages.slice(-20);

    const response = await client.messages.create({
      model: STANDARD_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: trimmedMessages,
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const reply = atLimit ? text + CONVERSATION_LIMIT_SUFFIX : text;

    console.log(
      JSON.stringify({
        event: 'chat_request',
        ip,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        model: STANDARD_MODEL,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat API error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 });
  }
}

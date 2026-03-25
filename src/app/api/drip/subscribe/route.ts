import { NextRequest, NextResponse } from 'next/server';
import { addSubscriber } from '@/lib/drip';
import { checkRateLimit } from '@/lib/rate-limit';

const VALID_SOURCES = ['quiz', 'audit', 'exit-intent'];

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: `Rate limit exceeded. Try again in ${retryAfter}s.` }, { status: 429 });
  }

  try {
    const { email, name, industry, source } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    if (!industry || !source || !VALID_SOURCES.includes(source)) {
      return NextResponse.json({ error: 'Industry and valid source required' }, { status: 400 });
    }

    const added = addSubscriber({ email, name, industry, source: source as 'quiz' | 'audit' | 'exit-intent' });

    if (!added) {
      return NextResponse.json({ success: true, message: 'Already subscribed' });
    }

    console.log(JSON.stringify({ event: 'drip_subscribe', email, industry, source, timestamp: new Date().toISOString() }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Drip subscribe error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

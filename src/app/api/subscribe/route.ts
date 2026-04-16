import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: `Rate limit exceeded. Try again in ${retryAfter}s.` }, { status: 429 });
  }

  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    await sql`
      INSERT INTO leads (source, email) VALUES ('newsletter', ${email})
    `;

    console.log(JSON.stringify({ event: 'new_subscriber', email, timestamp: new Date().toISOString() }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeEmail } from '@/lib/drip';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: `Rate limit exceeded. Try again in ${retryAfter}s.` }, { status: 429 });
  }

  const rawEmail = req.nextUrl.searchParams.get('email');
  if (!rawEmail) {
    return NextResponse.redirect(new URL('/unsubscribe', req.url));
  }

  const email = decodeURIComponent(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.redirect(new URL('/unsubscribe', req.url));
  }

  await unsubscribeEmail(email);
  return NextResponse.redirect(new URL('/unsubscribe', req.url));
}

import { NextRequest, NextResponse } from 'next/server';
import { getToolStats } from '@/lib/toolStats';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip'))?.trim() || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${retryAfter}s.` },
      { status: 429 }
    );
  }

  return NextResponse.json(getToolStats());
}

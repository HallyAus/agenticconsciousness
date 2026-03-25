import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeEmail } from '@/lib/drip';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.redirect(new URL('/unsubscribe', req.url));
  }

  unsubscribeEmail(decodeURIComponent(email));
  return NextResponse.redirect(new URL('/unsubscribe', req.url));
}

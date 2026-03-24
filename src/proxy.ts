import { NextRequest, NextResponse } from 'next/server';

export function proxy(req: NextRequest) {
  const host = req.headers.get('host') || '';

  // Redirect www to bare domain
  if (host.startsWith('www.')) {
    const url = req.nextUrl.clone();
    url.host = host.replace('www.', '');
    return NextResponse.redirect(url, 301);
  }
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon).*)',
};

import { NextRequest, NextResponse } from 'next/server';

/**
 * Request proxy: www→apex redirect + /admin HTTP Basic Auth guard.
 *
 * Admin gate: every /admin/* and /api/admin/* request must present Basic
 * Auth matching ADMIN_USERNAME + ADMIN_PASSWORD. Responses carry
 * X-Robots-Tag to keep crawlers out even if a URL leaks. robots.txt
 * Disallow is the other half of this protection.
 */
export function proxy(req: NextRequest) {
  const host = req.headers.get('host') || '';

  if (host.startsWith('www.')) {
    const url = req.nextUrl.clone();
    url.host = host.replace('www.', '');
    return NextResponse.redirect(url, 301);
  }

  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const gated = gateAdmin(req);
    if (gated) return gated;
  }
}

function gateAdmin(req: NextRequest): NextResponse | undefined {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) {
    return new NextResponse('Admin not configured', { status: 503 });
  }

  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Basic ')) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="admin", charset="UTF-8"',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  let decoded: string;
  try { decoded = atob(auth.slice(6)); } catch {
    return new NextResponse('Bad credentials', { status: 400 });
  }
  const sep = decoded.indexOf(':');
  const submittedUser = sep === -1 ? decoded : decoded.slice(0, sep);
  const submittedPass = sep === -1 ? '' : decoded.slice(sep + 1);

  if (!timingSafeEqual(submittedUser, user) || !timingSafeEqual(submittedPass, pass)) {
    return new NextResponse('Bad credentials', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="admin", charset="UTF-8"',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  const res = NextResponse.next();
  res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return res;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export const config = {
  // Covers www redirect + /admin UI + /api/admin routes. Keep _next out.
  matcher: ['/((?!_next/static|_next/image|favicon).*)'],
};

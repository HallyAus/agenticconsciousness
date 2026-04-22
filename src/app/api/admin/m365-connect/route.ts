import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getAuthorizeUrl } from '@/lib/graph-delegated';

/**
 * Kicks off the Microsoft 365 delegated OAuth sign-in.
 * Admin-only (gated by /admin Basic Auth in src/proxy.ts).
 *
 * Redirects the user to login.microsoftonline.com with state + our
 * redirect URI. The callback at /api/admin/m365-connect/callback
 * completes the flow by exchanging the auth code for tokens.
 */

function originFromReq(req: NextRequest): string {
  // Honour x-forwarded-proto/host when behind Vercel edge.
  const xfProto = req.headers.get('x-forwarded-proto') ?? 'https';
  const xfHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (xfHost) return `${xfProto}://${xfHost}`;
  return new URL(req.url).origin;
}

export async function GET(req: NextRequest) {
  if (!process.env.M365_TENANT_ID || !process.env.M365_CLIENT_ID || !process.env.M365_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'M365 not configured. Missing M365_TENANT_ID / M365_CLIENT_ID / M365_CLIENT_SECRET.' },
      { status: 503 },
    );
  }

  const redirectUri = `${originFromReq(req)}/api/admin/m365-connect/callback`;
  const state = crypto.randomBytes(18).toString('hex');
  const url = getAuthorizeUrl({ state, redirectUri });

  // Persist state in an httpOnly cookie so the callback can verify it.
  const res = NextResponse.redirect(url);
  res.cookies.set('m365_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/admin/m365-connect',
    maxAge: 600, // 10 min
  });
  return res;
}

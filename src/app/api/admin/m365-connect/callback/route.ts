import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, fetchMe, storeAuth } from '@/lib/graph-delegated';

/**
 * Completes the Microsoft 365 delegated OAuth flow. Microsoft redirects the
 * user here with ?code=... after they sign in. We:
 *   1. Verify state matches our cookie.
 *   2. Exchange code -> access + refresh tokens.
 *   3. Look up /me to capture the user's UPN + id.
 *   4. Persist the singleton m365_auth row.
 *   5. Redirect back to /admin with a success flag.
 */

function originFromReq(req: NextRequest): string {
  const xfProto = req.headers.get('x-forwarded-proto') ?? 'https';
  const xfHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (xfHost) return `${xfProto}://${xfHost}`;
  return new URL(req.url).origin;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errDesc = url.searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(
      `${originFromReq(req)}/admin?m365_error=${encodeURIComponent(errDesc ?? error)}`,
    );
  }
  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  const expectedState = req.cookies.get('m365_oauth_state')?.value;
  if (!expectedState || expectedState !== state) {
    return NextResponse.json({ error: 'State mismatch — possible CSRF' }, { status: 400 });
  }

  const redirectUri = `${originFromReq(req)}/api/admin/m365-connect/callback`;

  try {
    const tokens = await exchangeCodeForTokens({ code, redirectUri });
    const me = await fetchMe(tokens.accessToken);
    await storeAuth({
      userEmail: me.userPrincipalName,
      userId: me.id,
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      scope: tokens.scope,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[m365-connect/callback] failed', msg);
    return NextResponse.redirect(
      `${originFromReq(req)}/admin?m365_error=${encodeURIComponent(msg)}`,
    );
  }

  const res = NextResponse.redirect(`${originFromReq(req)}/admin?m365_connected=1`);
  res.cookies.delete('m365_oauth_state');
  return res;
}

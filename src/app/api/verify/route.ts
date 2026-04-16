import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { makeVerifiedCookie, VERIFIED_COOKIE_NAME, VERIFIED_COOKIE_MAX_AGE } from '@/lib/toolAccess';

interface TokenRow {
  token: string;
  email: string;
  created_at: number;
  expires_at: number;
  used: number;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const siteUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';

  if (!token || token.length > 128) {
    return buildRedirect(`${siteUrl}/tools?verified=error`);
  }

  const rows = (await sql`SELECT * FROM verification_tokens WHERE token = ${token}`) as TokenRow[];
  const row = rows[0];

  if (!row) {
    return buildRedirect(`${siteUrl}/tools?verified=invalid`);
  }

  if (row.used) {
    return buildRedirect(`${siteUrl}/tools?verified=used`);
  }

  if (Date.now() > row.expires_at) {
    return buildRedirect(`${siteUrl}/tools?verified=expired`);
  }

  // Mark token as used and record verified email
  await sql`UPDATE verification_tokens SET used = 1 WHERE token = ${token}`;
  await sql`
    INSERT INTO verified_emails (email, verified_at)
    VALUES (${row.email}, ${Date.now()})
    ON CONFLICT (email) DO UPDATE SET verified_at = EXCLUDED.verified_at
  `;

  let cookieValue: string;
  try {
    cookieValue = makeVerifiedCookie(row.email);
  } catch {
    // COOKIE_SECRET not set — redirect without cookie
    console.error('[verify] COOKIE_SECRET not set, cannot issue verified cookie');
    return buildRedirect(`${siteUrl}/tools?verified=error`);
  }

  const response = buildRedirect(`${siteUrl}/tools?verified=ok`);
  response.cookies.set(VERIFIED_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VERIFIED_COOKIE_MAX_AGE,
    path: '/',
  });

  return response;
}

function buildRedirect(url: string): NextResponse {
  // Cross-browser redirect page so the cookie is set before JS runs
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0;url=${url}">
<title>Verifying...</title>
</head>
<body style="background:#0a0a0a;color:#e0e0e0;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<p style="letter-spacing:2px;text-transform:uppercase;font-size:12px">Redirecting...</p>
<script>window.location.replace(${JSON.stringify(url)})</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

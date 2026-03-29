import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { setVerifiedCookie } from '@/lib/toolAccess';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse(errorPage('Missing verification token.'), { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  const db = getDb();
  const user = db.prepare('SELECT id, email, token_expires_at, verified_at, revoked_at FROM verified_users WHERE verification_token = ?').get(token) as {
    id: number; email: string; token_expires_at: string | null; verified_at: string | null; revoked_at: string | null;
  } | undefined;

  if (!user) {
    return new NextResponse(errorPage('Invalid or expired verification link.'), { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  if (user.revoked_at) {
    return new NextResponse(errorPage('This account has been suspended.'), { status: 403, headers: { 'Content-Type': 'text/html' } });
  }

  // Check expiry
  if (user.token_expires_at) {
    const expires = new Date(user.token_expires_at + 'Z');
    if (expires < new Date()) {
      return new NextResponse(expiredPage(), { status: 400, headers: { 'Content-Type': 'text/html' } });
    }
  }

  // Verify the user
  db.prepare("UPDATE verified_users SET verified_at = datetime('now'), verification_token = NULL WHERE id = ?").run(user.id);

  // Create response with redirect
  const siteUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';
  const res = NextResponse.redirect(`${siteUrl}/tools?verified=1`);
  setVerifiedCookie(res, user.id, user.email);
  return res;
}

function errorPage(message: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Verification Error</title>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;900&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:80px 20px;background:#0a0a0a;color:#fff;font-family:'Be Vietnam Pro',sans-serif;text-align:center">
<div style="max-width:400px;margin:0 auto">
<div style="font-size:24px;font-weight:900;margin-bottom:8px">AC<span style="color:#ff3d00">_</span></div>
<h1 style="font-size:20px;font-weight:900;margin:24px 0 12px">${message}</h1>
<p style="color:rgba(255,255,255,0.5);font-size:14px;font-weight:300;line-height:1.6">Please go back to the tools page and try again.</p>
<a href="/tools" style="display:inline-block;margin-top:24px;background:#ff3d00;color:#fff;padding:12px 32px;text-decoration:none;font-weight:900;font-size:12px;letter-spacing:2px;text-transform:uppercase">Back to tools</a>
</div></body></html>`;
}

function expiredPage(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Link Expired</title>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;900&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:80px 20px;background:#0a0a0a;color:#fff;font-family:'Be Vietnam Pro',sans-serif;text-align:center">
<div style="max-width:400px;margin:0 auto">
<div style="font-size:24px;font-weight:900;margin-bottom:8px">AC<span style="color:#ff3d00">_</span></div>
<h1 style="font-size:20px;font-weight:900;margin:24px 0 12px">Verification link expired.</h1>
<p style="color:rgba(255,255,255,0.5);font-size:14px;font-weight:300;line-height:1.6">This link is only valid for 24 hours. Go back to the tools page to request a new one.</p>
<a href="/tools" style="display:inline-block;margin-top:24px;background:#ff3d00;color:#fff;padding:12px 32px;text-decoration:none;font-weight:900;font-size:12px;letter-spacing:2px;text-transform:uppercase">Request new link</a>
</div></body></html>`;
}

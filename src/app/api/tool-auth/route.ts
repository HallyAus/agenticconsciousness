import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getFingerprint, setVerifiedCookie } from '@/lib/toolAccess';
import { validateCsrf } from '@/lib/csrf';
import { sendEmail, emailTemplate } from '@/lib/email';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const csrfValid = await validateCsrf(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 403 });
  }

  try {
    const { email } = await req.json() as { email: string };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    const db = getDb();

    // Check if already verified
    const existing = db.prepare('SELECT id, email, verified_at, revoked_at FROM verified_users WHERE email = ?').get(email) as { id: number; email: string; verified_at: string | null; revoked_at: string | null } | undefined;

    if (existing?.revoked_at) {
      return NextResponse.json({ error: 'This email has been suspended.' }, { status: 403 });
    }

    if (existing?.verified_at) {
      // Already verified — set cookie and return
      const res = NextResponse.json({ success: true, verified: true, message: 'Welcome back! You\'re verified.' });
      setVerifiedCookie(res, existing.id, existing.email);
      return res;
    }

    const token = randomUUID();
    const siteUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';
    const verifyUrl = `${siteUrl}/api/verify?token=${token}`;

    if (existing) {
      // Update existing unverified user with new token
      db.prepare("UPDATE verified_users SET verification_token = ?, token_expires_at = datetime('now', '+24 hours') WHERE id = ?").run(token, existing.id);
    } else {
      // Create new user
      db.prepare("INSERT INTO verified_users (email, verification_token, token_expires_at) VALUES (?, ?, datetime('now', '+24 hours'))").run(email, token);
    }

    // If Resend not configured, auto-verify (dev/staging mode)
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set — auto-verifying email (development mode)');
      const user = db.prepare('SELECT id, email FROM verified_users WHERE email = ?').get(email) as { id: number; email: string };
      db.prepare("UPDATE verified_users SET verified_at = datetime('now'), verification_token = NULL WHERE id = ?").run(user.id);
      const res = NextResponse.json({ success: true, verified: true, message: 'Email verified (development mode).' });
      setVerifiedCookie(res, user.id, user.email);
      return res;
    }

    // Send verification email
    const emailSent = await sendEmail({
      to: email,
      subject: 'Verify your email — Agentic Consciousness',
      html: emailTemplate(`
        <h2 style="color:#fff;font-size:20px;margin:0 0 16px;font-weight:700">Verify your email</h2>
        <p style="color:#ccc;font-size:15px;margin:0 0 24px">Click the button below to continue using our free AI tools.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#ff3d00;color:#fff;padding:14px 32px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase">VERIFY EMAIL</a>
        <p style="color:#666;font-size:12px;margin:24px 0 0">This link expires in 24 hours.</p>
      `),
    });

    if (!emailSent) {
      console.warn('Verification email failed to send, auto-verifying as fallback');
      const user = db.prepare('SELECT id, email FROM verified_users WHERE email = ?').get(email) as { id: number; email: string };
      db.prepare("UPDATE verified_users SET verified_at = datetime('now'), verification_token = NULL WHERE id = ?").run(user.id);
      const res = NextResponse.json({ success: true, verified: true, message: 'Email verified.' });
      setVerifiedCookie(res, user.id, user.email);
      return res;
    }

    return NextResponse.json({ success: true, verified: false, message: 'Check your email for a verification link.' });
  } catch (error) {
    console.error('Tool auth error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  }
}

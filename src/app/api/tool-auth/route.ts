import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { validateCsrf } from '@/lib/csrf';
import { sql } from '@/lib/pg';
import { sendEmail, emailTemplate } from '@/lib/email';

export async function POST(req: NextRequest) {
  const csrfValid = await validateCsrf(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 403 });
  }

  let email: string;
  try {
    const body = (await req.json()) as { email?: unknown };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof body.email !== 'string' || !emailRegex.test(body.email) || body.email.length > 200) {
      return NextResponse.json({ error: 'Valid email required.' }, { status: 400 });
    }
    email = body.email.toLowerCase().trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

  await sql`
    INSERT INTO verification_tokens (token, email, created_at, expires_at)
    VALUES (${token}, ${email}, ${now}, ${expiresAt})
  `;

  const siteUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';
  const verifyUrl = `${siteUrl}/api/verify?token=${token}`;

  // Auto-verify if no Resend key (dev fallback)
  if (!process.env.RESEND_API_KEY) {
    console.warn('[tool-auth] RESEND_API_KEY not set — auto-verifying:', email);
    console.log('[tool-auth] Verify URL (dev):', verifyUrl);
    return NextResponse.json({ status: 'auto_verified', token });
  }

  const sent = await sendEmail({
    to: email,
    subject: 'Verify your email — Agentic Consciousness Tools',
    html: emailTemplate(`
      <p style="color:#e0e0e0;margin:0 0 20px;font-size:15px;line-height:1.7">
        You requested access to the free AI tools on Agentic Consciousness.<br>
        Click below to verify your email and unlock <strong style="color:#fff">20 free uses per day</strong>.
      </p>
      <a href="${verifyUrl}"
        style="display:inline-block;background:#ff3d00;color:#fff;font-weight:900;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 28px;font-size:11px;font-family:monospace">
        VERIFY EMAIL &rarr;
      </a>
      <p style="color:#555;font-size:12px;margin:20px 0 0;line-height:1.6">
        Link expires in 24 hours. If you didn&apos;t request this, ignore this email &mdash; no account has been created.
      </p>
    `),
  });

  if (!sent) {
    return NextResponse.json({ error: 'Failed to send verification email. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ status: 'sent', email });
}

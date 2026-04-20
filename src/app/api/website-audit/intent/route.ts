import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendEmail, emailTemplate } from '@/lib/email';

/**
 * Captures intent the moment a visitor submits their URL on the auditor —
 * before they've given us their email. If they continue and submit email,
 * the main /api/website-audit endpoint logs a richer lead; if they bail,
 * we still have their URL + our own notification email from here.
 */

const INTERNAL_LEAD_EMAIL = 'ai@agenticconsciousness.com.au';

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normaliseUrl(input: string): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const u = new URL(withScheme);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: `Rate limit exceeded. Try again in ${retryAfter}s.` }, { status: 429 });
  }

  try {
    const body = await req.json();
    const rawUrl = typeof body.url === 'string' ? body.url : '';
    const url = normaliseUrl(rawUrl);
    if (!url) {
      return NextResponse.json({ error: 'Enter a valid website URL.' }, { status: 400 });
    }
    const rawRef = typeof body.ref === 'string' ? body.ref : '';
    const ref = /^[A-Za-z0-9._-]{1,64}$/.test(rawRef) ? rawRef : '';

    // Persist intent as a lead (no email yet).
    await sql`
      INSERT INTO leads (source, metadata)
      VALUES (
        'website-audit-intent',
        ${JSON.stringify({ url, ip, userAgent, ref, at: new Date().toISOString() })}::jsonb
      )
    `;

    // Fire internal notification so Daniel knows someone entered a URL.
    // Best-effort: don't block the response on email send.
    sendEmail({
      to: INTERNAL_LEAD_EMAIL,
      subject: `Website audit intent: ${url}`,
      html: emailTemplate(`
        <h2 style="color:#fafaf8;font-size:20px;margin:0 0 12px;line-height:1.2">Website audit intent</h2>
        <p style="color:#e0e0de;font-size:13px;line-height:1.6;margin:0 0 16px">
          A visitor submitted a URL on the auditor. Email may or may not follow.
        </p>
        <div style="border-left:3px solid #ff3d00;padding:12px 16px;background:#141311;margin-bottom:14px">
          <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ff5722;margin-bottom:4px">URL</div>
          <div style="color:#fafaf8;font-size:14px;word-break:break-all">${esc(url)}</div>
        </div>
        <div style="border-left:3px solid #ff3d00;padding:12px 16px;background:#141311;margin-bottom:14px">
          <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ff5722;margin-bottom:4px">IP / UA</div>
          <div style="color:#e0e0de;font-size:12px;font-family:ui-monospace,monospace;word-break:break-all">${esc(ip)}<br>${esc(userAgent)}</div>
        </div>
        ${ref ? `<div style="border-left:3px solid #ff3d00;padding:12px 16px;background:#141311"><div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ff5722;margin-bottom:4px">Ref</div><div style="color:#fafaf8;font-size:14px;font-family:ui-monospace,monospace">${esc(ref)}</div></div>` : ''}
      `),
    }).catch((err) => {
      console.error('[website-audit-intent] notification email failed', err instanceof Error ? err.message : err);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[website-audit-intent] error', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Could not record your URL. Try again.' }, { status: 500 });
  }
}

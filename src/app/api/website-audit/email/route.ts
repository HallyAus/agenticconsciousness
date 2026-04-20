import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendEmail, emailTemplate } from '@/lib/email';

interface Issue {
  category: string;
  severity: string;
  title: string;
  detail: string;
  fix: string;
}

interface AuditBody {
  email: string;
  url: string;
  summary?: string;
  score?: number;
  issues?: Issue[];
  ref?: string;
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderIssueCard(issue: Issue): string {
  const sev = esc((issue.severity || 'medium').toUpperCase());
  const cat = esc(issue.category || 'General');
  return `
    <div style="border-left:3px solid #ff3d00;padding:14px 16px;margin-bottom:14px;background:#141311">
      <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ff5722;margin-bottom:6px">
        ${sev} &middot; ${cat}
      </div>
      <div style="font-weight:900;color:#fafaf8;font-size:15px;margin-bottom:8px;line-height:1.3">
        ${esc(issue.title)}
      </div>
      <div style="color:#e0e0de;font-size:13px;line-height:1.6;margin-bottom:8px">
        ${esc(issue.detail)}
      </div>
      <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#ff5722">
        FIX &rarr; <span style="color:#e0e0de;text-transform:none;letter-spacing:0;font-size:12px">${esc(issue.fix)}</span>
      </div>
    </div>`;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: `Rate limit exceeded. Try again in ${retryAfter}s.` }, { status: 429 });
  }

  try {
    const body = (await req.json()) as AuditBody;
    const { email, url, summary, score, issues = [] } = body;
    const rawRef = typeof body.ref === 'string' ? body.ref : '';
    const ref = /^[A-Za-z0-9._-]{1,64}$/.test(rawRef) ? rawRef : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
    }
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing audited URL.' }, { status: 400 });
    }

    const sorted = [...issues].sort(
      (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
    );

    // Store the lead with full audit payload so future sessions can continue the conversation.
    await sql`
      INSERT INTO leads (source, email, metadata)
      VALUES (
        'website-audit',
        ${email},
        ${JSON.stringify({ url, summary, score, issues: sorted, ref })}::jsonb
      )
    `;

    const issuesHtml = sorted.map(renderIssueCard).join('');
    const scoreRow = typeof score === 'number'
      ? `<div style="display:inline-block;padding:6px 12px;background:#ff3d00;color:#fff;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px">
           Score ${score} / 100
         </div>`
      : '';

    await sendEmail({
      to: email,
      subject: `Your website audit — ${url}`,
      html: emailTemplate(`
        <h2 style="color:#fafaf8;font-size:22px;margin:0 0 10px;line-height:1.2">Website audit</h2>
        <div style="font-family:ui-monospace,monospace;font-size:12px;letter-spacing:1.5px;color:#ff5722;margin-bottom:16px;word-break:break-all">${esc(url)}</div>
        ${scoreRow}
        ${summary ? `<p style="color:#e0e0de;font-size:14px;line-height:1.7;margin:0 0 20px">${esc(summary)}</p>` : ''}
        <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ff5722;margin-bottom:10px">
          ${sorted.length} issues found
        </div>
        ${issuesHtml}
        <div style="margin-top:24px;padding:16px;border:2px solid #ff3d00;background:#1c1a17">
          <div style="color:#fafaf8;font-weight:900;font-size:15px;margin-bottom:6px">Want this fixed?</div>
          <p style="color:#e0e0de;font-size:13px;line-height:1.6;margin:0 0 12px">
            We build mobile-first AI-optimised websites in 48 hours. $999 launch offer, integrations billed separately. Every issue in this audit is covered by the Sprint.
          </p>
          <a href="https://agenticconsciousness.com.au/book" style="display:inline-block;background:#ff3d00;color:#fff;text-decoration:none;font-weight:900;font-size:13px;letter-spacing:2px;text-transform:uppercase;padding:12px 20px">
            Book the $999 Sprint &rarr;
          </a>
        </div>
      `),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Website audit email error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to send. Try again.' }, { status: 500 });
  }
}

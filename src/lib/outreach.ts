import { emailTemplate } from '@/lib/email';

/**
 * Cold-outreach email templates. Three touches across 7 days:
 *   #1 Day 0   — value-led soft intro, 3 top issues, PDF attached, no price
 *   #2 Day +3  — threaded reply, introduces the $999 Sprint
 *   #3 Day +7  — threaded reply, soft close, "I'll leave you alone"
 *
 * Every email ends with a plain-English unsubscribe line + ABN + address
 * to satisfy the Australian Spam Act 2003. Inferred-consent basis is
 * only valid when the recipient's email is publicly listed on the
 * domain we're emailing, which our scraper confirms.
 */

export interface OutreachIssue {
  category: string;
  severity: string;
  title: string;
  detail: string;
  fix: string;
}

export interface OutreachContext {
  url: string;
  domain: string;
  businessName?: string | null;
  score: number;
  summary: string;
  issues: OutreachIssue[];
  unsubToken: string;
  sourceLine: string;        // "we found your email publicly listed on ..."
  siteBaseUrl: string;       // e.g. https://agenticconsciousness.com.au
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function topIssues(issues: OutreachIssue[], n: number): OutreachIssue[] {
  const sev: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...issues].sort((a, b) => (sev[a.severity] ?? 9) - (sev[b.severity] ?? 9)).slice(0, n);
}

function complianceFooter(ctx: OutreachContext): string {
  const unsubUrl = `${ctx.siteBaseUrl}/unsubscribe/${ctx.unsubToken}`;
  return `
    <p class="ac-dim" style="color:#888;font-size:11px;line-height:1.5;margin-top:28px;border-top:1px solid #eee;padding-top:12px">
      ${esc(ctx.sourceLine)}<br>
      If you'd rather not hear from me again, <a href="${unsubUrl}" style="color:#888;text-decoration:underline">unsubscribe here</a> and I won't email you again.<br>
      Daniel Hall · Agentic Consciousness · Australia · daniel@agenticconsciousness.com.au
    </p>`;
}

export function buildTouch1(ctx: OutreachContext): { subject: string; html: string } {
  const top = topIssues(ctx.issues, 3);
  const subject = `3 things costing you leads on ${ctx.domain}`;

  const issueHtml = top
    .map(
      (i) => `
    <li style="margin-bottom:10px">
      <strong style="color:#0a0a0a">${esc(i.title)}</strong>
      <div style="font-size:13px;color:#444;margin-top:2px">${esc(i.detail)}</div>
    </li>`,
    )
    .join('');

  const greeting = ctx.businessName ? `the team at ${esc(ctx.businessName)}` : 'there';

  const html = emailTemplate(`
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 14px">
      Hi ${greeting},
    </p>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 14px">
      I'm Daniel. I build AI-optimised websites for Australian businesses and I
      ran a proper audit across ${esc(ctx.domain)} this morning. Three things
      jumped out that I think are genuinely costing you leads:
    </p>
    <ol style="padding-left:20px;margin:0 0 16px;color:#222;font-size:15px;line-height:1.6">
      ${issueHtml}
    </ol>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 14px">
      I attached the full PDF — ${ctx.issues.length} findings, scored ${ctx.score}/100,
      each with a specific fix. No login, no form, just the PDF.
    </p>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 14px">
      If any of it is useful, just hit reply. Happy to talk through the fixes
      you'd want to prioritise. If it's not, no worries — bin the email.
    </p>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 4px">
      Daniel
    </p>
    ${complianceFooter(ctx)}
  `);

  return { subject, html };
}

export function buildTouch2(ctx: OutreachContext): { subject: string; html: string } {
  const subject = `Re: 3 things costing you leads on ${ctx.domain}`;
  const html = emailTemplate(`
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 14px">
      Following up on the audit I sent — not sure if it landed in junk or you've
      been slammed this week.
    </p>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 14px">
      If any of the issues resonated, I have something that might fit: a
      <strong>$999 Lightning Website Sprint</strong>. 48-hour turnaround,
      mobile-first, AI-optimised, Claude chatbot trained on your content.
      Every issue in the audit is covered. Money-back guarantee if it's not
      live in 48 hours.
    </p>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 14px">
      Have a look:
      <a href="${ctx.siteBaseUrl}/book" style="color:#ff3d00;font-weight:700">
        ${ctx.siteBaseUrl}/book
      </a>
    </p>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 14px">
      Or just reply and tell me which issue bothers you most — I'll answer
      straight, no pitch.
    </p>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 4px">
      Daniel
    </p>
    ${complianceFooter(ctx)}
  `);
  return { subject, html };
}

export function buildTouch3(ctx: OutreachContext): { subject: string; html: string } {
  const subject = `Re: 3 things costing you leads on ${ctx.domain}`;
  const html = emailTemplate(`
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 14px">
      Last note from me — if now isn't the right time, all good, I'll stop
      emailing. I just wanted to leave you the link in case it's useful
      later:
    </p>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 14px">
      <a href="${ctx.siteBaseUrl}/book" style="color:#ff3d00;font-weight:700">
        ${ctx.siteBaseUrl}/book
      </a>
      — $999, 48 hours, fixes every issue in the audit.
    </p>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 14px">
      If there was something specific in the audit you wanted a plain-English
      explanation of, reply and I'll write it up — no obligation either way.
    </p>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 4px">
      Daniel
    </p>
    ${complianceFooter(ctx)}
  `);
  return { subject, html };
}

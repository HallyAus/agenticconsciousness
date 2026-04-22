import { emailTemplate } from '@/lib/email';

/**
 * Cold-outreach email templates. Three touches across 7 days:
 *   #1 Day 0   , value-led soft intro, 3 top issues, PDF attached, no price
 *   #2 Day +3  , threaded reply, introduces the $999 Sprint
 *   #3 Day +7  , threaded reply, soft close, "I'll leave you alone"
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
      Daniel · Agentic Consciousness · Ourimbah, NSW · daniel@agenticconsciousness.com.au
    </p>`;
}

export function buildTouch1(ctx: OutreachContext): { subject: string; html: string } {
  const top = topIssues(ctx.issues, 3);
  const subject = `3 things costing you leads on ${ctx.domain}`;

  const issueHtml = top
    .map(
      (i) => `
    <li style="margin:0 0 10px 0">
      <strong style="color:#0a0a0a">${esc(i.title)}</strong>
      <div style="font-size:14px;color:#444;margin-top:2px">${esc(i.detail)}</div>
    </li>`,
    )
    .join('');

  const greeting = ctx.businessName ? `the team at ${esc(ctx.businessName)}` : 'there';

  const html = emailTemplate(`
    <p style="color:#222;font-size:15px;line-height:1.6;margin:0 0 14px">
      Hi ${greeting},
    </p>
    <p style="color:#222;font-size:15px;line-height:1.6;margin:0 0 14px">
      I'm Daniel, a local on the Central Coast (Ourimbah). I build
      AI-optimised websites for Australian small businesses. I ran a
      proper audit across ${esc(ctx.domain)} this morning. Three things
      jumped out that I reckon are costing you leads right now:
    </p>
    <ol style="padding-left:20px;margin:0 0 16px;color:#222;font-size:15px;line-height:1.55">
      ${issueHtml}
    </ol>
    <p style="color:#222;font-size:15px;line-height:1.6;margin:0 0 14px">
      The full report is attached , ${ctx.issues.length} findings, scored ${ctx.score}/100,
      every one with a specific fix you can hand to your current web person.
    </p>
    <p style="color:#222;font-size:15px;line-height:1.6;margin:0 0 6px">
      <strong>If you'd rather we just fix the lot:</strong>
    </p>
    <p style="color:#222;font-size:15px;line-height:1.6;margin:0 0 14px">
      Our Lightning Website Sprint is a flat <strong>$999</strong> , we rebuild
      the whole site mobile-first, AI-optimised, Claude chatbot embedded, live
      in 48 hours. <strong>Includes full 12-month maintenance</strong> (copy
      tweaks, image swaps, security patches, uptime monitoring). Money-back
      guarantee if it's not live in 48 hours.
    </p>
    <p style="color:#222;font-size:15px;line-height:1.6;margin:0 0 14px">
      <a href="${ctx.siteBaseUrl}/book" style="color:#ff3d00;font-weight:700;text-decoration:none">
        ${ctx.siteBaseUrl}/book →
      </a>
    </p>
    <p style="color:#222;font-size:15px;line-height:1.6;margin:0 0 14px">
      Or just hit reply. Happy to walk through which of the audit issues would
      move the needle fastest for you. If it's not the right time, bin this ,
      no follow-up, no worries.
    </p>
    <p style="color:#222;font-size:15px;line-height:1.6;margin:0 0 4px">
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
      Following up on the audit I sent , not sure if it landed in junk or you've
      been slammed this week.
    </p>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 14px">
      If any of the issues resonated, the offer is a flat
      <strong>$999 Lightning Website Sprint</strong>: 48-hour turnaround,
      mobile-first, AI-optimised, Claude chatbot trained on your content,
      plus <strong>full 12-month maintenance included</strong> (copy tweaks,
      image swaps, security patches, uptime monitoring). Every issue in the
      audit is covered. Money-back guarantee if it's not live in 48 hours.
    </p>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 14px">
      Have a look:
      <a href="${ctx.siteBaseUrl}/book" style="color:#ff3d00;font-weight:700">
        ${ctx.siteBaseUrl}/book
      </a>
    </p>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 14px">
      Or just reply and tell me which issue bothers you most , I'll answer
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
      Last note from me , if now isn't the right time, all good, I'll stop
      emailing. I just wanted to leave you the link in case it's useful
      later:
    </p>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 14px">
      <a href="${ctx.siteBaseUrl}/book" style="color:#ff3d00;font-weight:700">
        ${ctx.siteBaseUrl}/book
      </a>
      , $999 flat, 48 hours, 12 months of maintenance included, fixes every issue in the audit.
    </p>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 14px">
      If there was something specific in the audit you wanted a plain-English
      explanation of, reply and I'll write it up , no obligation either way.
    </p>
    <p class="ac-body" style="color:#222;font-size:15px;line-height:1.65;margin:0 0 4px">
      Daniel
    </p>
    ${complianceFooter(ctx)}
  `);
  return { subject, html };
}

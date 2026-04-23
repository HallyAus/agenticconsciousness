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
 *
 * Outreach emails deliberately SKIP the branded emailTemplate (no AC
 * wordmark header). They must read like a personal note from Daniel,
 * not a newsletter.
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
  sourceLine: string;
  siteBaseUrl: string;
  mockupToken?: string | null;
  mockupScreenshotUrl?: string | null;
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function topIssues(issues: OutreachIssue[], n: number): OutreachIssue[] {
  const sev: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...issues].sort((a, b) => (sev[a.severity] ?? 9) - (sev[b.severity] ?? 9)).slice(0, n);
}

function signature(ctx: OutreachContext): string {
  return `
    <p style="color:#222;font-size:16px;line-height:1.6;margin:0 0 6px">
      Daniel
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"
           style="margin-top:14px;border-collapse:collapse;font-family:'Helvetica Neue',Arial,sans-serif">
      <tr>
        <td style="padding:4px 16px 4px 0;border-right:3px solid #ff3d00;vertical-align:top">
          <div style="font-weight:700;font-size:14px;color:#0a0a0a;letter-spacing:-0.2px;line-height:1.3">
            Daniel Hall
          </div>
          <div style="font-size:12px;color:#666;margin-top:3px;line-height:1.4">
            Founder, Agentic Consciousness
          </div>
        </td>
        <td style="padding:4px 0 4px 16px;vertical-align:top;font-size:12px;line-height:1.5">
          <div>
            <a href="${ctx.siteBaseUrl}"
               style="color:#0a0a0a;text-decoration:none;font-weight:600">
              agenticconsciousness.com.au
            </a>
          </div>
          <div style="color:#666;margin-top:2px">
            <a href="mailto:daniel@agenticconsciousness.com.au"
               style="color:#666;text-decoration:none">
              daniel@agenticconsciousness.com.au
            </a>
          </div>
        </td>
      </tr>
    </table>`;
}

function complianceFooter(ctx: OutreachContext): string {
  const unsubUrl = `${ctx.siteBaseUrl}/unsubscribe/${ctx.unsubToken}`;
  return `
    <div style="margin-top:28px;padding-top:14px;border-top:1px solid #eee;font-family:'Helvetica Neue',Arial,sans-serif">
      <p style="color:#888;font-size:11px;line-height:1.6;margin:0">
        ${esc(ctx.sourceLine)}
      </p>
      <p style="color:#888;font-size:11px;line-height:1.6;margin:8px 0 0">
        Not interested? <a href="${unsubUrl}" style="color:#888;text-decoration:underline">Unsubscribe here</a> and I won't email you again.
      </p>
      <p style="color:#aaa;font-size:10px;line-height:1.6;margin:12px 0 0;letter-spacing:0.3px">
        Agentic Consciousness &middot; Ourimbah NSW 2258 &middot; daniel@agenticconsciousness.com.au
      </p>
    </div>`;
}

/** Plain wrapper: no branded header, just a readable letter. */
function plainEmail(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agentic Consciousness</title>
</head>
<body style="margin:0;padding:32px 20px;background:#ffffff;color:#222;font-family:'Helvetica Neue',Arial,sans-serif;line-height:1.6">
<div style="max-width:560px;margin:0 auto">
${content}
</div>
</body>
</html>`;
}

export function buildTouch1(ctx: OutreachContext): { subject: string; html: string } {
  const top = topIssues(ctx.issues, 3);
  const criticalCount = ctx.issues.filter((i) => i.severity?.toLowerCase() === 'critical').length;
  const highCount = ctx.issues.filter((i) => i.severity?.toLowerCase() === 'high').length;
  const subject = criticalCount > 0
    ? `Quick note on ${ctx.domain} (a few critical things)`
    : `Quick note on ${ctx.domain}`;

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
  const issueCountWord = criticalCount + highCount > 0
    ? `${criticalCount + highCount} critical and high-priority`
    : `a few`;

  const html = plainEmail(`
    <p style="color:#222;font-size:16px;line-height:1.6;margin:0 0 14px">
      Hi ${greeting},
    </p>
    <p style="color:#222;font-size:16px;line-height:1.6;margin:0 0 14px">
      I'm Daniel, a local on the Central Coast (Ourimbah).
    </p>
    <p style="color:#222;font-size:16px;line-height:1.6;margin:0 0 14px">
      I had a proper look at ${esc(ctx.domain)} this morning and spotted
      ${issueCountWord} things that are probably costing you leads. Nothing
      complicated, just stuff that adds up.
    </p>
    ${ctx.mockupToken ? `
    <p style="color:#222;font-size:16px;line-height:1.6;margin:0 0 10px">
      <strong>Rather than talk about it, I built you a rough version of how
      it could look instead:</strong>
    </p>
    <p style="margin:0 0 14px">
      <a href="${ctx.siteBaseUrl}/preview/${ctx.mockupToken}"
         style="display:inline-block;background:#ff3d00;color:#fff;text-decoration:none;
                padding:12px 22px;font-weight:900;letter-spacing:2px;text-transform:uppercase;
                font-size:13px">
        SEE YOUR NEW SITE -&gt;
      </a>
    </p>
    ${ctx.mockupScreenshotUrl ? `
    <p style="margin:0 0 14px">
      <a href="${ctx.siteBaseUrl}/preview/${ctx.mockupToken}">
        <img src="${ctx.mockupScreenshotUrl}"
             alt="Mockup preview"
             style="max-width:100%;height:auto;border:1px solid #0a0a0a;display:block" />
      </a>
    </p>` : ''}
    ` : ''}
    <p style="color:#222;font-size:16px;line-height:1.6;margin:0 0 10px">
      The top three:
    </p>
    <ol style="padding-left:20px;margin:0 0 18px;color:#222;font-size:15px;line-height:1.55">
      ${issueHtml}
    </ol>
    <p style="color:#222;font-size:16px;line-height:1.6;margin:0 0 14px">
      I've attached the full PDF, ${ctx.issues.length} findings in total,
      each with what we found and exactly what to do about it. Step by step.
      No login, no form, just the PDF.
    </p>
    <p style="color:#222;font-size:16px;line-height:1.6;margin:0 0 14px">
      If you'd rather we just fix the lot for you, the PDF has a page at the
      end with what we'd do and how we'd do it (48 hours, $999, 12 months of
      maintenance included).
    </p>
    <p style="color:#222;font-size:16px;line-height:1.6;margin:0 0 14px">
      Either way, hit reply if anything's unclear. If it's not your
      priority right now, bin the email, no follow up, no worries.
    </p>
    ${signature(ctx)}
    ${complianceFooter(ctx)}
  `);

  return { subject, html };
}

export function buildTouch2(ctx: OutreachContext): { subject: string; html: string } {
  const subject = `Re: Quick note on ${ctx.domain}`;
  const html = plainEmail(`
    <p style="color:#222;font-size:16px;line-height:1.6;margin:0 0 14px">
      Following up on the audit I sent. Not sure if it landed in junk or
      you've been slammed this week.
    </p>
    <p style="color:#222;font-size:16px;line-height:1.6;margin:0 0 14px">
      If any of the issues resonated, the offer is a flat
      <strong>$999 Lightning Website Sprint</strong>: 48-hour turnaround,
      mobile-first, AI-optimised, Claude chatbot trained on your content,
      plus <strong>full 12-month maintenance included</strong> (copy tweaks,
      image swaps, security patches, uptime monitoring). Every issue in
      the audit is covered. Money-back guarantee if it is not live in
      48 hours.
    </p>
    <p style="color:#222;font-size:16px;line-height:1.6;margin:0 0 14px">
      Have a look:
      <a href="${ctx.siteBaseUrl}/book" style="color:#ff3d00;font-weight:700">
        ${ctx.siteBaseUrl}/book
      </a>
    </p>
    <p style="color:#222;font-size:16px;line-height:1.6;margin:0 0 14px">
      Or just reply and tell me which issue bothers you most. I'll answer
      straight, no pitch.
    </p>
    ${signature(ctx)}
    ${complianceFooter(ctx)}
  `);
  return { subject, html };
}

export function buildTouch3(ctx: OutreachContext): { subject: string; html: string } {
  const subject = `Re: Quick note on ${ctx.domain}`;
  const html = plainEmail(`
    <p style="color:#222;font-size:16px;line-height:1.6;margin:0 0 14px">
      Last note from me. If now isn't the right time, all good. I'll stop
      emailing. I just wanted to leave you the link in case it's useful
      later:
    </p>
    <p style="color:#222;font-size:16px;line-height:1.6;margin:0 0 14px">
      <a href="${ctx.siteBaseUrl}/book" style="color:#ff3d00;font-weight:700">
        ${ctx.siteBaseUrl}/book
      </a>
      : $999 flat, 48 hours, 12 months of maintenance included, fixes every
      issue in the audit.
    </p>
    <p style="color:#222;font-size:16px;line-height:1.6;margin:0 0 14px">
      If there was something specific in the audit you wanted a plain-English
      explanation of, reply and I'll write it up. No obligation either way.
    </p>
    ${signature(ctx)}
    ${complianceFooter(ctx)}
  `);
  return { subject, html };
}

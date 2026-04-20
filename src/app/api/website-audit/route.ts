import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { sql } from '@/lib/pg';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/parseAiJson';
import { sendEmail, emailTemplate, notifyAdmin } from '@/lib/email';

/**
 * Email-only audit flow.
 *
 * Visitor submits URL + email. We acknowledge immediately and run the
 * Claude audit + email delivery in the background via Vercel's after()
 * hook so the UI never blocks. Result: instant "check your inbox"
 * confirmation; audit arrives async.
 *
 * The raw HTML fetch, AI call, lead insert, and user email all happen
 * inside after(). If any step fails the admin gets notified so we can
 * manually follow up.
 */

// Opus 4.7 — top-of-lineup reasoning model. Deliberately NOT using the
// codebase-wide STANDARD_MODEL (Sonnet 4) because the audit is the front-
// door lead magnet: a visitor hands us their URL + email specifically to
// be impressed, so we pay the extra tokens for depth. Audit volume is
// one-per-lead, not high-throughput.
const MODEL = 'claude-opus-4-7';
const INTERNAL_LEAD_EMAIL = 'ai@agenticconsciousness.com.au';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const AUDIT_SYSTEM = `You are a senior conversion + technical web auditor for Agentic Consciousness, an Australian AI consulting firm. You have 20 years of hands-on web work: strategy, CRO, accessibility, SEO, dev, and AI integration. You are not a checklist robot.

Your job: produce an audit that feels like a paid one-hour consultation from an expert who has actually looked at the visitor's site. Generic "add meta descriptions" boilerplate is a FAIL. Every finding must quote specific copy, class names, tags, or structural patterns from the HTML you were given \u2014 otherwise it is noise and you should drop it.

Analyse in this order of business impact:

1. VALUE PROPOSITION & CONVERSION (by far the most important)
   - What does this business actually sell, to whom, for how much, and why them over a competitor? Is that answered in the first viewport or buried?
   - Is the primary call-to-action specific and high-intent ("Book a quote", "Get a free inspection") or generic ("Contact us", "Learn more")?
   - Does the copy speak to a specific AU customer's pain, or is it vague corporate filler?
2. TRUST & CREDIBILITY \u2014 real testimonials vs generic stock quotes, review counts, before/after photos, licence numbers, ABN, years in business, industry memberships
3. MOBILE FIRST \u2014 viewport tag, responsive image markup, tap target sizing hints, font sizes, line length
4. TECHNICAL SEO \u2014 <title> wording (does it target a high-intent query?), meta description (is it a sell or a shrug?), single <h1>, schema (LocalBusiness / Service / FAQ), canonical, alt text
5. PERFORMANCE & HYGIENE \u2014 render-blocking resources, too many fonts, inline styles, unoptimised imagery, legacy jQuery-era patterns
6. DESIGN PROFESSIONALISM \u2014 typography discipline, whitespace, colour consistency, visual hierarchy, hero imagery quality
7. AI OPPORTUNITY \u2014 ONE concrete, high-leverage place this specific business should deploy AI this quarter. Be specific to their industry and what you see. Examples: "rural plumber with manual after-hours booking \u2192 Claude-powered SMS triage bot for leak emergencies"

Return valid JSON only, no markdown, no backticks:
{
  "summary": "Three sentences. First: who this business is and the dominant impression their site gives. Second: the single biggest conversion-killer you found. Third: the single biggest AI opportunity for this specific business.",
  "score": integer 0-100,
  "issues": [
    {
      "category": "Conversion | Trust | Mobile | SEO | Performance | Design | AI",
      "severity": "critical | high | medium | low",
      "title": "5\u20138 word headline that would make a business owner say 'show me'",
      "detail": "3-4 sentences. Quote a specific phrase, class, or element from the HTML. Explain what a real visitor thinks or does because of it. Tie it to money \u2014 lost lead, abandoned checkout, lower conversion.",
      "fix": "One or two sentences giving a concrete action. Not 'improve SEO' \u2014 something like 'Replace the <title> CUSTOM PLUMBING SERVICES with a query-aligned version like Emergency Plumber Sydney | 24/7 Hot Water & Leaks \u2014 licence 12345'."
    }
  ]
}

Hard rules:
- Every finding MUST quote at least one specific element, phrase, or attribute from the HTML. If you cannot quote, drop the finding.
- Return 6\u201310 issues. If the site is genuinely strong, return fewer \u2014 do not pad.
- Order by severity (critical \u2192 low).
- Include at least one AI opportunity tailored to this specific business.
- Australian English. Direct, sharp tone. No hedging, no filler, no generic "consider adding" phrasing.
- Score honestly. A site with a viewport tag, decent title, and functional CTA but no trust signals and weak value prop is a 55, not an 85.`;

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

interface Issue {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  fix: string;
}

function sanitiseHtml(raw: string): string {
  let out = raw;
  out = out.replace(/<script[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<style[\s\S]*?<\/style>/gi, '');
  out = out.replace(/<svg[\s\S]*?<\/svg>/gi, '<svg/>');
  out = out.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  out = out.replace(/<!--([\s\S]*?)-->/g, '');
  out = out.replace(/\s+/g, ' ').trim();
  if (out.length > 35000) out = out.slice(0, 35000) + '\n\n[\u2026TRUNCATED\u2026]';
  return out;
}

function normaliseUrl(input: string): URL | null {
  try {
    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const u = new URL(withScheme);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    const host = u.hostname.toLowerCase();
    if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host)) return null;
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return null;
    if (host.endsWith('.internal') || host.endsWith('.local')) return null;
    return u;
  } catch {
    return null;
  }
}

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

async function runAudit({
  url,
  email,
  ref,
  ip,
}: {
  url: string;
  email: string;
  ref: string;
  ip: string;
}): Promise<void> {
  const start = Date.now();
  console.log('[website-audit] start', { url, email, ref, model: MODEL });
  try {
    // 1. Fetch HTML
    console.log('[website-audit] fetching HTML', { url });
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 2_000_000) throw new Error('HTML too large (>2MB)');
    const html = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    const stripped = sanitiseHtml(html);
    console.log('[website-audit] HTML sanitised', { originalBytes: buf.byteLength, strippedChars: stripped.length });

    // 2. Call Claude
    console.log('[website-audit] calling Claude', { model: MODEL, maxTokens: 2500 });
    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 2500,
        system: [{ type: 'text', text: AUDIT_SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: `URL: ${url}\n\nHTML (sanitised):\n\n${stripped}`,
          },
        ],
      },
      { signal: AbortSignal.timeout(120000) },
    );

    console.log('[website-audit] Claude responded', {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      stopReason: response.stop_reason,
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    let rawParsed: unknown;
    try {
      rawParsed = parseAiJson(text);
    } catch (err) {
      console.error('[website-audit] parseAiJson threw', err instanceof Error ? err.message : err);
      console.error('[website-audit] raw text was:', text.slice(0, 2000));
      throw new Error('AI produced invalid JSON');
    }
    if (!rawParsed || typeof rawParsed !== 'object') throw new Error('AI returned non-object');
    const parsed = rawParsed as {
      summary?: string;
      score?: number;
      issues?: Issue[];
    };
    const summary = typeof parsed.summary === 'string' ? parsed.summary : '';
    const score = typeof parsed.score === 'number' ? parsed.score : 0;
    const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
    const sorted = [...issues].sort(
      (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
    );

    // 3. Store lead (with full payload for future reference)
    console.log('[website-audit] storing lead', { email, score, issues: sorted.length });
    await sql`
      INSERT INTO leads (source, email, metadata)
      VALUES (
        'website-audit',
        ${email},
        ${JSON.stringify({
          url,
          summary,
          score,
          issues: sorted,
          ref,
          ip,
          tookMs: Date.now() - start,
        })}::jsonb
      )
    `;

    // 4. Email the user
    console.log('[website-audit] sending user email', { to: email });
    const issuesHtml = sorted.map(renderIssueCard).join('');
    const scoreBadge = `<div style="display:inline-block;padding:6px 12px;background:#ff3d00;color:#fff;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px">Score ${score} / 100</div>`;

    await sendEmail({
      to: email,
      subject: `Your website audit \u2014 ${url}`,
      html: emailTemplate(`
        <h2 style="color:#fafaf8;font-size:22px;margin:0 0 10px;line-height:1.2">Website audit</h2>
        <div style="font-family:ui-monospace,monospace;font-size:12px;letter-spacing:1.5px;color:#ff5722;margin-bottom:16px;word-break:break-all">${esc(url)}</div>
        ${scoreBadge}
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

    // 5. Notify Daniel internally
    await notifyAdmin(
      `Website audit delivered: ${email}`,
      `URL: ${url}\nEmail: ${email}\nScore: ${score}/100\nIssues: ${sorted.length}\nRef: ${ref || '-'}\nTook: ${Date.now() - start}ms`,
    ).catch((err) => {
      console.error('[website-audit] admin notify failed', err instanceof Error ? err.message : err);
    });

    console.log('[website-audit] success', { url, email, score, issues: sorted.length, tookMs: Date.now() - start });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[website-audit] background job failed', { url, email, msg });

    // Try to tell the user politely, and also tell us.
    await sendEmail({
      to: email,
      subject: `Your website audit had a hiccup \u2014 ${url}`,
      html: emailTemplate(`
        <h2 style="color:#fafaf8;font-size:20px;margin:0 0 12px">We couldn't finish your audit</h2>
        <p style="color:#e0e0de;font-size:14px;line-height:1.7">
          Something went wrong running the audit against <strong style="color:#ff5722">${esc(url)}</strong>.
          Our team has been notified and will run it manually within 24 hours.
        </p>
        <p style="color:#e0e0de;font-size:14px;line-height:1.7">
          Reply to this email if you want to chat sooner or try a different URL.
        </p>
      `),
    }).catch(() => {});

    await notifyAdmin(
      `FAILED: Website audit for ${email}`,
      `URL: ${url}\nEmail: ${email}\nRef: ${ref || '-'}\nError: ${msg}\nTook: ${Date.now() - start}ms`,
    ).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: `Rate limit exceeded. Try again in ${retryAfter}s.` }, { status: 429 });
  }

  try {
    const body = await req.json();
    const rawUrl = typeof body.url === 'string' ? body.url : '';
    const rawEmail = typeof body.email === 'string' ? body.email : '';
    const rawRef = typeof body.ref === 'string' ? body.ref : '';

    const u = normaliseUrl(rawUrl);
    if (!u) {
      return NextResponse.json({ error: 'Enter a valid website URL.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
    }
    const ref = /^[A-Za-z0-9._-]{1,64}$/.test(rawRef) ? rawRef : '';

    // Ack immediately; run the heavy work in the background so the user
    // isn't sitting on a 30-second spinner.
    after(() => runAudit({ url: u.toString(), email: rawEmail, ref, ip }));

    return NextResponse.json({
      success: true,
      message: `On it. Your audit for ${u.toString()} will arrive at ${rawEmail} within a couple of minutes.`,
    });
  } catch (error) {
    console.error('[website-audit] handler error', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Could not start the audit. Try again.' }, { status: 500 });
  }
}

import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { sql } from '@/lib/pg';
import { checkRateLimit } from '@/lib/rate-limit';
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

// Audit model. Sonnet 4.6 default — 5x cheaper than Opus on output
// ($15 vs $75 per million tokens), structured tool-use with a fixed
// JSON schema is well within Sonnet's range. Override via
// AI_AUDIT_MODEL env var (e.g. claude-opus-4-7) for richer reasoning.
const MODEL = process.env.AI_AUDIT_MODEL || 'claude-sonnet-4-6';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const AUDIT_SYSTEM = `You are a senior conversion + technical web auditor. 20 years of hands-on web work: strategy, CRO, accessibility, SEO, dev, and AI integration. You are not a checklist robot.

Your job: produce an audit that feels like a paid one-hour consultation from an expert who has actually looked at the visitor's site. Generic "add meta descriptions" boilerplate is a FAIL. Every finding must quote specific copy, class names, tags, or structural patterns from the HTML you were given \u2014 otherwise it is noise and you should drop it.

You are given MULTIPLE pages from the site \u2014 the homepage plus up to 4 extra pages selected from their sitemap (About, Contact, Services, and whatever other trust-relevant paths exist). Before claiming something is MISSING from the site (a credential, registration number, testimonials, contact details, pricing, etc.), you MUST first search EVERY provided page. If the evidence exists on any page, treat it as present and cite that page. If you truly cannot find it after searching every page, only then flag the absence \u2014 and note explicitly which pages you checked. Hallucinating missing trust signals will cost the visitor a sale when they know full well the signal is on a page you read. Do not do it.

Analyse in this order of business impact:

1. VALUE PROPOSITION & CONVERSION (by far the most important)
   - What does this business actually sell, to whom, for how much, and why them over a competitor? Is that answered in the first viewport or buried?
   - Is the primary call-to-action specific and high-intent ("Book a quote", "Get a free inspection") or generic ("Contact us", "Learn more")?
   - Does the copy speak to a specific customer's pain in their own words, or is it vague corporate filler?
2. TRUST & CREDIBILITY \u2014 real testimonials vs generic stock quotes, review counts + sources, before/after photos, credentials, registration or licence numbers, years in business, industry memberships, case studies, named team members
3. MOBILE FIRST \u2014 viewport tag, responsive image markup, tap target sizing hints, font sizes, line length
4. TECHNICAL SEO \u2014 <title> wording (does it target a high-intent query?), meta description (is it a sell or a shrug?), single <h1>, schema markup (Organization, Product, Service, FAQ, Article as relevant), canonical, alt text on meaningful images

5. SOCIAL SHARING \u2014 Open Graph + Twitter Card tags. These decide what a shared link looks like on Facebook, LinkedIn, iMessage, Slack, WhatsApp, X. A pre-extracted meta-tag table is provided above the HTML \u2014 use it. Check specifically:
   \u2022 og:title present and compelling (30\u201365 chars ideal)
   \u2022 og:description present (60\u2013160 chars ideal, pitch not shrug)
   \u2022 og:image present, served over HTTPS, and ideally absolute (http(s)://) not relative. Recommended dimensions 1200\u00d7630 \u2014 flag if you can't tell from the URL (we can't verify dimensions ourselves, so phrase as "verify dimensions are 1200\u00d7630").
   \u2022 og:url present and matches canonical
   \u2022 og:type set ("website" for landing pages, "article" for blog posts)
   \u2022 og:site_name present
   \u2022 og:locale matches the site's actual locale (not "en_US" by default on a non-US site)
   \u2022 twitter:card at minimum "summary_large_image"; twitter:image set (falls back to og:image if absent but explicit is better)
   \u2022 theme-color set for mobile browsers
   For any MISSING tag, the severity is AT LEAST medium; og:image missing is critical because Facebook shares will look like a grey blank.
6. PERFORMANCE & HYGIENE \u2014 render-blocking resources, too many fonts, inline styles, unoptimised imagery, legacy jQuery-era patterns
7. DESIGN PROFESSIONALISM \u2014 typography discipline, whitespace, colour consistency, visual hierarchy, hero imagery quality
8. AI OPPORTUNITY \u2014 ONE concrete, high-leverage place this specific business should deploy AI this quarter. Be specific to their industry and what you saw on the site. Name the problem you spotted, the AI intervention (chatbot / triage / enrichment / agent / doc processing / etc), and the measurable outcome it would produce.

Return valid JSON only, no markdown, no backticks:
{
  "summary": "Three sentences. First: who this business is and the dominant impression their site gives. Second: the single biggest conversion-killer you found. Third: the single biggest AI opportunity for this specific business.",
  "score": integer 0-100,
  "issues": [
    {
      "category": "Conversion | Trust | Mobile | SEO | Social | Performance | Design | AI",
      "severity": "critical | high | medium | low",
      "title": "5\u20138 word headline that would make a business owner say 'show me'",
      "detail": "3-4 sentences. Quote a specific phrase, class, or element from the HTML. Explain what a real visitor thinks or does because of it. Tie it to money \u2014 lost lead, abandoned checkout, lower conversion.",
      "fix": "One or two sentences giving a concrete action. Not 'improve SEO' \u2014 something like 'Replace the <title> HOMEPAGE with a query-aligned alternative that names the exact service and location.'"
    }
  ]
}

Hard rules:
- Every finding MUST quote at least one specific element, phrase, or attribute from the HTML. If you cannot quote, drop the finding.
- Return 6\u201310 issues. If the site is genuinely strong, return fewer \u2014 do not pad.
- Order by severity (critical \u2192 low).
- Include at least one AI opportunity tailored to this specific business.
- Direct, sharp tone. No hedging, no filler, no generic "consider adding" phrasing.
- Score honestly. A site with a viewport tag, decent title, and functional CTA but no trust signals and weak value prop is a 55, not an 85.`;

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Which page slugs we care about beyond the homepage, in priority order.
// Trust signals (licence numbers, ABN, testimonials, About-the-owner) and
// contact info typically live on these pages.
const PAGE_PRIORITY = [
  'about',
  'contact',
  'services',
  'service',
  'licence',
  'license',
  'accreditation',
  'credentials',
  'team',
  'testimonials',
  'reviews',
  'pricing',
];

const MAX_EXTRA_PAGES = 4;
const PER_PAGE_CHAR_CAP = 20000;

async function fetchText(target: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(target, {
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
        'Accept-Language': 'en-AU,en;q=0.9',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 3_000_000) return null;
    return new TextDecoder('utf-8', { fatal: false }).decode(buf);
  } catch {
    return null;
  }
}

/** Status-aware page fetch. Distinguishes WAF blocks (403/503/429) from
 * network failures so the error email can tell the user WHY the audit
 * couldn't read their site. */
async function fetchPage(target: string, timeoutMs: number): Promise<{ html: string | null; status: number | null }> {
  try {
    const res = await fetch(target, {
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { html: null, status: res.status };
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 3_000_000) return { html: null, status: res.status };
    return { html: new TextDecoder('utf-8', { fatal: false }).decode(buf), status: res.status };
  } catch {
    return { html: null, status: null };
  }
}

async function discoverSitemapUrls(origin: string): Promise<string[]> {
  // Try common sitemap locations in sequence.
  const candidates = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/sitemap-index.xml`];
  for (const candidate of candidates) {
    const xml = await fetchText(candidate, 5000);
    if (!xml) continue;
    const matches = xml.match(/<loc>\s*([^<\s]+)\s*<\/loc>/gi) ?? [];
    const urls = matches
      .map((m) => m.replace(/<\/?loc>/gi, '').trim())
      .filter((u) => /^https?:\/\//.test(u));
    if (urls.length > 0) {
      // If the first candidate was a sitemap index (contains sitemap.xml
      // entries rather than page URLs), follow one level down.
      const sub = urls.find((u) => /sitemap.*\.xml$/i.test(u));
      if (sub && urls.every((u) => /\.xml$/i.test(u))) {
        const subXml = await fetchText(sub, 5000);
        if (subXml) {
          const subMatches = subXml.match(/<loc>\s*([^<\s]+)\s*<\/loc>/gi) ?? [];
          return subMatches
            .map((m) => m.replace(/<\/?loc>/gi, '').trim())
            .filter((u) => /^https?:\/\//.test(u));
        }
      }
      return urls;
    }
  }
  return [];
}

interface MetaTags {
  title: string | null;
  description: string | null;
  canonical: string | null;
  themeColor: string | null;
  og: Record<string, string>;
  twitter: Record<string, string>;
}

/**
 * Regex-extract the meta tags that drive link-preview cards on
 * Facebook / LinkedIn / Slack / iMessage / WhatsApp / X. More reliable
 * than asking Claude to hunt through raw HTML for <meta property="og:*">.
 */
function extractMetaTags(html: string): MetaTags {
  const og: Record<string, string> = {};
  const twitter: Record<string, string> = {};

  const metaRe = /<meta\s+([^>]*?)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRe.exec(html)) !== null) {
    const attrs = m[1];
    const propMatch = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const contentMatch = /content\s*=\s*["']([^"']*)["']/i.exec(attrs);
    if (!propMatch || !contentMatch) continue;
    const key = propMatch[1].toLowerCase();
    const value = contentMatch[1];
    if (key.startsWith('og:')) og[key.slice(3)] = value;
    else if (key.startsWith('twitter:')) twitter[key.slice(8)] = value;
  }

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : null;

  const descRe1 = /<meta\s+[^>]*?(?:name|property)\s*=\s*["']description["'][^>]*?content\s*=\s*["']([^"']*)["'][^>]*?\/?>/i;
  const descRe2 = /<meta\s+[^>]*?content\s*=\s*["']([^"']*)["'][^>]*?(?:name|property)\s*=\s*["']description["'][^>]*?\/?>/i;
  const descMatch = descRe1.exec(html) ?? descRe2.exec(html);
  const description = descMatch ? descMatch[1].trim() : null;

  const canonRe1 = /<link\s+[^>]*?rel\s*=\s*["']canonical["'][^>]*?href\s*=\s*["']([^"']*)["'][^>]*?\/?>/i;
  const canonRe2 = /<link\s+[^>]*?href\s*=\s*["']([^"']*)["'][^>]*?rel\s*=\s*["']canonical["'][^>]*?\/?>/i;
  const canonMatch = canonRe1.exec(html) ?? canonRe2.exec(html);
  const canonical = canonMatch ? canonMatch[1].trim() : null;

  const themeMatch = /<meta\s+[^>]*?name\s*=\s*["']theme-color["'][^>]*?content\s*=\s*["']([^"']*)["']/i.exec(html);
  const themeColor = themeMatch ? themeMatch[1].trim() : null;

  return { title, description, canonical, themeColor, og, twitter };
}

function formatMetaTagReport(url: string, meta: MetaTags): string {
  const ogLines = Object.entries(meta.og).length
    ? Object.entries(meta.og).map(([k, v]) => `  og:${k} = ${v}`).join('\n')
    : '  (no og:* tags found)';
  const twLines = Object.entries(meta.twitter).length
    ? Object.entries(meta.twitter).map(([k, v]) => `  twitter:${k} = ${v}`).join('\n')
    : '  (no twitter:* tags found)';
  return [
    `Page: ${url}`,
    `  <title>: ${meta.title ?? '(missing)'}`,
    `  meta description: ${meta.description ?? '(missing)'}`,
    `  canonical: ${meta.canonical ?? '(missing)'}`,
    `  theme-color: ${meta.themeColor ?? '(missing)'}`,
    `  Open Graph:`,
    ogLines,
    `  Twitter Card:`,
    twLines,
  ].join('\n');
}

function pickExtraPages(primary: URL, sitemapUrls: string[]): string[] {
  const origin = primary.origin;
  const primaryStr = primary.toString();
  const sameOrigin = sitemapUrls.filter((u) => {
    try {
      return new URL(u).origin === origin;
    } catch {
      return false;
    }
  });

  // Score each URL: lower = higher priority. Prefer URLs whose path segments
  // contain one of the priority keywords; prefer shallower paths when tied.
  function score(u: string): number {
    const lower = u.toLowerCase();
    for (let i = 0; i < PAGE_PRIORITY.length; i++) {
      if (lower.includes(`/${PAGE_PRIORITY[i]}`)) return i;
    }
    return 999;
  }

  const ranked = sameOrigin
    .filter((u) => u !== primaryStr)
    .map((u) => ({ u, s: score(u), depth: new URL(u).pathname.split('/').filter(Boolean).length }))
    .sort((a, b) => a.s - b.s || a.depth - b.depth);

  // Dedupe by path, keep first occurrence (highest priority).
  const seenPaths = new Set<string>();
  const picked: string[] = [];
  for (const entry of ranked) {
    try {
      const path = new URL(entry.u).pathname.replace(/\/+$/, '');
      if (seenPaths.has(path)) continue;
      seenPaths.add(path);
      picked.push(entry.u);
      if (picked.length >= MAX_EXTRA_PAGES) break;
    } catch {
      // skip malformed
    }
  }
  return picked;
}

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
  // Keep both head and tail of the HTML when truncating — footers carry
  // licence numbers, ABN, contact info, testimonials. Taking only the
  // first N chars loses exactly the trust signals we need to audit.
  if (out.length > PER_PAGE_CHAR_CAP) {
    const halfBudget = Math.floor((PER_PAGE_CHAR_CAP - 64) / 2);
    out = out.slice(0, halfBudget) + ' [\u2026MIDDLE TRUNCATED\u2026] ' + out.slice(-halfBudget);
  }
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
    <div class="ac-card" style="border-left:3px solid #ff3d00;padding:14px 16px;margin-bottom:14px;background:#fafafa">
      <div class="ac-accent" style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#cc3100;margin-bottom:6px">
        ${sev} &middot; ${cat}
      </div>
      <div class="ac-heading" style="font-weight:900;color:#0a0a0a;font-size:15px;margin-bottom:8px;line-height:1.3">
        ${esc(issue.title)}
      </div>
      <div class="ac-body" style="color:#333333;font-size:13px;line-height:1.6;margin-bottom:8px">
        ${esc(issue.detail)}
      </div>
      <div class="ac-accent" style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#cc3100">
        FIX &rarr; <span class="ac-body" style="color:#333333;text-transform:none;letter-spacing:0;font-size:12px">${esc(issue.fix)}</span>
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
    // 1. Fetch homepage + sitemap-discovered trust-signal pages in parallel.
    const primary = new URL(url);
    console.log('[website-audit] fetching homepage + sitemap', { url, origin: primary.origin });

    const sitemapUrls = await discoverSitemapUrls(primary.origin);
    const extraPages = pickExtraPages(primary, sitemapUrls);
    console.log('[website-audit] sitemap discovered', {
      sitemapCount: sitemapUrls.length,
      pickedExtras: extraPages,
    });

    const targets = [url, ...extraPages];
    const pageResults = await Promise.all(
      targets.map(async (t) => {
        const { html, status } = await fetchPage(t, 10000);
        if (!html) return { url: t, ok: false as const, status };
        return {
          url: t,
          ok: true as const,
          status,
          stripped: sanitiseHtml(html),
          meta: extractMetaTags(html),
          rawBytes: html.length,
        };
      }),
    );

    const successful = pageResults.filter((p): p is Extract<typeof p, { ok: true }> => p.ok);

    // Detect WAF / bot-protection blocking. If every page returned 403/429/503
    // (or close variants), the site's firewall is rejecting automated scans
    // entirely — there's no audit to run. Send a special "AI-invisible" alert
    // email instead of the generic hiccup.
    const WAF_STATUSES = new Set([401, 403, 406, 429, 503]);
    const allBlocked =
      successful.length === 0 &&
      pageResults.length > 0 &&
      pageResults.every((p) => typeof p.status === 'number' && WAF_STATUSES.has(p.status as number));

    if (allBlocked) {
      const status = pageResults[0].status;
      console.log('[website-audit] WAF detected', { url, status });
      await sql`
        INSERT INTO leads (source, email, metadata)
        VALUES (
          'website-audit-waf-blocked',
          ${email},
          ${JSON.stringify({ url, ref, ip, status, pageResults: pageResults.map((p) => ({ url: p.url, status: p.status })) })}::jsonb
        )
      `;
      await sendEmail({
        to: email,
        subject: `URGENT: Your website is invisible to AI \u2014 ${url}`,
        html: emailTemplate(`
          <h2 class="ac-heading" style="color:#0a0a0a;font-size:22px;margin:0 0 12px;line-height:1.2">
            Your site is blocking AI. You're invisible.
          </h2>
          <div class="ac-accent" style="font-family:ui-monospace,monospace;font-size:12px;letter-spacing:1.5px;color:#cc3100;margin-bottom:20px;word-break:break-all">
            ${esc(url)} \u2014 returning HTTP ${status ?? 'blocked'}
          </div>
          <p class="ac-body" style="color:#333333;font-size:15px;line-height:1.7;margin:0 0 16px">
            Your website rejected our audit because a firewall on your host is
            refusing every non-browser visitor. That same firewall is blocking
            <strong class="ac-heading" style="color:#0a0a0a">every AI search engine</strong>
            \u2014 ChatGPT, Claude, Perplexity, Google AI Overviews, Bing Copilot, Gemini.
          </p>
          <p class="ac-body" style="color:#333333;font-size:15px;line-height:1.7;margin:0 0 16px">
            <strong class="ac-heading" style="color:#0a0a0a">Why this is urgent:</strong>
            a growing share of local-business enquiries now start inside an AI chat
            (&ldquo;best electrician in the Central Coast&rdquo;, &ldquo;plumber near me&rdquo;). If the AI
            can't read your site, you don't exist in those answers. Your competitors
            do. The longer this firewall stays in its current configuration, the
            more AI-originated leads go to someone else.
          </p>
          <div class="ac-card" style="border-left:3px solid #ff3d00;padding:14px 16px;margin:0 0 18px;background:#fafafa">
            <div class="ac-accent" style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#cc3100;margin-bottom:6px">
              Symptom
            </div>
            <div class="ac-body" style="color:#333333;font-size:13px;line-height:1.6">
              HTTP ${status ?? '4xx/5xx'} returned to our audit bot. Typical on
              managed hosting with aggressive default WAF rules (some GoDaddy,
              Crazy Domains, WP Engine setups) or Cloudflare Bot Fight Mode.
            </div>
          </div>
          <div class="ac-card" style="border-left:3px solid #ff3d00;padding:14px 16px;margin:0 0 24px;background:#fafafa">
            <div class="ac-accent" style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#cc3100;margin-bottom:6px">
              Fix
            </div>
            <div class="ac-body" style="color:#333333;font-size:13px;line-height:1.6">
              Whitelist AI crawlers (GPTBot, ClaudeBot, PerplexityBot,
              Google-Extended, OAI-SearchBot) at the WAF, OR \u2014 faster, more
              reliable \u2014 rebuild the site on a modern stack (Next.js + Vercel)
              that defaults to AI-friendly. A full mobile-first AI-optimised
              rebuild with the 48-hour launch offer fixes this AND every other
              conversion issue in one pass.
            </div>
          </div>
          <div class="ac-card-dark" style="margin-top:24px;padding:16px;border:2px solid #ff3d00;background:#ffffff">
            <div class="ac-heading" style="color:#0a0a0a;font-weight:900;font-size:15px;margin-bottom:6px">
              Rebuild in 48 hours
            </div>
            <p class="ac-body" style="color:#333333;font-size:13px;line-height:1.6;margin:0 0 12px">
              $999 launch offer, mobile-first, AI-optimised, Core Web Vitals
              tuned, Claude chatbot embedded. Integrations billed separately.
              100% money-back guarantee if not live in 48 hours.
            </p>
            <a href="https://agenticconsciousness.com.au/book" style="display:inline-block;background:#ff3d00;color:#fff;text-decoration:none;font-weight:900;font-size:13px;letter-spacing:2px;text-transform:uppercase;padding:12px 20px">
              Book the $999 Sprint &rarr;
            </a>
          </div>
        `),
      }).catch(() => {});
      await notifyAdmin(
        `WAF-blocked audit: ${url}`,
        [
          `URL: ${url}`,
          `Email: ${email}`,
          `Ref: ${ref || '-'}`,
          `IP: ${ip}`,
          `All page statuses: ${pageResults.map((p) => `${p.url}: ${p.status ?? 'null'}`).join(' | ')}`,
          `Sent the AI-invisible alert email. Tone: urgent rebuild.`,
        ].join('\n'),
      ).catch(() => {});
      return; // Done — no audit possible, alert sent.
    }

    if (successful.length === 0) {
      throw new Error('fetch failed: could not retrieve any page');
    }
    console.log('[website-audit] pages fetched', {
      attempted: targets.length,
      succeeded: successful.length,
      totalChars: successful.reduce((s, p) => s + p.stripped.length, 0),
    });

    // Compose labelled content block for Claude:
    //   1. Sitemap summary
    //   2. Pre-parsed meta tag table per page (title, description,
    //      canonical, og:*, twitter:*). Pre-parsing these avoids the
    //      model missing tags buried in raw HTML.
    //   3. Full sanitised HTML per page.
    const metaReport = successful
      .map((p) => formatMetaTagReport(p.url, p.meta))
      .join('\n\n');

    const stripped = [
      `SITEMAP SUMMARY: ${sitemapUrls.length} URLs discovered via sitemap.xml; ${extraPages.length} extras selected alongside the homepage (prioritised by trust-signal keywords: About, Contact, Services, Licence, Team, Testimonials).`,
      '',
      `=== SOCIAL PREVIEW / META TAGS (pre-extracted) ===`,
      '',
      metaReport,
      '',
      ...successful.map(
        (p, i) => `=== PAGE ${i + 1}: ${p.url} ===\n\n${p.stripped}`,
      ),
    ].join('\n\n');

    // 2. Call Claude via tool-use forcing. Opus 4.6 rejects assistant
    // prefill, so we use Anthropic's structured-output pattern instead:
    // define the audit schema as a tool and require Claude to call it.
    // Response lands as a tool_use block with already-parsed JSON input.
    const AUDIT_TOOL: Anthropic.Tool = {
      name: 'submit_audit',
      description: 'Submit the website audit findings in a strict structured format.',
      input_schema: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'Three sentences: who the business is, the biggest conversion-killer, and the biggest AI opportunity.',
          },
          score: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
            description: 'Overall site score out of 100. Be honest.',
          },
          issues: {
            type: 'array',
            minItems: 4,
            maxItems: 12,
            items: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  enum: ['Conversion', 'Trust', 'Mobile', 'SEO', 'Social', 'Performance', 'Design', 'AI'],
                },
                severity: {
                  type: 'string',
                  enum: ['critical', 'high', 'medium', 'low'],
                },
                title: { type: 'string', description: '5-8 word headline for the issue.' },
                detail: { type: 'string', description: '3-4 sentences quoting a specific element from the HTML.' },
                fix: { type: 'string', description: 'One or two sentences with a concrete action.' },
              },
              required: ['category', 'severity', 'title', 'detail', 'fix'],
            },
          },
        },
        required: ['summary', 'score', 'issues'],
      },
    };

    console.log('[website-audit] calling Claude', { model: MODEL, maxTokens: 3000, tool: 'submit_audit' });
    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 3000,
        system: [{ type: 'text', text: AUDIT_SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: `Primary URL: ${url}\n\nHTML (sanitised, multiple pages follow):\n\n${stripped}\n\nSearch ALL provided pages for trust signals (licence numbers, ABN, testimonials, contact details) before claiming anything is missing. Cite the specific page you found evidence on. Then produce the audit via the submit_audit tool.`,
          },
        ],
        tools: [AUDIT_TOOL],
        tool_choice: { type: 'tool', name: 'submit_audit' },
      },
      { signal: AbortSignal.timeout(120000) },
    );

    console.log('[website-audit] Claude responded', {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      stopReason: response.stop_reason,
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_audit',
    );
    if (!toolUse || !toolUse.input || typeof toolUse.input !== 'object') {
      const fallbackText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      throw new Error(`Claude did not call submit_audit tool. Fallback text preview: ${fallbackText.slice(0, 800) || '(empty)'}`);
    }

    const rawParsed = toolUse.input;
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
        <h2 class="ac-heading" style="color:#0a0a0a;font-size:22px;margin:0 0 10px;line-height:1.2">Website audit</h2>
        <div class="ac-accent" style="font-family:ui-monospace,monospace;font-size:12px;letter-spacing:1.5px;color:#cc3100;margin-bottom:16px;word-break:break-all">${esc(url)}</div>
        ${scoreBadge}
        ${summary ? `<p class="ac-body" style="color:#333333;font-size:14px;line-height:1.7;margin:0 0 20px">${esc(summary)}</p>` : ''}
        <div class="ac-accent" style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#cc3100;margin-bottom:10px">
          ${sorted.length} issues found
        </div>
        ${issuesHtml}
        <div class="ac-card-dark" style="margin-top:24px;padding:16px;border:2px solid #ff3d00;background:#ffffff">
          <div class="ac-heading" style="color:#0a0a0a;font-weight:900;font-size:15px;margin-bottom:6px">Want this fixed?</div>
          <p class="ac-body" style="color:#333333;font-size:13px;line-height:1.6;margin:0 0 12px">
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
    const name = err instanceof Error ? err.name : 'Unknown';
    const stack = err instanceof Error && err.stack ? err.stack.split('\n').slice(0, 12).join('\n') : '(no stack)';
    // Anthropic SDK errors often carry extra context on err.status / err.error
    const extra: Record<string, unknown> = {};
    if (err && typeof err === 'object') {
      for (const k of ['status', 'error', 'type', 'headers'] as const) {
        const v = (err as Record<string, unknown>)[k];
        if (v !== undefined) extra[k] = v;
      }
    }
    console.error('[website-audit] background job failed', { url, email, name, msg, extra });

    // Visitor gets a polite note, no internals.
    await sendEmail({
      to: email,
      subject: `Your website audit had a hiccup \u2014 ${url}`,
      html: emailTemplate(`
        <h2 class="ac-heading" style="color:#0a0a0a;font-size:20px;margin:0 0 12px">We couldn't finish your audit</h2>
        <p class="ac-body" style="color:#333333;font-size:14px;line-height:1.7">
          Something went wrong running the audit against <strong class="ac-accent" style="color:#cc3100">${esc(url)}</strong>.
          Our team has been notified and will run it manually within 24 hours.
        </p>
        <p class="ac-body" style="color:#333333;font-size:14px;line-height:1.7">
          Reply to this email if you want to chat sooner or try a different URL.
        </p>
      `),
    }).catch(() => {});

    // Admin email surfaces everything useful for diagnosis.
    await notifyAdmin(
      `FAILED: Website audit \u2014 ${name}: ${msg.slice(0, 80)}`,
      [
        `URL: ${url}`,
        `Email: ${email}`,
        `Ref: ${ref || '-'}`,
        `IP: ${ip}`,
        `Model: ${MODEL}`,
        `Error name: ${name}`,
        `Error message: ${msg}`,
        `Extra context: ${JSON.stringify(extra, null, 2)}`,
        `Took: ${Date.now() - start}ms`,
        ``,
        `Stack (top 12 lines):`,
        stack,
      ].join('\n'),
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

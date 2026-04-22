import Anthropic from '@anthropic-ai/sdk';
import { stripDashes } from '@/lib/text-hygiene';

/**
 * Reusable audit core. Extracts the pure "fetch pages → run Claude →
 * structured JSON" pipeline from the visitor-facing audit route so we
 * can reuse it in the admin outreach flow without dragging the email
 * delivery along.
 */

const MODEL = process.env.AI_AUDIT_MODEL || 'claude-opus-4-6';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const PAGE_PRIORITY = [
  'about', 'contact', 'services', 'service', 'licence', 'license',
  'accreditation', 'credentials', 'team', 'testimonials', 'reviews', 'pricing',
];

const MAX_EXTRA_PAGES = 4;
const PER_PAGE_CHAR_CAP = 20000;
const WAF_STATUSES = new Set([401, 403, 406, 429, 503]);

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'legal';

export interface Issue {
  category: string;
  /** `legal` is reserved for WCAG/accessibility/compliance issues (missing
   *  alt text, form labels, contrast fails, blocked viewport zoom). Treated
   *  distinctly from critical — the risk profile is regulatory, not lost
   *  revenue. Rendered in purple in the PDF. */
  severity: Severity;
  title: string;
  detail: string;
  fix: string;
}

/** An Opportunity is a proactive upgrade (AI chatbot, automation, new tool)
 *  the prospect could add. NOT a problem with their current site. Kept
 *  separate from `issues` so the findings page reads as problems-to-solve
 *  and the opportunities page reads as upside. */
export interface Opportunity {
  category: string;
  title: string;
  detail: string;
  fix: string;
}

export interface AuditResult {
  ok: true;
  url: string;
  score: number;
  summary: string;
  issues: Issue[];
  opportunities: Opportunity[];
  pageResults: Array<{ url: string; status: number | null; ok: boolean }>;
  pagesFetched: number;
  rawHtmlByUrl: Record<string, string>;
}

export interface AuditBlockedResult {
  ok: false;
  reason: 'waf' | 'no_pages';
  url: string;
  pageResults: Array<{ url: string; status: number | null; ok: boolean }>;
}

export type AuditRunResult = AuditResult | AuditBlockedResult;

function buildAuditSystemPrompt(): string {
  const today = new Date();
  const isoDate = today.toISOString().slice(0, 10);
  const year = today.getUTCFullYear();
  return `You are a senior conversion + technical web auditor. 20 years of hands-on web work: strategy, CRO, accessibility, SEO, dev, and AI integration. You are not a checklist robot.

TODAY'S DATE: ${isoDate} (current year is ${year}). Use this whenever a finding depends on time, freshness, or date comparisons.

Your job: produce an audit that feels like a paid one-hour consultation from an expert who has actually looked at the visitor's site. Generic "add meta descriptions" boilerplate is a FAIL. Every finding must quote specific copy, class names, tags, or structural patterns from the HTML you were given, otherwise it is noise and you should drop it.

You are given MULTIPLE pages from the site: the homepage plus up to 4 extra pages selected from their sitemap. Before claiming something is MISSING, you MUST first search EVERY provided page. Cite the page you found evidence on.

Analyse in this order: (1) VALUE PROPOSITION & CONVERSION, (2) TRUST & CREDIBILITY, (3) MOBILE FIRST, (4) LEGAL/ACCESSIBILITY (WCAG 2.2 AA), (5) TECHNICAL SEO, (6) SOCIAL SHARING (Open Graph + Twitter), (7) PERFORMANCE & HYGIENE, (8) DESIGN PROFESSIONALISM, (9) AI & AUTOMATION OPPORTUNITIES (MULTIPLE concrete, high-leverage interventions tailored to THIS specific business — see rules below).

Severity levels and when to use each:
- critical: site is actively losing money or failing to function (no clear CTA, site broken on mobile, hero blocks conversion)
- high: major gap with measurable revenue or trust impact
- medium: meaningful but not urgent
- low: polish
- legal: WCAG/accessibility/compliance failure. Use for: missing alt text on meaningful images, form inputs without labels, colour contrast < 4.5:1 on body text, viewport meta with user-scalable=no or maximum-scale=1 (blocks zoom, WCAG 1.4.4), missing <html lang>. Legal findings surface regulatory/ADA-style risk, not just UX friction.

Hard rules:
- Every finding MUST quote at least one specific element, phrase, or attribute.
- Return 6 to 10 issues. Fewer if the site is genuinely strong. Do not pad.
- One finding per issue. Never conflate two issues into one finding. Split compound issues (e.g. weak title tag AND typos) into separate items.
- Order by severity (critical, high, medium, low, legal). Legal sits last even if serious, it renders as its own visual block in the PDF.
- AI category findings MUST go under category "AI". These render as "Opportunities" (upside upgrades), not problems. You must surface AT LEAST 2 AND IDEALLY 3 OPPORTUNITIES, every one of which is specific to this exact business and the content on their actual pages. The opportunities must fall into DIFFERENT types so we read as a thoughtful advisor, not a script. Pick from (and name in the title): (a) AI chatbot trained on THEIR FAQs/services/menu, (b) AI-powered booking / quote / lead capture automation tied to THEIR existing workflow, (c) AI search / answer engine (AEO) visibility so Claude/ChatGPT cite them, (d) personalisation or dynamic content tailored to THEIR audience segments, (e) customer-review/response automation, (f) content generation engine (blog, SEO, social) seeded from THEIR real products/services, (g) operational automation (email triage, inventory sync, report generation), (h) voice agent answering their phone after hours. REJECT generic wording like "deploy a chatbot" or "add AI". Every opportunity MUST name a concrete thing from their site (a product, a service, a customer segment, a page, a form, a specific CTA, a real FAQ, a real review) and explain how the intervention uses THAT specific thing. The "fix" field is titled "HOW WE'D ADD IT" in the PDF — be concrete, name the plug-in/library/API/technique, and give an example of one actual prompt/flow/response you would hard-wire so the reader can picture it live.
- Direct, sharp tone. No hedging.
- NEVER use em-dashes (U+2014) or en-dashes (U+2013) as punctuation. Use commas, colons, parentheses, or new sentences. Hyphens in compound words are fine.
- First sentence of "detail" MUST be the most concrete finding, with a specific quote or element. The PDF renders that first sentence in bold, so front-load the signal.
- NEVER flag a copyright year as "outdated" unless it is strictly LESS than ${year} (not equal to). A "© ${year}" footer is correct, not an error. A "© ${year + 1}" footer is a future-date bug worth flagging.
- Score honestly 0 to 100. Calibration: 0-30 critical (site is actively harmful), 31-50 poor (major gaps), 51-65 significant gaps, 66-80 solid with room to improve, 81-100 excellent. A site that loads, captures leads, and has basic meta tags should not score below 40.`;
}

async function fetchText(target: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(target, {
      redirect: 'follow',
      headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,*/*;q=0.8' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 3_000_000) return null;
    return new TextDecoder('utf-8', { fatal: false }).decode(buf);
  } catch { return null; }
}

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
  } catch { return { html: null, status: null }; }
}

async function discoverSitemapUrls(origin: string): Promise<string[]> {
  const candidates = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/sitemap-index.xml`];
  for (const candidate of candidates) {
    const xml = await fetchText(candidate, 5000);
    if (!xml) continue;
    const matches = xml.match(/<loc>\s*([^<\s]+)\s*<\/loc>/gi) ?? [];
    const urls = matches.map((m) => m.replace(/<\/?loc>/gi, '').trim()).filter((u) => /^https?:\/\//.test(u));
    if (urls.length > 0) {
      const sub = urls.find((u) => /sitemap.*\.xml$/i.test(u));
      if (sub && urls.every((u) => /\.xml$/i.test(u))) {
        const subXml = await fetchText(sub, 5000);
        if (subXml) {
          const subMatches = subXml.match(/<loc>\s*([^<\s]+)\s*<\/loc>/gi) ?? [];
          return subMatches.map((m) => m.replace(/<\/?loc>/gi, '').trim()).filter((u) => /^https?:\/\//.test(u));
        }
      }
      return urls;
    }
  }
  return [];
}

function pickExtraPages(primary: URL, sitemapUrls: string[]): string[] {
  const origin = primary.origin;
  const primaryStr = primary.toString();
  const sameOrigin = sitemapUrls.filter((u) => { try { return new URL(u).origin === origin; } catch { return false; } });
  function score(u: string): number {
    const lower = u.toLowerCase();
    for (let i = 0; i < PAGE_PRIORITY.length; i++) if (lower.includes(`/${PAGE_PRIORITY[i]}`)) return i;
    return 999;
  }
  const ranked = sameOrigin
    .filter((u) => u !== primaryStr)
    .map((u) => ({ u, s: score(u), depth: new URL(u).pathname.split('/').filter(Boolean).length }))
    .sort((a, b) => a.s - b.s || a.depth - b.depth);
  const seen = new Set<string>();
  const picked: string[] = [];
  for (const entry of ranked) {
    try {
      const path = new URL(entry.u).pathname.replace(/\/+$/, '');
      if (seen.has(path)) continue;
      seen.add(path);
      picked.push(entry.u);
      if (picked.length >= MAX_EXTRA_PAGES) break;
    } catch {}
  }
  return picked;
}

function sanitiseHtml(raw: string): string {
  let out = raw;
  out = out.replace(/<script[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<style[\s\S]*?<\/style>/gi, '');
  out = out.replace(/<svg[\s\S]*?<\/svg>/gi, '<svg/>');
  out = out.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  out = out.replace(/<!--([\s\S]*?)-->/g, '');
  out = out.replace(/\s+/g, ' ').trim();
  if (out.length > PER_PAGE_CHAR_CAP) {
    const half = Math.floor((PER_PAGE_CHAR_CAP - 64) / 2);
    out = out.slice(0, half) + ' [\u2026MIDDLE TRUNCATED\u2026] ' + out.slice(-half);
  }
  return out;
}

export function normaliseUrl(input: string): URL | null {
  try {
    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const u = new URL(withScheme);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    const host = u.hostname.toLowerCase();
    if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host)) return null;
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return null;
    if (host.endsWith('.internal') || host.endsWith('.local')) return null;
    return u;
  } catch { return null; }
}

export async function runStructuredAudit(url: string): Promise<AuditRunResult> {
  const primary = new URL(url);
  const sitemapUrls = await discoverSitemapUrls(primary.origin);
  const extras = pickExtraPages(primary, sitemapUrls);
  const targets = [url, ...extras];

  const pageResults = await Promise.all(
    targets.map(async (t) => {
      const { html, status } = await fetchPage(t, 10000);
      return { url: t, html, status };
    }),
  );

  const successful = pageResults.filter((p) => p.html !== null) as Array<{ url: string; html: string; status: number | null }>;
  const rawHtmlByUrl: Record<string, string> = {};
  for (const p of successful) rawHtmlByUrl[p.url] = p.html;

  const summary = pageResults.map((p) => ({ url: p.url, status: p.status, ok: p.html !== null }));

  if (successful.length === 0) {
    const allBlocked = pageResults.every((p) => typeof p.status === 'number' && WAF_STATUSES.has(p.status));
    return { ok: false, reason: allBlocked ? 'waf' : 'no_pages', url, pageResults: summary };
  }

  const stripped = successful.map((p, i) => `=== PAGE ${i + 1}: ${p.url} ===\n\n${sanitiseHtml(p.html)}`).join('\n\n');

  const AUDIT_TOOL: Anthropic.Tool = {
    name: 'submit_audit',
    description: 'Submit website audit findings in a strict structured format.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        score: { type: 'integer', minimum: 0, maximum: 100 },
        issues: {
          type: 'array', minItems: 4, maxItems: 12,
          items: {
            type: 'object',
            properties: {
              category: { type: 'string', enum: ['Conversion', 'Trust', 'Mobile', 'Legal', 'SEO', 'Social', 'Performance', 'Design', 'AI'] },
              severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'legal'] },
              title: { type: 'string' },
              detail: { type: 'string' },
              fix: { type: 'string' },
            },
            required: ['category', 'severity', 'title', 'detail', 'fix'],
          },
        },
      },
      required: ['summary', 'score', 'issues'],
    },
  };

  const response = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 3000,
      system: [{ type: 'text', text: buildAuditSystemPrompt(), cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Primary URL: ${url}\n\nHTML (sanitised, multiple pages follow):\n\n${stripped}\n\nProduce the audit via the submit_audit tool.`,
      }],
      tools: [AUDIT_TOOL],
      tool_choice: { type: 'tool', name: 'submit_audit' },
    },
    { signal: AbortSignal.timeout(120000) },
  );

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_audit');
  if (!toolUse || !toolUse.input || typeof toolUse.input !== 'object') {
    throw new Error('Claude did not call submit_audit tool');
  }
  const parsed = toolUse.input as { summary?: string; score?: number; issues?: Issue[] };
  // legal sorts last so the findings page leads with revenue-impact items
  // and compliance sits as its own block at the end.
  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, legal: 4 };
  // Claude sometimes slips em/en dashes + curly quotes into the output. Strip at
  // the audit boundary so every downstream consumer (PDF, emails) gets clean text.
  const clean = (s: string) => stripDashes(s).trim();
  const cleaned = (parsed.issues ?? []).map((i) => ({
    category: clean(i.category),
    severity: i.severity,
    title: clean(i.title),
    detail: clean(i.detail),
    fix: clean(i.fix),
  }));

  // Category "AI" findings are upgrades, not problems. Split them out so
  // the PDF renders them on a distinct "Opportunities" page. Everything
  // else stays in `issues`, sorted by severity.
  const opportunities: Opportunity[] = cleaned
    .filter((i) => i.category.toLowerCase() === 'ai')
    .map((i) => ({ category: i.category, title: i.title, detail: i.detail, fix: i.fix }));
  const issues = cleaned
    .filter((i) => i.category.toLowerCase() !== 'ai')
    .sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));

  return {
    ok: true,
    url,
    score: typeof parsed.score === 'number' ? parsed.score : 0,
    summary: typeof parsed.summary === 'string' ? clean(parsed.summary) : '',
    issues,
    opportunities,
    pageResults: summary,
    pagesFetched: successful.length,
    rawHtmlByUrl,
  };
}

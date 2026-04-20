import Anthropic from '@anthropic-ai/sdk';

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

export interface Issue {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
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

const AUDIT_SYSTEM = `You are a senior conversion + technical web auditor. 20 years of hands-on web work: strategy, CRO, accessibility, SEO, dev, and AI integration. You are not a checklist robot.

Your job: produce an audit that feels like a paid one-hour consultation from an expert who has actually looked at the visitor's site. Generic "add meta descriptions" boilerplate is a FAIL. Every finding must quote specific copy, class names, tags, or structural patterns from the HTML you were given — otherwise it is noise and you should drop it.

You are given MULTIPLE pages from the site — the homepage plus up to 4 extra pages selected from their sitemap. Before claiming something is MISSING, you MUST first search EVERY provided page. Cite the page you found evidence on.

Analyse in this order: (1) VALUE PROPOSITION & CONVERSION, (2) TRUST & CREDIBILITY, (3) MOBILE FIRST, (4) TECHNICAL SEO, (5) SOCIAL SHARING (Open Graph + Twitter), (6) PERFORMANCE & HYGIENE, (7) DESIGN PROFESSIONALISM, (8) AI OPPORTUNITY (one concrete, high-leverage AI intervention tailored to this specific business).

Hard rules:
- Every finding MUST quote at least one specific element, phrase, or attribute.
- Return 6–10 issues. Fewer if the site is genuinely strong — do not pad.
- Order by severity (critical → low).
- Include at least one AI opportunity.
- Direct, sharp tone. No hedging.
- Score honestly 0–100.`;

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
              category: { type: 'string', enum: ['Conversion', 'Trust', 'Mobile', 'SEO', 'Social', 'Performance', 'Design', 'AI'] },
              severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
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
      system: [{ type: 'text', text: AUDIT_SYSTEM, cache_control: { type: 'ephemeral' } }],
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
  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const issues = (parsed.issues ?? []).slice().sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));

  return {
    ok: true,
    url,
    score: typeof parsed.score === 'number' ? parsed.score : 0,
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    issues,
    pageResults: summary,
    pagesFetched: successful.length,
    rawHtmlByUrl,
  };
}

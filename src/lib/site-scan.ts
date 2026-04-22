/**
 * Deterministic site checks that run alongside the Claude-based audit.
 *
 *   1. Broken-link scan: HEAD every same-origin <a href> found in the
 *      fetched HTML, time out at 5s per request, flag 4xx/5xx.
 *   2. Viewport meta: regex for <meta name="viewport" content="width=device-width">
 *      so we can deterministically flag sites that aren't mobile-ready.
 *   3. Copyright year: grep footer HTML for a © year. Only flagged
 *      as outdated if strictly less than current year.
 *
 * These run inline (not in Claude prompt) so they never hallucinate.
 */

export interface BrokenLink {
  url: string;
  status: number | null;
  reason: string;
}

export interface SiteScanResult {
  brokenLinks: BrokenLink[];
  viewportMetaOk: boolean;
  copyrightYear: number | null;
  copyrightIsOutdated: boolean;
  sitemap: {
    found: boolean;
    url: string | null;
    urlCount: number;
  };
  seo: {
    title: string | null;
    metaDescription: string | null;
    h1s: string[];
    h2s: string[];
    topKeywords: Array<{ word: string; count: number }>;
  };
}

const UA =
  'Mozilla/5.0 (compatible; AgenticConsciousnessAudit/1.0; +https://agenticconsciousness.com.au)';

function extractLinks(html: string, origin: string): string[] {
  const hrefs = new Set<string>();
  const re = /<a\s[^>]*?href=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith('#') || raw.startsWith('javascript:')) continue;
    if (raw.startsWith('mailto:') || raw.startsWith('tel:')) continue;
    try {
      const abs = new URL(raw, origin).toString();
      const u = new URL(abs);
      // Only check same-origin to avoid false positives + rate-limit issues.
      if (u.origin !== origin) continue;
      hrefs.add(abs);
    } catch {
      // skip malformed
    }
  }
  return Array.from(hrefs);
}

async function checkLink(url: string): Promise<BrokenLink | null> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(5000),
    });
    // Some servers 405 on HEAD but serve GET fine. Retry with GET before flagging.
    if (res.status === 405 || res.status === 403) {
      const get = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': UA, Range: 'bytes=0-0' },
        signal: AbortSignal.timeout(5000),
      });
      if (get.status >= 400) {
        return { url, status: get.status, reason: `${get.status} ${get.statusText}` };
      }
      return null;
    }
    if (res.status >= 400) {
      return { url, status: res.status, reason: `${res.status} ${res.statusText}` };
    }
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return { url, status: null, reason: msg.slice(0, 120) };
  }
}

export async function scanBrokenLinks(html: string, origin: string, cap = 40): Promise<BrokenLink[]> {
  const links = extractLinks(html, origin).slice(0, cap);
  const results = await Promise.all(links.map(checkLink));
  return results.filter((x): x is BrokenLink => x !== null);
}

export function hasViewportMeta(html: string): boolean {
  const re = /<meta[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i;
  return re.test(html);
}

export function detectCopyrightYear(html: string): number | null {
  // Footer-ish zones first: prefer matches near the end of the document.
  // Walk the whole doc and pick the highest 4-digit year that looks like a copyright stamp.
  const re = /(?:©|&copy;|Copyright)[^0-9]{0,30}(\d{4})(?:\s*[-–—]\s*(\d{4}))?/gi;
  let best: number | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const yearB = m[2] ? parseInt(m[2], 10) : null;
    const yearA = parseInt(m[1], 10);
    const year = yearB ?? yearA;
    if (!Number.isFinite(year)) continue;
    if (year < 1990 || year > 2100) continue;
    if (best === null || year > best) best = year;
  }
  return best;
}

const STOPWORDS = new Set([
  'the','and','a','an','of','to','in','for','on','is','it','with','at','by','from','that','this','as','are','be','was','were','or','if','we','you','your','our','their','his','hers','they','them','there','here','what','when','where','how','why','not','no','yes','but','so','than','then','now','just','more','most','some','any','all','out','up','down','over','under','into','onto','off','can','will','would','could','should','may','might','must','do','does','did','done','has','have','had','been','being','i','im',"i'm",'me','my'
]);

function textOfHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html: string): string | null {
  const m = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  return m ? m[1].trim().slice(0, 200) : null;
}

function extractMetaDescription(html: string): string | null {
  const m = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i.exec(html)
        || /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i.exec(html);
  return m ? m[1].trim().slice(0, 400) : null;
}

function extractHeadings(html: string, tag: 'h1' | 'h2'): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = textOfHtml(m[1]).slice(0, 180);
    if (text) out.push(text);
    if (out.length >= 10) break;
  }
  return out;
}

function topKeywords(html: string, n = 12): Array<{ word: string; count: number }> {
  const text = textOfHtml(html).toLowerCase();
  const words = text.match(/[a-z][a-z'-]{2,}/g) ?? [];
  const counts = new Map<string, number>();
  for (const w of words) {
    if (STOPWORDS.has(w)) continue;
    if (/^\d+$/.test(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

async function probeSitemap(origin: string): Promise<{ found: boolean; url: string | null; urlCount: number }> {
  const candidates = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/sitemap-index.xml`];
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const text = await res.text();
      const matches = text.match(/<loc>\s*[^<\s]+\s*<\/loc>/gi) ?? [];
      return { found: true, url: candidate, urlCount: matches.length };
    } catch {
      // try next
    }
  }
  return { found: false, url: null, urlCount: 0 };
}

export async function runSiteScan(args: { url: string; html: string }): Promise<SiteScanResult> {
  const origin = (() => { try { return new URL(args.url).origin; } catch { return args.url; } })();
  const currentYear = new Date().getUTCFullYear();
  const copyrightYear = detectCopyrightYear(args.html);
  const copyrightIsOutdated = copyrightYear !== null && copyrightYear < currentYear;
  const viewportMetaOk = hasViewportMeta(args.html);

  const [brokenLinks, sitemap] = await Promise.all([
    scanBrokenLinks(args.html, origin),
    probeSitemap(origin),
  ]);

  const seo = {
    title: extractTitle(args.html),
    metaDescription: extractMetaDescription(args.html),
    h1s: extractHeadings(args.html, 'h1'),
    h2s: extractHeadings(args.html, 'h2'),
    topKeywords: topKeywords(args.html),
  };

  return { brokenLinks, viewportMetaOk, copyrightYear, copyrightIsOutdated, sitemap, seo };
}

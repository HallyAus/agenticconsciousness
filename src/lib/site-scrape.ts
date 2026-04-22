/**
 * Site-branding extraction from scraped home HTML.
 *
 * Pulls logo candidate, brand colours, and a shortlist of hero-worthy
 * content images. Used by audit-enrich to feed the mockup prompt real
 * visuals so Claude composes with the prospect's actual look and feel
 * instead of generic placeholders.
 *
 * Design constraint: we must NOT download every image on the page.
 * ScreenshotOne quotas and serverless memory both hate that. We do at
 * most ONE fetch per prospect (the logo, for colour sampling). All
 * other images are referenced by absolute URL and hotlinked from the
 * rendered mockup.
 */

import sharp from 'sharp';

export interface SiteBranding {
  logoUrl: string | null;
  /** Hex strings like '#ff3d00'. Ordered by visual prominence (logo
   *  dominant → accent). Empty if logo was missing or un-fetchable. */
  brandColors: string[];
  /** Absolute URLs of hero-worthy content images, deduped, up to 6. */
  images: string[];
}

const ABSOLUTE = /^https?:\/\//i;

/** Resolve a (possibly relative) src against a base URL. Returns null if
 *  the result isn't an http(s) URL we'd embed. */
function toAbsolute(src: string | null | undefined, baseUrl: string): string | null {
  if (!src) return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:') || trimmed.startsWith('javascript:')) return null;
  try {
    const abs = new URL(trimmed, baseUrl).toString();
    return ABSOLUTE.test(abs) ? abs : null;
  } catch {
    return null;
  }
}

/** Heuristic: filter out icons, sprites, tracking pixels, and SVGs we
 *  can't reason about without a full render. We only want hero / content
 *  JPEGs, PNGs, or WebPs. */
function looksLikeContentImage(url: string): boolean {
  const lower = url.toLowerCase();
  // File-extension signal — if present.
  if (/\.(svg)(\?|$)/.test(lower)) return false;
  // Obvious junk in the path.
  const junkPatterns = [
    /sprite/,
    /icon/,
    /favicon/,
    /logo[-_]?(small|icon|mark)/,
    /pixel/,
    /1x1/,
    /tracking/,
    /analytics/,
    /placeholder/,
    /spacer/,
    /blank/,
    /cdn-cgi\/image/, // Cloudflare image resizer — keep for parent extraction
  ];
  for (const pat of junkPatterns) {
    if (pat.test(lower)) return false;
  }
  return true;
}

/** Extract dimension hints from the raw attribute string (width="800" or
 *  style="width: 800px"). Returns null if we can't tell. */
function extractDims(attrs: string): { w: number | null; h: number | null } {
  const wMatch = /\bwidth\s*=\s*["']?(\d+)/i.exec(attrs);
  const hMatch = /\bheight\s*=\s*["']?(\d+)/i.exec(attrs);
  const styleWMatch = /width\s*:\s*(\d+)\s*px/i.exec(attrs);
  const styleHMatch = /height\s*:\s*(\d+)\s*px/i.exec(attrs);
  return {
    w: wMatch ? Number(wMatch[1]) : styleWMatch ? Number(styleWMatch[1]) : null,
    h: hMatch ? Number(hMatch[1]) : styleHMatch ? Number(styleHMatch[1]) : null,
  };
}

/** First matching attribute value, or null. Case-insensitive. */
function attrValue(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = re.exec(tag);
  return m ? m[1] ?? m[2] ?? m[3] ?? null : null;
}

/** Find best logo candidate. Priority:
 *  1. <link rel="apple-touch-icon"> (usually high-res, square, transparent)
 *  2. <meta property="og:image"> (site-wide social card)
 *  3. First <img> inside <header> with 'logo' in src/alt/class
 *  4. <link rel="icon"> fallback */
function pickLogoUrl(html: string, baseUrl: string): string | null {
  const appleTouch = /<link\b[^>]*\brel=["']apple-touch-icon[^"']*["'][^>]*>/i.exec(html);
  if (appleTouch) {
    const href = attrValue(appleTouch[0], 'href');
    const abs = toAbsolute(href, baseUrl);
    if (abs) return abs;
  }

  const ogImage = /<meta\b[^>]*\bproperty=["']og:image["'][^>]*>/i.exec(html);
  if (ogImage) {
    const content = attrValue(ogImage[0], 'content');
    const abs = toAbsolute(content, baseUrl);
    if (abs) return abs;
  }

  // Any <img> with logo in src / alt / class
  const logoImgRe = /<img\b[^>]*(?:src|alt|class)=["'][^"']*logo[^"']*["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = logoImgRe.exec(html)) !== null) {
    const src = attrValue(m[0], 'src');
    const abs = toAbsolute(src, baseUrl);
    if (abs) return abs;
  }

  const iconLink = /<link\b[^>]*\brel=["'](?:icon|shortcut icon)["'][^>]*>/i.exec(html);
  if (iconLink) {
    const href = attrValue(iconLink[0], 'href');
    const abs = toAbsolute(href, baseUrl);
    if (abs) return abs;
  }

  return null;
}

/** Extract a shortlist of content images from the home HTML. Prefer
 *  unique URLs that look content-sized. Cap at `limit`. */
function pickContentImages(html: string, baseUrl: string, limit = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  // og:image as first-pick — usually the hero
  const og = /<meta\b[^>]*\bproperty=["']og:image["'][^>]*>/i.exec(html);
  if (og) {
    const abs = toAbsolute(attrValue(og[0], 'content'), baseUrl);
    if (abs && looksLikeContentImage(abs) && !seen.has(abs)) {
      seen.add(abs);
      out.push(abs);
    }
  }

  // All <img> tags
  const imgRe = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null && out.length < limit) {
    const tag = m[0];
    const src = attrValue(tag, 'src') ?? attrValue(tag, 'data-src') ?? attrValue(tag, 'data-lazy-src');
    const abs = toAbsolute(src, baseUrl);
    if (!abs || seen.has(abs) || !looksLikeContentImage(abs)) continue;

    // Dimension gate — skip anything explicitly < 200×200.
    const { w, h } = extractDims(tag);
    if (w !== null && w < 200) continue;
    if (h !== null && h < 200) continue;

    seen.add(abs);
    out.push(abs);
  }

  return out;
}

/** Sample up to 3 dominant brand colours from the logo.
 *  We downscale to 32×32 then pick quantised buckets. Returns [] on failure. */
async function sampleBrandColors(logoUrl: string): Promise<string[]> {
  try {
    const r = await fetch(logoUrl, { signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return [];
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.byteLength === 0) return [];

    // Raw RGB at 32×32 — 1024 pixels, enough to cluster.
    const { data, info } = await sharp(buf)
      .flatten({ background: '#ffffff' })
      .resize(32, 32, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels;
    const buckets = new Map<string, number>();
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Drop near-white and near-black (background / text).
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max > 240 && min > 240) continue;
      if (max < 30) continue;
      // Quantise to 6-step buckets (0x00, 0x33, 0x66, 0x99, 0xcc, 0xff).
      const qr = Math.round(r / 51) * 51;
      const qg = Math.round(g / 51) * 51;
      const qb = Math.round(b / 51) * 51;
      const key = `${qr},${qg},${qb}`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
    const colors: string[] = [];
    for (const [key] of sorted) {
      if (colors.length >= 3) break;
      const [r, g, b] = key.split(',').map(Number);
      const hex = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
      // Skip near-duplicates of colours we already picked.
      if (colors.some((c) => colorsClose(c, hex))) continue;
      colors.push(hex);
    }
    return colors;
  } catch {
    return [];
  }
}

function colorsClose(a: string, b: string): boolean {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const diff =
    Math.abs(((pa >> 16) & 0xff) - ((pb >> 16) & 0xff)) +
    Math.abs(((pa >> 8) & 0xff) - ((pb >> 8) & 0xff)) +
    Math.abs((pa & 0xff) - (pb & 0xff));
  return diff < 80;
}

/** Main entry point. Given the home URL + home HTML, returns logo URL,
 *  brand colours sampled from the logo, and a shortlist of content
 *  images. Never throws — returns empty / null fields on failure. */
export async function extractSiteBranding(args: {
  homeUrl: string;
  homeHtml: string;
}): Promise<SiteBranding> {
  const { homeUrl, homeHtml } = args;
  const logoUrl = pickLogoUrl(homeHtml, homeUrl);
  const images = pickContentImages(homeHtml, homeUrl, 6);
  const brandColors = logoUrl ? await sampleBrandColors(logoUrl) : [];
  return { logoUrl, brandColors, images };
}

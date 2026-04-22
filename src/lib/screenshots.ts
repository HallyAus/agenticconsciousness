/**
 * Screenshot capture wrapper. Backed by ScreenshotOne
 * (https://screenshotone.com) when SCREENSHOT_API_KEY is set; otherwise
 * the capture is a no-op and the caller should handle a null return.
 *
 * Why ScreenshotOne and not puppeteer: Vercel serverless cold-start with
 * chromium is 3+ seconds and the binary eats function size budget.
 * ScreenshotOne is a hosted service with a 100/month free tier.
 *
 * Env:
 *   SCREENSHOT_API_KEY — required to enable captures
 *
 * Returns a URL that can be embedded in <img> tags or PDFs.
 */

import crypto from 'node:crypto';

const BASE = 'https://api.screenshotone.com/take';

export function isScreenshotConfigured(): boolean {
  return Boolean(process.env.SCREENSHOT_API_KEY);
}

/**
 * Build a signed ScreenshotOne URL. When SCREENSHOT_SECRET_KEY is set,
 * we HMAC-SHA256 the query string with the secret and append a
 * `signature` param. Signed URLs cannot be tampered with, so the access
 * key in the URL is useless without a matching signature.
 *
 * When the secret is not set, falls back to access-key-only URLs (still
 * works, less secure).
 */
function buildUrl(params: Record<string, string | number | boolean>): string {
  const key = process.env.SCREENSHOT_API_KEY ?? '';
  const secret = process.env.SCREENSHOT_SECRET_KEY ?? '';

  const qs = new URLSearchParams({ access_key: key });
  for (const [k, v] of Object.entries(params)) {
    qs.set(k, String(v));
  }

  if (secret) {
    const body = qs.toString();
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    qs.set('signature', sig);
  }

  return `${BASE}?${qs.toString()}`;
}

export interface ScreenshotPair {
  desktop: string | null;
  mobile: string | null;
}

/**
 * Returns PRE-SIGNED URLs that ScreenshotOne will render on-demand and
 * cache. We don't store bytes; we persist the URL. Every load hits
 * ScreenshotOne's CDN, counting against free tier until cache-hit.
 */
export async function captureScreenshots(targetUrl: string): Promise<ScreenshotPair> {
  if (!isScreenshotConfigured()) {
    return { desktop: null, mobile: null };
  }
  return {
    desktop: buildUrl({
      url: targetUrl,
      viewport_width: 1440,
      viewport_height: 900,
      device_scale_factor: 1,
      image_width: 900,
      format: 'jpg',
      image_quality: 70,
      block_ads: true,
      block_cookie_banners: true,
      block_trackers: true,
      cache: true,
      cache_ttl: 2592000, // 30 days
      full_page: false,
      delay: 2,
      timeout: 30,
    }),
    mobile: buildUrl({
      url: targetUrl,
      viewport_width: 393,
      viewport_height: 852,
      device_scale_factor: 1,
      image_width: 400,
      viewport_mobile: true,
      format: 'jpg',
      image_quality: 70,
      block_ads: true,
      block_cookie_banners: true,
      block_trackers: true,
      cache: true,
      cache_ttl: 2592000,
      full_page: false,
      delay: 2,
      timeout: 30,
    }),
  };
}

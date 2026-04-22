/**
 * Email open + click tracking helpers.
 *
 * Each prospect_sends row has a `tracking_token` (hex). Outbound emails
 * get a 1x1 pixel GIF pointing at /api/track/o/<token> and every <a href>
 * is rewritten to /api/track/l/<token>?u=<encoded-url>.
 *
 * Heads-up: open tracking is lossy. Apple Mail Privacy Protection and
 * most corporate mail gateways fetch images through proxy caches, so a
 * recorded open is a strong signal but a missing open does not mean
 * unread. Click tracking is much more reliable.
 */

import crypto from 'node:crypto';

export function newTrackingToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function pixelUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/api/track/o/${token}`;
}

export function clickUrl(baseUrl: string, token: string, target: string): string {
  return `${baseUrl}/api/track/l/${token}?u=${encodeURIComponent(target)}`;
}

/**
 * Walk through an HTML string, rewrite every <a href="..."> to the tracker
 * URL. Skips mailto:, tel:, #, and the unsubscribe link so those keep
 * working directly.
 */
export function rewriteLinks(html: string, baseUrl: string, token: string): string {
  return html.replace(
    /<a\s+([^>]*?)href=(["'])([^"']+)(["'])/gi,
    (full, before, openQ, href, closeQ) => {
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
        return full;
      }
      if (href.includes('/unsubscribe/')) return full; // keep unsubscribe direct
      if (href.includes('/api/track/')) return full;   // already rewritten
      const wrapped = clickUrl(baseUrl, token, href);
      return `<a ${before}href=${openQ}${wrapped}${closeQ}`;
    },
  );
}

/** Inject a 1x1 tracking pixel at the end of the HTML body. */
export function injectPixel(html: string, baseUrl: string, token: string): string {
  const pixel = `<img src="${pixelUrl(baseUrl, token)}" alt="" width="1" height="1" style="display:block;border:0;width:1px;height:1px" />`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }
  return html + pixel;
}

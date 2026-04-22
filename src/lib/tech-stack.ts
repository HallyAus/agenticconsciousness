/**
 * Lightweight tech-stack fingerprinter. Fetches the prospect's homepage
 * HTML + headers once and pattern-matches for the obvious CMS / hosting
 * / analytics / tracking signals. The output feeds the "Under the hood"
 * page in the audit PDF.
 *
 * Intentionally shallow — no Wappalyzer, no deep JS execution. Just the
 * high-signal patterns that buy credibility in a sales asset:
 *   - CMS (WordPress, Shopify, Wix, Squarespace, Webflow, Joomla, Duda)
 *   - Analytics (GA4 / UA / Plausible / Fathom / PostHog)
 *   - Tracking (Meta Pixel, TikTok Pixel, LinkedIn Insight)
 *   - CDN (Cloudflare, Fastly, Vercel, Netlify)
 *   - Security (HTTPS)
 *   - Frontend hints (jQuery, React, Vue, Bootstrap, Tailwind)
 *
 * Returns an array of { label, value, good? } chips. `good === false`
 * flags something we would replace (e.g. no analytics, outdated jQuery
 * as the only JS framework).
 */

export interface TechChip {
  label: string;
  value: string;
  /** `false` marks the chip as a problem (red tint in the PDF). `true`
   *  or undefined = neutral. */
  good?: boolean;
}

export async function fingerprintTechStack(url: string, timeoutMs = 10_000): Promise<TechChip[]> {
  const result: TechChip[] = [];
  if (!url) return result;

  let html = '';
  let headers: Headers | null = null;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgenticConsciousness-Audit/1.0; +https://agenticconsciousness.com.au)' },
      redirect: 'follow',
    });
    headers = res.headers;
    html = (await res.text()).slice(0, 400_000);
  } catch (err) {
    console.error('[tech-stack] fetch failed', err instanceof Error ? err.message : err);
    return result;
  }

  const lc = html.toLowerCase();

  // --- CMS ---
  let cms = '';
  if (/wp-content|wp-includes|\/wp-json\//i.test(html)) cms = 'WordPress';
  else if (/cdn\.shopify\.com|shopifycdn|shopify-section|shop\.js/i.test(html)) cms = 'Shopify';
  else if (/squarespace\.com|sqsp\.net|static1\.squarespace/i.test(html)) cms = 'Squarespace';
  else if (/wixstatic|wixsite|wix\.com|parastorage/i.test(html)) cms = 'Wix';
  else if (/webflow\.com|webflow\.io|\.webflow\.io|data-wf-domain/i.test(html)) cms = 'Webflow';
  else if (/\/templates\/[a-z0-9_-]+\/|joomla!|com_content|\/components\/com_/i.test(html)) cms = 'Joomla';
  else if (/duda\.co|dudaone|dmws\.img/i.test(html)) cms = 'Duda';
  else if (/ghost\.io|\/ghost\//i.test(html)) cms = 'Ghost';
  else if (/drupal|sites\/default\/files/i.test(html)) cms = 'Drupal';
  const genMatch = html.match(/<meta\s+name=["']generator["']\s+content=["']([^"']+)["']/i);
  if (!cms && genMatch) cms = genMatch[1].split(/\s|,/)[0] ?? '';
  result.push({ label: 'CMS', value: cms || 'CUSTOM / UNKNOWN', good: Boolean(cms) });

  // --- HTTPS ---
  result.push({
    label: 'HTTPS',
    value: url.startsWith('https://') ? 'ENABLED' : 'MISSING',
    good: url.startsWith('https://'),
  });

  // --- CDN / hosting ---
  const server = headers?.get('server') ?? '';
  const via = headers?.get('via') ?? '';
  let cdn = '';
  if (/cloudflare/i.test(server) || headers?.get('cf-ray')) cdn = 'Cloudflare';
  else if (/fastly/i.test(server) || headers?.get('fastly-debug-digest')) cdn = 'Fastly';
  else if (/vercel/i.test(server) || headers?.get('x-vercel-id')) cdn = 'Vercel';
  else if (/netlify/i.test(server) || headers?.get('x-nf-request-id')) cdn = 'Netlify';
  else if (/akamai|akamaighost/i.test(server) || /akamai/i.test(via)) cdn = 'Akamai';
  else if (server) cdn = server.split(/[/,\s]/)[0];
  result.push({ label: 'CDN / HOST', value: cdn || 'UNKNOWN', good: Boolean(cdn) });

  // --- Analytics ---
  const analytics: string[] = [];
  if (/gtag\(|google-analytics\.com|googletagmanager\.com/i.test(html)) {
    if (/G-[A-Z0-9]{6,}/i.test(html)) analytics.push('GA4');
    else analytics.push('Google Analytics');
  }
  if (/plausible\.io\/js/i.test(html)) analytics.push('Plausible');
  if (/fathom\.js|usefathom/i.test(html)) analytics.push('Fathom');
  if (/posthog\.com|ph\.init/i.test(html)) analytics.push('PostHog');
  if (/static\.hotjar\.com|hj\(/i.test(html)) analytics.push('Hotjar');
  if (/microsoft\.com\/clarity|ms-clarity/i.test(lc)) analytics.push('MS Clarity');
  result.push({
    label: 'ANALYTICS',
    value: analytics.length > 0 ? analytics.slice(0, 2).join(' + ') : 'NONE DETECTED',
    good: analytics.length > 0,
  });

  // --- Tracking pixels ---
  const pixels: string[] = [];
  if (/fbq\(|connect\.facebook\.net/i.test(html)) pixels.push('Meta');
  if (/analytics\.tiktok\.com|ttq\.load/i.test(html)) pixels.push('TikTok');
  if (/snap\.licdn\.com|_linkedin_partner_id/i.test(html)) pixels.push('LinkedIn');
  if (/ads\.pinterest\.com|pintrk\(/i.test(html)) pixels.push('Pinterest');
  result.push({
    label: 'AD PIXELS',
    value: pixels.length > 0 ? pixels.join(' + ') : 'NONE',
  });

  // --- Frontend framework hints ---
  let frontend = '';
  if (/data-reactroot|__NEXT_DATA__|_next\/static/i.test(html)) frontend = /_next\/static/i.test(html) ? 'Next.js' : 'React';
  else if (/__NUXT__|_nuxt\//i.test(html)) frontend = 'Nuxt';
  else if (/data-v-[0-9a-f]{8}|\bVue\b/i.test(html)) frontend = 'Vue';
  else if (/jquery[.-][0-9]/i.test(html)) {
    const j = html.match(/jquery[.-]([0-9.]+)/i);
    frontend = j ? `jQuery ${j[1]}` : 'jQuery';
  }
  else if (/bootstrap[.-][0-9]/i.test(html)) {
    const b = html.match(/bootstrap[.-]([0-9.]+)/i);
    frontend = b ? `Bootstrap ${b[1]}` : 'Bootstrap';
  }
  if (frontend) result.push({ label: 'FRONTEND', value: frontend });

  // --- Ecommerce ---
  if (cms === 'Shopify' || /woocommerce|wc-add-to-cart/i.test(html)) {
    result.push({ label: 'ECOMMERCE', value: cms === 'Shopify' ? 'Shopify' : 'WooCommerce' });
  }

  // --- Booking ---
  if (/nowbookit|now_book_it/i.test(html)) result.push({ label: 'BOOKING', value: 'NowBookIt' });
  else if (/calendly\.com/i.test(html)) result.push({ label: 'BOOKING', value: 'Calendly' });
  else if (/setmore\.com/i.test(html)) result.push({ label: 'BOOKING', value: 'Setmore' });

  // --- Chat ---
  if (/intercom\.io|intercomcdn/i.test(html)) result.push({ label: 'CHAT', value: 'Intercom' });
  else if (/tidio\.co|tidioChatApi/i.test(html)) result.push({ label: 'CHAT', value: 'Tidio' });
  else if (/crisp\.chat|crisp\.im/i.test(html)) result.push({ label: 'CHAT', value: 'Crisp' });
  else if (/embed\.drift\.com/i.test(html)) result.push({ label: 'CHAT', value: 'Drift' });

  // --- Email capture / forms ---
  if (/hs-scripts\.com|hubspot/i.test(html)) result.push({ label: 'CRM', value: 'HubSpot' });
  else if (/mc\.us[0-9]+\.list-manage|mailchimp\.com/i.test(html)) result.push({ label: 'CRM', value: 'Mailchimp' });

  return result;
}

/**
 * Email extraction from scraped HTML. Three layers:
 *   1. mailto: links — highest confidence
 *   2. Bare `name@domain.tld` regex, preferring same-domain hits
 *   3. Common role fallbacks (info@, hello@, contact@) only flagged as
 *      'guess' confidence and only returned if nothing better was found.
 *
 * We only return the first plausible business email. Rejects role
 * addresses that are obviously machine-origin (noreply, postmaster).
 */

export interface EmailHit {
  email: string;
  confidence: 'mailto' | 'text_same_domain' | 'text_any' | 'guess';
}

const REJECT_LOCALPARTS = /^(noreply|no-reply|donotreply|postmaster|mailer-daemon|bounce|abuse|root)\b/i;
const COMMON_ROLES = ['info', 'hello', 'contact', 'enquiries', 'admin', 'office'];

function cleanEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase().replace(/^mailto:/, '').split('?')[0];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return null;
  const [local] = e.split('@');
  if (REJECT_LOCALPARTS.test(local)) return null;
  if (e.endsWith('.png') || e.endsWith('.jpg') || e.endsWith('.webp')) return null;
  return e;
}

function rootDomain(host: string): string {
  const parts = host.toLowerCase().replace(/^www\./, '').split('.');
  if (parts.length <= 2) return parts.join('.');
  // Simple eTLD+1 heuristic — good enough for com.au, co.uk, etc.
  const tail = parts.slice(-3).join('.');
  if (/\.(com|net|org|gov|edu|co|ac)\.[a-z]{2}$/.test(tail)) return tail;
  return parts.slice(-2).join('.');
}

/**
 * Scan a batch of HTML documents. `targetDomain` is the business's own
 * domain — used to prefer emails that match (they're far more likely to
 * be a real contact than a @gmail or @yahoo address scraped from
 * someone's blog comment).
 */
export function extractEmailFromHtml(
  htmlByUrl: Record<string, string>,
  targetDomain: string,
): EmailHit | null {
  const target = rootDomain(targetDomain);
  const mailtoHits: string[] = [];
  const textHits: string[] = [];

  const mailtoRe = /mailto:([^"'\s?&<>]+)/gi;
  const textRe = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;

  for (const html of Object.values(htmlByUrl)) {
    let m: RegExpExecArray | null;
    while ((m = mailtoRe.exec(html)) !== null) {
      const e = cleanEmail(m[1]);
      if (e) mailtoHits.push(e);
    }
    const tmatches = html.match(textRe);
    if (tmatches) for (const t of tmatches) {
      const e = cleanEmail(t);
      if (e) textHits.push(e);
    }
  }

  const pickByDomain = (list: string[]): string | undefined =>
    list.find((e) => rootDomain(e.split('@')[1]) === target);

  // 1. mailto: + same domain
  const mailtoSame = pickByDomain(mailtoHits);
  if (mailtoSame) return { email: mailtoSame, confidence: 'mailto' };

  // 2. mailto: any
  if (mailtoHits[0]) return { email: mailtoHits[0], confidence: 'mailto' };

  // 3. text regex + same domain
  const textSame = pickByDomain(textHits);
  if (textSame) return { email: textSame, confidence: 'text_same_domain' };

  // 4. text regex any
  if (textHits[0]) return { email: textHits[0], confidence: 'text_any' };

  // 5. Common role guess — only return if nothing else was found AND
  //    we have a real business domain to guess against.
  if (target && target.includes('.')) {
    return { email: `info@${target}`, confidence: 'guess' };
  }

  return null;
}

export { COMMON_ROLES };

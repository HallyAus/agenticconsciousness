import { NextResponse } from 'next/server';
import { promises as dns } from 'node:dns';

/**
 * Checks the sending domain's DNS for SPF, DKIM, and DMARC records.
 * Used by the admin UI to flag deliverability risk at a glance.
 *
 * Notes:
 *   - SPF: look up TXT on apex, check for `v=spf1` and inclusion of
 *     spf.protection.outlook.com (Microsoft 365).
 *   - DKIM: Microsoft 365 publishes selectors selector1._domainkey and
 *     selector2._domainkey as CNAMEs. We check selector1 because M365
 *     alternates between them.
 *   - DMARC: look up TXT on _dmarc.<domain> and report the `p=` policy.
 */

const DOMAIN = 'agenticconsciousness.com.au';

interface RecordCheck {
  ok: boolean;
  label: string;
  value?: string;
  detail?: string;
}

interface DomainHealthReport {
  domain: string;
  spf: RecordCheck;
  dkim: RecordCheck;
  dmarc: RecordCheck;
  checkedAt: string;
}

async function checkSpf(domain: string): Promise<RecordCheck> {
  try {
    const txt = await dns.resolveTxt(domain);
    const flat = txt.map((row) => row.join('')).filter((r) => r.toLowerCase().includes('v=spf1'));
    if (flat.length === 0) return { ok: false, label: 'SPF', detail: 'No v=spf1 record found' };
    if (flat.length > 1) {
      return { ok: false, label: 'SPF', value: flat[0], detail: 'Multiple SPF records (only one allowed)' };
    }
    const spf = flat[0];
    const ok = /spf\.protection\.outlook\.com/i.test(spf) || /include:/i.test(spf);
    return { ok, label: 'SPF', value: spf, detail: ok ? 'SPF record OK' : 'SPF record missing Microsoft include' };
  } catch (err) {
    return { ok: false, label: 'SPF', detail: (err as Error).message };
  }
}

async function checkDkim(domain: string): Promise<RecordCheck> {
  const selectors = ['selector1', 'selector2'];
  for (const sel of selectors) {
    try {
      const host = `${sel}._domainkey.${domain}`;
      const records = await dns.resolveCname(host).catch(() => [] as string[]);
      if (records.length > 0) {
        return { ok: true, label: 'DKIM', value: `${sel} -> ${records[0]}`, detail: 'DKIM CNAME found' };
      }
      const txt = await dns.resolveTxt(host).catch(() => [] as string[][]);
      const flat = txt.map((row) => row.join(''));
      if (flat.some((r) => r.includes('v=DKIM1'))) {
        return { ok: true, label: 'DKIM', value: flat[0], detail: 'DKIM TXT found' };
      }
    } catch {
      // try next selector
    }
  }
  return { ok: false, label: 'DKIM', detail: 'No DKIM selector1 / selector2 CNAME or TXT record found' };
}

async function checkDmarc(domain: string): Promise<RecordCheck> {
  try {
    const txt = await dns.resolveTxt(`_dmarc.${domain}`);
    const flat = txt.map((row) => row.join('')).filter((r) => r.toLowerCase().includes('v=dmarc1'));
    if (flat.length === 0) return { ok: false, label: 'DMARC', detail: 'No _dmarc record found' };
    const dmarc = flat[0];
    const policyMatch = /p=(none|quarantine|reject)/i.exec(dmarc);
    const policy = policyMatch?.[1]?.toLowerCase() ?? 'unknown';
    const ok = policy === 'quarantine' || policy === 'reject' || policy === 'none';
    return {
      ok,
      label: 'DMARC',
      value: dmarc,
      detail: policy === 'none' ? 'Policy p=none (monitoring only — ok but weak)' : `Policy p=${policy}`,
    };
  } catch (err) {
    return { ok: false, label: 'DMARC', detail: (err as Error).message };
  }
}

// In-memory cache so the admin panel does not hammer DNS on every
// page refresh. TTL 1h is plenty; DNS changes are rare and the admin
// can force-refresh with ?refresh=1 when a record is being edited.
const DOMAIN_HEALTH_TTL_MS = 60 * 60 * 1000;
let cached: { report: DomainHealthReport; expiresAt: number } | null = null;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const forceRefresh = url.searchParams.get('refresh') === '1';
  const now = Date.now();

  if (!forceRefresh && cached && cached.expiresAt > now) {
    return NextResponse.json(cached.report, {
      headers: {
        'Cache-Control': 'private, max-age=3600',
        'X-Cache': 'hit',
      },
    });
  }

  const [spf, dkim, dmarc] = await Promise.all([
    checkSpf(DOMAIN),
    checkDkim(DOMAIN),
    checkDmarc(DOMAIN),
  ]);
  const report: DomainHealthReport = {
    domain: DOMAIN,
    spf,
    dkim,
    dmarc,
    checkedAt: new Date().toISOString(),
  };
  cached = { report, expiresAt: now + DOMAIN_HEALTH_TTL_MS };
  return NextResponse.json(report, {
    headers: {
      'Cache-Control': 'private, max-age=3600',
      'X-Cache': 'miss',
    },
  });
}

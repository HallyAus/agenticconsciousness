import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { sql } from '@/lib/pg';
import { runStructuredAudit, normaliseUrl } from '@/lib/audit-core';
import { extractEmailFromHtml } from '@/lib/email-scrape';
import { notifyAdmin } from '@/lib/email';
import { isSuppressed } from '@/lib/suppression';
import { runSiteScan } from '@/lib/site-scan';
import { captureScreenshots } from '@/lib/screenshots';

export const maxDuration = 90;

/**
 * Admin-only. Runs an audit against a target URL and stores the result
 * as a `prospect` row. Gated by the /admin middleware (Basic Auth).
 *
 * The audit itself takes 10–30s so we ack immediately and run it in
 * after(). The UI polls the prospects list to watch status flip from
 * `auditing` → `audited` / `waf_blocked` / `audit_failed`.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawUrl = typeof body.url === 'string' ? body.url : '';
    const businessName = typeof body.businessName === 'string' ? body.businessName.trim().slice(0, 200) : null;
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : null;

    const u = normaliseUrl(rawUrl);
    if (!u) return NextResponse.json({ error: 'Enter a valid URL.' }, { status: 400 });

    const canonical = u.toString();

    // Upsert the prospect row up front so the UI can show it in-flight.
    // Conflict on the unique index over lower(url).
    const existing = await sql`
      SELECT id, status FROM prospects WHERE lower(url) = lower(${canonical}) LIMIT 1
    ` as Array<{ id: string; status: string }>;

    let prospectId: string;
    if (existing.length > 0) {
      prospectId = existing[0].id;
      await sql`
        UPDATE prospects
        SET status = 'auditing',
            business_name = COALESCE(${businessName}, business_name),
            notes = COALESCE(${notes}, notes),
            updated_at = NOW()
        WHERE id = ${prospectId}
      `;
    } else {
      const inserted = await sql`
        INSERT INTO prospects (url, business_name, notes, status)
        VALUES (${canonical}, ${businessName}, ${notes}, 'auditing')
        RETURNING id
      ` as Array<{ id: string }>;
      prospectId = inserted[0].id;
    }

    after(() => runAndStore(prospectId, canonical));

    return NextResponse.json({ id: prospectId, status: 'auditing' });
  } catch (err) {
    console.error('[admin/audit] handler error', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Could not start audit' }, { status: 500 });
  }
}

async function runAndStore(prospectId: string, url: string): Promise<void> {
  const start = Date.now();
  try {
    const result = await runStructuredAudit(url);

    if (!result.ok) {
      const status = result.reason === 'waf' ? 'waf_blocked' : 'audit_failed';
      await sql`
        UPDATE prospects
        SET status = ${status},
            audit_data = ${JSON.stringify({ reason: result.reason, pageResults: result.pageResults })}::jsonb,
            updated_at = NOW()
        WHERE id = ${prospectId}
      `;
      console.log('[admin/audit] audit unusable', { prospectId, reason: result.reason, tookMs: Date.now() - start });
      return;
    }

    const hit = extractEmailFromHtml(result.rawHtmlByUrl, new URL(url).hostname);
    const nextStatus = hit?.email && (await isSuppressed(hit.email)) ? 'unsubscribed' : 'audited';

    // Deterministic post-audit scans: broken links, viewport meta,
    // copyright year, sitemap, SEO extract. Plus screenshots (if
    // SCREENSHOT_API_KEY is set). All run in parallel.
    const homeHtml = result.rawHtmlByUrl[url] ?? Object.values(result.rawHtmlByUrl)[0] ?? '';
    const [siteScan, shots] = await Promise.all([
      runSiteScan({ url, html: homeHtml }).catch(() => null),
      captureScreenshots(url).catch(() => ({ desktop: null, mobile: null })),
    ]);

    await sql`
      UPDATE prospects
      SET status = ${nextStatus},
          email = ${hit?.email ?? null},
          email_confidence = ${hit?.confidence ?? null},
          audit_score = ${result.score},
          audit_summary = ${result.summary},
          audit_data = ${JSON.stringify({
            summary: result.summary,
            score: result.score,
            issues: result.issues,
            pageResults: result.pageResults,
            pagesFetched: result.pagesFetched,
            tookMs: Date.now() - start,
            siteScan,
          })}::jsonb,
          screenshot_desktop_url = ${shots.desktop},
          screenshot_mobile_url = ${shots.mobile},
          broken_links_count = ${siteScan?.brokenLinks.length ?? null},
          broken_links = ${siteScan ? JSON.stringify(siteScan.brokenLinks.slice(0, 20)) : null}::jsonb,
          viewport_meta_ok = ${siteScan?.viewportMetaOk ?? null},
          copyright_year = ${siteScan?.copyrightYear ?? null},
          site_scan_at = NOW(),
          updated_at = NOW()
      WHERE id = ${prospectId}
    `;

    console.log('[admin/audit] stored', {
      prospectId, url, score: result.score, issues: result.issues.length,
      email: hit?.email ?? null, confidence: hit?.confidence ?? null,
      tookMs: Date.now() - start,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[admin/audit] runAndStore failed', { prospectId, url, msg });
    await sql`
      UPDATE prospects
      SET status = 'audit_failed',
          audit_data = ${JSON.stringify({ error: msg })}::jsonb,
          updated_at = NOW()
      WHERE id = ${prospectId}
    `.catch(() => {});
    await notifyAdmin(
      `Admin audit failed: ${url}`,
      `Prospect ${prospectId} — ${msg}`,
    ).catch(() => {});
  }
}

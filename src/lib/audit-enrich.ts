/**
 * Shared helper: runs deterministic site scan + screenshot capture and
 * UPDATEs the prospect row with the extra columns. Used by all three
 * audit entry points (manual audit, places/add, reaudit) so none of them
 * can silently skip the scan.
 */

import { sql } from '@/lib/pg';
import { runSiteScan } from '@/lib/site-scan';
import { captureScreenshots } from '@/lib/screenshots';

export async function enrichProspectWithScanAndShots(args: {
  prospectId: string;
  url: string;
  homeHtml: string;
}): Promise<void> {
  const { prospectId, url, homeHtml } = args;
  const [siteScan, shots] = await Promise.all([
    runSiteScan({ url, html: homeHtml }).catch((err) => {
      console.error('[audit-enrich] site scan failed', err instanceof Error ? err.message : err);
      return null;
    }),
    captureScreenshots(url).catch((err) => {
      console.error('[audit-enrich] screenshot capture failed', err instanceof Error ? err.message : err);
      return { desktop: null, mobile: null };
    }),
  ]);

  await sql`
    UPDATE prospects
    SET screenshot_desktop_url = ${shots.desktop},
        screenshot_mobile_url = ${shots.mobile},
        broken_links_count = ${siteScan?.brokenLinks.length ?? null},
        broken_links = ${siteScan ? JSON.stringify(siteScan.brokenLinks.slice(0, 20)) : null}::jsonb,
        viewport_meta_ok = ${siteScan?.viewportMetaOk ?? null},
        copyright_year = ${siteScan?.copyrightYear ?? null},
        site_scan_at = NOW(),
        updated_at = NOW()
    WHERE id = ${prospectId}
  `;
}

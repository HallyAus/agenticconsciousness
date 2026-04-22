/**
 * Shared helper: runs deterministic site scan + screenshot capture and
 * UPDATEs the prospect row with the extra columns. Used by all three
 * audit entry points (manual audit, places/add, reaudit) so none of them
 * can silently skip the scan.
 */

import { sql } from '@/lib/pg';
import { runSiteScan } from '@/lib/site-scan';
import { captureScreenshots } from '@/lib/screenshots';
import { generateMockup } from '@/lib/mockup';

export async function enrichProspectWithScanAndShots(args: {
  prospectId: string;
  url: string;
  homeHtml: string;
  businessName?: string | null;
  issues?: Array<{ title: string; detail: string; fix: string }>;
}): Promise<void> {
  const { prospectId, url, homeHtml } = args;

  // If caller didn't pass them, grab from DB (reaudit / places-add paths).
  let businessName = args.businessName ?? null;
  let issues = args.issues ?? [];
  if (businessName === null || issues.length === 0) {
    const rows = (await sql`
      SELECT business_name, audit_data FROM prospects WHERE id = ${prospectId} LIMIT 1
    `) as Array<{ business_name: string | null; audit_data: { issues?: typeof issues } | null }>;
    if (rows[0]) {
      businessName = rows[0].business_name;
      issues = rows[0].audit_data?.issues ?? issues;
    }
  }
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

  // Mockup generation runs after scan (uses scan SEO data for richer prompt).
  // Separate try/catch so mockup failure doesn't nuke the scan results.
  try {
    const mockup = await generateMockup({
      url,
      businessName,
      siteHtml: homeHtml,
      issues,
      seo: siteScan?.seo ?? null,
    });

    const siteBaseUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';
    const previewUrl = `${siteBaseUrl}/preview/${mockup.token}`;

    // Store first, THEN screenshot the preview URL so ScreenshotOne can
    // fetch it (requires the HTML to already be live in DB).
    await sql`
      UPDATE prospects
      SET mockup_token = ${mockup.token},
          mockup_html = ${mockup.html},
          mockup_headline = ${mockup.headline},
          mockup_generated_at = NOW(),
          updated_at = NOW()
      WHERE id = ${prospectId}
    `;

    const mockupShots = await captureScreenshots(previewUrl).catch((err) => {
      console.error('[audit-enrich] mockup screenshot failed', err instanceof Error ? err.message : err);
      return { desktop: null, mobile: null };
    });

    await sql`
      UPDATE prospects
      SET mockup_screenshot_url = ${mockupShots.desktop},
          updated_at = NOW()
      WHERE id = ${prospectId}
    `;
  } catch (err) {
    console.error('[audit-enrich] mockup generation failed', err instanceof Error ? err.message : err);
  }
}

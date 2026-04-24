/**
 * Shared helper: runs deterministic site scan + screenshot capture,
 * pulls branding (logo, colours, images) from the home HTML, pulls
 * Google reviews via Place Details if source_place_id is set, and
 * UPDATEs the prospect row with everything the mockup needs. Used by
 * all three audit entry points (manual audit, places/add, reaudit) so
 * none of them can silently skip the scan.
 */

import crypto from 'node:crypto';
import { sql } from '@/lib/pg';
import { runSiteScan } from '@/lib/site-scan';
import { captureScreenshots, buildTallMockupUrl } from '@/lib/screenshots';
import { generateMockup } from '@/lib/mockup';
import { extractSiteBranding } from '@/lib/site-scrape';
import { getPlaceDetails, type PlaceReview } from '@/lib/places';
import { clearPdfCache } from '@/lib/pdf-cache';

interface EnrichExistingRow {
  business_name: string | null;
  audit_data: { issues?: Array<{ title: string; detail: string; fix: string }> } | null;
  mockup_token: string | null;
  mockup_html: string | null;
  mockup_locked: boolean | null;
  source_place_id: string | null;
  phone: string | null;
  address: string | null;
  postcode: string | null;
  place_data: { primaryType?: string | null; types?: string[] } | null;
}

export async function enrichProspectWithScanAndShots(args: {
  prospectId: string;
  url: string;
  homeHtml: string;
  businessName?: string | null;
  issues?: Array<{ title: string; detail: string; fix: string }>;
}): Promise<void> {
  const { prospectId, url, homeHtml } = args;

  // Pull prospect context from the DB. We need business_name + issues
  // (which the callers don't always pass) plus source_place_id so we can
  // fetch Google reviews, and phone/address so the mockup prompt gets
  // real contact details.
  let businessName = args.businessName ?? null;
  let issues = args.issues ?? [];
  let existingMockupToken: string | null = null;
  let existingMockupHtml: string | null = null;
  let mockupLocked = false;
  let sourcePlaceId: string | null = null;
  let phone: string | null = null;
  let address: string | null = null;
  let postcode: string | null = null;
  let tradeHint: string | null = null;
  {
    const rows = (await sql`
      SELECT business_name, audit_data, mockup_token, mockup_html, mockup_locked,
             source_place_id, phone, address, postcode, place_data
      FROM prospects WHERE id = ${prospectId} LIMIT 1
    `) as EnrichExistingRow[];
    if (rows[0]) {
      existingMockupToken = rows[0].mockup_token;
      existingMockupHtml = rows[0].mockup_html;
      mockupLocked = rows[0].mockup_locked === true;
      sourcePlaceId = rows[0].source_place_id;
      phone = rows[0].phone;
      address = rows[0].address;
      postcode = rows[0].postcode;
      tradeHint = rows[0].place_data?.primaryType
        ?? rows[0].place_data?.types?.[0]
        ?? null;
      if (businessName === null) businessName = rows[0].business_name;
      if (issues.length === 0) issues = rows[0].audit_data?.issues ?? issues;
    }
  }

  // Invalidate the cached PDF before we start writing new scan / mockup
  // data. The next /pdf, /send or /test-draft hit will re-render against
  // the fresh state. Old blob stays in Vercel Blob storage (cheap; not
  // worth explicit deletion).
  await clearPdfCache(prospectId).catch((err) => {
    console.error('[audit-enrich] clearPdfCache failed', err instanceof Error ? err.message : err);
  });

  // Parallelise all independent I/O: site scan, screenshot capture,
  // branding extraction (fetches logo for colour sampling), and Google
  // Place Details (reviews + aggregate rating).
  const [siteScan, shots, branding, placeDetails] = await Promise.all([
    runSiteScan({ url, html: homeHtml }).catch((err) => {
      console.error('[audit-enrich] site scan failed', err instanceof Error ? err.message : err);
      return null;
    }),
    captureScreenshots(url).catch((err) => {
      console.error('[audit-enrich] screenshot capture failed', err instanceof Error ? err.message : err);
      return { desktop: null, mobile: null };
    }),
    extractSiteBranding({ homeUrl: url, homeHtml }).catch((err) => {
      console.error('[audit-enrich] branding extraction failed', err instanceof Error ? err.message : err);
      return { logoUrl: null, brandColors: [], images: [] };
    }),
    sourcePlaceId
      ? getPlaceDetails(sourcePlaceId).catch((err) => {
          console.error('[audit-enrich] place details failed', err instanceof Error ? err.message : err);
          return null;
        })
      : Promise.resolve(null),
  ]);

  const googleReviews: PlaceReview[] = placeDetails?.reviews ?? [];
  const googleRating = placeDetails?.rating ?? null;
  const googleReviewCount = placeDetails?.userRatingCount ?? null;

  console.log('[audit-enrich] extracted', {
    prospectId,
    logo: !!branding.logoUrl,
    brandColors: branding.brandColors.length,
    images: branding.images.length,
    reviews: googleReviews.length,
    googleRating,
    googleReviewCount,
  });

  await sql`
    UPDATE prospects
    SET screenshot_desktop_url = ${shots.desktop},
        screenshot_mobile_url = ${shots.mobile},
        broken_links_count = ${siteScan?.brokenLinks.length ?? null},
        broken_links = ${siteScan ? JSON.stringify(siteScan.brokenLinks.slice(0, 20)) : null}::jsonb,
        viewport_meta_ok = ${siteScan?.viewportMetaOk ?? null},
        copyright_year = ${siteScan?.copyrightYear ?? null},
        logo_url = ${branding.logoUrl},
        brand_colors = ${JSON.stringify(branding.brandColors)}::jsonb,
        site_images = ${JSON.stringify(branding.images)}::jsonb,
        site_images_fetched_at = NOW(),
        google_reviews = ${JSON.stringify(googleReviews)}::jsonb,
        google_reviews_fetched_at = ${placeDetails ? new Date().toISOString() : null},
        google_rating = ${googleRating},
        google_review_count = ${googleReviewCount},
        site_scan_at = NOW(),
        updated_at = NOW()
    WHERE id = ${prospectId}
  `;

  // Mockup lock: if the user flagged this prospect's mockup as
  // locked (via the admin UI), do NOT regenerate. Keep whatever HTML
  // is in the DB — this protects a "cracker" mockup from being
  // overwritten by a reaudit.
  if (mockupLocked) {
    console.log('[audit-enrich] mockup is locked, skipping regen', { prospectId });
    return;
  }

  // We used to pad the image list with industry-relevant Unsplash photos
  // when site scraping returned too few real images. That backfired: every
  // people-centric stock photo is a curation minefield (any face becomes
  // an unintentional targeting signal for the prospect's audience). Now
  // we ONLY pass the prospect's own scraped photos. The mockup prompt
  // tells Claude to fill image gaps with brand-coloured CSS gradient
  // placeholder cards instead — on-brand, zero curation risk.
  const mockupImages = branding.images;

  // Mockup generation runs after extraction so Claude can compose with
  // real logo + colours + images + reviews. Separate try/catch so
  // mockup failure doesn't nuke the scan / extraction results.
  // Granular breadcrumbs added after silent failures on multiple
  // prospects — each step now logs so we can see where the pipeline
  // stalls in Vercel logs without needing the breadcrumb table.
  console.log(`[audit-enrich:mockup] START prospectId=${prospectId} trade=${tradeHint ?? '(none)'} brandColors=${branding.brandColors.length} images=${mockupImages.length}`);
  const mockupStart = Date.now();
  try {
    const mockup = await generateMockup({
      url,
      businessName,
      siteHtml: homeHtml,
      issues,
      seo: siteScan?.seo ?? null,
      logoUrl: branding.logoUrl,
      brandColors: branding.brandColors,
      images: mockupImages,
      googleReviews,
      googleRating,
      googleReviewCount,
      phone,
      address,
      postcode,
      tradeHint,
    });
    console.log(`[audit-enrich:mockup] generateMockup OK prospectId=${prospectId} ms=${Date.now() - mockupStart} htmlBytes=${mockup.html.length} headline=${(mockup.headline ?? '').slice(0, 60)}`);

    // Stable per-prospect token: reuse the existing one if set, so any
    // already-sent outreach email's /preview/<token> link keeps resolving.
    // We only mint a token when this prospect has never had one.
    const mockupToken = existingMockupToken ?? crypto.randomBytes(12).toString('hex');

    const siteBaseUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';
    const previewUrl = `${siteBaseUrl}/preview/${mockupToken}`;

    // Snapshot the current mockup_html into mockup_html_previous BEFORE
    // overwriting — gives us one-step undo if the new generation turns
    // out worse than what was there. Only snapshots non-empty content.
    const snapshotHtml = existingMockupHtml && existingMockupHtml.length > 0 ? existingMockupHtml : null;

    // Store first, THEN screenshot the preview URL so ScreenshotOne can
    // fetch it (requires the HTML to already be live in DB).
    await sql`
      UPDATE prospects
      SET mockup_token = ${mockupToken},
          mockup_html = ${mockup.html},
          mockup_html_previous = COALESCE(${snapshotHtml}, mockup_html_previous),
          mockup_headline = ${mockup.headline},
          mockup_generated_at = NOW(),
          updated_at = NOW()
      WHERE id = ${prospectId}
    `;

    // Use the tall mockup capture (1440x1800) so the AFTER page in the
    // PDF shows hero + 2 scrolls, not just the hero. Falls back to the
    // standard captureScreenshots if buildTallMockupUrl returns null
    // (env unset). Pass a hash of the new mockup HTML as cacheKey so
    // ScreenshotOne returns a fresh capture instead of a 30-day-stale
    // shot of the previous mockup at the same URL.
    const cacheKey = crypto.createHash('sha256').update(mockup.html).digest('hex').slice(0, 12);
    const tallMockup = buildTallMockupUrl(previewUrl, cacheKey);
    let mockupDesktop: string | null = tallMockup;
    if (!mockupDesktop) {
      const pair = await captureScreenshots(previewUrl).catch((err) => {
        console.error('[audit-enrich] mockup screenshot failed', err instanceof Error ? err.message : err);
        return { desktop: null, mobile: null };
      });
      mockupDesktop = pair.desktop;
    }

    await sql`
      UPDATE prospects
      SET mockup_screenshot_url = ${mockupDesktop},
          updated_at = NOW()
      WHERE id = ${prospectId}
    `;
    console.log(`[audit-enrich:mockup] DONE prospectId=${prospectId} totalMs=${Date.now() - mockupStart} screenshotUrl=${mockupDesktop ? 'set' : 'NULL'}`);
  } catch (err) {
    // Surface the FULL error (message + stack + name) so silent mockup
    // failures are visible in Vercel logs. Previous "just .message" was
    // hiding the actual cause when generateMockup threw a deeply nested
    // Anthropic SDK / parse error.
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const name = err instanceof Error ? err.name : 'unknown';
    console.error('[audit-enrich] MOCKUP GENERATION FAILED', JSON.stringify({
      prospectId,
      name,
      msg,
      stack,
    }, null, 2));
  }
}

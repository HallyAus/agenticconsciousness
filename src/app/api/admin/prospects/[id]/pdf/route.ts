import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { renderAuditPdf } from '@/lib/pdf';
import { fetchNormalisedJpegDetailed } from '@/lib/fetch-image';
import { getOrRenderPdf } from '@/lib/pdf-cache';
import { startBreadcrumbTrail, memorySnapshot } from '@/lib/pdf-breadcrumb';
import { fingerprintTechStack } from '@/lib/tech-stack';
import { buildTallMockupUrl } from '@/lib/screenshots';
import type { OutreachIssue } from '@/lib/outreach';

/** Upgrade legacy mockup_screenshot_url (viewport_height=900) to the
 *  new tall capture (viewport_height=1800) without forcing a reaudit.
 *  Called on first /pdf request per prospect after the tall-mockup
 *  change landed; persists the new URL so subsequent renders hit it
 *  directly. */
async function selfHealMockupUrl(prospectId: string, mockupToken: string | null, current: string | null): Promise<string | null> {
  if (!mockupToken) return current;
  if (current && !/viewport_height=900(\b|&)/.test(current)) return current;
  const siteBaseUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';
  const previewUrl = `${siteBaseUrl}/preview/${mockupToken}`;
  const tall = buildTallMockupUrl(previewUrl);
  if (!tall) return current;
  await sql`UPDATE prospects SET mockup_screenshot_url = ${tall}, updated_at = NOW() WHERE id = ${prospectId}`;
  return tall;
}

// Cold renders can push past 60s now that we fetch three screenshots
// (desktop + mobile + mockup) plus QR + multi-page react-pdf. Cached
// hits are milliseconds. 300s is Vercel Pro max.
export const maxDuration = 300;

/**
 * Returns the audit PDF for admin preview.
 *
 * Every render step writes an awaited breadcrumb to Neon — so when
 * react-pdf SIGKILLs the native process (stdout does not flush on
 * Vercel before the kill lands), the last surviving row identifies
 * the crash point. See src/lib/pdf-breadcrumb.ts for the rationale.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const trail = startBreadcrumbTrail(id);
  await trail.log('route:enter', { route: '/api/admin/prospects/[id]/pdf' });

  const rows = (await sql`
    SELECT url, business_name, audit_score, audit_summary, audit_data,
           screenshot_desktop_url, screenshot_mobile_url, mockup_screenshot_url,
           broken_links_count, viewport_meta_ok, copyright_year,
           place_data, pdf_url, mockup_token,
           google_reviews, google_rating, google_review_count
    FROM prospects WHERE id = ${id} LIMIT 1
  `) as Array<{
    mockup_token: string | null;
    url: string;
    business_name: string | null;
    audit_score: number | null;
    audit_summary: string | null;
    audit_data: { issues?: OutreachIssue[]; opportunities?: Array<{ category: string; title: string; detail: string; fix: string }> } | null;
    screenshot_desktop_url: string | null;
    screenshot_mobile_url: string | null;
    mockup_screenshot_url: string | null;
    broken_links_count: number | null;
    viewport_meta_ok: boolean | null;
    copyright_year: number | null;
    place_data: { types?: string[]; primaryType?: string } | null;
    pdf_url: string | null;
    google_reviews: Array<{ text?: string; author?: string; rating?: number; relativeTime?: string }> | null;
    google_rating: string | number | null;
    google_review_count: number | null;
  }>;
  if (rows.length === 0) {
    await trail.fail('db:prospect_not_found', new Error('no row'));
    return new NextResponse('Not found', { status: 404 });
  }
  const p = rows[0];
  await trail.log('db:prospect_loaded', {
    url: p.url,
    has_audit_data: Boolean(p.audit_data?.issues?.length),
    issues_count: p.audit_data?.issues?.length ?? 0,
    opportunities_count: p.audit_data?.opportunities?.length ?? 0,
    has_desktop_shot: Boolean(p.screenshot_desktop_url),
    has_mobile_shot: Boolean(p.screenshot_mobile_url),
    has_mockup_shot: Boolean(p.mockup_screenshot_url),
    pdf_url_cached: Boolean(p.pdf_url),
  });

  if (!p.audit_data?.issues?.length) {
    await trail.fail('db:audit_not_ready', new Error('no issues in audit_data'));
    return new NextResponse('Audit not ready', { status: 409 });
  }

  const domain = new URL(p.url).hostname.replace(/^www\./, '');

  // NO fast-path 302 redirect anymore. Vercel Blob serves with
  // Content-Disposition: attachment by default, which forces the
  // browser to download instead of preview the PDF. Instead we
  // always fetch the cached bytes (or render fresh) and serve
  // inline from THIS route with our own headers.
  let cached;
  try {
    cached = await getOrRenderPdf({
      prospectId: id,
      domain,
      renderFn: async () => {
        await trail.log('assets:fetch_start');

        // Self-heal: if mockup URL is still the old viewport_height=900
        // version, regenerate as 1440x1800 and persist before fetching.
        const mockupUrl = await selfHealMockupUrl(id, p.mockup_token, p.mockup_screenshot_url);

        const [desktopRes, mobileRes, mockupRes] = await Promise.all([
          p.screenshot_desktop_url ? fetchNormalisedJpegDetailed(p.screenshot_desktop_url, { maxWidth: 900 }) : Promise.resolve({ image: null, failure: null }),
          p.screenshot_mobile_url ? fetchNormalisedJpegDetailed(p.screenshot_mobile_url, { maxWidth: 400 }) : Promise.resolve({ image: null, failure: null }),
          mockupUrl ? fetchNormalisedJpegDetailed(mockupUrl, { maxWidth: 900 }) : Promise.resolve({ image: null, failure: null }),
        ]);

        const desktopShot = desktopRes.image;
        const mobileShot = mobileRes.image;
        const mockupShot = mockupRes.image;

        // Report on each image's final outcome. Log a warning
        // breadcrumb when a URL was supplied but the fetch never
        // produced a usable JPEG, so we can see which image dropped
        // out and why in Neon.
        if (p.screenshot_desktop_url && !desktopShot) {
          await trail.fail('assets:desktop_missing', new Error(desktopRes.failure?.detail ?? 'unknown'), { failure: desktopRes.failure });
        }
        if (p.screenshot_mobile_url && !mobileShot) {
          await trail.fail('assets:mobile_missing', new Error(mobileRes.failure?.detail ?? 'unknown'), { failure: mobileRes.failure });
        }
        if (p.mockup_screenshot_url && !mockupShot) {
          await trail.fail('assets:mockup_missing', new Error(mockupRes.failure?.detail ?? 'unknown'), { failure: mockupRes.failure });
        }

        await trail.log('assets:images_resolved', {
          desktop_bytes: desktopShot?.data.byteLength ?? null,
          mobile_bytes: mobileShot?.data.byteLength ?? null,
          mockup_bytes: mockupShot?.data.byteLength ?? null,
          desktop_first4: desktopShot ? Buffer.from(desktopShot.data).subarray(0, 4).toString('hex') : null,
          mobile_first4: mobileShot ? Buffer.from(mobileShot.data).subarray(0, 4).toString('hex') : null,
          mockup_first4: mockupShot ? Buffer.from(mockupShot.data).subarray(0, 4).toString('hex') : null,
          desktop_attempts: desktopRes.failure?.attempts ?? null,
          mobile_attempts: mobileRes.failure?.attempts ?? null,
          mockup_attempts: mockupRes.failure?.attempts ?? null,
        });

        // Convert to data URI strings. Buffer path has repeatedly caused
        // silent native crashes in fontkit/pdfkit on Vercel. String
        // data URIs are the shape that renders reliably.
        const toDataUri = (b: { data: Buffer; format: 'jpg' } | null): string | null =>
          b ? `data:image/jpeg;base64,${b.data.toString('base64')}` : null;
        const desktopBuf = toDataUri(desktopShot);
        const mobileBuf = toDataUri(mobileShot);
        // Re-enabled 2026-04-22 after the wrap=false crash in findings
        // was identified and fixed (commit 06b0789). The prior
        // "mockupScreenshot crashes render" diagnosis was wrong. The
        // crash was always the findings list, not this image.
        const mockupBuf = toDataUri(mockupShot);

        // Tech stack fingerprint (once per render; no DB cache yet).
        // Failure is never fatal: the techStack page just won't render.
        const techStack = await fingerprintTechStack(p.url, 10_000).catch((err) => {
          console.error('[pdf] tech-stack fingerprint failed', err instanceof Error ? err.message : err);
          return [];
        });

        const googleRatingNum = p.google_rating !== null && p.google_rating !== undefined
          ? Number(p.google_rating)
          : null;

        // Content-integrity signals (#6). Derived from hard fields + a
        // keyword scan of audit findings. Chips render red/green on the
        // "Under the hood" page.
        const issuesBlob = (p.audit_data?.issues ?? [])
          .map((iss) => `${iss.title} ${iss.detail} ${iss.fix}`)
          .join(' ')
          .toLowerCase();
        const mentions = (re: RegExp) => re.test(issuesBlob);
        const currentYear = new Date().getUTCFullYear();
        const legalCount = (p.audit_data?.issues ?? []).filter((i) => (i.severity ?? '').toLowerCase() === 'legal').length;
        const contentGaps = [
          { label: 'HTTPS', good: p.url.startsWith('https://'), value: p.url.startsWith('https://') ? 'ENABLED' : 'MISSING' },
          { label: 'MOBILE VIEWPORT', good: p.viewport_meta_ok === true, value: p.viewport_meta_ok === true ? 'CONFIGURED' : 'NEEDS FIX' },
          { label: 'BROKEN LINKS', good: (p.broken_links_count ?? 0) === 0, value: `${p.broken_links_count ?? 0} FOUND` },
          { label: 'COPYRIGHT YEAR', good: p.copyright_year === currentYear, value: p.copyright_year ? String(p.copyright_year) : 'MISSING' },
          { label: 'SOCIAL PREVIEWS', good: !mentions(/og:image|open graph|og tag|twitter card/), value: mentions(/og:image|open graph|og tag|twitter card/) ? 'MISSING' : 'PRESENT' },
          { label: 'SEO METADATA', good: !mentions(/meta description|title tag/), value: mentions(/meta description|title tag/) ? 'GAPS' : 'OK' },
          { label: 'IMAGE ALT TEXT', good: !mentions(/alt attribute|alt text|empty alt/), value: mentions(/alt attribute|alt text|empty alt/) ? 'GAPS' : 'OK' },
          { label: 'ACCESSIBILITY', good: legalCount === 0, value: legalCount === 0 ? 'COMPLIANT' : `${legalCount} WCAG ISSUES` },
        ];

        const basePdfArgs = {
          url: p.url,
          businessName: p.business_name,
          score: p.audit_score ?? 0,
          summary: p.audit_summary ?? '',
          issues: p.audit_data?.issues ?? [],
          opportunities: p.audit_data?.opportunities ?? [],
          date: new Date().toISOString().slice(0, 10),
          brokenLinksCount: p.broken_links_count,
          viewportMetaOk: p.viewport_meta_ok,
          copyrightYear: p.copyright_year,
          placeTypes: p.place_data?.types ?? (p.place_data?.primaryType ? [p.place_data.primaryType] : null),
          mockupScreenshot: mockupBuf,
          googleReviews: p.google_reviews ?? null,
          googleRating: googleRatingNum,
          googleReviewCount: p.google_review_count,
          techStack,
          contentGaps,
        };

        await trail.log('doc:args_built', {
          desk_uri_len: desktopBuf?.length ?? null,
          mob_uri_len: mobileBuf?.length ?? null,
          mockup_uri_len: mockupBuf?.length ?? null,
          issues: basePdfArgs.issues.length,
          opportunities: basePdfArgs.opportunities.length,
          google_reviews_len: basePdfArgs.googleReviews?.length ?? 0,
          tech_stack_len: basePdfArgs.techStack.length,
        });

        // This is the canary. If the process SIGKILLs inside react-pdf,
        // this will be the last row in the breadcrumbs table, and the
        // memory snapshot tells OOM apart from layout-NaN kills.
        await trail.log('render:about_to_call_renderToBuffer', {
          memory: memorySnapshot(),
          has_desktop: Boolean(desktopBuf),
          has_mobile: Boolean(mobileBuf),
          has_mockup: Boolean(mockupBuf),
        });

        try {
          const bytes = await renderAuditPdf({ ...basePdfArgs, screenshotDesktop: desktopBuf, screenshotMobile: mobileBuf });
          await trail.log('render:returned', {
            bytes: bytes.byteLength,
            memory: memorySnapshot(),
          });
          return bytes;
        } catch (err) {
          await trail.fail('render:primary_threw', err, { memory: memorySnapshot() });
          console.error('[admin/pdf] PRIMARY render FAILED, retrying without shots:', err instanceof Error ? err.stack ?? err.message : err);

          await trail.log('render:about_to_retry_no_shots', { memory: memorySnapshot() });
          const bytes = await renderAuditPdf({ ...basePdfArgs, screenshotDesktop: null, screenshotMobile: null, mockupScreenshot: null });
          await trail.log('render:retry_returned', {
            bytes: bytes.byteLength,
            memory: memorySnapshot(),
          });
          return bytes;
        }
      },
    });
    await trail.log('cache:complete', { cached: cached.cached, bytes: cached.bytes.byteLength });
  } catch (err) {
    await trail.fail('pipeline:fatal', err);
    console.error('[admin/pdf] full pipeline FAILED:', err instanceof Error ? err.stack ?? err.message : err);
    return new NextResponse(`PDF render failed, request_id=${trail.requestId}`, { status: 500 });
  }

  await trail.log('route:exit_ok', { bytes: cached.bytes.byteLength, cached: cached.cached });
  return new NextResponse(new Uint8Array(cached.bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="audit-${domain}.pdf"`,
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Pdf-Cache': cached.cached ? 'hit' : 'miss',
      'X-Request-Id': trail.requestId,
    },
  });
}

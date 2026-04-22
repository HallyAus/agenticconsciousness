import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { renderAuditPdf } from '@/lib/pdf';
import { fetchAsNormalisedJpeg } from '@/lib/fetch-image';
import { getOrRenderPdf } from '@/lib/pdf-cache';
import type { OutreachIssue } from '@/lib/outreach';

// Cold renders can push past 60s now that we fetch three screenshots
// (desktop + mobile + mockup) plus QR + multi-page react-pdf. Cached
// hits are milliseconds. 300s is Vercel Pro max.
export const maxDuration = 300;

/**
 * Returns the audit PDF for admin preview.
 *
 * Flow:
 *   1. Check prospects.pdf_url — if set and the Blob is reachable,
 *      redirect there (browser cacheable, no server work).
 *   2. Otherwise render fresh, upload to Vercel Blob, persist the URL,
 *      then stream the bytes back on THIS request (avoids a second
 *      round-trip on cache miss).
 *
 * Invalidation is the reaudit path's job — see audit-enrich which
 * calls clearPdfCache() before writing new scan data.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rows = (await sql`
    SELECT url, business_name, audit_score, audit_summary, audit_data,
           screenshot_desktop_url, screenshot_mobile_url, mockup_screenshot_url,
           broken_links_count, viewport_meta_ok, copyright_year,
           place_data, pdf_url
    FROM prospects WHERE id = ${id} LIMIT 1
  `) as Array<{
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
  }>;
  if (rows.length === 0) return new NextResponse('Not found', { status: 404 });
  const p = rows[0];
  if (!p.audit_data?.issues?.length) return new NextResponse('Audit not ready', { status: 409 });

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
        const [desktopShot, mobileShot, mockupShot] = await Promise.all([
          p.screenshot_desktop_url ? fetchAsNormalisedJpeg(p.screenshot_desktop_url, { maxWidth: 900 }).catch(() => null) : Promise.resolve(null),
          p.screenshot_mobile_url ? fetchAsNormalisedJpeg(p.screenshot_mobile_url, { maxWidth: 400 }).catch(() => null) : Promise.resolve(null),
          p.mockup_screenshot_url ? fetchAsNormalisedJpeg(p.mockup_screenshot_url, { maxWidth: 900 }).catch(() => null) : Promise.resolve(null),
        ]);
        const desktopBuf = desktopShot?.data ?? null;
        const mobileBuf = mobileShot?.data ?? null;
        const mockupBuf = mockupShot?.data ?? null;

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
        };

        console.log('[admin/pdf] render start', {
          id,
          desk_buf_bytes: desktopBuf?.byteLength ?? null,
          mob_buf_bytes: mobileBuf?.byteLength ?? null,
          mockup_buf_bytes: mockupBuf?.byteLength ?? null,
        });

        try {
          return await renderAuditPdf({ ...basePdfArgs, screenshotDesktop: desktopBuf, screenshotMobile: mobileBuf });
        } catch (err) {
          console.error('[admin/pdf] PRIMARY render FAILED, retrying without shots:', err instanceof Error ? err.stack ?? err.message : err);
          return await renderAuditPdf({ ...basePdfArgs, screenshotDesktop: null, screenshotMobile: null, mockupScreenshot: null });
        }
      },
    });
  } catch (err) {
    console.error('[admin/pdf] full pipeline FAILED:', err instanceof Error ? err.stack ?? err.message : err);
    return new NextResponse('PDF render failed, check Vercel logs', { status: 500 });
  }

  return new NextResponse(new Uint8Array(cached.bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="audit-${domain}.pdf"`,
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Pdf-Cache': cached.cached ? 'hit' : 'miss',
    },
  });
}

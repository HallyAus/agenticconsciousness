import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { renderAuditPdf } from '@/lib/pdf';
import { fetchAsNormalisedJpeg } from '@/lib/fetch-image';
import { getOrRenderPdf } from '@/lib/pdf-cache';
import type { OutreachIssue } from '@/lib/outreach';

// Screenshot prefetch + sharp + render can add a few seconds when
// ScreenshotOne is cold. 60s is plenty; the cached path is milliseconds.
export const maxDuration = 60;

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
           screenshot_desktop_url, screenshot_mobile_url,
           broken_links_count, viewport_meta_ok, copyright_year,
           pdf_url
    FROM prospects WHERE id = ${id} LIMIT 1
  `) as Array<{
    url: string;
    business_name: string | null;
    audit_score: number | null;
    audit_summary: string | null;
    audit_data: { issues?: OutreachIssue[] } | null;
    screenshot_desktop_url: string | null;
    screenshot_mobile_url: string | null;
    broken_links_count: number | null;
    viewport_meta_ok: boolean | null;
    copyright_year: number | null;
    pdf_url: string | null;
  }>;
  if (rows.length === 0) return new NextResponse('Not found', { status: 404 });
  const p = rows[0];
  if (!p.audit_data?.issues?.length) return new NextResponse('Audit not ready', { status: 409 });

  const domain = new URL(p.url).hostname.replace(/^www\./, '');

  // Fast-path redirect if we already have a blob URL. No body work needed.
  if (p.pdf_url) {
    console.log('[admin/pdf] 302 cached', { id, url: p.pdf_url });
    return NextResponse.redirect(p.pdf_url, 302);
  }

  // Cache miss — render, upload, store. Returns bytes so we can stream
  // on the same request rather than forcing a second round-trip.
  const cached = await getOrRenderPdf({
    prospectId: id,
    domain,
    renderFn: async () => {
      const [desktopShot, mobileShot] = await Promise.all([
        p.screenshot_desktop_url ? fetchAsNormalisedJpeg(p.screenshot_desktop_url, { maxWidth: 900 }).catch(() => null) : Promise.resolve(null),
        p.screenshot_mobile_url ? fetchAsNormalisedJpeg(p.screenshot_mobile_url, { maxWidth: 400 }).catch(() => null) : Promise.resolve(null),
      ]);
      const desktopBuf = desktopShot?.data ?? null;
      const mobileBuf = mobileShot?.data ?? null;

      const basePdfArgs = {
        url: p.url,
        businessName: p.business_name,
        score: p.audit_score ?? 0,
        summary: p.audit_summary ?? '',
        issues: p.audit_data?.issues ?? [],
        date: new Date().toISOString().slice(0, 10),
        brokenLinksCount: p.broken_links_count,
        viewportMetaOk: p.viewport_meta_ok,
        copyrightYear: p.copyright_year,
      };

      console.log('[admin/pdf] render start', {
        id,
        desk_buf_bytes: desktopBuf?.byteLength ?? null,
        mob_buf_bytes: mobileBuf?.byteLength ?? null,
      });

      try {
        return await renderAuditPdf({ ...basePdfArgs, screenshotDesktop: desktopBuf, screenshotMobile: mobileBuf });
      } catch (err) {
        console.error('[admin/pdf] PRIMARY render FAILED, retrying without shots:', err instanceof Error ? err.stack ?? err.message : err);
        return await renderAuditPdf({ ...basePdfArgs, screenshotDesktop: null, screenshotMobile: null });
      }
    },
  });

  return new NextResponse(new Uint8Array(cached.bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="audit-${domain}.pdf"`,
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Pdf-Cache': cached.cached ? 'hit' : 'miss',
    },
  });
}

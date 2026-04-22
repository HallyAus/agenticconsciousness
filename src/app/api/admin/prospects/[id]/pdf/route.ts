import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { renderAuditPdf } from '@/lib/pdf';
import { fetchAsNormalisedJpeg } from '@/lib/fetch-image';
import type { OutreachIssue } from '@/lib/outreach';

// Screenshot prefetch can add a few seconds when ScreenshotOne renders
// a cold URL. Keep the cap generous so the admin preview doesn't time
// out on a first hit.
export const maxDuration = 60;

/** Returns the audit as a downloadable PDF for preview in admin. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rows = (await sql`
    SELECT url, business_name, audit_score, audit_summary, audit_data,
           screenshot_desktop_url, screenshot_mobile_url,
           broken_links_count, viewport_meta_ok, copyright_year
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
  }>;
  if (rows.length === 0) return new NextResponse('Not found', { status: 404 });
  const p = rows[0];
  if (!p.audit_data?.issues?.length) return new NextResponse('Audit not ready', { status: 409 });

  // Match /send + /test-draft: canonical { data, format: 'jpg' } buffers,
  // with a no-screenshots retry so a react-pdf failure doesn't 500.
  const [desktopShot, mobileShot] = await Promise.all([
    p.screenshot_desktop_url ? fetchAsNormalisedJpeg(p.screenshot_desktop_url, { maxWidth: 900 }).catch(() => null) : Promise.resolve(null),
    p.screenshot_mobile_url ? fetchAsNormalisedJpeg(p.screenshot_mobile_url, { maxWidth: 400 }).catch(() => null) : Promise.resolve(null),
  ]);

  const basePdfArgs = {
    url: p.url,
    businessName: p.business_name,
    score: p.audit_score ?? 0,
    summary: p.audit_summary ?? '',
    issues: p.audit_data.issues,
    date: new Date().toISOString().slice(0, 10),
    brokenLinksCount: p.broken_links_count,
    viewportMetaOk: p.viewport_meta_ok,
    copyrightYear: p.copyright_year,
  };

  // Unwrap to raw Buffer. The { data, format: 'jpg' } object wrapper
  // silently skips embedding on Vercel's serverless runtime; raw Buffer
  // (with format guessed from SOI bytes) embeds reliably in both envs.
  const desktopBuf = desktopShot?.data ?? null;
  const mobileBuf = mobileShot?.data ?? null;

  console.log('[admin/pdf] start', {
    id,
    desk_url_present: !!p.screenshot_desktop_url,
    mob_url_present: !!p.screenshot_mobile_url,
    desk_buf_bytes: desktopBuf?.byteLength ?? null,
    mob_buf_bytes: mobileBuf?.byteLength ?? null,
  });

  let buf: Buffer;
  let renderPath: 'with-shots' | 'fallback' = 'with-shots';
  try {
    buf = await renderAuditPdf({ ...basePdfArgs, screenshotDesktop: desktopBuf, screenshotMobile: mobileBuf });
  } catch (err) {
    renderPath = 'fallback';
    console.error('[admin/pdf] PRIMARY render with screenshots FAILED:', err instanceof Error ? err.stack ?? err.message : err);
    buf = await renderAuditPdf({ ...basePdfArgs, screenshotDesktop: null, screenshotMobile: null });
  }
  console.log('[admin/pdf] done', { id, renderPath, pdf_bytes: buf.byteLength });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="audit-${new URL(p.url).hostname.replace(/^www\./, '')}.pdf"`,
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

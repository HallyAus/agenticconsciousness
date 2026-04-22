/**
 * Vercel Blob cache for the audit PDF.
 *
 * Without this, every /admin/prospects/[id]/pdf hit re-fetches both
 * ScreenshotOne shots, re-runs sharp, and re-renders react-pdf —
 * ~500-2000ms and two ScreenshotOne hits every time. With this, we
 * render once per audit and store the bytes in Vercel Blob; subsequent
 * hits come straight from the blob URL, which is stamped into
 * prospects.pdf_url.
 *
 * Invalidation: on reaudit we clear prospects.pdf_url so the next /pdf
 * request renders fresh. The old blob stays in storage until Vercel's
 * lifecycle policy or a manual cleanup removes it — not worth the
 * complexity of explicit delete calls. Storage cost is cents per
 * thousand prospects.
 *
 * Env: BLOB_READ_WRITE_TOKEN (set by Vercel when a Blob store is
 * attached to the project).
 */

import { put } from '@vercel/blob';
import { sql } from '@/lib/pg';

export interface CachedPdf {
  bytes: Buffer;
  url: string | null;
  cached: boolean;
}

function hasBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Return the cached PDF if we have one, else render via `renderFn`,
 * upload to Vercel Blob, persist the URL, and return the fresh bytes.
 *
 * When BLOB_READ_WRITE_TOKEN is not set (local dev, misconfigured
 * project), falls back to calling `renderFn` every time without
 * caching — the feature degrades gracefully instead of 500-ing.
 */
export async function getOrRenderPdf(args: {
  prospectId: string;
  domain: string;
  renderFn: () => Promise<Buffer>;
}): Promise<CachedPdf> {
  const { prospectId, domain, renderFn } = args;

  // 1. Check DB for a cached URL.
  if (hasBlobConfigured()) {
    const rows = (await sql`
      SELECT pdf_url FROM prospects WHERE id = ${prospectId} LIMIT 1
    `) as Array<{ pdf_url: string | null }>;
    const cachedUrl = rows[0]?.pdf_url ?? null;
    if (cachedUrl) {
      try {
        const r = await fetch(cachedUrl, { signal: AbortSignal.timeout(15_000) });
        if (r.ok) {
          const bytes = Buffer.from(await r.arrayBuffer());
          if (bytes.byteLength > 0) {
            console.log('[pdf-cache] hit', { prospectId, bytes: bytes.byteLength });
            return { bytes, url: cachedUrl, cached: true };
          }
        }
        console.warn('[pdf-cache] stored URL unreadable, will re-render', { prospectId, status: r.status });
      } catch (err) {
        console.warn('[pdf-cache] fetch failed, will re-render', err instanceof Error ? err.message : err);
      }
    }
  }

  // 2. Render fresh.
  const bytes = await renderFn();

  // 3. Upload to Blob and persist the URL. Any failure here must NOT
  //    break the caller — just return the bytes uncached.
  if (!hasBlobConfigured()) {
    return { bytes, url: null, cached: false };
  }
  try {
    const pathname = `audit-pdfs/${prospectId}-${Date.now()}-${domain.replace(/[^a-z0-9-]/gi, '')}.pdf`;
    const blob = await put(pathname, bytes, {
      access: 'public',
      contentType: 'application/pdf',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    await sql`
      UPDATE prospects
      SET pdf_url = ${blob.url}, updated_at = NOW()
      WHERE id = ${prospectId}
    `;
    console.log('[pdf-cache] miss -> stored', { prospectId, bytes: bytes.byteLength, url: blob.url });
    return { bytes, url: blob.url, cached: false };
  } catch (err) {
    console.error('[pdf-cache] upload/store failed, returning uncached bytes:', err instanceof Error ? err.message : err);
    return { bytes, url: null, cached: false };
  }
}

/**
 * Invalidate the cached PDF for a prospect. Called from audit-enrich on
 * every fresh scan so the next /pdf request regenerates against the new
 * screenshots / audit data.
 */
export async function clearPdfCache(prospectId: string): Promise<void> {
  await sql`
    UPDATE prospects
    SET pdf_url = NULL, updated_at = NOW()
    WHERE id = ${prospectId}
  `;
}

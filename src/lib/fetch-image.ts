/**
 * Remote-image fetchers sized for @react-pdf/renderer.
 *
 * ScreenshotOne's first render for a given URL can take 5-10 seconds;
 * react-pdf's internal fetch timeout is shorter than that and fails
 * silently, leaving a blank slot. We always prefetch.
 *
 * Shapes available:
 *   - `fetchAsDataUri`            : raw base64 data URI (unused legacy).
 *   - `fetchAsNormalisedJpegUri`  : sharp-normalised baseline JPEG as a
 *     data URI string. This is the canonical shape for our PDF pipeline.
 *     Data URIs keep @react-pdf's box-layout math in scalar space and
 *     avoid both the silent-skip Buffer path (Issue #2639) and the
 *     NaN border-render crash seen on Vercel when raw Buffers fail to
 *     decode (unsupported number: -1.8e+21 from moveTo/clipBorderTop).
 *
 * All return null on failure so the caller can fall back to no image.
 */

import sharp from 'sharp';

export async function fetchAsDataUri(url: string, timeoutMs = 25_000): Promise<string | null> {
  if (!url) return null;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'image/*' },
    });
    if (!res.ok) {
      console.error('[fetch-image] non-ok', res.status, url.slice(0, 120));
      return null;
    }
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0) {
      console.error('[fetch-image] zero bytes', url.slice(0, 120));
      return null;
    }
    console.log('[fetch-image] ok', {
      bytes: buf.byteLength,
      contentType,
      ms: Date.now() - t0,
      host: (() => { try { return new URL(url).host; } catch { return '?'; } })(),
    });
    return `data:${contentType};base64,${buf.toString('base64')}`;
  } catch (err) {
    console.error('[fetch-image] failed', err instanceof Error ? err.message : err);
    return null;
  }
}

export interface NormalisedJpeg {
  data: Buffer;
  format: 'jpg';
}

/**
 * Fetch a remote image and return a sharp-normalised baseline JPEG
 * Buffer wrapped as `{ data, format: 'jpg' }` — the canonical shape for
 * @react-pdf v4 server-side use.
 *
 * Sharp pipeline:
 *   - rotate() bakes EXIF orientation.
 *   - resize(maxWidth) caps the dimensions.
 *   - jpeg() encodes baseline (progressive: false), NO mozjpeg, NO
 *     optimiseCoding, chroma 4:2:0 — produces the most compatible
 *     marker sequence for pdfkit's JPEG parser on Vercel's sharp build.
 *   - withMetadata({}) strips EXIF + ICC.
 *
 * Returns null on failure (bad URL, zero bytes, sharp throw, missing
 * SOI marker).
 */
export async function fetchAsNormalisedJpeg(
  url: string,
  opts: { maxWidth?: number; quality?: number; timeoutMs?: number } = {},
): Promise<NormalisedJpeg | null> {
  const { maxWidth = 900, quality = 75, timeoutMs = 25_000 } = opts;
  if (!url) return null;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'image/*' },
    });
    if (!res.ok) {
      console.error('[fetch-image] normalised non-ok', res.status, url.slice(0, 120));
      return null;
    }
    const raw = Buffer.from(await res.arrayBuffer());
    if (raw.byteLength === 0) {
      console.error('[fetch-image] normalised zero bytes', url.slice(0, 120));
      return null;
    }
    const data = await sharp(raw)
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .jpeg({ quality, progressive: false, mozjpeg: false, optimiseCoding: false, chromaSubsampling: '4:2:0' })
      .withMetadata({})
      .toBuffer();
    const soi = data.byteLength >= 2 && data[0] === 0xff && data[1] === 0xd8;
    if (!soi) {
      console.error('[fetch-image] normalised missing SOI', { outBytes: data.byteLength });
      return null;
    }
    console.log('[fetch-image] normalised ok', {
      rawBytes: raw.byteLength,
      outBytes: data.byteLength,
      soi,
      maxWidth,
      quality,
      ms: Date.now() - t0,
      host: (() => { try { return new URL(url).host; } catch { return '?'; } })(),
    });
    return { data, format: 'jpg' };
  } catch (err) {
    console.error('[fetch-image] normalised failed', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Remote-image fetchers sized for @react-pdf/renderer.
 *
 * ScreenshotOne's first render for a given URL can take 5-10 seconds;
 * react-pdf's internal fetch timeout is shorter than that and fails
 * silently, leaving a blank slot. We always prefetch.
 *
 * Two shapes:
 *   - `fetchAsDataUri`       : base64 data URI string (legacy callers)
 *   - `fetchAsNormalisedJpeg`: canonical `{ data: Buffer, format: 'jpg' }`
 *     ready to feed `<Image src={...}>`. sharp-normalised so EXIF + ICC
 *     are stripped and the image is baseline JPEG, which sidesteps the
 *     three most common react-pdf v4 crash modes (jpeg-exif "Unknown
 *     version", the data-URI decode path, and silent-blank CMYK).
 *
 * Both return null on any failure so the caller can fall back to no image.
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
 * Fetch a remote image and return it as a sharp-normalised baseline JPEG
 * Buffer, shaped as `{ data, format: 'jpg' }` — the canonical @react-pdf
 * `<Image src>` form per the v4 docs. Strips EXIF + ICC, forces baseline
 * (progressive: false), and clamps width so memory stays reasonable in
 * serverless. Returns null on any failure.
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
    // NOTE: mozjpeg is OFF. The optimised encoder produces marker sequences
    // that pdfkit's JPEG parser (inside @react-pdf/renderer) silently
    // rejects on Vercel's serverless runtime — the render returns no
    // error but the image is not embedded. Standard JPEG encoding works.
    const data = await sharp(raw)
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .jpeg({ quality, progressive: false, mozjpeg: false, optimiseCoding: false, chromaSubsampling: '4:2:0' })
      .withMetadata({})
      .toBuffer();
    // Sanity-check: first two bytes must be 0xFF 0xD8 (JPEG SOI).
    const soi = data.byteLength >= 2 && data[0] === 0xff && data[1] === 0xd8;
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

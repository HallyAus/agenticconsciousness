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
export interface FetchImageFailure {
  kind: 'non_ok' | 'zero_bytes' | 'bad_jpeg' | 'timeout' | 'throw';
  attempts: number;
  detail: string;
  status?: number;
  ms: number;
}

export interface FetchImageResult {
  image: NormalisedJpeg | null;
  failure: FetchImageFailure | null;
}

/**
 * Fetch + normalise with retries. `fetchAsNormalisedJpeg` is kept as a
 * thin wrapper that discards failure detail for legacy callers; the
 * PDF route prefers `fetchNormalisedJpegDetailed` so it can write a
 * breadcrumb when a specific image drops out.
 */
export async function fetchNormalisedJpegDetailed(
  url: string,
  opts: { maxWidth?: number; quality?: number; timeoutMs?: number; maxAttempts?: number; backoffMs?: number[] } = {},
): Promise<FetchImageResult> {
  const {
    maxWidth = 900,
    quality = 75,
    timeoutMs = 30_000,
    maxAttempts = 3,
    backoffMs = [0, 2_000, 4_000],
  } = opts;
  if (!url) return { image: null, failure: null };
  const t0 = Date.now();

  let lastFailure: FetchImageFailure | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const wait = backoffMs[attempt - 1] ?? 0;
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const attemptStart = Date.now();
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: 'image/*' },
      });
      if (!res.ok) {
        lastFailure = { kind: 'non_ok', attempts: attempt, detail: `HTTP ${res.status}`, status: res.status, ms: Date.now() - t0 };
        console.error('[fetch-image] non-ok', { attempt, status: res.status, url: url.slice(0, 120) });
        continue;
      }
      const raw = Buffer.from(await res.arrayBuffer());
      if (raw.byteLength === 0) {
        lastFailure = { kind: 'zero_bytes', attempts: attempt, detail: 'empty body', ms: Date.now() - t0 };
        console.error('[fetch-image] zero bytes', { attempt, url: url.slice(0, 120) });
        continue;
      }
      const data = await sharp(raw)
        .rotate()
        .resize({ width: maxWidth, withoutEnlargement: true })
        .jpeg({ quality, progressive: false, mozjpeg: false, optimiseCoding: false, chromaSubsampling: '4:2:0' })
        .withMetadata({})
        .toBuffer();
      const soi = data.byteLength >= 2 && data[0] === 0xff && data[1] === 0xd8;
      if (!soi) {
        lastFailure = { kind: 'bad_jpeg', attempts: attempt, detail: 'missing SOI marker after sharp encode', ms: Date.now() - t0 };
        console.error('[fetch-image] missing SOI', { attempt, outBytes: data.byteLength });
        continue;
      }
      console.log('[fetch-image] ok', {
        attempt,
        rawBytes: raw.byteLength,
        outBytes: data.byteLength,
        maxWidth,
        quality,
        totalMs: Date.now() - t0,
        attemptMs: Date.now() - attemptStart,
        host: (() => { try { return new URL(url).host; } catch { return '?'; } })(),
      });
      return { image: { data, format: 'jpg' }, failure: null };
    } catch (err) {
      const name = err instanceof Error ? err.name : 'Unknown';
      const msg = err instanceof Error ? err.message : String(err);
      const kind: FetchImageFailure['kind'] = name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'throw';
      lastFailure = { kind, attempts: attempt, detail: `${name}: ${msg}`, ms: Date.now() - t0 };
      console.error('[fetch-image] throw', { attempt, name, msg });
    }
  }

  return { image: null, failure: lastFailure };
}

export async function fetchAsNormalisedJpeg(
  url: string,
  opts: { maxWidth?: number; quality?: number; timeoutMs?: number; maxAttempts?: number } = {},
): Promise<NormalisedJpeg | null> {
  const { image } = await fetchNormalisedJpegDetailed(url, opts);
  return image;
}

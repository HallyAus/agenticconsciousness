/**
 * Fetch a remote image as a base64 data URI so react-pdf doesn't have
 * to do it at render time. ScreenshotOne's first render for a given
 * URL can take 5-10 seconds; react-pdf's internal fetch timeout is
 * shorter than that and fails silently, leaving a blank slot.
 *
 * Returns null on any failure so the caller can fall back to no image.
 */

export async function fetchAsDataUri(url: string, timeoutMs = 25_000): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'image/*' },
    });
    if (!res.ok) {
      console.error('[fetch-image] non-ok', res.status, url.slice(0, 100));
      return null;
    }
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0) return null;
    return `data:${contentType};base64,${buf.toString('base64')}`;
  } catch (err) {
    console.error('[fetch-image] failed', err instanceof Error ? err.message : err);
    return null;
  }
}

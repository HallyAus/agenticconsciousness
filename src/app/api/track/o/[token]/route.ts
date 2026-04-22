import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';

/**
 * GET /api/track/o/[token] -> 1x1 transparent GIF.
 * Bumps opens_count on the matching prospect_sends row (if any).
 *
 * Intentionally tolerant: returns the pixel even on DB errors so the
 * email client doesn't display a broken-image icon.
 */

const GIF = Buffer.from(
  'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64',
);

function pixelResponse(): Response {
  return new Response(new Uint8Array(GIF), {
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(GIF.byteLength),
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token && /^[a-f0-9]{16,64}$/i.test(token)) {
    try {
      await sql`
        UPDATE prospect_sends
        SET opens_count = opens_count + 1,
            last_opened_at = NOW()
        WHERE tracking_token = ${token}
      `;
    } catch (err) {
      console.error('[track/o] update failed', err instanceof Error ? err.message : err);
    }
  }
  return pixelResponse();
}

// Some mail clients aggressively prefetch + revalidate. Handle HEAD so we
// don't accidentally double-count an "open" from a HEAD and a GET.
export async function HEAD() {
  return new Response(null, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store',
    },
  });
}

export { NextResponse };

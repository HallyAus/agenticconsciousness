import { NextRequest } from 'next/server';
import { sql } from '@/lib/pg';

/**
 * Public preview of a Claude-generated mockup for a prospect.
 * URL: /preview/[token]
 *
 * We serve the stored HTML directly. No Basic Auth gate — these URLs
 * are designed to be shared with prospects via the outreach email.
 * The token is 24 hex chars from crypto.randomBytes so it's not
 * enumerable.
 *
 * robots noindex + nofollow headers prevent search engines caching the
 * mockup as real content.
 */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{12,64}$/i.test(token)) {
    return new Response('Not found', { status: 404 });
  }
  const rows = (await sql`
    SELECT mockup_html FROM prospects WHERE mockup_token = ${token} LIMIT 1
  `) as Array<{ mockup_html: string | null }>;
  const html = rows[0]?.mockup_html;
  if (!html) return new Response('Not found', { status: 404 });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}

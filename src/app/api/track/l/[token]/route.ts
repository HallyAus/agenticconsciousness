import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';

/**
 * GET /api/track/l/[token]?u=<encoded-url>
 *   -> 302 to the target URL.
 *   -> Bumps clicks_count on prospect_sends.
 *   -> Inserts a prospect_send_clicks row for audit.
 *
 * We validate the target URL as http(s) only. No open redirect.
 */

function safeRedirect(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const target = safeRedirect(req.nextUrl.searchParams.get('u'));
  if (!target) {
    return NextResponse.json({ error: 'Invalid or missing target URL' }, { status: 400 });
  }

  if (token && /^[a-f0-9]{16,64}$/i.test(token)) {
    try {
      const sendRows = (await sql`
        SELECT id FROM prospect_sends WHERE tracking_token = ${token} LIMIT 1
      `) as Array<{ id: string }>;
      if (sendRows.length > 0) {
        const sendId = sendRows[0].id;
        const ua = req.headers.get('user-agent') ?? '';
        const ip =
          req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
          req.headers.get('x-real-ip') ??
          '';
        await sql`
          UPDATE prospect_sends
          SET clicks_count = clicks_count + 1,
              last_clicked_at = NOW()
          WHERE id = ${sendId}
        `;
        await sql`
          INSERT INTO prospect_send_clicks (send_id, target_url, user_agent, ip)
          VALUES (${sendId}, ${target}, ${ua.slice(0, 500)}, ${ip.slice(0, 64)})
        `;
      }
    } catch (err) {
      console.error('[track/l] update failed', err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.redirect(target, 302);
}

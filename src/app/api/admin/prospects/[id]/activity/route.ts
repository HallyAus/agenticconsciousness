import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';

/**
 * Per-prospect activity feed. Returns:
 *   - all prospect_sends rows for this prospect (subject, when sent, open/click counters)
 *   - all prospect_send_clicks rows for those sends (when, which URL, user-agent, IP)
 *
 * Used by /admin/prospects/[id]/activity page.
 */

interface SendRow {
  id: string;
  touch_num: number | null;
  subject: string | null;
  sent_at: string | null;
  tracking_token: string | null;
  opens_count: number;
  last_opened_at: string | null;
  clicks_count: number;
  last_clicked_at: string | null;
  graph_message_id: string | null;
}

interface ClickRow {
  id: string;
  send_id: string;
  target_url: string;
  clicked_at: string;
  user_agent: string | null;
  ip: string | null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const prospectRows = (await sql`
    SELECT id, url, email, business_name, status
    FROM prospects WHERE id = ${id} LIMIT 1
  `) as Array<{ id: string; url: string; email: string | null; business_name: string | null; status: string }>;
  if (prospectRows.length === 0) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  }

  const sends = (await sql`
    SELECT id, touch_num, subject, sent_at, tracking_token,
           opens_count, last_opened_at, clicks_count, last_clicked_at,
           graph_message_id
    FROM prospect_sends
    WHERE prospect_id = ${id}
    ORDER BY sent_at DESC NULLS LAST, id DESC
  `) as SendRow[];

  const sendIds = sends.map((s) => s.id);
  let clicks: ClickRow[] = [];
  if (sendIds.length > 0) {
    clicks = (await sql`
      SELECT id, send_id, target_url, clicked_at, user_agent, ip
      FROM prospect_send_clicks
      WHERE send_id = ANY(${sendIds}::uuid[])
      ORDER BY clicked_at DESC
    `) as ClickRow[];
  }

  return NextResponse.json({
    prospect: prospectRows[0],
    sends,
    clicks,
  });
}

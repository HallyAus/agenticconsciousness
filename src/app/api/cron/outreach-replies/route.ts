import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { hasReplyInThread, isGraphConfigured } from '@/lib/graph';

/**
 * Polls Microsoft Graph for replies in any prospect's conversation that
 * we haven't already flagged. When a reply arrives we flip the prospect
 * to 'replied' and clear next_touch_due_at so the follow-up cron stops.
 *
 * Runs every 2h per vercel cron config. Only inspects conversations for
 * prospects in active-sequence statuses — touch_count > 0 — and skips
 * any already marked replied / unsubscribed / bounced.
 */

interface ActiveRow {
  id: string;
  graph_conversation_id: string | null;
  last_outbound_at: string | null;
  status: string;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get('authorization') ?? '';
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  if (!isGraphConfigured()) {
    return NextResponse.json({ error: 'Graph not configured' }, { status: 503 });
  }

  const rows = (await sql`
    SELECT id, graph_conversation_id, last_outbound_at, status
    FROM prospects
    WHERE status IN ('sent','followed_up_1','followed_up_2')
      AND reply_detected_at IS NULL
      AND graph_conversation_id IS NOT NULL
    ORDER BY last_outbound_at DESC
    LIMIT 200
  `) as ActiveRow[];

  const results: Array<{ id: string; reply: boolean }> = [];

  for (const p of rows) {
    if (!p.graph_conversation_id || !p.last_outbound_at) continue;
    // Look back slightly earlier than the outbound to catch same-minute
    // replies; Graph compares receivedDateTime, so one-minute slack is
    // plenty.
    const since = new Date(new Date(p.last_outbound_at).getTime() - 60_000).toISOString();
    try {
      const replied = await hasReplyInThread(p.graph_conversation_id, since);
      if (replied) {
        await sql`
          UPDATE prospects
          SET status = 'replied',
              reply_detected_at = NOW(),
              next_touch_due_at = NULL,
              updated_at = NOW()
          WHERE id = ${p.id}
        `;
        results.push({ id: p.id, reply: true });
      } else {
        results.push({ id: p.id, reply: false });
      }
    } catch (err) {
      console.error('[cron/replies]', p.id, err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ ok: true, checked: rows.length, replied: results.filter((r) => r.reply).length });
}

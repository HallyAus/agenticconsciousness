import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';

/**
 * Admin-only: flip a prospect from 'drafted' to 'sent' after the human
 * has manually clicked Send in Outlook on the web. Records a matching
 * prospect_sends row for audit / cap accounting.
 *
 * Idempotent: calling on an already-sent prospect is a no-op success.
 */

interface ProspectRow {
  id: string;
  status: string;
  graph_message_id: string | null;
  graph_conversation_id: string | null;
  drafted_subject: string | null;
  drafted_body_html: string | null;
  touch_count: number;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const rows = (await sql`
    SELECT id, status, graph_message_id, graph_conversation_id,
           drafted_subject, drafted_body_html, touch_count
    FROM prospects WHERE id = ${id} LIMIT 1
  `) as ProspectRow[];
  if (rows.length === 0) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const p = rows[0];

  if (p.status === 'sent' || p.status === 'replied') {
    return NextResponse.json({ ok: true, alreadySent: true });
  }
  if (p.status !== 'drafted') {
    return NextResponse.json({ error: `Cannot mark-sent from status ${p.status}` }, { status: 409 });
  }

  const touch = p.touch_count + 1;

  await sql`
    UPDATE prospects
    SET status = 'sent',
        touch_count = ${touch},
        last_outbound_at = NOW(),
        updated_at = NOW()
    WHERE id = ${id}
  `;

  // prospect_sends row was already created when the draft was generated so
  // the tracking token could be set. Bump its touch number + timestamp here.
  // If no send row exists (legacy drafts), insert one.
  await sql`
    UPDATE prospect_sends
    SET touch_num = ${touch},
        sent_at = NOW()
    WHERE prospect_id = ${id}
      AND graph_message_id = ${p.graph_message_id}
  `;

  return NextResponse.json({ ok: true });
}

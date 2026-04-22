import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { delegatedHasReplyInThread, getStoredAuth } from '@/lib/graph-delegated';

/**
 * Cron: scan the Agentic mailbox for replies to sent outreach.
 *
 * Runs via Vercel cron (vercel.json). Can also be hit manually by an
 * admin (Basic Auth gate in src/proxy.ts protects the /api/cron/*
 * path the same way /api/admin/* is protected when accessed via the
 * browser; the Vercel cron hits it with the CRON_SECRET header).
 *
 * For each prospect in status = 'sent' or 'followed_up_*', we look at
 * its graph_conversation_id and query Graph for any inbound message
 * since the send. If one exists, flip status to 'replied' and stamp
 * reply_detected_at. This stops any scheduled follow-ups.
 */

interface Row {
  id: string;
  email: string | null;
  graph_conversation_id: string | null;
  last_outbound_at: string | null;
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret set — allow manual hits in dev
  const header = req.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const auth = await getStoredAuth();
  if (!auth) {
    return NextResponse.json({ skipped: 'no delegated session' });
  }

  const sender = process.env.M365_SENDER_EMAIL ?? 'daniel@agenticconsciousness.com.au';

  const rows = (await sql`
    SELECT id, email, graph_conversation_id, last_outbound_at
    FROM prospects
    WHERE status IN ('sent', 'followed_up_1', 'followed_up_2', 'drafted')
      AND graph_conversation_id IS NOT NULL
      AND (reply_detected_at IS NULL)
      AND (last_outbound_at IS NOT NULL)
    ORDER BY last_outbound_at DESC
    LIMIT 100
  `) as Row[];

  let checked = 0;
  let replied = 0;
  for (const p of rows) {
    if (!p.graph_conversation_id || !p.last_outbound_at) continue;
    checked++;
    try {
      const hasReply = await delegatedHasReplyInThread({
        mailboxUpnOrId: sender,
        conversationId: p.graph_conversation_id,
        sinceIso: p.last_outbound_at,
        senderEmail: sender,
      });
      if (hasReply) {
        replied++;
        await sql`
          UPDATE prospects
          SET status = 'replied',
              reply_detected_at = NOW(),
              scheduled_send_at = NULL,
              next_touch_due_at = NULL,
              updated_at = NOW()
          WHERE id = ${p.id}
        `;
      }
    } catch (err) {
      console.error('[cron/replies] check failed', p.id, err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ checked, replied, at: new Date().toISOString() });
}

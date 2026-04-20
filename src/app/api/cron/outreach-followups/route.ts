import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { sendGraphMail, isGraphConfigured } from '@/lib/graph';
import { buildTouch2, buildTouch3, type OutreachIssue } from '@/lib/outreach';

/**
 * Daily cron. Finds prospects whose next_touch_due_at has passed and
 * fires touch #2 or #3 as a threaded reply to the previous send.
 *
 * Cadence locked in outreach.ts:
 *   #1 Day 0  → queue #2 at +3 days
 *   #2 Day +3 → queue #3 at +4 days (total +7 from #1)
 *   #3 Day +7 → no more follow-ups
 *
 * Respects SEND_DAILY_CAP (default 20) across all outbound for the day.
 * Auth: Authorization: Bearer ${CRON_SECRET}.
 */

const DEFAULT_CAP = 20;

interface DueRow {
  id: string;
  url: string;
  business_name: string | null;
  email: string | null;
  status: string;
  touch_count: number;
  audit_score: number | null;
  audit_summary: string | null;
  audit_data: { issues?: OutreachIssue[] } | null;
  graph_message_id: string | null;
  unsub_token: string | null;
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

  const cap = Number(process.env.SEND_DAILY_CAP ?? DEFAULT_CAP);
  const capRow = (await sql`
    SELECT count(*)::int AS n FROM prospect_sends WHERE sent_at > NOW() - INTERVAL '24 hours'
  `) as Array<{ n: number }>;
  let sentInWindow = capRow[0].n;
  if (sentInWindow >= cap) {
    return NextResponse.json({ ok: true, skipped: 'cap_reached', sentInWindow, cap });
  }

  const due = (await sql`
    SELECT id, url, business_name, email, status, touch_count, audit_score,
           audit_summary, audit_data, graph_message_id, unsub_token
    FROM prospects
    WHERE status IN ('sent','followed_up_1')
      AND next_touch_due_at IS NOT NULL
      AND next_touch_due_at <= NOW()
      AND email IS NOT NULL
      AND reply_detected_at IS NULL
    ORDER BY next_touch_due_at ASC
    LIMIT 100
  `) as DueRow[];

  const siteBaseUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';

  const results: Array<{ id: string; outcome: string; error?: string }> = [];

  for (const p of due) {
    if (sentInWindow >= cap) { results.push({ id: p.id, outcome: 'capped' }); continue; }
    if (!p.email || !p.graph_message_id || !p.unsub_token) {
      results.push({ id: p.id, outcome: 'skipped_missing_data' });
      continue;
    }
    if (!p.audit_data?.issues?.length) {
      results.push({ id: p.id, outcome: 'skipped_no_issues' });
      continue;
    }

    const domain = new URL(p.url).hostname.replace(/^www\./, '');
    const ctx = {
      url: p.url,
      domain,
      businessName: p.business_name,
      score: p.audit_score ?? 0,
      summary: p.audit_summary ?? '',
      issues: p.audit_data.issues,
      unsubToken: p.unsub_token,
      sourceLine: `You're receiving this because ${p.email} is publicly listed on ${domain}. This is a one-off follow-up — the previous email has the context.`,
      siteBaseUrl,
    };

    const nextTouchNum = p.status === 'sent' ? 2 : 3;
    const built = nextTouchNum === 2 ? buildTouch2(ctx) : buildTouch3(ctx);

    try {
      const send = await sendGraphMail({
        to: p.email,
        subject: built.subject,
        html: built.html,
        replyToMessageId: p.graph_message_id,
      });

      const newStatus = nextTouchNum === 2 ? 'followed_up_1' : 'followed_up_2';
      const nextDue = nextTouchNum === 2 ? `NOW() + INTERVAL '4 days'` : 'NULL';

      // Two branches so we can set next_touch_due_at correctly without
      // conditional SQL building (keeps the tagged-template happy).
      if (nextTouchNum === 2) {
        await sql`
          UPDATE prospects
          SET status = ${newStatus},
              touch_count = ${p.touch_count + 1},
              last_outbound_at = NOW(),
              next_touch_due_at = NOW() + INTERVAL '4 days',
              graph_conversation_id = COALESCE(graph_conversation_id, ${send.conversationId}),
              updated_at = NOW()
          WHERE id = ${p.id}
        `;
      } else {
        await sql`
          UPDATE prospects
          SET status = ${newStatus},
              touch_count = ${p.touch_count + 1},
              last_outbound_at = NOW(),
              next_touch_due_at = NULL,
              graph_conversation_id = COALESCE(graph_conversation_id, ${send.conversationId}),
              updated_at = NOW()
          WHERE id = ${p.id}
        `;
      }
      await sql`
        INSERT INTO prospect_sends (prospect_id, touch_num, subject, body_snapshot, graph_message_id, graph_conversation_id)
        VALUES (${p.id}, ${nextTouchNum}, ${built.subject}, ${built.html}, ${send.messageId}, ${send.conversationId})
      `;
      sentInWindow += 1;
      results.push({ id: p.id, outcome: `sent_touch_${nextTouchNum}` });
      // Fall through to satisfy lint on unused `nextDue`
      void nextDue;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'send failed';
      await sql`
        INSERT INTO prospect_sends (prospect_id, touch_num, subject, error)
        VALUES (${p.id}, ${nextTouchNum}, ${built.subject}, ${msg})
      `.catch(() => {});
      results.push({ id: p.id, outcome: 'error', error: msg });
    }
  }

  return NextResponse.json({ ok: true, processed: due.length, sentInWindow, cap, results });
}

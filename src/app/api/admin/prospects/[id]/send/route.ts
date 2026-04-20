import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { renderAuditPdf } from '@/lib/pdf';
import { sendGraphMail, isGraphConfigured } from '@/lib/graph';
import { buildTouch1, type OutreachIssue } from '@/lib/outreach';

/**
 * Admin-only: fire touch #1 to a prospect. Requires a completed audit.
 * Respects the global 24h send ceiling (env SEND_DAILY_CAP, default 20).
 *
 * After a successful send:
 *   - status → 'sent'
 *   - touch_count → 1
 *   - last_outbound_at → now
 *   - next_touch_due_at → now + 3 days
 */

const DEFAULT_CAP = 20;

interface ProspectRow {
  id: string;
  url: string;
  business_name: string | null;
  email: string | null;
  status: string;
  audit_score: number | null;
  audit_summary: string | null;
  audit_data: { issues?: OutreachIssue[] } | null;
  unsub_token: string | null;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isGraphConfigured()) {
    return NextResponse.json(
      { error: 'Microsoft 365 not configured. Set M365_TENANT_ID / CLIENT_ID / CLIENT_SECRET / SENDER_EMAIL.' },
      { status: 503 },
    );
  }

  const rows = (await sql`
    SELECT id, url, business_name, email, status, audit_score, audit_summary, audit_data, unsub_token
    FROM prospects WHERE id = ${id} LIMIT 1
  `) as ProspectRow[];
  if (rows.length === 0) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const p = rows[0];

  if (!p.email) return NextResponse.json({ error: 'No email on file' }, { status: 400 });
  if (p.status === 'unsubscribed') return NextResponse.json({ error: 'Prospect has unsubscribed' }, { status: 409 });
  if (p.status !== 'audited') return NextResponse.json({ error: `Cannot send from status ${p.status}` }, { status: 409 });
  if (!p.audit_data?.issues?.length) return NextResponse.json({ error: 'Audit has no issues' }, { status: 400 });
  if (!p.unsub_token) return NextResponse.json({ error: 'Missing unsub token' }, { status: 500 });

  // 24h cap
  const cap = Number(process.env.SEND_DAILY_CAP ?? DEFAULT_CAP);
  const capRows = (await sql`
    SELECT count(*)::int AS n FROM prospect_sends WHERE sent_at > NOW() - INTERVAL '24 hours'
  `) as Array<{ n: number }>;
  if (capRows[0].n >= cap) {
    return NextResponse.json({ error: `Daily send cap (${cap}) reached. Try again tomorrow.` }, { status: 429 });
  }

  const siteBaseUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';
  const domain = new URL(p.url).hostname.replace(/^www\./, '');

  const ctx = {
    url: p.url,
    domain,
    businessName: p.business_name,
    score: p.audit_score ?? 0,
    summary: p.audit_summary ?? '',
    issues: p.audit_data.issues,
    unsubToken: p.unsub_token,
    sourceLine: `You're receiving this because ${p.email} is publicly listed on ${domain}. This is a one-off audit, not a mailing list.`,
    siteBaseUrl,
  };

  const { subject, html } = buildTouch1(ctx);

  const pdfBuffer = await renderAuditPdf({
    url: p.url,
    businessName: p.business_name,
    score: p.audit_score ?? 0,
    summary: p.audit_summary ?? '',
    issues: p.audit_data.issues,
    date: new Date().toISOString().slice(0, 10),
  });

  try {
    const send = await sendGraphMail({
      to: p.email,
      subject,
      html,
      pdf: { filename: `audit-${domain}.pdf`, base64: pdfBuffer.toString('base64') },
    });

    await sql`
      UPDATE prospects
      SET status = 'sent',
          touch_count = 1,
          last_outbound_at = NOW(),
          next_touch_due_at = NOW() + INTERVAL '3 days',
          graph_message_id = ${send.messageId},
          graph_conversation_id = ${send.conversationId},
          updated_at = NOW()
      WHERE id = ${id}
    `;
    await sql`
      INSERT INTO prospect_sends (prospect_id, touch_num, subject, body_snapshot, graph_message_id, graph_conversation_id)
      VALUES (${id}, 1, ${subject}, ${html}, ${send.messageId}, ${send.conversationId})
    `;

    return NextResponse.json({ ok: true, messageId: send.messageId, conversationId: send.conversationId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'send failed';
    await sql`
      INSERT INTO prospect_sends (prospect_id, touch_num, subject, error)
      VALUES (${id}, 1, ${subject}, ${msg})
    `.catch(() => {});
    console.error('[admin/send] failed', { id, msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

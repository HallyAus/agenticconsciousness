import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { renderAuditPdf } from '@/lib/pdf';
import { createDraftAuto } from '@/lib/graph-auto';
import { isGraphConfigured } from '@/lib/graph';
import { isDelegatedConnected } from '@/lib/graph-delegated';
import { buildTouch1, type OutreachIssue } from '@/lib/outreach';

/**
 * Admin-only: create a DRAFT email in the sender's mailbox with the audit
 * PDF attached. Returns a `webLink` that deep-links to the draft in Outlook
 * on the web so Daniel can review and send manually.
 *
 * Status flow:
 *   'audited' -> 'drafted' (this endpoint)
 *   'drafted' -> 'sent'    (mark-sent endpoint, manual)
 */

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
  draft_web_link: string | null;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const hasDelegated = await isDelegatedConnected();
  if (!isGraphConfigured() && !hasDelegated) {
    return NextResponse.json(
      { error: 'Microsoft 365 not connected. Click "Connect Microsoft 365" in /admin.' },
      { status: 503 },
    );
  }

  const rows = (await sql`
    SELECT id, url, business_name, email, status, audit_score, audit_summary, audit_data, unsub_token, draft_web_link
    FROM prospects WHERE id = ${id} LIMIT 1
  `) as ProspectRow[];
  if (rows.length === 0) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const p = rows[0];

  if (!p.email) return NextResponse.json({ error: 'No email on file' }, { status: 400 });
  if (p.status === 'unsubscribed') return NextResponse.json({ error: 'Prospect has unsubscribed' }, { status: 409 });
  if (p.status !== 'audited' && p.status !== 'drafted') {
    return NextResponse.json({ error: `Cannot draft from status ${p.status}` }, { status: 409 });
  }
  if (!p.audit_data?.issues?.length) return NextResponse.json({ error: 'Audit has no issues' }, { status: 400 });
  if (!p.unsub_token) return NextResponse.json({ error: 'Missing unsub token' }, { status: 500 });

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
    const draft = await createDraftAuto({
      to: p.email,
      subject,
      html,
      pdf: { filename: `audit-${domain}.pdf`, base64: pdfBuffer.toString('base64') },
    });

    await sql`
      UPDATE prospects
      SET status = 'drafted',
          graph_message_id = ${draft.messageId},
          graph_conversation_id = ${draft.conversationId},
          draft_web_link = ${draft.webLink},
          draft_created_at = NOW(),
          drafted_subject = ${subject},
          drafted_body_html = ${html},
          updated_at = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({
      ok: true,
      mode: draft.mode,
      messageId: draft.messageId,
      conversationId: draft.conversationId,
      webLink: draft.webLink,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'draft failed';
    console.error('[admin/draft] failed', { id, msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

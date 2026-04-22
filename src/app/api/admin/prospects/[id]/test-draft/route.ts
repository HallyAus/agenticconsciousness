import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { renderAuditPdf } from '@/lib/pdf';
import { createGraphDraft, isGraphConfigured } from '@/lib/graph';
import { buildTouch1, type OutreachIssue } from '@/lib/outreach';

/**
 * Admin-only: create a TEST draft for a prospect — same email body + PDF,
 * but addressed to an email supplied in the request body (typically one of
 * Daniel's own addresses). Does NOT touch prospect status or create a
 * prospect_sends row. Used to eyeball-test the outreach copy + PDF before
 * actually emailing a prospect.
 *
 * Body: { to: string }
 */

interface ProspectRow {
  id: string;
  url: string;
  business_name: string | null;
  email: string | null;
  audit_score: number | null;
  audit_summary: string | null;
  audit_data: { issues?: OutreachIssue[] } | null;
  unsub_token: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isGraphConfigured()) {
    return NextResponse.json(
      { error: 'Microsoft 365 not configured. Set M365_* env vars.' },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const to = String(body.to ?? '').trim().toLowerCase();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Valid `to` email required.' }, { status: 400 });
  }

  const rows = (await sql`
    SELECT id, url, business_name, email, audit_score, audit_summary, audit_data, unsub_token
    FROM prospects WHERE id = ${id} LIMIT 1
  `) as ProspectRow[];
  if (rows.length === 0) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const p = rows[0];

  if (p.audit_score === null) return NextResponse.json({ error: 'No audit yet.' }, { status: 400 });
  if (!p.audit_data?.issues?.length) return NextResponse.json({ error: 'Audit has no issues' }, { status: 400 });
  if (!p.unsub_token) return NextResponse.json({ error: 'Missing unsub token' }, { status: 500 });

  const siteBaseUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';
  const domain = new URL(p.url).hostname.replace(/^www\./, '');

  const ctx = {
    url: p.url,
    domain,
    businessName: p.business_name,
    score: p.audit_score,
    summary: p.audit_summary ?? '',
    issues: p.audit_data.issues,
    unsubToken: p.unsub_token,
    sourceLine: `[TEST DRAFT] Would have been sent to ${p.email ?? '(unknown)'} because they are publicly listed on ${domain}.`,
    siteBaseUrl,
  };

  const built = buildTouch1(ctx);
  const subject = `[TEST] ${built.subject}`;

  const pdfBuffer = await renderAuditPdf({
    url: p.url,
    businessName: p.business_name,
    score: p.audit_score,
    summary: p.audit_summary ?? '',
    issues: p.audit_data.issues,
    date: new Date().toISOString().slice(0, 10),
  });

  try {
    const draft = await createGraphDraft({
      to,
      subject,
      html: built.html,
      pdf: { filename: `audit-${domain}.pdf`, base64: pdfBuffer.toString('base64') },
    });
    return NextResponse.json({
      ok: true,
      messageId: draft.messageId,
      webLink: draft.webLink,
      sentTo: to,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'draft failed';
    console.error('[admin/test-draft] failed', { id, msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

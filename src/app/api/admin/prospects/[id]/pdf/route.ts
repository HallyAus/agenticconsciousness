import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { renderAuditPdf } from '@/lib/pdf';
import type { OutreachIssue } from '@/lib/outreach';

/** Returns the audit as a downloadable PDF for preview in admin. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rows = (await sql`
    SELECT url, business_name, audit_score, audit_summary, audit_data
    FROM prospects WHERE id = ${id} LIMIT 1
  `) as Array<{
    url: string;
    business_name: string | null;
    audit_score: number | null;
    audit_summary: string | null;
    audit_data: { issues?: OutreachIssue[] } | null;
  }>;
  if (rows.length === 0) return new NextResponse('Not found', { status: 404 });
  const p = rows[0];
  if (!p.audit_data?.issues?.length) return new NextResponse('Audit not ready', { status: 409 });

  const buf = await renderAuditPdf({
    url: p.url,
    businessName: p.business_name,
    score: p.audit_score ?? 0,
    summary: p.audit_summary ?? '',
    issues: p.audit_data.issues,
    date: new Date().toISOString().slice(0, 10),
  });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="audit-${new URL(p.url).hostname.replace(/^www\./, '')}.pdf"`,
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

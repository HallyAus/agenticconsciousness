import { NextResponse } from 'next/server';
import { sql } from '@/lib/pg';

export async function GET() {
  const rows = await sql`
    SELECT
      p.id, p.url, p.business_name, p.email, p.email_confidence,
      p.phone, p.address, p.postcode, p.discovered_via,
      p.status, p.audit_score, p.audit_summary, p.touch_count,
      p.last_outbound_at, p.next_touch_due_at, p.reply_detected_at,
      p.draft_web_link, p.draft_created_at,
      p.created_at, p.updated_at,
      COALESCE(s.opens_count, 0)  AS opens_count,
      COALESCE(s.clicks_count, 0) AS clicks_count,
      s.last_opened_at,
      s.last_clicked_at
    FROM prospects p
    LEFT JOIN LATERAL (
      SELECT opens_count, clicks_count, last_opened_at, last_clicked_at
      FROM prospect_sends
      WHERE prospect_id = p.id
      ORDER BY sent_at DESC NULLS LAST, id DESC
      LIMIT 1
    ) s ON true
    ORDER BY p.updated_at DESC
    LIMIT 200
  ` as Array<Record<string, unknown>>;
  return NextResponse.json({ prospects: rows });
}

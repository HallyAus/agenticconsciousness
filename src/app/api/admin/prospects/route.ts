import { NextResponse } from 'next/server';
import { sql } from '@/lib/pg';

export async function GET() {
  const rows = await sql`
    SELECT id, url, business_name, email, email_confidence, status,
           audit_score, audit_summary, touch_count, last_outbound_at,
           next_touch_due_at, reply_detected_at, created_at, updated_at
    FROM prospects
    ORDER BY updated_at DESC
    LIMIT 200
  ` as Array<Record<string, unknown>>;
  return NextResponse.json({ prospects: rows });
}

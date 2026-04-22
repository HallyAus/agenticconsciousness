import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rows = await sql`
    SELECT id, url, business_name, email, email_confidence, status,
           audit_score, audit_summary, audit_data, touch_count,
           last_outbound_at, next_touch_due_at, reply_detected_at,
           unsub_token, notes, created_at, updated_at
    FROM prospects WHERE id = ${id} LIMIT 1
  ` as Array<Record<string, unknown>>;
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ prospect: rows[0] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;
  const notes = typeof body.notes === 'string' ? body.notes : undefined;
  const status = typeof body.status === 'string' ? body.status : undefined;
  const scheduledSendAt = typeof body.scheduled_send_at === 'string' ? body.scheduled_send_at : undefined;

  if (email !== undefined) {
    await sql`UPDATE prospects SET email = ${email}, email_confidence = 'manual', updated_at = NOW() WHERE id = ${id}`;
  }
  if (notes !== undefined) {
    await sql`UPDATE prospects SET notes = ${notes}, updated_at = NOW() WHERE id = ${id}`;
  }
  if (status !== undefined) {
    await sql`UPDATE prospects SET status = ${status}, updated_at = NOW() WHERE id = ${id}`;
  }
  if (scheduledSendAt !== undefined) {
    const ts = scheduledSendAt === null || scheduledSendAt === '' ? null : scheduledSendAt;
    await sql`
      UPDATE prospects
      SET scheduled_send_at = ${ts},
          scheduled_send_source = 'admin_manual',
          updated_at = NOW()
      WHERE id = ${id}
    `;
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await sql`DELETE FROM prospects WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

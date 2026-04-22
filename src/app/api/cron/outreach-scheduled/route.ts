import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { getStoredAuth } from '@/lib/graph-delegated';

/**
 * Cron: process scheduled drafts whose time has come.
 *
 * When the admin schedules a draft (via the "Schedule" button), we set
 * prospects.scheduled_send_at to the target time + status to 'audited'
 * (we don't auto-draft immediately). This cron every 30 min finds rows
 * whose scheduled_send_at <= NOW() and POSTs the draft endpoint to
 * create the Outlook draft on their behalf.
 *
 * The actual draft creation goes through the normal POST /send route
 * which picks A/B variant, injects tracking, etc. We just invoke it
 * server-to-server.
 */

interface Row {
  id: string;
  scheduled_send_at: string;
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
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

  const rows = (await sql`
    SELECT id, scheduled_send_at
    FROM prospects
    WHERE scheduled_send_at IS NOT NULL
      AND scheduled_send_at <= NOW()
      AND status = 'audited'
    ORDER BY scheduled_send_at ASC
    LIMIT 20
  `) as Row[];

  const siteBaseUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';
  const basicAuth = Buffer.from(`${process.env.ADMIN_USERNAME}:${process.env.ADMIN_PASSWORD}`).toString('base64');

  let drafted = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const p of rows) {
    try {
      const res = await fetch(`${siteBaseUrl}/api/admin/prospects/${p.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        errors.push({ id: p.id, error: `${res.status} ${text.slice(0, 200)}` });
        continue;
      }
      await sql`UPDATE prospects SET scheduled_send_at = NULL WHERE id = ${p.id}`;
      drafted++;
    } catch (err) {
      errors.push({ id: p.id, error: err instanceof Error ? err.message : 'unknown' });
    }
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    processed: rows.length,
    drafted,
    errors,
  });
}

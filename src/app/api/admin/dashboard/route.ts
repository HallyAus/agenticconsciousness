import { NextResponse } from 'next/server';
import { sql } from '@/lib/pg';

/**
 * Aggregate metrics for the outreach dashboard. One round-trip DB query
 * with multiple SELECTs unioned via CTE, kept simple enough to evolve.
 */

interface StatusCount { status: string; count: number }
interface DailyRow { day: string; sent: number; opens: number; clicks: number }
interface VariantRow { label: string | null; sends: number; opens: number; clicks: number; open_rate: number; click_rate: number }

export async function GET() {
  const totals = (await sql`
    SELECT
      (SELECT count(*) FROM prospects)::int AS prospects_total,
      (SELECT count(*) FROM prospect_sends)::int AS sends_total,
      (SELECT count(*) FROM prospect_sends WHERE opens_count > 0)::int AS sends_opened,
      (SELECT count(*) FROM prospect_sends WHERE clicks_count > 0)::int AS sends_clicked,
      (SELECT count(*) FROM prospects WHERE status = 'replied')::int AS replied_count,
      (SELECT count(*) FROM prospects WHERE status = 'purchased')::int AS purchased_count,
      (SELECT count(*) FROM prospects WHERE status = 'unsubscribed')::int AS unsubscribed_count,
      (SELECT count(*) FROM prospects WHERE status = 'drafted')::int AS drafted_count,
      (SELECT count(*) FROM prospects WHERE status = 'audited')::int AS audited_count,
      (SELECT count(*) FROM prospects WHERE status = 'auditing')::int AS auditing_count,
      (SELECT count(*) FROM suppression_list)::int AS suppressed_total
  `) as Array<{
    prospects_total: number; sends_total: number; sends_opened: number; sends_clicked: number;
    replied_count: number; purchased_count: number; unsubscribed_count: number;
    drafted_count: number; audited_count: number; auditing_count: number;
    suppressed_total: number;
  }>;

  const byStatus = (await sql`
    SELECT status, count(*)::int AS count
    FROM prospects
    GROUP BY status
    ORDER BY count DESC
  `) as StatusCount[];

  const daily = (await sql`
    SELECT
      to_char(date_trunc('day', sent_at) AT TIME ZONE 'Australia/Sydney', 'YYYY-MM-DD') AS day,
      count(*)::int AS sent,
      sum(CASE WHEN opens_count > 0 THEN 1 ELSE 0 END)::int AS opens,
      sum(CASE WHEN clicks_count > 0 THEN 1 ELSE 0 END)::int AS clicks
    FROM prospect_sends
    WHERE sent_at >= NOW() - INTERVAL '30 days'
      AND sent_at IS NOT NULL
    GROUP BY 1
    ORDER BY 1 DESC
  `) as DailyRow[];

  const variants = (await sql`
    SELECT
      COALESCE(subject_variant_label, '(no variant)') AS label,
      count(*)::int AS sends,
      sum(CASE WHEN opens_count > 0 THEN 1 ELSE 0 END)::int AS opens,
      sum(CASE WHEN clicks_count > 0 THEN 1 ELSE 0 END)::int AS clicks,
      CASE WHEN count(*) > 0 THEN round(100.0 * sum(CASE WHEN opens_count > 0 THEN 1 ELSE 0 END) / count(*), 1) ELSE 0 END::float AS open_rate,
      CASE WHEN count(*) > 0 THEN round(100.0 * sum(CASE WHEN clicks_count > 0 THEN 1 ELSE 0 END) / count(*), 1) ELSE 0 END::float AS click_rate
    FROM prospect_sends
    GROUP BY 1
    ORDER BY sends DESC
  `) as VariantRow[];

  const t = totals[0];
  const rate = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

  return NextResponse.json({
    totals: {
      prospects_total: t.prospects_total,
      sends_total: t.sends_total,
      open_rate_pct: rate(t.sends_opened, t.sends_total),
      click_rate_pct: rate(t.sends_clicked, t.sends_total),
      reply_rate_pct: rate(t.replied_count, t.sends_total),
      conversion_pct: rate(t.purchased_count, t.sends_total),
      replied_count: t.replied_count,
      purchased_count: t.purchased_count,
      unsubscribed_count: t.unsubscribed_count,
      drafted_count: t.drafted_count,
      audited_count: t.audited_count,
      auditing_count: t.auditing_count,
      suppressed_total: t.suppressed_total,
    },
    byStatus,
    daily,
    variants,
    generatedAt: new Date().toISOString(),
  });
}

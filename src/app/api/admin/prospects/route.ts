import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';

/**
 * Prospect priority score, computed in SQL so the list can sort by it.
 * Formula (higher = more worth emailing):
 *   Base 50
 *   + ( (100 - audit_score) / 2 )   cap 40   // weaker sites = better targets
 *   + 15 if email_confidence = 'mailto'       // reliable contact
 *   + 10 if email_confidence = 'text_same_domain'
 *   +  5 if audit_score IS NOT NULL           // we've done the audit
 *   - 20 if status = 'drafted'                 // already mid-flight
 *   - 40 if status IN ('sent', 'followed_up_1', 'followed_up_2') // already touched
 *   - 99 if status IN ('unsubscribed', 'purchased', 'replied')   // don't email
 * Clamped 0..100.
 */
export async function GET(req: NextRequest) {
  const sort = req.nextUrl.searchParams.get('sort') ?? 'priority';
  const sortByUpdated = sort === 'updated';

  // Neon's tagged-template sql doesn't support nested sql-fragment
  // interpolation for ORDER BY. Use a CASE inside ORDER BY with a param
  // so one query handles both sort modes.
  const rows = await sql`
    SELECT
      p.id, p.url, p.business_name, p.email, p.email_confidence,
      p.phone, p.address, p.postcode, p.discovered_via,
      p.status, p.audit_score, p.audit_summary, p.touch_count,
      p.last_outbound_at, p.next_touch_due_at, p.reply_detected_at,
      p.draft_web_link, p.draft_created_at,
      p.scheduled_send_at,
      p.created_at, p.updated_at,
      COALESCE(s.opens_count, 0)  AS opens_count,
      COALESCE(s.clicks_count, 0) AS clicks_count,
      s.last_opened_at,
      s.last_clicked_at,
      GREATEST(0, LEAST(100,
        50
        + COALESCE(LEAST(40, (100 - p.audit_score) / 2), 0)
        + CASE
            WHEN p.email_confidence = 'mailto' THEN 15
            WHEN p.email_confidence = 'text_same_domain' THEN 10
            ELSE 0
          END
        + CASE WHEN p.audit_score IS NOT NULL THEN 5 ELSE 0 END
        - CASE
            WHEN p.status = 'drafted' THEN 20
            WHEN p.status IN ('sent','followed_up_1','followed_up_2') THEN 40
            WHEN p.status IN ('unsubscribed','purchased','replied','bounced') THEN 99
            ELSE 0
          END
      ))::int AS priority_score
    FROM prospects p
    LEFT JOIN LATERAL (
      SELECT opens_count, clicks_count, last_opened_at, last_clicked_at
      FROM prospect_sends
      WHERE prospect_id = p.id
      ORDER BY sent_at DESC NULLS LAST, id DESC
      LIMIT 1
    ) s ON true
    ORDER BY
      CASE WHEN ${sortByUpdated} THEN 0 ELSE
        GREATEST(0, LEAST(100,
          50
          + COALESCE(LEAST(40, (100 - p.audit_score) / 2), 0)
          + CASE
              WHEN p.email_confidence = 'mailto' THEN 15
              WHEN p.email_confidence = 'text_same_domain' THEN 10
              ELSE 0
            END
          + CASE WHEN p.audit_score IS NOT NULL THEN 5 ELSE 0 END
          - CASE
              WHEN p.status = 'drafted' THEN 20
              WHEN p.status IN ('sent','followed_up_1','followed_up_2') THEN 40
              WHEN p.status IN ('unsubscribed','purchased','replied','bounced') THEN 99
              ELSE 0
            END
        ))
      END DESC,
      p.updated_at DESC
    LIMIT 200
  ` as Array<Record<string, unknown>>;
  return NextResponse.json({ prospects: rows });
}

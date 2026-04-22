import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { sql } from '@/lib/pg';
import { runStructuredAudit } from '@/lib/audit-core';
import { extractEmailFromHtml } from '@/lib/email-scrape';

/**
 * Admin-only: re-run the audit against an existing prospect's URL.
 * Preserves everything except audit fields. Status flips to 'auditing'
 * immediately; UI polls for completion. Safe to call repeatedly.
 */

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const rows = (await sql`
    SELECT id, url FROM prospects WHERE id = ${id} LIMIT 1
  `) as Array<{ id: string; url: string }>;
  if (rows.length === 0) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const p = rows[0];

  await sql`
    UPDATE prospects
    SET status = 'auditing', updated_at = NOW()
    WHERE id = ${id}
  `;

  after(() => runAndStore(id, p.url));

  return NextResponse.json({ id, status: 'auditing' });
}

async function runAndStore(prospectId: string, url: string): Promise<void> {
  const start = Date.now();
  try {
    const result = await runStructuredAudit(url);
    if (!result.ok) {
      const status = result.reason === 'waf' ? 'waf_blocked' : 'audit_failed';
      await sql`
        UPDATE prospects
        SET status = ${status},
            audit_data = ${JSON.stringify({ reason: result.reason, pageResults: result.pageResults })}::jsonb,
            updated_at = NOW()
        WHERE id = ${prospectId}
      `;
      return;
    }
    const hit = extractEmailFromHtml(result.rawHtmlByUrl, new URL(url).hostname);
    await sql`
      UPDATE prospects
      SET status = 'audited',
          email = COALESCE(email, ${hit?.email ?? null}),
          email_confidence = COALESCE(email_confidence, ${hit?.confidence ?? null}),
          audit_score = ${result.score},
          audit_summary = ${result.summary},
          audit_data = ${JSON.stringify({
            summary: result.summary,
            score: result.score,
            issues: result.issues,
            pageResults: result.pageResults,
            pagesFetched: result.pagesFetched,
            tookMs: Date.now() - start,
          })}::jsonb,
          updated_at = NOW()
      WHERE id = ${prospectId}
    `;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await sql`
      UPDATE prospects
      SET status = 'audit_failed',
          audit_data = ${JSON.stringify({ error: msg })}::jsonb,
          updated_at = NOW()
      WHERE id = ${prospectId}
    `.catch(() => {});
  }
}

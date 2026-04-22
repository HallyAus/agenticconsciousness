import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';

/**
 * One-step undo: swap mockup_html with mockup_html_previous so the
 * last good generation becomes live again (and the current one is
 * retained as the new "previous" in case the user changes their mind).
 *
 * POST /api/admin/prospects/[id]/mockup-restore
 * No body required.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const rows = (await sql`
    SELECT mockup_html, mockup_html_previous
    FROM prospects WHERE id = ${id} LIMIT 1
  `) as Array<{ mockup_html: string | null; mockup_html_previous: string | null }>;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  }
  const { mockup_html: current, mockup_html_previous: previous } = rows[0];
  if (!previous) {
    return NextResponse.json({ error: 'No previous mockup to restore' }, { status: 409 });
  }

  await sql`
    UPDATE prospects
    SET mockup_html = ${previous},
        mockup_html_previous = ${current},
        mockup_generated_at = NOW(),
        updated_at = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({ id, restored: true });
}

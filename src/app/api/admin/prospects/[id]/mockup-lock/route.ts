import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';

/**
 * Toggle prospects.mockup_locked. When locked, audit-enrich skips
 * mockup regeneration entirely on reaudit — protects a good mockup
 * from being overwritten by a subsequent audit run.
 *
 * POST /api/admin/prospects/[id]/mockup-lock
 *   Body: { locked: boolean }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { locked?: unknown };
  const locked = body.locked === true;

  const rows = (await sql`
    UPDATE prospects
    SET mockup_locked = ${locked},
        mockup_locked_at = ${locked ? new Date().toISOString() : null},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, mockup_locked, mockup_locked_at
  `) as Array<{ id: string; mockup_locked: boolean; mockup_locked_at: string | null }>;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: rows[0].id,
    locked: rows[0].mockup_locked,
    lockedAt: rows[0].mockup_locked_at,
  });
}

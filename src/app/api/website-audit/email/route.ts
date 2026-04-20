import { NextResponse } from 'next/server';

// Deprecated 2026-04-20. Consolidated into /api/website-audit which now
// handles the full fire-and-forget flow: accepts URL + email, acks
// immediately, runs the Claude audit via after() and emails the result.
export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint was retired. POST /api/website-audit instead.' },
    { status: 410 },
  );
}

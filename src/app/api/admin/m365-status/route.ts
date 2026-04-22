import { NextResponse } from 'next/server';
import { getStoredAuth } from '@/lib/graph-delegated';

/**
 * Exposes whether a delegated M365 session is in place, so the admin UI
 * can render a "Connect" button vs. a "Connected as ..." badge.
 */

export async function GET() {
  const auth = await getStoredAuth();
  if (!auth) return NextResponse.json({ connected: false });

  const expMs = auth.access_token_expires_at
    ? new Date(auth.access_token_expires_at).getTime()
    : 0;
  const expiresInSec = Math.max(0, Math.floor((expMs - Date.now()) / 1000));

  return NextResponse.json({
    connected: true,
    userEmail: auth.user_email,
    accessTokenExpiresInSec: expiresInSec,
    scope: auth.scope,
  });
}

export async function DELETE() {
  // Disconnect by clearing the token row.
  const { sql } = await import('@/lib/pg');
  await sql`DELETE FROM m365_auth WHERE id = 1`;
  return NextResponse.json({ ok: true });
}

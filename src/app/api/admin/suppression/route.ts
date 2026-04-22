import { NextRequest, NextResponse } from 'next/server';
import { addSuppression, listSuppressions, removeSuppression } from '@/lib/suppression';

export async function GET() {
  return NextResponse.json({ suppressions: await listSuppressions() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const reason = String(body.reason ?? '').trim() || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }
  await addSuppression(email, 'manual_admin', reason ?? undefined);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') ?? '';
  if (!email) return NextResponse.json({ error: 'email param required' }, { status: 400 });
  await removeSuppression(email);
  return NextResponse.json({ ok: true });
}

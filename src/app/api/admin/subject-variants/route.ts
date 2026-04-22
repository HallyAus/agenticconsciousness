import { NextRequest, NextResponse } from 'next/server';
import { createVariant, deleteVariant, listVariants, toggleVariant } from '@/lib/subject-variants';

export async function GET() {
  return NextResponse.json({ variants: await listVariants() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const label = String(body.label ?? '').trim().slice(0, 60);
  const template = String(body.template ?? '').trim().slice(0, 200);
  if (!label || !template) {
    return NextResponse.json({ error: 'label + template required' }, { status: 400 });
  }
  const v = await createVariant(label, template);
  return NextResponse.json({ variant: v });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? '');
  const active = Boolean(body.active);
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await toggleVariant(id, active);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await deleteVariant(id);
  return NextResponse.json({ ok: true });
}

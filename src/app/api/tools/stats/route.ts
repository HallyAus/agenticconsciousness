import { NextResponse } from 'next/server';
import { getToolStats } from '@/lib/toolStats';

export async function GET() {
  return NextResponse.json(getToolStats());
}

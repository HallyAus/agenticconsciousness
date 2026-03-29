import { NextRequest, NextResponse } from 'next/server';
import { getToolUsageState } from '@/lib/toolAccess';

export async function GET(req: NextRequest) {
  try {
    const state = getToolUsageState(req);
    return NextResponse.json(state);
  } catch (error) {
    console.error('Tool usage check error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ tier: 'anonymous', remainingUses: 3, totalUsesToday: 0, maxUses: 3 });
  }
}

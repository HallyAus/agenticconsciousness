import { NextRequest, NextResponse } from 'next/server';
import { getUsageStatus } from '@/lib/toolAccess';

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  const siteUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';
  if (origin && !origin.startsWith(siteUrl) && !origin.startsWith('http://localhost')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const status = getUsageStatus(req);
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[tool-usage] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

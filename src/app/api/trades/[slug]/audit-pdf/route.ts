import { NextRequest, NextResponse } from 'next/server';
import { TRADE_MAP } from '@/data/trades';
import { CITY_MAP } from '@/data/trade-cities';
import { renderTradeAuditPdf } from '@/lib/trade-pdf';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const trade = TRADE_MAP[slug];
  if (!trade) return NextResponse.json({ error: 'Unknown trade' }, { status: 404 });

  const citySlug = req.nextUrl.searchParams.get('city');
  const city = citySlug ? CITY_MAP[citySlug] : undefined;

  const date = new Date().toISOString().slice(0, 10);
  const pdf = await renderTradeAuditPdf({ trade, city, date });

  const filename = city
    ? `${trade.slug}-${city.slug}-website-audit.pdf`
    : `${trade.slug}-website-audit.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}

import Link from 'next/link';
import type { Trade } from '@/data/trades';
import type { TradeCity } from '@/data/trade-cities';

interface TradeBreadcrumbProps {
  trade?: Trade;
  city?: TradeCity;
}

export default function TradeBreadcrumb({ trade, city }: TradeBreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="sticky top-[60px] z-[500] mt-[60px] bg-[var(--bg-nav)] backdrop-blur-[12px] border-b border-border-subtle"
    >
      <div className="max-w-[1400px] mx-auto px-10 max-md:px-5 max-sm:px-4 h-[44px] flex items-center gap-2 font-mono text-[0.68rem] tracking-[1.5px] uppercase overflow-x-auto whitespace-nowrap">
        <Link href="/" className="text-text-dim hover:text-ac-red transition-colors duration-150">
          Home
        </Link>
        <span className="text-text-dim opacity-40">/</span>
        {trade || city ? (
          <Link href="/trades" className="text-text-dim hover:text-ac-red transition-colors duration-150">
            Trades
          </Link>
        ) : (
          <span className="text-ac-red font-bold">Trades</span>
        )}

        {trade ? (
          <>
            <span className="text-text-dim opacity-40">/</span>
            {city ? (
              <Link
                href={`/trades/${trade.slug}`}
                className="text-text-dim hover:text-ac-red transition-colors duration-150"
              >
                {trade.plural}
              </Link>
            ) : (
              <span className="text-ac-red font-bold">{trade.plural}</span>
            )}
          </>
        ) : null}

        {city ? (
          <>
            <span className="text-text-dim opacity-40">/</span>
            <span className="text-ac-red font-bold">{city.name}</span>
          </>
        ) : null}

        <span className="flex-1" />

        {/* Right-side exit shortcut — always visible */}
        <Link
          href="/trades"
          className="hidden sm:inline-block text-text-dim hover:text-ac-red border-l border-border-subtle pl-3 transition-colors duration-150"
        >
          All trades &rarr;
        </Link>
      </div>
    </nav>
  );
}

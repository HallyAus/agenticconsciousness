import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { TRADES } from '@/data/trades';
import { TRADE_CITIES } from '@/data/trade-cities';

export const metadata: Metadata = {
  title: '$999 Trade Websites — Live in 7 Days',
  description:
    'Fixed-price $999 websites built for electricians, plumbers, roofers, solar installers, landscapers and every other Australian trade. Live in 7 days. Copy and Google Business setup included.',
  alternates: { canonical: 'https://agenticconsciousness.com.au/trades' },
  openGraph: {
    title: '$999 Trade Websites — Live in 7 Days',
    description:
      'Fixed-price websites for every Australian trade. Electricians, plumbers, roofers, solar, landscapers, and 25 more. $999 flat. Live in 7 days.',
    url: 'https://agenticconsciousness.com.au/trades',
    type: 'website',
    images: [
      { url: 'https://agenticconsciousness.com.au/opengraph-image', width: 1200, height: 630 },
    ],
  },
};

export default function TradesHub() {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://agenticconsciousness.com.au' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Trade Websites',
        item: 'https://agenticconsciousness.com.au/trades',
      },
    ],
  };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '$999 Trade Websites — Australia',
    url: 'https://agenticconsciousness.com.au/trades',
    isPartOf: { '@id': 'https://agenticconsciousness.com.au/#website' },
    itemListElement: TRADES.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://agenticconsciousness.com.au/trades/${t.slug}`,
      name: `${t.plural} Website — $999`,
    })),
  };

  return (
    <>
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />

      <main id="main-content" className="pt-[60px]">
        <section className="px-10 max-md:px-5 max-sm:px-4 pt-20 pb-16 max-md:pt-16">
          <div className="max-w-[1200px] mx-auto">
            <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red mb-5">
              $999 Websites &middot; Built for Australian Trades
            </div>
            <h1 className="font-display font-black leading-[0.92] tracking-brutal mb-7 text-[clamp(2.4rem,7vw,5rem)] text-text-primary">
              <span className="block">Every trade.</span>
              <span className="block text-ac-red">Every capital.</span>
              <span className="block">$999. Live in 7 days.</span>
            </h1>
            <p className="text-text-dim text-[clamp(1rem,1.5vw,1.2rem)] font-light leading-[1.7] max-w-[780px] mb-8">
              Fixed-price websites that stop treating tradies like a generic template category. Each one is engineered around the specific conversion modules your trade actually needs — emergency callout banners for plumbers, STC calculators for solar, insurance pathways for roofers, subscription flows for gardeners and bin cleaners. Pick your trade to see the specifics.
            </p>

            <div className="flex gap-[2px] flex-wrap mb-4">
              <Link
                href="/book"
                className="inline-block font-display text-[0.9rem] font-black tracking-[2px] uppercase py-4 px-8 no-underline bg-ac-red text-white hover:bg-white hover:text-[#0a0a0a] transition-colors duration-200"
              >
                Book the sprint &rarr;
              </Link>
              <a
                href="#all-trades"
                className="inline-block font-display text-[0.9rem] font-black tracking-[2px] uppercase py-4 px-8 no-underline bg-transparent border-2 border-ac-red text-text-primary hover:bg-ac-red hover:text-white transition-colors duration-200"
              >
                Pick your trade &darr;
              </a>
            </div>
          </div>
        </section>

        <section id="all-trades" className="px-10 max-md:px-5 max-sm:px-4 py-16">
          <div className="max-w-[1400px] mx-auto">
            <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red mb-4">
              {TRADES.length} trades &middot; {TRADE_CITIES.length} cities &middot; {TRADES.length * TRADE_CITIES.length} optimised pages
            </div>
            <h2 className="font-display font-black text-[clamp(1.8rem,4vw,3rem)] leading-[1] mb-10 text-text-primary">
              Pick your trade.
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[2px]">
              {TRADES.map((t) => (
                <Link
                  key={t.slug}
                  href={`/trades/${t.slug}`}
                  className="bg-ac-card border border-border-subtle p-6 hover:border-ac-red transition-colors duration-200 group"
                >
                  <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-ac-red mb-2 group-hover:text-ac-red">
                    $999 website
                  </div>
                  <div className="font-display font-black text-[1.15rem] text-text-primary leading-tight mb-2">
                    {t.plural}
                  </div>
                  <div className="font-mono text-[0.7rem] tracking-[1.5px] uppercase text-text-dim">
                    Live in 7 days
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="px-10 max-md:px-5 max-sm:px-4 py-16 bg-ac-card border-t-2 border-b-2 border-ac-red">
          <div className="max-w-[1200px] mx-auto">
            <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red mb-4">
              By city
            </div>
            <h2 className="font-display font-black text-[clamp(1.6rem,3.5vw,2.6rem)] leading-[1] mb-8 text-text-primary">
              Every major capital. Local schema, local suburbs, local wording.
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[2px]">
              {TRADE_CITIES.map((c) => (
                <div
                  key={c.slug}
                  className="bg-ac-bg border border-border-subtle p-5"
                >
                  <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-ac-red mb-2">{c.state}</div>
                  <div className="font-display font-black text-[1.1rem] text-text-primary leading-tight">{c.name}</div>
                  <div className="font-mono text-[0.65rem] tracking-[1.5px] uppercase text-text-dim mt-2">{c.population}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

import Link from 'next/link';
import type { Trade } from '@/data/trades';
import type { TradeCity } from '@/data/trade-cities';
import { TRADE_MAP } from '@/data/trades';
import { TRADE_CITIES } from '@/data/trade-cities';
import TradeLeadMagnet from '@/components/TradeLeadMagnet';

interface TradeLandingProps {
  trade: Trade;
  city?: TradeCity; // optional — renders a trade-only or trade × city page
}

const INCLUDES = [
  '5-page site — home, services, about, contact, and one bespoke conversion page',
  'Mobile-first build — Lighthouse 95+, Core Web Vitals tuned, tap-to-call everywhere',
  'Google Business Profile setup and verification (if not already done)',
  'Schema markup: LocalBusiness, Service, FAQPage, BreadcrumbList — all structured',
  'Contact form wired to email + SMS — after-hours routing included',
  '12 months of managed hosting on Vercel + CDN + daily backups',
  '1 round of revisions — everything handed over, yours forever',
];

const PROCESS = [
  {
    num: '01',
    title: 'Brief — Day 1',
    body: 'A 30-minute discovery call. You bring your licence numbers, preferred phone and email, and any photos you have. Daniel writes the brief back to you within the hour.',
  },
  {
    num: '02',
    title: 'Build — Days 2-5',
    body: 'Design, copy, schema, and the trade-specific conversion modules ship in parallel. You see a live preview URL by end of day 3, with rolling updates.',
  },
  {
    num: '03',
    title: 'Launch — Day 7',
    body: 'DNS, Google verification, and final review on day 6. Live and indexed by day 7. Post-launch check-in at the 2-week mark. Then it\'s yours.',
  },
];

export default function TradeLanding({ trade, city }: TradeLandingProps) {
  const locationLabel = city ? city.displayName : 'Australia-wide';
  const heroCityLine = city
    ? `${trade.plural} in ${city.name}, ${city.state}`
    : `${trade.plural} — ${locationLabel}`;

  return (
    <main id="main-content" className="pt-[60px]">
      {/* HERO */}
      <section className="relative px-10 max-md:px-5 max-sm:px-4 pt-20 pb-16 max-md:pt-16 max-md:pb-12">
        <div className="max-w-[1200px] mx-auto">
          <div className="font-mono text-[0.75rem] max-sm:text-xs tracking-[3px] uppercase text-ac-red mb-5">
            {heroCityLine}
          </div>

          <h1 className="font-display font-black leading-[0.92] tracking-brutal mb-7 text-[clamp(2.4rem,6.5vw,4.8rem)] text-text-primary">
            {city ? (
              <>
                <span className="block">{trade.heroTitle.replace('$999 ', '$999 ')}</span>
                <span className="block text-ac-red">in {city.name}.</span>
              </>
            ) : (
              <>
                <span className="block">{trade.heroTitle}</span>
                <span className="block text-ac-red">Live in 7 days.</span>
              </>
            )}
          </h1>

          <p className="text-text-dim text-[clamp(1rem,1.5vw,1.2rem)] font-light leading-[1.7] max-w-[720px] mb-8">
            {trade.heroSub}
          </p>

          <div className="flex flex-wrap gap-[2px] mb-10">
            <a
              href="#lead-magnet"
              className="inline-block font-display text-[0.9rem] font-black tracking-[2px] uppercase py-4 px-8 no-underline bg-ac-red text-white hover:bg-white hover:text-[#0a0a0a] transition-colors duration-200"
            >
              Get your free {trade.name.toLowerCase()} audit &rarr;
            </a>
            <Link
              href="/book"
              className="inline-block font-display text-[0.9rem] font-black tracking-[2px] uppercase py-4 px-8 no-underline bg-transparent border-2 border-ac-red text-text-primary hover:bg-ac-red hover:text-white transition-colors duration-200"
            >
              Book the sprint &rarr;
            </Link>
          </div>

          <div className="flex gap-[2px] flex-wrap">
            {[
              { k: '$999', l: 'Flat fee' },
              { k: '7 days', l: 'To live' },
              { k: '21+', l: 'Years trade' },
              { k: city ? city.name : 'AU', l: 'Serving' },
            ].map((c) => (
              <div key={c.l} className="flex-1 min-w-[140px] bg-ac-card border border-border-subtle py-4 px-4 text-center">
                <div className="text-[1.5rem] font-black text-ac-red leading-none">{c.k}</div>
                <div className="font-mono text-[0.7rem] text-text-dim tracking-[2px] uppercase mt-2">{c.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="px-10 max-md:px-5 max-sm:px-4 py-16">
        <div className="max-w-[820px] mx-auto">
          <p className="text-text-primary text-[1.05rem] leading-[1.7] font-light">{trade.intro}</p>
        </div>
      </section>

      {/* CITY-SPECIFIC BLOCK (only on /trades/[slug]/[city]) */}
      {city ? (
        <section className="px-10 max-md:px-5 max-sm:px-4 py-16 bg-ac-card border-t-2 border-b-2 border-ac-red">
          <div className="max-w-[1000px] mx-auto">
            <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red mb-4">
              The {city.name} market
            </div>
            <h2 className="font-display font-black text-[clamp(1.8rem,4vw,2.8rem)] leading-[1] mb-6 text-text-primary">
              Built for {city.name}, not templated from {city.state === 'NSW' ? 'Melbourne' : 'Sydney'}.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[2px]">
              <div className="bg-ac-bg border border-border-subtle p-6">
                <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-ac-red mb-3">Market</div>
                <p className="text-text-primary text-[0.95rem] leading-[1.7] font-light">{city.intro}</p>
              </div>
              <div className="bg-ac-bg border border-border-subtle p-6">
                <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-ac-red mb-3">Search</div>
                <p className="text-text-primary text-[0.95rem] leading-[1.7] font-light">{city.localSeoAngle}</p>
              </div>
              <div className="bg-ac-bg border border-border-subtle p-6 md:col-span-2">
                <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-ac-red mb-3">
                  Ranking angle for {city.name} {trade.plural.toLowerCase()}
                </div>
                <p className="text-text-primary text-[0.95rem] leading-[1.7] font-light">{city.marketSignal}</p>
              </div>
            </div>
            <div className="mt-6 font-mono text-[0.75rem] tracking-[2px] uppercase text-text-dim">
              {city.regulatorNote} &middot; Serving: {city.serviceAreaNote}
            </div>
          </div>
        </section>
      ) : null}

      {/* PAIN POINTS */}
      <section className="px-10 max-md:px-5 max-sm:px-4 py-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red mb-4">
            What&apos;s broken with most {trade.name.toLowerCase()} websites
          </div>
          <h2 className="font-display font-black text-[clamp(1.8rem,4vw,3rem)] leading-[1] mb-10 text-text-primary max-w-[900px]">
            Three leaks that cost you jobs every week.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px]">
            {trade.pains.map((p, i) => (
              <div key={i} className="bg-ac-card border border-border-subtle border-t-2 border-t-ac-red p-7">
                <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-ac-red mb-3">
                  LEAK 0{i + 1}
                </div>
                <h3 className="font-display font-black text-[1.3rem] mb-3 text-text-primary leading-tight">{p.title}</h3>
                <p className="text-text-dim text-[0.95rem] leading-[1.65] font-light">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="px-10 max-md:px-5 max-sm:px-4 py-20 bg-ac-card">
        <div className="max-w-[1000px] mx-auto">
          <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red mb-4">
            What you get for $999
          </div>
          <h2 className="font-display font-black text-[clamp(1.8rem,4vw,3rem)] leading-[1] mb-10 text-text-primary">
            Everything. No upsells, no surprise invoices.
          </h2>
          <ul className="space-y-3">
            {INCLUDES.map((item, i) => (
              <li key={i} className="flex items-start gap-4 p-4 border border-border-subtle bg-ac-bg">
                <span className="font-mono text-[0.8rem] text-ac-red font-bold flex-shrink-0 w-8">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-text-primary text-[0.98rem] leading-[1.55] font-light">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* TRADE-SPECIFIC MODULES */}
      <section className="px-10 max-md:px-5 max-sm:px-4 py-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red mb-4">
            Built for {trade.plural.toLowerCase()}, specifically
          </div>
          <h2 className="font-display font-black text-[clamp(1.8rem,4vw,3rem)] leading-[1] mb-10 text-text-primary max-w-[900px]">
            Three conversion modules a generic template will never give you.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px]">
            {trade.modules.map((m, i) => (
              <div key={i} className="bg-ac-card border border-border-subtle p-7">
                <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-ac-red mb-3">
                  MODULE 0{i + 1}
                </div>
                <h3 className="font-display font-black text-[1.3rem] mb-3 text-text-primary leading-tight">{m.title}</h3>
                <p className="text-text-dim text-[0.95rem] leading-[1.65] font-light">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="px-10 max-md:px-5 max-sm:px-4 py-20 bg-ac-card">
        <div className="max-w-[1100px] mx-auto">
          <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red mb-4">The 7-day process</div>
          <h2 className="font-display font-black text-[clamp(1.8rem,4vw,3rem)] leading-[1] mb-10 text-text-primary">
            Brief on Monday. Live by next Monday.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px]">
            {PROCESS.map((p) => (
              <div key={p.num} className="bg-ac-bg border border-border-subtle p-7">
                <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-ac-red mb-3">{p.num}</div>
                <h3 className="font-display font-black text-[1.2rem] mb-3 text-text-primary">{p.title}</h3>
                <p className="text-text-dim text-[0.9rem] leading-[1.65] font-light">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEAD MAGNET */}
      <section id="lead-magnet" className="px-10 max-md:px-5 max-sm:px-4 py-20 border-t-2 border-b-2 border-ac-red bg-ac-bg">
        <div className="max-w-[900px] mx-auto">
          <TradeLeadMagnet trade={trade} city={city} />
        </div>
      </section>

      {/* FAQ */}
      <section className="px-10 max-md:px-5 max-sm:px-4 py-20">
        <div className="max-w-[900px] mx-auto">
          <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red mb-4">
            {trade.name} website FAQ
          </div>
          <h2 className="font-display font-black text-[clamp(1.8rem,4vw,3rem)] leading-[1] mb-10 text-text-primary">
            Questions we get every week.
          </h2>
          <div className="space-y-[2px]">
            {trade.faqs.map((f, i) => (
              <details key={i} className="group bg-ac-card border border-border-subtle">
                <summary className="cursor-pointer p-5 font-display font-bold text-[1.05rem] text-text-primary flex items-start justify-between gap-4 list-none">
                  <span>{f.q}</span>
                  <span className="text-ac-red font-mono text-[1.2rem] group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <div className="px-5 pb-5 pt-0 text-text-dim text-[0.95rem] leading-[1.7] font-light">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* RELATED TRADES */}
      <section className="px-10 max-md:px-5 max-sm:px-4 py-20 bg-ac-card">
        <div className="max-w-[1200px] mx-auto">
          <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red mb-4">Other trades we build for</div>
          <h2 className="font-display font-black text-[clamp(1.6rem,3.5vw,2.6rem)] leading-[1] mb-8 text-text-primary">
            Adjacent trades, same $999 sprint.
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[2px]">
            {trade.relatedSlugs.map((slug) => {
              const related = TRADE_MAP[slug];
              if (!related) return null;
              const href = city ? `/trades/${slug}/${city.slug}` : `/trades/${slug}`;
              return (
                <Link
                  key={slug}
                  href={href}
                  className="bg-ac-bg border border-border-subtle p-5 hover:border-ac-red transition-colors duration-200"
                >
                  <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-ac-red mb-2">Also built</div>
                  <div className="font-display font-black text-[1.1rem] text-text-primary leading-tight">{related.plural}</div>
                  {city ? (
                    <div className="font-mono text-[0.7rem] tracking-[1.5px] uppercase text-text-dim mt-1">{city.name}</div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CITY ROW (only on trade-only page) */}
      {!city ? (
        <section className="px-10 max-md:px-5 max-sm:px-4 py-16">
          <div className="max-w-[1200px] mx-auto">
            <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red mb-4">
              {trade.plural} website — by city
            </div>
            <h2 className="font-display font-black text-[clamp(1.6rem,3.5vw,2.4rem)] leading-[1] mb-8 text-text-primary">
              Pick your city — we tune the site for your local market.
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[2px]">
              {TRADE_CITIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/trades/${trade.slug}/${c.slug}`}
                  className="bg-ac-card border border-border-subtle p-5 hover:border-ac-red transition-colors duration-200"
                >
                  <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-ac-red mb-2">{c.state}</div>
                  <div className="font-display font-black text-[1.05rem] text-text-primary leading-tight">{trade.plural}</div>
                  <div className="font-mono text-[0.7rem] tracking-[1.5px] uppercase text-text-dim mt-1">in {c.name}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* TOP-SUBURBS + OTHER CITIES (only on city page) */}
      {city ? (
        <section className="px-10 max-md:px-5 max-sm:px-4 py-16">
          <div className="max-w-[1200px] mx-auto">
            <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red mb-4">
              Covering {city.name}
            </div>
            <h2 className="font-display font-black text-[clamp(1.6rem,3.5vw,2.4rem)] leading-[1] mb-8 text-text-primary">
              Serving {city.topSuburbs.slice(0, 3).join(', ')}, and every suburb in between.
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-[2px] mb-10">
              {city.topSuburbs.map((s) => (
                <div key={s} className="bg-ac-card border border-border-subtle p-4">
                  <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-ac-red mb-1">Suburb</div>
                  <div className="font-display font-bold text-[1rem] text-text-primary">{s}</div>
                </div>
              ))}
            </div>

            <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red mb-4">
              {trade.plural} — other cities
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[2px]">
              {TRADE_CITIES.filter((c) => c.slug !== city.slug).slice(0, 4).map((c) => (
                <Link
                  key={c.slug}
                  href={`/trades/${trade.slug}/${c.slug}`}
                  className="bg-ac-card border border-border-subtle p-4 hover:border-ac-red transition-colors duration-200"
                >
                  <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-ac-red mb-1">{c.state}</div>
                  <div className="font-display font-bold text-[0.95rem] text-text-primary">
                    {trade.plural} {c.name}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* FINAL CTA */}
      <section className="px-10 max-md:px-5 max-sm:px-4 py-24 border-t-2 border-ac-red">
        <div className="max-w-[900px] mx-auto text-center">
          <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red mb-4">Three slots this month</div>
          <h2 className="font-display font-black text-[clamp(2rem,5vw,3.6rem)] leading-[0.95] mb-6 text-text-primary">
            Your new {city ? `${city.name} ` : ''}{trade.name.toLowerCase()} website.
            <br />
            <span className="text-ac-red">Live in 7 days. $999.</span>
          </h2>
          <p className="text-text-dim text-[1.05rem] leading-[1.7] font-light mb-8 max-w-[620px] mx-auto">
            Book the sprint or grab the free audit first. Either way, you&apos;ll know within one phone call whether this is the right fit — no follow-up pressure, no agency overhead.
          </p>
          <div className="flex flex-wrap gap-[2px] justify-center">
            <Link
              href="/book"
              className="inline-block font-display text-[0.95rem] font-black tracking-[2px] uppercase py-4 px-10 no-underline bg-ac-red text-white hover:bg-white hover:text-[#0a0a0a] transition-colors duration-200"
            >
              Book the sprint &rarr;
            </Link>
            <a
              href="#lead-magnet"
              className="inline-block font-display text-[0.95rem] font-black tracking-[2px] uppercase py-4 px-10 no-underline bg-transparent border-2 border-ac-red text-text-primary hover:bg-ac-red hover:text-white transition-colors duration-200"
            >
              Free audit first
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

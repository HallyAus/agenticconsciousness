import type { Metadata } from 'next';
import ExtrasCart from '@/components/ExtrasCart';

export const metadata: Metadata = {
  title: 'Book the Website Sprint — $999, Shipped in 48 Hours',
  description: 'Book the Lightning Website Sprint: mobile-first, AI-optimised 3-page website live in 48 hours or your money back. Add integrations — Stripe, CMS, booking, analytics — at flat-rate extras pricing. Live GST total at checkout.',
  alternates: { canonical: 'https://agenticconsciousness.com.au/book' },
  openGraph: {
    title: 'Book the Website Sprint',
    description: 'Mobile-first, AI-optimised 3-page website live in 48 hours or your money back. $999 + any extras you need.',
    url: 'https://agenticconsciousness.com.au/book',
    type: 'website',
    images: [{ url: 'https://agenticconsciousness.com.au/opengraph-image', width: 1200, height: 630 }],
  },
};

const OFFER_ENDS = '04 May 2026';

const INCLUDES = [
  'Custom-designed 3-page website built to your brand',
  'Mobile-first. Lighthouse 95+ across every device class',
  'Core Web Vitals tuned &mdash; LCP under 2.5s, INP under 200ms, CLS near zero',
  'WCAG 2.1 AA accessibility baked in from first paint',
  'SEO-ready: schema markup, sitemap, llms.txt, OG images',
  'Claude-powered AI chatbot embedded and trained on your content',
  'Deployed to Vercel + Cloudflare. Yours to keep forever',
  'Copywriting included &mdash; no &ldquo;send us your 2,000 words&rdquo; homework',
];

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://agenticconsciousness.com.au' },
    { '@type': 'ListItem', position: 2, name: 'Book', item: 'https://agenticconsciousness.com.au/book' },
  ],
};

const offerSchema = {
  '@context': 'https://schema.org',
  '@type': 'Offer',
  name: 'Lightning Website Sprint',
  description: 'Mobile-first, AI-optimised 3-page website live in 48 hours or your money back.',
  price: '999',
  priceCurrency: 'AUD',
  priceValidUntil: '2026-05-04',
  availability: 'https://schema.org/LimitedAvailability',
  url: 'https://agenticconsciousness.com.au/book',
  seller: { '@type': 'Organization', name: 'Agentic Consciousness' },
};

export default function BookPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerSchema) }}
      />

      <main id="main-content" className="min-h-screen">

      {/* Hero pitch (no CTAs — cart is the CTA) */}
      <section className="pt-[96px] pb-10 px-10 max-md:px-5 max-sm:px-4">
        <div className="max-w-[1200px] mx-auto">
          <div
            className="relative p-10 max-md:p-7 max-sm:p-5"
            style={{
              border: '2px solid var(--red)',
              background: 'var(--bg-card)',
            }}
          >
            {/* Top ribbon */}
            <div
              className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-[6px] font-mono text-[0.7rem] max-sm:text-[0.6rem] tracking-[2.5px] uppercase text-white gap-3"
              style={{ background: 'var(--red)' }}
            >
              <span>Limited offer &middot; 14 days only</span>
              <span>Ends {OFFER_ENDS}</span>
            </div>

            {/* Ghost watermark */}
            <div
              className="absolute right-6 top-[55%] -translate-y-1/2 text-[clamp(8rem,18vw,14rem)] font-black leading-none pointer-events-none select-none max-md:hidden"
              style={{ color: 'var(--ghost-watermark)' }}
              aria-hidden="true"
            >
              999
            </div>

            <div className="relative z-10 pt-6">
              <div className="font-mono text-[0.75rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
                Website Sprint &middot; Book now
              </div>

              <h1 className="text-[clamp(2.2rem,5.5vw,3.8rem)] font-black tracking-tight leading-[0.95] text-text-primary mb-4">
                Your whole website.
                <br />
                <span style={{ color: 'var(--red-text)' }}>Shipped in 48 hours.</span>
              </h1>

              <p className="text-text-dim text-[clamp(0.95rem,1.4vw,1.1rem)] font-light leading-[1.7] max-w-[680px] mb-4">
                Mobile-first, AI-optimised, accessibility-baked, SEO-ready, Claude chatbot embedded.
                Designed, written, coded, and deployed by Daniel personally. Add only the integrations
                you need from the list below &mdash; everything totals live with GST at the bottom.
              </p>

              {/* Guarantee strip */}
              <div
                className="inline-flex items-center gap-3 py-2 px-3 mb-8 font-mono text-[0.78rem] max-sm:text-xs tracking-[2px] uppercase"
                style={{ background: 'var(--red)', color: '#fff' }}
              >
                <span aria-hidden="true">&#9632;</span>
                <span>Live in 48 hours from signed brief. Or your money back. 100%.</span>
              </div>

              <div className="grid grid-cols-[auto_1fr] gap-8 items-start max-md:grid-cols-1 max-md:gap-6">
                <div>
                  <div className="font-mono text-[0.7rem] tracking-[2px] uppercase mb-1" style={{ color: 'var(--red-text)' }}>
                    Base price
                  </div>
                  <div className="flex items-baseline gap-3">
                    <div className="text-[clamp(3.5rem,9vw,6rem)] font-black leading-none" style={{ color: 'var(--red-text)' }}>
                      $999
                    </div>
                    <div className="font-mono text-[0.9rem] tracking-[1px] text-text-dim">
                      + GST
                    </div>
                  </div>
                  <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-text-dim line-through mt-2">
                    Usually from $2,500
                  </div>
                  <div className="font-mono text-[0.7rem] tracking-[2px] uppercase mt-2" style={{ color: 'var(--red-text)' }}>
                    Integrations billed separately &mdash; see list below
                  </div>
                </div>

                <ul className="grid grid-cols-2 gap-x-6 gap-y-2 max-sm:grid-cols-1">
                  {INCLUDES.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-[0.85rem] text-text-body font-light leading-[1.55]"
                    >
                      <span aria-hidden="true" style={{ color: 'var(--red-text)' }}>&#9632;</span>
                      <span dangerouslySetInnerHTML={{ __html: item }} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive cart */}
      <ExtrasCart />

      </main>
    </>
  );
}

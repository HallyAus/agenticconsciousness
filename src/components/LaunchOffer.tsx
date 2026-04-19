import ScrollReveal from '@/components/ScrollReveal';
import CheckoutButton from '@/components/CheckoutButton';

const OFFER_ENDS = '04 May 2026';

const INCLUDES = [
  'Custom-designed 5-page website built to your brand',
  'Mobile-first. Lighthouse 95+ across every device class',
  'Core Web Vitals tuned \u2014 LCP under 2.5s, INP under 200ms, CLS near zero',
  'WCAG 2.1 AA accessibility baked in from first paint',
  'SEO-ready: schema markup, sitemap, llms.txt, OG images',
  'Claude-powered AI chatbot embedded and trained on your content',
  'Stripe or payment gateway integration if you need it',
  'Deployed to Vercel + Cloudflare. Yours to keep forever',
  'Copywriting included \u2014 no \u201csend us your 2,000 words\u201d homework',
  '14-day delivery from signed brief, or your deposit back',
];

export default function LaunchOffer() {
  return (
    <section
      id="launch-offer"
      aria-label="Limited-time website sprint offer"
      className="px-10 max-md:px-5 max-sm:px-4 py-16 max-sm:py-12"
    >
      <ScrollReveal>
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
              className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-[6px] font-mono text-[0.7rem] max-sm:text-[0.6rem] tracking-[2.5px] uppercase text-white"
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
                NEW &middot; Website Sprint
              </div>

              <h2 className="text-[clamp(2.2rem,5.5vw,3.8rem)] font-black tracking-tight leading-[0.95] text-text-primary mb-4">
                Your whole website.
                <br />
                <span style={{ color: 'var(--red-text)' }}>Shipped in 14 days.</span>
              </h2>

              <p className="text-text-dim text-[clamp(0.95rem,1.4vw,1.1rem)] font-light leading-[1.7] max-w-[640px] mb-8">
                Mobile-first, AI-optimised, accessibility-baked, SEO-ready, Claude chatbot embedded.
                Designed, written, coded, and deployed by Daniel personally. No agency markup, no junior
                designers, no &ldquo;scope creep&rdquo; conversation in week 3. Two weeks from brief to live.
              </p>

              <div className="grid grid-cols-[auto_1fr] gap-8 items-start max-md:grid-cols-1 max-md:gap-6 mb-8">
                <div>
                  <div className="font-mono text-[0.7rem] tracking-[2px] uppercase mb-1" style={{ color: 'var(--red-text)' }}>
                    Launch price
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
                </div>

                <ul className="grid grid-cols-2 gap-x-6 gap-y-2 max-sm:grid-cols-1">
                  {INCLUDES.map((item) => (
                    <li key={item} className="flex gap-2 text-[0.85rem] text-text-body font-light leading-[1.55]">
                      <span aria-hidden="true" style={{ color: 'var(--red-text)' }}>&#9632;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-6 flex-wrap">
                <CheckoutButton
                  packageId="website-sprint"
                  className="inline-block font-display text-[0.85rem] max-sm:text-xs font-black tracking-[2px] uppercase py-4 px-10 text-white border-none cursor-pointer transition-colors duration-200 disabled:opacity-40"
                  style={{ background: 'var(--red)' }}
                >
                  Pay $999 now &rarr;
                </CheckoutButton>
                <a
                  href="#contact"
                  className="font-display text-[0.85rem] max-sm:text-xs font-black tracking-[2px] uppercase py-4 px-8 no-underline transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ac-red"
                  style={{ border: '2px solid var(--red)', color: 'var(--red-text)' }}
                >
                  Ask first &rarr;
                </a>
                <div className="font-mono text-[0.72rem] tracking-[2px] uppercase text-text-dim leading-[1.5]">
                  Pay in full &middot; Fixed scope &middot; Same-week start
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

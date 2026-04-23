import type { Metadata } from 'next';
import Link from 'next/link';
import CheckoutButton from '@/components/CheckoutButton';

export const metadata: Metadata = {
  title: 'Google Business Profile Tune-up — $295, 3-Day Turnaround',
  description: 'Get your Google Business Profile fully optimised in 3 days. 30-50 photos, services rewritten with keyword-rich descriptions, 4 weeks of posts pre-scheduled, review response templates, hours/attributes/areas-served dialled, schema markup. $295 + GST. One-time, no subscription. Australia-wide.',
  alternates: { canonical: 'https://agenticconsciousness.com.au/gbp' },
  openGraph: {
    title: 'Google Business Profile Tune-up',
    description: 'Your full GBP rebuilt in 3 days. $295 + GST. One-time.',
    url: 'https://agenticconsciousness.com.au/gbp',
    type: 'website',
    images: [{ url: 'https://agenticconsciousness.com.au/opengraph-image', width: 1200, height: 630 }],
  },
};

const INCLUDES = [
  'Up to 50 photos selected, optimised, and uploaded',
  'Every service rewritten with keyword-rich, compliant descriptions',
  '4 weeks of GBP posts scheduled (offers, updates, FAQs)',
  '5 review-response templates personalised to your business',
  'Hours, attributes, and service areas fully dialled',
  'GBP categories tuned for the searches you want to win',
  'Q&amp;A section seeded with your top 5 customer questions',
  'LocalBusiness schema added to your website (if you have one)',
];

const HOW = [
  { step: '01', title: 'Pay $295', detail: 'Stripe checkout. Tax invoice emailed.' },
  { step: '02', title: 'You add us as manager', detail: 'One click in GBP. We send the invite link in our welcome email.' },
  { step: '03', title: 'We work for 3 days', detail: 'Daily progress emails. You approve photos before they go live.' },
  { step: '04', title: 'Done', detail: 'Manager access removed. You own everything. Track call volume from the day after delivery.' },
];

const FAQ = [
  {
    q: 'Will this actually get me more leads?',
    a: 'For most service-based tradies, yes. Reviews and GBP visibility drive 60-80% of local enquiries. Optimising the profile typically lifts call volume within 14 days. If it does not move the needle in 30 days, full refund.',
  },
  {
    q: 'Do I need a website for this?',
    a: 'No. The GBP Tune-up works whether or not you have a website. If you do, we add LocalBusiness schema so your GBP and site reinforce each other.',
  },
  {
    q: 'What if I want a new website too?',
    a: 'Our Lightning Website Sprint is $999 for a full 3-page site shipped in 48 hours. Most tradies start with the GBP Tune-up, see the call lift, then book the Sprint. Your GBP work doubles as the site brief.',
  },
  {
    q: 'Are you on the Central Coast?',
    a: 'Yes — Ourimbah-based, Australia-wide. Daniel does the work personally.',
  },
];

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://agenticconsciousness.com.au' },
    { '@type': 'ListItem', position: 2, name: 'GBP Tune-up', item: 'https://agenticconsciousness.com.au/gbp' },
  ],
};

const offerSchema = {
  '@context': 'https://schema.org',
  '@type': 'Offer',
  name: 'Google Business Profile Tune-up',
  description: 'Full Google Business Profile optimisation including photos, services, posts, review templates, schema. 3-day turnaround.',
  price: '295',
  priceCurrency: 'AUD',
  availability: 'https://schema.org/InStock',
  url: 'https://agenticconsciousness.com.au/gbp',
  seller: { '@type': 'Organization', name: 'Agentic Consciousness' },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function GbpPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offerSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <main id="main-content" className="min-h-screen">

        {/* Hero */}
        <section className="pt-[96px] pb-10 px-10 max-md:px-5 max-sm:px-4">
          <div className="max-w-[1200px] mx-auto">
            <div
              className="relative p-10 max-md:p-7 max-sm:p-5"
              style={{ border: '2px solid var(--red)', background: 'var(--bg-card)' }}
            >
              <div
                className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-[6px] font-mono text-[0.7rem] max-sm:text-[0.6rem] tracking-[2.5px] uppercase text-white gap-3"
                style={{ background: 'var(--red)' }}
              >
                <span>3-day turnaround</span>
                <span>$295 + GST &middot; one-time</span>
              </div>

              <div className="relative z-10 pt-6">
                <div className="font-mono text-[0.75rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
                  GBP Tune-up &middot; For service businesses
                </div>

                <h1 className="text-[clamp(2.2rem,5.5vw,3.8rem)] font-black tracking-tight leading-[0.95] text-text-primary mb-4">
                  Your Google Business Profile,
                  <br />
                  <span style={{ color: 'var(--red-text)' }}>fully tuned in 3 days.</span>
                </h1>

                <p className="text-text-dim text-[clamp(0.95rem,1.4vw,1.1rem)] font-light leading-[1.7] max-w-[680px] mb-6">
                  60 to 80 percent of local tradie enquiries start at Google Business. If your profile is
                  thin, half-filled, or you have not posted in months, you are losing those calls to whoever
                  did the work. We rebuild yours properly. One payment. No subscription. No website needed.
                </p>

                <div
                  className="inline-flex items-center gap-3 py-2 px-3 mb-8 font-mono text-[0.78rem] max-sm:text-xs tracking-[2px] uppercase"
                  style={{ background: 'var(--red)', color: '#fff' }}
                >
                  <span aria-hidden="true">&#9632;</span>
                  <span>30-day call-volume guarantee. If it does not move, full refund.</span>
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-8 items-start max-md:grid-cols-1 max-md:gap-6">
                  <div>
                    <div className="font-mono text-[0.7rem] tracking-[2px] uppercase mb-1" style={{ color: 'var(--red-text)' }}>
                      One-time price
                    </div>
                    <div className="flex items-baseline gap-3">
                      <div className="text-[clamp(3.5rem,9vw,6rem)] font-black leading-none" style={{ color: 'var(--red-text)' }}>
                        $295
                      </div>
                      <div className="font-mono text-[0.9rem] tracking-[1px] text-text-dim">
                        + GST
                      </div>
                    </div>
                    <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-text-dim mt-2">
                      No subscription &middot; You keep everything
                    </div>

                    <div className="mt-6">
                      <CheckoutButton
                        packageId="gbp-tuneup"
                        className="block text-center font-display text-[0.85rem] font-black tracking-[2px] uppercase py-4 px-8 transition-colors duration-200 cursor-pointer border-none text-white disabled:opacity-40"
                        style={{ background: 'var(--red)' }}
                      >
                        Pay $295 &amp; start &rarr;
                      </CheckoutButton>
                      <p className="font-mono text-[0.62rem] tracking-[1px] uppercase text-text-dim mt-2 leading-[1.4]">
                        Stripe checkout &middot; tax invoice emailed
                      </p>
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

        {/* How it works */}
        <section className="py-20 px-10 max-md:px-5 max-sm:px-4 max-sm:py-14">
          <div className="max-w-[1200px] mx-auto">
            <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
              How it works
            </div>
            <h2 className="text-[clamp(1.8rem,4.5vw,2.8rem)] font-black tracking-tight text-text-primary mb-10">
              Four steps. Three days. No homework.
            </h2>
            <div className="grid grid-cols-4 gap-[2px] max-md:grid-cols-2 max-sm:grid-cols-1" style={{ background: 'var(--bg-gap)' }}>
              {HOW.map((item) => (
                <div
                  key={item.step}
                  className="p-6 max-sm:p-5"
                  style={{ background: 'var(--bg-card)', borderTop: '3px solid var(--red)' }}
                >
                  <div className="font-mono text-[0.7rem] tracking-[2px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
                    {item.step}
                  </div>
                  <h3 className="text-[1rem] font-black text-text-primary tracking-snug mb-2 leading-[1.2]">
                    {item.title}
                  </h3>
                  <p className="text-[0.82rem] text-text-dim font-light leading-[1.55]">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-10 max-md:px-5 max-sm:px-4 max-sm:py-14">
          <div className="max-w-[1000px] mx-auto">
            <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
              Common questions
            </div>
            <h2 className="text-[clamp(1.8rem,4.5vw,2.8rem)] font-black tracking-tight text-text-primary mb-10">
              The straight answers.
            </h2>
            <div className="flex flex-col gap-[2px]" style={{ background: 'var(--bg-gap)' }}>
              {FAQ.map((f) => (
                <details
                  key={f.q}
                  className="p-6 max-sm:p-5 group"
                  style={{ background: 'var(--bg-card)', borderLeft: '3px solid var(--red)' }}
                >
                  <summary className="cursor-pointer list-none flex justify-between items-center gap-4 font-black text-[1rem] text-text-primary tracking-snug">
                    {f.q}
                    <span aria-hidden="true" className="font-mono text-[1.2rem] text-ac-red transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-4 text-[0.9rem] text-text-dim font-light leading-[1.7]">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-20 px-10 max-md:px-5 max-sm:px-4 max-sm:py-14">
          <div className="max-w-[800px] mx-auto text-center">
            <h2 className="text-[clamp(1.6rem,4vw,2.4rem)] font-black tracking-tight text-text-primary mb-4">
              Ready to stop losing calls to your competitors?
            </h2>
            <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] mb-8 max-w-[560px] mx-auto">
              Pay now. Add us as manager. Three days later, your profile is live and your phone starts moving.
            </p>
            <CheckoutButton
              packageId="gbp-tuneup"
              className="inline-block font-display text-[0.95rem] font-black tracking-[2px] uppercase py-[1.1rem] px-10 text-white border-none cursor-pointer transition-colors duration-200 hover:opacity-90"
              style={{ background: 'var(--red)' }}
            >
              Pay $295 &amp; start &rarr;
            </CheckoutButton>
            <div className="mt-6">
              <Link
                href="/book"
                className="font-mono text-[0.78rem] tracking-[2px] uppercase text-text-dim no-underline hover:text-ac-red transition-colors duration-200"
              >
                Or get a full website ($999) &rarr;
              </Link>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}

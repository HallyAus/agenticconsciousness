import type { Metadata } from 'next';
import PricingCards from '@/components/PricingCards';


import EmailLink from '@/components/EmailLink';

export const metadata: Metadata = {
  title: 'Pricing — AI Consulting Packages',
  description: 'Transparent AI consulting pricing. Claude Workshop $300, Claude Code Setup $450, AI Audit $500, Automation Sprint $1,500, full engagements from $3,000.',
  alternates: { canonical: 'https://agenticconsciousness.com.au/pricing' },
  openGraph: {
    title: 'AI Consulting Pricing',
    description: 'Claude Workshop $300, Claude Code Setup $450, AI Audit $500, Custom Claude Project $750, Automation Sprint $1,500, full engagements from $3,000.',
    url: 'https://agenticconsciousness.com.au/pricing',
    type: 'website',
    images: [{ url: 'https://agenticconsciousness.com.au/opengraph-image', width: 1200, height: 630 }],
  },
};

const processSteps = [
  {
    num: '01',
    title: 'Free discovery call',
    body: '30 minutes direct with Daniel. We pressure-test the problem, rule out the wrong fits, and give you an honest read on whether AI will actually help. No slide deck, no junior AM.',
    meta: 'No cost, no commitment',
  },
  {
    num: '02',
    title: 'Written proposal',
    body: 'Fixed scope, fixed price, clear deliverables. One or two pages, plain language. You have it in your inbox within 48 hours of the call. Walk away or book it — no follow-up pressure.',
    meta: 'Within 48 hours',
  },
  {
    num: '03',
    title: 'Delivery and handover',
    body: 'Daniel does the work personally. You get weekly updates, a recorded handover, written docs, and a post-delivery support window. Tools and outputs are yours to keep.',
    meta: '90 min to 8 weeks',
  },
];

const trustPoints = [
  {
    label: 'Invoicing',
    body: 'Tax invoices with GST and ABN for every engagement. Issued immediately on payment. Registered AU business.',
  },
  {
    label: 'Payment methods',
    body: 'Card via Stripe by default. EFT, purchase order, or split-pay on request for engagements over $1,000. No surcharges.',
  },
  {
    label: 'NDA and IP',
    body: 'Happy to sign your NDA before the discovery call. You own all deliverables — code, prompts, docs, configs. No lock-in licensing.',
  },
  {
    label: 'Guarantee',
    body: 'If the free discovery call does not give you something useful to walk away with, it costs you nothing — because it already did.',
  },
  {
    label: 'Rescheduling',
    body: 'Reschedule workshops or calls up to 48 hours ahead, no charge. Inside 48 hours we will move it once, then the session is billed.',
  },
  {
    label: 'Team seats',
    body: 'Workshops include up to 4 attendees. Sessions are recorded, so the rest of the team can watch later. Larger rooms by arrangement.',
  },
];

const pricingFaq = [
  {
    q: 'Are prices including GST?',
    a: 'No — all prices are in AUD and exclude GST. GST is added at checkout and shown separately on your tax invoice, so you can claim it back.',
  },
  {
    q: 'What if my needs sit between two tiers?',
    a: 'That is what the free discovery call is for. Most engagements need minor scope tweaks — we will write a custom proposal that matches your brief, not one of the boxed tiers.',
  },
  {
    q: 'Can I pay by EFT, bank transfer, or PO?',
    a: 'Yes, for any engagement over $1,000. Email ai@agenticconsciousness.com.au and we will send an invoice with payment details. Quick-start offers under $1,000 are card-only to keep them same-week.',
  },
  {
    q: 'Will you sign an NDA?',
    a: 'Yes. Send yours before the discovery call and we will sign it, or use our standard mutual NDA. Nothing you share stays in our hands beyond what the engagement needs.',
  },
  {
    q: 'Who owns the output — prompts, code, documentation?',
    a: 'You do. Once the engagement is delivered and paid, every artefact is yours with no licensing strings. We keep our own internal methodology; you keep your implementation.',
  },
  {
    q: 'How fast can you start?',
    a: 'Quick-start offers (under $1,500) typically start the same week you book. Full engagements begin inside two weeks of signed proposal. Emergency timelines — add 25% and we will talk.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'The discovery call is free. For paid work, if a workshop or audit genuinely delivers no value, tell us before the closing email — we will refund or rework at our cost. We have never had to.',
  },
  {
    q: 'Can I combine multiple quick-start offers?',
    a: 'Yes, and you often should. The Audit + one Sprint is a common combo. Bundle two or more starters and we will cut 10% off the total — just mention it in the discovery call.',
  },
];

export default function PricingPage() {
  const offerCatalog = {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'AI Consulting Packages',
    description: 'Transparent pricing for AI consulting services by Agentic Consciousness.',
    url: 'https://agenticconsciousness.com.au/pricing',
    provider: {
      '@type': 'Organization',
      '@id': 'https://agenticconsciousness.com.au/#organization',
      name: 'Agentic Consciousness',
    },
    itemListElement: ([
      { name: 'Claude Workshop', price: '300', description: '90-minute 1:1 Claude onboarding — Projects, Artifacts, Computer Use. Includes recording and 14-day follow-up.' },
      { name: 'Claude Code Setup', price: '450', description: 'Install and configure Claude Code with IDE integration, custom slash commands, CLAUDE.md for your repo, 30-day support.' },
      { name: 'AI Stack Audit', price: '500', description: '2-hour workflow review plus written report with prioritised quick wins and a 12-month AI roadmap.' },
      { name: 'Custom Claude Project Build', price: '750', description: 'Bespoke Claude Project with context files, instructions, knowledge base, and prompt evaluation against real tasks.' },
      { name: 'Automation Sprint', price: '1500', description: 'One production-ready automation built end-to-end — n8n, Make, Zapier, or custom API. Deployed and documented.' },
      { name: 'AI Strategy & Workshops', price: '3000', description: 'AI opportunity assessment, half-day workshop, written roadmap, 30-day support, tool recommendations.' },
      { name: 'AI Tool Implementation', price: '5000', description: 'Strategy plus AI tool deployment, system integration, team training for up to 10 people, 60-day support.' },
      { name: 'AI Automation & Agents', price: '10000', description: 'Full implementation plus custom AI pipeline development, autonomous workflow design, API integrations, 90-day support.' },
    ]).map((o) => ({
      '@type': 'Offer',
      name: o.name,
      description: o.description,
      price: o.price,
      priceCurrency: 'AUD',
      priceSpecification: {
        '@type': 'PriceSpecification',
        price: o.price,
        priceCurrency: 'AUD',
        valueAddedTaxIncluded: false,
      },
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'Agentic Consciousness' },
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://agenticconsciousness.com.au',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Pricing',
        item: 'https://agenticconsciousness.com.au/pricing',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerCatalog) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <main className="pt-[60px] min-h-screen">
        <section className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20">
          <div className="max-w-[1200px] mx-auto">

            {/* Hero */}
            <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
              PRICING
            </div>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none mb-4 text-text-primary">
              AI consulting pricing.
            </h1>
            <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] max-w-[640px] mb-12">
              Fixed-scope quick-start offers from $300 for targeted outcomes, plus full engagements from $3,000 for scoped projects with ongoing support. No hidden fees. Every full engagement starts with a complimentary discovery call.
            </p>

            {/* ── Pricing cards FIRST — show the prices, then justify ── */}
            <PricingCards />

            {/* ── 3-step process — editorial index, no cards ── */}
            <div className="mt-20 mb-20">
              <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-2" style={{ color: 'var(--red-text)' }}>
                HOW IT WORKS
              </div>
              <h2 className="text-[1.5rem] font-black tracking-tight text-text-primary mb-12">
                Three steps. No fluff.
              </h2>

              <div className="flex flex-col">
                {processSteps.map((step, i) => (
                  <div
                    key={step.num}
                    className={`grid grid-cols-[auto_1fr] gap-x-8 gap-y-4 items-baseline py-10 max-sm:py-8 max-sm:grid-cols-1 max-sm:gap-y-2 ${i > 0 ? 'border-t-2' : ''}`}
                    style={i > 0 ? { borderColor: 'var(--red)' } : undefined}
                  >
                    <div
                      className="font-black leading-[0.85] tracking-tight text-[clamp(4.5rem,12vw,9rem)] max-sm:text-[5rem]"
                      style={{ color: 'var(--ghost-number)' }}
                      aria-hidden="true"
                    >
                      {step.num}
                    </div>
                    <div className="max-w-[640px]">
                      <h3 className="text-[clamp(1.25rem,2.5vw,1.8rem)] font-black text-text-primary tracking-tight leading-[1.1] mb-4">
                        {step.title}
                      </h3>
                      <p className="text-[0.98rem] text-text-dim font-light leading-[1.75] mb-4">
                        {step.body}
                      </p>
                      <div className="font-mono text-[0.72rem] tracking-[2px] uppercase" style={{ color: 'var(--red-text)' }}>
                        {step.meta}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Trust / payment — typographic index, no cards ── */}
            <div className="mb-20">
              <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-2" style={{ color: 'var(--red-text)' }}>
                THE FINE PRINT
              </div>
              <h2 className="text-[1.5rem] font-black tracking-tight text-text-primary mb-10">
                Details most consultancies hide.
              </h2>
              <div className="grid grid-cols-2 gap-x-16 gap-y-10 max-md:grid-cols-1 max-md:gap-y-8">
                {trustPoints.map((t) => (
                  <div
                    key={t.label}
                    className="pl-6 max-sm:pl-5"
                    style={{ borderLeft: '2px solid var(--red)' }}
                  >
                    <div className="font-mono text-[0.72rem] tracking-[2px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
                      {t.label}
                    </div>
                    <p className="text-[0.95rem] text-text-dim font-light leading-[1.75]">
                      {t.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Pricing FAQ ── */}
            <div className="mb-20">
              <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-2" style={{ color: 'var(--red-text)' }}>
                PRICING FAQ
              </div>
              <h2 className="text-[1.5rem] font-black tracking-tight text-text-primary mb-8">
                Questions people actually ask.
              </h2>
              <div className="flex flex-col gap-[2px]" style={{ background: 'var(--bg-gap)' }}>
                {pricingFaq.map((f) => (
                  <details
                    key={f.q}
                    className="group p-6 max-sm:p-5"
                    style={{ background: 'var(--bg-card)' }}
                  >
                    <summary className="flex justify-between items-center gap-6 cursor-pointer list-none">
                      <h3 className="text-[1rem] max-sm:text-[0.95rem] font-black tracking-snug text-text-primary">
                        {f.q}
                      </h3>
                      <span
                        className="font-mono text-[1.2rem] leading-none shrink-0 transition-transform duration-200 group-open:rotate-45"
                        style={{ color: 'var(--red-text)' }}
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </summary>
                    <p className="text-[0.9rem] text-text-dim font-light leading-[1.8] mt-4">
                      {f.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>

            {/* ── Closing ── */}
            <div className="pt-10 border-t border-border-subtle text-center">
              <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] max-w-[560px] mx-auto mb-6">
                All prices in AUD, plus GST. Every engagement includes a complimentary discovery call with Daniel.
              </p>
              <EmailLink
                className="inline-block font-display text-[0.85rem] max-sm:text-xs font-black tracking-[2px] uppercase py-4 px-10 text-white no-underline transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--red)]"
                style={{ background: 'var(--red)' }}
              >
                Book discovery call &rarr;
              </EmailLink>
            </div>

          </div>
        </section>
      </main>
    </>
  );
}

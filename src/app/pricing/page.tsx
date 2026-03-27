import type { Metadata } from 'next';
import PricingCards from '@/components/PricingCards';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import EmailLink from '@/components/EmailLink';

export const metadata: Metadata = {
  title: 'Pricing — AI Consulting Packages',
  description: 'Transparent pricing for AI consulting. Strategy from $3,000, Implementation from $5,000, Automation from $10,000. Free consultation included.',
  alternates: { canonical: 'https://agenticconsciousness.com.au/pricing' },
  openGraph: {
    title: 'AI Consulting Pricing',
    description: 'Transparent pricing for AI consulting. Strategy from $3,000, Implementation from $5,000, Automation from $10,000. Free consultation included.',
    url: 'https://agenticconsciousness.com.au/pricing',
    type: 'website',
    images: [{ url: 'https://agenticconsciousness.com.au/opengraph-image', width: 1200, height: 630 }],
  },
};

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
    itemListElement: [
      {
        '@type': 'Offer',
        name: 'AI Strategy & Workshops',
        description: 'AI opportunity assessment, half-day workshop, written roadmap, 30-day support, tool recommendations.',
        price: '3000',
        priceCurrency: 'AUD',
        priceSpecification: {
          '@type': 'PriceSpecification',
          price: '3000',
          priceCurrency: 'AUD',
          valueAddedTaxIncluded: false,
        },
        availability: 'https://schema.org/InStock',
        seller: {
          '@type': 'Organization',
          name: 'Agentic Consciousness',
        },
      },
      {
        '@type': 'Offer',
        name: 'AI Tool Implementation',
        description: 'Strategy plus AI tool deployment, system integration, team training for up to 10 people, 60-day support.',
        price: '5000',
        priceCurrency: 'AUD',
        priceSpecification: {
          '@type': 'PriceSpecification',
          price: '5000',
          priceCurrency: 'AUD',
          valueAddedTaxIncluded: false,
        },
        availability: 'https://schema.org/InStock',
        seller: {
          '@type': 'Organization',
          name: 'Agentic Consciousness',
        },
      },
      {
        '@type': 'Offer',
        name: 'AI Automation & Agents',
        description: 'Full implementation plus custom AI pipeline development, autonomous workflow design, API integrations, 90-day support.',
        price: '10000',
        priceCurrency: 'AUD',
        priceSpecification: {
          '@type': 'PriceSpecification',
          price: '10000',
          priceCurrency: 'AUD',
          valueAddedTaxIncluded: false,
        },
        availability: 'https://schema.org/InStock',
        seller: {
          '@type': 'Organization',
          name: 'Agentic Consciousness',
        },
      },
    ],
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
      <Nav />
      <main className="pt-[60px] min-h-screen">
        <section className="py-28 px-10 max-md:px-5 max-sm:py-20">
          <div className="max-w-[1200px] mx-auto">
            <div className="font-mono text-[0.7rem] tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
              PRICING
            </div>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none mb-4 text-text-primary">
              AI Consulting pricing.
            </h1>
            <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] max-w-[500px] mb-8">
              Three packages. No hidden fees. Every engagement starts with a complimentary discovery call.
            </p>

            <div className="max-w-[700px] mb-14">
              <h2 className="text-[1.3rem] font-black tracking-tight leading-none mb-4 text-text-primary">
                How it works.
              </h2>
              <p className="text-text-dim text-[0.9rem] font-light leading-[1.8] mb-4">
                Every project begins with a no-obligation intro call — typically 30 minutes over video or phone. Daniel, our founder with 21+ years of industry experience, personally reviews your current workflows, identifies where intelligent automation can deliver the highest impact, and maps out a realistic path forward. No generic slide decks, no junior account managers — just a direct conversation with the person who&apos;ll lead the work.
              </p>
              <p className="text-text-dim text-[0.9rem] font-light leading-[1.8] mb-4">
                We believe in upfront, honest pricing because opaque quotes erode trust. The tiers below reflect real project scopes we&apos;ve delivered for AU businesses — from half-day strategy workshops through to fully autonomous agent pipelines. If your needs sit between tiers, or you&apos;re unsure which fits, that&apos;s exactly what the discovery call is for. We&apos;ll scope it together and you&apos;ll receive a written proposal before any commitment.
              </p>
              <p className="text-text-dim text-[0.9rem] font-light leading-[1.8]">
                Whether you&apos;re a solo operator exploring your first AI tool or an enterprise team ready to deploy agentic workflows at scale, the process is the same: understand the problem, design the solution, build it right. Reach out at{' '}
                <EmailLink className="no-underline hover:underline" style={{ color: 'var(--red-text)' }} />{' '}
                to book your intro session.
              </p>
            </div>

            <PricingCards />

            <p className="text-text-dim text-[0.8rem] font-light text-center mt-10">
              All prices in AUD + GST. Every engagement includes a complimentary discovery call.{' '}
              <EmailLink className="no-underline hover:underline" style={{ color: 'var(--red-text)' }}>
                Need something custom? Let&apos;s talk.
              </EmailLink>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

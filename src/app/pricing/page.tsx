import type { Metadata } from 'next';
import PricingCards from '@/components/PricingCards';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Pricing — AI Consulting Packages',
  description: 'Transparent pricing for AI consulting. Strategy from $3,000, Implementation from $5,000, Automation from $10,000. Free consultation included.',
  alternates: { canonical: 'https://agenticconsciousness.com.au/pricing' },
  openGraph: {
    title: 'AI Consulting Pricing',
    description: 'Transparent pricing for AI consulting. Strategy from $3,000, Implementation from $5,000, Automation from $10,000. Free consultation included.',
    url: 'https://agenticconsciousness.com.au/pricing',
    type: 'website',
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
            <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] max-w-[500px] mb-14">
              Three packages. No hidden fees. Every engagement starts with a free consultation.
            </p>

            <PricingCards />

            <p className="text-text-dim text-[0.8rem] font-light text-center mt-10">
              All prices in AUD + GST. Every engagement starts with a free consultation.{' '}
              <a href="mailto:ai@agenticconsciousness.com.au" className="no-underline hover:underline" style={{ color: 'var(--red-text)' }}>
                Need something custom? Let&apos;s talk.
              </a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

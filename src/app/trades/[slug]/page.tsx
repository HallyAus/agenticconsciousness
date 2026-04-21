import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import TradeLanding from '@/components/TradeLanding';
import { TRADES, TRADE_MAP } from '@/data/trades';

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return TRADES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const trade = TRADE_MAP[slug];
  if (!trade) return {};

  const url = `https://agenticconsciousness.com.au/trades/${trade.slug}`;
  return {
    title: trade.metaTitle,
    description: trade.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: trade.metaTitle,
      description: trade.metaDescription,
      url,
      type: 'website',
      images: [{ url: 'https://agenticconsciousness.com.au/opengraph-image', width: 1200, height: 630 }],
    },
  };
}

export default async function TradePage({ params }: Params) {
  const { slug } = await params;
  const trade = TRADE_MAP[slug];
  if (!trade) notFound();

  const url = `https://agenticconsciousness.com.au/trades/${trade.slug}`;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://agenticconsciousness.com.au' },
      { '@type': 'ListItem', position: 2, name: 'Trade Websites', item: 'https://agenticconsciousness.com.au/trades' },
      { '@type': 'ListItem', position: 3, name: trade.plural, item: url },
    ],
  };

  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${trade.name} Website — $999 Lightning Sprint`,
    description: trade.metaDescription,
    url,
    isPartOf: { '@id': 'https://agenticconsciousness.com.au/#website' },
    provider: { '@id': 'https://agenticconsciousness.com.au/#organization' },
    areaServed: { '@type': 'Country', name: 'Australia' },
    category: `Website for ${trade.plural}`,
    offers: {
      '@type': 'Offer',
      price: '999',
      priceCurrency: 'AUD',
      url,
      availability: 'https://schema.org/InStock',
      priceSpecification: {
        '@type': 'PriceSpecification',
        price: '999',
        priceCurrency: 'AUD',
        valueAddedTaxIncluded: false,
      },
    },
  };

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url,
    isPartOf: { '@id': 'https://agenticconsciousness.com.au/#website' },
    mainEntity: trade.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <>
      <Nav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
      <TradeLanding trade={trade} />
      <Footer />
    </>
  );
}

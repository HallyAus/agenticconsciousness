import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import TradeLanding from '@/components/TradeLanding';
import { TRADES, TRADE_MAP } from '@/data/trades';
import { TRADE_CITIES, CITY_MAP } from '@/data/trade-cities';

interface Params {
  params: Promise<{ slug: string; city: string }>;
}

export async function generateStaticParams() {
  const out: { slug: string; city: string }[] = [];
  for (const t of TRADES) {
    for (const c of TRADE_CITIES) {
      out.push({ slug: t.slug, city: c.slug });
    }
  }
  return out;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, city } = await params;
  const trade = TRADE_MAP[slug];
  const tradeCity = CITY_MAP[city];
  if (!trade || !tradeCity) return {};

  const title = `$999 ${trade.name} Website — ${tradeCity.name}, ${tradeCity.state}`;
  const description = `Fixed-price ${trade.name.toLowerCase()} website for ${tradeCity.name} trades. Local schema, suburb-tagged portfolio, ${tradeCity.regulatorNote.replace('.', '')} compliance. Live in 7 days.`;
  const url = `https://agenticconsciousness.com.au/trades/${trade.slug}/${tradeCity.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: [{ url: 'https://agenticconsciousness.com.au/opengraph-image', width: 1200, height: 630 }],
    },
  };
}

export default async function TradeCityPage({ params }: Params) {
  const { slug, city } = await params;
  const trade = TRADE_MAP[slug];
  const tradeCity = CITY_MAP[city];
  if (!trade || !tradeCity) notFound();

  const url = `https://agenticconsciousness.com.au/trades/${trade.slug}/${tradeCity.slug}`;
  const tradeUrl = `https://agenticconsciousness.com.au/trades/${trade.slug}`;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://agenticconsciousness.com.au' },
      { '@type': 'ListItem', position: 2, name: 'Trade Websites', item: 'https://agenticconsciousness.com.au/trades' },
      { '@type': 'ListItem', position: 3, name: trade.plural, item: tradeUrl },
      { '@type': 'ListItem', position: 4, name: tradeCity.name, item: url },
    ],
  };

  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${trade.name} Website — ${tradeCity.name}, ${tradeCity.state}`,
    description: `Fixed-price ${trade.name.toLowerCase()} website for ${tradeCity.name} trades, built in 7 days for $999. Local schema, suburb-tagged portfolio, regulator-compliant.`,
    url,
    isPartOf: { '@id': 'https://agenticconsciousness.com.au/#website' },
    provider: { '@id': 'https://agenticconsciousness.com.au/#organization' },
    areaServed: {
      '@type': 'City',
      name: tradeCity.name,
      containedInPlace: { '@type': 'AdministrativeArea', name: tradeCity.stateFull },
    },
    category: `Website for ${trade.plural} in ${tradeCity.name}`,
    offers: {
      '@type': 'Offer',
      price: '999',
      priceCurrency: 'AUD',
      url,
      availability: 'https://schema.org/InStock',
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
      <TradeLanding trade={trade} city={tradeCity} />
      <Footer />
    </>
  );
}

import type { Metadata } from 'next';
import ExtrasCart from '@/components/ExtrasCart';

export const metadata: Metadata = {
  title: 'Website Sprint Extras — Build Your Cart',
  description: 'Build a $999 Lightning Website Sprint with optional extras: extra pages, Stripe checkout, booking, CMS, analytics, custom design. Pay in full with GST at checkout.',
  alternates: { canonical: 'https://agenticconsciousness.com.au/extras' },
  openGraph: {
    title: 'Website Sprint Extras',
    description: 'Build a $999 Lightning Website Sprint with optional integrations and extras. Flat-rate, fixed-scope, no subscriptions.',
    url: 'https://agenticconsciousness.com.au/extras',
    type: 'website',
    images: [{ url: 'https://agenticconsciousness.com.au/opengraph-image', width: 1200, height: 630 }],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://agenticconsciousness.com.au' },
    { '@type': 'ListItem', position: 2, name: 'Extras', item: 'https://agenticconsciousness.com.au/extras' },
  ],
};

export default function ExtrasPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ExtrasCart />
    </>
  );
}

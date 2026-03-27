import type { Metadata } from 'next';
import ToolsPageClient from '@/components/tools/ToolsPageClient';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Free AI Tools — 8 Business Tools Powered by Claude',
  description: 'Eight free AI-powered business tools. Invoice scanner, quote generator, competitor analysis, email drafter, document summariser, meeting actions, job ads, contract review. No signup.',
  alternates: { canonical: 'https://agenticconsciousness.com.au/tools' },
  openGraph: {
    title: 'Free AI Business Tools',
    description: 'Eight free AI-powered business tools. Invoice scanner, quote generator, competitor analysis, email drafter, document summariser, meeting actions, job ads, contract review. No signup.',
    url: 'https://agenticconsciousness.com.au/tools',
    type: 'website',
  },
};

export default function ToolsPage() {
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
        name: 'Free AI Tools',
        item: 'https://agenticconsciousness.com.au/tools',
      },
    ],
  };

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Agentic Consciousness Free AI Tools',
    description: 'Eight free AI-powered business tools including invoice scanning, quote generation, competitor analysis, email drafting, document summarisation, meeting action extraction, job ad writing, and contract review.',
    url: 'https://agenticconsciousness.com.au/tools',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'AUD',
    },
    provider: {
      '@type': 'Organization',
      '@id': 'https://agenticconsciousness.com.au/#organization',
      name: 'Agentic Consciousness',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <Nav />
      <ToolsPageClient />
      <Footer />
    </>
  );
}

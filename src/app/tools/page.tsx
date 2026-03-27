import type { Metadata } from 'next';
import ToolsShowcase from '@/components/tools/ToolsShowcase';
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

const TOOL_SEO_DATA = [
  { id: 'invoice', name: 'Invoice Scanner', description: 'Upload a photo or PDF of any invoice. AI extracts every field — supplier, ABN, line items, GST classification. Export to CSV for your bookkeeper.' },
  { id: 'quote', name: 'Quote Generator', description: 'Describe the job. AI writes a complete quote with scope, line items, GST, payment terms. Copy or email directly to your client.' },
  { id: 'competitor', name: 'Competitor Intel', description: 'Enter a competitor name. AI analyses their positioning, strengths, weaknesses, pricing strategy, and how you can differentiate.' },
  { id: 'email', name: 'Email Drafter', description: 'Brain-dump what you need to say. AI writes a clean email in your chosen tone — professional, friendly, direct, or formal.' },
  { id: 'summarise', name: 'Document Summariser', description: 'Paste any document — report, article, meeting transcript. AI extracts key points, executive summary, and compression stats.' },
  { id: 'meeting', name: 'Meeting Notes to Actions', description: 'Paste raw meeting notes. AI extracts action items, owners, deadlines, decisions, and follow-ups.' },
  { id: 'jobad', name: 'Job Ad Writer', description: 'Enter the role details. AI writes a complete job ad with requirements, benefits, salary guidance, and an automatic bias check.' },
  { id: 'contract', name: 'Contract Reviewer', description: 'Paste a contract clause or full text. AI gives you a plain English translation, fairness rating, risks, and negotiation points.' },
];

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

      {/* Server-rendered SEO content — hidden visually but available to crawlers */}
      <div className="sr-only">
        <h1>Free AI Business Tools — Powered by Claude</h1>
        <p>Eight free AI-powered tools for Australian businesses. No signup required. Scan invoices, generate quotes, analyse competitors, draft emails, summarise documents, extract meeting actions, write job ads, and review contracts.</p>
        {TOOL_SEO_DATA.map((tool) => (
          <section key={tool.id}>
            <h2>{tool.name}</h2>
            <p>{tool.description}</p>
          </section>
        ))}
      </div>

      <ToolsShowcase />
      <Footer />
    </>
  );
}

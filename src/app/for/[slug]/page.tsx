import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import Services from '@/components/Services';
import Process from '@/components/Process';
import CaseStudies from '@/components/CaseStudies';
import About from '@/components/About';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';
import Divider from '@/components/Divider';
import AiAudit from '@/components/AiAudit';

// Import dynamic chatbot
import ChatbotWrapper from '@/components/ChatbotWrapper';

const LANDING_PAGES: Record<string, { title: string; description: string }> = {
  brisbane: { title: 'AI Consulting Brisbane', description: 'AI strategy, implementation, and automation for Brisbane businesses. Free consultation.' },
  sydney: { title: 'AI Consulting Sydney', description: 'AI strategy, implementation, and automation for Sydney businesses. Free consultation.' },
  melbourne: { title: 'AI Consulting Melbourne', description: 'AI strategy, implementation, and automation for Melbourne businesses. Free consultation.' },
  perth: { title: 'AI Consulting Perth', description: 'AI strategy, implementation, and automation for Perth businesses. Free consultation.' },
  adelaide: { title: 'AI Consulting Adelaide', description: 'AI strategy, implementation, and automation for Adelaide businesses. Free consultation.' },
  goldcoast: { title: 'AI Consulting Gold Coast', description: 'AI strategy, implementation, and automation for Gold Coast businesses. Free consultation.' },
  manufacturing: { title: 'AI for Manufacturing', description: 'AI-powered quality inspection, predictive maintenance, and production scheduling for manufacturers.' },
  trades: { title: 'AI for Trades & Services', description: 'AI automation for quoting, scheduling, and customer communications. Built for tradies.' },
  professional: { title: 'AI for Professional Services', description: 'AI-augmented proposals, document review, and client management for professional firms.' },
  healthcare: { title: 'AI for Healthcare', description: 'AI scheduling, documentation, and admin automation for healthcare providers.' },
  retail: { title: 'AI for Retail & E-commerce', description: 'AI inventory forecasting, customer service, and marketing automation for retail.' },
  construction: { title: 'AI for Construction', description: 'AI project scheduling, safety compliance, and cost estimation for construction companies.' },
};

export function generateStaticParams() {
  return Object.keys(LANDING_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = LANDING_PAGES[slug];
  if (!page) return { title: 'Agentic Consciousness — AI Consulting Australia' };
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `https://agenticconsciousness.com.au/for/${slug}` },
    openGraph: {
      title: `${page.title} | Agentic Consciousness`,
      description: page.description,
      type: 'website',
      locale: 'en_AU',
    },
  };
}

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!LANDING_PAGES[slug]) {
    const { notFound } = await import('next/navigation');
    notFound();
  }

  return (
    <>
      <Nav />
      <main id="main-content">
        <Hero />
        <Divider />
        <Services />
        <Divider />
        <Process />
        <Divider />
        <CaseStudies />
        <Divider />
        <About />
        <Divider />
        <AiAudit />
        <Divider />
        <CTA />
      </main>
      <Footer />
      <ChatbotWrapper />
    </>
  );
}

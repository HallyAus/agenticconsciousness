import type { Metadata } from 'next';
import InvoiceScanner from '@/components/tools/InvoiceScanner';
import QuoteGenerator from '@/components/tools/QuoteGenerator';
import CompetitorIntel from '@/components/tools/CompetitorIntel';

export const metadata: Metadata = {
  title: 'Free AI Tools — Invoice Scanner, Quote Generator, Competitor Intel',
  description:
    'Three free AI-powered business tools. Scan invoices, generate professional quotes, and analyse competitors. No signup required.',
};

export default function ToolsPage() {
  return (
    <main className="pt-[60px] min-h-screen">
      {/* Hero */}
      <section className="py-28 px-10 max-md:px-5 max-sm:py-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="font-mono text-[0.6rem] tracking-[3px] uppercase text-ac-red mb-3">
            FREE AI TOOLS
          </div>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none mb-4">
            Try AI. Right now.
          </h1>
          <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] max-w-[500px]">
            Three business tools powered by Claude. No signup. No cost. Real work, done in seconds.
          </p>
        </div>
      </section>

      <div className="h-[2px] bg-ac-red" />
      <InvoiceScanner />
      <div className="h-[2px] bg-ac-red" />
      <QuoteGenerator />
      <div className="h-[2px] bg-ac-red" />
      <CompetitorIntel />
      <div className="h-[2px] bg-ac-red" />

      {/* Bottom CTA */}
      <section className="py-28 px-10 max-md:px-5 max-sm:py-20">
        <div className="max-w-[800px] mx-auto text-center">
          <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight mb-4">
            Impressed? These are demos.
          </h2>
          <p className="text-text-dim text-[1rem] font-light leading-[1.7] max-w-[500px] mx-auto mb-8">
            Imagine custom AI tools built for your exact workflows — your invoices auto-processed,
            your quotes generated in seconds, your market intelligence updating daily. That&apos;s
            what we build.
          </p>
          <a
            href="/#contact"
            className="inline-block font-display text-[0.75rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 bg-ac-red text-white hover:bg-white hover:text-ac-black"
          >
            Let&apos;s build yours →
          </a>
        </div>
      </section>
    </main>
  );
}

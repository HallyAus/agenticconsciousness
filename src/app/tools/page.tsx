import type { Metadata } from 'next';
import InvoiceScanner from '@/components/tools/InvoiceScanner';
import QuoteGenerator from '@/components/tools/QuoteGenerator';
import CompetitorIntel from '@/components/tools/CompetitorIntel';
import ToolsHero from '@/components/tools/ToolsHero';
import ToolsNav from '@/components/tools/ToolsNav';

export const metadata: Metadata = {
  title: 'Free AI Tools — Invoice, Quote & Competitor Analysis',
  description: 'Three free AI-powered business tools. Scan invoices, generate quotes, and analyse competitors. No signup required.',
};

export default function ToolsPage() {
  return (
    <main className="pt-[60px] min-h-screen">
      <ToolsHero />
      <ToolsNav />

      <div id="invoice-section">
        <InvoiceScanner />
      </div>
      <div className="h-[2px]" style={{ background: 'var(--red)' }} />
      <div id="quote-section">
        <QuoteGenerator />
      </div>
      <div className="h-[2px]" style={{ background: 'var(--red)' }} />
      <div id="competitor-section">
        <CompetitorIntel />
      </div>
      <div className="h-[2px]" style={{ background: 'var(--red)' }} />

      {/* Bottom CTA */}
      <section className="py-28 px-10 max-md:px-5 max-sm:py-20">
        <div className="max-w-[800px] mx-auto text-center">
          <div className="font-mono text-[0.7rem] tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
            WHAT&apos;S NEXT
          </div>
          <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight mb-4 text-text-primary">
            These tools took us 2 hours to build.
          </h2>
          <p className="text-text-dim text-[1rem] font-light leading-[1.7] max-w-[500px] mx-auto mb-8">
            Imagine what we can build for your specific workflows in 2 weeks. Custom AI tools, tailored to your data, integrated into your systems, running 24/7.
          </p>
          <div className="flex gap-4 justify-center flex-wrap mb-12">
            <a
              href="mailto:ai@agenticconsciousness.com.au"
              className="inline-block font-display text-[0.75rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 text-white"
              style={{ background: 'var(--red)' }}
            >
              Book free consultation →
            </a>
            <a
              href="/#ai-audit"
              className="inline-block font-display text-[0.75rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 border-2"
              style={{ borderColor: 'var(--red)', color: 'var(--red-text)' }}
            >
              Take the AI audit →
            </a>
          </div>
          <div className="flex gap-16 justify-center max-sm:gap-8 max-sm:flex-wrap">
            {[
              { value: '2 hours', label: 'To build these tools' },
              { value: '2 weeks', label: 'Typical implementation' },
              { value: '$0', label: 'Initial consultation' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-[1.5rem] font-black tracking-tight" style={{ color: 'var(--red-text)' }}>
                  {s.value}
                </div>
                <div className="font-mono text-[0.6rem] text-text-dim tracking-[2px] uppercase mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

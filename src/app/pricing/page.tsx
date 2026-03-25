import type { Metadata } from 'next';
import PricingCards from '@/components/PricingCards';

export const metadata: Metadata = {
  title: 'Pricing — AI Consulting Packages',
  description: 'Transparent pricing for AI consulting. Strategy from $3,000, Implementation from $5,000, Automation from $10,000. Free consultation included.',
};

export default function PricingPage() {
  return (
    <main className="pt-[60px] min-h-screen">
      <section className="py-28 px-10 max-md:px-5 max-sm:py-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="font-mono text-[0.7rem] tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
            PRICING
          </div>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none mb-4 text-text-primary">
            Transparent pricing.
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
  );
}

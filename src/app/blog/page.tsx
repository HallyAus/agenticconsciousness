import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insights',
  description: 'AI insights, strategies, and implementation guides from Agentic Consciousness.',
};

export default function BlogPage() {
  return (
    <main className="pt-[60px] min-h-screen">
      <section className="py-28 px-10 max-md:px-5 max-sm:py-20">
        <div className="max-w-[800px] mx-auto text-center">
          <div className="font-mono text-[0.6rem] tracking-[3px] uppercase text-ac-red mb-3">
            INSIGHTS
          </div>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none mb-8">
            Coming soon.
          </h1>
          <p className="text-text-dim text-[1rem] font-light leading-[1.7] max-w-[400px] mx-auto mb-10">
            We&apos;re preparing guides on AI strategy, implementation, and automation for Australian businesses.
          </p>
          <a
            href="/"
            className="inline-block font-display text-[0.75rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 bg-transparent border-2 border-ac-red text-ac-red hover:bg-ac-red hover:text-white"
          >
            ← Back to home
          </a>
        </div>
      </section>
    </main>
  );
}

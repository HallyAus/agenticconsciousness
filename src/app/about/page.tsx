import type { Metadata } from 'next';
import Link from 'next/link';
import EmailLink from '@/components/EmailLink';

export const metadata: Metadata = {
  title: 'About Us — AI Consulting',
  description:
    'Founded by Daniel with 21+ years industry experience. We help Australian businesses adopt AI practically — strategy, implementation, and automation.',
  alternates: {
    canonical: 'https://agenticconsciousness.com.au/about',
  },
  openGraph: {
    title: 'About Us — AI Consulting',
    description:
      'Founded by Daniel with 21+ years industry experience. We help Australian businesses adopt AI practically — not theory, applied intelligence.',
    url: 'https://agenticconsciousness.com.au/about',
    type: 'website',
    images: [{ url: 'https://agenticconsciousness.com.au/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function AboutPage() {
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Daniel',
    jobTitle: 'Founder & AI Consultant',
    description:
      'AI consultant with 21+ years of industry experience across enterprise systems, automation, and technology implementation.',
    knowsAbout: [
      'Artificial Intelligence',
      'AI Consulting',
      'Enterprise Systems',
      'Automation',
      'Linux',
      'Docker',
      'Proxmox',
      'Technology Implementation',
      'AI Strategy',
      'Machine Learning',
    ],
    worksFor: {
      '@type': 'Organization',
      '@id': 'https://agenticconsciousness.com.au/#organization',
      name: 'Agentic Consciousness',
      url: 'https://agenticconsciousness.com.au',
    },
    url: 'https://agenticconsciousness.com.au/about',
  };

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
        name: 'About',
        item: 'https://agenticconsciousness.com.au/about',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <main className="pt-[60px] min-h-screen">
        {/* Section 1 — Daniel's Story */}
        <section className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20">
          <div className="max-w-[1000px] mx-auto">
            <div className="font-mono text-[0.85rem] max-sm:text-xs tracking-[3px] uppercase text-ac-red mb-3">
              ABOUT
            </div>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none mb-6 text-text-primary">
              About Agentic Consciousness
            </h1>
            <p className="text-text-dim text-[0.95rem] font-light leading-[1.8] max-w-[700px] mb-10">
              We exist because most businesses are being sold AI hype, not AI outcomes.
            </p>

            <div className="border-2 border-border-subtle bg-ac-card p-10 max-sm:p-6 mb-[2px]">
              <div className="text-ac-red font-black text-[1.6rem] tracking-[-1px] mb-2">
                21+ Years in the Field
              </div>
              <p className="text-text-dim text-[0.9rem] font-light leading-[1.8] mb-5">
                Agentic Consciousness was founded by Daniel — a technologist with over two decades of
                hands-on industry experience across enterprise systems, automation, and technology
                implementation. This isn&apos;t a pivot from marketing or management consulting. It&apos;s a
                natural evolution from years spent building, deploying, and maintaining the systems that
                businesses actually run on.
              </p>
              <p className="text-text-dim text-[0.9rem] font-light leading-[1.8] mb-5">
                Daniel&apos;s background spans Linux infrastructure, Proxmox virtualisation, Docker
                containerisation, network architecture, and full-stack automation. When AI became
                commercially viable, the transition was straightforward — the same engineering discipline
                that builds reliable infrastructure now builds reliable AI systems.
              </p>
              <p className="text-text-dim text-[0.9rem] font-light leading-[1.8]">
                The mission is simple: help Australian businesses adopt AI practically. Not with slide
                decks and theoretical frameworks, but with working systems that deliver measurable results
                from day one. Every recommendation we make comes from real-world deployment experience —
                because we build what we sell.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2 — The Approach */}
        <section className="py-20 px-10 max-md:px-5 max-sm:px-4 max-sm:py-16">
          <div className="max-w-[1000px] mx-auto">
            <div className="font-mono text-[0.85rem] max-sm:text-xs tracking-[3px] uppercase text-ac-red mb-3">
              APPROACH
            </div>
            <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight leading-none mb-10 text-text-primary">
              We build and deploy. Not just advise.
            </h2>

            <div className="grid grid-cols-2 gap-[2px] bg-border-subtle max-[768px]:grid-cols-1 mb-8">
              {[
                {
                  phase: 'PHASE 01',
                  title: 'Discovery',
                  desc: 'Free, no-obligation conversation. We learn your pain points, workflows, and goals. You learn what AI can actually do for your business.',
                },
                {
                  phase: 'PHASE 02',
                  title: 'Audit',
                  desc: 'We assess your tools, data maturity, and team capabilities. You get a clear report — what\'s possible, what to prioritise, what to skip.',
                },
                {
                  phase: 'PHASE 03',
                  title: 'Deploy',
                  desc: 'Rapid implementation sprint. We set up, integrate, and test AI solutions in your environment. Your team gets trained hands-on.',
                },
                {
                  phase: 'PHASE 04',
                  title: 'Scale',
                  desc: 'Ongoing refinement from real usage data. We expand what works, cut what doesn\'t, and keep your AI capabilities evolving.',
                },
              ].map((step) => (
                <div key={step.phase} className="bg-ac-card p-8">
                  <div className="font-mono text-[0.85rem] max-sm:text-xs tracking-[3px] uppercase text-ac-red mb-2">
                    {step.phase}
                  </div>
                  <h3 className="text-[1.1rem] font-black text-text-primary mb-2">{step.title}</h3>
                  <p className="text-[0.85rem] text-text-dim font-light leading-[1.7]">{step.desc}</p>
                </div>
              ))}
            </div>

            <div className="border-2 border-border-subtle bg-ac-card p-10 max-sm:p-6">
              <p className="text-text-dim text-[0.9rem] font-light leading-[1.8] mb-5">
                Most AI consultants stop at strategy. They hand you a PDF and wish you luck. We don&apos;t
                operate that way. Our{' '}
                <Link href="/tools" className="text-ac-red no-underline hover:underline">
                  free AI tools
                </Link>{' '}
                are proof — built with the same technology stack we deploy for clients. The chatbot on this
                site runs on Claude. The{' '}
                <Link href="/tools" className="text-ac-red no-underline hover:underline">
                  ROI calculator
                </Link>
                , the readiness assessment — all functional AI, not mockups.
              </p>
              <p className="text-text-dim text-[0.9rem] font-light leading-[1.8]">
                We work across all industries and business sizes. Trades businesses automating scheduling.
                Professional services firms generating proposals with AI. Manufacturing operations running
                quality inspection pipelines. If you have operations, we can make them smarter. Check our{' '}
                <Link href="/pricing" className="text-ac-red no-underline hover:underline">
                  transparent pricing
                </Link>{' '}
                to see how engagements are structured.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 — Why "Agentic" */}
        <section className="py-20 px-10 max-md:px-5 max-sm:px-4 max-sm:py-16">
          <div className="max-w-[1000px] mx-auto">
            <div className="font-mono text-[0.85rem] max-sm:text-xs tracking-[3px] uppercase text-ac-red mb-3">
              PHILOSOPHY
            </div>
            <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight leading-none mb-10 text-text-primary">
              Why &ldquo;Agentic&rdquo;?
            </h2>

            <div className="border-l-[3px] border-ac-red bg-ac-card p-10 max-sm:p-6 mb-[2px]">
              <p className="text-text-dim text-[0.9rem] font-light leading-[1.8] mb-5">
                <span className="text-text-primary font-black">Agentic AI</span> means AI systems that
                act autonomously — not just answering questions, but making decisions, executing tasks, and
                operating workflows without constant human intervention. It&apos;s the difference between a
                chatbot that responds and a system that operates.
              </p>
              <p className="text-text-dim text-[0.9rem] font-light leading-[1.8] mb-5">
                We chose the name because it reflects what we build. Not passive tools that sit idle until
                prompted, but active systems that work for your business around the clock. AI agents that
                handle customer enquiries, process documents, manage scheduling, generate reports, and
                trigger actions — all without someone sitting at a keyboard.
              </p>
              <p className="text-text-dim text-[0.9rem] font-light leading-[1.8]">
                <span className="text-text-primary font-black">Consciousness</span> is the other half.
                Every AI system we deploy is designed with awareness — awareness of your business context,
                your industry constraints, your data sensitivity requirements. We don&apos;t deploy generic
                solutions. We build AI that understands your operations. Read more about{' '}
                <Link
                  href="/blog/ai-readiness-audit-guide"
                  className="text-ac-red no-underline hover:underline"
                >
                  how we assess AI readiness
                </Link>{' '}
                before implementation begins.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 — CTA */}
        <section className="py-20 px-10 max-md:px-5 max-sm:px-4 max-sm:py-16">
          <div className="max-w-[1000px] mx-auto text-center">
            <div className="border-2 border-border-subtle bg-ac-card p-14 max-sm:p-8">
              <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight leading-none mb-4 text-text-primary">
                Ready to talk?
              </h2>
              <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] max-w-[500px] mx-auto mb-8">
                Every engagement starts with a free consultation. No pitch, no obligation — just a
                conversation about what AI can do for your business.
              </p>
              <EmailLink
                className="inline-block font-display text-[0.85rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 bg-ac-red text-white hover:bg-white hover:text-[#0a0a0a]"
              >
                Book free consultation →
              </EmailLink>
              <p className="text-text-ghost text-[0.85rem] font-mono mt-5 tracking-[1px]">
                ai@agenticconsciousness.com.au
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

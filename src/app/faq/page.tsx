import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about AI consulting, services, pricing, and how Agentic Consciousness works.',
};

const faqs = [
  {
    q: 'What is AI consulting?',
    a: 'We help businesses understand, implement, and scale AI. Strategy. Tools. Automation. Not theory — applied intelligence that changes how you operate.',
  },
  {
    q: 'I know nothing about AI. Is this for me?',
    a: "That's exactly who this is for. We start from zero and build up. No jargon, no assumptions about what you know.",
  },
  {
    q: 'What AI tools do you work with?',
    a: 'ChatGPT, Claude, Microsoft Copilot, custom models. Whatever fits your workflow. We are tool-agnostic — we deploy what works.',
  },
  {
    q: 'How much does it cost?',
    a: "The intro session is free. Projects are scoped and priced after we understand your needs. No surprises.",
  },
  {
    q: 'How long does implementation take?',
    a: 'Typically 1-4 weeks depending on complexity. We move fast. Discovery to deployment in weeks, not months.',
  },
  {
    q: 'Do you work with small businesses?',
    a: 'Yes. SMBs, enterprise, tradies, startups. If you have operations, we can make them smarter.',
  },
  {
    q: 'Where are you based?',
    a: 'Australia. We work nationally — remote and on-site. Distance is not a barrier.',
  },
  {
    q: 'What makes you different from other AI consultants?',
    a: "We build what we sell. This website, this chatbot — all AI-powered. We deploy, not just advise.",
  },
];

export default function FAQPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <main className="pt-[60px] min-h-screen">
        <section className="py-28 px-10 max-md:px-5 max-sm:py-20">
          <div className="max-w-[800px] mx-auto">
            <div className="font-mono text-[0.6rem] tracking-[3px] uppercase text-ac-red mb-3">
              FAQ
            </div>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none mb-14">
              Questions. Answers.
            </h1>

            <div className="flex flex-col gap-[2px]">
              {faqs.map((faq) => (
                <div key={faq.q} className="bg-ac-card p-8 border-l-[3px] border-ac-red">
                  <h2 className="text-[1rem] font-black text-white mb-3">{faq.q}</h2>
                  <p className="text-[0.85rem] text-text-dim font-light leading-[1.7]">{faq.a}</p>
                </div>
              ))}
            </div>

            <div className="mt-14 text-center">
              <p className="text-text-dim text-[0.9rem] font-light mb-6">
                Still have questions?
              </p>
              <a
                href="mailto:ai@agenticconsciousness.com.au"
                className="inline-block font-display text-[0.75rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 bg-ac-red text-white hover:bg-white hover:text-ac-black"
              >
                Get in touch →
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

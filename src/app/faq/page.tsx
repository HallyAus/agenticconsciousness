import type { Metadata } from 'next';
import Link from 'next/link';
import EmailLink from '@/components/EmailLink';

export const metadata: Metadata = {
  title: 'AI Consulting FAQ',
  description:
    'Answers to common questions about AI consulting — implementation timelines, pricing, data security, and how we help Australian businesses.',
  alternates: { canonical: 'https://agenticconsciousness.com.au/faq' },
  openGraph: {
    title: 'AI Consulting FAQ',
    description:
      'Everything you need to know about AI consulting — services, pricing, timelines, data security, and more.',
    url: 'https://agenticconsciousness.com.au/faq',
    type: 'website',
    images: [{ url: 'https://agenticconsciousness.com.au/opengraph-image', width: 1200, height: 630 }],
  },
};

const faqs: { q: string; a: React.ReactNode; plainText: string }[] = [
  {
    q: 'What is AI consulting?',
    a: (
      <>
        AI consulting is the process of helping businesses understand, implement, and scale artificial
        intelligence within their operations. It covers everything from identifying where AI can add value,
        selecting the right tools, deploying them into existing workflows, and training teams to use them
        effectively. Unlike generic technology consulting, AI consulting requires deep knowledge of machine
        learning models, large language models, automation frameworks, and how they integrate with
        real-world business systems. At Agentic Consciousness, we combine 21+ years of industry experience
        with hands-on AI deployment.{' '}
        <Link href="/about" className="text-ac-red no-underline hover:underline">
          Learn more about our background
        </Link>
        .
      </>
    ),
    plainText:
      'AI consulting is the process of helping businesses understand, implement, and scale artificial intelligence within their operations. It covers everything from identifying where AI can add value, selecting the right tools, deploying them into existing workflows, and training teams to use them effectively. At Agentic Consciousness, we combine 21+ years of industry experience with hands-on AI deployment.',
  },
  {
    q: 'How does AI consulting work?',
    a: (
      <>
        Our process follows four clear phases: Discovery, Audit, Deploy, and Scale. It starts with a free
        consultation where we understand your business, pain points, and goals. We then conduct an AI
        readiness audit to assess your tools, data maturity, and team capabilities. From there, we run a
        rapid implementation sprint — deploying AI solutions into your environment and training your team.
        Finally, we optimise and scale based on real usage data.{' '}
        <Link href="/#process" className="text-ac-red no-underline hover:underline">
          See our full method
        </Link>
        .
      </>
    ),
    plainText:
      'Our process follows four clear phases: Discovery, Audit, Deploy, and Scale. It starts with a free consultation where we understand your business, pain points, and goals. We then conduct an AI readiness audit to assess your tools, data maturity, and team capabilities. From there, we run a rapid implementation sprint — deploying AI solutions into your environment and training your team. Finally, we optimise and scale based on real usage data.',
  },
  {
    q: 'What industries do you work with?',
    a: (
      <>
        We work across all industries. Our clients include trades businesses automating scheduling and
        customer communications, manufacturing firms deploying AI-powered quality inspection, professional
        services companies generating proposals and reports with AI, healthcare practices streamlining
        admin, retail businesses optimising inventory and customer engagement, and finance teams automating
        document processing. If your business has operations, we can make them smarter. Read about{' '}
        <Link
          href="/blog/ai-automations-australian-trades-business-2026"
          className="text-ac-red no-underline hover:underline"
        >
          AI for trades businesses
        </Link>{' '}
        or{' '}
        <Link
          href="/blog/ai-document-processing-guide-australian-finance-teams"
          className="text-ac-red no-underline hover:underline"
        >
          AI for finance teams
        </Link>
        .
      </>
    ),
    plainText:
      'We work across all industries. Our clients include trades businesses, manufacturing firms, professional services companies, healthcare practices, retail businesses, and finance teams. If your business has operations, we can make them smarter.',
  },
  {
    q: 'How much does AI consulting cost?',
    a: (
      <>
        We offer three transparent packages: AI Strategy &amp; Workshops from $3,000, AI Tool
        Implementation from $5,000, and AI Automation &amp; Agents from $10,000. All prices are in AUD
        plus GST. Every engagement begins with a free consultation — no obligation, no hidden fees. Custom
        scoping is available for enterprise or complex requirements. We price based on value delivered, not
        hours billed.{' '}
        <Link href="/pricing" className="text-ac-red no-underline hover:underline">
          View our full pricing breakdown
        </Link>
        .
      </>
    ),
    plainText:
      'We offer three transparent packages: AI Strategy & Workshops from $3,000, AI Tool Implementation from $5,000, and AI Automation & Agents from $10,000. All prices are in AUD plus GST. Every engagement begins with a free consultation — no obligation, no hidden fees.',
  },
  {
    q: 'Do you work with small businesses?',
    a: (
      <>
        Absolutely. We work with businesses of all sizes — from sole traders and SMBs to mid-market
        companies and enterprise organisations. In fact, small businesses often see the biggest
        proportional gains from AI because even modest automation can reclaim hours of manual work each
        week. A tradie automating scheduling and follow-ups, a small retailer using AI for customer
        enquiries, a solo consultant generating proposals faster — these are real outcomes we deliver.
        Read about{' '}
        <Link
          href="/blog/ai-automation-small-business-australia-2026"
          className="text-ac-red no-underline hover:underline"
        >
          AI automation for small businesses
        </Link>
        .
      </>
    ),
    plainText:
      'Absolutely. We work with businesses of all sizes — from sole traders and SMBs to mid-market companies and enterprise organisations. Small businesses often see the biggest proportional gains from AI because even modest automation can reclaim hours of manual work each week.',
  },
  {
    q: 'Are you a tool-agnostic AI consultant?',
    a: (
      <>
        Yes. We are a tool-agnostic AI consultant — we have no reseller agreements, no vendor
        commissions, and no preferred-partner quotas to hit. Every recommendation starts from your
        business problem and works backwards to the right tool, whether that is Claude, ChatGPT,
        Microsoft Copilot, Gemini, an open-source model like Llama, or a bespoke pipeline stitched
        together from APIs. Most AI consultants are effectively single-vendor sales channels wearing
        a consulting hat; we are not. If the best answer for your use case is a $20 ChatGPT Team
        subscription, that is what we will say — even though it earns us nothing.
      </>
    ),
    plainText:
      'Yes. We are a tool-agnostic AI consultant — no reseller agreements, no vendor commissions, no preferred-partner quotas. Every recommendation starts from your business problem and works backwards to the right tool, whether that is Claude, ChatGPT, Microsoft Copilot, Gemini, open-source Llama, or a bespoke API pipeline. Most AI consultants are effectively single-vendor sales channels; we are not.',
  },
  {
    q: 'What AI tools do you implement?',
    a: (
      <>
        Because we are tool-agnostic, we deploy whatever fits your use case best. In practice that
        typically means ChatGPT and GPT-4 for general-purpose content and analysis, Claude for
        long-context reasoning and document processing, Microsoft Copilot for Office 365 and Teams
        integration, Google Gemini where Workspace is the system of record, and custom or
        open-source models (Llama, Mistral) when data residency or fine-tuning matter. We also
        build bespoke automation pipelines using APIs, webhooks, and orchestration tools like
        n8n, Make, and Zapier. The chatbot on this site runs on Claude as a live demonstration.
        Try our{' '}
        <Link href="/tools" className="text-ac-red no-underline hover:underline">
          free AI tools
        </Link>{' '}
        to see what&apos;s possible.
      </>
    ),
    plainText:
      'Because we are tool-agnostic, we deploy whatever fits your use case best. ChatGPT and GPT-4 for general content and analysis, Claude for long-context reasoning and document processing, Microsoft Copilot for Office 365 integration, Gemini for Workspace environments, and custom or open-source models (Llama, Mistral) where data residency or fine-tuning matter. We also build bespoke automation pipelines using APIs, webhooks, and orchestration tools.',
  },
  {
    q: 'What is an AI readiness audit?',
    a: (
      <>
        An AI readiness audit is a structured assessment of your business&apos;s current state —
        evaluating your existing tools, data quality, team capabilities, and operational workflows to
        determine where AI can deliver the most impact. We identify quick wins, longer-term opportunities,
        and areas where AI isn&apos;t the right fit. The output is a clear, prioritised roadmap — not a
        generic report. Every recommendation is actionable and specific to your business. We cover this in
        detail in our{' '}
        <Link
          href="/blog/ai-readiness-audit-guide"
          className="text-ac-red no-underline hover:underline"
        >
          complete guide to AI readiness audits
        </Link>
        .
      </>
    ),
    plainText:
      "An AI readiness audit is a structured assessment of your business's current state — evaluating your existing tools, data quality, team capabilities, and operational workflows to determine where AI can deliver the most impact. The output is a clear, prioritised roadmap — not a generic report.",
  },
  {
    q: 'How long does implementation take?',
    a: (
      <>
        Typical timelines range from one to four weeks depending on complexity. A single tool deployment
        (like setting up Claude for document processing) can be done in days. A multi-system integration
        with custom automation pipelines might take three to four weeks. We move fast because we&apos;ve
        done this before — our process is proven and repeatable. Enterprise engagements with broader scope
        may extend to six to eight weeks. Every project starts with a clear timeline agreed upfront during
        the{' '}
        <Link href="/#process" className="text-ac-red no-underline hover:underline">
          Discovery phase
        </Link>
        .
      </>
    ),
    plainText:
      'Typical timelines range from one to four weeks depending on complexity. A single tool deployment can be done in days. A multi-system integration with custom automation pipelines might take three to four weeks. Enterprise engagements may extend to six to eight weeks.',
  },
  {
    q: 'Is my data secure with AI?',
    a: (
      <>
        Data security is non-negotiable. We follow strict data handling protocols and can deploy AI
        solutions that keep your data entirely on-premise if required. For cloud-based tools, we use
        enterprise-grade API integrations with encryption in transit and at rest — your data is never used
        to train third-party models. We assess your data sensitivity requirements during the audit phase
        and recommend architectures that meet your compliance obligations. For industries with strict
        regulatory requirements (healthcare, finance, legal), we design solutions with appropriate
        safeguards.{' '}
        <Link href="/privacy" className="text-ac-red no-underline hover:underline">
          Read our privacy policy
        </Link>
        .
      </>
    ),
    plainText:
      'Data security is non-negotiable. We follow strict data handling protocols and can deploy AI solutions that keep your data entirely on-premise if required. Your data is never used to train third-party models. We assess your data sensitivity requirements during the audit phase.',
  },
  {
    q: 'Do you offer ongoing support?',
    a: (
      <>
        Yes. Our Scale phase provides ongoing refinement based on real usage data. After initial
        deployment, we monitor performance, optimise prompts and workflows, and expand capabilities as your
        team gains confidence. Support packages include 30, 60, or 90 days depending on the engagement
        tier. We also offer retainer arrangements for businesses that want continuous AI development and
        optimisation.{' '}
        <Link href="/pricing" className="text-ac-red no-underline hover:underline">
          See what&apos;s included in each package
        </Link>
        .
      </>
    ),
    plainText:
      "Yes. Our Scale phase provides ongoing refinement based on real usage data. After initial deployment, we monitor performance, optimise prompts and workflows, and expand capabilities. Support packages include 30, 60, or 90 days depending on the engagement tier.",
  },
  {
    q: 'What results can I expect from AI consulting?',
    a: (
      <>
        Results vary by industry and use case, but typical outcomes include 40-70% reduction in manual
        processing time, significant cost savings through automation, improved accuracy in repetitive
        tasks, and faster turnaround on customer-facing operations. For example, one manufacturing client
        cut QA processing time by 62% while achieving 99.2% defect detection. A trades business reclaimed
        8+ hours per week of admin time. A professional services firm tripled proposal output with an 18%
        improvement in win rate. See our{' '}
        <Link href="/#cases" className="text-ac-red no-underline hover:underline">
          case studies
        </Link>{' '}
        for detailed results.
      </>
    ),
    plainText:
      'Typical outcomes include 40-70% reduction in manual processing time, significant cost savings through automation, and improved accuracy. One manufacturing client cut QA processing time by 62%. A trades business reclaimed 8+ hours per week of admin time.',
  },
  {
    q: 'What is agentic AI?',
    a: (
      <>
        Agentic AI refers to artificial intelligence systems that can act autonomously — making decisions,
        executing multi-step tasks, and operating workflows without constant human oversight. Unlike
        traditional AI that simply responds to prompts, agentic AI takes initiative: it can monitor
        conditions, trigger actions, handle exceptions, and complete complex processes end-to-end.
        Examples include AI agents that handle customer enquiries from first contact to resolution, or
        document processing pipelines that extract, validate, classify, and route information
        automatically. It&apos;s the future of business automation, and it&apos;s what we specialise in.{' '}
        <Link href="/about" className="text-ac-red no-underline hover:underline">
          Learn about our philosophy
        </Link>
        .
      </>
    ),
    plainText:
      "Agentic AI refers to artificial intelligence systems that can act autonomously — making decisions, executing multi-step tasks, and operating workflows without constant human oversight. Unlike traditional AI that simply responds to prompts, agentic AI takes initiative. It's the future of business automation.",
  },
  {
    q: 'Do you offer free consultations?',
    a: (
      <>
        Yes — every engagement starts with a free, no-obligation consultation. It&apos;s a conversation,
        not a sales pitch. We discuss your business, understand your pain points, and explore whether AI is
        the right fit. If it is, we outline what an engagement would look like. If it&apos;s not, we tell
        you honestly. No pressure, no follow-up spam. You can book directly by emailing{' '}
        <EmailLink
          className="text-ac-red no-underline hover:underline"
        />{' '}
        or using the chatbot on this site.
      </>
    ),
    plainText:
      "Yes — every engagement starts with a free, no-obligation consultation. It's a conversation, not a sales pitch. We discuss your business, understand your pain points, and explore whether AI is the right fit. Email ai@agenticconsciousness.com.au to book.",
  },
  {
    q: 'Where are you based?',
    a: (
      <>
        Agentic Consciousness is based in Australia and operates nationally. We work with clients across
        all states and territories — remotely for most engagements, with on-site availability where
        needed. Our infrastructure runs on Australian-hosted systems. Distance is never a barrier; our
        Discovery, Audit, and Deploy phases work seamlessly over video calls and remote access. For
        on-site workshops and training, we travel to your location.{' '}
        <Link href="/about" className="text-ac-red no-underline hover:underline">
          More about us
        </Link>
        .
      </>
    ),
    plainText:
      'Agentic Consciousness is based in Australia and operates nationally. We work with clients across all states and territories — remotely for most engagements, with on-site availability where needed. Distance is never a barrier.',
  },
  {
    q: 'What is the difference between AI strategy and implementation?',
    a: (
      <>
        AI strategy is about identifying where and how AI can create value in your business — mapping
        opportunities, assessing readiness, and building a prioritised roadmap. Implementation is the
        hands-on work of deploying those solutions: configuring tools, integrating with your systems,
        building automation pipelines, and training your team. Many consultants only do strategy. We do
        both. Our Strategy &amp; Workshops package focuses on the roadmap; our Tool Implementation and
        Automation packages include full deployment.{' '}
        <Link href="/#services" className="text-ac-red no-underline hover:underline">
          Compare our services
        </Link>
        .
      </>
    ),
    plainText:
      'AI strategy is about identifying where and how AI can create value — mapping opportunities, assessing readiness, and building a roadmap. Implementation is the hands-on work of deploying those solutions. Many consultants only do strategy. We do both.',
  },
  {
    q: 'Can AI replace my employees?',
    a: (
      <>
        No — and that&apos;s not what we do. AI augments your team, it doesn&apos;t replace them. The goal
        is to eliminate repetitive, low-value tasks so your people can focus on work that requires human
        judgement, creativity, and relationships. A tradie doesn&apos;t lose their job when AI handles
        scheduling — they get more time on-site doing billable work. An office manager doesn&apos;t get
        replaced when AI processes invoices — they handle exceptions and strategic tasks instead. The best
        AI implementations make existing teams more productive and their jobs more satisfying.{' '}
        <Link
          href="/blog/real-cost-of-not-using-ai-in-your-business"
          className="text-ac-red no-underline hover:underline"
        >
          Read about the real cost of not using AI
        </Link>
        .
      </>
    ),
    plainText:
      "No — and that's not what we do. AI augments your team, it doesn't replace them. The goal is to eliminate repetitive, low-value tasks so your people can focus on work that requires human judgement, creativity, and relationships.",
  },
  {
    q: "What if AI doesn't work for my business?",
    a: (
      <>
        That&apos;s exactly what the Discovery phase is designed to identify. Not every business is ready
        for AI, and not every problem is best solved with AI. During our free consultation and readiness
        audit, we assess whether AI is genuinely the right fit. If it&apos;s not, we&apos;ll tell you —
        and explain what needs to change before it would be. We don&apos;t sell solutions to problems that
        don&apos;t exist. Our reputation depends on delivering real results, not billing for projects that
        won&apos;t work.{' '}
        <Link
          href="/blog/ai-readiness-audit-guide"
          className="text-ac-red no-underline hover:underline"
        >
          Understand the readiness assessment process
        </Link>
        .
      </>
    ),
    plainText:
      "That's exactly what the Discovery phase is designed to identify. Not every business is ready for AI. During our free consultation and readiness audit, we assess whether AI is genuinely the right fit. If it's not, we'll tell you honestly.",
  },
  {
    q: 'I know nothing about AI. Is this for me?',
    a: (
      <>
        That&apos;s exactly who this is for. Most of our clients start with zero AI knowledge — and
        that&apos;s perfectly fine. Our workshops and strategy sessions are designed to demystify AI
        without jargon or assumptions about your technical background. We start from where you are, explain
        concepts in plain language, and focus on practical applications specific to your business. You
        don&apos;t need to understand how large language models work — you need to understand what they can
        do for your operations.{' '}
        <Link
          href="/blog/building-your-first-ai-workflow-step-by-step-guide"
          className="text-ac-red no-underline hover:underline"
        >
          Start with our beginner&apos;s guide to AI workflows
        </Link>
        .
      </>
    ),
    plainText:
      "That's exactly who this is for. Most of our clients start with zero AI knowledge — and that's perfectly fine. Our workshops are designed to demystify AI without jargon. You don't need to understand how large language models work — you need to understand what they can do for your operations.",
  },
  {
    q: 'What makes you different from other AI consultants?',
    a: (
      <>
        We build what we sell. This website, this chatbot, the free tools — all AI-powered systems we
        built ourselves. Most AI consultants come from management consulting backgrounds and outsource the
        technical work. We come from engineering. Daniel has 21+ years of hands-on industry experience
        with enterprise systems, infrastructure, and automation. When we recommend a solution, it&apos;s
        because we&apos;ve deployed it before. We don&apos;t hand you a strategy document and disappear —
        we stay until the system is running and your team is confident.{' '}
        <Link href="/about" className="text-ac-red no-underline hover:underline">
          Read our full story
        </Link>
        .
      </>
    ),
    plainText:
      "We build what we sell. This website, this chatbot, the free tools — all AI-powered. Most AI consultants come from management consulting backgrounds. We come from engineering. Daniel has 21+ years of hands-on industry experience.",
  },
  {
    q: 'How do I get started?',
    a: (
      <>
        Simple — book a free consultation. Email us at{' '}
        <EmailLink
          className="text-ac-red no-underline hover:underline"
        />{' '}
        or use the chatbot on this site to start a conversation. We&apos;ll schedule a Discovery call
        where we learn about your business, discuss your goals, and explore what AI can do for you. No
        cost, no obligation, no sales pressure. From there, if it&apos;s a fit, we scope an engagement
        tailored to your needs.{' '}
        <Link href="/pricing" className="text-ac-red no-underline hover:underline">
          View our packages
        </Link>{' '}
        to get a sense of investment levels.
      </>
    ),
    plainText:
      "Simple — book a free consultation. Email ai@agenticconsciousness.com.au or use the chatbot on this site. We'll schedule a Discovery call where we learn about your business, discuss your goals, and explore what AI can do for you.",
  },
];

export default function FAQPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.plainText },
    })),
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
        name: 'FAQ',
        item: 'https://agenticconsciousness.com.au/faq',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <main className="pt-[60px] min-h-screen">
        <section className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20">
          <div className="max-w-[800px] mx-auto">
            <div className="font-mono text-[0.85rem] max-sm:text-xs tracking-[3px] uppercase text-ac-red mb-3">
              FAQ
            </div>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none mb-4 text-text-primary">
              Questions. Answers.
            </h1>
            <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] max-w-[600px] mb-14">
              Everything you need to know about AI consulting, our services, pricing, and how we work.
              Can&apos;t find your answer? Ask our chatbot or{' '}
              <EmailLink
                className="text-ac-red no-underline hover:underline"
              >
                get in touch
              </EmailLink>
              .
            </p>

            <div className="flex flex-col gap-[2px]">
              {faqs.map((faq) => (
                <div key={faq.q} className="bg-ac-card p-8 border-l-[3px] border-ac-red">
                  <h2 className="text-[1rem] font-black text-text-primary mb-3">{faq.q}</h2>
                  <div className="text-[0.85rem] text-text-dim font-light leading-[1.7]">{faq.a}</div>
                </div>
              ))}
            </div>

            <div className="mt-14 text-center">
              <div className="border-2 border-border-subtle bg-ac-card p-10 max-sm:p-6">
                <p className="text-text-primary text-[1.1rem] font-black mb-3">
                  Still have questions?
                </p>
                <p className="text-text-dim text-[0.85rem] font-light mb-6">
                  Book a free consultation — no obligation, no sales pitch.
                </p>
                <EmailLink
                  className="inline-block font-display text-[0.85rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 bg-ac-red text-white hover:bg-white hover:text-[#0a0a0a]"
                >
                  Get in touch →
                </EmailLink>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

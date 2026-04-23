import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Services from '@/components/Services';
import Process from '@/components/Process';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';
import Divider from '@/components/Divider';
import ScrollReveal from '@/components/ScrollReveal';
import ChatbotWrapper from '@/components/ChatbotWrapper';

interface LandingPoint {
  title: string;
  desc: string;
}

interface DeepDiveSection {
  heading: string;
  body: string;
}

interface LandingPage {
  title: string;
  description: string;
  isCity?: boolean;
  cityName?: string;
  h1: string;
  intro: string;
  points: LandingPoint[];
  // Optional long-form SEO content rendered after the points grid.
  deepDive?: DeepDiveSection[];
}

const LANDING_PAGES: Record<string, LandingPage> = {
  // ── CITIES ──────────────────────────────────────────────

  sydney: {
    title: 'AI Consulting Sydney',
    description: 'AI strategy, implementation, and automation for Sydney businesses. From Circular Quay to Parramatta — measurable ROI, not buzzwords. Free consultation.',
    isCity: true,
    cityName: 'Sydney',
    h1: 'AI Consulting Sydney',
    intro: 'Sydney businesses are leading Australia\u2019s AI adoption. From Circular Quay startups to Parramatta enterprises, we help Sydney organisations deploy AI that delivers measurable ROI \u2014 not slide decks that gather dust.',
    points: [
      { title: 'Financial Services AI', desc: 'Automate compliance checks, reporting pipelines, and client onboarding for Sydney\u2019s financial hub. Cut processing time by 60% or more.' },
      { title: 'Professional Services', desc: 'AI-powered proposal generation, document review, and client communications \u2014 built for law firms, accounting practices, and consultancies across the CBD.' },
      { title: 'Retail & Hospitality', desc: 'Smart inventory management, automated customer service, and demand forecasting for Sydney\u2019s competitive retail and hospitality sectors.' },
      { title: 'Tech & Startups', desc: 'Integrate AI into your product stack or internal operations. From Surry Hills to North Sydney, we help tech companies ship faster with AI-augmented workflows.' },
    ],
    deepDive: [
      {
        heading: 'AI consulting for Sydney\u2019s financial services sector',
        body:
          'Sydney is home to more than 60% of Australia\u2019s financial services industry \u2014 every major bank, the RBA, most super funds, and a dense cluster of fintech and insurance players from Barangaroo through to Chatswood and Parramatta. That concentration means the AI use-cases we deploy here are unusually mature: KYC document processing, real-time transaction monitoring, automated regulatory reporting (APRA, AUSTRAC), client onboarding pipelines, and natural-language querying of risk data. Unlike generic consultancies, we design around APRA CPS 234 and the Consumer Data Right from day one, so nothing needs to be rebuilt when compliance gets involved.',
      },
      {
        heading: 'AI for Sydney CBD law, accounting, and consulting firms',
        body:
          'Sydney\u2019s CBD and North Sydney house some of the country\u2019s most sophisticated professional services firms, and they all have the same bottleneck: billable-hour capacity. We help mid-tier and boutique firms close that gap with AI-assisted document review (cutting contract analysis from hours to minutes), proposal-generation pipelines that turn a scoping call into a formatted fee proposal the same day, and knowledge-management systems that make precedent files genuinely searchable. Because we are tool-agnostic, we match the stack to your existing Microsoft 365 or Google Workspace posture rather than forcing a rip-and-replace.',
      },
      {
        heading: 'AI for Sydney tech startups and scaleups',
        body:
          'The Surry Hills, Pyrmont, and Chippendale tech corridor is where most of Sydney\u2019s product innovation happens. Startups here typically do not need a "data science team" \u2014 they need senior engineering help wiring Claude, GPT-4, or Gemini into a product that has to ship this quarter. We deliver exactly that: retrieval pipelines, agent workflows, evaluation harnesses, and the prompt-engineering craft that separates a demo from a production feature. Most engagements are fixed-scope sprints so teams can plan around them without burning runway.',
      },
      {
        heading: 'How we work with Sydney clients',
        body:
          'Most Sydney engagements blend remote async collaboration with occasional on-site workshops in the CBD, North Sydney, or Parramatta. We come on-site when change management benefits from being in the room; everything else is faster and cheaper remote. Expect a free 30-minute discovery call, a written scope in 48 hours, and first working output inside the first two weeks. No junior account managers, no 50-page strategy decks \u2014 you work directly with the engineer building your solution.',
      },
    ],
  },

  melbourne: {
    title: 'AI Consulting Melbourne',
    description: 'AI strategy and automation for Melbourne businesses. Manufacturing, professional services, creative industries \u2014 practical AI that works. Free consultation.',
    isCity: true,
    cityName: 'Melbourne',
    h1: 'AI Consulting Melbourne',
    intro: 'Melbourne\u2019s diverse economy \u2014 from Southbank creative agencies to Dandenong manufacturers \u2014 demands AI solutions that fit, not one-size-fits-all templates. We build and deploy AI systems tailored to how Melbourne businesses actually operate.',
    points: [
      { title: 'Manufacturing & Logistics', desc: 'Predictive maintenance, quality inspection, and supply chain optimisation for Melbourne\u2019s manufacturing corridor. Real-time insights, fewer defects.' },
      { title: 'Creative & Marketing', desc: 'AI content pipelines, campaign optimisation, and audience analytics for Melbourne\u2019s thriving creative sector. More output, same team.' },
      { title: 'Education & Research', desc: 'Automated admin, student communications, and research data processing for Melbourne\u2019s world-class universities and training providers.' },
      { title: 'Property & Construction', desc: 'AI-powered project scheduling, cost estimation, and compliance tracking for Melbourne\u2019s booming property development market.' },
    ],
    deepDive: [
      {
        heading: 'AI consulting for Melbourne\u2019s manufacturing corridor',
        body:
          'Melbourne\u2019s south-east manufacturing belt \u2014 Dandenong, Clayton, Bayswater, through to Geelong \u2014 is Australia\u2019s largest advanced manufacturing cluster. The AI that actually moves the needle here is not flashy: vision-based quality inspection on production lines, predictive maintenance on CNC and injection-moulding equipment, demand forecasting tied into ERP data (SAP, NetSuite, Pronto), and automated compliance paperwork for ISO 9001 audits. We specialise in low-friction deployments that run on your existing PLC/SCADA infrastructure without ripping out what already works.',
      },
      {
        heading: 'AI for Melbourne\u2019s creative, media, and marketing industry',
        body:
          'The Southbank and Cremorne agencies, production houses, and in-house marketing teams face the same pressure: more output, same team, tighter margins. Our creative-industry engagements cover AI-assisted copy pipelines tuned to brand voice, campaign-performance analysis across Meta and Google, image and video generation workflows, and agent-based research assistants that cut pitch-prep from days to hours. Tool-agnostic means we pick Claude for long-form, Midjourney or Flux for image, Runway or Veo for video \u2014 whatever delivers the best output for your brief.',
      },
      {
        heading: 'AI for Melbourne universities, TAFEs, and research institutes',
        body:
          'Melbourne has more top-tier universities and research institutes than any other Australian city. Our education-sector work covers automated student communications (enrolment triage, assessment feedback, support ticket routing), research-data processing pipelines, and admin automation that reclaims academic time for teaching. We are explicit about where AI is appropriate (admin, triage, summarisation) and where it is not (grading, academic integrity, clinical decisions).',
      },
      {
        heading: 'How we engage with Melbourne clients',
        body:
          'Most Melbourne engagements run primarily remote with occasional on-site days in the CBD, Southbank, or out to the eastern manufacturing suburbs when hands-on system access is required. We are happy to work from your office for workshops, training, and integration sprints \u2014 but we do not bill travel time on remote weeks. Discovery call is always free, scopes are fixed-price wherever possible, and you work directly with the engineer shipping the work.',
      },
    ],
  },

  brisbane: {
    title: 'AI Consulting Brisbane',
    description: 'AI consulting for Brisbane businesses. Strategy, automation, and implementation for Queensland\u2019s fastest-growing economy. Free consultation.',
    isCity: true,
    cityName: 'Brisbane',
    h1: 'AI Consulting Brisbane',
    intro: 'Brisbane is Queensland\u2019s economic engine and one of Australia\u2019s fastest-growing cities. From Fortitude Valley tech hubs to Northshore industrial precincts, we help Brisbane businesses deploy AI that scales with their growth.',
    points: [
      { title: 'Mining & Resources', desc: 'Predictive equipment maintenance, automated reporting, and safety compliance AI for Queensland\u2019s mining and resource sector. Reduce downtime, cut costs.' },
      { title: 'Tourism & Events', desc: 'Smart booking systems, demand forecasting, and automated guest communications \u2014 built for Brisbane\u2019s growing tourism and events industry ahead of 2032.' },
      { title: 'Trades & Services', desc: 'AI quoting, scheduling, and customer follow-ups for Brisbane tradies. Reclaim hours of admin every week without hiring extra staff.' },
      { title: 'Government & Infrastructure', desc: 'Document processing, citizen services automation, and project management AI for Brisbane\u2019s expanding public sector and infrastructure pipeline.' },
    ],
    deepDive: [
      {
        heading: 'AI consulting for Brisbane\u2019s tech and startup scene',
        body:
          'Fortitude Valley and Newstead have become Queensland\u2019s answer to Sydney\u2019s Surry Hills \u2014 a dense cluster of SaaS, fintech, and medtech startups that need to ship AI features without hiring an ML team. Our Brisbane tech engagements typically cover retrieval-augmented generation for product search, agent pipelines for customer success workflows, evaluation harnesses for prompt changes, and cost-control layering so AI spend stays predictable as traffic grows. Fixed-scope sprints so your runway planning stays intact.',
      },
      {
        heading: 'AI for Queensland mining and resources operators',
        body:
          'Brisbane is the head-office capital for Queensland\u2019s coal, gas, and critical minerals sectors \u2014 even though the extraction happens up in the Bowen Basin, Surat, and Galilee. We help operators close the gap between head-office data and mine-site reality with AI that processes shift reports, safety incidents, production logs, and compliance submissions at scale. Predictive maintenance on haul trucks and conveyors, automated incident triage, and natural-language interfaces over Pronto or Maximo are all common scope items.',
      },
      {
        heading: 'AI for Brisbane tradies and service businesses',
        body:
          'Brisbane\u2019s tradie economy runs on small, owner-operated businesses where the bottleneck is almost always admin \u2014 quoting, scheduling, invoicing, customer follow-ups. We help electricians, plumbers, HVAC specialists, and landscapers across the greater Brisbane metro deploy AI that handles those admin layers automatically. Voice-AI phone handling, SMS/WhatsApp quote-to-cash pipelines, and automated follow-ups that re-engage cold leads are all one-to-two-week sprints with immediate payback.',
      },
      {
        heading: 'Why Brisbane businesses choose us',
        body:
          'Most Brisbane businesses we talk to have been quoted $40K+ by a big-four consultancy for a "strategy assessment" that produces a PDF. That is not what we do. Our Brisbane engagements are engineering-led, fixed-scope, and ship working code. Remote-first with on-site days in the Valley, CBD, or out to industrial precincts when it genuinely helps. Free discovery call, written scope within 48 hours, first output in two weeks.',
      },
    ],
  },

  perth: {
    title: 'AI Consulting Perth',
    description: 'AI consulting Perth — strategy, implementation, and automation for WA businesses. Mining, oil & gas, professional services, agriculture. Free consultation.',
    isCity: true,
    cityName: 'Perth',
    h1: 'AI Consulting Perth',
    intro: 'Perth\u2019s economy runs on resources, energy, and the professional services that support them. We help Perth and Western Australian businesses deploy AI that handles the heavy lifting \u2014 from automated reporting in the CBD to predictive maintenance in the Pilbara. Two-hour time-zone offset from the east coast is an advantage, not a disadvantage: our async-first delivery model means WA teams get full AI consulting coverage without the AEDT scheduling tax.',
    points: [
      { title: 'Mining & Energy', desc: 'Predictive maintenance, safety compliance automation, and operational analytics for WA\u2019s mining and energy giants. AI that works in harsh environments \u2014 Pilbara, Goldfields, Mid West.' },
      { title: 'Oil & Gas Services', desc: 'Automated document processing, regulatory compliance, and supply chain optimisation for Perth\u2019s oil and gas service companies. NOPSEMA-aware, audit-ready.' },
      { title: 'Professional Services', desc: 'AI-powered proposal writing, client reporting, and knowledge management for Perth\u2019s legal, accounting, and consulting firms in the CBD and West Perth.' },
      { title: 'Agriculture & Food', desc: 'Yield forecasting, supply chain automation, and quality monitoring AI for WA\u2019s agricultural exporters and food processors \u2014 grains, livestock, wine, seafood.' },
    ],
    deepDive: [
      {
        heading: 'Why Perth businesses need a different AI consulting approach',
        body:
          'Perth\u2019s industry mix is unlike anywhere else in Australia. Resources and energy dominate, professional services cluster in the CBD to support them, and agriculture runs across a state the size of Western Europe. Off-the-shelf AI playbooks built for Sydney financial services or Melbourne manufacturing miss the mark here. We design AI implementations around the constraints that actually matter in WA: remote-site connectivity, FIFO rostering cycles, harsh-environment hardware, and regulatory regimes like NOPSEMA and the WA Work Health and Safety Act. Every engagement starts with a free readiness audit so the recommendation fits your operation, not a template.',
      },
      {
        heading: 'AI for Perth mining and the Pilbara',
        body:
          'Mining operators across the Pilbara, Goldfields-Esperance, and Mid West are already running AI in production \u2014 predictive maintenance on haul trucks, drill-and-blast optimisation, vision-based safety monitoring on conveyors, and automated ore-body modelling. We help mid-tier miners and service contractors catch up without buying a $10M platform. Most of what the majors run can be replicated with off-the-shelf models (Claude, GPT-4, Gemini) wired into your existing SCADA, Pronto, or Maximo data. Our deployments target specific, measurable outcomes: a 15\u201330% reduction in unplanned downtime, faster incident reporting, and automated compliance paperwork that previously consumed an FTE.',
      },
      {
        heading: 'AI for Perth professional services',
        body:
          'Perth\u2019s CBD and West Perth law, accounting, and consulting firms face the same billable-hour pressure as their east-coast peers \u2014 but with a smaller local talent pool. AI is the lever. We deploy document-review AI that cuts contract analysis time by 60\u201380%, proposal-generation pipelines that turn a scoping call into a formatted fee proposal in under an hour, and knowledge-management systems that make precedent files actually searchable. Tool-agnostic means we pick Claude, ChatGPT, or Copilot based on your Microsoft 365 or Google Workspace posture, not on vendor kickbacks.',
      },
      {
        heading: 'How we work with Perth clients remotely (and when we come on-site)',
        body:
          'Most of our Perth engagements run remotely: video discovery, async Slack or Teams collaboration, and shared cloud environments for deployment. This keeps costs down and iteration fast. For workshops, change-management sessions, and on-site technical deployments in Perth, Mandurah, Bunbury, or at remote mine sites, we fly in when it materially improves the outcome \u2014 not by default. Expect a transparent breakdown of what is remote and what is on-site in every proposal, with no hidden travel loading.',
      },
    ],
  },

  adelaide: {
    title: 'AI Consulting Adelaide',
    description: 'AI consulting for Adelaide businesses. Defence, manufacturing, wine, healthcare \u2014 AI solutions built for South Australia. Free consultation.',
    isCity: true,
    cityName: 'Adelaide',
    h1: 'AI Consulting Adelaide',
    intro: 'Adelaide is Australia\u2019s defence capital and a growing hub for advanced manufacturing, health innovation, and premium food and wine. We deploy AI solutions that help Adelaide businesses punch above their weight nationally and globally.',
    points: [
      { title: 'Defence & Aerospace', desc: 'Document classification, compliance automation, and project management AI for Adelaide\u2019s defence industry. Secure, auditable, built for government requirements.' },
      { title: 'Wine & Food Production', desc: 'Quality monitoring, yield prediction, and supply chain automation for Barossa, McLaren Vale, and Adelaide Hills producers.' },
      { title: 'Healthcare & Aged Care', desc: 'Patient scheduling, clinical documentation, and admin automation for Adelaide\u2019s health sector. More time for care, less time on paperwork.' },
      { title: 'Advanced Manufacturing', desc: 'AI-driven quality inspection, production scheduling, and predictive maintenance for SA\u2019s growing advanced manufacturing sector.' },
    ],
  },

  'gold-coast': {
    title: 'AI Consulting Gold Coast',
    description: 'AI consulting for Gold Coast businesses. Tourism, property, trades, hospitality \u2014 practical AI automation. Free consultation.',
    isCity: true,
    cityName: 'Gold Coast',
    h1: 'AI Consulting Gold Coast',
    intro: 'The Gold Coast isn\u2019t just beaches \u2014 it\u2019s one of Australia\u2019s fastest-growing business regions. From Broadbeach property developers to Burleigh trades businesses, we help Gold Coast companies automate operations and scale without adding headcount.',
    points: [
      { title: 'Tourism & Hospitality', desc: 'AI booking management, guest communications, and dynamic pricing for Gold Coast hotels, resorts, and experience operators. Handle peak seasons without the chaos.' },
      { title: 'Property & Development', desc: 'Automated feasibility analysis, document processing, and client communications for the Gold Coast\u2019s booming property market.' },
      { title: 'Health & Wellness', desc: 'Appointment scheduling, client follow-ups, and treatment plan automation for the Gold Coast\u2019s thriving health and wellness industry.' },
      { title: 'Trades & Home Services', desc: 'AI quoting, job scheduling, and review management for Gold Coast tradies. Stop losing weekends to admin work.' },
    ],
  },

  // ── INDUSTRIES ──────────────────────────────────────────

  manufacturing: {
    title: 'AI for Manufacturing',
    description: 'AI-powered quality inspection, predictive maintenance, and production scheduling for Australian manufacturers. Cut defects, reduce downtime. Free consultation.',
    h1: 'AI for Manufacturing',
    intro: 'Australian manufacturers face rising costs, skills shortages, and global competition. AI doesn\u2019t replace your workforce \u2014 it makes every shift smarter. We deploy practical AI into production environments that delivers ROI within weeks, not years.',
    points: [
      { title: 'Automated Quality Inspection', desc: 'Computer vision systems that catch defects humans miss. One client cut QA processing time by 62% while pushing defect detection to 99.2%.' },
      { title: 'Predictive Maintenance', desc: 'Stop fixing things after they break. AI analyses sensor data to predict equipment failures before they happen, reducing unplanned downtime by up to 40%.' },
      { title: 'Production Scheduling', desc: 'AI-optimised scheduling that balances machine capacity, material availability, and order priorities. Less idle time, higher throughput, fewer bottlenecks.' },
      { title: 'Supply Chain Intelligence', desc: 'Demand forecasting, supplier risk scoring, and inventory optimisation. Know what you need before you need it.' },
    ],
  },

  'professional-services': {
    title: 'AI for Professional Services',
    description: 'AI-augmented proposals, document review, and client management for law firms, accountants, and consultancies. More billable hours. Free consultation.',
    h1: 'AI for Professional Services',
    intro: 'Law firms, accounting practices, and consultancies run on expertise \u2014 but too much time goes to admin, document prep, and repetitive tasks. We deploy AI that handles the grunt work so your team bills more hours on actual client work.',
    points: [
      { title: 'Proposal & Pitch Generation', desc: 'AI that drafts proposals, tenders, and pitch documents using your firm\u2019s past work, tone, and win patterns. One client tripled proposal output with an 18% higher win rate.' },
      { title: 'Document Review & Analysis', desc: 'Contract review, compliance checking, and document summarisation at machine speed. Process in minutes what used to take hours.' },
      { title: 'Client Communications', desc: 'Automated status updates, meeting summaries, and follow-up emails that sound like your best partner wrote them. Clients stay informed without your team doing the chasing.' },
      { title: 'Knowledge Management', desc: 'AI-powered search across your firm\u2019s documents, precedents, and past advice. Find the right answer in seconds instead of asking around the office.' },
    ],
  },

  trades: {
    title: 'AI for Trades Businesses',
    description: 'AI automation for quoting, scheduling, and customer communications. Built for Australian tradies. Reclaim 8+ hours per week. Free consultation.',
    h1: 'AI for Trades Businesses',
    intro: 'You got into the trades to do the work, not spend your evenings on quotes and admin. We build AI systems specifically for trades businesses \u2014 electricians, plumbers, builders, HVAC, landscapers \u2014 that handle the back-office so you can stay on the tools.',
    points: [
      { title: 'Smart Quoting', desc: 'AI that generates accurate quotes from job photos and descriptions. Factor in materials, labour, travel, and margin automatically. Send quotes same-day instead of next week.' },
      { title: 'Automated Scheduling', desc: 'AI manages your calendar, handles rebookings, and optimises routes. One tradie client reclaimed 8+ hours per week of admin time with 96% customer satisfaction.' },
      { title: 'Customer Follow-ups', desc: 'Automated review requests, maintenance reminders, and follow-up messages that keep customers coming back. No more forgetting to chase that five-star review.' },
      { title: 'Invoice & Payment Chasing', desc: 'AI-generated invoices sent automatically when jobs complete, with smart payment reminders that get you paid faster without awkward conversations.' },
    ],
  },

  healthcare: {
    title: 'AI for Healthcare',
    description: 'AI scheduling, clinical documentation, and admin automation for Australian healthcare providers. More patient time, less paperwork. Free consultation.',
    h1: 'AI for Healthcare',
    intro: 'Healthcare professionals spend up to 40% of their time on administrative tasks. We deploy AI that handles scheduling, documentation, and patient communications \u2014 so clinicians can focus on what they trained for: patient care.',
    points: [
      { title: 'Clinical Documentation', desc: 'AI-assisted note-taking, referral letter drafting, and discharge summaries. Reduce documentation time by 50% while maintaining accuracy and compliance.' },
      { title: 'Smart Scheduling', desc: 'AI that optimises appointment booking, manages cancellations, and fills gaps automatically. Reduce no-shows with intelligent reminders and waitlist management.' },
      { title: 'Patient Communications', desc: 'Automated appointment confirmations, pre-visit instructions, and post-visit follow-ups. Keep patients informed without adding to reception workload.' },
      { title: 'Admin & Billing Automation', desc: 'Medicare claiming, private health fund processing, and accounts receivable automation. Less time on billing, fewer rejected claims.' },
    ],
  },

  retail: {
    title: 'AI for Retail & E-commerce',
    description: 'AI inventory forecasting, customer service automation, and marketing intelligence for Australian retailers. Sell smarter. Free consultation.',
    h1: 'AI for Retail & E-commerce',
    intro: 'Australian retail is squeezed between rising costs and demanding customers who expect instant responses. AI helps you sell smarter \u2014 forecasting demand, automating customer service, and personalising marketing at scale.',
    points: [
      { title: 'Demand Forecasting', desc: 'AI that predicts what will sell, when, and where. Reduce overstock by up to 30% and stockouts by 25%. No more guessing what to order.' },
      { title: 'Customer Service Automation', desc: 'AI chatbots and email triage that handle 70% of customer enquiries instantly \u2014 returns, tracking, product questions \u2014 while escalating the complex ones to your team.' },
      { title: 'Personalised Marketing', desc: 'AI-driven product recommendations, email campaigns, and ad targeting based on actual customer behaviour. Higher conversion rates, lower acquisition costs.' },
      { title: 'Pricing Intelligence', desc: 'Dynamic pricing and competitor monitoring that keeps you competitive without a manual spreadsheet. AI adjusts recommendations based on demand, margin, and market conditions.' },
    ],
  },

  finance: {
    title: 'AI for Finance & Accounting',
    description: 'AI document processing, compliance automation, and financial analysis for Australian finance teams. Faster closes, fewer errors. Free consultation.',
    h1: 'AI for Finance & Accounting',
    intro: 'Finance teams drown in documents, reconciliations, and compliance requirements. We deploy AI that processes invoices, flags anomalies, and automates reporting \u2014 so your team focuses on analysis and strategy instead of data entry.',
    points: [
      { title: 'Document Processing', desc: 'AI extraction from invoices, receipts, bank statements, and contracts. Process thousands of documents per day with 99%+ accuracy. No more manual data entry.' },
      { title: 'Compliance & Audit', desc: 'Automated compliance checking against ATO requirements, industry regulations, and internal policies. Continuous monitoring, not annual scrambles.' },
      { title: 'Financial Reporting', desc: 'AI-generated management reports, variance analysis, and cash flow forecasting. Close the books faster with fewer errors and better insights.' },
      { title: 'Fraud & Anomaly Detection', desc: 'Machine learning models that flag unusual transactions, duplicate payments, and policy violations in real time. Catch issues before they become problems.' },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(LANDING_PAGES).map((slug) => ({ slug }));
}

// Only the statically generated slugs render; any other slug 404s. Prevents
// unknown /for/* URLs from rendering a generic page that Google would flag as
// duplicate of the homepage.
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = LANDING_PAGES[slug];
  if (!page) return { title: 'Agentic Consciousness \u2014 AI Consulting Australia' };
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `https://agenticconsciousness.com.au/for/${slug}` },
    openGraph: {
      title: `${page.title} | Agentic Consciousness`,
      description: page.description,
      type: 'website',
      locale: 'en_AU',
      images: [{ url: 'https://agenticconsciousness.com.au/opengraph-image', width: 1200, height: 630 }],
    },
  };
}

function buildLandingSchema(slug: string) {
  const page = LANDING_PAGES[slug];
  if (!page) return [];

  const breadcrumb = {
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
        name: page.title,
        item: `https://agenticconsciousness.com.au/for/${slug}`,
      },
    ],
  };

  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: page.title,
    description: page.description,
    url: `https://agenticconsciousness.com.au/for/${slug}`,
    provider: {
      '@type': 'Organization',
      '@id': 'https://agenticconsciousness.com.au/#organization',
      name: 'Agentic Consciousness',
    },
    areaServed: page.isCity
      ? { '@type': 'City', name: page.cityName }
      : { '@type': 'Country', name: 'Australia' },
    serviceType: 'AI Consulting',
  };

  return [breadcrumb, service];
}

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = LANDING_PAGES[slug];
  if (!page) {
    const { notFound } = await import('next/navigation');
    notFound();
  }

  const schemas = buildLandingSchema(slug);

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <Nav />
      <main id="main-content">
        {/* ── Unique hero section ── */}
        <section className="min-h-[70vh] flex flex-col justify-center pt-32 pb-16 px-10 relative max-md:px-5 max-md:pt-28 max-md:pb-12">
          <div className="absolute top-[60px] right-0 w-[40%] h-[70%] bg-gradient-to-b from-ac-red-glow to-transparent pointer-events-none" />

          <ScrollReveal>
            <div className="flex gap-2 mb-8 flex-wrap">
              <span className="text-[0.8rem] max-sm:text-xs font-black tracking-[2.5px] uppercase py-[0.35rem] px-[0.9rem] bg-ac-red text-white">
                {page.isCity ? `AI FOR / ${page.cityName!.toUpperCase()}` : page.title.toUpperCase()}
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.05}>
            <h1 className="font-display font-black leading-[0.92] tracking-brutal mb-8 text-[clamp(2.5rem,7vw,5.5rem)] text-text-primary">
              {page.h1}
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <p className="text-[1.1rem] text-text-dim font-light leading-[1.8] max-w-[720px] mb-10">
              {page.intro}
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="flex gap-4 max-sm:flex-col">
              <Link
                href="/#contact"
                className="inline-block font-display text-[0.85rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 bg-ac-red text-white hover:bg-white hover:text-[#0a0a0a]"
              >
                Free consultation &rarr;
              </Link>
              <Link
                href="/#services"
                className="inline-block font-display text-[0.85rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 bg-transparent border-2 border-ac-red text-ac-red hover:bg-ac-red hover:text-white"
              >
                See services
              </Link>
            </div>
          </ScrollReveal>
        </section>

        <Divider />

        {/* ── Unique selling points ── */}
        <section aria-label="Key benefits" className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20">
          <ScrollReveal>
            <div className="max-w-[1200px] mx-auto">
              <div className="flex justify-between items-end mb-14 gap-8 flex-wrap">
                <div>
                  <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase text-ac-red mb-3">
                    {page.isCity ? `WHY ${page.cityName!.toUpperCase()}` : 'WHY US'}
                  </div>
                  <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none text-text-primary">
                    {page.isCity ? `AI built for ${page.cityName}.` : 'Built for your industry.'}
                  </h2>
                </div>
                <div className="text-[0.95rem] text-text-dim max-w-[400px] font-light leading-[1.7]">
                  {page.isCity
                    ? `We understand ${page.cityName}\u2019s business landscape. Here\u2019s how AI fits in.`
                    : 'Specific problems need specific solutions. Here\u2019s what we solve.'}
                </div>
              </div>

              <div className="grid gap-[2px] bg-border-subtle grid-cols-4 max-[1100px]:grid-cols-2 max-sm:grid-cols-1">
                {page.points.map((point, i) => (
                  <div
                    key={point.title}
                    className="bg-ac-card p-10 relative transition-colors duration-200 hover:bg-ac-card-hover"
                    style={{
                      borderTop: `3px solid ${
                        i === 0 ? '#ff3d00' : i === 1 ? 'rgba(255,61,0,0.6)' : i === 2 ? 'rgba(255,61,0,0.35)' : 'rgba(255,61,0,0.2)'
                      }`,
                    }}
                  >
                    <div className="text-[4rem] font-black text-[var(--ghost-number)] leading-none mb-4">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <h3 className="text-[1.15rem] font-black text-text-primary tracking-snug mb-3">
                      {point.title}
                    </h3>
                    <p className="text-[0.85rem] text-text-dim leading-[1.7] font-light">
                      {point.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>

        {page.deepDive && page.deepDive.length > 0 && (
          <>
            <Divider />
            <section
              aria-label="Deep dive"
              className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20"
            >
              <div className="max-w-[820px] mx-auto flex flex-col gap-14">
                {page.deepDive.map((section) => (
                  <ScrollReveal key={section.heading}>
                    <h2 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-black tracking-tight leading-[1.15] text-text-primary mb-5">
                      {section.heading}
                    </h2>
                    <p className="text-[1.05rem] text-text-dim font-light leading-[1.8]">
                      {section.body}
                    </p>
                  </ScrollReveal>
                ))}
              </div>
            </section>
          </>
        )}

        <Divider />
        <Services />
        <Divider />
        <Process />
        <Divider />
        <CTA />
      </main>
      <Footer />
      <ChatbotWrapper />
    </>
  );
}

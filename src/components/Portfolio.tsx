import ScrollReveal from '@/components/ScrollReveal';
import GlitchTitle from '@/components/GlitchTitle';
import Image from 'next/image';

interface Project {
  name: string;
  slug: string;
  url: string;
  displayUrl: string;
  tagline: string;
  description: string;
  stack: string[];
  year: string;
}

const PROJECTS: Project[] = [
  {
    name: 'ReachPilot',
    slug: 'reachpilot',
    url: 'https://www.reachpilot.com.au',
    displayUrl: 'reachpilot.com.au',
    tagline: 'AI Social Media Scheduling & Marketing Automation',
    description:
      'Multi-platform AI marketing SaaS. One AI writes posts in your brand voice, schedules them across 9 platforms, and learns what converts. Built end-to-end — Next.js, Claude, Stripe, Postgres.',
    stack: ['Next.js', 'Claude', 'Stripe', 'Postgres'],
    year: '2026',
  },
  {
    name: 'SaaSValidatr',
    slug: 'saasvalidatr',
    url: 'https://saasvalidatr.com',
    displayUrl: 'saasvalidatr.com',
    tagline: 'AI-Powered Idea Validation for Small Teams',
    description:
      'Anonymous team voting plus AI scoring for SaaS ideas in under 30 seconds. Kills groupthink and cargo-cult prioritisation. Production: Vercel, Neon Postgres, Claude for scoring.',
    stack: ['Next.js', 'Claude', 'Neon', 'Vercel'],
    year: '2026',
  },
  {
    name: 'SellMyOwnHome',
    slug: 'sellmyownhome',
    url: 'https://sellmyownhome.ai',
    displayUrl: 'sellmyownhome.ai',
    tagline: 'AI For-Sale-By-Owner Platform for Australia',
    description:
      'Private property sales without the agent commission. AI generates listings, analyses photos, drafts floorplans, and handles state-specific compliance paperwork. Built for Australian homeowners who want to run their own sale.',
    stack: ['Next.js', 'Claude', 'Vision AI', 'Stripe'],
    year: '2025',
  },
  {
    name: 'AIMarketWire',
    slug: 'aimarketwire',
    url: 'https://aimarketwire.ai',
    displayUrl: 'aimarketwire.ai',
    tagline: 'AI Trading News & Market Analysis',
    description:
      'Real-time market analysis with AI-generated commentary and signal detection. Streaming financial data ingested, summarised, and delivered as actionable briefings. High-volume production pipeline.',
    stack: ['Next.js', 'Claude', 'Streaming'],
    year: '2026',
  },
  {
    name: 'Flat White Index',
    slug: 'flatwhiteindex',
    url: 'https://flatwhiteindex.com.au',
    displayUrl: 'flatwhiteindex.com.au',
    tagline: 'AI-Tracked Flat White Prices Across Sydney',
    description:
      'An economic indicator with a sense of humour. An AI voice agent named Mia actually rings Sydney cafes to collect live flat white prices, then maps the data. Real AI voice calls, real caffeine inflation.',
    stack: ['Next.js', 'AI Voice', 'Google Places'],
    year: '2026',
  },
  {
    name: 'Plant Planner',
    slug: 'plantplanner',
    url: 'https://plantplanner.com.au',
    displayUrl: 'plantplanner.com.au',
    tagline: 'Free Vegetable Garden Planner for Australia',
    description:
      'AI-powered planting calendar for every Australian climate zone. Proof that AI can solve highly specific local problems without a trillion-dollar lab. Free forever, no signup.',
    stack: ['Next.js', 'Claude', 'BOM data'],
    year: '2026',
  },
  {
    name: 'Printforge CRM',
    slug: 'printforge-crm',
    url: 'https://crm.printforge.com.au',
    displayUrl: 'crm.printforge.com.au',
    tagline: 'Business Management Platform for 3D Print Shops',
    description:
      'Cloud CRM built for 3D printing businesses. Handles quoting, cost calculation, job tracking, and invoicing with Claude drafting descriptions and pricing automation. Integrates Shopify, Xero, and Google Drive.',
    stack: ['Next.js', 'Claude', 'Shopify', 'Xero'],
    year: '2025',
  },
  {
    name: 'Printforge',
    slug: 'printforge',
    url: 'https://www.printforge.com.au',
    displayUrl: 'printforge.com.au',
    tagline: 'Custom 3D Printing for Australian Makers & Tradies',
    description:
      'Daniel\u2019s 3D printing studio. Not AI-built end-to-end but fully AI-operated \u2014 automation handles inventory, pricing, customer comms, and design iteration. The lab where we test everything.',
    stack: ['Shopify', 'Bambu Lab', 'Home Assistant'],
    year: '2024',
  },
];

export default function Portfolio() {
  return (
    <section
      id="portfolio"
      aria-label="Portfolio"
      className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20"
    >
      <ScrollReveal>
        <div className="max-w-[1200px] mx-auto">
          <div className="flex justify-between items-end mb-14 gap-8 flex-wrap">
            <div>
              <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase text-ac-red mb-3">
                004 / PORTFOLIO
              </div>
              <GlitchTitle>
                <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none">
                  We build what we sell.
                </h2>
              </GlitchTitle>
            </div>
            <div className="text-[0.95rem] text-text-dim max-w-[440px] font-light leading-[1.7]">
              Every one of these is a live production product we designed, shipped, and operate. Most AI consultants have slide decks. These are working apps you can use right now.
            </div>
          </div>

          <div className="grid grid-cols-3 gap-[2px] bg-border-subtle max-md:grid-cols-2 max-sm:grid-cols-1">
            {PROJECTS.map((p, i) => {
              const isHero = i === 0 || i === PROJECTS.length - 1;
              return (
              <a
                key={p.slug}
                href={p.url}
                target="_blank"
                rel="noopener"
                className={`group flex flex-col bg-ac-card transition-colors duration-200 hover:bg-ac-card-hover no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ac-red ${isHero ? 'col-span-full' : ''}`}
              >
                <div
                  className={`relative overflow-hidden border-b-2 border-ac-red ${
                    isHero
                      ? 'aspect-[21/9] max-sm:aspect-[16/10]'
                      : 'aspect-[4/3] max-sm:aspect-[16/10]'
                  }`}
                >
                  <Image
                    src={`/portfolio/${p.slug}.webp`}
                    alt={`${p.name} \u2014 ${p.tagline}`}
                    fill
                    sizes={
                      isHero
                        ? '(min-width: 1024px) 1200px, 100vw'
                        : '(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw'
                    }
                    priority={i === 0}
                    className="object-cover object-top transition-transform duration-[600ms] ease-out group-hover:scale-[1.02]"
                  />
                  <div className="absolute top-3 left-3 font-mono text-[0.65rem] tracking-[2px] uppercase text-white bg-ac-red py-[2px] px-[6px]">
                    LIVE
                  </div>
                  <div className="absolute top-3 right-3 font-mono text-[0.65rem] tracking-[2px] uppercase text-white/80 bg-black/60 py-[2px] px-[6px]">
                    {p.year}
                  </div>
                </div>
                <div className="p-5 max-sm:p-4 flex flex-col flex-1">
                  <div className="flex justify-between items-baseline gap-3 mb-1 max-sm:flex-col max-sm:items-start max-sm:gap-[2px]">
                    <h3 className="text-[1.05rem] font-black text-text-primary tracking-snug leading-tight">
                      {p.name}
                    </h3>
                    <span className="font-mono text-[0.7rem] tracking-[1.5px] text-text-dim shrink-0">
                      {p.displayUrl} &rarr;
                    </span>
                  </div>
                  <div className="font-mono text-[0.68rem] tracking-[2px] uppercase text-ac-red mb-2">
                    {p.tagline}
                  </div>
                  <p className="text-[0.82rem] text-text-dim font-light leading-[1.6] mb-3 line-clamp-3 flex-1">
                    {p.description}
                  </p>
                  <div className="flex gap-[4px] flex-wrap">
                    {p.stack.map((s) => (
                      <span
                        key={s}
                        className="font-mono text-[0.62rem] tracking-[1.5px] uppercase text-text-dim border border-border-subtle py-[2px] px-[5px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </a>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <p className="text-text-dim text-[0.85rem] font-light">
              Want to see something specific? Ask the chatbot, or{' '}
              <a href="#contact" className="text-ac-red no-underline hover:underline">
                book a free discovery call
              </a>
              .
            </p>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

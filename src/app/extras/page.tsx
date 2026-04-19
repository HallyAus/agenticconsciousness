import type { Metadata } from 'next';
import Link from 'next/link';
import EmailLink from '@/components/EmailLink';

export const metadata: Metadata = {
  title: 'Website Sprint Extras \u2014 Integrations & Add-ons',
  description: 'Add integrations, extra pages, e-commerce, booking, CMS, analytics and more to the $999 Lightning Website Sprint. Flat-rate add-ons, no subscriptions, no agency markup.',
  alternates: { canonical: 'https://agenticconsciousness.com.au/extras' },
  openGraph: {
    title: 'Website Sprint Extras',
    description: 'Add integrations, extra pages, e-commerce, booking, CMS, analytics and more to the $999 Lightning Website Sprint.',
    url: 'https://agenticconsciousness.com.au/extras',
    type: 'website',
    images: [{ url: 'https://agenticconsciousness.com.au/opengraph-image', width: 1200, height: 630 }],
  },
};

interface Extra {
  name: string;
  price: string;
  description: string;
  category: 'Pages' | 'Commerce' | 'Content' | 'Integrations' | 'Analytics' | 'Design';
}

const extras: Extra[] = [
  // Pages
  {
    name: 'Extra page',
    price: '$100',
    description: 'Per additional page beyond the 3 included. Copy, design, responsive layout, schema. Order as many as you need.',
    category: 'Pages',
  },
  {
    name: 'Blog / CMS',
    price: '$400',
    description: 'Admin UI for posting articles, draft/publish workflow, author profiles, RSS, category pages, Article schema.',
    category: 'Pages',
  },
  {
    name: 'Multi-language',
    price: '$300',
    description: 'English plus one additional language. Language switcher, localised metadata, hreflang tags, translated copy.',
    category: 'Pages',
  },

  // Commerce
  {
    name: 'Stripe checkout',
    price: '$300',
    description: 'Accept card payments for a single product, donation, or booking. Live Stripe integration, GST line item, tax invoice emails.',
    category: 'Commerce',
  },
  {
    name: 'E-commerce catalog',
    price: '$500',
    description: 'Up to 20 products with categories, product images, inventory, Stripe checkout, and order notification emails.',
    category: 'Commerce',
  },
  {
    name: 'Booking / calendar',
    price: '$200',
    description: 'Cal.com or Calendly embedded for clients to self-book. Timezone-aware, confirmation emails, Google Calendar sync.',
    category: 'Commerce',
  },
  {
    name: 'User accounts + auth',
    price: '$500',
    description: 'Email/password or magic-link authentication, protected pages, password reset. Neon Postgres + Auth.js.',
    category: 'Commerce',
  },

  // Content
  {
    name: 'Contact form + auto-reply',
    price: '$150',
    description: 'Validated form, anti-spam, auto-reply email to the visitor, forward to your inbox. Stored in Neon for history.',
    category: 'Content',
  },
  {
    name: 'Copywriting beyond 3 pages',
    price: '$100',
    description: 'Per additional page of bespoke copy \u2014 researched, drafted, edited. Keeps your brand voice consistent across every page.',
    category: 'Content',
  },

  // Integrations
  {
    name: 'Email accounts (Google Workspace)',
    price: '$200',
    description: 'Set up Google Workspace, configure DNS, create up to 3 email accounts (e.g. hello@, accounts@). Annual licence billed by Google direct.',
    category: 'Integrations',
  },
  {
    name: 'Custom domain + DNS',
    price: '$100',
    description: 'Point your domain at the site, set up Cloudflare, configure SSL, handle any DNS quirks. Domain registration billed direct.',
    category: 'Integrations',
  },
  {
    name: 'AI chatbot deep training',
    price: '$300',
    description: 'Load your docs, FAQs, product catalogue, and policies into a Claude Project. Chatbot answers from your actual content, not generic Claude.',
    category: 'Integrations',
  },

  // Analytics
  {
    name: 'Google Analytics 4 + Tag Manager',
    price: '$150',
    description: 'GA4 install, GTM container, conversion events, e-commerce tracking if commerce is in scope.',
    category: 'Analytics',
  },
  {
    name: 'PostHog product analytics',
    price: '$150',
    description: 'PostHog session replay, autocapture, funnel definitions, and a pre-built dashboard for your core conversion events.',
    category: 'Analytics',
  },
  {
    name: 'SEO deep optimisation',
    price: '$250',
    description: 'Keyword research, on-page optimisation beyond schema basics, sitemap tuning, llms.txt, internal linking map.',
    category: 'Analytics',
  },

  // Design
  {
    name: 'Advanced design polish',
    price: '$400',
    description: 'Custom animations, scroll-driven interactions, bespoke iconography, Lottie micro-animations, refined type scale.',
    category: 'Design',
  },
];

const categories: Array<Extra['category']> = ['Pages', 'Commerce', 'Content', 'Integrations', 'Analytics', 'Design'];

export default function ExtrasPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://agenticconsciousness.com.au' },
      { '@type': 'ListItem', position: 2, name: 'Extras', item: 'https://agenticconsciousness.com.au/extras' },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <main className="pt-[60px] min-h-screen">
        <section className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20">
          <div className="max-w-[1200px] mx-auto">

            {/* Hero */}
            <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
              EXTRAS
            </div>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none mb-4 text-text-primary">
              Add what you need.
            </h1>
            <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] max-w-[680px] mb-4">
              The $999 Lightning Website Sprint covers a 3-page mobile-first site with Claude chatbot, SEO,
              accessibility, and deployment. Everything below is an optional add-on \u2014 flat-rate, fixed-scope,
              no subscriptions, no agency markup. Pick the ones that match your actual business.
            </p>
            <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] max-w-[680px] mb-16">
              Not sure which you need? Book the free discovery call \u2014 Daniel will scope exactly the right set
              against your brief in under 30 minutes.
            </p>

            {/* Category sections */}
            {categories.map((cat) => {
              const items = extras.filter((e) => e.category === cat);
              return (
                <div key={cat} className="mb-16">
                  <div
                    className="font-mono text-[0.78rem] max-sm:text-xs tracking-[3px] uppercase mb-6 pb-3"
                    style={{ color: 'var(--red-text)', borderBottom: '2px solid var(--red)' }}
                  >
                    {cat}
                  </div>
                  <div className="grid grid-cols-3 gap-[2px] max-md:grid-cols-2 max-sm:grid-cols-1" style={{ background: 'var(--bg-gap)' }}>
                    {items.map((item) => (
                      <div
                        key={item.name}
                        className="p-6 flex flex-col"
                        style={{ background: 'var(--bg-card)' }}
                      >
                        <div className="flex justify-between items-baseline gap-3 mb-3">
                          <h3 className="text-[1rem] font-black text-text-primary tracking-snug leading-tight">
                            {item.name}
                          </h3>
                          <div className="font-black text-[1.2rem] shrink-0" style={{ color: 'var(--red-text)' }}>
                            {item.price}
                          </div>
                        </div>
                        <p className="text-[0.82rem] text-text-dim font-light leading-[1.6]">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Bundle discount hint */}
            <div
              className="pl-6 mb-16"
              style={{ borderLeft: '2px solid var(--red)' }}
            >
              <div className="font-mono text-[0.72rem] tracking-[2px] uppercase mb-2" style={{ color: 'var(--red-text)' }}>
                Bundle discount
              </div>
              <p className="text-[0.95rem] text-text-dim font-light leading-[1.75] max-w-[640px]">
                Book the $999 sprint plus any 3 extras in one go and we&apos;ll knock 10% off the total.
                Mention it in the discovery call or email <EmailLink className="no-underline hover:underline" source="extras_bundle" style={{ color: 'var(--red-text)' }} />.
              </p>
            </div>

            {/* Closing CTA */}
            <div className="pt-10 border-t border-border-subtle text-center">
              <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] max-w-[560px] mx-auto mb-6">
                All prices in AUD, plus GST. Every add-on ships inside the same 48-hour sprint window if
                scoped up front, or billed separately if added after launch.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link
                  href="/#launch-offer"
                  className="inline-block font-display text-[0.85rem] max-sm:text-xs font-black tracking-[2px] uppercase py-4 px-10 text-white no-underline transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--red)]"
                  style={{ background: 'var(--red)' }}
                >
                  Book the $999 sprint &rarr;
                </Link>
                <Link
                  href="/#contact"
                  className="inline-block font-display text-[0.85rem] max-sm:text-xs font-black tracking-[2px] uppercase py-4 px-8 no-underline transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--red)]"
                  style={{ border: '2px solid var(--red)', color: 'var(--red-text)' }}
                >
                  Ask first &rarr;
                </Link>
              </div>
            </div>

          </div>
        </section>
      </main>
    </>
  );
}

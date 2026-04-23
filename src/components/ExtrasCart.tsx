'use client';

import { useState, useEffect } from 'react';
import posthog from 'posthog-js';
import { trackEvent } from '@/lib/tracking';
import { captureRefFromUrl, getStoredRef } from '@/lib/referral';

interface Item {
  id: string;
  name: string;
  price: number;        // AUD dollars (integer)
  category: 'Sprint' | 'Pages' | 'Commerce' | 'Content' | 'Integrations' | 'Analytics' | 'Design';
  tagline: string;
  description: string;
}

const SPRINT: Item = {
  id: 'website-sprint',
  name: 'Lightning Website Sprint',
  price: 999,
  category: 'Sprint',
  tagline: '48-hour delivery · 3 pages · Claude chatbot · or your money back',
  description: 'Mobile-first, AI-optimised 3-page website with Core Web Vitals tuning, WCAG AA accessibility, SEO + schema, and Claude chatbot trained on your content. Shipped in 48 hours from signed brief, or full refund.',
};

const EXTRAS: Item[] = [
  { id: 'extra-page',          category: 'Pages',        price: 100, name: 'Extra page',                tagline: 'Per additional page beyond the 3 included', description: 'Copy, design, responsive layout, schema. Order as many as you need.' },
  { id: 'blog-cms',            category: 'Pages',        price: 400, name: 'Blog / CMS',                tagline: 'Admin UI for posting articles',              description: 'Draft/publish workflow, author profiles, RSS, category pages, Article schema.' },
  { id: 'multi-language',      category: 'Pages',        price: 300, name: 'Multi-language',            tagline: 'English plus one additional language',       description: 'Language switcher, localised metadata, hreflang tags, translated copy.' },

  { id: 'stripe-integration',  category: 'Commerce',     price: 300, name: 'Stripe checkout',           tagline: 'Accept card payments for a product or donation', description: 'Live Stripe integration, GST line item, tax invoice emails.' },
  { id: 'ecommerce-catalog',   category: 'Commerce',     price: 500, name: 'E-commerce catalog',        tagline: 'Up to 20 products with categories',          description: 'Product images, inventory, Stripe checkout, order notification emails.' },
  { id: 'booking-integration', category: 'Commerce',     price: 200, name: 'Booking / calendar',        tagline: 'Cal.com or Calendly embedded',               description: 'Timezone-aware, confirmation emails, Google Calendar sync.' },
  { id: 'auth-integration',    category: 'Commerce',     price: 500, name: 'User accounts + auth',      tagline: 'Email/password or magic-link auth',          description: 'Protected pages, password reset. Neon Postgres + Auth.js.' },

  { id: 'contact-form',        category: 'Content',      price: 150, name: 'Contact form + auto-reply', tagline: 'Validated form with spam protection',        description: 'Auto-reply email to the visitor, forward to your inbox, stored in Neon for history.' },
  { id: 'extra-copywriting',   category: 'Content',      price: 100, name: 'Copywriting per extra page',tagline: 'Per additional page of bespoke copy',        description: 'Researched, drafted, edited — keeps your brand voice consistent across every page.' },

  { id: 'chatbot-training',    category: 'Integrations', price: 300, name: 'AI chatbot deep training',  tagline: 'Claude trained on your actual content',      description: 'Loads your docs, FAQs, product catalogue, and policies into a Claude Project. Chatbot answers from your real content, not generic Claude.' },

  { id: 'ga4-gtm',             category: 'Analytics',    price: 150, name: 'Google Analytics 4 + GTM',  tagline: 'GA4 install with conversion events',         description: 'Tag Manager container, e-commerce tracking if commerce is in scope.' },
  { id: 'posthog-setup',       category: 'Analytics',    price: 150, name: 'PostHog product analytics', tagline: 'Session replay, autocapture, funnels',       description: 'Pre-built dashboard for your core conversion events.' },
  { id: 'seo-deep',            category: 'Analytics',    price: 250, name: 'SEO deep optimisation',     tagline: 'Keyword research + on-page tuning',          description: 'Beyond schema basics: sitemap tuning, llms.txt, internal linking map.' },

  { id: 'design-polish',       category: 'Design',       price: 400, name: 'Advanced design polish',    tagline: 'Custom animations & micro-interactions',     description: 'Scroll-driven interactions, bespoke iconography, Lottie micro-animations, refined type scale.' },
];

const CATEGORY_ORDER: Array<Item['category']> = ['Pages', 'Commerce', 'Content', 'Integrations', 'Analytics', 'Design'];

function formatAud(dollars: number) {
  return '$' + dollars.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatAudDecimal(dollars: number) {
  return '$' + dollars.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ExtrasCart() {
  const [selected, setSelected] = useState<Set<string>>(new Set(['website-sprint']));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = captureRefFromUrl();
    if (ref) {
      trackEvent('ReferralVisit', { ref, page: 'extras_cart' });
    }
  }, []);

  function toggle(id: string) {
    // Base Sprint is required for the 48h delivery guarantee — locked on.
    // Allowing it to be unchecked produced a "Pick at least one item"
    // disabled-button dead-end that contradicted the "Required" label.
    if (id === SPRINT.id) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const ALL = [SPRINT, ...EXTRAS];
  const selectedItems = ALL.filter((i) => selected.has(i.id));
  const subtotal = selectedItems.reduce((s, i) => s + i.price, 0);
  const gst = Math.round(subtotal * 0.1 * 100) / 100;
  const total = subtotal + gst;
  const count = selected.size;

  async function handleCheckout() {
    if (count === 0) return;
    setSubmitting(true);
    setError(null);
    trackEvent('InitiateCheckout', {
      content_name: 'website-sprint-cart',
      num_items: count,
      total_aud: total,
    });

    try {
      const ref = getStoredRef();
      // Thread the PostHog distinct_id through Stripe metadata so the
      // server-side Purchase event stitches to the client-side funnel.
      const phDistinctId = (() => {
        try { return posthog?.get_distinct_id?.() ?? ''; } catch { return ''; }
      })();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageIds: Array.from(selected), ref, phDistinctId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Checkout unavailable — email ai@agenticconsciousness.com.au');
        setSubmitting(false);
      }
    } catch {
      setError('Network error — please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-36">
      <section className="py-20 px-10 max-md:px-5 max-sm:px-4 max-sm:py-14">
        <div className="max-w-[1200px] mx-auto">

          {/* Hero */}
          <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
            BUILD YOUR SPRINT
          </div>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none mb-4 text-text-primary">
            Add what you need.
          </h1>
          <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] max-w-[680px] mb-3">
            The $999 Lightning Website Sprint covers a 3-page mobile-first site with Claude chatbot, SEO, accessibility, and deployment. Everything below is an optional add-on &mdash; flat-rate, fixed-scope, no subscriptions. Pick what matches your business.
          </p>
          <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] max-w-[680px] mb-12">
            Not sure which you need? Book the free discovery call and we&rsquo;ll scope exactly the right set against your brief in under 30 minutes.
          </p>

          {/* Sprint base card */}
          <div className="mb-14">
            <div
              className="font-mono text-[0.72rem] tracking-[2px] uppercase pb-3 mb-5"
              style={{ color: 'var(--red-text)', borderBottom: '2px solid var(--red)' }}
            >
              Base &middot; Required for 48h delivery guarantee
            </div>
            <ItemCheckbox
              item={SPRINT}
              checked={selected.has(SPRINT.id)}
              onToggle={() => toggle(SPRINT.id)}
              featured
            />
          </div>

          {/* Category sections */}
          {CATEGORY_ORDER.map((cat) => {
            const items = EXTRAS.filter((e) => e.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="mb-12">
                <div
                  className="font-mono text-[0.72rem] tracking-[2px] uppercase pb-3 mb-5"
                  style={{ color: 'var(--red-text)', borderBottom: '2px solid var(--red)' }}
                >
                  {cat}
                </div>
                <div className="grid grid-cols-2 gap-[2px] max-md:grid-cols-1" style={{ background: 'var(--bg-gap)' }}>
                  {items.map((item) => (
                    <ItemCheckbox
                      key={item.id}
                      item={item}
                      checked={selected.has(item.id)}
                      onToggle={() => toggle(item.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

        </div>
      </section>

      {/* Sticky cart footer */}
      <div
        className="sticky bottom-0 left-0 right-0 z-40"
        style={{ background: 'var(--bg-card)', borderTop: '2px solid var(--red)' }}
      >
        <div className="max-w-[1200px] mx-auto px-10 py-5 max-md:px-5 max-sm:px-4 max-sm:py-4">
          <div className="flex items-center gap-6 flex-wrap max-sm:gap-3 justify-between">
            <div className="flex gap-8 items-baseline max-sm:gap-5 max-sm:flex-wrap">
              <div>
                <div className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim">
                  Items
                </div>
                <div className="text-[1.1rem] font-black text-text-primary">
                  {count}
                </div>
              </div>
              <div>
                <div className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim">
                  Subtotal
                </div>
                <div className="text-[1.1rem] font-black text-text-primary">
                  {formatAud(subtotal)}
                </div>
              </div>
              <div>
                <div className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim">
                  GST
                </div>
                <div className="text-[1.1rem] font-black text-text-primary">
                  {formatAudDecimal(gst)}
                </div>
              </div>
              <div>
                <div className="font-mono text-[0.65rem] tracking-[2px] uppercase" style={{ color: 'var(--red-text)' }}>
                  Total
                </div>
                <div className="text-[1.4rem] font-black" style={{ color: 'var(--red-text)' }}>
                  {formatAudDecimal(total)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting || count === 0}
              aria-busy={submitting}
              className="font-display text-[0.85rem] max-sm:text-xs font-black tracking-[2px] uppercase py-4 px-10 max-sm:py-3 max-sm:px-5 text-white border-none cursor-pointer transition-colors duration-200 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--red)]"
              style={{ background: 'var(--red)' }}
            >
              {submitting ? 'Processing\u2026' : count === 0 ? 'Pick at least one item' : `Checkout ${formatAudDecimal(total)} \u2192`}
            </button>
          </div>

          {error && (
            <p
              role="alert"
              aria-live="polite"
              className="font-mono text-[0.72rem] tracking-[1.5px] uppercase mt-3 leading-[1.5]"
              style={{ color: 'var(--red-text)' }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ItemCheckbox({
  item,
  checked,
  onToggle,
  featured,
}: {
  item: Item;
  checked: boolean;
  onToggle: () => void;
  featured?: boolean;
}) {
  // Featured = the base Sprint, which is locked on. Visually mark it as
  // included rather than "selectable" so users don't try to uncheck it.
  const locked = featured;
  return (
    <label
      className={`relative block p-6 max-sm:p-5 transition-colors duration-200 ${checked ? 'ring-2 ring-inset ring-[color:var(--red)]' : ''} ${locked ? 'cursor-default' : 'cursor-pointer'}`}
      style={{
        background: 'var(--bg-card)',
        borderLeft: featured ? '3px solid var(--red)' : undefined,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        disabled={locked}
        className="sr-only peer"
        aria-label={locked ? `${item.name} (included)` : `Add ${item.name} to cart`}
      />
      <span
        aria-hidden="true"
        className={`absolute top-5 right-5 inline-flex w-7 h-7 items-center justify-center border-2 font-mono text-[1.1rem] leading-none font-black transition-colors duration-200 ${checked ? 'text-white' : 'text-transparent'}`}
        style={{
          borderColor: 'var(--red)',
          background: checked ? 'var(--red)' : 'transparent',
        }}
        title={locked ? 'Included with the Sprint' : undefined}
      >
        &#10003;
      </span>

      <div className="pr-12">
        <div className="flex items-baseline justify-between gap-4 mb-2 max-sm:flex-col max-sm:items-start max-sm:gap-0">
          <h3 className="text-[1rem] font-black text-text-primary tracking-snug leading-tight">
            {item.name}
          </h3>
          <div className="font-black text-[1.1rem] shrink-0" style={{ color: 'var(--red-text)' }}>
            {formatAud(item.price)}
          </div>
        </div>
        <div className="font-mono text-[0.68rem] tracking-[1.5px] uppercase mb-2" style={{ color: 'var(--red-text)' }}>
          {item.tagline}
        </div>
        <p className="text-[0.82rem] text-text-dim font-light leading-[1.6]">
          {item.description}
        </p>
      </div>
    </label>
  );
}

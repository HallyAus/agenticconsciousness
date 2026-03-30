'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/tracking';
import EmailLink from '@/components/EmailLink';

const tiers = [
  {
    num: '01',
    title: 'Strategy & Workshops',
    price: 'From $3,000',
    deposit: '$1,500',
    packageId: 'strategy-deposit',
    timeline: '1-2 weeks',
    featured: false,
    items: [
      'AI opportunity assessment',
      'Half-day workshop with your team',
      'Written roadmap and action plan',
      '30-day email support',
      'Tool recommendations report',
    ],
  },
  {
    num: '02',
    title: 'Tool Implementation',
    price: 'From $5,000',
    deposit: '$2,500',
    packageId: 'implementation-deposit',
    timeline: '2-4 weeks',
    featured: true,
    items: [
      'Everything in Strategy',
      'AI tool deployment (ChatGPT, Claude, Copilot, or custom)',
      'System integration with your existing stack',
      'Team training (up to 10 people)',
      '60-day support and optimisation',
    ],
  },
  {
    num: '03',
    title: 'Automation & Agents',
    price: 'From $10,000',
    deposit: '$5,000',
    packageId: 'automation-deposit',
    timeline: '4-8 weeks',
    featured: false,
    items: [
      'Everything in Implementation',
      'Custom AI pipeline development',
      'Autonomous workflow design',
      'API integrations',
      '90-day support, monitoring, and iteration',
    ],
  },
];

export default function PricingCards() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(packageId: string) {
    setLoading(packageId);
    trackEvent('InitiateCheckout', { content_name: packageId });

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Checkout unavailable. Contact ai@agenticconsciousness.com.au');
        setLoading(null);
      }
    } catch {
      alert('Network error. Please try again.');
      setLoading(null);
    }
  }

  return (
    <div className="grid grid-cols-3 gap-[2px] max-md:grid-cols-1" style={{ background: 'var(--bg-gap)' }}>
      {tiers.map((tier) => (
        <div
          key={tier.num}
          className="p-8 relative transition-colors duration-200"
          style={{
            background: 'var(--bg-card)',
            border: tier.featured ? '2px solid var(--red)' : undefined,
            borderTop: tier.featured ? undefined : '3px solid var(--red)',
          }}
        >
          {tier.featured && (
            <div
              className="font-mono text-[0.7rem] max-sm:text-xs tracking-[2px] uppercase py-1 px-3 absolute top-4 right-4"
              style={{ background: 'var(--red)', color: '#fff' }}
            >
              MOST POPULAR
            </div>
          )}

          <div className="text-[3rem] font-black leading-none mb-3" style={{ color: 'var(--ghost-number)' }}>
            {tier.num}
          </div>

          <h2 className="text-[1.1rem] font-black text-text-primary tracking-snug mb-3">
            {tier.title}
          </h2>

          <div className="text-[1.8rem] font-black mb-1" style={{ color: 'var(--red-text)' }}>
            {tier.price}
          </div>
          <div className="font-mono text-[0.85rem] max-sm:text-xs text-text-dim tracking-[1px] mb-6">+ GST</div>

          <ul className="flex flex-col gap-2 mb-6">
            {tier.items.map((item) => (
              <li key={item} className="flex gap-2 text-[0.82rem] text-text-dim font-light leading-[1.5]">
                <span style={{ color: 'var(--red-text)' }}>&#9632;</span>
                {item}
              </li>
            ))}
          </ul>

          <div className="font-mono text-[0.85rem] max-sm:text-xs text-text-dim tracking-[2px] uppercase mb-6">
            Timeline: {tier.timeline}
          </div>

          <div className="flex flex-col gap-2">
            <EmailLink
              className="block text-center font-display text-[0.8rem] max-sm:text-xs font-black tracking-[2px] uppercase py-3 max-sm:py-4 no-underline transition-all duration-200"
              style={{
                border: '2px solid var(--red)',
                color: 'var(--red-text)',
                background: 'transparent',
              }}
            >
              Book consultation &rarr;
            </EmailLink>
            <button
              onClick={() => handleCheckout(tier.packageId)}
              disabled={loading === tier.packageId}
              className="block w-full text-center font-display text-[0.8rem] max-sm:text-xs font-black tracking-[2px] uppercase py-3 max-sm:py-4 transition-all duration-200 cursor-pointer border-none text-white disabled:opacity-40"
              style={{ background: 'var(--red)' }}
            >
              {loading === tier.packageId ? 'Processing...' : `Pay deposit (${tier.deposit}) \u2192`}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

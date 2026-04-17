'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/tracking';
import EmailLink from '@/components/EmailLink';

interface StarterOffer {
  num: string;
  title: string;
  price: string;
  priceValue: number;
  packageId: string;
  timeline: string;
  items: string[];
}

interface Tier {
  num: string;
  title: string;
  price: string;
  deposit: string;
  packageId: string;
  timeline: string;
  featured: boolean;
  items: string[];
}

const starters: StarterOffer[] = [
  {
    num: 'S1',
    title: 'Claude Workshop',
    price: '$300',
    priceValue: 300,
    packageId: 'claude-workshop',
    timeline: '90 minutes',
    items: [
      '1:1 Claude onboarding over video',
      'Projects, Artifacts, and Computer Use',
      'Role-specific prompt patterns',
      'Session recording and notes',
      '14-day follow-up email support',
    ],
  },
  {
    num: 'S2',
    title: 'Claude Code Setup',
    price: '$450',
    priceValue: 450,
    packageId: 'claude-code-setup',
    timeline: '2 hours',
    items: [
      'Install and configure Claude Code',
      'IDE + terminal integration',
      'Custom slash commands and skills',
      'CLAUDE.md tailored to your repo',
      '30-day email support for tuning',
    ],
  },
  {
    num: 'S3',
    title: 'AI Stack Audit',
    price: '$500',
    priceValue: 500,
    packageId: 'ai-stack-audit',
    timeline: '1 week',
    items: [
      '2-hour discovery of current workflows',
      'Tool-by-tool review (AI and non-AI)',
      'Written report — quick wins + roadmap',
      'Prioritised by ROI and effort',
      '30-minute walkthrough of findings',
    ],
  },
  {
    num: 'S4',
    title: 'Custom Claude Project',
    price: '$750',
    priceValue: 750,
    packageId: 'claude-project-build',
    timeline: '1 week',
    items: [
      'Bespoke Claude Project for your team',
      'Context files, instructions, knowledge base',
      'Prompt evaluation against real tasks',
      'Admin guide for extending it',
      'Equivalent ChatGPT custom GPT on request',
    ],
  },
  {
    num: 'S5',
    title: 'Automation Sprint',
    price: '$1,500',
    priceValue: 1500,
    packageId: 'automation-sprint',
    timeline: '1-2 weeks',
    items: [
      'One production automation built end-to-end',
      'n8n, Make, Zapier, or custom API',
      'Lead routing, doc processing, or similar',
      'Deployed into your stack, documented',
      '14-day post-launch support',
    ],
  },
];

const tiers: Tier[] = [
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
    <>
      {/* ── Starter offers ── */}
      <div className="mb-16">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-2" style={{ color: 'var(--red-text)' }}>
              QUICK-START OFFERS
            </div>
            <h2 className="text-[1.5rem] font-black tracking-tight text-text-primary">
              Pay in full. Book today. Start this week.
            </h2>
          </div>
          <p className="text-text-dim text-[0.85rem] max-w-[360px] font-light leading-[1.6]">
            Focused, fixed-scope engagements. Ideal if you want a specific outcome without committing to a full project.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-[2px] max-[1200px]:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1" style={{ background: 'var(--bg-gap)' }}>
          {starters.map((offer) => (
            <div
              key={offer.num}
              className="p-6 flex flex-col"
              style={{ background: 'var(--bg-card)', borderTop: '3px solid var(--red)' }}
            >
              <div className="font-mono text-[0.7rem] tracking-[2px] uppercase mb-4" style={{ color: 'var(--red-text)' }}>
                {offer.num}
              </div>

              <h3 className="text-[1rem] font-black text-text-primary tracking-snug mb-3 leading-[1.2]">
                {offer.title}
              </h3>

              <div className="text-[1.6rem] font-black mb-1" style={{ color: 'var(--red-text)' }}>
                {offer.price}
              </div>
              <div className="font-mono text-[0.75rem] text-text-dim tracking-[1px] mb-5">+ GST</div>

              <ul className="flex flex-col gap-2 mb-5 flex-1">
                {offer.items.map((item) => (
                  <li key={item} className="flex gap-2 text-[0.78rem] text-text-dim font-light leading-[1.5]">
                    <span style={{ color: 'var(--red-text)' }}>&#9632;</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="font-mono text-[0.75rem] text-text-dim tracking-[1.5px] uppercase mb-4">
                {offer.timeline}
              </div>

              <button
                onClick={() => handleCheckout(offer.packageId)}
                disabled={loading === offer.packageId}
                className="block w-full text-center font-display text-[0.75rem] font-black tracking-[2px] uppercase py-3 max-sm:py-4 transition-all duration-200 cursor-pointer border-none text-white disabled:opacity-40"
                style={{ background: 'var(--red)' }}
              >
                {loading === offer.packageId ? 'Processing...' : `Pay ${offer.price} \u2192`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Full engagements ── */}
      <div>
        <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-2" style={{ color: 'var(--red-text)' }}>
              FULL ENGAGEMENTS
            </div>
            <h2 className="text-[1.5rem] font-black tracking-tight text-text-primary">
              Scoped projects with ongoing support.
            </h2>
          </div>
          <p className="text-text-dim text-[0.85rem] max-w-[360px] font-light leading-[1.6]">
            Pay a deposit to reserve your slot. Balance due on delivery. Every engagement starts with a free discovery call.
          </p>
        </div>

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

              <h3 className="text-[1.1rem] font-black text-text-primary tracking-snug mb-3">
                {tier.title}
              </h3>

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
      </div>
    </>
  );
}

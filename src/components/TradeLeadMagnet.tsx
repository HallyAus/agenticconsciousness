'use client';

import { useState } from 'react';
import type { Trade } from '@/data/trades';
import type { TradeCity } from '@/data/trade-cities';

interface TradeLeadMagnetProps {
  trade: Trade;
  city?: TradeCity;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function TradeLeadMagnet({ trade, city }: TradeLeadMagnetProps) {
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('submitting');
    setError(null);

    try {
      const res = await fetch('/api/trades/lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          businessName: businessName.trim() || null,
          tradeSlug: trade.slug,
          citySlug: city?.slug || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Submission failed');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  const pdfUrl = `/api/trades/${trade.slug}/audit-pdf`;
  const locationLabel = city ? ` (${city.name})` : '';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-[2px]">
      <div className="bg-ac-card border border-border-subtle p-7">
        <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-ac-red mb-3">
          Free PDF &middot; 7-point checklist
        </div>
        <h3 className="font-display font-black text-[1.6rem] leading-[1.05] mb-4 text-text-primary">
          {trade.leadMagnetTitle}
          {city ? <span className="text-ac-red"> &mdash; {city.name}</span> : null}
        </h3>
        <p className="text-text-dim text-[0.95rem] leading-[1.65] font-light mb-6">
          {trade.leadMagnetPromise}
        </p>
        <ul className="space-y-2">
          {trade.leadMagnetChecks.map((c, i) => (
            <li key={i} className="flex items-start gap-3 text-[0.88rem] text-text-primary font-light">
              <span className="text-ac-red font-mono font-bold flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-ac-bg border border-border-subtle p-7">
        {status === 'success' ? (
          <div>
            <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-ac-red mb-3">Sent</div>
            <h3 className="font-display font-black text-[1.6rem] leading-[1.05] mb-4 text-text-primary">
              Check your inbox.
            </h3>
            <p className="text-text-dim text-[0.95rem] leading-[1.65] font-light mb-6">
              Your {trade.name} Website Audit{locationLabel} is on its way. If it does not land in 60 seconds, it is in spam — mark as not spam so the audit link loads inline.
            </p>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener"
              className="inline-block font-display text-[0.85rem] font-black tracking-[2px] uppercase py-3 px-6 no-underline bg-ac-red text-white hover:bg-white hover:text-[#0a0a0a] transition-colors duration-200"
            >
              Download the PDF now &rarr;
            </a>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="font-mono text-[0.7rem] tracking-[2px] uppercase text-ac-red mb-3">
              Grab the PDF
            </div>
            <h3 className="font-display font-black text-[1.6rem] leading-[1.05] mb-4 text-text-primary">
              Send it to my inbox.
            </h3>
            <p className="text-text-dim text-[0.9rem] leading-[1.6] font-light mb-5">
              Enter your email. We email the PDF and keep you in the loop on new {trade.name.toLowerCase()} website content. One-click unsubscribe.
            </p>

            <label className="block mb-3">
              <span className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full bg-transparent border-2 border-border-subtle focus:border-ac-red outline-none px-3 py-3 text-text-primary text-[0.95rem]"
                placeholder="your@email.com"
              />
            </label>

            <label className="block mb-5">
              <span className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim">Business name (optional)</span>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-1 w-full bg-transparent border-2 border-border-subtle focus:border-ac-red outline-none px-3 py-3 text-text-primary text-[0.95rem]"
                placeholder="Acme Plumbing"
              />
            </label>

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full font-display text-[0.9rem] font-black tracking-[2px] uppercase py-4 px-6 bg-ac-red text-white hover:bg-white hover:text-[#0a0a0a] transition-colors duration-200 disabled:opacity-50 disabled:cursor-wait"
            >
              {status === 'submitting' ? 'Sending...' : `Send the ${trade.name} audit PDF`}
            </button>

            {error ? (
              <p className="mt-4 font-mono text-[0.7rem] text-ac-red uppercase tracking-[1.5px]">{error}</p>
            ) : null}

            <p className="mt-4 font-mono text-[0.65rem] tracking-[1.5px] uppercase text-text-dim">
              Unsubscribe anytime. We never sell your details.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

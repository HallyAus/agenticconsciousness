'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { trackEvent } from '@/lib/tracking';

interface Props {
  proposalId: string;
  clientEmail: string;
  total: number;
}

export default function ProposalAcceptance({ proposalId, clientEmail, total }: Props) {
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  // Track proposal view
  useEffect(() => {
    fetch(`/api/proposal/${proposalId}/view`, { method: 'POST' }).catch(() => {});
    trackEvent('ViewContent', { content_name: 'Proposal' });
  }, [proposalId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !agreed) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/proposal/${proposalId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureName: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to accept');
        return;
      }

      setAccepted(true);
      trackEvent('Lead', { content_name: 'Proposal Accepted', value: String(total) });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (accepted) {
    return (
      <div className="p-6 border-2" style={{ borderColor: 'var(--status-green)' }}>
        <div className="font-black text-[1rem] mb-2" style={{ color: 'var(--status-green)' }}>✓ Proposal accepted</div>
        <p className="text-text-dim text-[0.85rem] font-light mb-4">
          A confirmation has been sent to {clientEmail}. We&apos;ll be in touch within 24 hours.
        </p>
        <Link
          href="/pricing"
          className="inline-block font-display text-[0.8rem] max-sm:text-xs font-black tracking-[2px] uppercase py-3 px-6 no-underline text-white"
          style={{ background: 'var(--red)' }}
        >
          Pay deposit →
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 border-2" style={{ borderColor: 'var(--red)' }}>
      <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>ACCEPT THIS PROPOSAL</div>
      <p className="text-text-dim text-[0.85rem] font-light mb-6">
        By typing your name below and clicking accept, you agree to the scope, pricing, and terms outlined above.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type your full name"
          className="w-full py-3 px-4 text-[0.85rem] font-display outline-none transition-colors duration-200"
          style={{ background: 'var(--bg-page)', border: '1px solid var(--border-subtle)', color: 'var(--text-body)' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--red)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
          required
        />

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 accent-[var(--red)]"
          />
          <span className="text-text-dim text-[0.8rem] font-light">
            I accept the terms and conditions outlined in this proposal
          </span>
        </label>

        <button
          type="submit"
          disabled={!name.trim() || !agreed || submitting}
          className="w-full py-4 font-display text-[0.75rem] font-black tracking-[2px] uppercase text-white cursor-pointer border-none disabled:opacity-40 transition-all duration-200"
          style={{ background: 'var(--red)' }}
        >
          {submitting ? 'Processing...' : 'Accept proposal →'}
        </button>

        {error && <p className="text-[0.8rem] font-mono" style={{ color: 'var(--red)' }}>{error}</p>}

        <p className="font-mono text-[0.7rem] max-sm:text-xs text-text-ghost">
          This constitutes a digital agreement. A confirmation will be sent to {clientEmail}.
        </p>
      </form>
    </div>
  );
}

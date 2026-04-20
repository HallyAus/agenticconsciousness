'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/tracking';
import { getStoredRef } from '@/lib/referral';

type Step = 'url' | 'email' | 'done';

export default function WebsiteAuditor() {
  const [step, setStep] = useState<Step>('url');
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [normalisedUrl, setNormalisedUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function normalise(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const normalised = normalise(url);
    if (!normalised || !/^https?:\/\/[^\s.]+\.[^\s]+/.test(normalised)) {
      setError('Enter a valid website URL.');
      return;
    }

    setSubmitting(true);
    trackEvent('WebsiteAuditIntent', { url: normalised });

    // Fire-and-forget intent capture so we have the URL even if the
    // visitor abandons before giving email.
    try {
      await fetch('/api/website-audit/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalised, ref: getStoredRef() }),
      });
    } catch {
      // Non-fatal — move on anyway.
    }

    setNormalisedUrl(normalised);
    setSubmitting(false);
    setStep('email');
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError('Enter a valid email.');
      return;
    }

    setSubmitting(true);
    trackEvent('Lead', { content_name: 'Website Audit' });
    trackEvent('WebsiteAuditRequested', { url: normalisedUrl });

    try {
      const res = await fetch('/api/website-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: normalisedUrl,
          email: clean,
          ref: getStoredRef(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not queue the audit. Try again.');
        setSubmitting(false);
        return;
      }
      setStep('done');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function back() {
    setStep('url');
    setError(null);
  }

  return (
    <section
      id="website-audit"
      aria-label="Free AI website audit"
      className="px-10 max-md:px-5 max-sm:px-4 py-14 max-sm:py-10"
    >
      <div className="max-w-[1000px] mx-auto">
        <div
          className="relative p-10 max-md:p-7 max-sm:p-5"
          style={{ border: '2px solid var(--red)', background: 'var(--bg-card)' }}
        >
          <div
            className="font-mono text-[0.75rem] max-sm:text-xs tracking-[3px] uppercase mb-3"
            style={{ color: 'var(--red-text)' }}
          >
            Free &middot; Powered by Claude Sonnet 4.6
          </div>
          <h2 className="text-[clamp(1.8rem,4.2vw,2.8rem)] font-black tracking-tight leading-[0.95] text-text-primary mb-3">
            Audit your current website.
          </h2>
          <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] max-w-[640px] mb-8">
            Enter your URL. We&rsquo;ll run it through Claude Sonnet 4.6 and email you a full report on
            conversion, trust, mobile, SEO, accessibility, performance, and design &mdash; with the
            single biggest AI opportunity called out. Usually arrives within a couple of minutes.
          </p>

          {/* Step 1: URL */}
          {step === 'url' && (
            <form onSubmit={handleUrlSubmit} className="flex gap-[2px] max-sm:flex-col">
              <input
                type="url"
                inputMode="url"
                required
                autoComplete="url"
                placeholder="https://yourdomain.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={submitting}
                aria-label="Your website URL"
                className="flex-1 px-4 py-4 font-display text-[0.95rem] bg-ac-card border-2 border-[color:var(--red)] text-text-primary placeholder:text-text-dim outline-none focus-visible:border-white disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={submitting || !url.trim()}
                aria-busy={submitting}
                className="font-display text-[0.85rem] max-sm:text-xs font-black tracking-[2px] uppercase py-4 px-10 text-white border-none cursor-pointer transition-colors duration-200 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--red)]"
                style={{ background: 'var(--red)' }}
              >
                {submitting ? 'Saving\u2026' : 'Continue \u2192'}
              </button>
            </form>
          )}

          {/* Step 2: Email */}
          {step === 'email' && (
            <div>
              <div
                className="inline-flex items-center gap-3 py-2 px-3 mb-6 font-mono text-[0.72rem] max-sm:text-xs tracking-[2px] uppercase"
                style={{ background: 'var(--bg-page)', color: 'var(--text-primary)', border: '1px solid var(--red)' }}
              >
                <span aria-hidden="true" style={{ color: 'var(--red-text)' }}>&#9632;</span>
                <span className="truncate max-w-[400px]">{normalisedUrl}</span>
                <button
                  type="button"
                  onClick={back}
                  className="ml-3 font-mono text-[0.65rem] tracking-[2px] uppercase underline cursor-pointer bg-transparent border-none"
                  style={{ color: 'var(--red-text)' }}
                >
                  Change
                </button>
              </div>

              <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] max-w-[640px] mb-6">
                Where should we send your audit? One email, no drip campaign &mdash; that&rsquo;s it.
              </p>

              <form onSubmit={handleEmailSubmit} className="flex gap-[2px] max-sm:flex-col">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@yourdomain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  aria-label="Your email"
                  className="flex-1 px-4 py-4 font-display text-[0.95rem] bg-ac-card border-2 border-[color:var(--red)] text-text-primary placeholder:text-text-dim outline-none focus-visible:border-white disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={submitting || !email.trim()}
                  aria-busy={submitting}
                  className="font-display text-[0.85rem] max-sm:text-xs font-black tracking-[2px] uppercase py-4 px-10 text-white border-none cursor-pointer transition-colors duration-200 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--red)]"
                  style={{ background: 'var(--red)' }}
                >
                  {submitting ? 'Queueing\u2026' : 'Send me the audit \u2192'}
                </button>
              </form>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 'done' && (
            <div
              className="p-6 max-sm:p-5"
              style={{ border: '2px solid var(--red)', background: 'var(--bg-page)' }}
            >
              <div className="font-mono text-[0.72rem] tracking-[2px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
                On it &middot; Check your inbox
              </div>
              <p className="text-[1rem] text-text-primary font-light leading-[1.7] mb-2">
                Your audit for <strong style={{ color: 'var(--red-text)' }}>{normalisedUrl}</strong> is
                running now. It&rsquo;ll land at <strong>{email}</strong> within a couple of minutes.
              </p>
              <p className="text-[0.88rem] text-text-dim font-light leading-[1.7]">
                If it doesn&rsquo;t arrive inside 10 minutes, check spam or email{' '}
                <a href="mailto:ai@agenticconsciousness.com.au" className="no-underline hover:underline" style={{ color: 'var(--red-text)' }}>
                  ai@agenticconsciousness.com.au
                </a>
                .
              </p>
            </div>
          )}

          {error && (
            <p
              role="alert"
              aria-live="polite"
              className="font-mono text-[0.72rem] tracking-[1.5px] uppercase mt-4 leading-[1.5]"
              style={{ color: 'var(--red-text)' }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

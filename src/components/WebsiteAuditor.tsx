'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/tracking';
import { getStoredRef } from '@/lib/referral';

interface Issue {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  fix: string;
}

interface AuditResult {
  url: string;
  summary: string;
  score: number;
  issues: Issue[];
}

const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default function WebsiteAuditor() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);

  async function runAudit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSendStatus('idle');
    trackEvent('WebsiteAuditStart', { url: trimmed });

    try {
      const res = await fetch('/api/website-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Audit failed. Try again.');
        setLoading(false);
        return;
      }
      const issues = Array.isArray(data.issues) ? (data.issues as Issue[]) : [];
      issues.sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9));
      const audit: AuditResult = {
        url: data.url || trimmed,
        summary: data.summary || '',
        score: typeof data.score === 'number' ? data.score : 0,
        issues,
      };
      setResult(audit);
      trackEvent('WebsiteAuditComplete', {
        url: audit.url,
        score: audit.score,
        issue_count: audit.issues.length,
      });
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function sendByEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!result) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setSendError('Enter a valid email.');
      return;
    }
    setSending(true);
    setSendError(null);
    trackEvent('Lead', { content_name: 'Website Audit Email' });

    try {
      const res = await fetch('/api/website-audit/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          url: result.url,
          summary: result.summary,
          score: result.score,
          issues: result.issues,
          ref: getStoredRef(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error || 'Send failed. Try again.');
        setSendStatus('error');
      } else {
        setSendStatus('sent');
      }
    } catch {
      setSendError('Network error. Try again.');
      setSendStatus('error');
    } finally {
      setSending(false);
    }
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
          style={{
            border: '2px solid var(--red)',
            background: 'var(--bg-card)',
          }}
        >
          <div className="font-mono text-[0.75rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
            Free &middot; Powered by Claude Sonnet 4.6
          </div>
          <h2 className="text-[clamp(1.8rem,4.2vw,2.8rem)] font-black tracking-tight leading-[0.95] text-text-primary mb-3">
            Audit your current website.
          </h2>
          <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] max-w-[640px] mb-8">
            Paste your URL. We&rsquo;ll run it through Claude Sonnet 4.6 and surface the conversion, trust,
            mobile, SEO, and accessibility problems that actually move your numbers. Honest findings in
            under 30 seconds. No signup required.
          </p>

          {/* URL input */}
          <form onSubmit={runAudit} className="flex gap-[2px] mb-2 max-sm:flex-col">
            <input
              type="url"
              inputMode="url"
              required
              autoComplete="url"
              placeholder="https://yourdomain.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              aria-label="Your website URL"
              className="flex-1 px-4 py-4 font-display text-[0.95rem] bg-ac-card border-2 border-[color:var(--red)] text-text-primary placeholder:text-text-dim outline-none focus-visible:border-white disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              aria-busy={loading}
              className="font-display text-[0.85rem] max-sm:text-xs font-black tracking-[2px] uppercase py-4 px-10 max-sm:py-4 text-white border-none cursor-pointer transition-colors duration-200 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--red)]"
              style={{ background: 'var(--red)' }}
            >
              {loading ? 'Auditing\u2026' : 'Run audit \u2192'}
            </button>
          </form>

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

          {loading && !result && (
            <p className="font-mono text-[0.72rem] tracking-[2px] uppercase text-text-dim mt-4">
              Fetching site &middot; Parsing HTML &middot; Asking Claude Sonnet 4.6&hellip;
            </p>
          )}

          {result && (
            <div className="mt-10">
              {/* Score + summary */}
              <div className="grid grid-cols-[auto_1fr] gap-8 items-start mb-8 max-md:grid-cols-1 max-md:gap-4">
                <div>
                  <div className="font-mono text-[0.7rem] tracking-[2px] uppercase mb-1" style={{ color: 'var(--red-text)' }}>
                    Score
                  </div>
                  <div className="text-[clamp(3.5rem,8vw,5rem)] font-black leading-none" style={{ color: 'var(--red-text)' }}>
                    {result.score}
                    <span className="text-[0.4em] text-text-dim font-light"> / 100</span>
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[0.7rem] tracking-[2px] uppercase mb-2" style={{ color: 'var(--red-text)' }}>
                    Summary
                  </div>
                  <p className="text-[1rem] max-sm:text-[0.95rem] text-text-primary font-light leading-[1.65]">
                    {result.summary}
                  </p>
                </div>
              </div>

              {/* Issues */}
              <div className="font-mono text-[0.72rem] tracking-[2px] uppercase pb-3 mb-5"
                style={{ color: 'var(--red-text)', borderBottom: '2px solid var(--red)' }}
              >
                {result.issues.length} issues found
              </div>

              <div className="flex flex-col gap-[2px] mb-10" style={{ background: 'var(--bg-gap)' }}>
                {result.issues.map((issue, i) => (
                  <article
                    key={i}
                    className="p-5 max-sm:p-4"
                    style={{ background: 'var(--bg-card)', borderLeft: '3px solid var(--red)' }}
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-2 max-sm:flex-col max-sm:items-start max-sm:gap-1">
                      <div className="font-mono text-[0.65rem] tracking-[2px] uppercase" style={{ color: 'var(--red-text)' }}>
                        {issue.severity.toUpperCase()} &middot; {issue.category}
                      </div>
                    </div>
                    <h3 className="text-[1rem] font-black text-text-primary tracking-snug leading-tight mb-2">
                      {issue.title}
                    </h3>
                    <p className="text-[0.88rem] text-text-dim font-light leading-[1.65] mb-3">
                      {issue.detail}
                    </p>
                    <div className="font-mono text-[0.7rem] tracking-[1.5px] uppercase" style={{ color: 'var(--red-text)' }}>
                      Fix &rarr; <span className="text-text-body normal-case tracking-normal text-[0.82rem]" style={{ fontFamily: 'inherit' }}>{issue.fix}</span>
                    </div>
                  </article>
                ))}
              </div>

              {/* Email capture */}
              {sendStatus === 'sent' ? (
                <div
                  className="p-5"
                  style={{ border: '2px solid var(--red)', background: 'var(--bg-card)' }}
                >
                  <div className="font-mono text-[0.72rem] tracking-[2px] uppercase mb-2" style={{ color: 'var(--red-text)' }}>
                    Sent &middot; Check your inbox
                  </div>
                  <p className="text-[0.9rem] text-text-dim font-light leading-[1.65]">
                    Full report on its way. If it does not arrive in a minute, check spam or email{' '}
                    <a href="mailto:ai@agenticconsciousness.com.au" className="no-underline hover:underline" style={{ color: 'var(--red-text)' }}>
                      ai@agenticconsciousness.com.au
                    </a>
                    .
                  </p>
                </div>
              ) : (
                <div
                  className="p-5"
                  style={{ border: '2px solid var(--red)', background: 'var(--bg-card)' }}
                >
                  <div className="font-mono text-[0.72rem] tracking-[2px] uppercase mb-2" style={{ color: 'var(--red-text)' }}>
                    Email me this audit
                  </div>
                  <p className="text-[0.85rem] text-text-dim font-light leading-[1.65] mb-4">
                    Get the full report in your inbox with each fix spelled out. No signup, no drip campaign &mdash; one email, that&rsquo;s it.
                  </p>
                  <form onSubmit={sendByEmail} className="flex gap-[2px] max-sm:flex-col">
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@yourdomain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={sending}
                      aria-label="Your email"
                      className="flex-1 px-4 py-3 font-display text-[0.9rem] bg-ac-card border-2 border-[color:var(--red)] text-text-primary placeholder:text-text-dim outline-none focus-visible:border-white disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={sending || !email.trim()}
                      aria-busy={sending}
                      className="font-display text-[0.8rem] max-sm:text-xs font-black tracking-[2px] uppercase py-3 px-6 text-white border-none cursor-pointer transition-colors duration-200 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--red)]"
                      style={{ background: 'var(--red)' }}
                    >
                      {sending ? 'Sending\u2026' : 'Email me this \u2192'}
                    </button>
                  </form>
                  {sendError && (
                    <p
                      role="alert"
                      aria-live="polite"
                      className="font-mono text-[0.7rem] tracking-[1.5px] uppercase mt-3 leading-[1.5]"
                      style={{ color: 'var(--red-text)' }}
                    >
                      {sendError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/tracking';
import { useCsrf } from '@/lib/useCsrf';
import EmailLink from '@/components/EmailLink';

const INDUSTRIES = [
  'Manufacturing',
  'Professional Services',
  'Construction & Trades',
  'Healthcare',
  'Retail & E-commerce',
  'Finance & Insurance',
  'Education',
  'Hospitality & Tourism',
  'Technology',
  'Government',
  'Transport & Logistics',
  'Agriculture',
  'Other',
];

const SESSION_SHOWN = 'ac_exit_shown';
const SESSION_SUBMITTED = 'ac_exit_submitted';
const MIN_PAGE_TIME_MS = 15_000;
const MIN_SCROLL_DEPTH = 0.3; // 30% of page scrolled before exit-intent qualifies
const MOBILE_INACTIVITY_MS = 60_000;

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-page)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-body)',
};

const inputFocusStyle: React.CSSProperties = {
  background: 'var(--bg-page)',
  border: '1px solid var(--red)',
  color: 'var(--text-body)',
};

export default function ExitIntent() {
  const pathname = usePathname();
  const csrfToken = useCsrf();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const shownRef = useRef(false);
  const loadTimeRef = useRef(Date.now());
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isChatOpen = useCallback(() => {
    return !!document.querySelector('[aria-expanded="true"]');
  }, []);

  const shouldBlock = useCallback(() => {
    if (pathname?.startsWith('/admin')) return true;
    if (shownRef.current) return true;
    if (sessionStorage.getItem(SESSION_SHOWN)) return true;
    if (sessionStorage.getItem(SESSION_SUBMITTED)) return true;
    if (Date.now() - loadTimeRef.current < MIN_PAGE_TIME_MS) return true;
    if (isChatOpen()) return true;
    // Require some engagement before treating an upward mouse move as exit
    // intent. Stops the modal from firing on someone arriving and reaching
    // straight for the address bar / a bookmark before they've read anything.
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0 && window.scrollY / docHeight < MIN_SCROLL_DEPTH) return true;
    return false;
  }, [isChatOpen, pathname]);

  const trigger = useCallback(() => {
    if (shouldBlock()) return;
    shownRef.current = true;
    sessionStorage.setItem(SESSION_SHOWN, 'true');
    setVisible(true);
  }, [shouldBlock]);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  // Desktop: mouse approaching top of viewport
  useEffect(() => {
    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 10 && e.movementY < -5) {
        trigger();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [trigger]);

  // Mobile: 60s inactivity timer
  useEffect(() => {
    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    if (!isMobile) return;

    const resetTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(trigger, MOBILE_INACTIVITY_MS);
    };

    resetTimer();
    document.addEventListener('scroll', resetTimer, { passive: true });
    document.addEventListener('click', resetTimer);

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      document.removeEventListener('scroll', resetTimer);
      document.removeEventListener('click', resetTimer);
    };
  }, [trigger]);

  // Escape key closes
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, close]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!industry) {
      setError('Please select your industry.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/exit-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ email, industry }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send your request. Check your email address and try again.');
      } else {
        sessionStorage.setItem(SESSION_SUBMITTED, 'true');
        trackEvent('Lead', { content_name: 'Exit Intent' });
        // Also subscribe to drip
        fetch('/api/drip/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, industry, source: 'exit-intent' }),
        }).catch(() => {});
        setStep(2);
      }
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Before you go"
      className="fixed inset-0 z-[50000] flex items-center justify-center backdrop-blur-[4px]"
      style={{ background: 'rgba(0,0,0,0.85)', animation: 'fadeIn 0.2s ease' }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="relative max-w-[480px] w-[calc(100%-2rem)] p-10 max-sm:p-6"
        style={{ background: 'var(--bg-page)', border: '2px solid var(--red)' }}
      >
        {/* Close button */}
        <button
          onClick={close}
          aria-label="Close"
          className="exit-close absolute top-4 right-4 flex items-center justify-center w-8 h-8 text-[0.8rem] transition-colors duration-200 cursor-pointer bg-transparent border border-[color:var(--border-subtle)] text-[color:var(--text-dim)] hover:border-[color:var(--red)] hover:text-[color:var(--red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--red)] focus-visible:border-[color:var(--red)] focus-visible:text-[color:var(--red)]"
        >
          ✕
        </button>

        {step === 1 ? (
          <>
            {/* Step 1: Form */}
            <p
              className="font-mono tracking-[3px] mb-3"
              style={{ fontSize: '0.7rem', color: 'var(--red)' }}
            >
              BEFORE YOU GO
            </p>
            <h2
              className="font-black mb-3"
              style={{ fontSize: '1.5rem', letterSpacing: '-1px', color: 'var(--text-primary)' }}
            >
              Leaving? Take this with you.
            </h2>
            <p className="mb-6" style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
              Enter your email and we&apos;ll send you a free AI opportunity snapshot for your business.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="you@business.com.au"
                aria-label="Email address"
                className="w-full py-3 px-4 font-display outline-none transition-colors duration-200"
                style={{
                  fontSize: '0.85rem',
                  ...(focusedField === 'email' ? inputFocusStyle : inputStyle),
                }}
              />

              <select
                value={industry}
                onChange={(e) => { setIndustry(e.target.value); setError(''); }}
                onFocus={() => setFocusedField('industry')}
                onBlur={() => setFocusedField(null)}
                aria-label="Select your industry"
                className="w-full py-3 px-4 font-display outline-none transition-colors duration-200"
                style={{
                  fontSize: '0.85rem',
                  ...(focusedField === 'industry' ? inputFocusStyle : inputStyle),
                }}
              >
                <option value="" disabled>Select your industry</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>

              {error && (
                <p className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--red)' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 max-sm:py-4 px-4 font-black transition-all duration-200 cursor-pointer"
                style={{
                  fontSize: '0.85rem',
                  background: loading ? 'var(--red-dim)' : 'var(--red)',
                  color: '#fff',
                  border: 'none',
                  letterSpacing: '1px',
                }}
              >
                {loading ? 'GENERATING...' : 'SEND MY FREE REPORT →'}
              </button>
            </form>

            <div className="mt-5" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
              <p className="mb-2" style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                Or book a free consultation directly:
              </p>
              <EmailLink
                className="font-black transition-colors duration-200"
                style={{ fontSize: '0.85rem', color: 'var(--red)', textDecoration: 'none', letterSpacing: '1px' }}
              >
                BOOK NOW →
              </EmailLink>
            </div>

            <p className="font-mono mt-4 max-sm:text-xs" style={{ fontSize: '0.55rem', color: 'var(--text-ghost)' }}>
              No spam. One email. That&apos;s it.
            </p>
          </>
        ) : (
          <>
            {/* Step 2: Confirmation */}
            <p
              className="font-mono tracking-[3px] mb-3"
              style={{ fontSize: '0.7rem', color: 'var(--red)' }}
            >
              YOU&apos;RE ALL SET
            </p>
            <h2
              className="font-black mb-3"
              style={{ fontSize: '1.5rem', letterSpacing: '-1px', color: 'var(--text-primary)' }}
            >
              Check your inbox.
            </h2>
            <p className="mb-6" style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
              We&apos;re generating your personalised AI opportunity snapshot right now. It&apos;ll be in your inbox within 5 minutes.
            </p>
            <button
              onClick={close}
              className="w-full py-3 max-sm:py-4 px-4 font-black transition-all duration-200 cursor-pointer"
              style={{
                fontSize: '0.85rem',
                background: 'var(--red)',
                color: '#fff',
                border: 'none',
                letterSpacing: '1px',
              }}
            >
              BACK TO SITE →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

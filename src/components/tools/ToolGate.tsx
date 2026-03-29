'use client';

import { useState, useEffect, useCallback, ReactNode, createContext, useContext } from 'react';
import { useCsrf } from '@/lib/useCsrf';

interface UsageState {
  tier: 'anonymous' | 'verified';
  remainingUses: number;
  totalUsesToday: number;
  maxUses: number;
}

interface ToolGateContextValue {
  onToolUse: () => void;
  remainingUses: number;
  tier: string;
}

const ToolGateContext = createContext<ToolGateContextValue>({ onToolUse: () => {}, remainingUses: 3, tier: 'anonymous' });
export const useToolGate = () => useContext(ToolGateContext);

type GateState = 'loading' | 'anonymous_ok' | 'email_gate' | 'pending' | 'verified_ok' | 'capped' | 'error';

export default function ToolGate({ toolId, children }: { toolId: string; children: ReactNode }) {
  const csrfToken = useCsrf();
  const [state, setState] = useState<GateState>('loading');
  const [usage, setUsage] = useState<UsageState>({ tier: 'anonymous', remainingUses: 3, totalUsesToday: 0, maxUses: 3 });
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/tool-usage');
      const data: UsageState = await res.json();
      setUsage(data);

      if (data.tier === 'verified') {
        setState(data.remainingUses <= 0 ? 'capped' : 'verified_ok');
      } else {
        setState(data.remainingUses <= 0 ? 'email_gate' : 'anonymous_ok');
      }
    } catch {
      setState('anonymous_ok'); // Fail open
      setUsage({ tier: 'anonymous', remainingUses: 3, totalUsesToday: 0, maxUses: 3 });
    }
  }, []);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  const onToolUse = useCallback(() => {
    setUsage(prev => {
      const remaining = Math.max(0, prev.remainingUses - 1);
      const newUsage = { ...prev, remainingUses: remaining, totalUsesToday: prev.totalUsesToday + 1 };

      if (remaining <= 0) {
        if (prev.tier === 'verified') {
          setState('capped');
        } else {
          setState('email_gate');
        }
      }
      return newUsage;
    });
  }, []);

  const handleEmailSubmit = useCallback(async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    setEmailError('');

    try {
      const res = await fetch('/api/tool-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEmailError(data.error || 'Something went wrong.');
        setSubmitting(false);
        return;
      }

      if (data.verified) {
        // Auto-verified (dev mode or already verified)
        await fetchUsage();
        return;
      }

      // Verification email sent — start polling
      setState('pending');
      setSubmitting(false);

      // Poll every 3 seconds for verification
      const pollInterval = setInterval(async () => {
        const usageRes = await fetch('/api/tool-usage');
        const usageData: UsageState = await usageRes.json();
        if (usageData.tier === 'verified') {
          clearInterval(pollInterval);
          setUsage(usageData);
          setState('verified_ok');
        }
      }, 3000);

      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
    } catch {
      setEmailError('Something went wrong. Try again.');
      setSubmitting(false);
    }
  }, [email, csrfToken, fetchUsage]);

  // Loading state
  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="font-mono text-[0.7rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim animate-pulse">
          Loading tool...
        </div>
      </div>
    );
  }

  // Email gate modal
  if (state === 'email_gate') {
    return (
      <div className="border-2 border-ac-red p-8 max-sm:p-5 bg-ac-card">
        <div className="max-w-[400px] mx-auto text-center">
          <div className="font-mono text-[0.7rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
            FREE USES EXHAUSTED
          </div>
          <h3 className="text-[1.3rem] font-black tracking-tight text-text-primary mb-3">
            Enter your email to continue.
          </h3>
          <p className="text-text-dim text-[0.85rem] font-light leading-[1.6] mb-6">
            Get 20 free AI tool uses per day. We&apos;ll send a quick verification link.
          </p>
          <div className="flex gap-0 max-sm:flex-col max-sm:gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              placeholder="you@business.com.au"
              aria-label="Email address"
              className="flex-1 bg-ac-black border-2 border-border-subtle py-3 px-4 text-text-primary font-display text-[0.85rem] outline-none transition-colors duration-200 focus:border-ac-red focus:ring-2 focus:ring-ac-red placeholder:text-text-dim"
              onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
            />
            <button
              onClick={handleEmailSubmit}
              disabled={submitting}
              className="bg-ac-red text-white font-display text-[0.7rem] max-sm:text-xs font-black tracking-[2px] uppercase px-6 py-3 transition-all duration-200 hover:bg-white hover:text-ac-black cursor-pointer border-none disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Continue'}
            </button>
          </div>
          {emailError && <p className="text-ac-red text-[0.7rem] font-mono mt-2">{emailError}</p>}
          <p className="text-text-ghost text-[0.65rem] max-sm:text-xs font-mono mt-4">
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </div>
    );
  }

  // Verification pending
  if (state === 'pending') {
    return (
      <div className="border-2 border-ac-red p-8 max-sm:p-5 bg-ac-card text-center">
        <div className="font-mono text-[0.7rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
          VERIFICATION SENT
        </div>
        <h3 className="text-[1.3rem] font-black tracking-tight text-text-primary mb-3">
          Check your email.
        </h3>
        <p className="text-text-dim text-[0.85rem] font-light leading-[1.6] mb-2">
          We sent a verification link to <strong className="text-text-primary">{email}</strong>
        </p>
        <p className="text-text-dim text-[0.8rem] font-light leading-[1.6]">
          Click the link to unlock 20 free uses per day. This page will update automatically.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-ac-red animate-pulse" />
          <span className="font-mono text-[0.65rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim">
            Waiting for verification...
          </span>
        </div>
      </div>
    );
  }

  // Daily cap hit (verified user)
  if (state === 'capped') {
    return (
      <div className="border-2 border-ac-red p-8 max-sm:p-5 bg-ac-card text-center">
        <div className="font-mono text-[0.7rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
          DAILY LIMIT REACHED
        </div>
        <h3 className="text-[1.3rem] font-black tracking-tight text-text-primary mb-3">
          You&apos;ve used all 20 tools today.
        </h3>
        <p className="text-text-dim text-[0.85rem] font-light leading-[1.6] mb-6">
          Need more? Let&apos;s talk about how AI can transform your business.
        </p>
        <a
          href="/#contact"
          className="inline-block bg-ac-red text-white font-display text-[0.7rem] max-sm:text-xs font-black tracking-[2px] uppercase py-3 px-8 no-underline transition-all duration-200 hover:bg-white hover:text-ac-black"
        >
          Book a consultation &rarr;
        </a>
        <p className="text-text-ghost text-[0.65rem] max-sm:text-xs font-mono mt-6">
          Your limit resets tomorrow.
        </p>
      </div>
    );
  }

  // Tool is accessible — render with countdown banner
  const showBanner = (usage.tier === 'anonymous' && usage.remainingUses <= 3) || (usage.tier === 'verified' && usage.remainingUses <= 5);

  return (
    <ToolGateContext.Provider value={{ onToolUse, remainingUses: usage.remainingUses, tier: usage.tier }}>
      {showBanner && (
        <div
          className="py-2 px-4 text-center font-mono text-[0.65rem] max-sm:text-xs tracking-[2px] uppercase border-b-2"
          style={{
            borderColor: usage.remainingUses <= 1 ? '#ff3d00' : 'var(--border-subtle)',
            color: usage.remainingUses <= 1 ? '#ff3d00' : 'var(--text-dim)',
            background: usage.remainingUses <= 1 ? 'rgba(255,61,0,0.08)' : 'transparent',
          }}
        >
          {usage.tier === 'anonymous'
            ? usage.remainingUses === 1
              ? 'Last free use — enter your email to continue'
              : `${usage.remainingUses} free uses remaining`
            : usage.remainingUses === 1
              ? 'Last use today'
              : `${usage.remainingUses} uses remaining today`
          }
        </div>
      )}
      {children}
    </ToolGateContext.Provider>
  );
}

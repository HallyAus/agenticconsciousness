'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useCsrf } from '@/lib/useCsrf';
import EmailLink from '@/components/EmailLink';

// ─── Types ────────────────────────────────────────────────────────────────────

type GateStatus = 'loading' | 'anonymous_ok' | 'email_gate' | 'pending' | 'verified_ok' | 'capped';

interface GateState {
  status: GateStatus;
  remaining: number;
  used: number;
  limit: number;
  email?: string;
}

interface ToolAccessContextValue {
  state: GateState;
  refresh: () => void;
  triggerEmailGate: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToolAccessContext = createContext<ToolAccessContextValue | null>(null);

export function useToolAccess(): ToolAccessContextValue | null {
  return useContext(ToolAccessContext);
}

// ─── Provider (single fetch shared across all tools on the page) ─────────────

let sharedState: GateState = { status: 'loading', remaining: 0, used: 0, limit: 3 };
let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

async function fetchUsageState() {
  try {
    const res = await fetch('/api/tool-usage', { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Omit<GateState, 'status'> & { status: string };
    sharedState = {
      status: data.status as GateStatus,
      remaining: data.remaining ?? 0,
      used: data.used ?? 0,
      limit: data.limit ?? 3,
      email: (data as { email?: string }).email,
    };
  } catch {
    // On error default to anonymous_ok so tools still work
    sharedState = { status: 'anonymous_ok', remaining: 3, used: 0, limit: 3 };
  }
  notifyListeners();
}

function useSharedGateState(): [GateState, () => void] {
  const [, rerender] = useState(0);

  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    listeners.push(listener);

    // Initial fetch only once
    if (sharedState.status === 'loading') {
      fetchUsageState();
    } else {
      listener();
    }

    // Check for ?verified=ok in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'ok') {
      window.history.replaceState({}, '', window.location.pathname);
      fetchUsageState();
    }

    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const refresh = useCallback(() => {
    sharedState = { ...sharedState, status: 'loading' };
    fetchUsageState();
  }, []);

  return [sharedState, refresh];
}

// ─── Email gate form ──────────────────────────────────────────────────────────

function EmailGateForm({ onSent }: { onSent: (email: string) => void }) {
  const csrfToken = useCsrf();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@') || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/tool-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ email }),
        credentials: 'same-origin',
      });
      const data = (await res.json()) as { status?: string; token?: string; error?: string };

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      if (data.status === 'auto_verified' && data.token) {
        // Dev mode: auto-verify by hitting the verify endpoint
        await fetch(`/api/verify?token=${data.token}`);
        fetchUsageState();
        onSent(email);
      } else {
        onSent(email);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-2 border-ac-red p-6 max-w-[480px] mx-auto">
      <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red mb-4 font-black">
        FREE ACCESS
      </div>
      <h3 className="text-[1.1rem] font-black tracking-tight text-text-primary mb-2">
        Verify your email for more uses
      </h3>
      <p className="text-text-dim text-[0.8rem] font-light leading-[1.7] mb-5">
        You&apos;ve used your 3 free anonymous uses. Enter your email to unlock{' '}
        <strong className="text-text-primary">20 uses per day</strong> — no account, no password.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-[2px]">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 bg-transparent border-2 border-border-subtle text-text-primary font-mono text-[0.85rem] px-3 py-3 outline-none focus:border-ac-red transition-colors duration-200 placeholder:text-text-ghost"
        />
        <button
          type="submit"
          disabled={submitting || !email.includes('@')}
          className="bg-ac-red text-white font-display text-[0.65rem] font-black tracking-[2px] uppercase px-5 py-3 transition-all duration-200 hover:bg-white hover:text-[#0a0a0a] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none"
        >
          {submitting ? '...' : 'SEND →'}
        </button>
      </form>
      {error && (
        <p className="font-mono text-[0.65rem] text-ac-red mt-2 tracking-[1px]">{error}</p>
      )}
      <p className="font-mono text-[0.6rem] text-text-ghost mt-3 tracking-[1px]">
        One-click verification link. No spam, no account required.
      </p>
    </div>
  );
}

// ─── Pending verification ─────────────────────────────────────────────────────

function PendingVerification({ email, onRefresh }: { email: string; onRefresh: () => void }) {
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const attempts = useRef(0);

  useEffect(() => {
    const MAX_ATTEMPTS = 60; // 5 minutes at 5s intervals
    pollRef.current = setInterval(async () => {
      attempts.current += 1;
      if (attempts.current > MAX_ATTEMPTS) {
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      try {
        const res = await fetch('/api/tool-usage', { credentials: 'same-origin' });
        const data = (await res.json()) as { status: string };
        if (data.status === 'verified_ok' || data.status === 'anonymous_ok') {
          if (pollRef.current) clearInterval(pollRef.current);
          onRefresh();
        }
      } catch {
        // ignore, keep polling
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [onRefresh]);

  return (
    <div className="border-2 border-border-subtle p-6 max-w-[480px] mx-auto text-center">
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="w-2 h-2 bg-ac-red animate-blink" />
        <span className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red font-black">
          CHECK YOUR EMAIL
        </span>
      </div>
      <p className="text-text-primary text-[0.85rem] font-light mb-2">
        Verification link sent to <strong className="text-text-primary">{email}</strong>
      </p>
      <p className="text-text-dim text-[0.85rem] font-mono tracking-[1px] mb-4">
        Click the link in your inbox. This page will update automatically.
      </p>
      <button
        onClick={onRefresh}
        className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim bg-transparent border-none cursor-pointer hover:text-text-primary transition-colors duration-200"
      >
        Already clicked? Refresh →
      </button>
    </div>
  );
}

// ─── Countdown banner ─────────────────────────────────────────────────────────

function CountdownBanner({ state }: { state: GateState }) {
  if (state.remaining > 2 || state.status === 'loading') return null;

  const isVerified = state.status === 'verified_ok';
  const pct = Math.round((state.remaining / state.limit) * 100);
  const barColor = state.remaining <= 1 ? 'bg-ac-red' : 'bg-text-dim';

  return (
    <div className="border-b-2 border-border-subtle px-6 py-2 flex items-center gap-4">
      <div className="flex-1 h-[2px] bg-ac-card">
        <div
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[0.75rem] tracking-[2px] uppercase text-text-dim whitespace-nowrap shrink-0">
        {state.remaining} / {state.limit} {isVerified ? 'daily' : 'free'} uses remaining
      </span>
    </div>
  );
}

// ─── Daily cap block ──────────────────────────────────────────────────────────

function DailyCap({ email }: { email?: string }) {
  return (
    <div className="border-2 border-ac-red p-8 max-w-[480px] mx-auto text-center">
      <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red mb-4 font-black">
        DAILY LIMIT REACHED
      </div>
      <h3 className="text-[1.1rem] font-black tracking-tight text-text-primary mb-3">
        {email ? '20 uses used today' : "You've reached the limit"}
      </h3>
      <p className="text-text-dim text-[0.8rem] font-light leading-[1.7] mb-6">
        {email
          ? 'Your daily 20-use allowance resets at midnight. Want unlimited access?'
          : 'Verify your email for 20 uses per day, or talk to us about custom AI tools for your business.'}
      </p>
      <div className="flex gap-[2px] justify-center flex-wrap">
        <EmailLink className="inline-block font-display text-[0.65rem] font-black tracking-[2px] uppercase py-3 px-5 no-underline text-white bg-ac-red transition-all duration-200 hover:bg-white hover:text-[#0a0a0a]">
          Book free consultation →
        </EmailLink>
      </div>
      {email && (
        <p className="font-mono text-[0.6rem] text-text-ghost mt-4 tracking-[1px]">
          Verified as {email}
        </p>
      )}
    </div>
  );
}

// ─── Main ToolGate wrapper ────────────────────────────────────────────────────

interface ToolGateProps {
  children: ReactNode;
  toolId?: string;
  /** If true, always show children (used for FeaturedTool's "Try Example" button) */
  passthrough?: boolean;
}

export default function ToolGate({ children, toolId, passthrough = false }: ToolGateProps) {
  const [state, refresh] = useSharedGateState();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [showEmailGate, setShowEmailGate] = useState(false);

  const triggerEmailGate = useCallback(() => setShowEmailGate(true), []);

  const contextValue: ToolAccessContextValue = { state, refresh, triggerEmailGate };

  if (passthrough) {
    return (
      <ToolAccessContext.Provider value={contextValue}>
        {children}
      </ToolAccessContext.Provider>
    );
  }

  // Loading skeleton
  if (state.status === 'loading') {
    return (
      <ToolAccessContext.Provider value={contextValue}>
        <div className="flex items-center justify-center py-12">
          <span className="font-mono text-[0.75rem] tracking-[3px] uppercase text-text-ghost animate-pulse">
            Loading...
          </span>
        </div>
      </ToolAccessContext.Provider>
    );
  }

  // Daily cap
  if (state.status === 'capped') {
    return (
      <ToolAccessContext.Provider value={contextValue}>
        <div className="py-10 px-6">
          <DailyCap email={state.email} />
        </div>
      </ToolAccessContext.Provider>
    );
  }

  // Email gate — either from API state or triggered by a tool component
  if (state.status === 'email_gate' || showEmailGate) {
    if (pendingEmail) {
      return (
        <ToolAccessContext.Provider value={contextValue}>
          <div className="py-10 px-6">
            <PendingVerification email={pendingEmail} onRefresh={refresh} />
          </div>
        </ToolAccessContext.Provider>
      );
    }
    return (
      <ToolAccessContext.Provider value={contextValue}>
        <div className="py-10 px-6">
          <EmailGateForm
            onSent={(email) => {
              setPendingEmail(email);
              sharedState = { ...sharedState, status: 'pending' as GateStatus };
              notifyListeners();
            }}
          />
        </div>
      </ToolAccessContext.Provider>
    );
  }

  // Pending (email sent, waiting for click)
  if (state.status === 'pending' && pendingEmail) {
    return (
      <ToolAccessContext.Provider value={contextValue}>
        <div className="py-10 px-6">
          <PendingVerification email={pendingEmail} onRefresh={refresh} />
        </div>
      </ToolAccessContext.Provider>
    );
  }

  // OK states: anonymous_ok, verified_ok
  return (
    <ToolAccessContext.Provider value={contextValue}>
      <CountdownBanner state={state} />
      {children}
    </ToolAccessContext.Provider>
  );
}

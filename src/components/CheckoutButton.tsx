'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/tracking';

interface Props {
  packageId: string;
  children: React.ReactNode;
  processingLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function CheckoutButton({
  packageId,
  children,
  processingLabel = 'Processing\u2026',
  className,
  style,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
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
        setError(data.error || 'Checkout unavailable \u2014 email ai@agenticconsciousness.com.au');
        setLoading(false);
      }
    } catch {
      setError('Network error \u2014 please try again.');
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-busy={loading}
        className={`${className ?? ''} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--red)]`}
        style={style}
      >
        {loading ? processingLabel : children}
      </button>
      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="font-mono text-[0.7rem] tracking-[1.5px] uppercase mt-2 leading-[1.5]"
          style={{ color: 'var(--red-text)' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

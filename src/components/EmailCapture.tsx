'use client';

import { useState, FormEvent } from 'react';

export default function EmailCapture() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email.');
      return;
    }

    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Try again.');
    }
  }

  if (submitted) {
    return (
      <div className="bg-ac-card border-2 border-ac-red p-8 text-center">
        <div className="text-[1rem] font-black text-text-primary mb-2">You&apos;re in.</div>
        <p className="text-text-dim text-[0.85rem] font-light">
          We&apos;ll send you AI insights worth reading. No spam.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-ac-card border-2 border-ac-red p-8">
      <div className="text-[1rem] font-black text-text-primary mb-2">Get AI insights weekly</div>
      <p className="text-text-dim text-[0.85rem] font-light mb-4">
        Practical AI strategies for Australian businesses. No fluff. Unsubscribe anytime.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-0 max-sm:flex-col max-sm:gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          placeholder="you@business.com.au"
          aria-label="Email address"
          className="flex-1 bg-ac-black border border-border-subtle py-3 px-4 text-text-primary font-display text-[0.85rem] outline-none transition-colors duration-200 focus:border-ac-red placeholder:text-text-dim"
        />
        <button
          type="submit"
          className="bg-ac-red text-white font-display text-[0.7rem] font-black tracking-[2px] uppercase px-6 py-3 transition-all duration-200 hover:bg-white hover:text-ac-black cursor-pointer border-none"
        >
          Subscribe
        </button>
      </form>
      {error && <p className="text-ac-red text-[0.7rem] font-mono mt-2">{error}</p>}
    </div>
  );
}

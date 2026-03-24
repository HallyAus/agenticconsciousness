'use client';

import { useState, FormEvent } from 'react';

interface SendToEmailProps {
  resultText: string;
  toolName: string;
}

export default function SendToEmail({ resultText, toolName }: SendToEmailProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email.');
      return;
    }

    setSending(true);
    setError('');

    try {
      await fetch('/api/send-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, toolName, results: resultText }),
      });
      setSent(true);
    } catch {
      setError('Failed to send. Try copying instead.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 py-2">
        <span className="font-mono text-[0.65rem] tracking-[1px] uppercase text-[#39ff14]">
          Sent to {email} ✓
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-0 items-stretch">
      <input
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError(''); }}
        placeholder="Email results to..."
        className="bg-ac-black border border-border-subtle py-2 px-3 text-text-primary font-display text-[0.75rem] outline-none transition-colors duration-200 focus:border-ac-red placeholder:text-text-ghost w-[200px]"
      />
      <button
        type="submit"
        disabled={sending}
        className="font-mono text-[0.6rem] tracking-[2px] uppercase py-2 px-4 transition-all duration-200 cursor-pointer border border-ac-red bg-transparent text-ac-red hover:bg-ac-red hover:text-white disabled:opacity-30"
      >
        {sending ? '...' : 'SEND'}
      </button>
      {error && <span className="text-ac-red text-[0.6rem] font-mono self-center ml-2">{error}</span>}
    </form>
  );
}

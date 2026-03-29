'use client';

import { useState } from 'react';
import StagedLoading from '@/components/StagedLoading';
import CopyButton from '@/components/CopyButton';
import SendToEmail from '@/components/SendToEmail';
import ToggleGroup from '@/components/ToggleGroup';
import { trackEvent } from '@/lib/tracking';
import { useCsrf } from '@/lib/useCsrf';

interface EmailResult {
  subject: string;
  body: string;
  wordCount: number;
  toneNotes: string;
}

const EXAMPLE = {
  text: "need to tell the client their project will be 2 weeks late because we're waiting on the API integration from their dev team, they haven't given us access yet. don't want to blame them but need to be clear it's blocking us. also want to suggest a workaround where we build a mock API in the meantime",
  recipient: 'Client — project manager at BluePeak Properties',
  tone: 'Professional',
};

const inputClass =
  'w-full py-3 px-4 text-[0.85rem] font-display outline-none transition-colors duration-200 focus:border-ac-red placeholder:text-text-dim';

const inputStyle = {
  background: 'var(--bg-page)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-body)',
};

const btnClass =
  'w-full py-4 font-display text-[0.75rem] font-black tracking-[2px] uppercase cursor-pointer border-none text-white transition-all duration-200 hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed';

const STAGED_STEPS = [
  'Reading your notes...',
  'Choosing tone...',
  'Drafting...',
  'Polishing...',
  'Complete.',
];

export default function EmailTool() {
  const csrfToken = useCsrf();
  const [text, setText] = useState('');
  const [recipient, setRecipient] = useState('');
  const [tone, setTone] = useState('Professional');
  const [loading, setLoading] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<EmailResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const textLen = text.length;
  const canSubmit = !loading && textLen >= 10 && textLen <= 3000;

  function fillExample() {
    setText(EXAMPLE.text);
    setRecipient(EXAMPLE.recipient);
    setTone(EXAMPLE.tone);
    setResult(null);
    setError(null);
  }

  function clearAll() {
    setText('');
    setRecipient('');
    setTone('Professional');
    setResult(null);
    setError(null);
    setApiDone(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setApiDone(false);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/tools/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ text, recipient: recipient || undefined, tone }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Email drafting failed. Please try again.');
      } else {
        setApiDone(true);
        setTimeout(() => {
          setResult(data);
          trackEvent('ViewContent', { content_name: 'Email Drafter' });
        }, 600);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-14">
          <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase text-ac-red mb-3">
            TOOL / EMAIL DRAFTER
          </div>
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-black tracking-tight leading-none mb-4">
            Write the email you&apos;ve been putting off.
          </h2>
          <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] max-w-[480px]">
            Dump your thoughts in plain language. Claude turns them into a polished, professional email in the tone you choose.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 max-md:grid-cols-1 max-sm:gap-4">
          {/* LEFT: Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={fillExample}
                className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase px-3 py-2 cursor-pointer transition-all duration-200"
                style={{
                  border: '1px solid var(--red-pill-border)',
                  color: 'var(--red-text)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--red-faint)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                TRY AN EXAMPLE
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim">
                What do you need to say?
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 3000))}
                placeholder="Just brain-dump it. Don't worry about tone or structure — Claude will sort that out..."
                className={`${inputClass} min-h-[180px] max-sm:min-h-[100px] resize-y`}
                style={inputStyle}
                required
              />
              <div className={`font-mono text-[0.8rem] max-sm:text-xs tracking-[1px] text-right ${textLen > 2800 ? 'text-ac-red' : 'text-text-dim'}`}>
                {textLen.toLocaleString()} / 3,000
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim">
                Recipient (optional)
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. Client — project manager at Acme Corp"
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim">
                Tone
              </label>
              <ToggleGroup
                options={['Professional', 'Friendly', 'Direct', 'Formal']}
                value={tone}
                onChange={setTone}
              />
            </div>

            <button type="submit" disabled={!canSubmit} className={btnClass} style={{ background: 'var(--red)' }}>
              {loading ? 'Drafting...' : 'DRAFT EMAIL →'}
            </button>

            {error && (
              <p className="font-mono text-[0.8rem] max-sm:text-xs text-ac-red tracking-[1px]">{error}</p>
            )}
          </form>

          {/* RIGHT: Results */}
          <div className="flex flex-col gap-5">
            {!result && !loading && (
              <div className="flex flex-col gap-3 pt-2">
                <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase text-text-dim">
                  Your email will appear here
                </div>
                <p className="text-[0.85rem] text-text-dim leading-[1.7] font-light">
                  Describe what you need to communicate and Claude will draft a complete email with subject line, opening, body, and sign-off — matched to your chosen tone.
                </p>
                <div className="mt-4 border-t border-border-subtle pt-6 flex flex-col gap-3">
                  {['Subject Line', 'Email Body', 'Tone Notes'].map((label) => (
                    <div key={label} className="bg-ac-card border-t-[3px] border-border-subtle p-5 opacity-30">
                      <div className="h-2 bg-text-dead w-1/3 mb-3" />
                      <div className="h-2 bg-text-dead w-full mb-2" />
                      <div className="h-2 bg-text-dead w-4/5" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex flex-col gap-4 pt-2">
                <StagedLoading steps={STAGED_STEPS} isComplete={apiDone} />
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-5">
                {/* Subject */}
                <div
                  className="p-5"
                  style={{
                    borderLeft: '3px solid var(--red)',
                    background: 'var(--bg-card)',
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '0ms',
                  }}
                >
                  <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase mb-2" style={{ color: 'var(--red)' }}>
                    Subject Line
                  </div>
                  <p className="text-[0.95rem] font-black text-text-primary">{result?.subject}</p>
                </div>

                {/* Email Body */}
                <div
                  className="bg-ac-card p-5"
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '80ms',
                  }}
                >
                  <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase mb-3 text-text-dim">
                    Email Body
                  </div>
                  <div className="text-[0.84rem] font-light leading-[1.8] whitespace-pre-wrap" style={{ color: 'var(--text-body)' }}>
                    {result?.body}
                  </div>
                </div>

                {/* Meta */}
                <div
                  className="flex gap-4 flex-wrap items-center"
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '160ms',
                  }}
                >
                  <span className="font-mono text-[0.8rem] max-sm:text-xs tracking-[1px] text-text-dim">
                    {result?.wordCount} words · {tone} tone
                  </span>
                  {result?.toneNotes && (
                    <span className="font-mono text-[0.8rem] max-sm:text-xs tracking-[1px] text-text-ghost">
                      — {result?.toneNotes}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div
                  className="flex gap-3 flex-wrap items-center"
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '240ms',
                  }}
                >
                  <CopyButton text={`Subject: ${result?.subject ?? ''}\n\n${result?.body ?? ''}`} label="COPY EMAIL" />
                  <CopyButton text={result?.subject ?? ''} label="COPY SUBJECT" />
                  <SendToEmail resultText={`Subject: ${result?.subject ?? ''}\n\n${result?.body ?? ''}`} toolName="Email Drafter" />
                  <button
                    type="button"
                    onClick={clearAll}
                    className="font-display text-[0.75rem] font-black tracking-[2px] uppercase py-3 px-5 cursor-pointer border-none transition-all duration-200 hover:opacity-80"
                    style={{ background: 'var(--red)', color: '#fff' }}
                  >
                    DRAFT ANOTHER
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}

'use client';

import { useState } from 'react';
import ScrollReveal from '@/components/ScrollReveal';
import AiLoading from '@/components/AiLoading';
import { trackEvent } from '@/lib/tracking';

interface AiResult {
  recommendedService: string;
  reason: string;
  quickWin: string;
  confidence: string;
}

type Step = 'challenge' | 'recommend' | 'done';

const INPUT_CLASS =
  'w-full bg-ac-black border border-border-subtle focus:border-ac-red outline-none text-text-primary py-3 px-4 font-display text-[0.85rem] placeholder:text-text-dim transition-colors duration-150';

export default function CTA() {
  const [step, setStep] = useState<Step>('challenge');
  const [challenge, setChallenge] = useState('');
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [analyseError, setAnalyseError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  async function handleAnalyse() {
    if (!challenge.trim()) return;
    setAnalysing(true);
    setAnalyseError('');
    try {
      const res = await fetch('/api/smart-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge: challenge.trim() }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data: AiResult = await res.json();
      setResult(data);
      setMessage(`Hi, I'd like to explore ${data.recommendedService} for my business.\n\nMy challenge: ${challenge.trim()}`);
      setStep('recommend');
    } catch {
      setAnalyseError('Something went wrong — please try again.');
    } finally {
      setAnalysing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          message: message.trim(),
          recommendedService: result?.recommendedService,
        }),
      });
      if (!res.ok) throw new Error('Submission failed');
      trackEvent('Lead', { content_name: 'Smart Contact' });
      setStep('done');
    } catch {
      setSubmitError('Submission failed — please try again or email us directly.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="contact" aria-label="Contact us" className="py-28 px-10 relative overflow-hidden max-md:px-5 max-sm:py-20">
      <ScrollReveal>
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-ac-card border-2 border-ac-red py-20 px-12 relative max-sm:py-12 max-sm:px-6">
            {/* Ghost watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20rem] font-black text-[var(--ghost-watermark)] pointer-events-none tracking-[-10px] select-none">
              AC
            </div>

            <div className="relative z-10">
              {/* ── Step 1: Challenge input ── */}
              {step === 'challenge' && (
                <div className="max-w-[640px] mx-auto">
                  <div className="font-mono text-[0.7rem] tracking-[3px] uppercase text-ac-red mb-6">
                    READY?
                  </div>
                  <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight mb-4">
                    Let&apos;s build something <span className="text-ac-red">intelligent.</span>
                  </h2>
                  <p className="text-[1rem] text-text-dim mb-10 font-light leading-[1.7]">
                    Tell us your challenge. Our AI will recommend exactly how we can help.
                  </p>

                  <textarea
                    className={`${INPUT_CLASS} min-h-[120px] resize-y mb-4`}
                    placeholder="What's the biggest challenge or time-sink in your business right now?"
                    value={challenge}
                    onChange={(e) => setChallenge(e.target.value)}
                    maxLength={1000}
                    disabled={analysing}
                  />

                  {analyseError && (
                    <p className="text-ac-red font-mono text-[0.75rem] mb-4">{analyseError}</p>
                  )}

                  {analysing ? (
                    <AiLoading text="Analysing your challenge..." />
                  ) : (
                    <button
                      onClick={handleAnalyse}
                      disabled={!challenge.trim()}
                      className="font-display text-[0.75rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 bg-ac-red text-white transition-all duration-200 hover:bg-white hover:text-ac-black disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ANALYSE →
                    </button>
                  )}
                </div>
              )}

              {/* ── Step 2: AI recommendation + contact form ── */}
              {step === 'recommend' && result && (
                <div className="max-w-[640px] mx-auto">
                  {/* Recommended service */}
                  <div className="font-mono text-[0.7rem] tracking-[3px] uppercase text-text-dim mb-3">
                    AI RECOMMENDATION
                  </div>
                  <div className="text-[1.5rem] font-black text-ac-red mb-5 tracking-tight">
                    {result.recommendedService}
                    {result.confidence === 'High' && (
                      <span className="ml-3 font-mono text-[0.65rem] tracking-[2px] text-text-dim align-middle">
                        HIGH CONFIDENCE
                      </span>
                    )}
                  </div>

                  {/* Reason */}
                  <div className="border-l-2 border-ac-red pl-4 mb-6 text-text-dim font-light leading-[1.7] text-[0.9rem]">
                    {result.reason}
                  </div>

                  {/* Quick win */}
                  <div className="bg-ac-block px-5 py-4 mb-8">
                    <span className="font-mono text-[0.65rem] tracking-[2px] uppercase text-ac-red">
                      Try this now:
                    </span>
                    <p className="mt-2 text-text-primary font-light leading-[1.7] text-[0.9rem]">
                      {result.quickWin}
                    </p>
                  </div>

                  {/* Contact form */}
                  <p className="text-[0.9rem] text-text-dim font-light mb-6">
                    Want to explore this further? Leave your details.
                  </p>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input
                      type="text"
                      className={INPUT_CLASS}
                      placeholder="Name *"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={submitting}
                    />
                    <input
                      type="email"
                      className={INPUT_CLASS}
                      placeholder="Email *"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={submitting}
                    />
                    <input
                      type="tel"
                      className={INPUT_CLASS}
                      placeholder="Phone (optional)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={submitting}
                    />
                    <textarea
                      className={`${INPUT_CLASS} min-h-[100px] resize-y`}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={submitting}
                    />

                    {submitError && (
                      <p className="text-ac-red font-mono text-[0.75rem]">{submitError}</p>
                    )}

                    {submitting ? (
                      <AiLoading text="Sending..." />
                    ) : (
                      <button
                        type="submit"
                        disabled={!name.trim() || !email.trim()}
                        className="font-display text-[0.75rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 bg-ac-red text-white transition-all duration-200 hover:bg-white hover:text-ac-black disabled:opacity-40 disabled:cursor-not-allowed self-start"
                      >
                        SEND →
                      </button>
                    )}
                  </form>
                </div>
              )}

              {/* ── Step 3: Confirmation ── */}
              {step === 'done' && (
                <div className="max-w-[640px] mx-auto text-center">
                  <div className="font-mono text-[0.7rem] tracking-[3px] uppercase text-ac-red mb-6">
                    RECEIVED
                  </div>
                  <div className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tight mb-6">
                    Thanks, <span className="text-ac-red">{name}.</span>
                  </div>
                  <p className="text-[1rem] text-text-dim font-light leading-[1.7] mb-6">
                    We&apos;ll review your challenge and be in touch within 24 hours.
                  </p>
                  {result && (
                    <div className="bg-ac-block px-5 py-4 text-left">
                      <span className="font-mono text-[0.65rem] tracking-[2px] uppercase text-ac-red">
                        In the meantime:
                      </span>
                      <p className="mt-2 text-text-primary font-light leading-[1.7] text-[0.9rem]">
                        Try the quick win above — it works.
                      </p>
                      <p className="mt-3 text-text-dim font-light leading-[1.7] text-[0.85rem] italic">
                        &ldquo;{result.quickWin}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

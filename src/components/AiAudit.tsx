'use client';

import { useState, useRef } from 'react';
import AiLoading from '@/components/AiLoading';
import { trackEvent } from '@/lib/tracking';
import { useCsrf } from '@/lib/useCsrf';

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

const BUSINESS_SIZES = [
  'Solo / Freelancer',
  '2-10 employees',
  '11-50 employees',
  '51-200 employees',
  '200+ employees',
];

interface Opportunity {
  title: string;
  description: string;
  impact: 'High' | 'Medium';
  timeframe: string;
}

interface AuditResult {
  headline: string;
  opportunities: Opportunity[];
  nextStep: string;
}

const COOLDOWN_SECONDS = 30;

export default function AiAudit() {
  const csrfToken = useCsrf();
  const [industry, setIndustry] = useState('');
  const [businessSize, setBusinessSize] = useState('');
  const [painPoint, setPainPoint] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const charCount = painPoint.length;
  const isOverLimit = charCount > 450;
  const canSubmit = industry && businessSize && painPoint.trim() && !loading && cooldown === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ industry, businessSize, painPoint }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Analysis failed. Please try again.');
      } else {
        setResult(data);
        trackEvent('Lead', { content_name: 'AI Audit' });
        startCooldown();
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function startCooldown() {
    setCooldown(COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const selectClass =
    'w-full bg-ac-black border border-border-subtle focus:border-ac-red outline-none text-text-primary text-[0.85rem] px-4 py-3 appearance-none cursor-pointer transition-colors duration-150';

  return (
    <section id="ai-audit" aria-label="AI business audit" className="py-28 px-10 max-md:px-5 max-sm:py-20">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-14">
          <div className="font-mono text-[0.7rem] tracking-[3px] uppercase text-ac-red mb-3">
            005 / AI AUDIT
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none mb-5">
            Free AI opportunity snapshot.
          </h2>
          <p className="text-[0.9rem] text-text-dim leading-[1.7] font-light max-w-[540px]">
            Tell us about your business. In seconds, our AI analyst will identify your three
            highest-impact automation opportunities — specific, realistic, and ranked by speed to
            value.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-2 gap-10 max-[900px]:grid-cols-1">
          {/* LEFT: Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Industry */}
            <div className="flex flex-col gap-2">
              <label htmlFor="audit-industry" className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim">
                Industry
              </label>
              <div className="relative">
                <select
                  id="audit-industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="" disabled>
                    Select your industry
                  </option>
                  {INDUSTRIES.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {/* Custom chevron */}
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M1 1L5 5L9 1" stroke="#ff3d00" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Business size */}
            <div className="flex flex-col gap-2">
              <label htmlFor="audit-business-size" className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim">
                Business Size
              </label>
              <div className="relative">
                <select
                  id="audit-business-size"
                  value={businessSize}
                  onChange={(e) => setBusinessSize(e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="" disabled>
                    Select business size
                  </option>
                  {BUSINESS_SIZES.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M1 1L5 5L9 1" stroke="#ff3d00" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Pain point */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim">
                Biggest Pain Point
              </label>
              <div className="relative">
                <textarea
                  value={painPoint}
                  onChange={(e) => setPainPoint(e.target.value.slice(0, 500))}
                  placeholder="e.g. Quoting takes our estimators 3+ hours per job and we're losing work to faster competitors..."
                  rows={5}
                  className="w-full bg-ac-black border border-border-subtle focus:border-ac-red outline-none text-text-primary text-[0.85rem] px-4 py-3 resize-y min-h-[120px] transition-colors duration-150 placeholder:text-text-dim"
                  required
                />
                <div
                  className={`text-right font-mono text-[0.65rem] tracking-[1px] mt-1 ${isOverLimit ? 'text-ac-red' : 'text-text-dim'}`}
                >
                  {charCount} / 500
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-ac-red text-white font-black tracking-[2px] uppercase text-[0.75rem] py-4 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity duration-150 hover:opacity-90"
            >
              {loading
                ? 'Analysing...'
                : cooldown > 0
                  ? `Try again in ${cooldown}s...`
                  : 'Run AI Audit'}
            </button>

            {error && (
              <p className="font-mono text-[0.65rem] text-ac-red tracking-[1px]">{error}</p>
            )}
          </form>

          {/* RIGHT: Results */}
          <div className="flex flex-col gap-6">
            {!result && !loading && (
              <div className="flex flex-col gap-3 pt-2">
                <div className="font-mono text-[0.6rem] tracking-[3px] uppercase text-text-dim">
                  Your snapshot will appear here
                </div>
                <p className="text-[0.85rem] text-text-dim leading-[1.7] font-light">
                  Fill out the form and run your free AI audit. We&apos;ll identify your top three
                  automation opportunities — ranked by speed to value and tailored to your
                  industry.
                </p>
                <div className="mt-4 border-t border-border-subtle pt-6 flex flex-col gap-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="bg-ac-card border-t-[3px] border-border-subtle p-6 opacity-30"
                    >
                      <div className="h-3 bg-text-dead w-2/3 mb-3" />
                      <div className="h-2 bg-text-dead w-full mb-2" />
                      <div className="h-2 bg-text-dead w-4/5" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex flex-col gap-4 pt-2">
                <AiLoading text="Analysing your business profile..." />
                <p className="text-[0.75rem] text-text-dim font-mono tracking-[1px]">
                  Identifying opportunities specific to your industry and pain point...
                </p>
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-6">
                {/* Headline */}
                <div>
                  <div className="font-mono text-[0.7rem] tracking-[3px] uppercase text-ac-red mb-2">
                    AI Opportunity Snapshot
                  </div>
                  <h3 className="text-[1.4rem] font-black tracking-tight leading-tight text-text-primary">
                    {result.headline}
                  </h3>
                </div>

                {/* Opportunity cards */}
                <div className="flex flex-col gap-4">
                  {result.opportunities.map((opp, i) => (
                    <div
                      key={i}
                      className="bg-ac-card border-t-[3px] border-ac-red p-6"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h4 className="text-[0.95rem] font-black text-text-primary leading-tight">
                          {opp.title}
                        </h4>
                        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                          <span
                            className={`font-mono text-[0.65rem] tracking-[1px] uppercase border px-2 py-1 ${
                              opp.impact === 'High'
                                ? 'border-ac-red text-ac-red'
                                : 'border-border-subtle text-text-dim'
                            }`}
                          >
                            {opp.impact} impact
                          </span>
                          <span className="font-mono text-[0.65rem] tracking-[1px] uppercase border border-border-subtle text-text-dim px-2 py-1">
                            {opp.timeframe}
                          </span>
                        </div>
                      </div>
                      <p className="text-[0.82rem] text-text-dim leading-[1.7] font-light">
                        {opp.description}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Next step CTA */}
                <div className="border border-border-subtle p-6">
                  <p className="text-[0.85rem] text-text-dim leading-[1.7] font-light mb-4">
                    {result.nextStep}
                  </p>
                  <a
                    href="#contact"
                    className="inline-block bg-ac-red text-white font-black tracking-[2px] uppercase text-[0.7rem] px-6 py-3 hover:opacity-90 transition-opacity duration-150"
                  >
                    Book Free Consultation
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

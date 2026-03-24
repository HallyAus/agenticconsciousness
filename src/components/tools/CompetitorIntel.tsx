'use client';

import { useState } from 'react';
import StagedLoading from '@/components/StagedLoading';
import CopyButton from '@/components/CopyButton';
import SendToEmail from '@/components/SendToEmail';
import { incrementRateLimit, usesRemaining as getUsesRemaining, MAX_TOOL_USES } from '@/lib/toolRateLimit';

interface CompetitorResult {
  companyName: string;
  positioning: string;
  strengths: string[];
  weaknesses: string[];
  pricingStrategy: string;
  differentiationOpportunities: string[];
  aiAdvantage: string;
  confidenceLevel: 'High' | 'Medium' | 'Low';
}

const EXAMPLE = {
  companyName: 'Deloitte Digital',
  context:
    'Management consulting firm offering AI and digital transformation services to enterprise clients in Australia. They have a large team and established brand.',
  yourCompany: 'Agentic Consciousness',
};

const inputClass =
  'w-full bg-ac-black border border-border-subtle py-3 px-4 text-text-primary font-display text-[0.85rem] outline-none transition-colors duration-200 focus:border-ac-red placeholder:text-text-dim';

const btnClass =
  'w-full bg-ac-red text-white font-display text-[0.75rem] font-black tracking-[2px] uppercase py-4 transition-all duration-200 hover:bg-white hover:text-ac-black disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none';

const STAGED_STEPS = [
  'Researching company...',
  'Analysing positioning...',
  'Identifying weaknesses...',
  'Finding opportunities...',
  'Complete.',
];

function ConfidencePill({ level }: { level: 'High' | 'Medium' | 'Low' }) {
  const styles: Record<string, React.CSSProperties> = {
    High: { border: '1px solid var(--status-green)', color: 'var(--status-green)' },
    Medium: { border: '1px solid var(--border-subtle)', color: 'var(--text-dim)' },
    Low: { border: '1px solid var(--border-subtle)', color: 'var(--text-ghost)' },
  };
  return (
    <span
      className="font-mono text-[0.65rem] tracking-[1px] uppercase px-2 py-1"
      style={styles[level]}
    >
      {level} confidence
      {level === 'Low' && ' — limited public data'}
    </span>
  );
}

export default function CompetitorIntel() {
  const [companyName, setCompanyName] = useState('');
  const [context, setContext] = useState('');
  const [yourCompany, setYourCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [result, setResult] = useState<CompetitorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingUses, setRemainingUses] = useState<number>(() => getUsesRemaining());

  const canSubmit = !loading && remainingUses > 0 && companyName.trim().length >= 2;

  function fillExample() {
    setCompanyName(EXAMPLE.companyName);
    setContext(EXAMPLE.context);
    setYourCompany(EXAMPLE.yourCompany);
    setResult(null);
    setError(null);
  }

  function clearAll() {
    setCompanyName('');
    setContext('');
    setYourCompany('');
    setResult(null);
    setError(null);
    setLoadingComplete(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const currentRemaining = getUsesRemaining();
    if (currentRemaining <= 0) {
      setRemainingUses(0);
      return;
    }

    setLoading(true);
    setLoadingComplete(false);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/tools/competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          context: context || undefined,
          yourCompany: yourCompany || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Analysis failed. Please try again.');
      } else {
        const next = incrementRateLimit();
        setRemainingUses(Math.max(0, MAX_TOOL_USES - next.count));
        setLoadingComplete(true);
        setTimeout(() => setResult(data), 400);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function buildReportText(r: CompetitorResult): string {
    const lines = [
      `COMPETITOR INTELLIGENCE REPORT`,
      `Company: ${r.companyName}`,
      `Confidence: ${r.confidenceLevel}`,
      ``,
      `POSITIONING`,
      r.positioning,
      ``,
      `STRENGTHS`,
      ...r.strengths.map((s, i) => `${i + 1}. ${s}`),
      ``,
      `WEAKNESSES`,
      ...r.weaknesses.map((w, i) => `${i + 1}. ${w}`),
      ``,
      `PRICING STRATEGY`,
      r.pricingStrategy,
      ``,
      `DIFFERENTIATION OPPORTUNITIES`,
      ...r.differentiationOpportunities.map((d, i) => `${i + 1}. ${d}`),
      ``,
      `AI ADVANTAGE`,
      r.aiAdvantage,
    ];
    return lines.join('\n');
  }

  return (
    <section className="py-28 px-10 max-md:px-5 max-sm:py-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-14">
          <div className="font-mono text-[0.7rem] tracking-[3px] uppercase text-ac-red mb-3">
            TOOL 03 / COMPETITOR INTEL
          </div>
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-black tracking-tight leading-none mb-4">
            Know your competition.
          </h2>
          <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] max-w-[480px]">
            Enter a competitor&apos;s name. Claude analyses their positioning, strengths, weaknesses, and where you can win.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 max-[900px]:grid-cols-1">
          {/* LEFT: Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* TRY AN EXAMPLE */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={fillExample}
                className="font-mono text-[0.65rem] tracking-[2px] uppercase px-3 py-2 cursor-pointer transition-all duration-200"
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
              <label className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim">
                Competitor Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value.slice(0, 200))}
                placeholder="e.g. Salesforce, HubSpot, a local competitor..."
                className={inputClass}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim">
                Context (optional)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value.slice(0, 1000))}
                placeholder="Industry, market segment, why you're analysing them..."
                className={`${inputClass} min-h-[100px] resize-y`}
              />
              <div className="font-mono text-[0.65rem] tracking-[1px] text-text-dim text-right">
                {context.length} / 1,000
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim">
                Your Company (optional)
              </label>
              <input
                type="text"
                value={yourCompany}
                onChange={(e) => setYourCompany(e.target.value)}
                placeholder="Your business name for tailored insights"
                className={inputClass}
              />
            </div>

            {remainingUses <= 0 ? (
              <div className="bg-ac-card border-2 border-ac-red p-6 text-center">
                <p className="text-[0.9rem] font-black text-text-primary mb-2">You&apos;ve hit the limit.</p>
                <p className="text-text-dim text-[0.8rem] font-light mb-4">
                  Imagine these tools running 24/7, customised for your business — that&apos;s what we build.
                </p>
                <a href="/#contact" className="inline-block font-display text-[0.7rem] font-black tracking-[2px] uppercase py-3 px-6 bg-ac-red text-white no-underline transition-all duration-200 hover:bg-white hover:text-ac-black">
                  Book free consultation →
                </a>
              </div>
            ) : (
              <>
                <button type="submit" disabled={!canSubmit} className={btnClass}>
                  {loading ? 'Analysing...' : 'ANALYSE COMPETITOR →'}
                </button>
                {remainingUses < MAX_TOOL_USES && (
                  <div className="font-mono text-[0.65rem] tracking-[1px] text-text-dim text-center mt-2">
                    {remainingUses} of {MAX_TOOL_USES} free uses remaining this minute
                  </div>
                )}
              </>
            )}

            {error && (
              <p className="font-mono text-[0.65rem] text-ac-red tracking-[1px]">{error}</p>
            )}
          </form>

          {/* RIGHT: Results */}
          <div className="flex flex-col gap-5">
            {!result && !loading && (
              <div className="flex flex-col gap-3 pt-2">
                <div className="font-mono text-[0.7rem] tracking-[3px] uppercase text-text-dim">
                  Intelligence report will appear here
                </div>
                <p className="text-[0.85rem] text-text-dim leading-[1.7] font-light">
                  Enter a competitor name and Claude will analyse their positioning, pricing strategy, strengths, weaknesses, and where you have the best opportunity to differentiate.
                </p>
                <div className="mt-4 border-t border-border-subtle pt-6 flex flex-col gap-3">
                  {['Positioning & Strengths', 'Weaknesses', 'Your Advantage'].map((label) => (
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
                <StagedLoading steps={STAGED_STEPS} isComplete={loadingComplete} />
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-5">

                {/* Header */}
                <div
                  className="bg-ac-card p-5"
                  style={{
                    borderTop: '3px solid var(--red)',
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '0ms',
                  }}
                >
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div>
                      <div className="font-mono text-[0.65rem] tracking-[2px] uppercase mb-1" style={{ color: 'var(--red)' }}>
                        Competitor
                      </div>
                      <h3 className="text-[1.4rem] font-black text-text-primary leading-none">{result.companyName}</h3>
                    </div>
                    <ConfidencePill level={result.confidenceLevel} />
                  </div>
                </div>

                {/* Positioning */}
                <div
                  className="bg-ac-card p-5"
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '80ms',
                  }}
                >
                  <div className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim mb-3">
                    Positioning
                  </div>
                  <p
                    className="text-[0.82rem] font-light leading-[1.7] pl-4"
                    style={{
                      color: 'var(--text-dim)',
                      borderLeft: '3px solid var(--red)',
                    }}
                  >
                    {result.positioning}
                  </p>
                </div>

                {/* Strengths & Weaknesses */}
                <div
                  className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1"
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '160ms',
                  }}
                >
                  <div className="bg-ac-card border-t-[3px] border-border-subtle p-5">
                    <div className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim mb-3">
                      STRENGTHS
                    </div>
                    <ul className="flex flex-col gap-2 list-none">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="text-[0.8rem] text-text-dim font-light leading-[1.6] flex gap-2">
                          <span className="flex-shrink-0 mt-[0.25em]" style={{ color: 'var(--red)', fontSize: '0.55rem' }}>●</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-ac-card border-t-[3px] border-border-subtle p-5">
                    <div className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim mb-3">
                      WEAKNESSES
                    </div>
                    <ul className="flex flex-col gap-2 list-none">
                      {result.weaknesses.map((w, i) => (
                        <li key={i} className="text-[0.8rem] text-text-dim font-light leading-[1.6] flex gap-2">
                          <span className="flex-shrink-0 mt-[0.25em]" style={{ color: 'var(--text-dim)', fontSize: '0.55rem' }}>●</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Pricing Strategy */}
                <div
                  className="bg-ac-card border-t-[3px] border-border-subtle p-5"
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '240ms',
                  }}
                >
                  <div className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim mb-3">
                    Pricing Strategy
                  </div>
                  <p className="text-[0.82rem] font-light leading-[1.7]" style={{ color: 'var(--text-dim)' }}>
                    {result.pricingStrategy}
                  </p>
                </div>

                {/* Differentiation Opportunities */}
                <div
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '320ms',
                  }}
                >
                  <div className="font-mono text-[0.65rem] tracking-[2px] uppercase mb-3" style={{ color: 'var(--red)' }}>
                    Differentiation Opportunities
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
                    {result.differentiationOpportunities.slice(0, 4).map((opp, i) => (
                      <div
                        key={i}
                        className="p-4"
                        style={{ background: 'var(--bg-card)' }}
                      >
                        <div className="font-mono text-[1.2rem] font-black mb-2 leading-none" style={{ color: 'var(--red)' }}>
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <p className="text-[0.8rem] font-light leading-[1.6]" style={{ color: 'var(--text-dim)' }}>
                          {opp}
                        </p>
                      </div>
                    ))}
                  </div>
                  {result.differentiationOpportunities.length > 4 && (
                    <div className="mt-3 flex flex-col gap-2">
                      {result.differentiationOpportunities.slice(4).map((opp, i) => (
                        <div key={i} className="flex gap-3 p-3" style={{ background: 'var(--bg-card)' }}>
                          <span className="font-mono text-[0.65rem] font-black flex-shrink-0 mt-0.5" style={{ color: 'var(--red)' }}>
                            {String(i + 5).padStart(2, '0')}
                          </span>
                          <p className="text-[0.8rem] font-light leading-[1.6]" style={{ color: 'var(--text-dim)' }}>{opp}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Advantage callout */}
                <div
                  className="p-5"
                  style={{
                    borderTop: '3px solid var(--red)',
                    background: 'var(--red-faint)',
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '400ms',
                  }}
                >
                  <div className="font-mono text-[0.65rem] tracking-[2px] uppercase mb-3" style={{ color: 'var(--red)' }}>
                    AI Advantage
                  </div>
                  <p className="text-[0.82rem] font-light leading-[1.7] mb-4" style={{ color: 'var(--text-primary)' }}>
                    {result.aiAdvantage}
                  </p>
                  <a
                    href="mailto:ai@agenticconsciousness.com.au"
                    className="font-display text-[0.7rem] font-black tracking-[2px] uppercase no-underline transition-colors duration-200"
                    style={{ color: 'var(--red)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    BOOK CONSULTATION →
                  </a>
                </div>

                {/* Actions */}
                <div
                  className="flex gap-3 flex-wrap items-center"
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '480ms',
                  }}
                >
                  <CopyButton text={buildReportText(result)} label="COPY REPORT" />
                  <CopyButton text={JSON.stringify(result, null, 2)} label="COPY JSON" />
                  <SendToEmail resultText={buildReportText(result)} toolName="Competitor Intel" />
                  <button
                    type="button"
                    onClick={clearAll}
                    className="font-display text-[0.75rem] font-black tracking-[2px] uppercase py-3 px-5 cursor-pointer border-none transition-all duration-200 hover:bg-white hover:text-ac-black"
                    style={{ background: 'var(--red)', color: '#fff' }}
                  >
                    ANALYSE ANOTHER
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

'use client';

import { useState } from 'react';
import Link from 'next/link';
import StagedLoading from '@/components/StagedLoading';
import CopyButton from '@/components/CopyButton';
import SendToEmail from '@/components/SendToEmail';
import ToggleGroup from '@/components/ToggleGroup';
import { incrementRateLimit, usesRemaining as getUsesRemaining, MAX_TOOL_USES } from '@/lib/toolRateLimit';
import { trackEvent } from '@/lib/tracking';

type RoleOption = "I'm the business" | "I'm the customer" | "I'm the employee";
type Assessment = 'Fair' | 'Somewhat one-sided' | 'One-sided' | 'Heavily one-sided';
type Severity = 'High' | 'Medium' | 'Low';

interface Risk {
  risk: string;
  severity: Severity;
  explanation: string;
}

interface ContractResult {
  plainEnglish: string;
  overallAssessment: Assessment;
  risks: Risk[];
  redFlags: string[];
  missingProtections: string[];
  negotiationPoints: string[];
  disclaimer?: string;
}

const EXAMPLE_CLAUSE = `12. LIMITATION OF LIABILITY

12.1 To the maximum extent permitted by applicable law, in no event shall the Service Provider be liable for any indirect, incidental, special, exemplary, or consequential damages (including, but not limited to, procurement of substitute goods or services; loss of use, data, or profits; or business interruption) however caused and on any theory of liability, whether in contract, strict liability, or tort (including negligence or otherwise) arising in any way out of the use of this service, even if advised of the possibility of such damage.

12.2 The Service Provider's total cumulative liability arising out of or related to this agreement will not exceed the amounts paid by Customer to Service Provider in the twelve (12) month period immediately preceding the event giving rise to the claim.

12.3 The limitations of liability in this Section 12 shall not apply to: (a) death or personal injury caused by negligence; (b) fraud or fraudulent misrepresentation; or (c) any other liability that cannot be excluded or limited under applicable law.`;

const EXAMPLE = {
  text: EXAMPLE_CLAUSE,
  context: 'SaaS agreement',
  role: "I'm the customer" as RoleOption,
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
  'Analysing clause...',
  'Identifying risks...',
  'Checking protections...',
  'Drafting assessment...',
  'Complete.',
];

function AssessmentPill({ assessment }: { assessment: Assessment }) {
  const styles: Record<Assessment, React.CSSProperties> = {
    'Fair': { background: 'transparent', color: 'var(--status-green)', border: '1px solid var(--status-green)' },
    'Somewhat one-sided': { background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b' },
    'One-sided': { background: 'var(--red-faint)', color: 'var(--red)', border: '1px solid var(--red-pill-border)' },
    'Heavily one-sided': { background: 'var(--red-faint)', color: 'var(--red)', border: '1px solid var(--red-pill-border)' },
  };
  return (
    <span
      className="font-mono text-[0.65rem] tracking-[1px] uppercase px-3 py-1.5"
      style={styles[assessment]}
    >
      {assessment}
    </span>
  );
}

function SeverityPill({ severity }: { severity: Severity }) {
  const styles: Record<Severity, React.CSSProperties> = {
    High: { background: 'var(--red-faint)', color: 'var(--red)', border: '1px solid var(--red-pill-border)' },
    Medium: { background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b' },
    Low: { background: 'transparent', color: 'var(--text-ghost)', border: '1px solid var(--border-subtle)' },
  };
  return (
    <span
      className="font-mono text-[0.55rem] tracking-[1px] uppercase px-2 py-0.5 whitespace-nowrap"
      style={styles[severity]}
    >
      {severity}
    </span>
  );
}

export default function ContractTool() {
  const [text, setText] = useState('');
  const [context, setContext] = useState('');
  const [role, setRole] = useState<RoleOption>("I'm the business");
  const [loading, setLoading] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<ContractResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingUses, setRemainingUses] = useState<number>(() => getUsesRemaining());

  const textLen = text.length;
  const canSubmit = !loading && remainingUses > 0 && textLen >= 20 && textLen <= 8000;

  const roleMap: Record<RoleOption, 'business' | 'customer' | 'employee'> = {
    "I'm the business": 'business',
    "I'm the customer": 'customer',
    "I'm the employee": 'employee',
  };

  function fillExample() {
    setText(EXAMPLE.text);
    setContext(EXAMPLE.context);
    setRole(EXAMPLE.role);
    setResult(null);
    setError(null);
  }

  function clearAll() {
    setText('');
    setContext('');
    setRole("I'm the business");
    setResult(null);
    setError(null);
    setApiDone(false);
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
    setApiDone(false);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/tools/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          context: context || undefined,
          role: roleMap[role],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Contract review failed. Please try again.');
      } else {
        const next = incrementRateLimit();
        setRemainingUses(Math.max(0, MAX_TOOL_USES - next.count));
        setApiDone(true);
        setTimeout(() => {
          setResult(data);
          setLoading(false);
          trackEvent('ViewContent', { content_name: 'Contract Reviewer' });
        }, 600);
        return;
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      if (!apiDone) setLoading(false);
    }
  }

  function buildAnalysisText(r: ContractResult): string {
    const lines = [
      'CONTRACT CLAUSE ANALYSIS',
      `Assessment: ${r.overallAssessment}`,
      '',
      'PLAIN ENGLISH',
      r.plainEnglish,
    ];
    if (r.risks?.length) {
      lines.push('', 'RISKS', ...(r.risks ?? []).map((risk) => `[${risk.severity}] ${risk.risk}: ${risk.explanation}`));
    }
    if (r.redFlags?.length) {
      lines.push('', 'RED FLAGS', ...(r.redFlags ?? []).map((f) => `• ${f}`));
    }
    if (r.missingProtections?.length) {
      lines.push('', 'MISSING PROTECTIONS', ...(r.missingProtections ?? []).map((p) => `• ${p}`));
    }
    if (r.negotiationPoints?.length) {
      lines.push('', 'NEGOTIATION POINTS', ...(r.negotiationPoints ?? []).map((n, i) => `${i + 1}. ${n}`));
    }
    return lines.join('\n');
  }

  return (
    <section className="py-28 px-10 max-md:px-5 max-sm:py-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-14">
          <div className="font-mono text-[0.7rem] tracking-[3px] uppercase text-ac-red mb-3">
            TOOL / CONTRACT REVIEWER
          </div>
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-black tracking-tight leading-none mb-4">
            Know what you&apos;re signing.
          </h2>
          <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] max-w-[480px]">
            Paste a contract clause and tell Claude your role. It translates the legalese, flags risks, and tells you what to push back on.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 max-[900px]:grid-cols-1">
          {/* LEFT: Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                Contract Clause
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 8000))}
                placeholder="Paste the contract clause or section you want reviewed..."
                className={`${inputClass} min-h-[220px] resize-y`}
                style={inputStyle}
                required
              />
              <div className={`font-mono text-[0.65rem] tracking-[1px] text-right ${textLen > 7500 ? 'text-ac-red' : 'text-text-dim'}`}>
                {textLen.toLocaleString()} / 8,000
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim">
                Context (optional)
              </label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="What type of contract? e.g. SaaS agreement, employment contract..."
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim">
                Your Role
              </label>
              <ToggleGroup
                options={["I'm the business", "I'm the customer", "I'm the employee"]}
                value={role}
                onChange={(v) => setRole(v as RoleOption)}
              />
            </div>

            {remainingUses <= 0 ? (
              <div className="bg-ac-card border-2 border-ac-red p-6 text-center">
                <p className="text-[0.9rem] font-black text-text-primary mb-2">You&apos;ve hit the limit.</p>
                <p className="text-text-dim text-[0.8rem] font-light mb-4">
                  Imagine these tools running 24/7, customised for your business — that&apos;s what we build.
                </p>
                <Link href="/#contact" className="inline-block font-display text-[0.7rem] font-black tracking-[2px] uppercase py-3 px-6 bg-ac-red text-white no-underline transition-all duration-200 hover:bg-white hover:text-ac-black">
                  Book free consultation →
                </Link>
              </div>
            ) : (
              <>
                <button type="submit" disabled={!canSubmit} className={btnClass} style={{ background: 'var(--red)' }}>
                  {loading ? 'Reviewing...' : 'REVIEW CONTRACT →'}
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
                  Analysis will appear here
                </div>
                <p className="text-[0.85rem] text-text-dim leading-[1.7] font-light">
                  Paste the clause, select your role, and Claude will translate the legalese into plain English, rate how fair the clause is, flag risks, and give you negotiation points.
                </p>
                <p className="font-mono text-[0.65rem] tracking-[1px] text-text-ghost">
                  Not legal advice. Always consult a qualified lawyer before signing.
                </p>
                <div className="mt-4 border-t border-border-subtle pt-6 flex flex-col gap-3">
                  {['Plain English', 'Risk Assessment', 'Negotiation Points'].map((label) => (
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
                {/* Disclaimer */}
                <div
                  className="p-4"
                  style={{
                    borderLeft: '3px solid var(--red)',
                    background: 'var(--red-faint)',
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '0ms',
                  }}
                >
                  <p className="font-mono text-[0.6rem] tracking-[1px] leading-[1.6]" style={{ color: 'var(--red)' }}>
                    NOT LEGAL ADVICE — This analysis is for informational purposes only. Consult a qualified lawyer before signing any contract.
                  </p>
                </div>

                {/* Plain English */}
                <div
                  className="p-5"
                  style={{
                    borderLeft: '3px solid var(--red)',
                    background: 'var(--bg-card)',
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '80ms',
                  }}
                >
                  <div className="font-mono text-[0.65rem] tracking-[2px] uppercase mb-2" style={{ color: 'var(--red)' }}>
                    Plain English
                  </div>
                  <p className="text-[0.84rem] font-light leading-[1.8]" style={{ color: 'var(--text-body)' }}>
                    {result.plainEnglish}
                  </p>
                </div>

                {/* Assessment */}
                <div
                  className="flex items-center gap-4"
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '120ms',
                  }}
                >
                  <span className="font-mono text-[0.6rem] tracking-[1px] uppercase text-text-dim">Overall assessment:</span>
                  <AssessmentPill assessment={result?.overallAssessment} />
                </div>

                {/* Risks */}
                {result?.risks && result.risks.length > 0 && (
                  <div
                    className="flex flex-col gap-2"
                    style={{
                      opacity: 0,
                      transform: 'translateY(12px)',
                      animation: 'fadeSlideUp 0.4s ease forwards',
                      animationDelay: '160ms',
                    }}
                  >
                    <div className="font-mono text-[0.65rem] tracking-[2px] uppercase mb-1" style={{ color: 'var(--red)' }}>
                      Risks
                    </div>
                    {result?.risks?.map((risk, i) => (
                      <div
                        key={i}
                        className="p-4 flex gap-3 items-start"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
                      >
                        <SeverityPill severity={risk.severity} />
                        <div>
                          <p className="text-[0.82rem] font-semibold leading-[1.6]" style={{ color: 'var(--text-body)' }}>
                            {risk.risk}
                          </p>
                          <p className="text-[0.78rem] font-light leading-[1.6]" style={{ color: 'var(--text-dim)' }}>
                            {risk.explanation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Red Flags */}
                {result?.redFlags && result.redFlags.length > 0 && (
                  <div
                    className="bg-ac-card p-5"
                    style={{
                      opacity: 0,
                      transform: 'translateY(12px)',
                      animation: 'fadeSlideUp 0.4s ease forwards',
                      animationDelay: '240ms',
                    }}
                  >
                    <div className="font-mono text-[0.65rem] tracking-[2px] uppercase mb-3" style={{ color: 'var(--red)' }}>
                      Red Flags
                    </div>
                    <ul className="flex flex-col gap-2 list-none">
                      {result?.redFlags?.map((flag, i) => (
                        <li key={i} className="text-[0.82rem] font-light leading-[1.6] flex gap-3" style={{ color: 'var(--text-body)' }}>
                          <span className="flex-shrink-0 mt-[0.3em]" style={{ color: 'var(--red)', fontSize: '0.5rem' }}>■</span>
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Protections */}
                {result?.missingProtections && result.missingProtections.length > 0 && (
                  <div
                    className="bg-ac-card p-5"
                    style={{
                      opacity: 0,
                      transform: 'translateY(12px)',
                      animation: 'fadeSlideUp 0.4s ease forwards',
                      animationDelay: '280ms',
                    }}
                  >
                    <div className="font-mono text-[0.65rem] tracking-[2px] uppercase mb-3 text-text-dim">
                      Missing Protections
                    </div>
                    <ul className="flex flex-col gap-2 list-none">
                      {result?.missingProtections?.map((p, i) => (
                        <li key={i} className="text-[0.82rem] font-light leading-[1.6] flex gap-3 text-text-ghost">
                          <span className="flex-shrink-0 mt-[0.3em]" style={{ fontSize: '0.5rem' }}>●</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Negotiation Points */}
                {result?.negotiationPoints && result.negotiationPoints.length > 0 && (
                  <div
                    style={{
                      opacity: 0,
                      transform: 'translateY(12px)',
                      animation: 'fadeSlideUp 0.4s ease forwards',
                      animationDelay: '320ms',
                    }}
                  >
                    <div className="font-mono text-[0.65rem] tracking-[2px] uppercase mb-3" style={{ color: 'var(--red)' }}>
                      Negotiation Points
                    </div>
                    <div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
                      {result?.negotiationPoints?.slice(0, 4).map((np, i) => (
                        <div key={i} className="p-4" style={{ background: 'var(--bg-card)' }}>
                          <div className="font-mono text-[1rem] font-black mb-2 leading-none" style={{ color: 'var(--red)' }}>
                            {String(i + 1).padStart(2, '0')}
                          </div>
                          <p className="text-[0.82rem] font-light leading-[1.6]" style={{ color: 'var(--text-body)' }}>
                            {np}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div
                  className="flex gap-3 flex-wrap items-center"
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '400ms',
                  }}
                >
                  <CopyButton text={buildAnalysisText(result)} label="COPY ANALYSIS" />
                  <SendToEmail resultText={buildAnalysisText(result)} toolName="Contract Reviewer" />
                  <button
                    type="button"
                    onClick={clearAll}
                    className="font-display text-[0.75rem] font-black tracking-[2px] uppercase py-3 px-5 cursor-pointer border-none transition-all duration-200 hover:opacity-80"
                    style={{ background: 'var(--red)', color: '#fff' }}
                  >
                    REVIEW ANOTHER
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

'use client';

import { useState } from 'react';
import StagedLoading from '@/components/StagedLoading';
import CopyButton from '@/components/CopyButton';
import SendToEmail from '@/components/SendToEmail';
import ToggleGroup from '@/components/ToggleGroup';
import { useToolAccess } from '@/components/tools/ToolGate';
import { trackEvent } from '@/lib/tracking';
import { useCsrf } from '@/lib/useCsrf';

interface SummaryResult {
  executiveSummary: string | null;
  keyPoints: string[];
  wordCount: { original: number; summary: number };
  compressionRatio: string;
}

const EXAMPLE_TEXT = `Q1 2024 Business Performance Review — Acme Solutions Pty Ltd

Revenue for the first quarter came in at $2.34 million, representing a 14% increase over the same period last year. This growth was primarily driven by strong performance in our enterprise software division, which accounted for $1.6 million of total revenue, up from $1.2 million in Q1 2023.

New customer acquisition slowed slightly, with 47 new accounts signed compared to 52 in Q4 2023. However, average contract value increased by 22%, from $28,400 to $34,700, indicating a deliberate shift toward higher-value engagements. Customer retention remained strong at 91%, slightly above our 90% target.

Operating costs increased by 8% year-on-year, driven primarily by headcount additions in our customer success and engineering teams. We added 6 full-time staff during the quarter, bringing the total headcount to 43. Despite this investment, EBITDA margins held at 18%, in line with our annual target.

The professional services division underperformed, delivering $420,000 against a budget of $510,000. This shortfall was attributed to two delayed enterprise implementations that have now moved into Q2. The pipeline for professional services remains healthy, with $1.1 million in confirmed work scheduled for delivery over the next two quarters.

Product development milestones were largely achieved, with the new API integration suite released in February and already adopted by 12 enterprise customers. The mobile application refresh, originally planned for March, has been pushed to late April due to third-party dependencies.

Cash position at end of March stood at $890,000, down from $1.1 million at the start of the quarter, reflecting the planned investment in staffing and the delayed revenue from professional services. The board has approved a revised cash flow forecast that returns to the $1 million threshold by end of Q2.

Key priorities for Q2 include completing the two deferred professional services implementations, achieving 10 additional enterprise software sales, launching the mobile application, and maintaining operating margins above 17%.`;

const EXAMPLE = {
  text: EXAMPLE_TEXT,
  length: 'Standard',
};

const inputClass =
  'w-full py-3 px-4 text-[0.85rem] font-display outline-none transition-colors duration-200 focus:border-ac-red placeholder:text-text-dim';

const inputStyle = {
  background: 'var(--bg-page)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-body)',
};

const btnClass =
  'w-full py-4 font-display text-[0.85rem] font-black tracking-[2px] uppercase cursor-pointer border-none text-white transition-all duration-200 hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed';

const STAGED_STEPS = [
  'Reading document...',
  'Identifying key points...',
  'Compressing...',
  'Complete.',
];

export default function SummariseTool() {
  const csrfToken = useCsrf();
  const [text, setText] = useState('');
  const [length, setLength] = useState('Standard');
  const [loading, setLoading] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toolAccess = useToolAccess();

  const textLen = text.length;
  const canSubmit = !loading && textLen >= 50 && textLen <= 10000;

  function fillExample() {
    setText(EXAMPLE.text);
    setLength(EXAMPLE.length);
    setResult(null);
    setError(null);
  }

  function clearAll() {
    setText('');
    setLength('Standard');
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
      const res = await fetch('/api/tools/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ text, length }),
      });

      const data = await res.json();
      if (res.status === 402 || res.status === 429) {
        toolAccess?.triggerEmailGate();
        setError(data.error || 'Daily limit reached. Please verify your email.');
        toolAccess?.refresh();
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Summarisation failed. Please try again.');
      } else {
        toolAccess?.refresh();
        setApiDone(true);
        setTimeout(() => {
          setResult(data);
          setLoading(false);
          trackEvent('ViewContent', { content_name: 'Summarise Tool' });
        }, 600);
        return;
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      if (!apiDone) setLoading(false);
    }
  }

  function buildSummaryText(r: SummaryResult): string {
    const lines = [
      `SUMMARY`,
      `Original: ${r.wordCount?.original ?? 0} words → Summary: ${r.wordCount?.summary ?? 0} words (${r.compressionRatio} compression)`,
      ``,
    ];
    if (r.executiveSummary) {
      lines.push('EXECUTIVE SUMMARY', r.executiveSummary, '');
    }
    if (r.keyPoints?.length) {
      lines.push('KEY POINTS', ...r.keyPoints.map((p, i) => `${i + 1}. ${p}`));
    }
    return lines.join('\n');
  }

  return (
    <section className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-14">
          <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase text-ac-red mb-3">
            TOOL / SUMMARISE
          </div>
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-black tracking-tight leading-none mb-4">
            Get to the point, fast.
          </h2>
          <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] max-w-[480px]">
            Paste any document, report, or article. Claude extracts the key points and gives you a summary you can actually use.
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
                Document Text
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 10000))}
                placeholder="Paste the text you want to summarise — reports, articles, meeting transcripts, emails..."
                className={`${inputClass} min-h-[280px] max-sm:min-h-[140px] resize-y`}
                style={inputStyle}
                required
              />
              <div className={`font-mono text-[0.8rem] max-sm:text-xs tracking-[1px] text-right ${textLen > 9500 ? 'text-ac-red' : 'text-text-dim'}`}>
                {textLen.toLocaleString()} / 10,000
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim">
                Summary Length
              </label>
              <ToggleGroup
                options={['Brief', 'Standard', 'Detailed']}
                value={length}
                onChange={setLength}
              />
            </div>

            <button type="submit" disabled={!canSubmit} className={btnClass} style={{ background: 'var(--red)' }}>
              {loading ? 'Summarising...' : 'SUMMARISE →'}
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
                  Summary will appear here
                </div>
                <p className="text-[0.85rem] text-text-dim leading-[1.7] font-light">
                  Paste your document and Claude will distil it into a clean summary with key points — the Brief, Standard, or Detailed depth you choose.
                </p>
                <div className="mt-4 border-t border-border-subtle pt-6 flex flex-col gap-3">
                  {['Stats', 'Executive Summary', 'Key Points'].map((label) => (
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
                {/* Stats row */}
                <div
                  className="flex gap-4 flex-wrap"
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '0ms',
                  }}
                >
                  {[
                    { label: 'Original', value: `${result?.wordCount?.original ?? 0} words` },
                    { label: 'Summary', value: `${result?.wordCount?.summary ?? 0} words` },
                    { label: 'Compression', value: result?.compressionRatio },
                  ].map((stat) => (
                    <div key={stat.label} className="flex-1 min-w-[100px] p-4" style={{ background: 'var(--bg-card)' }}>
                      <div className="font-mono text-[0.7rem] max-sm:text-xs tracking-[1px] uppercase mb-1" style={{ color: 'var(--text-dim)' }}>
                        {stat.label}
                      </div>
                      <div className="font-black text-[0.9rem]" style={{ color: 'var(--red)' }}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Executive Summary */}
                {result?.executiveSummary && length !== 'Brief' && (
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
                    <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase mb-2" style={{ color: 'var(--red)' }}>
                      Executive Summary
                    </div>
                    <p className="text-[0.84rem] font-light leading-[1.8]" style={{ color: 'var(--text-body)' }}>
                      {result?.executiveSummary}
                    </p>
                  </div>
                )}

                {/* Key Points */}
                <div
                  className="bg-ac-card p-5"
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '160ms',
                  }}
                >
                  <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase mb-3" style={{ color: 'var(--red)' }}>
                    Key Points
                  </div>
                  <ul className="flex flex-col gap-2 list-none">
                    {result?.keyPoints?.map((point, i) => (
                      <li key={i} className="text-[0.82rem] font-light leading-[1.6] flex gap-3" style={{ color: 'var(--text-body)' }}>
                        <span className="flex-shrink-0 mt-[0.3em]" style={{ color: 'var(--red)', fontSize: '0.5rem' }}>■</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
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
                  <CopyButton text={buildSummaryText(result)} label="COPY SUMMARY" />
                  <SendToEmail resultText={buildSummaryText(result)} toolName="Summarise Tool" />
                  <button
                    type="button"
                    onClick={clearAll}
                    className="font-display text-[0.85rem] font-black tracking-[2px] uppercase py-3 px-5 cursor-pointer border-none transition-all duration-200 hover:opacity-80"
                    style={{ background: 'var(--red)', color: '#fff' }}
                  >
                    SUMMARISE ANOTHER
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

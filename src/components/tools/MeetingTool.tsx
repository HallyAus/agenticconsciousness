'use client';

import { useState } from 'react';
import StagedLoading from '@/components/StagedLoading';
import CopyButton from '@/components/CopyButton';
import SendToEmail from '@/components/SendToEmail';
import { useToolAccess } from '@/components/tools/ToolGate';
import { trackEvent } from '@/lib/tracking';
import { useCsrf } from '@/lib/useCsrf';

interface ActionItem {
  action: string;
  owner: string;
  deadline: string;
  priority: 'High' | 'Medium' | 'Low';
}

interface MeetingResult {
  meetingSummary: string;
  actionItems: ActionItem[];
  decisions: string[];
  followUps: string[];
  attendees: string[];
  nextMeeting: string | null;
}

const EXAMPLE = {
  text: "met with sarah and james from blupeak. talked about the website redesign timeline. sarah wants the homepage done by end of march. james said the brand guidelines aren't ready yet, maybe next week. need to get the hosting sorted — daniel to check pricing on aws vs cloudflare. also discussed the blog strategy, sarah will send us 5 topic ideas by friday. budget is $15k confirmed. james mentioned they might want an AI chatbot later - follow up in april. next meeting thursday 3pm.",
  context: 'Client website project kickoff',
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
  'Reading notes...',
  'Extracting actions...',
  'Assigning owners...',
  'Structuring...',
  'Complete.',
];

function PriorityPill({ priority }: { priority: 'High' | 'Medium' | 'Low' }) {
  const styles: Record<string, React.CSSProperties> = {
    High: { background: 'var(--red-faint)', color: 'var(--red)', border: '1px solid var(--red-pill-border)' },
    Medium: { background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border-subtle)' },
    Low: { background: 'transparent', color: 'var(--text-ghost)', border: '1px solid var(--border-subtle)' },
  };
  return (
    <span
      className="font-mono text-[0.6rem] max-sm:text-xs tracking-[1px] uppercase px-2 py-0.5 whitespace-nowrap"
      style={styles[priority]}
    >
      {priority}
    </span>
  );
}

export default function MeetingTool() {
  const csrfToken = useCsrf();
  const [text, setText] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toolAccess = useToolAccess();

  const textLen = text.length;
  const canSubmit = !loading && textLen >= 20 && textLen <= 5000;

  function fillExample() {
    setText(EXAMPLE.text);
    setContext(EXAMPLE.context);
    setResult(null);
    setError(null);
  }

  function clearAll() {
    setText('');
    setContext('');
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
      const res = await fetch('/api/tools/meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ text, context: context || undefined }),
      });

      const data = await res.json();
      if (res.status === 402 || res.status === 429) {
        toolAccess?.triggerEmailGate();
        setError(data.error || 'Daily limit reached. Please verify your email.');
        toolAccess?.refresh();
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Extraction failed. Please try again.');
      } else {
        toolAccess?.refresh();
        setApiDone(true);
        setTimeout(() => {
          setResult(data);
          setLoading(false);
          trackEvent('ViewContent', { content_name: 'Meeting Actions' });
        }, 600);
        return;
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      if (!apiDone) setLoading(false);
    }
  }

  function buildActionsText(r: MeetingResult): string {
    const lines = [
      'MEETING ACTION ITEMS',
      r.meetingSummary,
      '',
      'ACTION ITEMS',
      ['Action', 'Owner', 'Deadline', 'Priority'].join('\t'),
      ...(r.actionItems ?? []).map((a) => [a.action, a.owner, a.deadline, a.priority].join('\t')),
    ];
    if (r.decisions?.length) {
      lines.push('', 'DECISIONS', ...r.decisions.map((d) => `• ${d}`));
    }
    if (r.followUps?.length) {
      lines.push('', 'FOLLOW-UPS', ...r.followUps.map((f) => `• ${f}`));
    }
    if (r.attendees?.length) {
      lines.push('', `Attendees: ${r.attendees.join(', ')}`);
    }
    if (r.nextMeeting) {
      lines.push(`Next Meeting: ${r.nextMeeting}`);
    }
    return lines.join('\n');
  }

  function buildCsvText(r: MeetingResult): string {
    const rows = [
      ['Action', 'Owner', 'Deadline', 'Priority'],
      ...(r.actionItems ?? []).map((a) => [a.action, a.owner, a.deadline, a.priority]),
    ];
    return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  return (
    <section className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-14">
          <div className="font-mono text-[0.7rem] tracking-[3px] uppercase text-ac-red mb-3">
            TOOL / MEETING ACTIONS
          </div>
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-black tracking-tight leading-none mb-4">
            Turn messy notes into clear actions.
          </h2>
          <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] max-w-[480px]">
            Paste your raw meeting notes. Claude extracts every action item, assigns owners, sets deadlines, and identifies decisions — ready to share.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 max-md:grid-cols-1 max-sm:gap-4">
          {/* LEFT: Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={fillExample}
                className="font-mono text-[0.7rem] max-sm:text-xs tracking-[2px] uppercase px-3 py-2 cursor-pointer transition-all duration-200"
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
              <label className="font-mono text-[0.7rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim">
                Meeting Notes
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 5000))}
                placeholder="Paste your raw notes — voice memos, scribbles, transcript snippets, anything..."
                className={`${inputClass} min-h-[220px] max-sm:min-h-[120px] resize-y`}
                style={inputStyle}
                required
              />
              <div className={`font-mono text-[0.7rem] max-sm:text-xs tracking-[1px] text-right ${textLen > 4700 ? 'text-ac-red' : 'text-text-dim'}`}>
                {textLen.toLocaleString()} / 5,000
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.7rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim">
                Context (optional)
              </label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="What was the meeting about?"
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <button type="submit" disabled={!canSubmit} className={btnClass} style={{ background: 'var(--red)' }}>
              {loading ? 'Extracting...' : 'EXTRACT ACTIONS →'}
            </button>

            {error && (
              <p className="font-mono text-[0.7rem] max-sm:text-xs text-ac-red tracking-[1px]">{error}</p>
            )}
          </form>

          {/* RIGHT: Results */}
          <div className="flex flex-col gap-5">
            {!result && !loading && (
              <div className="flex flex-col gap-3 pt-2">
                <div className="font-mono text-[0.7rem] tracking-[3px] uppercase text-text-dim">
                  Action items will appear here
                </div>
                <p className="text-[0.85rem] text-text-dim leading-[1.7] font-light">
                  Paste your meeting notes and Claude will extract every action item, assign owners, estimate deadlines, and surface key decisions — structured and ready to send.
                </p>
                <div className="mt-4 border-t border-border-subtle pt-6 flex flex-col gap-3">
                  {['Summary', 'Action Items Table', 'Decisions & Follow-ups'].map((label) => (
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
                {/* Summary */}
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
                  <div className="font-mono text-[0.7rem] max-sm:text-xs tracking-[2px] uppercase mb-2" style={{ color: 'var(--red)' }}>
                    Meeting Summary
                  </div>
                  <p className="text-[0.84rem] font-light leading-[1.7]" style={{ color: 'var(--text-body)' }}>
                    {result?.meetingSummary}
                  </p>
                </div>

                {/* Action Items Table */}
                {result?.actionItems && result.actionItems.length > 0 && (
                  <div
                    className="overflow-hidden"
                    style={{
                      background: 'var(--bg-card)',
                      opacity: 0,
                      transform: 'translateY(12px)',
                      animation: 'fadeSlideUp 0.4s ease forwards',
                      animationDelay: '80ms',
                    }}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-[0.78rem]">
                        <thead>
                          <tr style={{ background: 'var(--red)' }}>
                            {['Action', 'Owner', 'Deadline', 'Priority'].map((h) => (
                              <th key={h} className="font-mono text-[0.5rem] tracking-[1px] uppercase text-white py-2 px-3 text-left">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result?.actionItems?.map((item, i) => (
                            <tr
                              key={i}
                              style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-card-hover)' }}
                            >
                              <td className="py-2 px-3 text-text-primary font-light" style={{ minWidth: '160px' }}>{item.action}</td>
                              <td className="py-2 px-3 text-text-dim whitespace-nowrap">{item.owner}</td>
                              <td className="py-2 px-3 text-text-dim whitespace-nowrap">{item.deadline}</td>
                              <td className="py-2 px-3"><PriorityPill priority={item.priority} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Decisions */}
                {result?.decisions && result.decisions.length > 0 && (
                  <div
                    className="bg-ac-card p-5"
                    style={{
                      opacity: 0,
                      transform: 'translateY(12px)',
                      animation: 'fadeSlideUp 0.4s ease forwards',
                      animationDelay: '160ms',
                    }}
                  >
                    <div className="font-mono text-[0.7rem] max-sm:text-xs tracking-[2px] uppercase mb-3" style={{ color: 'var(--red)' }}>
                      Decisions Made
                    </div>
                    <ul className="flex flex-col gap-2 list-none">
                      {result?.decisions?.map((d, i) => (
                        <li key={i} className="text-[0.82rem] font-light leading-[1.6] flex gap-3" style={{ color: 'var(--text-body)' }}>
                          <span className="flex-shrink-0 mt-[0.3em]" style={{ color: 'var(--red)', fontSize: '0.5rem' }}>■</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Follow-ups */}
                {result?.followUps && result.followUps.length > 0 && (
                  <div
                    className="bg-ac-card p-5"
                    style={{
                      opacity: 0,
                      transform: 'translateY(12px)',
                      animation: 'fadeSlideUp 0.4s ease forwards',
                      animationDelay: '240ms',
                    }}
                  >
                    <div className="font-mono text-[0.7rem] max-sm:text-xs tracking-[2px] uppercase mb-3 text-text-dim">
                      Follow-ups
                    </div>
                    <ul className="flex flex-col gap-2 list-none">
                      {result?.followUps?.map((f, i) => (
                        <li key={i} className="text-[0.82rem] font-light leading-[1.6] flex gap-3 text-text-ghost">
                          <span className="flex-shrink-0 mt-[0.3em]" style={{ fontSize: '0.5rem' }}>●</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Footer */}
                {((result?.attendees && result.attendees.length > 0) || result?.nextMeeting) && (
                  <div
                    className="flex gap-6 flex-wrap"
                    style={{
                      opacity: 0,
                      transform: 'translateY(12px)',
                      animation: 'fadeSlideUp 0.4s ease forwards',
                      animationDelay: '320ms',
                    }}
                  >
                    {result?.attendees && result.attendees.length > 0 && (
                      <div>
                        <span className="font-mono text-[0.6rem] max-sm:text-xs tracking-[1px] uppercase text-text-ghost">Attendees: </span>
                        <span className="font-mono text-[0.7rem] max-sm:text-xs text-text-dim">{result?.attendees?.join(', ')}</span>
                      </div>
                    )}
                    {result.nextMeeting && (
                      <div>
                        <span className="font-mono text-[0.6rem] max-sm:text-xs tracking-[1px] uppercase text-text-ghost">Next meeting: </span>
                        <span className="font-mono text-[0.7rem] max-sm:text-xs text-text-dim">{result.nextMeeting}</span>
                      </div>
                    )}
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
                  <CopyButton text={buildActionsText(result)} label="COPY ACTIONS" />
                  <CopyButton text={buildCsvText(result)} label="COPY AS CSV" />
                  <SendToEmail resultText={buildActionsText(result)} toolName="Meeting Actions" />
                  <button
                    type="button"
                    onClick={clearAll}
                    className="font-display text-[0.75rem] font-black tracking-[2px] uppercase py-3 px-5 cursor-pointer border-none transition-all duration-200 hover:opacity-80"
                    style={{ background: 'var(--red)', color: '#fff' }}
                  >
                    EXTRACT ANOTHER
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

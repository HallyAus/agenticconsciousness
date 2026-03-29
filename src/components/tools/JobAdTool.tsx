'use client';

import { useState } from 'react';
import StagedLoading from '@/components/StagedLoading';
import CopyButton from '@/components/CopyButton';
import SendToEmail from '@/components/SendToEmail';
import ToggleGroup from '@/components/ToggleGroup';
import { trackEvent } from '@/lib/tracking';
import { useCsrf } from '@/lib/useCsrf';

interface JobAdResult {
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string | null;
  about: string;
  overview: string;
  responsibilities: string[];
  requirements: {
    essential: string[];
    desirable: string[];
  };
  benefits: string[];
  howToApply: string;
  biasCheck: string;
}

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

const EXAMPLE = {
  jobTitle: 'Operations Manager',
  company: 'Coastal Plumbing Solutions',
  industry: 'Construction & Trades',
  description:
    'We need an experienced operations manager to oversee a team of 8 plumbers across the Gold Coast. Day to day includes scheduling jobs, ordering parts and materials, managing subcontractors, handling customer escalations, and keeping MYOB/Xero up to date. The role is based at our Burleigh Heads depot. We want someone who has worked in trades or construction before and knows how to keep a busy crew organised. Must be comfortable with job management software — we use ServiceM8. Would be great if they have a trade background themselves but not essential.',
  employmentType: 'Full-time',
};

const inputClass =
  'w-full py-3 px-4 text-[0.85rem] font-display outline-none transition-colors duration-200 focus:border-ac-red placeholder:text-text-dim';

const inputStyle = {
  background: 'var(--bg-page)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-body)',
};

const selectStyle = {
  background: 'var(--bg-page)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-body)',
};

const btnClass =
  'w-full py-4 font-display text-[0.75rem] font-black tracking-[2px] uppercase cursor-pointer border-none text-white transition-all duration-200 hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed';

const STAGED_STEPS = [
  'Analysing role...',
  'Writing copy...',
  'Checking for bias...',
  'Formatting...',
  'Complete.',
];

export default function JobAdTool() {
  const csrfToken = useCsrf();
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [loading, setLoading] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<JobAdResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const descLen = description.length;
  const canSubmit =
    !loading &&
    jobTitle.trim().length >= 2 &&
    company.trim().length >= 2 &&
    descLen >= 20 &&
    descLen <= 3000;

  function fillExample() {
    setJobTitle(EXAMPLE.jobTitle);
    setCompany(EXAMPLE.company);
    setIndustry(EXAMPLE.industry);
    setDescription(EXAMPLE.description);
    setEmploymentType(EXAMPLE.employmentType);
    setResult(null);
    setError(null);
  }

  function clearAll() {
    setJobTitle('');
    setCompany('');
    setIndustry('');
    setDescription('');
    setEmploymentType('Full-time');
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
      const res = await fetch('/api/tools/jobad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ jobTitle, company, industry: industry || undefined, description, employmentType }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Job ad generation failed. Please try again.');
      } else {
        setApiDone(true);
        setTimeout(() => {
          setResult(data);
          setLoading(false);
          trackEvent('ViewContent', { content_name: 'Job Ad Writer' });
        }, 600);
        return;
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      if (!apiDone) setLoading(false);
    }
  }

  function buildJobAdText(r: JobAdResult): string {
    const lines = [
      r.title,
      `${r.company} · ${r.location} · ${r.type}${r.salary ? ` · ${r.salary}` : ''}`,
      '',
      'ABOUT US',
      r.about,
      '',
      'THE ROLE',
      r.overview,
      '',
      'RESPONSIBILITIES',
      ...(r.responsibilities ?? []).map((item, i) => `${i + 1}. ${item}`),
      '',
      'REQUIREMENTS',
      'Essential:',
      ...(r.requirements?.essential ?? []).map((req) => `• ${req}`),
    ];
    if (r.requirements?.desirable?.length) {
      lines.push('Desirable:', ...r.requirements.desirable.map((req) => `• ${req}`));
    }
    if (r.benefits?.length) {
      lines.push('', 'WHAT WE OFFER', ...r.benefits.map((b) => `• ${b}`));
    }
    lines.push('', 'HOW TO APPLY', r.howToApply);
    return lines.join('\n');
  }

  return (
    <section className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-14">
          <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase text-ac-red mb-3">
            TOOL / JOB AD WRITER
          </div>
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-black tracking-tight leading-none mb-4">
            Attract the right candidates.
          </h2>
          <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] max-w-[480px]">
            Describe the role in plain language. Claude writes a complete, bias-checked job ad that&apos;s ready to post.
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
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Operations Manager"
                className={inputClass}
                style={inputStyle}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim">
                Company Name
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Coastal Plumbing Solutions"
                className={inputClass}
                style={inputStyle}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim">
                Industry (optional)
              </label>
              <div className="relative">
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className={`${inputClass} appearance-none cursor-pointer`}
                  style={selectStyle}
                >
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1L5 5L9 1" stroke="#ff3d00" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim">
                Role Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 3000))}
                placeholder="Describe the role — responsibilities, team size, location, must-haves, nice-to-haves..."
                className={`${inputClass} min-h-[200px] max-sm:min-h-[100px] resize-y`}
                style={inputStyle}
                required
              />
              <div className={`font-mono text-[0.8rem] max-sm:text-xs tracking-[1px] text-right ${descLen > 2800 ? 'text-ac-red' : 'text-text-dim'}`}>
                {descLen.toLocaleString()} / 3,000
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim">
                Employment Type
              </label>
              <ToggleGroup
                options={['Full-time', 'Part-time', 'Contract', 'Casual']}
                value={employmentType}
                onChange={setEmploymentType}
              />
            </div>

            <button type="submit" disabled={!canSubmit} className={btnClass} style={{ background: 'var(--red)' }}>
              {loading ? 'Writing...' : 'WRITE JOB AD →'}
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
                  Your job ad will appear here
                </div>
                <p className="text-[0.85rem] text-text-dim leading-[1.7] font-light">
                  Fill in the role details and Claude will write a complete, structured job ad with responsibilities, requirements, benefits, and a bias check — ready to post on Seek or LinkedIn.
                </p>
                <div className="mt-4 border-t border-border-subtle pt-6 flex flex-col gap-3">
                  {['Title & Metadata', 'Responsibilities & Requirements', 'Benefits & Bias Check'].map((label) => (
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
                {/* Title */}
                <div
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '0ms',
                  }}
                >
                  <h3 className="text-[1.5rem] font-black text-text-primary leading-none mb-3">{result.title}</h3>
                  <div className="flex gap-2 flex-wrap">
                    {[result?.company, result?.location, result?.type, result?.salary].filter(Boolean).map((meta) => (
                      <span
                        key={meta}
                        className="font-mono text-[0.75rem] max-sm:text-xs tracking-[1px] uppercase px-2 py-1"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-dim)', border: '1px solid var(--border-subtle)' }}
                      >
                        {meta}
                      </span>
                    ))}
                  </div>
                </div>

                {/* About */}
                {result?.about && (
                  <div
                    className="bg-ac-card p-5"
                    style={{
                      opacity: 0,
                      transform: 'translateY(12px)',
                      animation: 'fadeSlideUp 0.4s ease forwards',
                      animationDelay: '80ms',
                    }}
                  >
                    <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase mb-2 text-text-dim">About Us</div>
                    <p className="text-[0.82rem] font-light leading-[1.7]" style={{ color: 'var(--text-body)' }}>{result?.about}</p>
                  </div>
                )}

                {/* Overview */}
                {result?.overview && (
                  <div
                    className="bg-ac-card p-5"
                    style={{
                      opacity: 0,
                      transform: 'translateY(12px)',
                      animation: 'fadeSlideUp 0.4s ease forwards',
                      animationDelay: '120ms',
                    }}
                  >
                    <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase mb-2 text-text-dim">The Role</div>
                    <p className="text-[0.82rem] font-light leading-[1.7]" style={{ color: 'var(--text-body)' }}>{result?.overview}</p>
                  </div>
                )}

                {/* Responsibilities */}
                {result?.responsibilities && result.responsibilities.length > 0 && (
                  <div
                    className="bg-ac-card p-5"
                    style={{
                      opacity: 0,
                      transform: 'translateY(12px)',
                      animation: 'fadeSlideUp 0.4s ease forwards',
                      animationDelay: '160ms',
                    }}
                  >
                    <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase mb-3" style={{ color: 'var(--red)' }}>Responsibilities</div>
                    <ol className="flex flex-col gap-1.5 list-none">
                      {result?.responsibilities?.map((item, i) => (
                        <li key={i} className="text-[0.82rem] font-light leading-[1.6] flex gap-3" style={{ color: 'var(--text-body)' }}>
                          <span className="font-mono text-[0.75rem] max-sm:text-xs mt-0.5 flex-shrink-0" style={{ color: 'var(--red)' }}>{i + 1}.</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Requirements */}
                {((result?.requirements?.essential && result.requirements.essential.length > 0) || (result?.requirements?.desirable && result.requirements.desirable.length > 0)) && (
                  <div
                    className="bg-ac-card p-5"
                    style={{
                      opacity: 0,
                      transform: 'translateY(12px)',
                      animation: 'fadeSlideUp 0.4s ease forwards',
                      animationDelay: '240ms',
                    }}
                  >
                    <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase mb-3" style={{ color: 'var(--red)' }}>Requirements</div>
                    {result?.requirements?.essential && result.requirements.essential.length > 0 && (
                      <>
                        <div className="font-mono text-[0.7rem] max-sm:text-xs tracking-[1px] uppercase mb-2 text-text-dim">Essential</div>
                        <ul className="flex flex-col gap-1.5 list-none mb-3">
                          {result?.requirements?.essential?.map((req, i) => (
                            <li key={i} className="text-[0.82rem] font-light leading-[1.6] flex gap-3" style={{ color: 'var(--text-body)' }}>
                              <span className="flex-shrink-0 mt-[0.3em]" style={{ color: 'var(--red)', fontSize: '0.5rem' }}>■</span>
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {result?.requirements?.desirable && result.requirements.desirable.length > 0 && (
                      <>
                        <div className="font-mono text-[0.7rem] max-sm:text-xs tracking-[1px] uppercase mb-2 text-text-dim">Desirable</div>
                        <ul className="flex flex-col gap-1.5 list-none">
                          {result?.requirements?.desirable?.map((req, i) => (
                            <li key={i} className="text-[0.82rem] font-light leading-[1.6] flex gap-3 text-text-dim">
                              <span className="flex-shrink-0 mt-[0.3em]" style={{ fontSize: '0.5rem' }}>●</span>
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}

                {/* Benefits */}
                {result?.benefits && result.benefits.length > 0 && (
                  <div
                    className="bg-ac-card p-5"
                    style={{
                      opacity: 0,
                      transform: 'translateY(12px)',
                      animation: 'fadeSlideUp 0.4s ease forwards',
                      animationDelay: '320ms',
                    }}
                  >
                    <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase mb-3 text-text-dim">What We Offer</div>
                    <ul className="flex flex-col gap-1.5 list-none">
                      {result?.benefits?.map((b, i) => (
                        <li key={i} className="text-[0.82rem] font-light leading-[1.6] flex gap-3" style={{ color: 'var(--text-body)' }}>
                          <span className="flex-shrink-0 mt-[0.3em]" style={{ color: 'var(--status-green)', fontSize: '0.5rem' }}>■</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* How to Apply */}
                {result?.howToApply && (
                  <div
                    className="bg-ac-card p-5"
                    style={{
                      opacity: 0,
                      transform: 'translateY(12px)',
                      animation: 'fadeSlideUp 0.4s ease forwards',
                      animationDelay: '360ms',
                    }}
                  >
                    <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase mb-2 text-text-dim">How to Apply</div>
                    <p className="text-[0.82rem] font-light leading-[1.7]" style={{ color: 'var(--text-body)' }}>{result?.howToApply}</p>
                  </div>
                )}

                {/* Bias Check */}
                {result?.biasCheck && (
                  <div
                    className="p-5"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      opacity: 0,
                      transform: 'translateY(12px)',
                      animation: 'fadeSlideUp 0.4s ease forwards',
                      animationDelay: '400ms',
                    }}
                  >
                    <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase mb-2 text-text-dim">Bias Check</div>
                    <p className="text-[0.78rem] font-light leading-[1.6] text-text-ghost">{result.biasCheck}</p>
                  </div>
                )}

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
                  <CopyButton text={buildJobAdText(result)} label="COPY JOB AD" />
                  <SendToEmail resultText={buildJobAdText(result)} toolName="Job Ad Writer" />
                  <button
                    type="button"
                    onClick={clearAll}
                    className="font-display text-[0.75rem] font-black tracking-[2px] uppercase py-3 px-5 cursor-pointer border-none transition-all duration-200 hover:opacity-80"
                    style={{ background: 'var(--red)', color: '#fff' }}
                  >
                    WRITE ANOTHER
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

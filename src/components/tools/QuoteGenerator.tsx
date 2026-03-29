'use client';

import { useState } from 'react';
import StagedLoading from '@/components/StagedLoading';
import CopyButton from '@/components/CopyButton';
import SendToEmail from '@/components/SendToEmail';
import ToggleGroup from '@/components/ToggleGroup';
import { useToolAccess } from '@/components/tools/ToolGate';
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

interface LineItem {
  description: string;
  qty: string;
  unit: string;
  unitPrice: string;
  amount: string;
}

interface QuoteResult {
  reference: string;
  date: string;
  validUntil: string;
  businessName: string;
  clientName: string;
  scopeOfWork: string;
  lineItems: LineItem[];
  subtotal: string;
  gst: string;
  total: string;
  terms: string[];
  nextSteps: string[];
}

const EXAMPLE = {
  businessName: 'Coastal Plumbing Solutions',
  clientName: 'Sarah Chen — BluePeak Properties',
  industry: 'Construction & Trades',
  jobDescription:
    'Full bathroom renovation including removal of existing fixtures, supply and install of new vanity unit, toilet, shower screen, mixer taps, and associated pipework. Includes waterproofing to AS 3740, tiling preparation, and all plumbing connections. Property is a 3-bedroom unit in Surfers Paradise, second floor, lift access available.',
  estimatedValue: '$12,000',
  quoteType: 'Detailed Proposal',
};

const inputClass =
  'w-full bg-ac-black border border-border-subtle py-3 px-4 text-text-primary font-display text-[0.85rem] outline-none transition-colors duration-200 focus:border-ac-red placeholder:text-text-dim';

const btnClass =
  'w-full bg-ac-red text-white font-display text-[0.75rem] font-black tracking-[2px] uppercase py-4 transition-all duration-200 hover:bg-white hover:text-ac-black disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none';

const selectClass =
  'w-full bg-ac-black border border-border-subtle py-3 px-4 text-text-primary font-display text-[0.85rem] outline-none transition-colors duration-200 focus:border-ac-red appearance-none cursor-pointer';

const STAGED_STEPS = [
  'Analysing scope...',
  'Calculating line items...',
  'Drafting terms...',
  'Formatting document...',
  'Complete.',
];

export default function QuoteGenerator() {
  const csrfToken = useCsrf();
  const [businessName, setBusinessName] = useState('');
  const [clientName, setClientName] = useState('');
  const [industry, setIndustry] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [quoteType, setQuoteType] = useState('Simple Quote');
  const [loading, setLoading] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toolAccess = useToolAccess();

  const descLen = jobDescription.length;
  const canSubmit =
    !loading &&
    businessName.trim() &&
    clientName.trim() &&
    descLen >= 10 &&
    descLen <= 3000;

  function fillExample() {
    setBusinessName(EXAMPLE.businessName);
    setClientName(EXAMPLE.clientName);
    setIndustry(EXAMPLE.industry);
    setJobDescription(EXAMPLE.jobDescription);
    setEstimatedValue(EXAMPLE.estimatedValue);
    setQuoteType(EXAMPLE.quoteType);
    setResult(null);
    setError(null);
  }

  function clearAll() {
    setBusinessName('');
    setClientName('');
    setIndustry('');
    setJobDescription('');
    setEstimatedValue('');
    setQuoteType('Simple Quote');
    setResult(null);
    setError(null);
    setLoadingComplete(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setLoadingComplete(false);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/tools/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({
          businessName,
          clientName,
          industry,
          jobDescription,
          estimatedValue: estimatedValue || undefined,
          type: quoteType === 'Detailed Proposal' ? 'detailed' : 'simple',
        }),
      });

      const data = await res.json();
      if (res.status === 402 || res.status === 429) {
        toolAccess?.triggerEmailGate();
        setError(data.error || 'Daily limit reached. Please verify your email.');
        toolAccess?.refresh();
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Quote generation failed. Please try again.');
      } else {
        toolAccess?.refresh();
        setLoadingComplete(true);
        setTimeout(() => {
          setResult(data);
          setLoading(false);
          trackEvent('ViewContent', { content_name: 'Quote Generator' });
        }, 400);
        return;
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      if (!loadingComplete) setLoading(false);
    }
  }

  function formatAud(val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function buildQuoteText(r: QuoteResult): string {
    const lines = [
      `QUOTE ${r.reference}`,
      `Date: ${r.date}`,
      `Valid Until: ${r.validUntil}`,
      ``,
      `From: ${r.businessName}`,
      `To: ${r.clientName}`,
      ``,
      `SCOPE OF WORK`,
      r.scopeOfWork,
      ``,
      `LINE ITEMS`,
      ['Description', 'Qty', 'Unit', 'Unit Price', 'Amount'].join('\t'),
      ...r.lineItems.map((li) =>
        [li.description, li.qty, li.unit, formatAud(li.unitPrice), formatAud(li.amount)].join('\t')
      ),
      ``,
      `Subtotal: ${formatAud(r.subtotal)}`,
      `GST (10%): ${formatAud(r.gst)}`,
      `TOTAL: ${formatAud(r.total)}`,
      ``,
      `TERMS`,
      ...r.terms.map((t, i) => `${i + 1}. ${t}`),
      ``,
      `NEXT STEPS`,
      ...r.nextSteps.map((s, i) => `${i + 1}. ${s}`),
    ];
    return lines.join('\n');
  }

  return (
    <section className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-14">
          <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase text-ac-red mb-3">
            TOOL 02 / QUOTE GENERATOR
          </div>
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-black tracking-tight leading-none mb-4">
            Professional quotes in seconds.
          </h2>
          <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] max-w-[480px]">
            Describe the job. Claude generates a complete, professional quote with line items, GST, terms, and next steps.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 max-md:grid-cols-1 max-sm:gap-4">
          {/* LEFT: Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* TRY AN EXAMPLE */}
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
                Your Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Acme Pty Ltd"
                className={inputClass}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim">
                Client Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client Company or Person"
                className={inputClass}
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
                  className={selectClass}
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
                Job Description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value.slice(0, 3000))}
                placeholder="Describe the work to be done, deliverables, timeline, and any relevant details..."
                className={`${inputClass} min-h-[200px] max-sm:min-h-[100px] resize-y`}
                required
              />
              <div className={`font-mono text-[0.8rem] max-sm:text-xs tracking-[1px] text-right ${descLen > 2800 ? 'text-ac-red' : 'text-text-dim'}`}>
                {descLen.toLocaleString()} / 3,000
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim">
                Estimated Value (optional)
              </label>
              <input
                type="text"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="e.g. $5,000 or $5k–$10k"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim">
                Quote Type
              </label>
              <ToggleGroup
                options={['Simple Quote', 'Detailed Proposal']}
                value={quoteType}
                onChange={setQuoteType}
              />
            </div>

            <button type="submit" disabled={!canSubmit} className={btnClass}>
              {loading ? 'Generating...' : 'GENERATE QUOTE →'}
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
                  Your quote will appear here
                </div>
                <p className="text-[0.85rem] text-text-dim leading-[1.7] font-light">
                  Fill in the details and Claude will generate a professional quote document with itemised pricing, GST, payment terms, and next steps.
                </p>
                <div className="mt-4 border-t border-border-subtle pt-6 flex flex-col gap-3">
                  {['Scope of Work', 'Line Items + Pricing', 'Terms & Next Steps'].map((label) => (
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

                {/* Document Header */}
                <div
                  className="bg-ac-card p-6"
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '0ms',
                  }}
                >
                  <div className="flex justify-between items-start gap-4 flex-wrap mb-4">
                    <div>
                      <div className="text-[1.4rem] font-black text-text-primary leading-none">{result.businessName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red font-black">QUOTE</div>
                      <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[1px] text-text-dim mt-1">{result.reference}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="font-mono text-[0.5rem] tracking-[1px] uppercase text-text-ghost mb-1">Prepared for</div>
                      <div className="text-[0.82rem] text-text-primary">{result.clientName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[0.5rem] tracking-[1px] uppercase text-text-ghost mb-1">Date</div>
                      <div className="text-[0.82rem] text-text-primary">{result.date}</div>
                      <div className="font-mono text-[0.5rem] tracking-[1px] uppercase text-text-ghost mt-2 mb-1">Valid Until</div>
                      <div className="text-[0.82rem] text-text-primary">{result.validUntil}</div>
                    </div>
                  </div>
                  <div className="h-[2px]" style={{ background: 'var(--red)' }} />
                </div>

                {/* Scope of Work */}
                <div
                  className="bg-ac-card p-5"
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '80ms',
                  }}
                >
                  <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase mb-3" style={{ color: 'var(--red)' }}>
                    Scope of Work
                  </div>
                  <p className="text-[0.82rem] text-text-dim font-light leading-[1.7] whitespace-pre-line">
                    {result.scopeOfWork}
                  </p>
                </div>

                {/* Pricing Table */}
                <div
                  className="bg-ac-card overflow-hidden"
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '160ms',
                  }}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-[0.78rem]">
                      <thead>
                        <tr style={{ background: 'var(--red)' }}>
                          {['Description', 'Qty', 'Unit', 'Rate', 'Amount'].map((h) => (
                            <th key={h} className="font-mono text-[0.5rem] tracking-[1px] uppercase text-white py-2 px-3 text-left last:text-right">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result?.lineItems?.map((item, i) => (
                          <tr
                            key={i}
                            style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-card-hover)' }}
                          >
                            <td className="py-2 px-3 text-text-primary font-light">{item.description}</td>
                            <td className="py-2 px-3 text-text-dim">{item.qty}</td>
                            <td className="py-2 px-3 text-text-dim">{item.unit}</td>
                            <td className="py-2 px-3 text-text-dim">{formatAud(item.unitPrice)}</td>
                            <td className="py-2 px-3 text-text-primary text-right">{formatAud(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-5 border-t border-border-subtle flex flex-col gap-1 items-end">
                    <div className="flex gap-8 text-[0.82rem]">
                      <span className="text-text-dim">Subtotal</span>
                      <span className="text-text-primary w-24 text-right">{formatAud(result.subtotal)}</span>
                    </div>
                    <div className="flex gap-8 text-[0.82rem]">
                      <span className="text-text-dim">GST (10%)</span>
                      <span className="text-text-primary w-24 text-right">{formatAud(result.gst)}</span>
                    </div>
                    <div className="flex gap-8 text-[0.9rem] font-black border-t border-border-subtle pt-2 mt-1">
                      <span className="text-text-primary">TOTAL AUD</span>
                      <span className="w-24 text-right" style={{ color: 'var(--red)' }}>{formatAud(result.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div
                  className="bg-ac-card p-5"
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '240ms',
                  }}
                >
                  <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim mb-3">
                    Terms &amp; Conditions
                  </div>
                  <ul className="flex flex-col gap-1 list-none">
                    {result?.terms?.map((term, i) => (
                      <li key={i} className="text-[0.82rem] text-text-dim font-light leading-[1.6] flex gap-3">
                        <span className="flex-shrink-0 mt-[0.25em]" style={{ color: 'var(--red)', fontSize: '0.5rem' }}>■</span>
                        <span>{term}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Next Steps */}
                <div
                  className="bg-ac-card p-5"
                  style={{
                    opacity: 0,
                    transform: 'translateY(12px)',
                    animation: 'fadeSlideUp 0.4s ease forwards',
                    animationDelay: '320ms',
                  }}
                >
                  <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim mb-3">
                    Next Steps
                  </div>
                  <ol className="flex flex-col gap-1">
                    {result?.nextSteps?.map((step, i) => (
                      <li key={i} className="text-[0.82rem] text-text-dim font-light leading-[1.6] flex gap-3">
                        <span className="font-mono text-[0.75rem] max-sm:text-xs mt-1 flex-shrink-0" style={{ color: 'var(--red)' }}>{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

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
                  <CopyButton text={buildQuoteText(result)} label="COPY QUOTE" />
                  <CopyButton text={JSON.stringify(result, null, 2)} label="COPY JSON" />
                  <SendToEmail resultText={buildQuoteText(result)} toolName="Quote Generator" />
                  <button
                    type="button"
                    onClick={clearAll}
                    className="font-display text-[0.75rem] font-black tracking-[2px] uppercase py-3 px-5 cursor-pointer border-none transition-all duration-200 hover:bg-white hover:text-ac-black"
                    style={{ background: 'var(--red)', color: '#fff' }}
                  >
                    GENERATE ANOTHER
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

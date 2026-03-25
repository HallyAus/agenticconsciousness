'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import StagedLoading from '@/components/StagedLoading';
import CopyButton from '@/components/CopyButton';
import SendToEmail from '@/components/SendToEmail';
import { incrementRateLimit, usesRemaining as getUsesRemaining, MAX_TOOL_USES } from '@/lib/toolRateLimit';
import { trackEvent } from '@/lib/tracking';

interface LineItem {
  description: string;
  qty: string | null;
  unitPrice: string | null;
  amount: string | null;
}

interface InvoiceResult {
  supplier: {
    name: string | null;
    abn: string | null;
    address: string | null;
    contact: string | null;
  };
  invoice: {
    number: string | null;
    date: string | null;
    dueDate: string | null;
    paymentTerms: string | null;
  };
  lineItems: LineItem[];
  totals: {
    subtotal: string | null;
    gst: string | null;
    total: string | null;
    currency: string;
  };
  classification: {
    category: string;
    type: 'Business' | 'Personal';
    taxDeductible: boolean;
    notes: string;
  };
}

const btnClass =
  'w-full bg-ac-red text-white font-display text-[0.75rem] font-black tracking-[2px] uppercase py-4 transition-all duration-200 hover:bg-white hover:text-ac-black disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none';

const STAGED_STEPS = [
  'Reading document...',
  'Extracting fields...',
  'Identifying line items...',
  'Classifying expense...',
  'Complete.',
];

export default function InvoiceScanner() {
  const [imageData, setImageData] = useState<{ data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' } | null>(null);
  const [pdfData, setPdfData] = useState<{ data: string } | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingUses, setRemainingUses] = useState<number>(() => getUsesRemaining());
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Supported formats: JPG, PNG, WebP, PDF.');
      return;
    }

    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(',')[1];

      if (file.type === 'application/pdf') {
        setPdfData({ data: base64 });
        setImageData(null);
        setFilePreview(null);
      } else {
        const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp';
        setImageData({ data: base64, mediaType });
        setPdfData(null);
        setFilePreview(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleFileChange(fakeEvent);
  }

  function handleScanAnother() {
    setResult(null);
    setApiDone(false);
    setImageData(null);
    setPdfData(null);
    setFilePreview(null);
    setFileName(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  const canSubmit =
    !loading &&
    remainingUses > 0 &&
    (imageData !== null || pdfData !== null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    // Re-check rate limit at submit time
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
      const body = pdfData
        ? { pdf: pdfData }
        : { image: imageData };

      const res = await fetch('/api/tools/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Scanning failed. Please try again.');
      } else {
        const next = incrementRateLimit();
        setRemainingUses(Math.max(0, MAX_TOOL_USES - next.count));
        setApiDone(true);
        // Brief delay so "Complete." step is visible before results appear
        setTimeout(() => {
          setResult(data);
          setLoading(false);
          trackEvent('ViewContent', { content_name: 'Invoice Scanner' });
        }, 600);
        return;
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      if (!apiDone) setLoading(false);
    }
  }

  function buildCsv(r: InvoiceResult): string {
    const rows = [
      ['Description', 'Qty', 'Unit Price', 'Amount'],
      ...(r.lineItems ?? []).map((li) => [
        li.description,
        li.qty ?? '',
        li.unitPrice ?? '',
        li.amount ?? '',
      ]),
      [],
      ['', '', 'Subtotal', r.totals.subtotal ?? ''],
      ['', '', 'GST', r.totals.gst ?? ''],
      ['', '', 'Total', r.totals.total ?? ''],
    ];
    return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  const cards = result
    ? [
        // Card 0: Supplier
        <div
          key="supplier"
          style={{
            background: 'var(--bg-card)',
            borderTop: '3px solid var(--red)',
            padding: '20px',
            opacity: 0,
            animation: 'fadeInUp 0.4s ease-out 0s forwards',
          }}
        >
          <div className="font-mono text-[0.65rem] tracking-[2px] uppercase mb-1" style={{ color: 'var(--red)' }}>
            SUPPLIER
          </div>
          <div className="text-[1.1rem] font-black text-text-primary mb-3 leading-tight">
            {result.supplier.name ?? '—'}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {[
              ['ABN', result.supplier.abn],
              ['Address', result.supplier.address],
              ['Contact', result.supplier.contact],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="font-mono text-[0.5rem] tracking-[1px] uppercase mb-1" style={{ color: 'var(--text-ghost)' }}>{label}</div>
                <div className="text-[0.82rem] font-light" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>,

        // Card 1: Invoice Details
        <div
          key="invoice"
          style={{
            background: 'var(--bg-card)',
            borderTop: '3px solid var(--border-subtle)',
            padding: '20px',
            opacity: 0,
            animation: 'fadeInUp 0.4s ease-out 0.1s forwards',
          }}
        >
          <div className="font-mono text-[0.65rem] tracking-[2px] uppercase mb-3" style={{ color: 'var(--text-dim)' }}>
            INVOICE DETAILS
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {[
              ['Invoice No.', result.invoice.number],
              ['Date', result.invoice.date],
              ['Due Date', result.invoice.dueDate],
              ['Terms', result.invoice.paymentTerms],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="font-mono text-[0.5rem] tracking-[1px] uppercase mb-1" style={{ color: 'var(--text-ghost)' }}>{label}</div>
                <div className="text-[0.82rem] font-light" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>,

        // Card 2: Line Items
        <div
          key="lineitems"
          style={{
            background: 'var(--bg-card)',
            borderTop: '3px solid var(--border-subtle)',
            padding: '20px',
            opacity: 0,
            animation: 'fadeInUp 0.4s ease-out 0.2s forwards',
          }}
        >
          <div className="font-mono text-[0.65rem] tracking-[2px] uppercase mb-3" style={{ color: 'var(--text-dim)' }}>
            LINE ITEMS
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[0.78rem]">
              <thead>
                <tr style={{ background: 'var(--red)' }}>
                  {['Description', 'Qty', 'Unit Price', 'Amount'].map((h, hi) => (
                    <th
                      key={h}
                      style={{ color: 'white' }}
                      className={`font-mono text-[0.5rem] tracking-[1px] uppercase py-2 px-2 text-left ${hi === 3 ? 'text-right' : ''}`}
                    >
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
                    <td className="py-2 px-2 font-light" style={{ color: 'var(--text-primary)' }}>{item.description}</td>
                    <td className="py-2 px-2" style={{ color: 'var(--text-dim)' }}>{item.qty ?? '—'}</td>
                    <td className="py-2 px-2" style={{ color: 'var(--text-dim)' }}>{item.unitPrice ?? '—'}</td>
                    <td className="py-2 px-2 text-right" style={{ color: 'var(--text-primary)' }}>{item.amount ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Totals */}
          <div className="mt-4 pt-3 flex flex-col gap-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {[
              ['Subtotal', result.totals.subtotal],
              [`GST (10%)`, result.totals.gst],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-[0.82rem]">
                <span style={{ color: 'var(--text-dim)' }}>{label}</span>
                <span className="font-light" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</span>
              </div>
            ))}
            <div className="flex justify-between text-[0.9rem] font-black pt-2 mt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-primary)' }}>TOTAL</span>
              <span style={{ color: 'var(--red)' }}>{result.totals.total ?? '—'}</span>
            </div>
          </div>
        </div>,

        // Card 3: AI Classification
        <div
          key="classification"
          style={{
            background: 'var(--bg-card)',
            borderTop: '3px solid var(--border-subtle)',
            padding: '20px',
            opacity: 0,
            animation: 'fadeInUp 0.4s ease-out 0.3s forwards',
          }}
        >
          <div className="font-mono text-[0.65rem] tracking-[2px] uppercase mb-3" style={{ color: 'var(--text-dim)' }}>
            AI CLASSIFICATION
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <span
              className="font-mono text-[0.65rem] tracking-[1px] uppercase px-2 py-1"
              style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}
            >
              {result.classification.category}
            </span>
            <span
              className="font-mono text-[0.65rem] tracking-[1px] uppercase px-2 py-1"
              style={
                result.classification.type === 'Business'
                  ? { border: '1px solid var(--red)', color: 'var(--red-text)' }
                  : { border: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }
              }
            >
              {result.classification.type}
            </span>
            <span
              className="font-mono text-[0.65rem] tracking-[1px] uppercase px-2 py-1"
              style={
                result.classification.taxDeductible
                  ? { border: '1px solid var(--status-green)', color: 'var(--status-green)' }
                  : { border: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }
              }
            >
              {result.classification.taxDeductible ? 'Tax Deductible' : 'Not Deductible'}
            </span>
          </div>
          {result.classification.notes && (
            <p className="text-[0.8rem] font-light leading-[1.6]" style={{ color: 'var(--text-dim)' }}>
              {result.classification.notes}
            </p>
          )}
        </div>,
      ]
    : [];

  return (
    <section className="py-28 px-10 max-md:px-5 max-sm:py-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-14">
          <div className="font-mono text-[0.7rem] tracking-[3px] uppercase text-ac-red mb-3">
            TOOL 01 / INVOICE SCANNER
          </div>
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-black tracking-tight leading-none mb-4">
            Scan any invoice instantly.
          </h2>
          <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] max-w-[480px]">
            Upload an invoice (PDF, JPG, PNG). Claude extracts every field and classifies it for your records.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 max-[900px]:grid-cols-1">
          {/* LEFT: Input */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim">
                  Invoice File (PDF, JPG, PNG — max 10MB)
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                  className="border border-dashed border-border-subtle min-h-[280px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-ac-red transition-colors duration-200 p-6"
                >
                  {filePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={filePreview}
                      alt="Invoice preview"
                      className="max-h-[240px] object-contain"
                    />
                  ) : fileName && pdfData ? (
                    <div className="text-center">
                      <div className="text-ac-red text-[2rem] mb-2">PDF</div>
                      <div className="font-mono text-[0.7rem] text-text-primary">{fileName}</div>
                    </div>
                  ) : (
                    <>
                      <div className="text-text-ghost text-[2rem]">↑</div>
                      <div className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim text-center">
                        Drop file here or click to upload
                      </div>
                      <div className="font-mono text-[0.5rem] text-text-ghost">
                        PDF, JPG, PNG, WebP
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {(filePreview || pdfData) && (
                  <button
                    type="button"
                    onClick={() => { setImageData(null); setPdfData(null); setFilePreview(null); setFileName(null); if (fileRef.current) fileRef.current.value = ''; }}
                    className="font-mono text-[0.65rem] tracking-[2px] uppercase text-text-dim hover:text-ac-red transition-colors duration-200 text-left"
                  >
                    ✕ Remove file
                  </button>
                )}
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
                <button type="submit" disabled={!canSubmit} className={btnClass}>
                  {loading ? 'Scanning...' : 'SCAN INVOICE →'}
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
          <div className="flex flex-col gap-6">
            {!result && !loading && (
              <div className="flex flex-col gap-3 pt-2">
                <div className="font-mono text-[0.7rem] tracking-[3px] uppercase text-text-dim">
                  Extracted data will appear here
                </div>
                <p className="text-[0.85rem] text-text-dim leading-[1.7] font-light">
                  Upload an invoice and Claude will extract supplier details, line items, totals, and classify the expense automatically.
                </p>
                <div className="mt-4 border-t border-border-subtle pt-6 flex flex-col gap-3">
                  {['Supplier Details', 'Line Items', 'Classification'].map((label) => (
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
                <StagedLoading
                  steps={STAGED_STEPS}
                  isComplete={apiDone}
                />
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-5">
                {cards}

                {/* Copy + Email + Scan Another buttons */}
                <div className="flex gap-3 flex-wrap items-center">
                  <CopyButton text={buildCsv(result)} label="COPY CSV" />
                  <CopyButton text={JSON.stringify(result, null, 2)} label="COPY JSON" />
                  <SendToEmail resultText={JSON.stringify(result, null, 2)} toolName="Invoice Scanner" />
                </div>

                <button
                  type="button"
                  onClick={handleScanAnother}
                  className="w-full font-display text-[0.75rem] font-black tracking-[2px] uppercase py-4 transition-all duration-200 cursor-pointer border-none text-white"
                  style={{ background: 'var(--red)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; (e.currentTarget as HTMLButtonElement).style.color = '#000'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red)'; (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
                >
                  SCAN ANOTHER
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

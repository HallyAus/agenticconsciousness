'use client';

import { useState, useRef } from 'react';
import AiLoading from '@/components/AiLoading';
import CopyButton from '@/components/CopyButton';

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

const inputClass =
  'w-full bg-ac-black border border-border-subtle py-3 px-4 text-text-primary font-display text-[0.85rem] outline-none transition-colors duration-200 focus:border-ac-red placeholder:text-text-ghost';

const btnClass =
  'w-full bg-ac-red text-white font-display text-[0.75rem] font-black tracking-[2px] uppercase py-4 transition-all duration-200 hover:bg-white hover:text-ac-black disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-none';

export default function InvoiceScanner() {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const [imageData, setImageData] = useState<{ data: string; mediaType: 'image/jpeg' | 'image/png' } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      return;
    }

    const mediaType = file.type as 'image/jpeg' | 'image/png';
    if (mediaType !== 'image/jpeg' && mediaType !== 'image/png') {
      setError('Only JPG and PNG images are supported.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      // Strip data:image/...;base64, prefix
      const base64 = dataUrl.split(',')[1];
      setImageData({ data: base64, mediaType });
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

  const canSubmit =
    !loading &&
    ((mode === 'text' && text.trim().length >= 10) || (mode === 'image' && imageData !== null));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body =
        mode === 'text' ? { text } : { image: imageData };

      const res = await fetch('/api/tools/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Scanning failed. Please try again.');
      } else {
        setResult(data);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function buildCsv(r: InvoiceResult): string {
    const rows = [
      ['Description', 'Qty', 'Unit Price', 'Amount'],
      ...r.lineItems.map((li) => [
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

  return (
    <section className="py-28 px-10 max-md:px-5 max-sm:py-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-14">
          <div className="font-mono text-[0.6rem] tracking-[3px] uppercase text-ac-red mb-3">
            TOOL 01 / INVOICE SCANNER
          </div>
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-black tracking-tight leading-none mb-4">
            Scan any invoice instantly.
          </h2>
          <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] max-w-[480px]">
            Paste invoice text or upload a photo. Claude extracts every field and classifies it for your records.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 max-[900px]:grid-cols-1">
          {/* LEFT: Input */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Mode toggle */}
            <div className="flex gap-0">
              {(['text', 'image'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(null); }}
                  className={`font-display text-[0.65rem] font-bold tracking-[1px] uppercase py-2 px-4 transition-all duration-200 cursor-pointer border border-border-subtle ${
                    mode === m
                      ? 'bg-ac-red text-white border-ac-red'
                      : 'bg-transparent text-text-dim hover:text-white'
                  }`}
                >
                  {m === 'text' ? 'Paste Text' : 'Upload Image'}
                </button>
              ))}
            </div>

            {mode === 'text' ? (
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[0.6rem] tracking-[2px] uppercase text-text-dim">
                  Invoice Text
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 15000))}
                  placeholder="Paste your invoice text here..."
                  className={`${inputClass} min-h-[280px] resize-y`}
                />
                <div className="font-mono text-[0.55rem] tracking-[1px] text-text-dim text-right">
                  {text.length.toLocaleString()} / 15,000
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[0.6rem] tracking-[2px] uppercase text-text-dim">
                  Invoice Image (JPG / PNG, max 5MB)
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                  className="border border-dashed border-border-subtle min-h-[280px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-ac-red transition-colors duration-200 p-6"
                >
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreview}
                      alt="Invoice preview"
                      className="max-h-[240px] object-contain"
                    />
                  ) : (
                    <>
                      <div className="text-text-ghost text-[2rem]">↑</div>
                      <div className="font-mono text-[0.6rem] tracking-[2px] uppercase text-text-dim text-center">
                        Drop image here or click to upload
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => { setImageData(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                    className="font-mono text-[0.6rem] tracking-[2px] uppercase text-text-dim hover:text-ac-red transition-colors duration-200 text-left"
                  >
                    ✕ Remove image
                  </button>
                )}
              </div>
            )}

            <button type="submit" disabled={!canSubmit} className={btnClass}>
              {loading ? 'Scanning...' : 'SCAN INVOICE →'}
            </button>

            {error && (
              <p className="font-mono text-[0.65rem] text-ac-red tracking-[1px]">{error}</p>
            )}
          </form>

          {/* RIGHT: Results */}
          <div className="flex flex-col gap-6">
            {!result && !loading && (
              <div className="flex flex-col gap-3 pt-2">
                <div className="font-mono text-[0.6rem] tracking-[3px] uppercase text-text-ghost">
                  Extracted data will appear here
                </div>
                <p className="text-[0.85rem] text-text-dead leading-[1.7] font-light">
                  Paste invoice text or upload a photo. Claude will extract supplier details, line items, totals, and classify the expense automatically.
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
                <AiLoading text="Scanning invoice..." />
                <p className="text-[0.75rem] text-text-dead font-mono tracking-[1px]">
                  Extracting supplier details, line items, and classifying expense...
                </p>
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-5">
                {/* Supplier */}
                <div className="bg-ac-card border-t-[3px] border-ac-red p-5">
                  <div className="font-mono text-[0.55rem] tracking-[2px] uppercase text-ac-red mb-3">
                    Supplier
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {[
                      ['Name', result.supplier.name],
                      ['ABN', result.supplier.abn],
                      ['Address', result.supplier.address],
                      ['Contact', result.supplier.contact],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div className="font-mono text-[0.5rem] tracking-[1px] uppercase text-text-ghost mb-1">{label}</div>
                        <div className="text-[0.82rem] text-text-primary font-light">{value ?? '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Invoice details */}
                <div className="bg-ac-card border-t-[3px] border-border-subtle p-5">
                  <div className="font-mono text-[0.55rem] tracking-[2px] uppercase text-text-dim mb-3">
                    Invoice Details
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {[
                      ['Invoice No.', result.invoice.number],
                      ['Date', result.invoice.date],
                      ['Due Date', result.invoice.dueDate],
                      ['Terms', result.invoice.paymentTerms],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div className="font-mono text-[0.5rem] tracking-[1px] uppercase text-text-ghost mb-1">{label}</div>
                        <div className="text-[0.82rem] text-text-primary font-light">{value ?? '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Line items */}
                {result.lineItems.length > 0 && (
                  <div className="bg-ac-card border-t-[3px] border-border-subtle p-5">
                    <div className="font-mono text-[0.55rem] tracking-[2px] uppercase text-text-dim mb-3">
                      Line Items
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[0.78rem]">
                        <thead>
                          <tr className="border-b border-border-subtle">
                            {['Description', 'Qty', 'Unit Price', 'Amount'].map((h) => (
                              <th key={h} className="font-mono text-[0.5rem] tracking-[1px] uppercase text-text-ghost pb-2 text-left pr-4 last:pr-0 last:text-right">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.lineItems.map((item, i) => (
                            <tr key={i} className="border-b border-border-subtle last:border-0">
                              <td className="py-2 pr-4 text-text-primary font-light">{item.description}</td>
                              <td className="py-2 pr-4 text-text-dim">{item.qty ?? '—'}</td>
                              <td className="py-2 pr-4 text-text-dim">{item.unitPrice ?? '—'}</td>
                              <td className="py-2 text-text-primary text-right">{item.amount ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="bg-ac-card border-t-[3px] border-border-subtle p-5">
                  <div className="font-mono text-[0.55rem] tracking-[2px] uppercase text-text-dim mb-3">
                    Totals ({result.totals.currency})
                  </div>
                  <div className="flex flex-col gap-1">
                    {[
                      ['Subtotal', result.totals.subtotal],
                      ['GST (10%)', result.totals.gst],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-[0.82rem]">
                        <span className="text-text-dim">{label}</span>
                        <span className="text-text-primary font-light">{value ?? '—'}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-[0.9rem] font-black border-t border-border-subtle pt-2 mt-1">
                      <span className="text-white">Total</span>
                      <span className="text-ac-red">{result.totals.total ?? '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Classification */}
                <div className="bg-ac-card border-t-[3px] border-border-subtle p-5">
                  <div className="font-mono text-[0.55rem] tracking-[2px] uppercase text-text-dim mb-3">
                    AI Classification
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="font-mono text-[0.55rem] tracking-[1px] uppercase border border-border-subtle text-text-dim px-2 py-1">
                      {result.classification.category}
                    </span>
                    <span className={`font-mono text-[0.55rem] tracking-[1px] uppercase border px-2 py-1 ${
                      result.classification.type === 'Business'
                        ? 'border-ac-red text-ac-red'
                        : 'border-border-subtle text-text-dim'
                    }`}>
                      {result.classification.type}
                    </span>
                    <span className={`font-mono text-[0.55rem] tracking-[1px] uppercase border px-2 py-1 ${
                      result.classification.taxDeductible
                        ? 'border-[#39ff14] text-[#39ff14]'
                        : 'border-border-subtle text-text-dim'
                    }`}>
                      {result.classification.taxDeductible ? 'Tax Deductible' : 'Not Deductible'}
                    </span>
                  </div>
                  {result.classification.notes && (
                    <p className="text-[0.8rem] text-text-dim font-light leading-[1.6]">
                      {result.classification.notes}
                    </p>
                  )}
                </div>

                {/* Copy buttons */}
                <div className="flex gap-3 flex-wrap">
                  <CopyButton text={buildCsv(result)} label="COPY CSV" />
                  <CopyButton text={JSON.stringify(result, null, 2)} label="COPY JSON" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

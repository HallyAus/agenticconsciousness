'use client';

import { useState, useRef, useCallback } from 'react';
import StagedLoading from '@/components/StagedLoading';
import CopyButton from '@/components/CopyButton';
import SendToEmail from '@/components/SendToEmail';
import { trackEvent } from '@/lib/tracking';
import { useCsrf } from '@/lib/useCsrf';
import { useToolAccess } from '@/components/tools/ToolGate';

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
  lineItems: { description: string; qty: string | null; unitPrice: string | null; amount: string | null }[];
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

interface Stats {
  invoices: number;
  quotes: number;
  competitors: number;
  emails: number;
  summaries: number;
  meetings: number;
  jobads: number;
  contracts: number;
}

interface FeaturedToolProps {
  stats: Stats;
}

const STAGED_STEPS = [
  'Reading document...',
  'Extracting fields...',
  'Identifying line items...',
  'Classifying expense...',
  'Complete.',
];

const EXAMPLE_RESULT: InvoiceResult = {
  supplier: { name: 'Bunnings Warehouse', abn: '26 008 445 485', address: '123 Trade St, Scoresby VIC 3179', contact: 'accounts@bunnings.com.au' },
  invoice: { number: 'INV-2026-0847', date: '15/03/2026', dueDate: '14/04/2026', paymentTerms: 'Net 30' },
  lineItems: [
    { description: 'DeWalt 18V Brushless Drill Kit', qty: '2', unitPrice: '$189.00', amount: '$378.00' },
    { description: 'Makita 5" Angle Grinder', qty: '1', unitPrice: '$149.00', amount: '$149.00' },
    { description: 'Assorted Fasteners Pack', qty: '3', unitPrice: '$24.50', amount: '$73.50' },
  ],
  totals: { subtotal: '$600.50', gst: '$60.05', total: '$660.55', currency: 'AUD' },
  classification: { category: 'Tools & Equipment', type: 'Business', taxDeductible: true, notes: 'Capital equipment purchase — depreciable assets.' },
};

export default function FeaturedTool({ stats }: FeaturedToolProps) {
  const csrfToken = useCsrf();
  const toolAccess = useToolAccess();
  const [imageData, setImageData] = useState<{ data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' } | null>(null);
  const [pdfData, setPdfData] = useState<{ data: string } | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, []);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleFileChange(fakeEvent);
  }

  function handleTryExample() {
    setResult(EXAMPLE_RESULT);
    setLoading(false);
    setApiDone(false);
    setError(null);
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

  const canSubmit = !loading && (imageData !== null || pdfData !== null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setApiDone(false);
    setError(null);
    setResult(null);

    try {
      const body = pdfData ? { pdf: pdfData } : { image: imageData };
      const res = await fetch('/api/tools/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.status === 402 || res.status === 429) {
        setError(data.error || 'Daily limit reached. Please verify your email.');
        toolAccess?.triggerEmailGate();
        toolAccess?.refresh();
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Scanning failed. Please try again.');
      } else {
        toolAccess?.refresh();
        setApiDone(true);
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
        li.description, li.qty ?? '', li.unitPrice ?? '', li.amount ?? '',
      ]),
      [],
      ['', '', 'Subtotal', r.totals.subtotal ?? ''],
      ['', '', 'GST', r.totals.gst ?? ''],
      ['', '', 'Total', r.totals.total ?? ''],
    ];
    return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  return (
    <section className="px-10 max-md:px-5 max-sm:px-4 py-16 max-sm:py-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex gap-10 max-md:flex-col max-sm:gap-6">
          {/* Left side (45%) */}
          <div className="w-[45%] max-md:w-full flex flex-col justify-center gap-6">
            {/* Badge */}
            <div className="inline-flex self-start">
              <span className="font-mono text-[9px] tracking-[2px] uppercase px-3 py-[5px] border-2 border-ac-red text-ac-red font-black">
                MOST POPULAR
              </span>
            </div>

            <h2 className="text-[clamp(1.8rem,4vw,2.5rem)] font-black tracking-tight leading-none text-text-primary">
              Invoice Scanner
            </h2>

            <p className="text-text-dim text-[13px] font-light leading-[1.7] max-w-[420px]">
              Upload a photo or PDF. AI extracts every field — supplier, ABN, line items, GST classification. Export to CSV for your bookkeeper.
            </p>

            {/* Stats row */}
            <div className="flex gap-8 max-sm:gap-4 flex-wrap">
              {[
                { value: stats.invoices.toLocaleString(), label: 'SCANNED' },
                { value: '~8s', label: 'AVG TIME' },
                { value: '98%', label: 'ACCURACY' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-[1.1rem] font-black tracking-[-1px] text-ac-red">{s.value}</div>
                  <div className="font-mono text-[9px] text-text-dim tracking-[2px] uppercase mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side (55%) */}
          <div className="w-[55%] max-md:w-full">
            {/* TRY IT NOW label */}
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 bg-ac-red animate-blink" />
              <span className="font-mono text-[9px] tracking-[3px] uppercase text-ac-red font-black">
                TRY IT NOW
              </span>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="flex gap-[2px] max-sm:flex-col">
                {/* Upload zone */}
                <div className="flex-1 min-w-0">
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => !result && fileRef.current?.click()}
                    className={`border-2 border-dashed border-border-subtle min-h-[220px] flex flex-col items-center justify-center gap-3 transition-colors duration-200 p-4 ${!result ? 'cursor-pointer hover:border-ac-red' : ''}`}
                  >
                    {filePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={filePreview} alt="Invoice preview" className="max-h-[180px] object-contain" />
                    ) : fileName && pdfData ? (
                      <div className="text-center">
                        <div className="text-ac-red text-[1.5rem] mb-1">PDF</div>
                        <div className="font-mono text-[0.7rem] max-sm:text-xs text-text-primary">{fileName}</div>
                      </div>
                    ) : !result ? (
                      <>
                        <div className="text-text-ghost text-[1.5rem]">&uarr;</div>
                        <div className="font-mono text-[0.65rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim text-center">
                          Drop file here or click to upload
                        </div>
                        <div className="font-mono text-[0.5rem] text-text-ghost">PDF, JPG, PNG, WebP</div>
                      </>
                    ) : null}
                    {result && !filePreview && !pdfData && (
                      <div className="font-mono text-[0.65rem] max-sm:text-xs text-text-dim tracking-[1px] uppercase">
                        Example data loaded
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    aria-label="Upload a file"
                    className="hidden"
                  />
                </div>

                {/* Result preview */}
                <div className="flex-1 min-w-0 border-2 border-border-subtle p-4 min-h-[220px] flex flex-col">
                  <div className="font-mono text-[9px] tracking-[2px] uppercase text-text-dim mb-3">
                    {result ? 'EXTRACTED DATA' : 'RESULTS PREVIEW'}
                  </div>
                  {loading && (
                    <StagedLoading steps={STAGED_STEPS} isComplete={apiDone} />
                  )}
                  {result && !loading && (
                    <div className="flex flex-col gap-[6px] flex-1">
                      <div className="flex justify-between text-[0.78rem]">
                        <span className="text-text-dim font-mono text-[9px] tracking-[1px] uppercase">Supplier</span>
                        <span className="text-text-primary font-light text-[0.78rem]">{result.supplier.name}</span>
                      </div>
                      <div className="flex justify-between text-[0.78rem]">
                        <span className="text-text-dim font-mono text-[9px] tracking-[1px] uppercase">ABN</span>
                        <span className="text-text-primary font-light text-[0.78rem]">{result.supplier.abn}</span>
                      </div>
                      <div className="flex justify-between text-[0.78rem]">
                        <span className="text-text-dim font-mono text-[9px] tracking-[1px] uppercase">Invoice #</span>
                        <span className="text-text-primary font-light text-[0.78rem]">{result.invoice.number}</span>
                      </div>
                      <div className="flex justify-between text-[0.78rem]">
                        <span className="text-text-dim font-mono text-[9px] tracking-[1px] uppercase">Total</span>
                        <span className="text-ac-red font-black text-[0.85rem]">{result.totals.total}</span>
                      </div>
                      <div className="flex justify-between text-[0.78rem]">
                        <span className="text-text-dim font-mono text-[9px] tracking-[1px] uppercase">Tax</span>
                        <span className="text-text-primary font-light text-[0.78rem]">
                          {result.classification.type} — {result.classification.taxDeductible ? 'Deductible' : 'Not Deductible'}
                        </span>
                      </div>
                      <div className="mt-auto pt-3 flex gap-2 flex-wrap">
                        <CopyButton text={buildCsv(result)} label="CSV" />
                        <CopyButton text={JSON.stringify(result, null, 2)} label="JSON" />
                        <SendToEmail resultText={JSON.stringify(result, null, 2)} toolName="Invoice Scanner" />
                      </div>
                    </div>
                  )}
                  {!result && !loading && (
                    <div className="flex-1 flex flex-col gap-2 opacity-30">
                      {['Supplier', 'ABN', 'Invoice #', 'Total', 'Tax'].map((label) => (
                        <div key={label} className="flex justify-between">
                          <span className="font-mono text-[9px] tracking-[1px] uppercase text-text-ghost">{label}</span>
                          <span className="h-[10px] w-24 bg-text-dead" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-[2px] mt-[2px]">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex-1 bg-ac-red text-white font-display text-[0.75rem] font-black tracking-[2px] uppercase py-4 transition-all duration-200 hover:bg-white hover:text-[#0a0a0a] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none"
                >
                  {loading ? 'Scanning...' : 'Scan Invoice \u2192'}
                </button>
                <button
                  type="button"
                  onClick={result ? handleScanAnother : handleTryExample}
                  className="flex-1 bg-transparent border-2 border-ac-red text-ac-red font-display text-[0.75rem] font-black tracking-[2px] uppercase py-4 transition-all duration-200 hover:bg-ac-red hover:text-white cursor-pointer"
                >
                  {result ? 'Scan Another' : 'Try Example'}
                </button>
              </div>

              {error && (
                <p className="font-mono text-[0.7rem] max-sm:text-xs text-ac-red tracking-[1px] mt-2">{error}</p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

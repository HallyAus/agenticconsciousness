'use client';

import { useState, useRef } from 'react';
import StagedLoading from '@/components/StagedLoading';
import EmailLink from '@/components/EmailLink';
import { useToolAccess } from '@/components/tools/ToolGate';
import { trackEvent } from '@/lib/tracking';
import { useCsrf } from '@/lib/useCsrf';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BillingPeriod {
  from: string;
  to: string;
  days: number;
}

interface MeterUsage {
  totalKwh: number;
  peakKwh?: number;
  offPeakKwh?: number;
  shoulderKwh?: number;
}

interface MeterRates {
  dailySupplyCharge: number;
  peakRate?: number;
  offPeakRate?: number;
  shoulderRate?: number;
  flatRate?: number;
}

interface Meter {
  nmi: string | null;
  meterType: 'GENERAL' | 'CONTROLLED_LOAD';
  tariffType: 'flat' | 'time-of-use' | 'demand';
  usage: MeterUsage;
  rates: MeterRates;
}

interface Solar {
  exportedKwh: number;
  feedInRate: number;
}

interface Extracted {
  retailer: string;
  planName: string;
  postcode: string;
  state: string;
  distributionZone: string;
  isEstimatedRead: boolean;
  billingPeriod: BillingPeriod;
  meters: Meter[];
  solar: Solar | null;
  totalCost: number;
  averageDailyCost: number;
  gstIncluded: boolean;
}

interface Plan {
  rank: number;
  retailer: string;
  planName: string;
  planId: string;
  annualEstimate: number;
  annualSavings: number;
  dailySupplyCharge: number;
  usageRate: number;
  solarFeedIn: number | null;
  contractType: string;
  exitFees: string | null;
  greenPower: boolean;
}

interface EnergyResult {
  extracted: Extracted;
  currentAnnualEstimate: number;
  plans: Plan[];
  recommendation: string;
  unsupported: boolean;
  unsupportedMessage: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const btnClass =
  'w-full bg-ac-red text-white font-display text-[0.85rem] font-black tracking-[2px] uppercase py-4 transition-all duration-200 hover:bg-white hover:text-[#0a0a0a] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-none';

const STAGED_STEPS = [
  'Analysing your energy bill...',
  'Comparing plans across 30+ retailers...',
  'Generating recommendation...',
  'Complete.',
];

const SAMPLE_RESULT: EnergyResult = {
  extracted: {
    retailer: 'Origin Energy',
    planName: 'Origin Go',
    postcode: '2000',
    state: 'NSW',
    distributionZone: 'AUSGRID',
    isEstimatedRead: false,
    billingPeriod: { from: '2026-01-01', to: '2026-03-01', days: 60 },
    meters: [{
      nmi: null,
      meterType: 'GENERAL' as const,
      tariffType: 'time-of-use' as const,
      usage: { totalKwh: 1200, peakKwh: 400, offPeakKwh: 600, shoulderKwh: 200 },
      rates: { dailySupplyCharge: 1.20, peakRate: 0.38, offPeakRate: 0.18, shoulderRate: 0.25 },
    }],
    solar: null,
    totalCost: 520.40,
    averageDailyCost: 8.67,
    gstIncluded: true,
  },
  currentAnnualEstimate: 3165.77,
  plans: [
    { rank: 1, retailer: 'Alinta Energy', planName: 'No Worries Plan', planId: 'ALI001', annualEstimate: 2683.00, annualSavings: 482.77, dailySupplyCharge: 0.99, usageRate: 0.28, solarFeedIn: null, contractType: 'No lock-in', exitFees: null, greenPower: false },
    { rank: 2, retailer: 'Red Energy', planName: 'Living Energy', planId: 'RED001', annualEstimate: 2745.00, annualSavings: 420.77, dailySupplyCharge: 1.05, usageRate: 0.29, solarFeedIn: null, contractType: 'No lock-in', exitFees: null, greenPower: false },
    { rank: 3, retailer: 'Simply Energy', planName: 'Simply Plus', planId: 'SIM001', annualEstimate: 2812.00, annualSavings: 353.77, dailySupplyCharge: 1.10, usageRate: 0.30, solarFeedIn: null, contractType: '12 months', exitFees: null, greenPower: false },
  ],
  recommendation: "Based on your usage pattern, you consume most power off-peak (50% of total usage). Switching from Origin Go to Alinta's No Worries Plan would save you approximately $483 per year. Their off-peak rate of $0.16/kWh is significantly lower than your current $0.18/kWh, and the daily supply charge drops from $1.20 to $0.99.\n\nThis is a no lock-in contract, so you can switch again if a better deal comes along. The savings estimate is based on your actual 60-day usage annualised to a full year. Since your bill was an actual meter read (not estimated), these figures should be reliable.",
  unsupported: false,
  unsupportedMessage: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  return `$${n.toFixed(decimals)}`;
}

function fmtRate(n: number): string {
  return `${n.toFixed(2)}c/kWh`;
}

function meterLabel(type: string): string {
  return type === 'CONTROLLED_LOAD' ? 'Controlled Load' : 'General Supply';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EnergyBillTool() {
  const csrfToken = useCsrf();
  const [imageData, setImageData] = useState<{ data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' } | null>(null);
  const [pdfData, setPdfData] = useState<{ data: string } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<EnergyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toolAccess = useToolAccess();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Supported formats: JPG, PNG, WebP, PDF.');
      return;
    }

    const maxSize = file.type === 'application/pdf' ? 8 * 1024 * 1024 : 4 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(file.type === 'application/pdf' ? 'PDF must be under 8MB.' : 'Image must be under 4MB.');
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
      } else {
        const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp';
        setImageData({ data: base64, mediaType });
        setPdfData(null);
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

  function handleReset() {
    setResult(null);
    setApiDone(false);
    setImageData(null);
    setPdfData(null);
    setFileName(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleTryExample() {
    setLoading(true);
    setApiDone(false);
    setError(null);
    setResult(null);

    // Simulate staged loading then show sample
    setTimeout(() => {
      setApiDone(true);
      setTimeout(() => {
        setResult(SAMPLE_RESULT);
        setLoading(false);
        trackEvent('ViewContent', { content_name: 'Energy Bill Analyser — Example' });
      }, 600);
    }, 3000);
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
      const body = pdfData
        ? { pdf: pdfData }
        : { image: imageData };

      const res = await fetch('/api/tools/energy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.status === 402 || res.status === 429) {
        toolAccess?.triggerEmailGate();
        setError(data.error || 'Daily limit reached. Please verify your email.');
        toolAccess?.refresh();
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Analysis failed. Please try again.');
      } else {
        toolAccess?.refresh();
        setApiDone(true);
        setTimeout(() => {
          setResult(data);
          setLoading(false);
          trackEvent('ViewContent', { content_name: 'Energy Bill Analyser' });
        }, 600);
        return;
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      if (!apiDone) setLoading(false);
    }
  }

  // ─── Render: Result Cards ─────────────────────────────────────────────────

  function renderBillCard(r: EnergyResult) {
    const { extracted: ex } = r;
    return (
      <div
        key="bill"
        style={{
          background: 'var(--bg-card)',
          borderTop: '3px solid var(--red)',
          padding: '20px',
          opacity: 0,
          animation: 'fadeInUp 0.4s ease-out 0s forwards',
        }}
      >
        <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-4" style={{ color: 'var(--red)' }}>
          YOUR BILL
        </div>

        {/* Estimated read warning */}
        {ex.isEstimatedRead && (
          <div
            className="mb-4 p-3 font-mono text-[0.78rem] leading-[1.5]"
            style={{ background: 'rgba(255, 193, 7, 0.08)', border: '1px solid rgba(255, 193, 7, 0.3)', color: 'rgba(255, 193, 7, 0.9)' }}
          >
            ⚠ This bill contains estimated readings. Actual savings may differ.
          </div>
        )}

        {/* Overview table */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5">
          {[
            ['Retailer', ex.retailer],
            ['Plan', ex.planName],
            ['Billing Period', `${ex.billingPeriod.from} — ${ex.billingPeriod.to} (${ex.billingPeriod.days} days)`],
            ['Total Usage', `${ex.meters.reduce((s, m) => s + m.usage.totalKwh, 0).toLocaleString()} kWh`],
            ['Tariff Type', ex.meters[0]?.tariffType ?? '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="font-mono text-[0.5rem] tracking-[1px] uppercase mb-1" style={{ color: 'var(--text-ghost)' }}>{label}</div>
              <div className="text-[0.82rem] font-light" style={{ color: 'var(--text-primary)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Per-meter breakdown */}
        {ex.meters.map((meter, i) => (
          <div key={i} className="mb-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="font-mono text-[0.65rem] tracking-[2px] uppercase mb-2" style={{ color: 'var(--text-dim)' }}>
              {meterLabel(meter.meterType)}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <div className="font-mono text-[0.5rem] tracking-[1px] uppercase mb-1" style={{ color: 'var(--text-ghost)' }}>Daily Supply</div>
                <div className="text-[0.82rem] font-light" style={{ color: 'var(--text-primary)' }}>{fmt(meter.rates.dailySupplyCharge)}/day</div>
              </div>
              {meter.rates.flatRate != null && (
                <div>
                  <div className="font-mono text-[0.5rem] tracking-[1px] uppercase mb-1" style={{ color: 'var(--text-ghost)' }}>Usage Rate</div>
                  <div className="text-[0.82rem] font-light" style={{ color: 'var(--text-primary)' }}>{fmtRate(meter.rates.flatRate)}</div>
                </div>
              )}
              {meter.rates.peakRate != null && (
                <div>
                  <div className="font-mono text-[0.5rem] tracking-[1px] uppercase mb-1" style={{ color: 'var(--text-ghost)' }}>Peak</div>
                  <div className="text-[0.82rem] font-light" style={{ color: 'var(--text-primary)' }}>{fmtRate(meter.rates.peakRate)} ({meter.usage.peakKwh ?? 0} kWh)</div>
                </div>
              )}
              {meter.rates.offPeakRate != null && (
                <div>
                  <div className="font-mono text-[0.5rem] tracking-[1px] uppercase mb-1" style={{ color: 'var(--text-ghost)' }}>Off-Peak</div>
                  <div className="text-[0.82rem] font-light" style={{ color: 'var(--text-primary)' }}>{fmtRate(meter.rates.offPeakRate)} ({meter.usage.offPeakKwh ?? 0} kWh)</div>
                </div>
              )}
              {meter.rates.shoulderRate != null && (
                <div>
                  <div className="font-mono text-[0.5rem] tracking-[1px] uppercase mb-1" style={{ color: 'var(--text-ghost)' }}>Shoulder</div>
                  <div className="text-[0.82rem] font-light" style={{ color: 'var(--text-primary)' }}>{fmtRate(meter.rates.shoulderRate)} ({meter.usage.shoulderKwh ?? 0} kWh)</div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Solar */}
        {ex.solar && (
          <div className="mb-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="font-mono text-[0.65rem] tracking-[2px] uppercase mb-2" style={{ color: 'var(--text-dim)' }}>
              Solar
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <div className="font-mono text-[0.5rem] tracking-[1px] uppercase mb-1" style={{ color: 'var(--text-ghost)' }}>Exported</div>
                <div className="text-[0.82rem] font-light" style={{ color: 'var(--text-primary)' }}>{ex.solar.exportedKwh.toLocaleString()} kWh</div>
              </div>
              <div>
                <div className="font-mono text-[0.5rem] tracking-[1px] uppercase mb-1" style={{ color: 'var(--text-ghost)' }}>Feed-in Rate</div>
                <div className="text-[0.82rem] font-light" style={{ color: 'var(--text-primary)' }}>{fmtRate(ex.solar.feedInRate)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="pt-3 flex flex-col gap-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {[
            ['Total Cost', fmt(ex.totalCost)],
            ['Daily Average', `${fmt(ex.averageDailyCost)}/day`],
            ['Annual Estimate', fmt(r.currentAnnualEstimate)],
          ].map(([label, value], i) => (
            <div key={label} className={`flex justify-between text-[0.82rem] ${i === 2 ? 'pt-2 mt-1 text-[0.9rem] font-black' : ''}`} style={i === 2 ? { borderTop: '1px solid var(--border-subtle)' } : undefined}>
              <span style={{ color: i === 2 ? 'var(--text-primary)' : 'var(--text-dim)' }}>{label}</span>
              <span className={i === 2 ? '' : 'font-light'} style={{ color: i === 2 ? 'var(--red)' : 'var(--text-primary)' }}>{value}</span>
            </div>
          ))}
          {ex.gstIncluded && (
            <div className="font-mono text-[0.5rem] tracking-[1px] uppercase text-right mt-1" style={{ color: 'var(--text-ghost)' }}>
              Inc. GST
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderPlansCard(r: EnergyResult) {
    if (r.plans.length === 0) {
      return (
        <div
          key="plans"
          style={{
            background: 'var(--bg-card)',
            borderTop: '3px solid var(--border-subtle)',
            padding: '20px',
            opacity: 0,
            animation: 'fadeInUp 0.4s ease-out 0.1s forwards',
          }}
        >
          <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red)' }}>
            TOP PLANS
          </div>
          <p className="text-[0.85rem] font-light" style={{ color: 'var(--text-dim)' }}>
            No plans available for your area.
          </p>
        </div>
      );
    }

    return (
      <div
        key="plans"
        style={{
          background: 'var(--bg-card)',
          borderTop: '3px solid var(--border-subtle)',
          padding: '20px',
          opacity: 0,
          animation: 'fadeInUp 0.4s ease-out 0.1s forwards',
        }}
      >
        <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-4" style={{ color: 'var(--red)' }}>
          TOP PLANS
        </div>
        <div className="flex flex-col gap-4">
          {r.plans.map((plan, i) => (
            <div
              key={plan.planId}
              className="flex gap-4 pb-4"
              style={{
                borderBottom: i < r.plans.length - 1 ? '1px solid var(--border-subtle)' : undefined,
                opacity: i === 0 ? 1 : 0.75,
              }}
            >
              {/* Rank */}
              <div
                className="font-display text-[1.8rem] font-black leading-none shrink-0 w-[36px] text-center"
                style={{ color: 'var(--red)' }}
              >
                {plan.rank}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="text-[0.95rem] font-black leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {plan.retailer}
                </div>
                <div className="text-[0.8rem] font-light mb-2" style={{ color: 'var(--text-dim)' }}>
                  {plan.planName}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-[1rem] font-black" style={{ color: 'var(--text-primary)' }}>
                    {fmt(plan.annualEstimate)}/yr
                  </span>
                  <span className="font-mono text-[0.8rem] max-sm:text-xs font-bold" style={{ color: 'var(--red)' }}>
                    Save {fmt(plan.annualSavings)}/yr
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-1 mt-2 max-sm:grid-cols-2">
                  <div>
                    <div className="font-mono text-[0.5rem] tracking-[1px] uppercase" style={{ color: 'var(--text-ghost)' }}>Daily Supply</div>
                    <div className="text-[0.78rem] font-light" style={{ color: 'var(--text-dim)' }}>{fmt(plan.dailySupplyCharge)}/day</div>
                  </div>
                  <div>
                    <div className="font-mono text-[0.5rem] tracking-[1px] uppercase" style={{ color: 'var(--text-ghost)' }}>Usage Rate</div>
                    <div className="text-[0.78rem] font-light" style={{ color: 'var(--text-dim)' }}>{fmtRate(plan.usageRate)}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[0.5rem] tracking-[1px] uppercase" style={{ color: 'var(--text-ghost)' }}>Contract</div>
                    <div className="text-[0.78rem] font-light" style={{ color: 'var(--text-dim)' }}>{plan.contractType}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderRecommendationCard(r: EnergyResult) {
    return (
      <div
        key="recommendation"
        style={{
          background: 'var(--bg-card)',
          borderTop: '2px solid var(--red)',
          padding: '20px',
          opacity: 0,
          animation: 'fadeInUp 0.4s ease-out 0.2s forwards',
        }}
      >
        <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red)' }}>
          OUR RECOMMENDATION
        </div>
        {r.recommendation.split('\n\n').map((para, i) => (
          <p key={i} className="text-[0.85rem] font-light leading-[1.7] mb-3 last:mb-0" style={{ color: 'var(--text-dim)' }}>
            {para}
          </p>
        ))}
      </div>
    );
  }

  function renderCtaCard() {
    return (
      <div
        key="cta"
        className="text-center py-6"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          opacity: 0,
          animation: 'fadeInUp 0.4s ease-out 0.3s forwards',
        }}
      >
        <div className="text-[0.95rem] font-light mb-3" style={{ color: 'var(--text-dim)' }}>
          Want help switching retailers?
        </div>
        <EmailLink
          className="inline-block font-display text-[0.85rem] font-black tracking-[2px] uppercase py-3 px-8 transition-all duration-200 cursor-pointer border-2 border-ac-red text-ac-red hover:bg-ac-red hover:text-white"
        >
          Book free consultation →
        </EmailLink>
      </div>
    );
  }

  function renderUnsupportedCard() {
    return (
      <div
        key="unsupported"
        style={{
          background: 'var(--bg-card)',
          borderTop: '2px solid var(--red)',
          padding: '20px',
          opacity: 0,
          animation: 'fadeInUp 0.4s ease-out 0.1s forwards',
        }}
      >
        <p className="text-[0.85rem] font-light leading-[1.7] mb-4" style={{ color: 'var(--text-dim)' }}>
          Energy plan comparison covers NSW, VIC, QLD, SA, TAS, and ACT. For WA and NT, book a free consultation and we&apos;ll analyse your bill personally.
        </p>
        <EmailLink
          className="inline-block font-display text-[0.85rem] font-black tracking-[2px] uppercase py-3 px-8 transition-all duration-200 cursor-pointer border-2 border-ac-red text-ac-red hover:bg-ac-red hover:text-white"
        >
          Book consultation →
        </EmailLink>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-14">
          <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase text-ac-red mb-3">
            TOOL / ENERGY BILL ANALYSER
          </div>
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-black tracking-tight leading-none mb-4">
            Find a cheaper energy plan.
          </h2>
          <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] max-w-[480px]">
            Upload your electricity bill and we&apos;ll compare plans across 30+ Australian retailers to find you the best deal.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 max-md:grid-cols-1 max-sm:gap-4">
          {/* LEFT: Input */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim">
                Energy Bill (PDF, JPG, PNG — max 8MB)
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border border-dashed border-border-subtle min-h-[280px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-ac-red transition-colors duration-200 p-6"
              >
                {fileName && pdfData ? (
                  <div className="text-center">
                    <div className="text-ac-red text-[2rem] mb-2">PDF</div>
                    <div className="font-mono text-[0.8rem] max-sm:text-xs text-text-primary">{fileName}</div>
                  </div>
                ) : fileName && imageData ? (
                  <div className="text-center">
                    <div className="text-ac-red text-[2rem] mb-2">📷</div>
                    <div className="font-mono text-[0.8rem] max-sm:text-xs text-text-primary">{fileName}</div>
                  </div>
                ) : (
                  <>
                    <div className="text-text-ghost text-[2rem]">↑</div>
                    <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim text-center">
                      Drop your electricity bill here
                    </div>
                    <div className="font-mono text-[0.5rem] text-text-ghost">
                      or click to upload — PDF, JPG, PNG, WebP
                    </div>
                    <div className="font-mono text-[0.5rem] text-text-ghost mt-1">
                      📷 Take a photo on mobile
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleFileChange}
                aria-label="Upload energy bill"
                className="hidden"
              />
              {(imageData || pdfData) && (
                <button
                  type="button"
                  onClick={() => { setImageData(null); setPdfData(null); setFileName(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim hover:text-ac-red transition-colors duration-200 text-left cursor-pointer bg-transparent border-none p-0"
                >
                  ✕ Remove file
                </button>
              )}
            </div>

            <button type="submit" disabled={!canSubmit} className={btnClass}>
              {loading ? 'Analysing...' : 'ANALYSE BILL →'}
            </button>

            {!loading && !result && (
              <button
                type="button"
                onClick={handleTryExample}
                className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-text-dim hover:text-ac-red transition-colors duration-200 text-center cursor-pointer bg-transparent border-none p-0"
              >
                Try example →
              </button>
            )}

            {error && (
              <p className="font-mono text-[0.8rem] max-sm:text-xs text-ac-red tracking-[1px]">{error}</p>
            )}
          </form>

          {/* RIGHT: Results */}
          <div className="flex flex-col gap-6">
            {/* Idle state */}
            {!result && !loading && !error && (
              <div className="flex flex-col gap-3 pt-2">
                <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase text-text-dim">
                  Results will appear here
                </div>
                <p className="text-[0.85rem] text-text-dim leading-[1.7] font-light">
                  Upload your electricity bill and we&apos;ll extract your usage data, compare plans from 30+ retailers, and recommend the best switch.
                </p>
                <div className="mt-4 border-t border-border-subtle pt-6 flex flex-col gap-3">
                  {['Your Bill', 'Top Plans', 'Recommendation'].map((label) => (
                    <div key={label} className="bg-ac-card border-t-[3px] border-border-subtle p-5 opacity-30">
                      <div className="h-2 bg-text-dead w-1/3 mb-3" />
                      <div className="h-2 bg-text-dead w-full mb-2" />
                      <div className="h-2 bg-text-dead w-4/5" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error state */}
            {!result && !loading && error && (
              <div className="flex flex-col gap-4 pt-2">
                <div className="bg-ac-card border-t-[3px] border-ac-red p-5">
                  <p className="text-[0.85rem] font-light leading-[1.7] mb-4" style={{ color: 'var(--text-dim)' }}>
                    We couldn&apos;t read your energy bill. Try a clearer photo or PDF.
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="font-mono text-[0.8rem] max-sm:text-xs tracking-[2px] uppercase text-ac-red hover:text-white hover:bg-ac-red transition-colors duration-200 cursor-pointer bg-transparent border border-ac-red py-2 px-4"
                  >
                    Try again →
                  </button>
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="flex flex-col gap-4 pt-2">
                <StagedLoading
                  steps={STAGED_STEPS}
                  isComplete={apiDone}
                />
              </div>
            )}

            {/* Result state */}
            {result && (
              <div className="flex flex-col gap-5">
                {renderBillCard(result)}

                {result.unsupported ? (
                  renderUnsupportedCard()
                ) : (
                  <>
                    {renderPlansCard(result)}
                    {renderRecommendationCard(result)}
                    {renderCtaCard()}
                  </>
                )}

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full font-display text-[0.85rem] font-black tracking-[2px] uppercase py-4 transition-all duration-200 cursor-pointer border-none text-white"
                  style={{ background: 'var(--red)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; (e.currentTarget as HTMLButtonElement).style.color = '#000'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red)'; (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
                >
                  ANALYSE ANOTHER
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

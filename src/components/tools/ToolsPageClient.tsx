'use client';

import { useState, useEffect, useRef } from 'react';
import AnimatedCounter from '@/components/AnimatedCounter';
import ToolGrid from '@/components/ToolGrid';
import ToolPanel from '@/components/ToolPanel';
import Link from 'next/link';

const CATEGORIES = ['ALL', 'FINANCE', 'SALES', 'WRITING', 'STRATEGY', 'DATA'];

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

export default function ToolsPageClient() {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [stats, setStats] = useState<Stats>({ invoices: 1247, quotes: 892, competitors: 634, emails: 456, summaries: 312, meetings: 278, jobads: 189, contracts: 234 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/tools/stats').then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  const totalUsed = Object.values(stats).reduce((a, b) => a + b, 0);

  function handleSelectTool(toolId: string | null) {
    setSelectedTool(toolId);
    if (toolId) {
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  return (
    <main className="pt-[60px] min-h-screen">
      {/* Hero */}
      <section className="pt-20 pb-10 px-10 max-md:px-5">
        <div className="max-w-[1200px] mx-auto">
          <div className="font-mono text-[0.7rem] tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
            FREE AI TOOLKIT
          </div>
          <h1 className="text-[clamp(2rem,5vw,3rem)] font-black tracking-tight leading-none mb-4 text-text-primary" style={{ letterSpacing: '-2px' }}>
            Eight tools. Zero signup.
          </h1>
          <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] max-w-[500px]">
            Real business tools powered by Claude. Scan invoices, write quotes, analyse competitors, draft emails, summarise documents, and more. Pick a tool and go.
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <div className="px-10 max-md:px-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1200px] mx-auto flex gap-10 py-5 flex-wrap max-sm:gap-6">
          {[
            { value: totalUsed.toLocaleString(), label: 'TOOLS USED' },
            { value: stats.invoices.toLocaleString(), label: 'INVOICES SCANNED' },
            { value: stats.quotes.toLocaleString(), label: 'QUOTES GENERATED' },
            { value: '2.4s', label: 'AVG RESPONSE' },
          ].map((s) => (
            <div key={s.label}>
              <AnimatedCounter value={s.value} className="text-[1.2rem] font-black tracking-[-1px]" style={{ color: 'var(--red-text)' }} />
              <div className="font-mono text-[0.6rem] text-text-dim tracking-[2px] uppercase mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="px-10 max-md:px-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1200px] mx-auto flex gap-[6px] py-4 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="font-display text-[0.6rem] font-black tracking-[2px] uppercase py-[6px] px-[14px] cursor-pointer transition-all duration-200 border"
              style={{
                background: activeCategory === cat ? 'var(--red)' : 'transparent',
                color: activeCategory === cat ? '#fff' : 'var(--text-dim)',
                borderColor: activeCategory === cat ? 'var(--red)' : 'var(--border-subtle)',
              }}
            >
              {cat === 'ALL' ? 'ALL TOOLS' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tool grid */}
      <div className="px-10 max-md:px-5">
        <div className="max-w-[1200px] mx-auto py-6">
          <ToolGrid
            onSelectTool={handleSelectTool}
            selectedTool={selectedTool}
            activeCategory={activeCategory}
          />
        </div>
      </div>

      {/* Expanded tool panel */}
      <div ref={panelRef}>
        <ToolPanel toolId={selectedTool} onClose={() => setSelectedTool(null)} />
      </div>

      {/* Bottom CTA */}
      <section className="py-16 px-10 max-md:px-5 border-t" style={{ borderColor: 'var(--red)' }}>
        <div className="max-w-[600px] mx-auto text-center">
          <div className="font-mono text-[0.7rem] tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
            WHAT&apos;S NEXT
          </div>
          <h2 className="text-[1.3rem] font-black tracking-tight text-text-primary mb-3">
            These tools took us 2 hours to build.
          </h2>
          <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] max-w-[460px] mx-auto mb-8">
            Imagine what we can build for your specific workflows in 2 weeks. Custom AI tools, tailored to your data, integrated into your systems, running 24/7.
          </p>
          <div className="flex gap-4 justify-center flex-wrap mb-10">
            <a href="mailto:ai@agenticconsciousness.com.au" className="inline-block font-display text-[0.7rem] font-black tracking-[2px] uppercase py-3 px-6 no-underline text-white" style={{ background: 'var(--red)' }}>
              Book free consultation →
            </a>
            <Link href="/#ai-audit" className="inline-block font-display text-[0.7rem] font-black tracking-[2px] uppercase py-3 px-6 no-underline border-2" style={{ borderColor: 'var(--red)', color: 'var(--red-text)' }}>
              Take AI audit →
            </Link>
          </div>
          <div className="flex gap-16 justify-center max-sm:gap-8 max-sm:flex-wrap">
            {[
              { value: '2 hours', label: 'To build these tools' },
              { value: '2 weeks', label: 'Typical implementation' },
              { value: '$0', label: 'Initial consultation' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-[1.8rem] font-black tracking-tight" style={{ color: 'var(--red-text)' }}>{s.value}</div>
                <div className="font-mono text-[0.6rem] text-text-dim tracking-[2px] uppercase mt-2">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

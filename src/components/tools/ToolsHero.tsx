'use client';

import { useEffect, useState } from 'react';
import AnimatedCounter from '@/components/AnimatedCounter';

export default function ToolsHero() {
  const [stats, setStats] = useState({ invoices: 0, quotes: 0, competitors: 0 });

  useEffect(() => {
    fetch('/api/tools/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const tools = [
    { label: 'INVOICE SCANNER', href: '#invoice-section' },
    { label: 'QUOTE GENERATOR', href: '#quote-section' },
    { label: 'COMPETITOR INTEL', href: '#competitor-section' },
  ];

  return (
    <section className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="font-mono text-[0.7rem] tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>
          FREE AI TOOLS
        </div>
        <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none mb-4 text-text-primary">
          Your free AI toolkit.
        </h1>
        <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] max-w-[520px] mb-8">
          Three tools that do real work — not demos. Scan invoices, generate quotes, analyse competitors. No signup. No API key. Just results.
        </p>

        {/* Tool jump cards */}
        <div className="flex gap-3 mb-14 flex-wrap">
          {tools.map((tool, i) => (
            <a
              key={tool.href}
              href={tool.href}
              className="font-display text-[0.7rem] font-black tracking-[2px] uppercase py-3 px-5 no-underline transition-all duration-200 hover:-translate-y-[2px]"
              style={{
                background: 'var(--bg-card)',
                border: '2px solid var(--border-subtle)',
                color: 'var(--text-dim)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red-text)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
            >
              {`0${i + 1} ${tool.label}`}
            </a>
          ))}
        </div>

        {/* Usage counters */}
        <div className="flex gap-16 max-sm:gap-8 max-sm:flex-wrap border-t pt-8" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <AnimatedCounter value={stats.invoices.toLocaleString()} className="text-[2rem] font-black tracking-tight" style={{ color: 'var(--red-text)' }} />
            <div className="font-mono text-[0.65rem] max-sm:text-xs text-text-dim tracking-[2px] uppercase mt-1">Invoices scanned</div>
          </div>
          <div>
            <AnimatedCounter value={stats.quotes.toLocaleString()} className="text-[2rem] font-black tracking-tight" style={{ color: 'var(--red-text)' }} />
            <div className="font-mono text-[0.65rem] max-sm:text-xs text-text-dim tracking-[2px] uppercase mt-1">Quotes generated</div>
          </div>
          <div>
            <AnimatedCounter value={stats.competitors.toLocaleString()} className="text-[2rem] font-black tracking-tight" style={{ color: 'var(--red-text)' }} />
            <div className="font-mono text-[0.65rem] max-sm:text-xs text-text-dim tracking-[2px] uppercase mt-1">Competitors analysed</div>
          </div>
        </div>
      </div>
    </section>
  );
}

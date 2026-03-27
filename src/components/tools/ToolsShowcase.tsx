'use client';

import { useState, useEffect, useCallback } from 'react';
import FeaturedTool from '@/components/tools/FeaturedTool';
import ToolNavStrip from '@/components/tools/ToolNavStrip';
import ToolHeroSection from '@/components/tools/ToolHeroSection';
import ToolExpander from '@/components/tools/ToolExpander';
import Link from 'next/link';

const TOOL_DATA = [
  {
    id: 'invoice', number: '01', name: 'Invoice Scanner',
    headline: 'Scan any invoice in seconds',
    description: 'Upload a photo or PDF. AI extracts every field — supplier, ABN, line items, GST classification. Export to CSV for your bookkeeper.',
    sampleOutput: [
      { key: 'Supplier', value: 'Bunnings Warehouse' },
      { key: 'ABN', value: '26 008 445 485' },
      { key: 'Invoice #', value: 'INV-2026-0847' },
      { key: 'Total', value: '$847.30 (incl GST)' },
      { key: 'Tax', value: 'Business — Deductible' },
    ],
  },
  {
    id: 'quote', number: '02', name: 'Quote Generator',
    headline: 'Professional quotes in 30 seconds',
    description: 'Describe the job. AI writes a complete quote with scope, line items, GST, payment terms. Copy or email directly to your client.',
    sampleOutput: [
      { key: 'Client', value: 'Smith & Partners' },
      { key: 'Scope', value: 'Website redesign + CMS' },
      { key: 'Subtotal', value: '$12,400.00' },
      { key: 'GST', value: '$1,240.00' },
      { key: 'Total', value: '$13,640.00' },
      { key: 'Valid', value: '30 days' },
    ],
  },
  {
    id: 'competitor', number: '03', name: 'Competitor Intel',
    headline: 'Know your competition in 15 seconds',
    description: 'Enter a competitor name. AI analyses their positioning, strengths, weaknesses, pricing strategy, and how you can differentiate.',
    sampleOutput: [
      { key: 'Competitor', value: 'Sunburnt AI' },
      { key: 'Positioning', value: 'Enterprise AI consulting' },
      { key: 'Weakness', value: 'No free tools, opaque pricing' },
      { key: 'Opportunity', value: 'Target SMBs they ignore' },
    ],
  },
  {
    id: 'email', number: '04', name: 'Email Drafter',
    headline: 'Dump your thoughts. Get a polished email.',
    description: 'Brain-dump what you need to say. AI writes a clean email in your chosen tone — professional, friendly, direct, or formal.',
    sampleOutput: [
      { key: 'Subject', value: 'Follow-up: Project Kickoff' },
      { key: 'Tone', value: 'Professional' },
      { key: 'Words', value: '142' },
    ],
  },
  {
    id: 'summarise', number: '05', name: 'Document Summariser',
    headline: 'Any document. Key points in seconds.',
    description: 'Paste any document — report, article, meeting transcript. AI extracts key points, executive summary, and compression stats.',
    sampleOutput: [
      { key: 'Original', value: '3,200 words' },
      { key: 'Summary', value: '340 words' },
      { key: 'Compression', value: '89%' },
      { key: 'Key points', value: '4 extracted' },
    ],
  },
  {
    id: 'meeting', number: '06', name: 'Meeting Notes',
    headline: 'Messy notes in. Structured actions out.',
    description: 'Paste raw meeting notes. AI extracts action items, owners, deadlines, decisions, and follow-ups.',
    sampleOutput: [
      { key: 'Actions', value: '3 items' },
      { key: 'Decisions', value: '2 recorded' },
      { key: 'Follow-ups', value: '1 pending' },
      { key: 'Next meeting', value: 'Thursday 2pm' },
    ],
  },
  {
    id: 'jobad', number: '07', name: 'Job Ad Writer',
    headline: 'Complete job listings. Bias-checked.',
    description: 'Enter the role details. AI writes a complete job ad with requirements, benefits, salary guidance, and an automatic bias check.',
    sampleOutput: [
      { key: 'Title', value: 'Senior Frontend Developer' },
      { key: 'Location', value: 'Melbourne — Hybrid' },
      { key: 'Salary', value: '$130,000–$160,000' },
      { key: 'Bias check', value: 'Passed — no issues' },
    ],
  },
  {
    id: 'contract', number: '08', name: 'Contract Reviewer',
    headline: 'Understand any contract clause instantly.',
    description: 'Paste a contract clause or full text. AI gives you a plain English translation, fairness rating, risks, and negotiation points.',
    sampleOutput: [
      { key: 'Type', value: 'SaaS agreement' },
      { key: 'Fairness', value: 'Somewhat one-sided' },
      { key: 'Risks', value: '3 flagged (1 high)' },
      { key: 'Missing', value: '2 protections' },
    ],
  },
];

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

const STAT_KEYS: Record<string, keyof Stats> = {
  invoice: 'invoices',
  quote: 'quotes',
  competitor: 'competitors',
  email: 'emails',
  summarise: 'summaries',
  meeting: 'meetings',
  jobad: 'jobads',
  contract: 'contracts',
};

export default function ToolsShowcase() {
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('invoice');
  const [stats, setStats] = useState<Stats>({
    invoices: 1247, quotes: 892, competitors: 634, emails: 456,
    summaries: 312, meetings: 278, jobads: 189, contracts: 234,
  });

  useEffect(() => {
    fetch('/api/tools/stats').then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  const handleExpand = useCallback((toolId: string) => {
    setExpandedTool(prev => prev === toolId ? null : toolId);
    // Scroll to the expander after a brief delay for render
    setTimeout(() => {
      const el = document.getElementById(`tool-expander-${toolId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const handleClose = useCallback(() => {
    setExpandedTool(null);
  }, []);

  function getToolStat(toolId: string): string {
    const key = STAT_KEYS[toolId];
    if (!key) return '';
    const count = stats[key];
    return `${count.toLocaleString()} used`;
  }

  return (
    <main className="pt-[60px] min-h-screen">
      {/* Featured Tool Hero */}
      <FeaturedTool stats={stats} />

      {/* Sticky Nav Strip */}
      <ToolNavStrip
        tools={TOOL_DATA}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Tool Hero Sections */}
      <div className="flex flex-col gap-[2px]">
        {TOOL_DATA.map((tool) => (
          <div key={tool.id} id={`tool-section-${tool.id}`}>
            <ToolHeroSection
              toolId={tool.id}
              number={tool.number}
              name={tool.name}
              headline={tool.headline}
              description={tool.description}
              sampleOutput={tool.sampleOutput}
              stats={getToolStat(tool.id)}
              isExpanded={expandedTool === tool.id}
              expandedTool={expandedTool}
              onExpand={handleExpand}
            />
            {expandedTool === tool.id && (
              <div id={`tool-expander-${tool.id}`}>
                <ToolExpander toolId={tool.id} onClose={handleClose} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <section className="py-24 px-10 max-md:px-5 border-t-2 border-ac-red">
        <div className="max-w-[600px] mx-auto text-center">
          <div className="font-mono text-[0.7rem] tracking-[3px] uppercase mb-4 text-ac-red">
            WHAT&apos;S NEXT
          </div>
          <h2 className="text-[1.5rem] font-black tracking-tight text-text-primary mb-6">
            These tools took us 2 hours to build.
          </h2>
          <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] max-w-[460px] mx-auto mb-10">
            Imagine what we could build for your business in a week.
          </p>
          <div className="flex gap-4 justify-center flex-wrap mb-10">
            <a
              href="mailto:ai@agenticconsciousness.com.au"
              className="inline-block font-display text-[0.7rem] font-black tracking-[2px] uppercase py-3 px-6 no-underline text-white bg-ac-red transition-all duration-200 hover:bg-white hover:text-[#0a0a0a]"
            >
              Book free consultation &rarr;
            </a>
            <Link
              href="/#ai-audit"
              className="inline-block font-display text-[0.7rem] font-black tracking-[2px] uppercase py-3 px-6 no-underline border-2 border-ac-red text-ac-red transition-all duration-200 hover:bg-ac-red hover:text-white"
            >
              Take AI audit &rarr;
            </Link>
          </div>
          <div className="flex gap-16 justify-center max-sm:gap-8 max-sm:flex-wrap">
            {[
              { value: '2 hours', label: 'To build these tools' },
              { value: '2 weeks', label: 'Typical implementation' },
              { value: '$0', label: 'Initial consultation' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-[1.8rem] font-black tracking-tight text-ac-red">{s.value}</div>
                <div className="font-mono text-[0.6rem] text-text-dim tracking-[2px] uppercase mt-2">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

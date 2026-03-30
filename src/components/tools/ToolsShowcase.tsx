'use client';

import { useState, useEffect, useCallback } from 'react';
import FeaturedTool from '@/components/tools/FeaturedTool';
import ToolGate from '@/components/tools/ToolGate';
import ToolNavStrip from '@/components/tools/ToolNavStrip';
import EmailLink from '@/components/EmailLink';
import ToolHeroSection from '@/components/tools/ToolHeroSection';
import ToolExpander from '@/components/tools/ToolExpander';
import Link from 'next/link';

const TOOL_DATA = [
  {
    id: 'invoice', number: '01', name: 'Invoice Scanner',
    headline: 'Scan any invoice in seconds',
    description: 'Upload a photo or PDF of any invoice. In under 10 seconds, AI extracts every field — supplier, ABN, line items, GST classification. Export to CSV or JSON for your bookkeeper.',
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
    description: 'Enter your business name, client, and job description. In about 15 seconds, AI generates a complete quote with scope, itemised pricing, GST, terms, and next steps. Copy or email it directly.',
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
    description: 'Enter a competitor name and optional context. In about 15 seconds, AI analyses their positioning, strengths, weaknesses, pricing strategy, and where you can differentiate.',
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
    description: 'Type your rough thoughts and pick a tone. In under 10 seconds, AI writes a polished email with subject line, body, and sign-off — ready to send.',
    sampleOutput: [
      { key: 'Subject', value: 'Follow-up: Project Kickoff' },
      { key: 'Tone', value: 'Professional' },
      { key: 'Words', value: '142' },
    ],
  },
  {
    id: 'summarise', number: '05', name: 'Document Summariser',
    headline: 'Any document. Key points in seconds.',
    description: 'Paste any document up to 10,000 characters. Choose brief, standard, or detailed depth. AI extracts key points, executive summary, and compression stats in seconds.',
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
    description: 'Paste your raw meeting notes or transcript. In under 10 seconds, AI extracts action items with owners and deadlines, decisions made, and follow-ups — ready to share with the team.',
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
    description: 'Enter the job title, company, and a plain-language role description. In about 15 seconds, AI writes a complete, inclusive job ad with requirements, benefits, and an automatic bias check — ready for Seek or LinkedIn.',
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
    description: 'Paste a contract clause (up to 8,000 characters) and select your role. In about 15 seconds, AI translates the legalese, rates fairness, flags risks, and suggests negotiation points. Not legal advice.',
    sampleOutput: [
      { key: 'Type', value: 'SaaS agreement' },
      { key: 'Fairness', value: 'Somewhat one-sided' },
      { key: 'Risks', value: '3 flagged (1 high)' },
      { key: 'Missing', value: '2 protections' },
    ],
  },
  {
    id: 'energy', number: '09', name: 'Energy Bill Analyser',
    headline: 'Find a cheaper energy plan in 30 seconds',
    description: 'Upload your electricity bill. AI extracts your usage, compares 200+ plans across 30+ retailers via the government Energy Made Easy database, and tells you exactly how much you could save. Covers NSW, VIC, QLD, SA, TAS, and ACT.',
    sampleOutput: [
      { key: 'Current Plan', value: 'Origin Go (TOU)' },
      { key: 'Annual Cost', value: '$3,122' },
      { key: 'Best Plan', value: 'Alinta No Worries' },
      { key: 'Annual Saving', value: '$482/yr' },
      { key: 'Contract', value: 'No lock-in' },
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
    invoices: 0, quotes: 0, competitors: 0, emails: 0,
    summaries: 0, meetings: 0, jobads: 0, contracts: 0,
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
      <ToolGate>
        <FeaturedTool stats={stats} />
      </ToolGate>

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
                <ToolGate>
                  <ToolExpander toolId={tool.id} onClose={handleClose} />
                </ToolGate>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <section className="py-24 px-10 max-md:px-5 max-sm:px-4 border-t-2 border-ac-red">
        <div className="max-w-[600px] mx-auto text-center">
          <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-4 text-ac-red">
            WHAT&apos;S NEXT
          </div>
          <h2 className="text-[1.5rem] font-black tracking-tight text-text-primary mb-6">
            These tools took us 2 hours to build.
          </h2>
          <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] max-w-[460px] mx-auto mb-10">
            Imagine what we could build for your business in a week.
          </p>
          <div className="flex gap-4 justify-center flex-wrap mb-10">
            <EmailLink
              className="inline-block font-display text-[0.8rem] max-sm:text-xs font-black tracking-[2px] uppercase py-3 px-6 no-underline text-white bg-ac-red transition-all duration-200 hover:bg-white hover:text-[#0a0a0a]"
            >
              Book free consultation &rarr;
            </EmailLink>
            <Link
              href="/#ai-audit"
              className="inline-block font-display text-[0.8rem] max-sm:text-xs font-black tracking-[2px] uppercase py-3 px-6 no-underline border-2 border-ac-red text-ac-red transition-all duration-200 hover:bg-ac-red hover:text-white"
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
                <div className="font-mono text-[0.85rem] max-sm:text-xs text-text-dim tracking-[2px] uppercase mt-2">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

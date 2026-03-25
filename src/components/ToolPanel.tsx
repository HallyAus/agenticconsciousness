'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

const toolComponents: Record<string, ComponentType> = {
  invoice: dynamic(() => import('@/components/tools/InvoiceScanner')),
  quote: dynamic(() => import('@/components/tools/QuoteGenerator')),
  competitor: dynamic(() => import('@/components/tools/CompetitorIntel')),
  email: dynamic(() => import('@/components/tools/EmailTool')),
  summarise: dynamic(() => import('@/components/tools/SummariseTool')),
  meeting: dynamic(() => import('@/components/tools/MeetingTool')),
  jobad: dynamic(() => import('@/components/tools/JobAdTool')),
  contract: dynamic(() => import('@/components/tools/ContractTool')),
};

const TOOL_LABELS: Record<string, string> = {
  invoice: 'TOOL 01 / INVOICE SCANNER',
  quote: 'TOOL 02 / QUOTE GENERATOR',
  competitor: 'TOOL 03 / COMPETITOR INTEL',
  email: 'TOOL 04 / EMAIL DRAFTER',
  summarise: 'TOOL 05 / DOCUMENT SUMMARISER',
  meeting: 'TOOL 06 / MEETING NOTES → ACTIONS',
  jobad: 'TOOL 07 / JOB AD WRITER',
  contract: 'TOOL 08 / CONTRACT REVIEWER',
};

interface ToolPanelProps {
  toolId: string | null;
  onClose: () => void;
}

export default function ToolPanel({ toolId, onClose }: ToolPanelProps) {
  if (!toolId) return null;

  const ToolComponent = toolComponents[toolId];
  const label = TOOL_LABELS[toolId] ?? toolId.toUpperCase();

  return (
    <div
      className="px-10 max-md:px-5"
      style={{ borderTop: '2px solid var(--red)' }}
    >
      <div className="max-w-[1200px] mx-auto py-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div
            className="font-mono text-[0.6rem] tracking-[3px] uppercase"
            style={{ color: 'var(--red-text)' }}
          >
            {label}
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[0.6rem] font-black tracking-[2px] uppercase py-[6px] px-4 border cursor-pointer transition-all duration-200"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-dim)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--red)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--red-text)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
            }}
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Tool content */}
        {ToolComponent && <ToolComponent />}
      </div>
    </div>
  );
}

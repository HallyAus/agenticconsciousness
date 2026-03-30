'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import ToolGate from '@/components/tools/ToolGate';

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
  meeting: 'TOOL 06 / MEETING NOTES \u2192 ACTIONS',
  jobad: 'TOOL 07 / JOB AD WRITER',
  contract: 'TOOL 08 / CONTRACT REVIEWER',
};

interface ToolExpanderProps {
  toolId: string;
  onClose: () => void;
}

export default function ToolExpander({ toolId, onClose }: ToolExpanderProps) {
  const ToolComponent = toolComponents[toolId];
  const label = TOOL_LABELS[toolId] ?? toolId.toUpperCase();

  if (!ToolComponent) return null;

  return (
    <div
      className="border-2 border-ac-red mx-10 max-md:mx-5 mb-[2px]"
      style={{
        animation: 'expandIn 0.2s ease-out forwards',
        transformOrigin: 'top',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b-2 border-ac-red">
        <div className="font-mono text-[0.75rem] tracking-[3px] uppercase text-ac-red font-black">
          {label}
        </div>
        <button
          onClick={onClose}
          className="font-mono text-[0.85rem] max-sm:text-xs font-black tracking-[2px] uppercase py-[6px] px-4 border-2 border-border-subtle text-text-dim bg-transparent cursor-pointer transition-all duration-200 hover:border-ac-red hover:text-ac-red"
        >
          &#x2715; CLOSE
        </button>
      </div>

      {/* Tool content */}
      <div className="max-w-[1200px] mx-auto">
        <ToolGate toolId={toolId}>
          <ToolComponent />
        </ToolGate>
      </div>

    </div>
  );
}

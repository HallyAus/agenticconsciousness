'use client';

import ScrollReveal from '@/components/ScrollReveal';

interface SampleRow {
  key: string;
  value: string;
}

interface ToolHeroSectionProps {
  toolId: string;
  number: string;
  name: string;
  headline: string;
  description: string;
  sampleOutput: SampleRow[];
  stats: string;
  isExpanded: boolean;
  expandedTool: string | null;
  onExpand: (toolId: string) => void;
}

export default function ToolHeroSection({
  toolId,
  number,
  name,
  headline,
  description,
  sampleOutput,
  stats,
  isExpanded,
  expandedTool,
  onExpand,
}: ToolHeroSectionProps) {
  const isDimmed = expandedTool !== null && !isExpanded;

  return (
    <section
      className={`transition-opacity duration-200 ${isDimmed ? 'opacity-25' : 'opacity-100'}`}
      style={{ background: 'var(--bg-page)' }}
    >
      <ScrollReveal>
        <div className="px-10 max-md:px-5 py-10 max-sm:py-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex gap-10 max-md:flex-col max-md:gap-6">
              {/* Left column */}
              <div className="w-1/2 max-md:w-full flex flex-col gap-4">
                {/* Tool label */}
                <div className="font-mono text-[9px] tracking-[3px] uppercase text-ac-red">
                  TOOL {number} / {name.toUpperCase()}
                </div>

                {/* Headline */}
                <h3 className="text-[16px] font-black tracking-snug leading-tight text-text-primary">
                  {headline}
                </h3>

                {/* Description */}
                <p className="text-[11px] font-light leading-[1.7] text-text-dim max-w-[400px]">
                  {description}
                </p>

                {/* CTA button */}
                <button
                  onClick={() => onExpand(toolId)}
                  className="self-start font-display text-[0.7rem] font-black tracking-[2px] uppercase py-3 px-6 bg-ac-red text-white border-none cursor-pointer transition-all duration-200 hover:bg-white hover:text-[#0a0a0a]"
                >
                  {isExpanded ? 'Close \u2715' : 'Try it free \u2192'}
                </button>

                {/* Usage stat */}
                {stats && (
                  <div className="font-mono text-[9px] tracking-[2px] uppercase text-text-ghost">
                    {stats}
                  </div>
                )}
              </div>

              {/* Right column — sample output */}
              <div className="w-1/2 max-md:w-full">
                <div className="font-mono text-[9px] tracking-[2px] uppercase text-text-ghost mb-3">
                  SAMPLE OUTPUT
                </div>
                <div className="border-2 p-5" style={{ borderColor: 'rgba(255, 61, 0, 0.15)', background: 'rgba(255, 61, 0, 0.05)' }}>
                  <div className="flex flex-col gap-[10px]">
                    {sampleOutput.map((row) => (
                      <div key={row.key} className="flex justify-between items-baseline gap-4">
                        <span className="font-mono text-[9px] tracking-[1px] uppercase text-text-dim flex-shrink-0">
                          {row.key}
                        </span>
                        <span className="text-[0.82rem] font-light text-text-primary text-right">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

'use client';

interface Tool {
  id: string;
  num: string;
  title: string;
  desc: string;
  category: string;
  badge: string | null;
}

const TOOLS: Tool[] = [
  { id: 'invoice', num: '01', title: 'Invoice Scanner', desc: 'Paste or upload an invoice. Get every field extracted and classified.', category: 'FINANCE', badge: 'POPULAR' },
  { id: 'quote', num: '02', title: 'Quote Generator', desc: 'Describe the job. Get a professional quote with line items and GST.', category: 'SALES', badge: 'POPULAR' },
  { id: 'competitor', num: '03', title: 'Competitor Intel', desc: 'Name a competitor. Get positioning, strengths, weaknesses, opportunities.', category: 'STRATEGY', badge: null },
  { id: 'email', num: '04', title: 'Email Drafter', desc: 'Describe what you need to say. Get a polished email ready to send.', category: 'WRITING', badge: 'NEW' },
  { id: 'summarise', num: '05', title: 'Document Summariser', desc: 'Paste any document. Get the key points in seconds.', category: 'DATA', badge: 'NEW' },
  { id: 'meeting', num: '06', title: 'Meeting Notes → Actions', desc: 'Paste messy meeting notes. Get structured actions with owners and deadlines.', category: 'DATA', badge: 'NEW' },
  { id: 'jobad', num: '07', title: 'Job Ad Writer', desc: 'Describe the role. Get a polished, bias-checked job listing.', category: 'WRITING', badge: 'NEW' },
  { id: 'contract', num: '08', title: 'Contract Reviewer', desc: 'Paste a contract clause. Get plain-English risks and red flags.', category: 'FINANCE', badge: 'NEW' },
];

interface ToolGridProps {
  onSelectTool: (toolId: string | null) => void;
  selectedTool: string | null;
  activeCategory: string;
}

export default function ToolGrid({ onSelectTool, selectedTool, activeCategory }: ToolGridProps) {
  const filtered = activeCategory === 'ALL' ? TOOLS : TOOLS.filter(t => t.category === activeCategory);

  function handleClick(toolId: string) {
    onSelectTool(selectedTool === toolId ? null : toolId);
  }

  return (
    <div
      className="grid grid-cols-4 gap-[2px] max-[900px]:grid-cols-2 max-[500px]:grid-cols-1"
      style={{ background: 'var(--bg-gap)' }}
    >
      {filtered.map((tool) => {
        const isSelected = selectedTool === tool.id;
        return (
          <div
            key={tool.id}
            onClick={() => handleClick(tool.id)}
            className="relative min-h-[160px] p-5 cursor-pointer transition-all duration-200"
            style={{
              background: isSelected ? 'var(--bg-card)' : 'var(--bg-page)',
              borderTop: `3px solid ${isSelected ? 'var(--red)' : 'transparent'}`,
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card)';
                (e.currentTarget as HTMLDivElement).style.borderTopColor = 'rgba(255,61,0,0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-page)';
                (e.currentTarget as HTMLDivElement).style.borderTopColor = 'transparent';
              }
            }}
          >
            {/* Ghost number */}
            <div
              className="font-black text-[2.5rem] leading-none mb-2 select-none"
              style={{ color: 'var(--ghost-number)' }}
            >
              {tool.num}
            </div>

            {/* Title */}
            <div className="font-black text-[0.85rem] tracking-tight text-text-primary mb-1 leading-snug">
              {tool.title}
            </div>

            {/* Description */}
            <div className="text-text-dim text-[0.75rem] font-light leading-[1.5] mb-3">
              {tool.desc}
            </div>

            {/* Category pill */}
            <div
              className="inline-block font-mono text-[0.5rem] tracking-[2px] uppercase px-2 py-[3px] border"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-dim)' }}
            >
              {tool.category}
            </div>

            {/* Badge */}
            {tool.badge && (
              <div
                className="absolute top-2 right-2 font-mono text-[0.5rem] font-black tracking-[2px] uppercase px-2 py-[3px]"
                style={
                  tool.badge === 'POPULAR'
                    ? { background: 'var(--red)', color: '#fff' }
                    : { background: 'rgba(57,255,20,0.15)', color: 'var(--status-green)' }
                }
              >
                {tool.badge}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

'use client';

interface AiLoadingProps {
  text?: string;
}

export default function AiLoading({ text = 'Processing...' }: AiLoadingProps) {
  return (
    <div className="flex items-center gap-1 text-text-dim text-[0.9rem] font-light">
      <span>{text}</span>
      <span className="ai-cursor" />
    </div>
  );
}

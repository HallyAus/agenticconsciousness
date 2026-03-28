'use client';

import { useState } from 'react';

interface CopyButtonProps {
  text: string;
  label?: string;
}

export default function CopyButton({ text, label = 'COPY' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`font-mono text-[0.65rem] max-sm:text-xs tracking-[2px] uppercase py-2 px-4 transition-all duration-200 cursor-pointer border bg-transparent focus:ring-2 focus:ring-ac-red focus:outline-none ${
        copied
          ? 'border-[var(--status-green)] text-[var(--status-green)]'
          : 'border-ac-red text-ac-red hover:bg-ac-red hover:text-white'
      }`}
    >
      {copied ? 'COPIED ✓' : label}
    </button>
  );
}

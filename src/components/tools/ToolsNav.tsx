'use client';

import { useEffect, useState } from 'react';

const tabs = [
  { id: 'invoice-section', label: '01 INVOICE' },
  { id: 'quote-section', label: '02 QUOTE' },
  { id: 'competitor-section', label: '03 COMPETITOR' },
];

export default function ToolsNav() {
  const [active, setActive] = useState('invoice-section');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    tabs.forEach((tab) => {
      const el = document.getElementById(tab.id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(tab.id);
        },
        { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div
      className="sticky top-[60px] z-[100] px-6 flex gap-0 backdrop-blur-md border-b"
      style={{ background: 'var(--bg-nav)', borderColor: 'var(--border-subtle)' }}
    >
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={`#${tab.id}`}
          className={`font-display text-[0.7rem] font-bold tracking-[2px] uppercase py-3 px-4 no-underline transition-all duration-200 border-b-2 ${
            active === tab.id
              ? 'border-b-[var(--red)]'
              : 'border-b-transparent'
          }`}
          style={{ color: active === tab.id ? 'var(--red-text)' : 'var(--text-dim)' }}
        >
          {tab.label}
        </a>
      ))}
    </div>
  );
}

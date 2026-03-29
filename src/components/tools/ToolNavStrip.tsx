'use client';

import { useEffect, useRef, useState } from 'react';

interface ToolNavItem {
  id: string;
  number: string;
  name: string;
}

interface ToolNavStripProps {
  tools: ToolNavItem[];
  activeSection: string;
  onSectionChange: (id: string) => void;
}

export default function ToolNavStrip({ tools, activeSection, onSectionChange }: ToolNavStripProps) {
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Sticky detection
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Scroll tracking with IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    tools.forEach((tool) => {
      const el = document.getElementById(`tool-section-${tool.id}`);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            onSectionChange(tool.id);
          }
        },
        { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [tools, onSectionChange]);

  function scrollToSection(toolId: string) {
    const el = document.getElementById(`tool-section-${toolId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <>
      {/* Sentinel element for sticky detection */}
      <div ref={sentinelRef} className="h-0" />

      <nav
        className={`${isSticky ? 'fixed top-0 left-0 right-0 z-40' : 'relative'} bg-[#0a0a0a] border-y-2 border-border-subtle`}
      >
        <div className="max-w-[1200px] mx-auto px-10 max-md:px-5 max-sm:px-4">
          <div className="flex overflow-x-auto scrollbar-hide">
            {tools.map((tool) => {
              const isActive = activeSection === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => scrollToSection(tool.id)}
                  className={`flex-shrink-0 py-3 px-4 max-sm:px-3 cursor-pointer bg-transparent border-none transition-all duration-200 ${
                    isActive ? 'border-t-[3px] border-t-ac-red' : 'border-t-[3px] border-t-transparent'
                  }`}
                >
                  <div className={`font-mono text-[9px] max-sm:text-[0.75rem] tracking-[2px] uppercase whitespace-nowrap ${
                    isActive ? 'text-ac-red' : 'text-text-dim hover:text-text-primary'
                  } transition-colors duration-200`}>
                    <span className="font-black">{tool.number}</span>
                    <span className="ml-2">{tool.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Spacer when sticky to prevent content jump */}
      {isSticky && <div className="h-[52px]" />}
    </>
  );
}

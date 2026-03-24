'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface GlitchTitleProps {
  children: ReactNode;
  className?: string;
}

export default function GlitchTitle({ children, className = '' }: GlitchTitleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? undefined : 0,
        animation: visible ? 'glitchReveal 0.6s ease-out forwards' : 'none',
      }}
    >
      {children}
    </div>
  );
}

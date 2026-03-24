'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: string;
  className?: string;
  style?: React.CSSProperties;
}

function parseValue(val: string): { prefix: string; number: number; suffix: string; decimals: number } {
  const match = val.match(/^([+\-$]*)([\d.]+)(.*)$/);
  if (!match) return { prefix: '', number: 0, suffix: val, decimals: 0 };

  const prefix = match[1];
  const numStr = match[2];
  const suffix = match[3];
  const number = parseFloat(numStr);
  const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0;

  return { prefix, number, suffix, decimals };
}

export default function AnimatedCounter({ value, className = '', style }: AnimatedCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [displayValue, setDisplayValue] = useState(value);
  const animated = useRef(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const { prefix, number, suffix, decimals } = parseValue(value);
          const duration = 1200;
          const startTime = performance.now();

          function tick(now: number) {
            const elapsed = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - elapsed, 3); // Cubic ease-out
            const current = number * eased;
            const formatted = decimals > 0
              ? current.toFixed(decimals)
              : Math.round(current).toString();
            setDisplayValue(prefix + formatted + suffix);
            if (elapsed < 1) requestAnimationFrame(tick);
            else setDisplayValue(value); // Ensure exact final value
          }

          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className={className} style={style}>
      {displayValue}
    </div>
  );
}

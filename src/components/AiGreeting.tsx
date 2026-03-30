'use client';

import { useEffect, useState } from 'react';

const STATUS_ITEMS = [
  { label: 'AI Online', delay: 300 },
  { label: '8 Tools Active', delay: 700 },
  { label: 'Models Loaded', delay: 1100 },
];

const GREETINGS = [
  'System initialised. Ready to automate your business.',
  'All systems operational. What should we build?',
  'AI ready. Your competitors are already automating.',
  'Online. Eight tools running, zero downtime.',
  'Loaded. Let us show you what AI actually does.',
  'Systems green. Time to eliminate busywork.',
  'Initialised. We build AI that runs while you sleep.',
  'Ready. From strategy to deployment — fully autonomous.',
];

export default function AiGreeting() {
  const [visibleStatuses, setVisibleStatuses] = useState<number[]>([]);
  const [scanComplete, setScanComplete] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Boot sequence: show status items one by one
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setVisibleStatuses([0, 1, 2]);
      setScanComplete(true);
      const g = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      setGreeting(g);
      setDisplayedText(g);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    STATUS_ITEMS.forEach((item, i) => {
      timers.push(setTimeout(() => {
        setVisibleStatuses(prev => [...prev, i]);
      }, item.delay));
    });

    // Scan line after all statuses
    timers.push(setTimeout(() => {
      setScanComplete(true);
    }, 1500));

    // Pick greeting and start typing
    timers.push(setTimeout(() => {
      const g = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      setGreeting(g);
    }, 1800));

    return () => timers.forEach(clearTimeout);
  }, []);

  // Typewriter for greeting
  useEffect(() => {
    if (!greeting) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayedText(greeting);
      return;
    }

    let index = 0;
    setDisplayedText('');
    setIsTyping(true);

    const interval = setInterval(() => {
      if (index < greeting.length) {
        setDisplayedText(greeting.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [greeting]);

  return (
    <div className="min-h-[4rem]">
      {/* Status indicators */}
      <div className="flex gap-3 justify-center mb-3">
        {STATUS_ITEMS.map((item, i) => (
          <span
            key={item.label}
            className={`font-mono text-[0.85rem] max-sm:text-xs tracking-[2px] uppercase transition-all duration-200 ${
              visibleStatuses.includes(i)
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-1'
            }`}
            style={{ color: 'var(--text-ghost)' }}
          >
            <span
              className="inline-block w-[5px] h-[5px] mr-[5px] align-middle"
              style={{
                background: visibleStatuses.includes(i) ? '#22c55e' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.3s',
              }}
            />
            {item.label}
          </span>
        ))}
      </div>

      {/* Scan line */}
      {scanComplete && (
        <div
          className="h-[1px] max-w-[300px] mx-auto mb-3"
          style={{
            background: 'linear-gradient(90deg, transparent, #ff3d00, transparent)',
            animation: 'scanPulse 2s ease-in-out',
          }}
        />
      )}

      {/* Greeting text */}
      <div className="font-mono text-[0.85rem] text-text-dim tracking-[1px]">
        {displayedText}
        {isTyping && <span className="ai-cursor" />}
      </div>
    </div>
  );
}

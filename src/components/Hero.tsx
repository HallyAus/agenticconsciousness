'use client';

import { useState, useLayoutEffect } from 'react';
import ScrollReveal from '@/components/ScrollReveal';
import AiGreeting from '@/components/AiGreeting';
import AnimatedCounter from '@/components/AnimatedCounter';
import { getPersonalisedContent, DEFAULT, type PersonalisedContent } from '@/lib/personalisation';

const BASE_COUNTERS = [
  { value: '21+', label: 'Years' },
  { value: '8', label: 'Free tools' },
  { value: '100%', label: 'AI-powered' },
  { value: 'AU', label: 'Nationwide' },
];

export default function Hero() {
  const [content, setContent] = useState<PersonalisedContent>(DEFAULT);

  useLayoutEffect(() => {
    const personalised = getPersonalisedContent();
    setContent(personalised);

    console.log(JSON.stringify({
      event: 'personalisation',
      type: personalised === DEFAULT ? 'default' : 'personalised',
      variant: personalised.headline2,
      timestamp: new Date().toISOString(),
    }));
  }, []);

  const counters = content.showLocation
    ? [...BASE_COUNTERS, { value: content.showLocation, label: 'Serving' }]
    : BASE_COUNTERS;

  return (
    <section className="min-h-screen flex flex-col justify-center items-center pt-32 pb-16 px-10 relative max-md:px-5 max-md:pt-28 max-md:pb-12 text-center">

      <ScrollReveal>
        <h1 className="font-display font-black leading-[0.9] tracking-brutal mb-[0.35em]">
          <span className="block text-[clamp(3rem,8vw,6rem)] text-text-primary">{content.headline1}</span>
          <span className="block text-[clamp(3rem,8vw,6rem)] text-ac-red">{content.headline2}</span>
        </h1>
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
        <div className="font-mono text-[0.65rem] text-text-dim tracking-[3px] uppercase mb-3">
          AI Strategy · Implementation · Automation
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="mb-6">
          <AiGreeting />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.15}>
        <a
          href="#contact"
          className="inline-block font-display text-[0.95rem] font-black tracking-[2px] uppercase py-[1.1rem] px-10 no-underline transition-all duration-200 bg-ac-red text-white hover:bg-white hover:text-ac-black mb-2"
        >
          Free consultation →
        </a>
        <div className="font-mono text-[0.55rem] text-text-dim tracking-[2px] uppercase mb-8">
          No obligation · 30 minute call · Australia-wide
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.2}>
        <div className="flex gap-[2px] w-full max-w-[500px]">
          {counters.map((c, i) => (
            <div
              key={c.label}
              className={`flex-1 bg-white/[0.02] border border-white/[0.06] py-3 px-2 text-center ${
                i === counters.length - 1 ? 'border-t-2 border-t-ac-red' : ''
              }`}
            >
              <AnimatedCounter
                value={c.value}
                className="text-[1.1rem] font-black text-ac-red tracking-tight leading-none"
              />
              <div className="font-mono text-[0.55rem] text-text-dim tracking-[2px] uppercase mt-1">
                {c.label}
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}

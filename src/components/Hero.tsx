'use client';

import { useState, useLayoutEffect } from 'react';
import ScrollReveal from '@/components/ScrollReveal';
import AiGreeting from '@/components/AiGreeting';
import AnimatedCounter from '@/components/AnimatedCounter';
import { getPersonalisedContent, DEFAULT, type PersonalisedContent } from '@/lib/personalisation';

const BASE_COUNTERS = [
  { value: '21+', label: 'Years' },
  { value: '8', label: 'Live products' },
  { value: '48h', label: 'Proposal SLA' },
  { value: '8', label: 'Free tools' },
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
        <div className="font-mono text-[0.75rem] max-sm:text-[0.65rem] tracking-[4px] uppercase text-text-dim mb-5">
          Agentic Consciousness &middot; Australia
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.03}>
        <h1 className="font-display font-black leading-[0.9] tracking-brutal mb-7">
          <span className="block text-[clamp(2.5rem,7vw,5rem)] text-text-primary">{content.headline1}</span>
          <span className="block text-[clamp(2.5rem,7vw,5rem)] text-ac-red">{content.headline2}</span>
        </h1>
      </ScrollReveal>

      <ScrollReveal delay={0.08}>
        <p className="text-text-dim text-[clamp(0.95rem,1.4vw,1.1rem)] font-light leading-[1.7] max-w-[620px] mx-auto mb-8">
          {content.description}
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="mb-6">
          <AiGreeting />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.15}>
        <a
          href="/#contact"
          className="inline-block font-display text-[0.95rem] font-black tracking-[2px] uppercase py-[1.1rem] px-10 no-underline transition-colors duration-200 bg-ac-red text-white hover:bg-white hover:text-[#0a0a0a] mb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ac-red"
        >
          Book a 30-min discovery call &rarr;
        </a>
        <div className="font-mono text-[0.8rem] max-sm:text-xs text-text-dim tracking-[2px] uppercase mb-10">
          Free &middot; No obligation &middot; 30 minutes &middot; Australia-wide
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.2}>
        <div className="flex gap-[2px] w-full max-w-[640px] max-sm:max-w-full">
          {counters.map((c, i) => (
            <div
              key={c.label}
              className={`flex-1 bg-ac-card border border-border-subtle py-5 px-4 text-center ${
                i === counters.length - 1 ? 'border-t-2 border-t-ac-red' : ''
              }`}
            >
              <AnimatedCounter
                value={c.value}
                className="text-[1.8rem] font-black text-ac-red tracking-tight leading-none"
              />
              <div className="font-mono text-[0.8rem] max-sm:text-xs text-text-dim tracking-[2px] uppercase mt-2">
                {c.label}
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}

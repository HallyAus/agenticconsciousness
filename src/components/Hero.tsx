import ScrollReveal from '@/components/ScrollReveal';
import AiGreeting from '@/components/AiGreeting';

const tags = [
  { label: 'AI', primary: true },
  { label: 'Consulting', primary: false },
  { label: 'Automation', primary: false },
  { label: 'Strategy', primary: false },
];

const counters = [
  { value: '21+', label: 'Years experience' },
  { value: '3', label: 'Service pillars' },
  { value: '100%', label: 'AI-powered' },
  { value: 'AU-wide', label: 'National coverage' },
];

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col justify-center pt-32 pb-16 px-10 relative max-md:px-5 max-md:pt-28 max-md:pb-12">
      <div className="absolute top-[60px] right-0 w-[40%] h-[70%] bg-gradient-to-b from-ac-red-glow to-transparent pointer-events-none" />

      <ScrollReveal>
        <div className="flex gap-2 mb-8 flex-wrap">
          {tags.map((tag) => (
            <span
              key={tag.label}
              className={`text-[0.7rem] font-black tracking-[2.5px] uppercase py-[0.35rem] px-[0.9rem] ${
                tag.primary
                  ? 'bg-ac-red text-white'
                  : 'bg-[var(--tag-ghost-bg)] text-text-dim'
              }`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
        <h1 className="font-display font-black leading-[0.92] tracking-brutal mb-8">
          <span className="block text-[clamp(3.5rem,9vw,7rem)] text-text-primary">AGENTIC</span>
          <span className="block text-[clamp(3.5rem,9vw,7rem)] text-ac-red">CONSCIOUSNESS</span>
        </h1>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="mb-10">
          <AiGreeting />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.15}>
        <div className="flex gap-4 max-sm:flex-col">
          <a
            href="#contact"
            className="inline-block font-display text-[0.75rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 bg-ac-red text-white hover:bg-white hover:text-ac-black"
          >
            Free consultation →
          </a>
          <a
            href="#cases"
            className="inline-block font-display text-[0.75rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 bg-transparent border-2 border-ac-red text-ac-red hover:bg-ac-red hover:text-white"
          >
            See results
          </a>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.2}>
        <div className="flex gap-16 mt-20 pt-12 border-t border-border-subtle max-md:gap-8 max-md:flex-wrap">
          {counters.map((c) => (
            <div key={c.label}>
              <div className="text-[2.5rem] font-black text-ac-red tracking-tight leading-none">
                {c.value}
              </div>
              <div className="font-mono text-[0.65rem] text-text-dim tracking-[2px] uppercase mt-[0.4rem]">
                {c.label}
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}

import ScrollReveal from '@/components/ScrollReveal';
import { CASE_STUDIES } from '@/lib/constants';
import AnimatedCounter from '@/components/AnimatedCounter';
import GlitchTitle from '@/components/GlitchTitle';

export default function CaseStudies() {
  return (
    <section id="cases" aria-label="Case studies" className="py-28 px-10 max-md:px-5 max-sm:py-20">
      <ScrollReveal>
        <div className="max-w-[1200px] mx-auto">
          <div className="flex justify-between items-end mb-14 gap-8 flex-wrap">
            <div>
              <div className="font-mono text-[0.7rem] tracking-[3px] uppercase text-ac-red mb-3">
                003 / RESULTS
              </div>
              <GlitchTitle>
                <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none">
                  Proof of work.
                </h2>
              </GlitchTitle>
            </div>
            <div className="text-[0.95rem] text-text-dim max-w-[400px] font-light leading-[1.7]">
              Real outcomes. Names changed to protect the competitive advantage we gave them.
            </div>
          </div>

          <div className="flex flex-col gap-[2px]">
            {CASE_STUDIES.map((cs) => (
              <div
                key={cs.title}
                className="grid grid-cols-[200px_1fr_auto] bg-ac-card transition-colors duration-300 hover:bg-ac-card-hover items-stretch max-[900px]:grid-cols-1"
              >
                <div className="flex flex-col items-center justify-center p-8 border-r-2 border-ac-red font-mono text-[0.7rem] tracking-[3px] uppercase text-ac-red text-center max-[900px]:border-r-0 max-[900px]:border-b-2 max-[900px]:p-4">
                  <span>{cs.industry}</span>
                  <span className="font-mono text-[0.6rem] tracking-[2px] uppercase text-white/20 mt-1">
                    {cs.timeline}
                  </span>
                </div>
                <div className="p-8">
                  <h3 className="text-[1.1rem] font-black text-text-primary tracking-[-0.3px] mb-2">
                    {cs.title}
                  </h3>
                  <p className="text-[0.85rem] text-text-dim font-light leading-[1.6] max-w-[500px]">
                    {cs.desc}
                  </p>
                  <div className="grid grid-cols-2 gap-[2px] mt-4 max-w-[500px]">
                    <div className="border border-white/10 p-3">
                      <div className="font-mono text-[0.6rem] tracking-[2px] uppercase text-white/30 mb-1">
                        BEFORE
                      </div>
                      <div className="text-[0.8rem] text-text-dim font-light leading-[1.5]">
                        {cs.before}
                      </div>
                    </div>
                    <div className="border border-ac-red/30 bg-ac-red/[0.04] p-3">
                      <div className="font-mono text-[0.6rem] tracking-[2px] uppercase text-ac-red mb-1">
                        AFTER
                      </div>
                      <div className="text-[0.8rem] text-text-primary font-light leading-[1.5]">
                        {cs.after}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-4 py-8 px-10 border-l border-border-subtle max-[900px]:flex-row max-[900px]:border-l-0 max-[900px]:border-t max-[900px]:border-border-subtle">
                  {cs.metrics.map((m) => (
                    <div key={m.label}>
                      <AnimatedCounter
                        value={m.value}
                        className="text-[1.8rem] font-black text-text-primary tracking-[-1px] leading-none"
                      />
                      <div className="font-mono text-[0.65rem] text-text-dim tracking-[2px] uppercase">
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

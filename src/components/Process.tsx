import ScrollReveal from '@/components/ScrollReveal';
import { PROCESS_STEPS } from '@/lib/constants';

export default function Process() {
  return (
    <section id="process" className="py-28 px-10 max-md:px-5 max-sm:py-20">
      <ScrollReveal>
        <div className="max-w-[1200px] mx-auto">
          <div className="flex justify-between items-end mb-14 gap-8 flex-wrap">
            <div>
              <div className="font-mono text-[0.6rem] tracking-[3px] uppercase text-ac-red mb-3">
                002 / METHOD
              </div>
              <div className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none">
                How we work.
              </div>
            </div>
            <div className="text-[0.95rem] text-text-dim max-w-[400px] font-light leading-[1.7]">
              A proven framework. Zero to autonomous in four phases.
            </div>
          </div>

          <div className="grid grid-cols-4 gap-[2px] bg-border-subtle max-[900px]:grid-cols-2 max-sm:grid-cols-1">
            {PROCESS_STEPS.map((step) => (
              <div
                key={step.phase}
                className="group bg-ac-card py-8 px-6 relative transition-colors duration-300 hover:bg-ac-card-hover"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-ac-red scale-x-0 origin-left transition-transform duration-[400ms] group-hover:scale-x-100" />
                <div className="font-mono text-[0.6rem] text-ac-red tracking-[3px] mb-4">
                  {step.phase}
                </div>
                <h3 className="text-[1rem] font-black text-white tracking-[-0.3px] mb-[0.6rem]">
                  {step.title}
                </h3>
                <p className="text-[0.8rem] text-text-dim leading-[1.6] font-light">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

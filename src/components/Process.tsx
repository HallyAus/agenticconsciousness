import ScrollReveal from '@/components/ScrollReveal';
import { PROCESS_STEPS } from '@/lib/constants';
import GlitchTitle from '@/components/GlitchTitle';

export default function Process() {
  return (
    <section id="process" aria-label="Our methodology" className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20">
      <ScrollReveal>
        <div className="max-w-[1200px] mx-auto">
          <div className="flex justify-between items-end mb-14 gap-8 flex-wrap">
            <div>
              <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase text-ac-red mb-3">
                002 / METHOD
              </div>
              <GlitchTitle>
                <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none">
                  How we work.
                </h2>
              </GlitchTitle>
            </div>
            <div className="text-[0.95rem] text-text-dim max-w-[400px] font-light leading-[1.7]">
              A proven framework. Zero to autonomous in four phases.
            </div>
          </div>

          {/* Desktop timeline (>= 768px) */}
          <div className="hidden md:block relative">
            {/* Connector line */}
            <div className="absolute top-[27px] left-[calc(12.5%)] right-[calc(12.5%)] h-[2px] z-0"
              style={{
                background: 'linear-gradient(90deg, #ff3d00 0%, #ff3d00 60%, rgba(255, 61, 0, 0.15) 100%)',
              }}
            />

            <div className="grid grid-cols-4 gap-[2px]">
              {PROCESS_STEPS.map((step, i) => (
                <div key={step.phase} className="flex flex-col items-center text-center relative">
                  {/* Node */}
                  <div className="w-[54px] h-[54px] border-2 border-ac-red bg-[#0a0a0a] flex items-center justify-center relative z-10 mb-5">
                    <span className="font-mono text-[0.85rem] text-ac-red font-bold tracking-wider">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Time estimate */}
                  <div className="font-mono text-[0.8rem] text-ac-red tracking-wide mb-1">
                    {step.time}
                  </div>
                  <div className="font-mono text-[0.8rem] max-sm:text-xs text-text-dim tracking-[2px] uppercase mb-4">
                    {step.subtitle}
                  </div>

                  {/* Title */}
                  <h3 className="text-[1.1rem] font-black text-text-primary tracking-[-0.3px] mb-2">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[0.8rem] text-text-dim leading-[1.6] font-light max-w-[220px]">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile timeline (< 768px) */}
          <div className="block md:hidden relative pl-10">
            {/* Vertical connector line */}
            <div className="absolute left-[15px] top-0 bottom-0 w-[2px]"
              style={{
                background: 'linear-gradient(180deg, #ff3d00 0%, #ff3d00 60%, rgba(255, 61, 0, 0.15) 100%)',
              }}
            />

            <div className="flex flex-col gap-10 max-sm:gap-6">
              {PROCESS_STEPS.map((step, i) => (
                <div key={step.phase} className="relative">
                  {/* Node */}
                  <div className="absolute -left-10 top-0 w-[32px] h-[32px] border-2 border-ac-red bg-ac-black flex items-center justify-center z-10"
                    style={{ transform: 'translateX(-50%)' }}
                  >
                    <span className="font-mono text-[0.8rem] max-sm:text-xs text-ac-red font-bold">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Content */}
                  <div>
                    <div className="flex items-baseline gap-3 mb-1">
                      <h3 className="text-[1rem] font-black text-text-primary tracking-[-0.3px]">
                        {step.title}
                      </h3>
                      <span className="font-mono text-[0.85rem] text-ac-red">
                        {step.time}
                      </span>
                    </div>
                    <div className="font-mono text-[0.85rem] max-sm:text-xs text-text-dim tracking-[2px] uppercase mb-2">
                      {step.subtitle}
                    </div>
                    <p className="text-[0.8rem] text-text-dim leading-[1.6] font-light">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

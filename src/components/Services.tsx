import ScrollReveal from '@/components/ScrollReveal';
import { SERVICES } from '@/lib/constants';
import GlitchTitle from '@/components/GlitchTitle';

export default function Services() {
  return (
    <section id="services" aria-label="Our services" className="py-28 px-10 max-md:px-5 max-sm:py-20">
      <ScrollReveal>
        <div className="max-w-[1200px] mx-auto">
          <div className="flex justify-between items-end mb-14 gap-8 flex-wrap">
            <div>
              <div className="font-mono text-[0.7rem] tracking-[3px] uppercase text-ac-red mb-3">
                001 / SERVICES
              </div>
              <GlitchTitle>
                <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none">
                  What we build.
                </h2>
              </GlitchTitle>
            </div>
            <div className="text-[0.95rem] text-text-dim max-w-[400px] font-light leading-[1.7]">
              Three pillars. One mission. Get your business running on intelligence, not guesswork.
            </div>
          </div>

          <div className="grid grid-cols-3 gap-[2px] bg-border-subtle max-[900px]:grid-cols-1">
            {SERVICES.map((service, i) => (
              <div
                key={service.num}
                className="bg-ac-card p-8 max-sm:p-6 relative transition-colors duration-300 hover:bg-ac-card-hover flex flex-col text-left"
                style={{
                  borderTop: `3px solid ${
                    i === 0 ? '#ff3d00' : i === 1 ? 'rgba(255,61,0,0.6)' : 'rgba(255,61,0,0.35)'
                  }`,
                }}
              >
                <div className="text-[3.5rem] font-black text-[var(--ghost-number)] leading-none select-none">
                  {service.num}
                </div>
                <h3 className="text-[1.15rem] font-black text-text-primary tracking-snug mt-4">
                  {service.title}
                </h3>
                <p className="text-[0.85rem] text-text-dim leading-[1.7] font-light mt-3 flex-1">
                  {service.desc}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {service.pills.map((pill) => (
                    <span
                      key={pill}
                      className="font-mono text-[0.65rem] tracking-[1px] uppercase text-ac-red border border-border-red py-1 px-3 whitespace-nowrap"
                    >
                      {pill}
                    </span>
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

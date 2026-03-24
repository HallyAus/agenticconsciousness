import ScrollReveal from '@/components/ScrollReveal';
import { SERVICES } from '@/lib/constants';

export default function Services() {
  return (
    <section id="services" className="py-28 px-10 max-md:px-5 max-sm:py-20">
      <ScrollReveal>
        <div className="max-w-[1200px] mx-auto">
          <div className="flex justify-between items-end mb-14 gap-8 flex-wrap">
            <div>
              <div className="font-mono text-[0.6rem] tracking-[3px] uppercase text-ac-red mb-3">
                001 / SERVICES
              </div>
              <div className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none">
                What we build.
              </div>
            </div>
            <div className="text-[0.95rem] text-text-dim max-w-[400px] font-light leading-[1.7]">
              Three pillars. One mission. Get your business running on intelligence, not guesswork.
            </div>
          </div>

          <div className="grid grid-cols-3 gap-[2px] bg-border-subtle max-[900px]:grid-cols-1">
            {SERVICES.map((service, i) => (
              <div
                key={service.num}
                className="bg-ac-card p-10 relative transition-colors duration-300 hover:bg-ac-card-hover"
                style={{
                  borderTop: `3px solid ${
                    i === 0 ? '#ff3d00' : i === 1 ? 'rgba(255,61,0,0.6)' : 'rgba(255,61,0,0.35)'
                  }`,
                }}
              >
                <div className="text-[4rem] font-black text-text-dead leading-none mb-4">
                  {service.num}
                </div>
                <h3 className="text-[1.15rem] font-black text-white tracking-snug mb-3">
                  {service.title}
                </h3>
                <p className="text-[0.85rem] text-text-dim leading-[1.7] font-light">
                  {service.desc}
                </p>
                <div className="mt-6 flex flex-wrap gap-[6px]">
                  {service.pills.map((pill) => (
                    <span
                      key={pill}
                      className="font-mono text-[0.55rem] tracking-[1px] uppercase text-ac-red border border-border-red py-1 px-[0.6rem]"
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

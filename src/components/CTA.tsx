'use client';

import ScrollReveal from '@/components/ScrollReveal';
import { CONTACT_EMAIL } from '@/lib/constants';

export default function CTA() {
  return (
    <section id="contact" className="py-28 px-10 relative overflow-hidden max-md:px-5 max-sm:py-20">
      <ScrollReveal>
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-ac-card border-2 border-ac-red py-20 px-12 text-center relative max-sm:py-12 max-sm:px-6">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20rem] font-black text-text-dead pointer-events-none tracking-[-10px] select-none">
              AC
            </div>
            <div className="relative z-10">
              <div className="font-mono text-[0.6rem] tracking-[3px] uppercase text-ac-red mb-6">
                READY?
              </div>
              <div className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight mb-6">
                Let&apos;s build something <span className="text-ac-red">intelligent.</span>
              </div>
              <p className="text-[1rem] text-text-dim max-w-[480px] mx-auto mb-10 font-light leading-[1.7]">
                Book a free AI introduction session. No sales pitch — just a direct conversation
                about what AI can do for your business right now.
              </p>
              <div className="flex gap-4 justify-center max-sm:flex-col">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-block font-display text-[0.75rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 bg-ac-red text-white hover:bg-white hover:text-ac-black"
                >
                  Book your free intro →
                </a>
                <button
                  className="inline-block font-display text-[0.75rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 transition-all duration-200 bg-transparent border-2 border-ac-red text-ac-red hover:bg-ac-red hover:text-white cursor-pointer"
                  onClick={() => {
                    document.dispatchEvent(new CustomEvent('toggle-chatbot'));
                  }}
                >
                  Ask our AI
                </button>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

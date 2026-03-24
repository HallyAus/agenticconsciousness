import ScrollReveal from '@/components/ScrollReveal';

const blocks = [
  {
    highlight: '21+',
    title: 'Years in the field',
    desc: "Founded by Daniel Hall — two decades of hands-on industry experience across enterprise systems, automation, and technology implementation. This isn't theory. It's applied intelligence.",
  },
  {
    highlight: null,
    title: 'We build what we sell',
    desc: "This entire website is AI-powered — including the chatbot in the corner. We practice what we preach. Every tool, every workflow, every recommendation comes from real-world deployment experience.",
  },
  {
    highlight: null,
    title: 'Australian-based',
    desc: "We work across all industries and business sizes — SMBs, enterprise, tradies, startups. If you have operations, we can make them smarter. Based in Australia, available nationally.",
  },
  {
    highlight: null,
    title: 'AI-native approach',
    desc: "We don't just bolt AI onto your existing processes. We rethink workflows from the ground up with intelligence at the centre. The result: systems that don't just assist — they operate.",
  },
];

export default function About() {
  return (
    <section id="about" className="py-28 px-10 max-md:px-5 max-sm:py-20">
      <ScrollReveal>
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-14">
            <div className="font-mono text-[0.7rem] tracking-[3px] uppercase text-ac-red mb-3">
              004 / ABOUT
            </div>
            <div className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none">
              Who we are.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-[2px] bg-border-subtle max-[900px]:grid-cols-1">
            {blocks.map((block) => (
              <div key={block.title} className="bg-ac-card p-10">
                {block.highlight && (
                  <div className="text-[2rem] font-black text-ac-red tracking-[-1px] mb-1">
                    {block.highlight}
                  </div>
                )}
                <h3 className="text-[1rem] font-black text-white mb-2">{block.title}</h3>
                <p className="text-[0.85rem] text-text-dim leading-[1.7] font-light">
                  {block.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

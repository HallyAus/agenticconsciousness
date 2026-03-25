import Link from 'next/link';

const siteLinks = [
  { label: 'Services', href: '/#services' },
  { label: 'Method', href: '/#process' },
  { label: 'Work', href: '/#cases' },
  { label: 'About', href: '/#about' },
];

const aiLinks = [
  { label: 'Tools', href: '/tools' },
  { label: 'Insights', href: '/blog' },
  { label: 'Audit', href: '/#ai-audit' },
  { label: 'FAQ', href: '/faq' },
];

const legalLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

export default function Footer() {
  return (
    <footer>
      {/* Tier 1 — Logo + Email + CTA */}
      <div className="border-t-2 py-6 px-8 flex justify-between items-center gap-6 flex-wrap border-b max-md:flex-col max-md:items-start" style={{ borderTopColor: 'var(--red)', borderBottomColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-6 flex-wrap">
          <Link href="/" className="font-display font-black text-[1.1rem] text-text-primary tracking-snug no-underline">
            AC<span style={{ color: 'var(--red-text)' }}>_</span>
          </Link>
          <a
            href="mailto:ai@agenticconsciousness.com.au"
            className="font-mono text-[0.75rem] no-underline hover:text-text-primary transition-colors"
            style={{ color: 'var(--red-text)' }}
          >
            ai@agenticconsciousness.com.au
          </a>
        </div>
        <a
          href="mailto:ai@agenticconsciousness.com.au"
          className="inline-block font-display text-[0.7rem] font-black tracking-[2px] uppercase py-[0.55rem] px-[1.2rem] no-underline transition-all duration-200 text-white"
          style={{ background: 'var(--red)' }}
        >
          Book free intro →
        </a>
      </div>

      {/* Tier 1.5 — Brand name */}
      <div className="py-8 px-8 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div
          className="font-display font-black leading-[0.92]"
          style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', letterSpacing: '-2px' }}
        >
          <span className="text-text-primary">AGENTIC</span>
          <br />
          <span className="text-text-primary">CONSCIOUS</span>
          <span style={{ color: 'var(--red-text)' }}>NESS_</span>
        </div>
        <p className="text-text-dim text-[0.85rem] font-light leading-[1.6] mt-3 max-w-[360px]">
          Free consultation. No pitch. Just AI that actually works for your business.
        </p>
      </div>

      {/* Tier 2 — Navigation groups (more padding) */}
      <div className="flex border-b max-md:flex-col" style={{ borderColor: 'var(--border-subtle)' }}>
        {[
          { title: 'SITE', links: siteLinks },
          { title: 'AI', links: aiLinks },
          { title: 'LEGAL', links: legalLinks },
        ].map((group, i, arr) => (
          <div
            key={group.title}
            className={`py-6 px-8 flex-1 ${i < arr.length - 1 ? 'border-r max-md:border-r-0 max-md:border-b' : ''}`}
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="font-display text-[0.65rem] font-black tracking-[3px] mb-3" style={{ color: 'var(--red-ghost)' }}>
              {group.title}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-text-dim no-underline text-[0.75rem] font-bold tracking-[2px] uppercase transition-colors duration-200 hover:text-text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tier 3 — Status bar */}
      <div className="h-12 px-8 flex justify-between items-center border-t-2 max-sm:h-auto max-sm:py-4 max-sm:flex-col max-sm:gap-3" style={{ borderColor: 'var(--red)' }}>
        <div className="flex items-center gap-5 flex-wrap max-sm:justify-center max-sm:gap-3">
          <Link href="/" className="font-display font-black text-[0.8rem] text-text-primary tracking-snug no-underline">
            AC<span style={{ color: 'var(--red-text)' }}>_</span>
          </Link>
          <span className="font-mono text-[0.55rem] text-text-ghost tracking-[2px] uppercase">
            AUSTRALIA
          </span>
        </div>
        <div className="flex items-center gap-5 flex-wrap max-sm:justify-center max-sm:gap-3">
          <span className="font-mono text-[0.55rem] text-text-ghost tracking-[1px]">
            &copy; {new Date().getFullYear()} AGENTIC CONSCIOUSNESS
          </span>
          <div className="flex items-center gap-2">
            <div className="w-[5px] h-[5px] animate-blink" style={{ background: 'var(--status-green)' }} />
            <span className="font-mono text-[0.6rem] tracking-[2px]" style={{ color: 'var(--red-ghost)' }}>
              AI SYSTEMS ONLINE
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

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
      {/* Tier 1 — Brand hero + CTA */}
      <div className="border-t-2 border-[var(--border-red)] py-9 px-6 flex justify-between items-end gap-8 flex-wrap border-b border-[var(--border-subtle)] max-md:flex-col max-md:items-start">
        <div>
          <div
            className="font-display font-black leading-[0.92] tracking-tight"
            style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', letterSpacing: '-2px' }}
          >
            <span className="text-text-primary">AGENTIC</span>
            <br />
            <span className="text-text-primary">CONSCIOUS</span>
            <span className="text-[var(--red-text)]">NESS_</span>
          </div>
        </div>

        <div className="max-w-[260px] max-md:max-w-full">
          <p className="text-text-dim text-[0.85rem] leading-[1.6] font-light mb-4">
            Free consultation. No pitch. Just AI that actually works for your business.
          </p>
          <a
            href="mailto:ai@agenticconsciousness.com.au"
            className="inline-block font-display text-[0.7rem] font-black tracking-[2px] uppercase py-[0.55rem] px-[1.2rem] no-underline transition-all duration-200 bg-[var(--red)] text-white hover:opacity-90"
          >
            Book free intro →
          </a>
        </div>
      </div>

      {/* Tier 2 — Navigation groups */}
      <div className="flex border-b border-[var(--border-subtle)] max-md:flex-col">
        {[
          { title: 'SITE', links: siteLinks },
          { title: 'AI', links: aiLinks },
          { title: 'LEGAL', links: legalLinks },
        ].map((group, i, arr) => (
          <div
            key={group.title}
            className={`py-4 px-6 flex-1 ${i < arr.length - 1 ? 'border-r border-[var(--border-subtle)] max-md:border-r-0 max-md:border-b' : ''}`}
          >
            <div className="font-display text-[0.6rem] font-black tracking-[3px] text-[var(--red-ghost)] mb-2">
              {group.title}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-text-dim no-underline text-[0.7rem] font-bold tracking-[2px] uppercase transition-colors duration-200 hover:text-[var(--red-text)]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tier 3 — Status bar */}
      <div className="h-10 px-6 flex justify-between items-center border-t-2 border-[var(--border-red)] max-sm:h-auto max-sm:py-3 max-sm:flex-col max-sm:gap-2">
        <div className="flex items-center gap-5 max-sm:flex-wrap max-sm:justify-center max-sm:gap-3">
          <span className="font-display font-black text-[0.8rem] text-text-primary tracking-snug">
            AC<span className="text-[var(--red-text)]">_</span>
          </span>
          <a
            href="mailto:ai@agenticconsciousness.com.au"
            className="text-[var(--red-text)] no-underline text-[0.7rem] font-mono hover:text-text-primary transition-colors"
          >
            ai@agenticconsciousness.com.au
          </a>
          <span className="font-mono text-[0.5rem] text-text-ghost tracking-[2px] uppercase">
            AUSTRALIA
          </span>
        </div>

        <div className="flex items-center gap-5 max-sm:flex-wrap max-sm:justify-center max-sm:gap-3">
          <span className="font-mono text-[0.5rem] text-text-ghost tracking-[1px]">
            &copy; {new Date().getFullYear()} AGENTIC CONSCIOUSNESS
          </span>
          <div className="flex items-center gap-2">
            <div
              className="w-[5px] h-[5px] animate-blink"
              style={{ background: 'var(--status-green)' }}
            />
            <span className="font-mono text-[0.55rem] tracking-[2px] text-[var(--red-ghost)]">
              AI SYSTEMS ONLINE
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

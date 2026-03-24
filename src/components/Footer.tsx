import { NAV_LINKS } from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="py-10 px-10 flex justify-between items-center border-t-2 border-ac-red flex-wrap gap-4 max-sm:flex-col max-sm:text-center max-md:px-5">
      <div className="font-black text-[0.9rem] text-white tracking-snug">
        AC<span className="text-ac-red">_</span>
      </div>

      <ul className="flex gap-x-6 gap-y-2 list-none flex-wrap justify-center max-sm:gap-x-4">
        {NAV_LINKS.filter((l) => ['Services', 'Tools', 'Insights', 'FAQ'].includes(l.label)).map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="text-text-dim no-underline text-[0.7rem] font-bold tracking-[2px] uppercase transition-colors duration-200 hover:text-white"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      <div className="font-mono text-[0.65rem] text-text-ghost tracking-[1px]">
        &copy; {new Date().getFullYear()} AGENTIC CONSCIOUSNESS. ALL RIGHTS RESERVED.
      </div>
    </footer>
  );
}

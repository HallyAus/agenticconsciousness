'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { NAV_LINKS } from '@/lib/constants';
import ThemeToggle from '@/components/ThemeToggle';

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) setMenuOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [menuOpen]);

  return (
    <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-[1000] px-10 h-[60px] flex justify-between items-center bg-[var(--bg-nav)] backdrop-blur-[12px] border-b-2 border-ac-red max-md:px-5">
      <Link href="/" className="font-display text-[1.1rem] font-black text-text-primary tracking-snug no-underline">
        AC<span className="text-ac-red">_</span>
      </Link>

      {/* Desktop links */}
      <ul className="flex gap-10 list-none items-center max-md:hidden">
        {NAV_LINKS.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="text-text-dim no-underline text-[0.75rem] font-bold tracking-[2px] uppercase transition-colors duration-200 hover:text-text-primary"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      {/* Desktop CTA */}
      <div className="flex items-center gap-3 max-md:hidden">
        <ThemeToggle />
        <a
          href="#contact"
          className="inline-block bg-ac-red text-white font-display text-[0.7rem] font-black tracking-[2px] uppercase py-[0.55rem] px-[1.2rem] no-underline transition-all duration-200 hover:bg-white hover:text-ac-black"
        >
          Talk to us
        </a>
      </div>

      {/* Mobile hamburger */}
      <button
        className="hidden max-md:block bg-transparent border-none text-ac-red text-2xl cursor-pointer"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menu"
        aria-expanded={menuOpen}
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed top-[60px] left-0 right-0 flex-col bg-[var(--bg-nav)] border-b-2 border-ac-red p-6 gap-4 z-[999] hidden max-md:flex">
          {/* Primary — homepage sections */}
          {NAV_LINKS.filter(l => l.href.startsWith('/#')).map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-text-dim no-underline text-[0.75rem] font-bold tracking-[2px] uppercase transition-colors duration-200 hover:text-text-primary"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}

          {/* Divider */}
          <div className="h-[1px] bg-border-subtle my-2" />

          {/* Secondary — standalone pages */}
          {NAV_LINKS.filter(l => !l.href.startsWith('/#')).map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-text-dim no-underline text-[0.75rem] font-bold tracking-[2px] uppercase transition-colors duration-200 hover:text-text-primary"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="#contact"
              className="inline-block bg-ac-red text-white font-display text-[0.7rem] font-black tracking-[2px] uppercase py-[0.55rem] px-[1.2rem] no-underline transition-all duration-200 hover:bg-white hover:text-ac-black text-center flex-1"
              onClick={() => setMenuOpen(false)}
            >
              Talk to us
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

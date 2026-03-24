'use client';

import { useTheme } from '@/components/ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 flex items-center justify-center transition-all duration-300"
      style={{
        border: '2px solid var(--border-red)',
        background: isDark ? 'transparent' : 'var(--red)',
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="8" y1="1" x2="8" y2="5" stroke={isDark ? 'var(--red)' : '#fff'} strokeWidth="2.5" strokeLinecap="square" />
        <path d="M3.5 4.5a6 6 0 1 0 9 0" stroke={isDark ? 'var(--red)' : '#fff'} strokeWidth="2.5" strokeLinecap="square" fill="none" />
      </svg>
    </button>
  );
}

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ac: {
          red: 'var(--red)',
          'red-text': 'var(--red-text)',
          'red-dim': 'var(--red-dim)',
          'red-faint': 'var(--red-faint)',
          'red-glow': 'var(--red-faint)',
          black: 'var(--bg-page)',
          card: 'var(--bg-card)',
          'card-hover': 'var(--bg-card-hover)',
          block: 'var(--chat-bot-bg)',
        },
        text: {
          primary: 'var(--text-primary)',
          body: 'var(--text-body)',
          dim: 'var(--text-dim)',
          ghost: 'var(--text-ghost)',
          dead: 'var(--text-dead)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          red: 'var(--border-red)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      letterSpacing: {
        brutal: '-3px',
        tight: '-2px',
        snug: '-0.5px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'red-line': 'redLine 1s ease-out forwards',
        blink: 'blink 2s infinite',
        'chat-in': 'chatIn 0.2s ease-out',
        'msg-in': 'msgIn 0.2s ease-out',
        'dot-pulse': 'dotPulse 1.4s infinite ease-in-out',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        redLine: {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        chatIn: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        msgIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        dotPulse: {
          '0%, 80%, 100%': { transform: 'scale(0.5)', opacity: '0.3' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

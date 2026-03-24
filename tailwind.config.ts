import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ac: {
          red: '#ff3d00',
          'red-dim': 'rgba(255, 61, 0, 0.6)',
          'red-faint': 'rgba(255, 61, 0, 0.1)',
          'red-glow': 'rgba(255, 61, 0, 0.08)',
          black: '#0a0a0a',
          card: '#111111',
          'card-hover': '#161616',
          block: '#1a1a1a',
        },
        text: {
          primary: 'rgba(255, 255, 255, 0.88)',
          dim: 'rgba(255, 255, 255, 0.4)',
          ghost: 'rgba(255, 255, 255, 0.15)',
          dead: 'rgba(255, 255, 255, 0.06)',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          red: 'rgba(255, 61, 0, 0.25)',
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

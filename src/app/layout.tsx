import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Space_Mono } from 'next/font/google';
import './globals.css';
import StructuredData from '@/components/StructuredData';
import ThemeProvider from '@/components/ThemeProvider';
import ScrollProgress from '@/components/ScrollProgress';
import ExitIntent from '@/components/ExitIntent';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-display',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://agenticconsciousness.com.au'),
  title: {
    default: 'Agentic Consciousness — AI Consulting Australia',
    template: '%s | Agentic Consciousness',
  },
  description: 'AI strategy, tool implementation, and automation consulting for Australian businesses. We build and deploy AI systems — ChatGPT, Claude, Copilot, custom models. Free consultation.',
  keywords: [
    'AI consulting Australia',
    'AI strategy workshops',
    'AI automation',
    'ChatGPT implementation',
    'Claude AI consulting',
    'AI for business',
    'AI tool deployment',
    'business automation Australia',
    'AI consulting Sydney',
    'AI consulting Brisbane',
    'AI consulting Melbourne',
    'artificial intelligence consulting',
    'AI readiness audit',
    'enterprise AI',
    'SMB AI solutions',
  ],
  authors: [{ name: 'Daniel Hall', url: 'https://agenticconsciousness.com.au' }],
  creator: 'Agentic Consciousness',
  publisher: 'Agentic Consciousness',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: 'https://agenticconsciousness.com.au',
    siteName: 'Agentic Consciousness',
    title: 'Agentic Consciousness — AI Consulting Australia',
    description: "We don't just advise — we build and deploy AI systems that run your business better than you thought possible.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agentic Consciousness — AI Consulting',
    description: 'AI strategy, implementation, and automation for Australian businesses.',
  },
  alternates: {
    canonical: 'https://agenticconsciousness.com.au',
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${beVietnamPro.variable} ${spaceMono.variable}`} data-theme="dark">
      <body>
        <ThemeProvider>
          <ScrollProgress />
          <ExitIntent />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-[10000] focus:bg-ac-red focus:text-white focus:p-4 focus:text-sm focus:font-bold"
          >
            Skip to content
          </a>
          <StructuredData />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

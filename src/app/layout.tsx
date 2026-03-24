import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Space_Mono } from 'next/font/google';
import './globals.css';

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
  title: 'Agentic Consciousness — AI Consulting Australia',
  description:
    'AI strategy, tool implementation, and automation consulting for Australian businesses. We build and deploy AI systems that run your business better than you thought possible.',
  keywords: [
    'AI consulting Australia',
    'AI strategy',
    'AI automation',
    'ChatGPT implementation',
    'Claude AI consulting',
    'AI for business',
  ],
  openGraph: {
    title: 'Agentic Consciousness — AI Consulting Australia',
    description:
      "We don't just advise — we build and deploy AI systems that run your business.",
    type: 'website',
    locale: 'en_AU',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${beVietnamPro.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

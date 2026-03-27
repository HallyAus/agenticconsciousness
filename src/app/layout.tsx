import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Space_Mono } from 'next/font/google';
import './globals.css';
import StructuredData from '@/components/StructuredData';
import ThemeProvider from '@/components/ThemeProvider';
import ScrollProgress from '@/components/ScrollProgress';
import ExitIntent from '@/components/ExitIntent';
import TrackingPixels from '@/components/TrackingPixels';
import Script from 'next/script';

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
  description: 'AI strategy, implementation, and automation consulting for Australian businesses. We build and deploy AI systems that deliver measurable ROI.',
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
  authors: [{ name: 'Daniel', url: 'https://agenticconsciousness.com.au' }],
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
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Agentic Consciousness — AI Consulting Australia' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agentic Consciousness — AI Consulting',
    description: 'AI strategy, implementation, and automation for Australian businesses.',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
      { url: '/apple-icon', type: 'image/png', sizes: '180x180' },
    ],
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
          <Script
            async
            src="https://plausible.io/js/pa-rigUYWvL1M6xYCckO5Lvm.js"
            strategy="afterInteractive"
          />
          <Script id="plausible-init" strategy="afterInteractive">
            {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`}
          </Script>
          <Script
            async
            src={`${process.env.NEXT_PUBLIC_UMAMI_URL}/script.js`}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
          />
          <TrackingPixels />
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

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  // @react-pdf/renderer v4 breaks under Next 15+ App Router bundling
  // (ReactReconciler 0.31 gets double-bundled, throws PDFDocument is not
  // a constructor on Vercel). Externalising it makes renderToBuffer work
  // inside serverless routes. See react-pdf issues #2966, #3074.
  serverExternalPackages: ['@react-pdf/renderer'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  headers: async () => [
    {
      source: '/_next/static/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.googletagmanager.com https://plausible.io https://us-assets.i.posthog.com https://us.i.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: https://www.facebook.com; font-src 'self' data:; connect-src 'self' https://connect.facebook.net https://www.facebook.com https://www.google-analytics.com https://www.googletagmanager.com https://plausible.io https://us.i.posthog.com https://us-assets.i.posthog.com; worker-src 'self' blob:; frame-ancestors 'none'" },
      ],
    },
  ],
};

export default nextConfig;

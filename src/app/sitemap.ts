import { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';
import { TRADES } from '@/data/trades';
import { TRADE_CITIES } from '@/data/trade-cities';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://agenticconsciousness.com.au';
  const posts = getAllPosts();
  const now = new Date().toISOString();

  const staticPages = [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly' as const, priority: 1.0 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/tools`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  const blogPages = posts.map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.publishedAt || now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Landing pages — must match LANDING_PAGES keys in src/app/for/[slug]/page.tsx
  const landingSlugs = [
    'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'gold-coast',
    'manufacturing', 'professional-services', 'trades', 'healthcare', 'retail', 'finance',
  ];
  const landingPages = landingSlugs.map(slug => ({
    url: `${baseUrl}/for/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Trades hub + 30 trades × 8 cities = 271 pages
  const tradesHub = {
    url: `${baseUrl}/trades`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  };

  const tradePages = TRADES.map(t => ({
    url: `${baseUrl}/trades/${t.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const tradeCityPages = TRADES.flatMap(t =>
    TRADE_CITIES.map(c => ({
      url: `${baseUrl}/trades/${t.slug}/${c.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  );

  return [...staticPages, ...blogPages, ...landingPages, tradesHub, ...tradePages, ...tradeCityPages];
}

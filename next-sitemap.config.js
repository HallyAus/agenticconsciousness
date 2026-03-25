/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://agenticconsciousness.com.au',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  exclude: [
    '/payment/success',
    '/payment/*',
    '/unsubscribe',
    '/proposal/*',
    '/api/*',
  ],
  robotsTxtOptions: {
    additionalSitemaps: [],
    policies: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: '/api/' },
      { userAgent: '*', disallow: '/payment/' },
      { userAgent: '*', disallow: '/unsubscribe/' },
      { userAgent: '*', disallow: '/proposal/' },
    ],
  },
  transform: async (config, path) => {
    if (path === '/') {
      return { loc: path, changefreq: 'weekly', priority: 1.0, lastmod: new Date().toISOString() };
    }
    if (path === '/privacy' || path === '/terms') {
      return { loc: path, changefreq: 'monthly', priority: 0.3, lastmod: new Date().toISOString() };
    }
    return { loc: path, changefreq: config.changefreq, priority: config.priority, lastmod: new Date().toISOString() };
  },
};

import { getAllPosts } from '@/lib/blog';

export async function GET() {
  const posts = getAllPosts();
  const siteUrl = 'https://agenticconsciousness.com.au';

  const items = posts
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <description><![CDATA[${post.description}]]></description>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <guid>${siteUrl}/blog/${post.slug}</guid>
      <author>ai@agenticconsciousness.com.au (${post.author})</author>
      ${post.tags.map((t) => `<category>${t}</category>`).join('\n      ')}
    </item>`
    )
    .join('\n');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Agentic Consciousness — AI Insights</title>
    <link>${siteUrl}/blog</link>
    <description>AI strategy, implementation, and automation insights for Australian businesses.</description>
    <language>en-AU</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(feed.trim(), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

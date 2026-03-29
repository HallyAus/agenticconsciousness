import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import EmailCapture from '@/components/EmailCapture';



export const metadata: Metadata = {
  title: 'AI Insights & Implementation Guides',
  description: 'Practical AI insights, automation strategies, and step-by-step implementation guides for Australian businesses. Written by AI, reviewed by experts.',
  alternates: { canonical: 'https://agenticconsciousness.com.au/blog' },
  openGraph: {
    title: 'AI Insights & Guides',
    description: 'Practical AI insights, automation strategies, and step-by-step implementation guides for Australian businesses. Written by AI, reviewed by experts.',
    url: 'https://agenticconsciousness.com.au/blog',
    type: 'website',
    images: [{ url: 'https://agenticconsciousness.com.au/opengraph-image', width: 1200, height: 630 }],
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://agenticconsciousness.com.au',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Insights',
        item: 'https://agenticconsciousness.com.au/blog',
      },
    ],
  };

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'AI Insights & Guides',
    description: 'AI insights, strategies, and implementation guides from Agentic Consciousness.',
    url: 'https://agenticconsciousness.com.au/blog',
    publisher: {
      '@type': 'Organization',
      '@id': 'https://agenticconsciousness.com.au/#organization',
      name: 'Agentic Consciousness',
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://agenticconsciousness.com.au/blog/${post.slug}`,
        name: post.title,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <main className="pt-[60px] min-h-screen">
      <section className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20">
        <div className="max-w-[1000px] mx-auto">
          <div className="font-mono text-[0.75rem] max-sm:text-xs tracking-[3px] uppercase text-ac-red mb-3">
            AI-GENERATED CONTENT
          </div>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none mb-4">
            AI Insights.
          </h1>
          <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] mb-14 max-w-[500px]">
            Articles written by our AI, reviewed by our team. Because we practice what we preach.
          </p>

          {posts.length === 0 ? (
            <p className="text-text-ghost">No posts yet.</p>
          ) : (
            <>
              {/* Featured / Latest Post */}
              {(() => {
                const featured = posts[0];
                const readingTime = Math.max(1, Math.ceil(featured.content.split(/\s+/).length / 200));
                return (
                  <Link
                    href={`/blog/${featured.slug}`}
                    className="block bg-ac-card border-t-[3px] border-ac-red p-8 transition-colors duration-300 hover:bg-ac-card-hover no-underline"
                  >
                    <span className="font-mono text-xs text-ac-red uppercase tracking-widest">
                      LATEST
                    </span>
                    <h2 className="text-2xl font-black text-text-primary tracking-[-0.5px] mt-3 mb-3">
                      {featured.title}
                    </h2>
                    <p className="text-[0.9rem] text-text-dim font-light leading-[1.7] mb-5">
                      {featured.description}
                    </p>
                    <div className="flex items-center gap-6 flex-wrap">
                      <span className="font-display text-[0.75rem] font-bold tracking-[2px] uppercase text-ac-red">
                        Read article →
                      </span>
                      <span className="font-mono text-[0.75rem] max-sm:text-xs text-text-dim tracking-[1px] uppercase">
                        By Daniel
                      </span>
                      <span className="font-mono text-[0.75rem] max-sm:text-xs text-text-dim tracking-[1px] uppercase">
                        {readingTime} min read
                      </span>
                      <span className="font-mono text-[0.75rem] max-sm:text-xs text-text-dim tracking-[1px] uppercase">
                        {new Date(featured.publishedAt).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </Link>
                );
              })()}

              {/* Separator */}
              {posts.length > 1 && (
                <div className="my-8 border-t border-border-subtle" />
              )}

              {/* Remaining Posts */}
              {posts.length > 1 && (
                <div className="flex flex-col gap-[2px]">
                  {posts.slice(1).map((post) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="grid grid-cols-[160px_1fr_auto] bg-ac-card transition-colors duration-300 hover:bg-ac-card-hover items-center no-underline max-md:grid-cols-1"
                    >
                      <div className="p-6 max-md:pb-2">
                        <div className="font-mono text-[0.7rem] max-sm:text-xs text-text-dim tracking-[1px] uppercase mb-2">
                          {new Date(post.publishedAt).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {' · '}By Daniel
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="font-mono text-[0.5rem] tracking-[1px] uppercase text-ac-red border border-border-red py-0.5 px-2"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-6">
                        <h2 className="text-[1rem] font-black text-text-primary tracking-[-0.3px] mb-1">
                          {post.title}
                        </h2>
                        <p className="text-[0.8rem] text-text-dim font-light leading-[1.5]">
                          {post.description}
                        </p>
                      </div>

                      <div className="p-6 max-md:pt-0">
                        <span className="font-display text-[0.8rem] max-sm:text-xs font-bold tracking-[2px] uppercase text-ac-red">
                          READ →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="mt-14">
            <EmailCapture />
          </div>
        </div>
      </section>
    </main>
    </>
  );
}

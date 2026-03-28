import type { Metadata } from 'next';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';
import { getPostBySlug, getAllPosts } from '@/lib/blog';
import { notFound } from 'next/navigation';
import EmailLink from '@/components/EmailLink';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

interface Props {
  params: Promise<{ slug: string }>;
}

/** Cap the page title so the rendered `title | Agentic Consciousness` stays under 60 chars. */
function capTitle(title: string, maxTotal = 60): string {
  const suffix = ' | Agentic Consciousness'; // 25 chars
  const maxField = maxTotal - suffix.length; // 35 chars
  if (title.length <= maxField) return title;
  return title.slice(0, maxField - 1).trimEnd() + '\u2026';
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: 'Post Not Found' };
  return {
    title: capTitle(post.title),
    description: post.description,
    alternates: {
      canonical: `https://agenticconsciousness.com.au/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author],
      images: [{ url: 'https://agenticconsciousness.com.au/opengraph-image', width: 1200, height: 630 }],
    },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const allPosts = getAllPosts();
  const currentTags = new Set(post.tags.map((t) => t.toLowerCase()));
  const relatedPosts = allPosts
    .filter((p) => p.slug !== slug)
    .map((p) => ({
      ...p,
      relevance: p.tags.filter((t) => currentTags.has(t.toLowerCase())).length,
    }))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 3);

  const readingTime = Math.ceil(post.content.split(/\s+/).length / 200);
  const wordCount = post.content.split(/\s+/).length;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `https://agenticconsciousness.com.au/blog/${slug}#article`,
    headline: post.title,
    description: post.description,
    url: `https://agenticconsciousness.com.au/blog/${slug}`,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    wordCount,
    articleSection: post.tags[0] || 'AI',
    keywords: post.tags.join(', '),
    inLanguage: 'en-AU',
    author: {
      '@type': 'Person',
      '@id': 'https://agenticconsciousness.com.au/#founder',
      name: 'Daniel',
      url: 'https://agenticconsciousness.com.au',
      jobTitle: 'Founder & AI Consultant',
      worksFor: {
        '@id': 'https://agenticconsciousness.com.au/#organization',
      },
    },
    publisher: {
      '@type': 'Organization',
      '@id': 'https://agenticconsciousness.com.au/#organization',
      name: 'Agentic Consciousness',
      url: 'https://agenticconsciousness.com.au',
      logo: 'https://agenticconsciousness.com.au/og-image.png',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://agenticconsciousness.com.au/blog/${slug}`,
    },
    image: 'https://agenticconsciousness.com.au/og-image.png',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.prose-brutal h2', '.prose-brutal p:first-of-type'],
    },
  };

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
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `https://agenticconsciousness.com.au/blog/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Nav />
      <main className="pt-[60px] min-h-screen">
        <article className="py-28 px-10 max-md:px-5 max-sm:px-4 max-sm:py-20">
          <div className="max-w-[720px] mx-auto">
            <Link
              href="/blog"
              className="font-display text-[0.7rem] font-bold tracking-[2px] uppercase text-ac-red no-underline hover:text-text-primary transition-colors mb-12 block"
            >
              ← Back to insights
            </Link>

            <h1 className="text-[clamp(1.8rem,4vw,2.5rem)] font-black tracking-tight leading-[1.1] mb-6">
              {post.title}
            </h1>

            <div className="flex items-center gap-4 mb-12 flex-wrap">
              <span className="font-mono text-[0.7rem] max-sm:text-xs text-text-dim tracking-[1px] uppercase">
                {new Date(post.publishedAt).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <span className="text-text-ghost">·</span>
              <span className="font-mono text-[0.7rem] max-sm:text-xs text-text-dim tracking-[1px] uppercase">
                {post.author}
              </span>
              <span className="text-text-ghost">·</span>
              <span className="font-mono text-[0.7rem] max-sm:text-xs text-text-dim tracking-[1px] uppercase">
                {readingTime} min read
              </span>
              <div className="flex gap-1 flex-wrap max-sm:basis-full max-sm:mt-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[0.65rem] max-sm:text-xs tracking-[1px] uppercase text-ac-red border border-border-red py-0.5 px-2"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div
              className="prose-brutal"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(post.content), { ALLOWED_TAGS: ['h1','h2','h3','h4','p','a','strong','em','ul','ol','li','br','code','pre','blockquote','span','div'], ALLOWED_ATTR: ['class','href','rel','target','id'] }) }}
            />

            {relatedPosts.length > 0 && (
              <div className="mt-16 pt-8 border-t-2 border-ac-red">
                <h2 className="font-display text-[0.7rem] font-bold tracking-[2px] uppercase text-ac-red mb-6">
                  Related insights
                </h2>
                <div className="grid gap-[2px]">
                  {relatedPosts.map((related) => (
                    <Link
                      key={related.slug}
                      href={`/blog/${related.slug}`}
                      className="block border-2 border-border-subtle p-5 no-underline transition-all duration-200 hover:border-ac-red group"
                    >
                      <div className="text-[0.95rem] font-bold text-text-primary group-hover:text-ac-red transition-colors duration-200">
                        {related.title}
                      </div>
                      <p className="text-text-dim text-[0.8rem] font-light mt-1 mb-2 line-clamp-2">
                        {related.description}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[0.65rem] max-sm:text-xs text-text-ghost tracking-[1px] uppercase">
                          {new Date(related.publishedAt).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <div className="flex gap-1">
                          {related.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="font-mono text-[0.6rem] max-sm:text-xs tracking-[1px] uppercase text-ac-red border border-border-red py-0.5 px-1.5"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-16 pt-8 border-t border-border-subtle text-center">
              <div className="text-[1.2rem] font-black mb-2">
                Want to implement what you just read?
              </div>
              <p className="text-text-dim text-[0.9rem] font-light mb-6">
                We turn these insights into real business systems.
              </p>
              <EmailLink
                className="inline-block font-display text-[0.75rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 bg-ac-red text-white hover:bg-white hover:text-ac-black"
              >
                Book free consultation →
              </EmailLink>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

// Simple markdown renderer (no external deps)
function renderMarkdown(md: string): string {
  return md
    .replace(/^## (.+)$/gm, '<h2 class="text-[1.3rem] font-bold text-text-primary mt-10 mb-4 tracking-[-0.5px]">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-[1.1rem] font-bold text-text-primary mt-8 mb-3">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-text-primary">$1</strong>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, text, href) => {
      const safeHref = /^(https?:|\/|#|mailto:)/.test(href) ? href.replace(/"/g, '&quot;') : '#';
      return `<a href="${safeHref}" class="text-ac-red no-underline hover:underline" rel="noopener noreferrer">${text}</a>`;
    })
    .replace(/^- (.+)$/gm, '<li class="text-text-dim font-light leading-[1.7] ml-4 mb-1" data-ul>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="text-text-dim font-light leading-[1.7] ml-4 mb-1" data-ol value="$1">$2</li>')
    .replace(/((<li[^>]*data-ol[^>]*>.*<\/li>\s*)+)/g, (match) => `<ol class="mb-6 list-decimal pl-6">${match}</ol>`)
    .replace(/((<li[^>]*data-ul[^>]*>.*<\/li>\s*)+)/g, (match) => `<ul class="mb-6 list-none">${match}</ul>`)
    .replace(/ data-ul/g, '')
    .replace(/ data-ol/g, '')
    .replace(/^(?!<[hula])((?!^$).+)$/gm, '<p class="text-text-dim font-light leading-[1.7] mb-4 max-w-[680px]">$1</p>')
    .replace(/\n\n/g, '');
}

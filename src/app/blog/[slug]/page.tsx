import type { Metadata } from 'next';
import Link from 'next/link';
import { getPostBySlug, getAllPosts } from '@/lib/blog';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string }>;
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
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const readingTime = Math.ceil(post.content.split(/\s+/).length / 200);

  return (
    <main className="pt-[60px] min-h-screen">
      <article className="py-28 px-10 max-md:px-5 max-sm:py-20">
        <div className="max-w-[720px] mx-auto">
          <Link
            href="/blog"
            className="font-display text-[0.7rem] font-bold tracking-[2px] uppercase text-ac-red no-underline hover:text-white transition-colors mb-12 block"
          >
            ← Back to insights
          </Link>

          <h1 className="text-[clamp(1.8rem,4vw,2.5rem)] font-black tracking-tight leading-[1.1] mb-6">
            {post.title}
          </h1>

          <div className="flex items-center gap-4 mb-12 flex-wrap">
            <span className="font-mono text-[0.55rem] text-text-dim tracking-[1px] uppercase">
              {new Date(post.publishedAt).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <span className="text-text-ghost">·</span>
            <span className="font-mono text-[0.55rem] text-text-dim tracking-[1px] uppercase">
              {post.author}
            </span>
            <span className="text-text-ghost">·</span>
            <span className="font-mono text-[0.55rem] text-text-dim tracking-[1px] uppercase">
              {readingTime} min read
            </span>
            <div className="flex gap-1 ml-auto">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[0.5rem] tracking-[1px] uppercase text-ac-red border border-border-red py-0.5 px-2"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div
            className="prose-brutal"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />

          <div className="mt-16 pt-8 border-t border-border-subtle text-center">
            <div className="text-[1.2rem] font-black mb-2">
              Want to implement what you just read?
            </div>
            <p className="text-text-dim text-[0.9rem] font-light mb-6">
              We turn these insights into real business systems.
            </p>
            <a
              href="mailto:ai@agenticconsciousness.com.au"
              className="inline-block font-display text-[0.75rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 bg-ac-red text-white hover:bg-white hover:text-ac-black"
            >
              Book free consultation →
            </a>
          </div>
        </div>
      </article>
    </main>
  );
}

// Simple markdown renderer (no external deps)
function renderMarkdown(md: string): string {
  return md
    .replace(/^## (.+)$/gm, '<h2 class="text-[1.3rem] font-bold text-white mt-10 mb-4 tracking-[-0.5px]">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-[1.1rem] font-bold text-white mt-8 mb-3">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-ac-red no-underline hover:underline">$1</a>')
    .replace(/^- (.+)$/gm, '<li class="text-text-dim font-light leading-[1.7] ml-4 mb-1">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="mb-6 list-none">$&</ul>')
    .replace(/^(?!<[hula])((?!^$).+)$/gm, '<p class="text-text-dim font-light leading-[1.7] mb-4 max-w-[680px]">$1</p>')
    .replace(/\n\n/g, '');
}

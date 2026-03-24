import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Insights',
  description: 'AI insights, strategies, and implementation guides from Agentic Consciousness.',
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="pt-[60px] min-h-screen">
      <section className="py-28 px-10 max-md:px-5 max-sm:py-20">
        <div className="max-w-[1000px] mx-auto">
          <div className="font-mono text-[0.6rem] tracking-[3px] uppercase text-ac-red mb-3">
            AI-GENERATED CONTENT
          </div>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-none mb-4">
            Insights.
          </h1>
          <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] mb-14 max-w-[500px]">
            Articles written by our AI, reviewed by our team. Because we practice what we preach.
          </p>

          {posts.length === 0 ? (
            <p className="text-text-ghost">No posts yet.</p>
          ) : (
            <div className="flex flex-col gap-[2px]">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="grid grid-cols-[160px_1fr_auto] bg-ac-card transition-colors duration-300 hover:bg-ac-card-hover items-center no-underline max-[900px]:grid-cols-1"
                >
                  <div className="p-6 max-[900px]:pb-2">
                    <div className="font-mono text-[0.55rem] text-text-dim tracking-[1px] uppercase mb-2">
                      {new Date(post.publishedAt).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
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
                    <h2 className="text-[1rem] font-black text-white tracking-[-0.3px] mb-1">
                      {post.title}
                    </h2>
                    <p className="text-[0.8rem] text-text-dim font-light leading-[1.5]">
                      {post.description}
                    </p>
                  </div>

                  <div className="p-6 max-[900px]:pt-0">
                    <span className="font-display text-[0.7rem] font-bold tracking-[2px] uppercase text-ac-red">
                      READ →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

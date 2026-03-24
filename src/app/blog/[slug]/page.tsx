import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Post',
};

export default function BlogPost() {
  return (
    <main className="pt-[60px] min-h-screen">
      <section className="py-28 px-10 max-md:px-5">
        <div className="max-w-[800px] mx-auto text-center">
          <h1 className="text-[2rem] font-black tracking-tight mb-4">Coming soon.</h1>
          <a
            href="/blog"
            className="text-ac-red text-[0.8rem] font-bold tracking-[1px] uppercase no-underline hover:text-white transition-colors"
          >
            ← Back to insights
          </a>
        </div>
      </section>
    </main>
  );
}

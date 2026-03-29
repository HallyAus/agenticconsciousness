import type { Metadata } from 'next';
import Link from 'next/link';



export const metadata: Metadata = {
  title: 'Unsubscribed',
  robots: { index: false },
};

export default function UnsubscribePage() {
  return (
    <>
    <main className="min-h-screen flex items-center justify-center px-10 pt-[60px]" style={{ background: 'var(--bg-page)' }}>
      <div className="text-center max-w-[400px]">
        <h1 className="text-[1.5rem] font-black tracking-tight text-text-primary mb-4">
          You&apos;ve been unsubscribed.
        </h1>
        <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] mb-8">
          Sorry to see you go. If you change your mind, our free AI tools are always available.
        </p>
        <Link
          href="/"
          className="inline-block font-display text-[0.85rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 text-white"
          style={{ background: 'var(--red)' }}
        >
          Back to home →
        </Link>
      </div>
    </main>
    </>
  );
}

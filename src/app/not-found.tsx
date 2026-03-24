import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-10">
      <div className="text-center">
        <div className="text-[8rem] font-black text-text-ghost tracking-tight leading-none mb-2">
          404
        </div>
        <div className="text-[2rem] font-black tracking-tight mb-4">
          Nothing here.
        </div>
        <p className="text-text-dim text-[1rem] font-light mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-block font-display text-[0.75rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 bg-ac-red text-white hover:bg-white hover:text-ac-black"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}

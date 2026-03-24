'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-10">
      <div className="text-center">
        <div className="text-[4rem] font-black text-ac-red tracking-tight leading-none mb-4">
          ERROR
        </div>
        <p className="text-text-dim text-[1rem] font-light mb-8">
          Something went wrong. Our systems are being looked at.
        </p>
        <button
          onClick={reset}
          className="inline-block font-display text-[0.75rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 transition-all duration-200 bg-ac-red text-white hover:bg-white hover:text-ac-black cursor-pointer border-none"
        >
          Try again
        </button>
      </div>
    </main>
  );
}

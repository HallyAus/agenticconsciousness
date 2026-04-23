'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-10">
      <div className="text-center max-w-[480px]">
        <div className="text-[4rem] font-black text-ac-red tracking-tight leading-none mb-4">
          ERROR
        </div>
        <p className="text-text-dim text-[1rem] font-light mb-6">
          Something went wrong. Refresh to try again, or come back shortly.
        </p>
        <button
          onClick={reset}
          className="inline-block font-display text-[0.85rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 transition-all duration-200 bg-ac-red text-white hover:bg-white hover:text-[#0a0a0a] cursor-pointer border-none mb-6"
        >
          REFRESH PAGE →
        </button>
        {error.digest && (
          <p className="font-mono text-[0.7rem] tracking-[1.5px] text-text-ghost uppercase">
            Reference: <span className="text-text-dim normal-case tracking-normal">{error.digest}</span>
          </p>
        )}
        <p className="font-mono text-[0.7rem] tracking-[1.5px] text-text-ghost uppercase mt-2">
          If this keeps happening, email{' '}
          <a href="mailto:ai@agenticconsciousness.com.au" className="text-ac-red hover:underline normal-case tracking-normal">
            ai@agenticconsciousness.com.au
          </a>
        </p>
      </div>
    </main>
  );
}

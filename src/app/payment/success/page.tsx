import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Payment Confirmed',
  robots: { index: false, follow: false },
};

export default function PaymentSuccess() {
  return (
    <main className="pt-[60px] min-h-screen flex items-center justify-center px-10">
      <div className="text-center max-w-[500px]">
        <div className="text-[3rem] font-black mb-2" style={{ color: 'var(--status-green)' }}>&#10003;</div>
        <h1 className="text-[1.8rem] font-black tracking-tight text-text-primary mb-4">
          Payment confirmed.
        </h1>
        <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] mb-8">
          We&apos;ve received your deposit. You&apos;ll receive a confirmation email shortly with next steps. Your engagement begins now &mdash; we&apos;ll be in touch within 24 hours to schedule your kickoff.
        </p>
        <Link
          href="/"
          className="inline-block font-display text-[0.75rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 text-white"
          style={{ background: 'var(--red)' }}
        >
          Back to home &rarr;
        </Link>
      </div>
    </main>
  );
}

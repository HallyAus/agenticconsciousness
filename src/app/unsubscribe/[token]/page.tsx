import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from '@/lib/pg';

export const metadata: Metadata = {
  title: 'Unsubscribed',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function TokenUnsubscribe({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let matched = false;
  if (/^[a-f0-9]{24,64}$/i.test(token)) {
    const result = (await sql`
      UPDATE prospects
      SET status = 'unsubscribed',
          next_touch_due_at = NULL,
          updated_at = NOW()
      WHERE unsub_token = ${token}
      RETURNING id
    `) as Array<{ id: string }>;
    matched = result.length > 0;
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-10 pt-[60px]"
      style={{ background: 'var(--bg-page)' }}
    >
      <div className="text-center max-w-[440px]">
        <h1 className="text-[1.5rem] font-black tracking-tight text-text-primary mb-4">
          {matched ? "You've been unsubscribed." : 'Already unsubscribed.'}
        </h1>
        <p className="text-text-dim text-[0.9rem] font-light leading-[1.7] mb-8">
          {matched
            ? "Sorry to clutter your inbox. You won't hear from me again."
            : 'That link has already been used, or the token is no longer valid. Either way, you\u2019re off the list.'}
        </p>
        <Link
          href="/"
          className="inline-block font-display text-[0.85rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 text-white"
          style={{ background: 'var(--red)' }}
        >
          Back to home &rarr;
        </Link>
      </div>
    </main>
  );
}

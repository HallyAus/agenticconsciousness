import Link from 'next/link';

const QUICK_LINKS = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Book a Sprint', href: '/book' },
  { label: 'Free AI tools', href: '/tools' },
  { label: 'Insights', href: '/blog' },
];

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-10">
      <div className="text-center max-w-[560px]">
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
          className="inline-block font-display text-[0.85rem] font-black tracking-[2px] uppercase py-[0.9rem] px-8 no-underline transition-all duration-200 bg-ac-red text-white hover:bg-white hover:text-[#0a0a0a] mb-10"
        >
          ← Back to home
        </Link>

        <div className="border-t border-border-subtle pt-6">
          <p className="font-mono text-[0.7rem] tracking-[2px] uppercase text-text-dim mb-4">
            Or jump to
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 justify-center list-none">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-display text-[0.85rem] font-bold tracking-[1.5px] uppercase text-text-primary no-underline border-b-2 border-ac-red pb-[2px] hover:text-ac-red transition-colors duration-200"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

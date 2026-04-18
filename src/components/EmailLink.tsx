'use client';

import { trackEvent } from '@/lib/tracking';

const EMAIL = ['ai', 'agenticconsciousness.com.au'];

export default function EmailLink({
  children,
  className,
  style,
  source,
}: {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  source?: string;
}) {
  const addr = EMAIL.join('@');

  function handleClick() {
    trackEvent('ContactIntent', { source: source ?? 'email_link' });
  }

  return (
    <a
      href={`mailto:${addr}`}
      className={className}
      style={style}
      onClick={handleClick}
    >
      {children || addr}
    </a>
  );
}

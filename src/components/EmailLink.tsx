'use client';

const EMAIL = ['ai', 'agenticconsciousness.com.au'];

export default function EmailLink({ children, className, style }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const addr = EMAIL.join('@');
  return (
    <a href={`mailto:${addr}`} className={className} style={style}>
      {children || addr}
    </a>
  );
}

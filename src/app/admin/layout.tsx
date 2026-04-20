import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin — Agentic Consciousness',
  robots: { index: false, follow: false, nocache: true, noarchive: true, nosnippet: true, noimageindex: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#0a0a0a', color: '#fafafa', minHeight: '100vh', fontFamily: 'var(--font-display), system-ui' }}>
      <header
        style={{
          borderBottom: '2px solid #ff3d00',
          padding: '18px 28px',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#ff3d00' }}>
          AC_ / ADMIN / OUTREACH
        </div>
        <nav style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          <a href="/admin" style={{ color: '#fafafa', textDecoration: 'none', marginRight: 18 }}>Prospects</a>
          <a href="/" style={{ color: '#999', textDecoration: 'none' }}>← Site</a>
        </nav>
      </header>
      <main style={{ padding: 28, maxWidth: 1280, margin: '0 auto' }}>{children}</main>
    </div>
  );
}

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
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#0a0a0a',
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#ff3d00' }}>
          AC_ / ADMIN
        </div>
        <nav style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <a href="/admin" style={{ color: '#fafafa', textDecoration: 'none' }}>Prospects</a>
          <a href="/admin/dashboard" style={{ color: '#fafafa', textDecoration: 'none' }}>Dashboard</a>
          <a href="/admin/settings" style={{ color: '#fafafa', textDecoration: 'none' }}>Settings</a>
          <a href="/" style={{ color: '#999', textDecoration: 'none' }}>← Site</a>
        </nav>
      </header>
      <main style={{ padding: '20px 16px', maxWidth: 1280, margin: '0 auto' }}>{children}</main>
    </div>
  );
}

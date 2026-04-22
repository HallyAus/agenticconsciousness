'use client';

import { useEffect, useState, useCallback } from 'react';

interface Dashboard {
  totals: {
    prospects_total: number;
    sends_total: number;
    open_rate_pct: number;
    click_rate_pct: number;
    reply_rate_pct: number;
    conversion_pct: number;
    replied_count: number;
    purchased_count: number;
    unsubscribed_count: number;
    drafted_count: number;
    audited_count: number;
    auditing_count: number;
    suppressed_total: number;
  };
  byStatus: Array<{ status: string; count: number }>;
  daily: Array<{ day: string; sent: number; opens: number; clicks: number }>;
  variants: Array<{ label: string | null; sends: number; opens: number; clicks: number; open_rate: number; click_rate: number }>;
  generatedAt: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard', { cache: 'no-store' });
      if (!res.ok) {
        setErr(`Failed: ${res.status}`);
        return;
      }
      setData(await res.json());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Network error');
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 10_000);
    return () => clearInterval(iv);
  }, [load]);

  if (err) return <div style={{ color: '#ff3d00', padding: 28 }}>{err}</div>;
  if (!data) return <div style={{ color: '#999', padding: 28 }}>Loading…</div>;

  const t = data.totals;

  return (
    <div>
      <a
        href="/admin"
        style={{
          display: 'inline-block',
          marginBottom: 16,
          color: '#999',
          textDecoration: 'none',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}
      >
        ← Prospects
      </a>

      <div style={{ borderBottom: '2px solid #ff3d00', paddingBottom: 12, marginBottom: 20 }}>
        <div style={kickerStyle}>OUTREACH DASHBOARD</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#fafafa', marginTop: 4 }}>The funnel.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 2, background: '#222', marginBottom: 24 }}>
        <Stat label="Prospects" value={t.prospects_total} />
        <Stat label="Sends" value={t.sends_total} />
        <Stat label="Open rate" value={`${t.open_rate_pct}%`} colour={t.open_rate_pct > 0 ? '#22c55e' : undefined} />
        <Stat label="Click rate" value={`${t.click_rate_pct}%`} colour={t.click_rate_pct > 0 ? '#3b82f6' : undefined} />
        <Stat label="Reply rate" value={`${t.reply_rate_pct}%`} colour={t.reply_rate_pct > 0 ? '#eab308' : undefined} />
        <Stat label="Conversion" value={`${t.conversion_pct}%`} colour={t.conversion_pct > 0 ? '#ff3d00' : undefined} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 2, background: '#222', marginBottom: 28 }}>
        <Stat label="Drafted" value={t.drafted_count} />
        <Stat label="Audited" value={t.audited_count} />
        <Stat label="Auditing" value={t.auditing_count} />
        <Stat label="Replied" value={t.replied_count} colour="#22c55e" />
        <Stat label="Purchased" value={t.purchased_count} colour="#ff3d00" />
        <Stat label="Unsubscribed" value={t.unsubscribed_count} colour="#999" />
        <Stat label="Suppressed" value={t.suppressed_total} colour="#999" />
      </div>

      <section style={{ marginBottom: 28 }}>
        <div style={kickerStyle}>SUBJECT VARIANTS</div>
        {data.variants.length === 0 ? (
          <div style={{ color: '#666', padding: 12, fontSize: 13 }}>No sends yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <Th>Variant</Th><Th align="right">Sends</Th>
                  <Th align="right">Opens</Th><Th align="right">Open rate</Th>
                  <Th align="right">Clicks</Th><Th align="right">Click rate</Th>
                </tr>
              </thead>
              <tbody>
                {data.variants.map((v) => (
                  <tr key={v.label ?? 'none'} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <Td>{v.label ?? '(none)'}</Td>
                    <Td align="right">{v.sends}</Td>
                    <Td align="right">{v.opens}</Td>
                    <Td align="right" colour={v.open_rate > 0 ? '#22c55e' : '#666'}>{v.open_rate}%</Td>
                    <Td align="right">{v.clicks}</Td>
                    <Td align="right" colour={v.click_rate > 0 ? '#3b82f6' : '#666'}>{v.click_rate}%</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div style={kickerStyle}>LAST 30 DAYS</div>
        {data.daily.length === 0 ? (
          <div style={{ color: '#666', padding: 12, fontSize: 13 }}>No sends yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <Th>Day</Th><Th align="right">Sent</Th>
                <Th align="right">Opens</Th><Th align="right">Clicks</Th>
              </tr>
            </thead>
            <tbody>
              {data.daily.map((d) => (
                <tr key={d.day} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <Td>{d.day}</Td>
                  <Td align="right">{d.sent}</Td>
                  <Td align="right" colour={d.opens > 0 ? '#22c55e' : '#666'}>{d.opens}</Td>
                  <Td align="right" colour={d.clicks > 0 ? '#3b82f6' : '#666'}>{d.clicks}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

const kickerStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono), monospace',
  fontSize: 11,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: '#ff3d00',
};

function Stat({ label, value, colour = '#fafafa' }: { label: string; value: number | string; colour?: string }) {
  return (
    <div style={{ background: '#0a0a0a', padding: '16px 14px' }}>
      <div style={{ ...kickerStyle, fontSize: 9, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: colour, letterSpacing: -1 }}>{value}</div>
    </div>
  );
}

function Th({ children, align = 'left' }: { children?: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th style={{
      textAlign: align,
      padding: '8px 6px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: 10,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: '#ff3d00',
      fontWeight: 700,
    }}>{children}</th>
  );
}

function Td({ children, align = 'left', colour = '#fafafa' }: { children?: React.ReactNode; align?: 'left' | 'right'; colour?: string }) {
  return <td style={{ padding: '8px 6px', textAlign: align, color: colour }}>{children}</td>;
}

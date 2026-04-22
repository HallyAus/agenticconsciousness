'use client';

import { useEffect, useState, use } from 'react';

interface Send {
  id: string;
  touch_num: number | null;
  subject: string | null;
  sent_at: string | null;
  tracking_token: string | null;
  opens_count: number;
  last_opened_at: string | null;
  clicks_count: number;
  last_clicked_at: string | null;
  graph_message_id: string | null;
}

interface Click {
  id: string;
  send_id: string;
  target_url: string;
  clicked_at: string;
  user_agent: string | null;
  ip: string | null;
}

interface Activity {
  prospect: { id: string; url: string; email: string | null; business_name: string | null; status: string };
  sends: Send[];
  clicks: Click[];
}

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' });
}

function shortUa(ua: string | null): string {
  if (!ua) return '—';
  if (/iphone|ipad|ios/i.test(ua)) return 'iOS';
  if (/android/i.test(ua)) return 'Android';
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/outlook/i.test(ua)) return 'Outlook';
  if (/bot|crawler|spider|scanner/i.test(ua)) return 'Bot/Scanner';
  return ua.slice(0, 40);
}

export default function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Activity | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/prospects/${id}/activity`, { cache: 'no-store' });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          if (alive) setErr(j.error ?? `Load failed: ${res.status}`);
          return;
        }
        const d = await res.json();
        if (alive) setData(d);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : 'Network error');
      }
    };
    load();
    const iv = setInterval(load, 6000);
    return () => { alive = false; clearInterval(iv); };
  }, [id]);

  if (err) return <div style={{ color: '#ff3d00', padding: 28 }}>{err}</div>;
  if (!data) return <div style={{ color: '#999', padding: 28 }}>Loading…</div>;

  const clicksBySend = new Map<string, Click[]>();
  for (const c of data.clicks) {
    const list = clicksBySend.get(c.send_id) ?? [];
    list.push(c);
    clicksBySend.set(c.send_id, list);
  }

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
        ← All prospects
      </a>

      <div style={{ borderBottom: '2px solid #ff3d00', paddingBottom: 12, marginBottom: 22 }}>
        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: 2, color: '#ff3d00' }}>
          ACTIVITY
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fafafa', marginTop: 4 }}>
          {data.prospect.business_name ?? data.prospect.url}
        </div>
        <div style={{ color: '#999', fontSize: 13, marginTop: 2 }}>
          {data.prospect.email ?? '(no email)'} · <span style={{ color: '#666' }}>{data.prospect.status}</span>
        </div>
      </div>

      {data.sends.length === 0 ? (
        <div style={{ color: '#666', padding: 40, textAlign: 'center', border: '2px dashed #333' }}>
          No sends yet.
        </div>
      ) : (
        data.sends.map((s) => {
          const sendClicks = clicksBySend.get(s.id) ?? [];
          return (
            <section
              key={s.id}
              style={{ border: '1px solid #222', padding: 16, marginBottom: 14, background: '#111' }}
            >
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <div style={{
                  fontFamily: 'var(--font-mono), monospace',
                  color: '#ff3d00',
                  fontSize: 11,
                  letterSpacing: 1.5,
                }}>
                  TOUCH #{s.touch_num ?? '?'}
                </div>
                <div style={{ color: '#fafafa', fontSize: 14, flex: 1 }}>{s.subject ?? '(no subject)'}</div>
                <div style={{ color: '#999', fontSize: 11 }}>{fmt(s.sent_at)}</div>
              </div>

              <div style={{ display: 'flex', gap: 24, marginTop: 10, flexWrap: 'wrap' }}>
                <Metric label="OPENS" value={s.opens_count} hint={`Last: ${fmt(s.last_opened_at)}`} color={s.opens_count > 0 ? '#22c55e' : '#666'} />
                <Metric label="CLICKS" value={s.clicks_count} hint={`Last: ${fmt(s.last_clicked_at)}`} color={s.clicks_count > 0 ? '#3b82f6' : '#666'} />
              </div>

              {sendClicks.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid #222', paddingTop: 12 }}>
                  <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10, letterSpacing: 1.5, color: '#ff3d00', marginBottom: 8 }}>
                    CLICK LOG ({sendClicks.length})
                  </div>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                        <th style={{ textAlign: 'left', padding: '4px 0' }}>Time</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>URL</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Client</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sendClicks.map((c) => (
                        <tr key={c.id} style={{ borderTop: '1px solid #1a1a1a' }}>
                          <td style={{ padding: '4px 0', color: '#fafafa', whiteSpace: 'nowrap' }}>{fmt(c.clicked_at)}</td>
                          <td style={{ padding: '4px 8px', color: '#3b82f6', wordBreak: 'break-all' }}>
                            <a href={c.target_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                              {c.target_url}
                            </a>
                          </td>
                          <td style={{ padding: '4px 8px', color: '#999' }}>{shortUa(c.user_agent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

function Metric({ label, value, hint, color }: { label: string; value: number; hint: string; color: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9, letterSpacing: 1.5, color: '#666' }}>{label}</div>
      <div style={{ color, fontSize: 24, fontWeight: 900 }}>{value}</div>
      <div style={{ color: '#666', fontSize: 10 }}>{hint}</div>
    </div>
  );
}

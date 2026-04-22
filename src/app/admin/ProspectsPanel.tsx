'use client';

import { useCallback, useEffect, useImperativeHandle, useState, forwardRef } from 'react';

interface Prospect {
  id: string;
  url: string;
  business_name: string | null;
  email: string | null;
  email_confidence: string | null;
  phone: string | null;
  address: string | null;
  postcode: string | null;
  discovered_via: string | null;
  status: string;
  audit_score: number | null;
  audit_summary: string | null;
  touch_count: number;
  last_outbound_at: string | null;
  next_touch_due_at: string | null;
  reply_detected_at: string | null;
  draft_web_link: string | null;
  draft_created_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_COLOUR: Record<string, string> = {
  new: '#666',
  auditing: '#eab308',
  audited: '#22c55e',
  waf_blocked: '#ff3d00',
  audit_failed: '#ff3d00',
  drafted: '#eab308',
  sent: '#3b82f6',
  replied: '#22c55e',
  unsubscribed: '#999',
  bounced: '#ff3d00',
  purchased: '#22c55e',
  skipped: '#666',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' });
}

export interface ProspectsPanelHandle {
  refresh: () => void;
}

const ProspectsPanel = forwardRef<ProspectsPanelHandle>(function ProspectsPanel(_props, ref) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [url, setUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafting, setDrafting] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/prospects', { cache: 'no-store' });
      const data = await res.json();
      setProspects(data.prospects ?? []);
    } catch {
      // ignore transient network errors; next poll will retry
    }
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [refresh]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/prospects/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          businessName: businessName.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to start audit');
      } else {
        setUrl('');
        setBusinessName('');
        setNotes('');
        refresh();
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this prospect?')) return;
    await fetch(`/api/admin/prospects/${id}`, { method: 'DELETE' });
    refresh();
  }

  async function handleCreateDraft(id: string, email: string) {
    if (!confirm(`Create an Outlook draft to ${email}?\n\nYou'll review and hit Send manually.`)) return;
    setDrafting(id);
    try {
      const res = await fetch(`/api/admin/prospects/${id}/send`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Draft failed: ${data.error ?? res.status}`);
      } else if (data.webLink) {
        window.open(data.webLink, '_blank', 'noopener,noreferrer');
      }
      refresh();
    } finally {
      setDrafting(null);
    }
  }

  async function handleTestDraft(id: string) {
    const last = (typeof window !== 'undefined' && localStorage.getItem('ac-test-email')) || '';
    const to = prompt('Send a test draft to which email?', last || 'daniel@printforge.com.au');
    if (!to) return;
    const trimmed = to.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      alert('Not a valid email');
      return;
    }
    localStorage.setItem('ac-test-email', trimmed);
    setDrafting(id);
    try {
      const res = await fetch(`/api/admin/prospects/${id}/test-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Test draft failed: ${data.error ?? res.status}`);
      } else if (data.webLink) {
        window.open(data.webLink, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setDrafting(null);
    }
  }

  async function handleMarkSent(id: string) {
    if (!confirm('Mark this as sent? Do this after you\'ve hit Send in Outlook.')) return;
    const res = await fetch(`/api/admin/prospects/${id}/mark-sent`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(`Mark-sent failed: ${data.error ?? res.status}`);
    }
    refresh();
  }

  async function handleEditEmail(id: string, current: string | null) {
    const next = prompt('Update email address:', current ?? '');
    if (next === null) return;
    const trimmed = next.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      alert('Not a valid email');
      return;
    }
    await fetch(`/api/admin/prospects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed }),
    });
    refresh();
  }

  return (
    <div>
      <section style={{ border: '2px solid #ff3d00', padding: 20, marginBottom: 28, background: '#111' }}>
        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#ff3d00', marginBottom: 12 }}>
          New prospect (manual URL)
        </div>
        <form onSubmit={handleAdd} style={{ display: 'grid', gap: 10 }}>
          <input
            type="text"
            placeholder="https://example.com.au"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            style={fieldStyle}
          />
          <input
            type="text"
            placeholder="Business name (optional — auto-detected otherwise)"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            style={fieldStyle}
          />
          <textarea
            placeholder="Notes (optional — where you found them, trade, decision-maker hints)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ ...fieldStyle, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={submitting || !url.trim()}
              style={{
                background: '#ff3d00',
                color: '#fff',
                border: 'none',
                padding: '12px 22px',
                fontFamily: 'var(--font-display), system-ui',
                fontWeight: 900,
                letterSpacing: 2,
                textTransform: 'uppercase',
                fontSize: 13,
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting || !url.trim() ? 0.5 : 1,
              }}
            >
              {submitting ? 'Starting…' : 'Run audit →'}
            </button>
            {error && (
              <span style={{ color: '#ff3d00', fontFamily: 'var(--font-mono), monospace', fontSize: 12 }}>
                {error}
              </span>
            )}
          </div>
        </form>
      </section>

      <section>
        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#ff3d00', marginBottom: 12 }}>
          Prospects ({prospects.length})
        </div>
        {prospects.length === 0 ? (
          <div style={{ color: '#666', fontSize: 14, padding: 40, textAlign: 'center', border: '2px dashed #333' }}>
            No prospects yet. Search Google Places above, or paste a URL.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ff3d00' }}>
                  <Th>URL</Th>
                  <Th>Status</Th>
                  <Th>Score</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Last touch</Th>
                  <Th>Updated</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #222' }}>
                    <Td>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: '#fafafa', textDecoration: 'none' }}>
                        {shortUrl(p.url)}
                      </a>
                      {p.business_name && (
                        <div style={{ color: '#999', fontSize: 11 }}>{p.business_name}</div>
                      )}
                      {p.postcode && (
                        <div style={{ color: '#666', fontSize: 10, fontFamily: 'var(--font-mono), monospace' }}>
                          {p.postcode}{p.discovered_via === 'google_places' ? ' · maps' : ''}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <span style={{
                        fontFamily: 'var(--font-mono), monospace',
                        fontSize: 10,
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        color: STATUS_COLOUR[p.status] ?? '#fafafa',
                      }}>
                        {p.status}
                      </span>
                    </Td>
                    <Td>{p.audit_score !== null ? `${p.audit_score}/100` : '—'}</Td>
                    <Td>
                      {p.email ? (
                        <div>
                          <div>
                            {p.email}{' '}
                            <button
                              onClick={() => handleEditEmail(p.id, p.email)}
                              style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: 10 }}
                              title="Edit email"
                            >
                              ✎
                            </button>
                          </div>
                          <div style={{ color: '#666', fontSize: 10 }}>{p.email_confidence}</div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditEmail(p.id, null)}
                          style={{ background: 'transparent', border: '1px dashed #444', color: '#999', padding: '2px 6px', fontSize: 10, fontFamily: 'var(--font-mono), monospace', cursor: 'pointer' }}
                        >
                          + add
                        </button>
                      )}
                    </Td>
                    <Td>{p.phone ?? '—'}</Td>
                    <Td>{fmtDate(p.last_outbound_at)}</Td>
                    <Td>{fmtDate(p.updated_at)}</Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {p.status === 'audited' && p.email && (
                          <button
                            onClick={() => handleCreateDraft(p.id, p.email!)}
                            disabled={drafting === p.id}
                            style={actionBtn('#ff3d00')}
                            title="Create draft in Outlook"
                          >
                            {drafting === p.id ? '…' : 'Draft'}
                          </button>
                        )}
                        {p.audit_score !== null && (
                          <button
                            onClick={() => handleTestDraft(p.id)}
                            disabled={drafting === p.id}
                            style={actionBtn('#8b5cf6')}
                            title="Send a test draft to your own email"
                          >
                            Test
                          </button>
                        )}
                        {p.status === 'drafted' && p.draft_web_link && (
                          <>
                            <a
                              href={p.draft_web_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ ...actionBtn('#3b82f6'), textDecoration: 'none', display: 'inline-block' }}
                              title="Open draft in Outlook on the web"
                            >
                              Open
                            </a>
                            <button
                              onClick={() => handleMarkSent(p.id)}
                              style={actionBtn('#22c55e')}
                              title="Mark as sent after you've hit Send in Outlook"
                            >
                              ✓ Sent
                            </button>
                            <button
                              onClick={() => handleCreateDraft(p.id, p.email!)}
                              disabled={drafting === p.id}
                              style={{ ...actionBtn('#666'), fontSize: 10 }}
                              title="Re-create draft (e.g. after edits)"
                            >
                              Redraft
                            </button>
                          </>
                        )}
                        {p.audit_score !== null && (
                          <a
                            href={`/api/admin/prospects/${p.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ ...actionBtn('#555'), textDecoration: 'none', display: 'inline-block' }}
                          >
                            PDF
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(p.id)}
                          style={{
                            background: 'transparent',
                            color: '#666',
                            border: '1px solid #333',
                            padding: '4px 8px',
                            fontSize: 10,
                            fontFamily: 'var(--font-mono), monospace',
                            letterSpacing: 1,
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          Del
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
});

function shortUrl(u: string): string {
  try {
    const url = new URL(u);
    return url.hostname.replace(/^www\./, '') + url.pathname.replace(/\/$/, '');
  } catch {
    return u;
  }
}

const fieldStyle: React.CSSProperties = {
  background: '#0a0a0a',
  color: '#fafafa',
  border: '1px solid #333',
  padding: '10px 12px',
  fontFamily: 'var(--font-display), system-ui',
  fontSize: 14,
  outline: 'none',
};

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th style={{
      textAlign: 'left',
      padding: '10px 8px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: 10,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: '#ff3d00',
      fontWeight: 700,
    }}>
      {children}
    </th>
  );
}

function Td({ children }: { children?: React.ReactNode }) {
  return <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>{children}</td>;
}

function actionBtn(color: string): React.CSSProperties {
  return {
    background: color,
    color: '#fff',
    border: 'none',
    padding: '5px 10px',
    fontSize: 10,
    fontFamily: 'var(--font-mono), monospace',
    letterSpacing: 1,
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontWeight: 700,
  };
}

export default ProspectsPanel;

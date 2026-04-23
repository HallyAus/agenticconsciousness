'use client';

import { useCallback, useEffect, useImperativeHandle, useMemo, useState, forwardRef } from 'react';

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
  mockup_token: string | null;
  mockup_locked: boolean;
  has_previous_mockup: boolean;
  opens_count: number;
  clicks_count: number;
  last_opened_at: string | null;
  last_clicked_at: string | null;
  created_at: string;
  updated_at: string;
}

type Tab = 'now' | 'sent' | 'not_now';

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

const NOW_STATUSES = new Set(['new', 'auditing', 'audited', 'drafted', 'audit_failed', 'waf_blocked']);
const SENT_STATUSES = new Set(['sent', 'replied', 'purchased']);
const NOT_NOW_STATUSES = new Set(['skipped', 'unsubscribed', 'bounced']);

function tabFor(status: string): Tab {
  if (SENT_STATUSES.has(status)) return 'sent';
  if (NOT_NOW_STATUSES.has(status)) return 'not_now';
  return 'now';
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' });
}

function shortUrl(u: string): string {
  try {
    const url = new URL(u);
    return url.hostname.replace(/^www\./, '') + url.pathname.replace(/\/$/, '');
  } catch {
    return u;
  }
}

export interface ProspectsPanelHandle {
  refresh: () => void;
}

const ProspectsPanel = forwardRef<ProspectsPanelHandle>(function ProspectsPanel(_props, ref) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [tab, setTab] = useState<Tab>('now');
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

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { now: 0, sent: 0, not_now: 0 };
    for (const p of prospects) c[tabFor(p.status)]++;
    return c;
  }, [prospects]);

  const visible = useMemo(
    () => prospects.filter((p) => tabFor(p.status) === tab),
    [prospects, tab],
  );

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

  async function handleReaudit(id: string) {
    if (!confirm('Re-run the audit on this prospect?')) return;
    const res = await fetch(`/api/admin/prospects/${id}/reaudit`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(`Reaudit failed: ${data.error ?? res.status}`);
    }
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this prospect? This is permanent — use Hide if you might come back.')) return;
    await fetch(`/api/admin/prospects/${id}`, { method: 'DELETE' });
    refresh();
  }

  async function handleHide(id: string) {
    await fetch(`/api/admin/prospects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'skipped' }),
    });
    refresh();
  }

  async function handleUnhide(id: string) {
    await fetch(`/api/admin/prospects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'audited' }),
    });
    refresh();
  }

  async function handleCreateDraft(id: string, email: string, subjectOverride?: string) {
    const msg = subjectOverride
      ? `Create a custom-subject Outlook draft to ${email}?`
      : `Create an Outlook draft to ${email}?\n\nSaved to Drafts — review in Outlook on the web when you're ready to send.`;
    if (!confirm(msg)) return;
    setDrafting(id);
    try {
      const res = await fetch(`/api/admin/prospects/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjectOverride ? { subjectOverride } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Draft failed: ${data.error ?? res.status}`);
      }
      refresh();
    } finally {
      setDrafting(null);
    }
  }

  async function handleEditSubject(id: string, email: string) {
    const subject = prompt('Custom subject line (leave empty to use A/B rotation):', '');
    if (subject === null) return;
    handleCreateDraft(id, email, subject.trim() || undefined);
  }

  async function handleSchedule(id: string) {
    const dt = prompt(
      'Schedule draft creation for (local time, e.g. 2026-04-23 10:00):',
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' '),
    );
    if (!dt) return;
    const iso = new Date(dt.replace(' ', 'T')).toISOString();
    if (Number.isNaN(Date.parse(iso))) {
      alert('Invalid date/time');
      return;
    }
    await fetch(`/api/admin/prospects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_send_at: iso }),
    });
    refresh();
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
      } else {
        alert(`Test draft saved. Check your Drafts folder in ${trimmed}.`);
      }
    } finally {
      setDrafting(null);
    }
  }

  async function handleMarkSent(id: string) {
    if (!confirm('Mark this as sent? Do this after you have hit Send in Outlook.')) return;
    const res = await fetch(`/api/admin/prospects/${id}/mark-sent`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(`Mark-sent failed: ${data.error ?? res.status}`);
    }
    refresh();
  }

  async function handleMockupLock(id: string, currentlyLocked: boolean) {
    const willLock = !currentlyLocked;
    const msg = willLock
      ? 'Lock this mockup? It will NOT regenerate on future reaudits.'
      : 'Unlock this mockup? It will regenerate on the next reaudit.';
    if (!confirm(msg)) return;
    const res = await fetch(`/api/admin/prospects/${id}/mockup-lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked: willLock }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(`Lock toggle failed: ${data.error ?? res.status}`);
    }
    refresh();
  }

  async function handleMockupRestore(id: string) {
    if (!confirm('Restore the previous mockup? The current one will be swapped into the "previous" slot.')) return;
    const res = await fetch(`/api/admin/prospects/${id}/mockup-restore`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(`Restore failed: ${data.error ?? res.status}`);
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '2px solid #ff3d00' }}>
        <TabButton active={tab === 'now'} onClick={() => setTab('now')} label="Now" count={counts.now} />
        <TabButton active={tab === 'sent'} onClick={() => setTab('sent')} label="Sent" count={counts.sent} />
        <TabButton active={tab === 'not_now'} onClick={() => setTab('not_now')} label="Not now" count={counts.not_now} />
      </div>

      {visible.length === 0 ? (
        <div style={{ color: '#666', fontSize: 14, padding: 40, textAlign: 'center', border: '2px dashed #333' }}>
          {tab === 'now' && 'Nothing needs action. Add prospects above or check Sent / Not now.'}
          {tab === 'sent' && 'No emails sent yet. Draft + Send from the Now tab.'}
          {tab === 'not_now' && 'No hidden prospects. Use Hide on a card to park it here.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {visible.map((p) => (
            <ProspectCard
              key={p.id}
              p={p}
              tab={tab}
              drafting={drafting === p.id}
              onCreateDraft={() => p.email && handleCreateDraft(p.id, p.email)}
              onTestDraft={() => handleTestDraft(p.id)}
              onMarkSent={() => handleMarkSent(p.id)}
              onEditSubject={() => p.email && handleEditSubject(p.id, p.email)}
              onSchedule={() => handleSchedule(p.id)}
              onReaudit={() => handleReaudit(p.id)}
              onHide={() => handleHide(p.id)}
              onUnhide={() => handleUnhide(p.id)}
              onDelete={() => handleDelete(p.id)}
              onEditEmail={() => handleEditEmail(p.id, p.email)}
              onMockupLock={() => handleMockupLock(p.id, p.mockup_locked)}
              onMockupRestore={() => handleMockupRestore(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
});

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? '#ff3d00' : 'transparent',
        color: active ? '#fff' : '#999',
        border: 'none',
        padding: '10px 18px',
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 11,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        fontWeight: 700,
        cursor: 'pointer',
        borderTop: active ? '2px solid #ff3d00' : '2px solid transparent',
        borderLeft: active ? '2px solid #ff3d00' : '2px solid transparent',
        borderRight: active ? '2px solid #ff3d00' : '2px solid transparent',
      }}
      aria-pressed={active}
    >
      {label} <span style={{ opacity: 0.7, marginLeft: 6 }}>({count})</span>
    </button>
  );
}

function ProspectCard({
  p,
  tab,
  drafting,
  onCreateDraft,
  onTestDraft,
  onMarkSent,
  onEditSubject,
  onSchedule,
  onReaudit,
  onHide,
  onUnhide,
  onDelete,
  onEditEmail,
  onMockupLock,
  onMockupRestore,
}: {
  p: Prospect;
  tab: Tab;
  drafting: boolean;
  onCreateDraft: () => void;
  onTestDraft: () => void;
  onMarkSent: () => void;
  onEditSubject: () => void;
  onSchedule: () => void;
  onReaudit: () => void;
  onHide: () => void;
  onUnhide: () => void;
  onDelete: () => void;
  onEditEmail: () => void;
  onMockupLock: () => void;
  onMockupRestore: () => void;
}) {
  return (
    <article
      style={{
        background: '#111',
        border: '1px solid #333',
        borderLeft: `4px solid ${STATUS_COLOUR[p.status] ?? '#666'}`,
        padding: 16,
      }}
    >
      {/* Row 1: business + status + score */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#fafafa', textDecoration: 'none', fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px' }}
          >
            {shortUrl(p.url)}
          </a>
          <div style={{ color: '#999', fontSize: 12, marginTop: 2 }}>
            {p.business_name ?? '—'}
            {p.postcode && (
              <span style={{ color: '#555', fontFamily: 'var(--font-mono), monospace', marginLeft: 8 }}>
                {p.postcode}{p.discovered_via === 'google_places' ? ' · maps' : ''}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {p.audit_score !== null && (
            <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 14, color: '#fafafa', fontWeight: 700 }}>
              {p.audit_score}/100
            </span>
          )}
          <span
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#fff',
              background: STATUS_COLOUR[p.status] ?? '#666',
              padding: '3px 8px',
            }}
          >
            {p.status}
          </span>
        </div>
      </header>

      {/* Row 2: contact info inline */}
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: '#999', marginBottom: 12 }}>
        <span>
          <span style={{ color: '#555', marginRight: 6 }}>✉</span>
          {p.email ? (
            <>
              <a href={`mailto:${p.email}`} style={{ color: '#fafafa', textDecoration: 'none' }}>{p.email}</a>
              <button
                onClick={onEditEmail}
                style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: 11, marginLeft: 4 }}
                title="Edit email"
              >
                ✎
              </button>
              {p.email_confidence && (
                <span style={{ color: '#555', fontSize: 10, marginLeft: 4 }}>{p.email_confidence}</span>
              )}
            </>
          ) : (
            <button
              onClick={onEditEmail}
              style={{ background: 'transparent', border: '1px dashed #444', color: '#999', padding: '2px 6px', fontSize: 10, fontFamily: 'var(--font-mono), monospace', cursor: 'pointer' }}
            >
              + add email
            </button>
          )}
        </span>
        <span>
          <span style={{ color: '#555', marginRight: 6 }}>☎</span>
          {p.phone ?? '—'}
        </span>
        <a
          href={`/admin/prospects/${p.id}/activity`}
          style={{ color: p.opens_count > 0 ? '#22c55e' : '#666', textDecoration: 'none', fontWeight: p.opens_count > 0 ? 700 : 400 }}
          title={p.opens_count > 0 ? `Last opened: ${fmtDate(p.last_opened_at)}` : 'Activity'}
        >
          Opens: {p.opens_count}
        </a>
        <a
          href={`/admin/prospects/${p.id}/activity`}
          style={{ color: p.clicks_count > 0 ? '#3b82f6' : '#666', textDecoration: 'none', fontWeight: p.clicks_count > 0 ? 700 : 400 }}
          title={p.clicks_count > 0 ? `Last clicked: ${fmtDate(p.last_clicked_at)}` : 'Activity'}
        >
          Clicks: {p.clicks_count}
        </a>
        <span style={{ color: '#666' }}>
          Last touch: {fmtDate(p.last_outbound_at)}
        </span>
      </div>

      {/* Row 3: actions, grouped left-to-right by intent */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* PRIMARY actions per tab */}
        {tab === 'now' && p.status === 'audited' && p.email && (
          <PrimaryBtn onClick={onCreateDraft} disabled={drafting} colour="#ff3d00">
            {drafting ? 'Drafting…' : 'Create draft →'}
          </PrimaryBtn>
        )}
        {tab === 'now' && p.status === 'drafted' && p.draft_web_link && (
          <>
            <PrimaryBtn onClick={() => window.open(p.draft_web_link!, '_blank')} colour="#3b82f6">
              Open in Outlook ↗
            </PrimaryBtn>
            <PrimaryBtn onClick={onMarkSent} colour="#22c55e">
              ✓ Mark sent
            </PrimaryBtn>
          </>
        )}
        {tab === 'now' && p.status === 'drafted' && p.email && (
          <SecondaryBtn onClick={onCreateDraft} disabled={drafting} title="Re-create draft">
            Redraft
          </SecondaryBtn>
        )}

        {/* SECONDARY actions */}
        {p.audit_score !== null && (
          <SecondaryBtn onClick={onTestDraft} disabled={drafting} title="Send test draft to your email">
            Test draft
          </SecondaryBtn>
        )}
        {p.audit_score !== null && (
          <LinkBtn href={`/api/admin/prospects/${p.id}/pdf`} title="Open audit PDF">PDF</LinkBtn>
        )}
        {p.mockup_token && (
          <LinkBtn href={`/preview/${p.mockup_token}`} title="Open mockup preview">Mockup</LinkBtn>
        )}
        {p.mockup_token && (
          <SecondaryBtn
            onClick={onMockupLock}
            colour={p.mockup_locked ? '#22c55e' : undefined}
            title={p.mockup_locked ? 'Locked — will not regenerate on reaudit' : 'Lock so reaudit does not overwrite'}
          >
            {p.mockup_locked ? '🔒 Locked' : 'Lock mockup'}
          </SecondaryBtn>
        )}
        {p.has_previous_mockup && (
          <SecondaryBtn onClick={onMockupRestore} colour="#b45309" title="Swap current mockup with previous">
            Undo mockup
          </SecondaryBtn>
        )}
        {tab === 'now' && p.status === 'audited' && p.email && (
          <>
            <SecondaryBtn onClick={onEditSubject} disabled={drafting} title="Custom subject line">
              Edit subject
            </SecondaryBtn>
            <SecondaryBtn onClick={onSchedule} colour="#eab308" title="Schedule draft for later">
              Schedule
            </SecondaryBtn>
          </>
        )}
        {(p.status === 'audited' || p.status === 'audit_failed' || p.status === 'waf_blocked' || p.status === 'drafted' || p.status === 'sent' || p.status === 'replied' || p.status === 'skipped') && (
          <SecondaryBtn onClick={onReaudit} title="Re-run the audit">Reaudit</SecondaryBtn>
        )}

        {/* Spacer pushes destructive actions to the right */}
        <div style={{ flex: 1, minWidth: 12 }} />

        {/* HIDE / UNHIDE / DELETE on the right */}
        {tab !== 'not_now' && tab !== 'sent' && (
          <SecondaryBtn onClick={onHide} title="Park this prospect in Not now">
            Hide
          </SecondaryBtn>
        )}
        {tab === 'not_now' && (
          <PrimaryBtn onClick={onUnhide} colour="#22c55e">
            ↩ Bring back
          </PrimaryBtn>
        )}
        <DangerBtn onClick={onDelete} title="Delete permanently">Delete</DangerBtn>
      </div>
    </article>
  );
}

function PrimaryBtn({
  children,
  onClick,
  disabled,
  colour = '#ff3d00',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  colour?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: colour,
        color: '#fff',
        border: 'none',
        padding: '8px 14px',
        fontSize: 12,
        fontFamily: 'var(--font-mono), monospace',
        letterSpacing: 1,
        textTransform: 'uppercase',
        fontWeight: 700,
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({
  children,
  onClick,
  disabled,
  colour,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  colour?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: 'transparent',
        color: colour ?? '#ccc',
        border: `1px solid ${colour ?? '#444'}`,
        padding: '6px 10px',
        fontSize: 11,
        fontFamily: 'var(--font-mono), monospace',
        letterSpacing: 1,
        textTransform: 'uppercase',
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function DangerBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: 'transparent',
        color: '#666',
        border: '1px solid #333',
        padding: '6px 10px',
        fontSize: 11,
        fontFamily: 'var(--font-mono), monospace',
        letterSpacing: 1,
        textTransform: 'uppercase',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function LinkBtn({
  children,
  href,
  title,
}: {
  children: React.ReactNode;
  href: string;
  title?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      style={{
        background: 'transparent',
        color: '#ccc',
        border: '1px solid #444',
        padding: '6px 10px',
        fontSize: 11,
        fontFamily: 'var(--font-mono), monospace',
        letterSpacing: 1,
        textTransform: 'uppercase',
        textDecoration: 'none',
        display: 'inline-block',
      }}
    >
      {children}
    </a>
  );
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

export default ProspectsPanel;

'use client';

import { useCallback, useEffect, useState } from 'react';

interface HealthCheck {
  ok: boolean;
  label: string;
  value?: string;
  detail?: string;
}

interface DomainHealth {
  domain: string;
  spf: HealthCheck;
  dkim: HealthCheck;
  dmarc: HealthCheck;
  checkedAt: string;
}

interface Variant {
  id: string;
  label: string;
  template: string;
  active: boolean;
  created_at: string;
}

interface Suppression {
  email: string;
  source: string;
  reason: string | null;
  added_at: string;
}

export default function SettingsPage() {
  return (
    <div>
      <a href="/admin" style={{
        display: 'inline-block', marginBottom: 16, color: '#999',
        textDecoration: 'none', fontFamily: 'var(--font-mono), monospace',
        fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
      }}>← Prospects</a>

      <div style={{ borderBottom: '2px solid #ff3d00', paddingBottom: 12, marginBottom: 20 }}>
        <div style={kickerStyle}>OUTREACH SETTINGS</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#fafafa', marginTop: 4 }}>Guardrails + tuning.</div>
      </div>

      <DomainHealthSection />
      <VariantsSection />
      <SuppressionSection />
    </div>
  );
}

function DomainHealthSection() {
  const [h, setH] = useState<DomainHealth | null>(null);
  const load = useCallback(async () => {
    const r = await fetch('/api/admin/domain-health');
    if (r.ok) setH(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!h) return <Section title="DOMAIN HEALTH"><div style={{ color: '#666', padding: 12 }}>Checking DNS…</div></Section>;
  return (
    <Section title={`DOMAIN HEALTH · ${h.domain}`}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
        <HealthCard check={h.spf} />
        <HealthCard check={h.dkim} />
        <HealthCard check={h.dmarc} />
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: '#666' }}>
        Checked {new Date(h.checkedAt).toLocaleString('en-AU')}.
      </div>
    </Section>
  );
}

function HealthCard({ check }: { check: HealthCheck }) {
  const colour = check.ok ? '#22c55e' : '#ff3d00';
  return (
    <div style={{ border: `1px solid ${colour}`, padding: 12, background: '#0a0a0a' }}>
      <div style={{ ...kickerStyle, fontSize: 10, color: colour }}>
        {check.label} · {check.ok ? 'OK' : 'FAIL'}
      </div>
      {check.detail && <div style={{ color: '#fafafa', fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>{check.detail}</div>}
      {check.value && (
        <div style={{ color: '#666', fontSize: 10, marginTop: 6, fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {check.value}
        </div>
      )}
    </div>
  );
}

function VariantsSection() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newTemplate, setNewTemplate] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/subject-variants');
    if (r.ok) {
      const d = await r.json();
      setVariants(d.variants ?? []);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggle(id: string, active: boolean) {
    await fetch('/api/admin/subject-variants', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this subject variant? Past send analytics remain intact.')) return;
    await fetch(`/api/admin/subject-variants?id=${id}`, { method: 'DELETE' });
    load();
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim() || !newTemplate.trim()) return;
    await fetch('/api/admin/subject-variants', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newLabel.trim(), template: newTemplate.trim() }),
    });
    setNewLabel('');
    setNewTemplate('');
    load();
  }

  return (
    <Section title="SUBJECT VARIANTS (A/B)">
      <p style={{ color: '#999', fontSize: 12, marginBottom: 10 }}>
        Each send picks a random active variant. Use {'{{domain}}'} and {'{{businessName}}'} as placeholders.
      </p>
      <form onSubmit={create} style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: 8, marginBottom: 14 }}>
        <input placeholder="Label (e.g. C_urgent)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} style={input} />
        <input placeholder="Template (e.g. Bit of a worry on {{domain}})" value={newTemplate} onChange={(e) => setNewTemplate(e.target.value)} style={input} />
        <button type="submit" style={primaryBtn}>Add</button>
      </form>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #333' }}>
            <Th>Active</Th><Th>Label</Th><Th>Template</Th><Th />
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => (
            <tr key={v.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
              <Td>
                <input type="checkbox" checked={v.active} onChange={(e) => toggle(v.id, e.target.checked)} />
              </Td>
              <Td mono>{v.label}</Td>
              <Td>{v.template}</Td>
              <Td><button onClick={() => remove(v.id)} style={delBtn}>Del</button></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function SuppressionSection() {
  const [list, setList] = useState<Suppression[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/suppression');
    if (r.ok) {
      const d = await r.json();
      setList(d.suppressions ?? []);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return;
    await fetch('/api/admin/suppression', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, reason }),
    });
    setNewEmail('');
    setReason('');
    load();
  }
  async function remove(email: string) {
    if (!confirm(`Remove ${email} from suppression list?`)) return;
    await fetch(`/api/admin/suppression?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
    load();
  }

  return (
    <Section title={`SUPPRESSION LIST (${list.length})`}>
      <form onSubmit={add} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 14 }}>
        <input placeholder="email@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={input} />
        <input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} style={input} />
        <button type="submit" style={primaryBtn}>Block</button>
      </form>
      {list.length === 0 ? (
        <div style={{ color: '#666', fontSize: 12 }}>No suppressed addresses yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #333' }}>
              <Th>Email</Th><Th>Source</Th><Th>Reason</Th><Th>Added</Th><Th />
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.email} style={{ borderBottom: '1px solid #1a1a1a' }}>
                <Td mono>{s.email}</Td>
                <Td>{s.source}</Td>
                <Td>{s.reason ?? '—'}</Td>
                <Td>{new Date(s.added_at).toLocaleDateString('en-AU')}</Td>
                <Td><button onClick={() => remove(s.email)} style={delBtn}>Unblock</button></Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32, border: '1px solid #222', padding: 16, background: '#0f0f0f' }}>
      <div style={{ ...kickerStyle, marginBottom: 12 }}>{title}</div>
      {children}
    </section>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th style={{
      textAlign: 'left', padding: '8px 6px',
      fontFamily: 'var(--font-mono), monospace', fontSize: 10,
      letterSpacing: 1.5, textTransform: 'uppercase',
      color: '#ff3d00', fontWeight: 700,
    }}>{children}</th>
  );
}

function Td({ children, mono }: { children?: React.ReactNode; mono?: boolean }) {
  return (
    <td style={{
      padding: '8px 6px', color: '#fafafa',
      fontFamily: mono ? 'monospace' : undefined,
    }}>{children}</td>
  );
}

const kickerStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono), monospace',
  fontSize: 11,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: '#ff3d00',
};

const input: React.CSSProperties = {
  background: '#0a0a0a',
  color: '#fafafa',
  border: '1px solid #333',
  padding: '8px 10px',
  fontFamily: 'var(--font-display), system-ui',
  fontSize: 13,
  outline: 'none',
};

const primaryBtn: React.CSSProperties = {
  background: '#ff3d00',
  color: '#fff',
  border: 'none',
  padding: '8px 14px',
  fontFamily: 'var(--font-mono), monospace',
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const delBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#666',
  border: '1px solid #333',
  padding: '4px 8px',
  fontSize: 10,
  fontFamily: 'var(--font-mono), monospace',
  letterSpacing: 1,
  textTransform: 'uppercase',
  cursor: 'pointer',
};

'use client';

import { useCallback, useEffect, useState } from 'react';

interface Status {
  connected: boolean;
  userEmail?: string;
  accessTokenExpiresInSec?: number;
  scope?: string;
}

export default function M365StatusPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/m365-status', { cache: 'no-store' });
      const data = (await res.json()) as Status;
      setStatus(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    // If redirected back from OAuth, clean the query params
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('m365_connected') || url.searchParams.has('m365_error')) {
        const err = url.searchParams.get('m365_error');
        if (err) alert(`M365 connect failed: ${decodeURIComponent(err)}`);
        url.searchParams.delete('m365_connected');
        url.searchParams.delete('m365_error');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    }
  }, [refresh]);

  async function handleDisconnect() {
    if (!confirm('Disconnect M365? You\'ll need to sign in again to create drafts.')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/admin/m365-status', { method: 'DELETE' });
      await refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  if (!status) return null;

  return (
    <section
      style={{
        border: `2px solid ${status.connected ? '#22c55e' : '#ff3d00'}`,
        padding: 14,
        marginBottom: 20,
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: status.connected ? '#22c55e' : '#ff3d00',
            marginBottom: 4,
          }}
        >
          Microsoft 365 · {status.connected ? 'Connected' : 'Not Connected'}
        </div>
        {status.connected ? (
          <div style={{ fontSize: 13, color: '#fafafa' }}>
            Signed in as <strong>{status.userEmail}</strong>
            <span style={{ color: '#666', marginLeft: 10, fontFamily: 'var(--font-mono), monospace', fontSize: 11 }}>
              token expires in {Math.floor((status.accessTokenExpiresInSec ?? 0) / 60)}m
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#999' }}>
            Drafts + sends need a signed-in M365 user. Click Connect to sign in (one-off — refresh tokens last 90 days).
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {status.connected ? (
          <>
            <a
              href="/api/admin/m365-connect"
              style={{
                background: 'transparent',
                color: '#fafafa',
                border: '1px solid #fafafa',
                padding: '8px 14px',
                fontFamily: 'var(--font-mono), monospace',
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
              title="Re-consent if scopes changed"
            >
              Reconnect
            </a>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              style={{
                background: 'transparent',
                color: '#ff3d00',
                border: '1px solid #ff3d00',
                padding: '8px 14px',
                fontFamily: 'var(--font-mono), monospace',
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {disconnecting ? '…' : 'Disconnect'}
            </button>
          </>
        ) : (
          <a
            href="/api/admin/m365-connect"
            style={{
              background: '#ff3d00',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              fontFamily: 'var(--font-display), system-ui',
              fontWeight: 900,
              letterSpacing: 2,
              textTransform: 'uppercase',
              fontSize: 12,
              textDecoration: 'none',
            }}
          >
            Connect Microsoft 365 →
          </a>
        )}
      </div>
    </section>
  );
}

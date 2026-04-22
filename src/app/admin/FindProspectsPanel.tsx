'use client';

import { useState } from 'react';

interface PlaceSearchResult {
  id: string;
  displayName: string;
  formattedAddress: string | null;
  websiteUri: string | null;
  phone: string | null;
  rating: number | null;
  userRatingCount: number | null;
  primaryType: string | null;
  types: string[];
  businessStatus: string | null;
  location: { latitude: number; longitude: number } | null;
  existingProspectId: string | null;
  existingStatus: string | null;
}

interface SearchResponse {
  postcode: string;
  category: string;
  fromCache: boolean;
  fetchedAt: string | null;
  count: number;
  results: PlaceSearchResult[];
}

const CATEGORY_SUGGESTIONS = [
  'plumbers', 'electricians', 'roofers', 'painters', 'landscapers',
  'mechanics', 'dentists', 'physios', 'accountants', 'cafés',
  'hair salons', 'gyms', 'real estate agents', 'solicitors', 'vets',
  'garden centres', 'nurseries', 'childcare centres', 'florists',
  'tilers', 'carpenters', 'bakeries', 'butchers', 'chiropractors',
  'personal trainers', 'pet groomers', 'cleaners',
];

export default function FindProspectsPanel(props: { onAdded?: () => void }) {
  const [postcode, setPostcode] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<SearchResponse | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, string>>({}); // placeId -> prospectId

  async function runSearch(refresh: boolean) {
    if (!/^\d{4}$/.test(postcode.trim())) {
      setError('Postcode must be 4 digits.');
      return;
    }
    if (!category.trim()) {
      setError('Pick or type a category.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcode: postcode.trim(), category: category.trim(), refresh }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Search failed');
        setSearch(null);
      } else {
        setSearch(data);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(place: PlaceSearchResult) {
    setAdding(place.id);
    try {
      const res = await fetch('/api/admin/places/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place, postcode: postcode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Add failed: ${data.error ?? res.status}`);
      } else {
        setAdded((prev) => ({ ...prev, [place.id]: data.id }));
        props.onAdded?.();
      }
    } finally {
      setAdding(null);
    }
  }

  async function handleAddAll() {
    if (!search) return;
    const toAdd = search.results.filter(
      (r) => !r.existingProspectId && !added[r.id] && r.websiteUri,
    );
    if (toAdd.length === 0) {
      alert('Nothing to add (all already in DB, or no website).');
      return;
    }
    if (!confirm(`Add ${toAdd.length} prospects and queue audits?`)) return;

    for (const p of toAdd) {
      setAdding(p.id);
      try {
        const res = await fetch('/api/admin/places/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ place: p, postcode: postcode.trim() }),
        });
        const data = await res.json();
        if (res.ok) {
          setAdded((prev) => ({ ...prev, [p.id]: data.id }));
          props.onAdded?.();
        }
      } catch {
        // continue on transient errors
      }
    }
    setAdding(null);
  }

  return (
    <section style={{ border: '2px solid #ff3d00', padding: 20, marginBottom: 28, background: '#111' }}>
      <div style={labelStyle}>Find prospects — Google Places</div>

      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr auto auto', gap: 10, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Postcode"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          style={fieldStyle}
          inputMode="numeric"
        />
        <input
          type="text"
          placeholder="Category (e.g. plumbers, cafés)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={fieldStyle}
          list="category-suggestions"
        />
        <datalist id="category-suggestions">
          {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
        </datalist>
        <button
          onClick={() => runSearch(false)}
          disabled={loading || !postcode.trim() || !category.trim()}
          style={primaryBtn(loading)}
        >
          {loading ? 'Searching…' : 'Search →'}
        </button>
        {search && (
          <button
            onClick={() => runSearch(true)}
            disabled={loading}
            style={secondaryBtn}
            title="Bypass 7-day cache and re-fetch from Google"
          >
            Refresh
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {CATEGORY_SUGGESTIONS.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              background: category === c ? '#ff3d00' : 'transparent',
              color: category === c ? '#fff' : '#999',
              border: `1px solid ${category === c ? '#ff3d00' : '#333'}`,
              padding: '4px 10px',
              fontSize: 11,
              fontFamily: 'var(--font-mono), monospace',
              letterSpacing: 1,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ color: '#ff3d00', fontFamily: 'var(--font-mono), monospace', fontSize: 12, marginBottom: 8 }}>
          {error}
        </div>
      )}

      {search && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, color: '#999', letterSpacing: 1 }}>
              {search.count} results · {search.fromCache ? `cached ${fmtRelative(search.fetchedAt)}` : 'live'}
            </div>
            <button onClick={handleAddAll} disabled={adding !== null} style={secondaryBtn}>
              Add all with websites
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
            {search.results.map((r) => {
              const isAdded = added[r.id] || r.existingProspectId;
              const isClosed = r.businessStatus && r.businessStatus !== 'OPERATIONAL';
              return (
                <div
                  key={r.id}
                  style={{
                    border: `1px solid ${isAdded ? '#555' : '#333'}`,
                    padding: 12,
                    background: isAdded ? '#0a0a0a' : '#151515',
                    opacity: isClosed ? 0.5 : 1,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: '#fafafa' }}>
                    {r.displayName}
                  </div>
                  {r.formattedAddress && (
                    <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>{r.formattedAddress}</div>
                  )}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: '#bbb', marginBottom: 8 }}>
                    {r.rating !== null && (
                      <span>★ {r.rating.toFixed(1)} ({r.userRatingCount ?? 0})</span>
                    )}
                    {r.phone && <span>{r.phone}</span>}
                    {isClosed && <span style={{ color: '#ff3d00' }}>{r.businessStatus}</span>}
                  </div>
                  {r.websiteUri ? (
                    <a
                      href={r.websiteUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#3b82f6', fontSize: 11, textDecoration: 'none', display: 'block', marginBottom: 10, wordBreak: 'break-all' }}
                    >
                      {shortWebsite(r.websiteUri)}
                    </a>
                  ) : (
                    <div style={{ color: '#666', fontSize: 11, fontStyle: 'italic', marginBottom: 10 }}>
                      No website listed
                    </div>
                  )}
                  {isAdded ? (
                    <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10, letterSpacing: 1, color: '#22c55e', textTransform: 'uppercase' }}>
                      ✓ Added {r.existingStatus ? `· ${r.existingStatus}` : ''}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAdd(r)}
                      disabled={adding === r.id}
                      style={{ ...primaryBtn(adding === r.id), width: '100%', padding: '8px 12px', fontSize: 12 }}
                    >
                      {adding === r.id ? 'Adding…' : 'Add to outreach'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function shortWebsite(u: string): string {
  try {
    const url = new URL(u);
    return url.hostname.replace(/^www\./, '') + url.pathname.replace(/\/$/, '');
  } catch {
    return u;
  }
}

function fmtRelative(iso: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono), monospace',
  fontSize: 11,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: '#ff3d00',
  marginBottom: 12,
};

const fieldStyle: React.CSSProperties = {
  background: '#0a0a0a',
  color: '#fafafa',
  border: '1px solid #333',
  padding: '10px 12px',
  fontFamily: 'var(--font-display), system-ui',
  fontSize: 14,
  outline: 'none',
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    background: '#ff3d00',
    color: '#fff',
    border: 'none',
    padding: '10px 18px',
    fontFamily: 'var(--font-display), system-ui',
    fontWeight: 900,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontSize: 12,
    cursor: disabled ? 'wait' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}

const secondaryBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#fafafa',
  border: '1px solid #fafafa',
  padding: '8px 14px',
  fontFamily: 'var(--font-mono), monospace',
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  cursor: 'pointer',
};

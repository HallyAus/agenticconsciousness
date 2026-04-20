'use client';

/**
 * Referral capture.
 *
 * - Reads `?ref=CODE` (primary) or `?utm_source=CODE` (fallback) from the URL.
 * - Persists in localStorage for 30 days so the code survives multiple page
 *   views before a visitor eventually converts.
 * - Exposed so the cart can include the ref in the checkout POST body and
 *   surface it in Stripe Checkout Session metadata for attribution.
 */

const KEY = 'ac_ref';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_LEN = 64;

function sanitise(raw: string): string | null {
  const trimmed = raw.trim().slice(0, MAX_LEN);
  if (!trimmed) return null;
  // Keep it alphanumeric + dash/underscore only so ref codes stay URL/metadata safe.
  if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) return null;
  return trimmed;
}

interface Stored {
  ref: string;
  capturedAt: number;
}

function read(): Stored | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (typeof parsed.ref !== 'string' || typeof parsed.capturedAt !== 'number') return null;
    if (Date.now() - parsed.capturedAt > TTL_MS) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return { ref: parsed.ref, capturedAt: parsed.capturedAt };
  } catch {
    return null;
  }
}

function write(ref: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ref, capturedAt: Date.now() }));
  } catch {
    // localStorage blocked (Safari private mode etc.) — ignore.
  }
}

/**
 * Capture any ref/utm_source from the current URL, persist it, and return
 * the effective ref (newly captured or previously stored, whichever applies).
 * Safe to call repeatedly — idempotent.
 */
export function captureRefFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const candidate = params.get('ref') ?? params.get('utm_source');
  if (candidate) {
    const clean = sanitise(candidate);
    if (clean) {
      write(clean);
      return clean;
    }
  }
  return read()?.ref ?? null;
}

/** Read-only lookup. Returns the stored ref if still within TTL. */
export function getStoredRef(): string | null {
  return read()?.ref ?? null;
}

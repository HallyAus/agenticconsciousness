import { NextRequest, NextResponse } from 'next/server';
import { createHash, createHmac } from 'crypto';
import { getDb } from './db';

const ANON_MAX = 3;
const VERIFIED_DAILY_MAX = 20;
const COOKIE_NAME = 'ac_verified';
const ANON_COOKIE = 'ac_anon';
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days in seconds

export interface ToolAccessResult {
  allowed: boolean;
  tier: 'anonymous' | 'verified' | 'capped';
  remainingUses: number;
  totalUsesToday: number;
  requiresEmail: boolean;
  message?: string;
}

function getCookieSecret(): string {
  const secret = process.env.COOKIE_SECRET;
  if (!secret) throw new Error('COOKIE_SECRET env var is required');
  return secret;
}

export function getFingerprint(req: NextRequest): string {
  const ip = req.headers.get('cf-connecting-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const ua = req.headers.get('user-agent') || 'unknown';
  return createHash('sha256').update(`${ip}:${ua}`).digest('hex');
}

function getIp(req: NextRequest): string {
  return req.headers.get('cf-connecting-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

function signCookie(userId: number, email: string): string {
  const hmac = createHmac('sha256', getCookieSecret())
    .update(`${userId}:${email}`)
    .digest('hex');
  return `${userId}:${hmac}`;
}

function verifyCookie(cookieValue: string): { userId: number } | null {
  const parts = cookieValue.split(':');
  if (parts.length !== 2) return null;
  const userId = parseInt(parts[0], 10);
  if (isNaN(userId)) return null;

  // Look up the user to get their email for HMAC verification
  const db = getDb();
  const user = db.prepare('SELECT id, email, revoked_at FROM verified_users WHERE id = ?').get(userId) as { id: number; email: string; revoked_at: string | null } | undefined;
  if (!user) return null;
  if (user.revoked_at) return null;

  const expected = createHmac('sha256', getCookieSecret())
    .update(`${userId}:${user.email}`)
    .digest('hex');

  if (parts[1] !== expected) return null;
  return { userId };
}

export function setVerifiedCookie(res: NextResponse, userId: number, email: string): void {
  res.cookies.set(COOKIE_NAME, signCookie(userId, email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export function checkToolAccess(req: NextRequest, tool: string): ToolAccessResult {
  const db = getDb();
  const fingerprint = getFingerprint(req);
  const ip = getIp(req);

  // Check for verified user cookie
  const cookieValue = req.cookies.get(COOKIE_NAME)?.value;
  if (cookieValue) {
    const verified = verifyCookie(cookieValue);
    if (verified) {
      // Reset daily count if stale
      db.prepare("UPDATE verified_users SET daily_count = 0, daily_reset = date('now') WHERE id = ? AND daily_reset < date('now')").run(verified.userId);

      // Atomic increment
      const result = db.prepare(
        'UPDATE verified_users SET daily_count = daily_count + 1 WHERE id = ? AND daily_count < ? AND revoked_at IS NULL RETURNING daily_count, email'
      ).get(verified.userId, VERIFIED_DAILY_MAX) as { daily_count: number; email: string } | undefined;

      if (!result) {
        // Limit hit
        const user = db.prepare('SELECT daily_count FROM verified_users WHERE id = ?').get(verified.userId) as { daily_count: number } | undefined;
        return {
          allowed: false,
          tier: 'capped',
          remainingUses: 0,
          totalUsesToday: user?.daily_count || VERIFIED_DAILY_MAX,
          requiresEmail: false,
          message: "You've hit your daily limit. Book a consultation for unlimited access.",
        };
      }

      // Log usage
      db.prepare('INSERT INTO usage_log (fingerprint, email, tool, ip) VALUES (?, ?, ?, ?)').run(fingerprint, result.email, tool, ip);

      return {
        allowed: true,
        tier: 'verified',
        remainingUses: VERIFIED_DAILY_MAX - result.daily_count,
        totalUsesToday: result.daily_count,
        requiresEmail: false,
      };
    }
  }

  // Anonymous user
  // Ensure row exists
  db.prepare('INSERT OR IGNORE INTO anonymous_usage (fingerprint, use_count) VALUES (?, 0)').run(fingerprint);

  // Atomic increment
  const result = db.prepare(
    "UPDATE anonymous_usage SET use_count = use_count + 1, last_use = datetime('now') WHERE fingerprint = ? AND use_count < ? RETURNING use_count"
  ).get(fingerprint, ANON_MAX) as { use_count: number } | undefined;

  if (!result) {
    const usage = db.prepare('SELECT use_count FROM anonymous_usage WHERE fingerprint = ?').get(fingerprint) as { use_count: number } | undefined;
    return {
      allowed: false,
      tier: 'anonymous',
      remainingUses: 0,
      totalUsesToday: usage?.use_count || ANON_MAX,
      requiresEmail: true,
      message: 'Enter your email to continue using our free AI tools.',
    };
  }

  // Log usage
  db.prepare('INSERT INTO usage_log (fingerprint, tool, ip) VALUES (?, ?, ?)').run(fingerprint, tool, ip);

  return {
    allowed: true,
    tier: 'anonymous',
    remainingUses: ANON_MAX - result.use_count,
    totalUsesToday: result.use_count,
    requiresEmail: false,
  };
}

// For the /api/tool-usage endpoint (read-only, no increment)
export function getToolUsageState(req: NextRequest): { tier: string; remainingUses: number; totalUsesToday: number; maxUses: number } {
  const db = getDb();

  const cookieValue = req.cookies.get(COOKIE_NAME)?.value;
  if (cookieValue) {
    const verified = verifyCookie(cookieValue);
    if (verified) {
      db.prepare("UPDATE verified_users SET daily_count = 0, daily_reset = date('now') WHERE id = ? AND daily_reset < date('now')").run(verified.userId);
      const user = db.prepare('SELECT daily_count FROM verified_users WHERE id = ?').get(verified.userId) as { daily_count: number } | undefined;
      const count = user?.daily_count || 0;
      return { tier: 'verified', remainingUses: Math.max(0, VERIFIED_DAILY_MAX - count), totalUsesToday: count, maxUses: VERIFIED_DAILY_MAX };
    }
  }

  const fingerprint = getFingerprint(req);
  const usage = db.prepare('SELECT use_count FROM anonymous_usage WHERE fingerprint = ?').get(fingerprint) as { use_count: number } | undefined;
  const count = usage?.use_count || 0;
  return { tier: 'anonymous', remainingUses: Math.max(0, ANON_MAX - count), totalUsesToday: count, maxUses: ANON_MAX };
}

export function logToolUsage(fingerprint: string, email: string | null, tool: string, ip: string, tokensUsed?: number): void {
  const db = getDb();
  db.prepare('INSERT INTO usage_log (fingerprint, email, tool, ip, tokens_used) VALUES (?, ?, ?, ?, ?)').run(fingerprint, email, tool, ip, tokensUsed || 0);
}

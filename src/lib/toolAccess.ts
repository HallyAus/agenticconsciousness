import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { sql } from './pg';

const ANON_DAILY_LIMIT = 3;
const EMAIL_DAILY_LIMIT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export const VERIFIED_COOKIE_NAME = 'ac-tool-verified';
export const VERIFIED_COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days in seconds

export type AccessStatus =
  | { status: 'ok'; remaining: number; used: number; limit: number; email?: string }
  | { status: 'email_gate'; used: number; limit: number }
  | { status: 'capped'; email: string; used: number; limit: number };

export type UsageStatus =
  | { status: 'anonymous_ok'; remaining: number; used: number; limit: number }
  | { status: 'email_gate'; remaining: number; used: number; limit: number }
  | { status: 'verified_ok'; remaining: number; used: number; limit: number; email: string }
  | { status: 'capped'; remaining: number; used: number; limit: number; email: string };

// Called by API tool routes — checks access AND atomically logs the use
export async function checkToolAccess(req: NextRequest, toolId: string): Promise<AccessStatus> {
  const fingerprint = getFingerprint(req);
  const verifiedEmail = getVerifiedEmail(req);
  const dayStart = Date.now() - DAY_MS;

  if (verifiedEmail) {
    const rows = (await sql`
      SELECT COUNT(*)::int AS cnt FROM tool_access_logs
      WHERE email = ${verifiedEmail} AND used_at > ${dayStart}
    `) as { cnt: number }[];
    const cnt = rows[0]?.cnt ?? 0;

    if (cnt >= EMAIL_DAILY_LIMIT) {
      return { status: 'capped', email: verifiedEmail, used: cnt, limit: EMAIL_DAILY_LIMIT };
    }

    await sql`
      INSERT INTO tool_access_logs (fingerprint, email, used_at, tool_id)
      VALUES (${fingerprint}, ${verifiedEmail}, ${Date.now()}, ${toolId})
    `;

    return {
      status: 'ok',
      remaining: EMAIL_DAILY_LIMIT - cnt - 1,
      used: cnt + 1,
      limit: EMAIL_DAILY_LIMIT,
      email: verifiedEmail,
    };
  }

  // Anonymous
  const rows = (await sql`
    SELECT COUNT(*)::int AS cnt FROM tool_access_logs
    WHERE fingerprint = ${fingerprint} AND email IS NULL AND used_at > ${dayStart}
  `) as { cnt: number }[];
  const cnt = rows[0]?.cnt ?? 0;

  if (cnt >= ANON_DAILY_LIMIT) {
    return { status: 'email_gate', used: cnt, limit: ANON_DAILY_LIMIT };
  }

  await sql`
    INSERT INTO tool_access_logs (fingerprint, email, used_at, tool_id)
    VALUES (${fingerprint}, NULL, ${Date.now()}, ${toolId})
  `;

  return {
    status: 'ok',
    remaining: ANON_DAILY_LIMIT - cnt - 1,
    used: cnt + 1,
    limit: ANON_DAILY_LIMIT,
  };
}

// Called by /api/tool-usage — read-only, no logging
export async function getUsageStatus(req: NextRequest): Promise<UsageStatus> {
  const fingerprint = getFingerprint(req);
  const verifiedEmail = getVerifiedEmail(req);
  const dayStart = Date.now() - DAY_MS;

  if (verifiedEmail) {
    const rows = (await sql`
      SELECT COUNT(*)::int AS cnt FROM tool_access_logs
      WHERE email = ${verifiedEmail} AND used_at > ${dayStart}
    `) as { cnt: number }[];
    const used = rows[0]?.cnt ?? 0;
    const remaining = Math.max(0, EMAIL_DAILY_LIMIT - used);

    return used >= EMAIL_DAILY_LIMIT
      ? { status: 'capped', used, remaining: 0, limit: EMAIL_DAILY_LIMIT, email: verifiedEmail }
      : { status: 'verified_ok', used, remaining, limit: EMAIL_DAILY_LIMIT, email: verifiedEmail };
  }

  const rows = (await sql`
    SELECT COUNT(*)::int AS cnt FROM tool_access_logs
    WHERE fingerprint = ${fingerprint} AND email IS NULL AND used_at > ${dayStart}
  `) as { cnt: number }[];
  const used = rows[0]?.cnt ?? 0;
  const remaining = Math.max(0, ANON_DAILY_LIMIT - used);

  return used >= ANON_DAILY_LIMIT
    ? { status: 'email_gate', used, remaining: 0, limit: ANON_DAILY_LIMIT }
    : { status: 'anonymous_ok', used, remaining, limit: ANON_DAILY_LIMIT };
}

export function makeVerifiedCookie(email: string): string {
  const secret = process.env.COOKIE_SECRET;
  if (!secret) throw new Error('COOKIE_SECRET not set');

  const exp = Date.now() + VERIFIED_COOKIE_MAX_AGE * 1000;
  const payload = Buffer.from(JSON.stringify({ email, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function getFingerprint(req: NextRequest): string {
  const ip =
    (req.headers.get('x-forwarded-for')?.split(',')[0] ??
      req.headers.get('x-real-ip') ??
      req.headers.get('cf-connecting-ip'))
      ?.trim() || 'unknown';
  const ua = req.headers.get('user-agent') || '';
  return crypto
    .createHash('sha256')
    .update(`${ip}:${ua}`)
    .digest('hex')
    .slice(0, 32);
}

function getVerifiedEmail(req: NextRequest): string | null {
  const secret = process.env.COOKIE_SECRET;
  if (!secret) return null;

  const cookie = req.cookies.get(VERIFIED_COOKIE_NAME)?.value;
  if (!cookie) return null;

  try {
    const dot = cookie.lastIndexOf('.');
    if (dot < 0) return null;
    const payload = cookie.slice(0, dot);
    const sig = cookie.slice(dot + 1);

    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    const sigBuffer = Buffer.from(sig);
    const expectedBuffer = Buffer.from(expected);
    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      email?: string;
      exp?: number;
    };

    if (!data.email || !data.exp || Date.now() > data.exp) return null;
    return data.email;
  } catch {
    return null;
  }
}

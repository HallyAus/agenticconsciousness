# Tool Rate Limiting & Email Gate — Design Spec

> SQLite-backed rate limiting with email verification gate for free AI tools

## Date: 2026-03-29

## Problem

Current rate limiting uses in-memory Map (server) and localStorage (client). Both are trivially bypassed — memory resets on deploy, localStorage clears in incognito. No daily caps, no per-tool tracking, no cost visibility, no lead capture.

## Solution

Three-tier access system with SQLite persistence and email verification gate.

### Access Tiers

| Tier | Uses | Trigger |
|------|------|---------|
| Anonymous | 3 total (across all tools) | First visit |
| Verified | 20/day | After email verification |
| Capped | 0 | After daily limit hit — CTA to book consultation |

### UX Flow

1. **Uses 1-2**: Tool works normally. Subtle counter: "2 free uses remaining"
2. **Use 3**: Tool works. Warning: "1 free use remaining — enter your email to continue"
3. **Use 4 attempt**: Hard block. Email gate modal: "Enter your email to continue"
4. **Email submitted**: Verification email sent. Pending state: "Check your email"
5. **Verification link clicked**: Cookie set. 20/day unlocked. Tool works.
6. **Uses 1-19/day**: Counter shows remaining: "15 uses remaining today"
7. **Use 20 hit**: CTA block: "You've hit your daily limit. Book a consultation for unlimited access."

### Countdown Banner States

```
Anonymous, 2 remaining:  [dim]     "2 free uses remaining"
Anonymous, 1 remaining:  [yellow]  "Last free use — enter your email to continue"
Anonymous, 0 remaining:  [red]     Email gate modal (blocks tool)
Verified, >5 remaining:  [hidden]  No banner
Verified, 5 remaining:   [dim]     "5 uses remaining today"
Verified, 1 remaining:   [yellow]  "Last use today"
Verified, 0 remaining:   [red]     Consultation CTA block (replaces tool)
```

## Database Schema

SQLite file: `/app/data/ratelimit.db` (on Docker volume `ac-data`, survives restarts)

### Tables

```sql
CREATE TABLE IF NOT EXISTS anonymous_usage (
  fingerprint TEXT PRIMARY KEY,  -- SHA-256(IP + User-Agent)
  use_count INTEGER DEFAULT 0,
  first_use TEXT DEFAULT (datetime('now')),
  last_use TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS verified_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  verification_token TEXT UNIQUE,
  token_expires_at TEXT,
  verified_at TEXT,
  revoked_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  daily_count INTEGER DEFAULT 0,
  daily_reset TEXT DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL,
  email TEXT,
  tool TEXT NOT NULL,
  ip TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_usage_log_created ON usage_log(created_at);
CREATE INDEX idx_usage_log_email ON usage_log(email);
CREATE INDEX idx_usage_log_tool ON usage_log(tool);
```

## Server Architecture

### New: `src/lib/toolAccess.ts`

Replaces both `rate-limit.ts` and `toolRateLimit.ts`. Single function called by all tool API routes.

```typescript
interface ToolAccessResult {
  allowed: boolean;
  tier: 'anonymous' | 'verified' | 'capped';
  remainingUses: number;
  totalUsesToday: number;
  requiresEmail: boolean;
  message?: string;
}

function checkToolAccess(req: NextRequest, tool: string): Promise<ToolAccessResult>
```

**Logic:**

1. Extract fingerprint: `SHA-256(IP + User-Agent)`
2. Check for `ac_verified` cookie → if present, look up verified user
3. If verified user found:
   - Check `daily_reset` — if stale, reset `daily_count` to 0
   - If `daily_count >= 20`: return `{ allowed: false, tier: 'capped' }`
   - Else: increment `daily_count`, log usage, return allowed
4. If anonymous:
   - Look up `anonymous_usage` by fingerprint
   - If `use_count >= 3`: return `{ allowed: false, requiresEmail: true }`
   - Else: increment `use_count`, log usage, return allowed

### New: `src/lib/db.ts`

SQLite connection using `better-sqlite3` (synchronous, fast, no async overhead). Initialises tables on first call. Singleton pattern with `globalThis` to survive HMR.

```typescript
import Database from 'better-sqlite3';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database('/app/data/ratelimit.db');
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.exec(SCHEMA);
  }
  return db;
}
```

### New: `src/app/api/tool-auth/route.ts`

**POST** — accepts `{ email }`, creates unverified user, sends verification email.

- Validate email format
- Check if already verified → if so, set cookie and return success
- Generate token: `crypto.randomUUID()`, set `token_expires_at = datetime('now', '+24 hours')`
- Insert into `verified_users` with token and expiry
- Send verification email via Resend. **If Resend is not configured** (`RESEND_API_KEY` missing), auto-verify the email immediately and set cookie — development/staging mode. Log a warning.
- Return `{ success: true, message: "Check your email" }`

### New: `src/app/api/verify/route.ts`

**GET** `?token=xxx` — verifies email, sets cookie, redirects to /tools.

- Look up token in `verified_users`
- If not found: error page
- If `token_expires_at < datetime('now')`: expired error page with "Request a new link" button
- If `revoked_at` is set: rejected
- Set `verified_at = now()`, clear `verification_token`
- Set HTTP-only cookie: `ac_verified` = `{user_id}:{hmac}`, 90-day expiry, SameSite=Lax
- Redirect to `/tools?verified=1`
- **Cross-browser note:** Show a message on the redirect page: "You're verified! If you started on a different browser, go back and refresh the page."

### New: `src/app/api/tool-usage/route.ts`

**GET** — returns current usage state for the requesting user (anonymous or verified). Called by client to display countdown.

Returns: `{ tier, remainingUses, totalUsesToday, maxUses }`

### Updated: All 8 tool API routes

Replace:
```typescript
import { checkRateLimit } from '@/lib/rate-limit';
const rateLimit = checkRateLimit(ip);
```

With:
```typescript
import { checkToolAccess } from '@/lib/toolAccess';
const access = await checkToolAccess(req, 'invoice');
if (!access.allowed) {
  return NextResponse.json({
    error: access.message,
    requiresEmail: access.requiresEmail,
    tier: access.tier,
    remainingUses: access.remainingUses,
  }, { status: 429 });
}
```

After successful tool execution, log token usage:
```typescript
logToolUsage(fingerprint, email, 'invoice', ip, tokensUsed);
```

## Client Architecture

### New: `src/components/tools/ToolGate.tsx`

Wrapper component for all tools. Handles:

1. **Fetches usage state** on mount via `/api/tool-usage`
2. **Countdown banner** — renders above tool based on remaining uses
3. **Email gate modal** — shown when anonymous uses exhausted
4. **Verification pending** — polling state after email submitted
5. **Daily cap CTA** — shown when verified user hits 20/day
6. **Passes `onUse` callback** to child tool — called after each successful use to update local count

```tsx
<ToolGate toolId="invoice">
  <InvoiceScanner />
</ToolGate>
```

### States

```
loading       → Skeleton/spinner while fetching usage state
anonymous_ok  → Tool rendered + countdown banner (if <=3 remaining)
email_gate    → Modal overlay: email input + submit
pending       → "Check your email" with polling
verified_ok   → Tool rendered + countdown banner (if <=5 remaining)
capped        → CTA block replaces tool entirely
error         → Fallback message
```

### Email Gate Modal

- Full-screen overlay with dark backdrop
- Email input + "Continue" button
- Text: "Enter your email to keep using our free AI tools. We'll send a quick verification link."
- Subtext: "No spam. Unsubscribe anytime."
- Neural brutalist design: sharp edges, 2px red border, no border-radius

### Daily Cap CTA Block

Replaces the tool entirely:
- "You've used all 20 tools today."
- "Need more? Let's talk about how AI can transform your business."
- [Book a consultation →] button linking to /#contact
- "Your limit resets tomorrow."

## Verification Email

Subject: "Verify your email — Agentic Consciousness"

Body (plain + HTML):
```
Verify your email to continue using our free AI tools.

Click here to verify: {SITE_URL}/api/verify?token={token}

This link expires in 24 hours.

— Agentic Consciousness
ai@agenticconsciousness.com.au
```

Token expiry: 24 hours. After that, user must re-submit email.

## Fingerprinting

```typescript
function getFingerprint(req: NextRequest): string {
  const ip = req.headers.get('cf-connecting-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
  const ua = req.headers.get('user-agent') || 'unknown';
  return crypto.createHash('sha256').update(`${ip}:${ua}`).digest('hex');
}
```

Uses `cf-connecting-ip` (Cloudflare real IP) first, falls back to `x-forwarded-for`. Combined with User-Agent to distinguish users behind same NAT.

**Known limitation:** Changing User-Agent gives a fresh anonymous identity. Accepted trade-off — the email gate is the real enforcement. Anonymous tier is just a soft funnel, not a hard wall. Also set an `ac_anon` cookie with the fingerprint to make rotating harder without clearing cookies.

### Atomic Increment

Use atomic SQL to prevent race conditions at the boundary:

```sql
-- Anonymous: atomic check-and-increment
UPDATE anonymous_usage SET use_count = use_count + 1, last_use = datetime('now')
WHERE fingerprint = ? AND use_count < 3
RETURNING use_count;
-- If no rows returned → limit hit

-- Verified: atomic check-and-increment
UPDATE verified_users SET daily_count = daily_count + 1
WHERE id = ? AND daily_count < 20 AND revoked_at IS NULL
RETURNING daily_count;
-- If no rows returned → limit hit
```

## Cookie

```
Name: ac_verified
Value: {user_id}:{hmac_signature}
HttpOnly: true
Secure: true
SameSite: Lax
MaxAge: 31536000 (1 year)
Path: /
```

HMAC-signed with a dedicated `COOKIE_SECRET` env var (never share with other systems).

**HMAC payload:** `HMAC-SHA256(COOKIE_SECRET, user_id + ":" + email)` — signs both ID and email so cookie is bound to the specific account.

**Revocation:** If `revoked_at` is set on the `verified_users` row, reject the cookie server-side even though it's cryptographically valid. This allows banning abusive users.

**Cookie expiry:** 90 days (not 1 year). On each valid request, silently refresh the cookie to extend by another 90 days (sliding window).

## Migration Path

1. Delete `src/lib/toolRateLimit.ts` (client-side localStorage)
2. Keep `src/lib/rate-limit.ts` for non-tool routes (chat, contact, etc.)
3. All 8 tool routes switch to `checkToolAccess()`
4. Remove all `toolRateLimit` imports from tool components
5. Wrap tool components in `<ToolGate>`

## New Dependencies

- `better-sqlite3` — synchronous SQLite for Node.js. Small, fast, no async complexity.
- Add to `serverExternalPackages` in `next.config.ts` to avoid standalone tracing issues with native modules.

### Next.js Config Change

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  // ...
};
```

### Dockerfile Changes

Add build tools in deps stage for native module compilation on Alpine:

```dockerfile
FROM base AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci
```

In the runner stage, copy the native binding:

```dockerfile
COPY --from=builder /app/node_modules/better-sqlite3/build ./node_modules/better-sqlite3/build
COPY --from=builder /app/node_modules/better-sqlite3/binding.js ./node_modules/better-sqlite3/binding.js
```

## Operational Notes

### Startup Validation
`db.ts` must throw a clear error if `COOKIE_SECRET` env var is missing. Fail fast at startup, not on first request.

### SQLite Recovery
If the DB file becomes corrupted (power loss, disk full), delete `/app/data/ratelimit.db` — it will be recreated on next startup with empty state. Rate limiting data is ephemeral and acceptable to lose.

Run `PRAGMA integrity_check` on startup. Log a warning if it fails, then recreate the DB.

### Usage Log Retention
Delete `usage_log` rows older than 90 days. Run cleanup on DB init:
```sql
DELETE FROM usage_log WHERE created_at < datetime('now', '-90 days');
```

### Daily Reset Timezone
`daily_reset` uses UTC (`date('now')` in SQLite). Australian users (UTC+10/11) will see their limit reset at 10-11am local time, not midnight. Accepted trade-off — simpler than per-user timezone handling.

### CSRF Protection
New endpoints `/api/tool-auth` (POST) and `/api/tool-usage` (GET) must use `validateCsrf()` consistent with existing tool routes. The GET endpoint for `/api/verify` is exempt (link from email).

## Environment Variables

```
COOKIE_SECRET=  # HMAC key for cookie signing — REQUIRED (generate with openssl rand -base64 32)
```

## Files Changed/Created

### New Files
- `src/lib/db.ts` — SQLite connection + schema init
- `src/lib/toolAccess.ts` — access checking logic
- `src/app/api/tool-auth/route.ts` — email submission
- `src/app/api/verify/route.ts` — email verification
- `src/app/api/tool-usage/route.ts` — usage state endpoint
- `src/components/tools/ToolGate.tsx` — gate wrapper component

### Modified Files
- `src/app/api/tools/invoice/route.ts` — switch to checkToolAccess
- `src/app/api/tools/quote/route.ts` — same
- `src/app/api/tools/competitor/route.ts` — same
- `src/app/api/tools/email/route.ts` — same
- `src/app/api/tools/summarise/route.ts` — same
- `src/app/api/tools/meeting/route.ts` — same
- `src/app/api/tools/jobad/route.ts` — same
- `src/app/api/tools/contract/route.ts` — same
- `src/components/tools/ToolsShowcase.tsx` — wrap tools in ToolGate
- `src/components/tools/FeaturedTool.tsx` — wrap in ToolGate
- `package.json` — add better-sqlite3
- `Dockerfile` — add build deps for better-sqlite3 native module

### Deleted Files
- `src/lib/toolRateLimit.ts`

## Testing Plan

1. Anonymous user can use 3 tools, then gets email gate
2. Entering email sends verification (check Resend or logs)
3. Clicking verification link sets cookie, unlocks 20/day
4. Verified user can use 20 tools, then gets consultation CTA
5. Daily reset works (next day, count resets to 0)
6. Different tools are tracked separately in usage_log
7. Incognito/new browser gets new anonymous fingerprint (expected)
8. Cookie forgery rejected (invalid HMAC)
9. Expired verification tokens rejected
10. Build passes, Docker image builds with better-sqlite3

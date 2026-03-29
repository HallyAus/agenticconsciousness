# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.

## Last Updated

- **Date:** 2026-03-29
- **Branch:** master
- **Focus:** SQLite rate limiting + email verification gate for tools

## Accomplished

### This Session (2026-03-29)
- Replaced client-side localStorage rate limiting with server-side SQLite
- Anonymous users: 3 free tool uses per day (IP+UA fingerprint)
- Email-verified users: 20 free tool uses per day (HMAC cookie, 90-day sliding)
- `src/lib/db.ts` — SQLite via better-sqlite3, WAL mode, startup integrity check, 90-day log cleanup
- `src/lib/toolAccess.ts` — `checkToolAccess()` (increments + enforces), `getUsageStatus()` (read-only), `makeVerifiedCookie()`
- `/api/tool-auth` — email submission, token generation, Resend email, auto-verify fallback if no RESEND_API_KEY
- `/api/verify` — token verification, HMAC cookie set, cross-browser redirect page
- `/api/tool-usage` — read-only usage state for ToolGate polling
- `ToolGate.tsx` — shared context component with 5 states: loading/anonymous_ok/email_gate/verified_ok/capped
- All 8 tool API routes updated to use `checkToolAccess()` (402 email_gate, 429 capped)
- All 9 tool components migrated from `toolRateLimit` to `useToolAccess()` context
- `ToolsShowcase.tsx` and `FeaturedTool.tsx` wrapped with `ToolGate`
- Deleted `src/lib/toolRateLimit.ts`
- Dockerfile: added python3/make/g++ for native SQLite build + copy bindings to runner stage
- `next.config.ts`: added `serverExternalPackages: ['better-sqlite3']`
- TypeScript: zero type errors (`npx tsc --noEmit` passes clean)
- Note: `npm run build` fails in this dev environment due to Google Fonts network restriction (pre-existing, not a regression — production server has internet access)

### Previous Sessions
- Rebuilt /tools page: grid-of-cards → full-width hero sections per tool
- 8 AI-powered tools, dark/light theme, Stripe, proposals, email drip
- 53 pages, 20 API routes

## In Progress

- Nothing actively in progress

## Blocked

- Resend: needs domain DNS verification before emails actually send
- Stripe: needs live API keys
- Meta Pixel / Google Ads: needs account IDs
- `npm run build` in dev env: Google Fonts 403 (network restriction — works on server)

## Next Steps

1. **Deploy to production** — `docker build && docker-compose up -d`
2. **Set COOKIE_SECRET** in production `.env` — `openssl rand -hex 32`
3. Verify all 8 tools work on live site (rate limiting active)
4. Set up Resend domain verification (DNS records)
5. Add Stripe live keys + test checkout flow
6. Mobile testing on physical devices

## Context

- Server: /opt/agenticconsciousness/ (flat structure, no nesting)
- Docker volumes: ac-data (SQLite DB lives here), ac-blog, ac-proposals, ac-drip
- SQLite DB: `/app/data/tool-access.db` in production (`data/tool-access.db` in dev)
- Haiku for 7 fast routes, Sonnet for 8 complex routes
- parseAiJson handles markdown-wrapped JSON from Claude
- Docker nextjs user needs chown on /app/data and /app/content
- Cloudflare Tunnel: cf-ipcountry only (no city), using ip-api.com for geolocation
- COOKIE_SECRET must be set in production for email gate to work — without it, anonymous 3-use limit still enforced but no upgrade path

## Files Modified

```
Key new files:
  src/lib/db.ts
  src/lib/toolAccess.ts
  src/app/api/tool-auth/route.ts
  src/app/api/tool-usage/route.ts
  src/app/api/verify/route.ts
  src/components/tools/ToolGate.tsx

Modified:
  Dockerfile, next.config.ts, package.json
  All 8 src/app/api/tools/*/route.ts
  All 9 src/components/tools/*.tsx (tool components)
  src/components/tools/ToolsShowcase.tsx

Deleted:
  src/lib/toolRateLimit.ts
```

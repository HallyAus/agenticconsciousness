# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.

## Last Updated

- **Date:** 2026-04-21
- **Branch:** master (clean, pushed to origin)
- **Focus:** Short session — resumed after power cut. Verified outreach console state, fixed admin access in prod by getting `ADMIN_USERNAME` + `ADMIN_PASSWORD` into Vercel env.

## Accomplished

### This Session (2026-04-21 evening)

**1 commit on master (`afe31d9` memory log). No code changes.**

- Resumed from power-cut interruption. Walked through prior session (PostHog Purchase event + /admin outreach console phases 1-3) — all 3 feature commits (`36a532b`, `7d072ad`, `fdc6190`) were already on master before the cut, so nothing was lost.
- Audited Vercel production env vars against what the outreach code needs. Identified gap: `ADMIN_USERNAME` + `ADMIN_PASSWORD` were not set, so `/admin` was returning 503 "Admin not configured" (see `src/proxy.ts:30-32`).
- Daniel added `ADMIN_PASSWORD` then `ADMIN_USERNAME` via Vercel dashboard (both Production + Preview). Vercel auto-redeployed. Admin now accessible.
- Logged 2026-04-21 entry in `.claude/rules/memory-sessions.md`.

### Prior session (earlier 2026-04-21, pre-power-cut)

Already committed — see commits `36a532b`, `7d072ad`, `fdc6190`:

**PostHog server-side Purchase event (commit `36a532b`):**
- Stripe webhook fires server-side `Purchase` event, threading PostHog `distinct_id` via Stripe metadata.
- Conversion Funnel dashboard with 5 tiles: Audit→Purchase funnel, Book→Purchase funnel, Lead Volume by Source, Checkout Initiations, Revenue.

**/admin outreach console phase 1 (commit `7d072ad`):**
- Basic Auth gate in `src/proxy.ts`.
- `prospects` + `prospect_sends` tables on Neon.
- Extracted `audit-core.ts` from `/api/website-audit` route for reuse.
- mailto/text/role email scraper.

**Outreach phases 2 + 3 (commit `fdc6190`):**
- react-pdf audit renderer.
- Microsoft Graph client-credentials send (Mail.Send scoped to `daniel@`).
- 3-touch cadence Day 0 / +3 / +7 via Vercel cron with threaded `/reply` calls.
- Reply-poller cron every 2h.
- Token unsubscribe page.
- 20/day send cap (`SEND_DAILY_CAP` env override).

## Quality Gate

- **Typecheck:** clean.
- **Lint:** 2 errors, 1 warning — all pre-existing or non-blocking:
  - `src/app/admin/layout.tsx:26` — `<a href="/">` flagged by `@next/next/no-html-link-for-pages`. Arguably desirable (hard nav exits admin), but needs `eslint-disable-next-line` or swap to `<Link>`.
  - `src/components/tools/ToolGate.tsx:304` — `toolId` unused param, pre-existing.
  - `src/components/TrackingPixels.tsx:23` — `<img>` LCP warning, pre-existing (pixel fires, can't be next/image).
- **Tests:** no test suite in this project.
- **Build:** not run this session (no code changes).

## In Progress

- Nothing mid-flight.

## Blocked — **outreach flow is half-live**

Admin UI is accessible but the send pipeline will fail until these are set in Vercel:

| Env var | Used by | Failure mode |
|---|---|---|
| `M365_TENANT_ID` | `src/lib/graph.ts` | Send returns error, prospect row gets no `prospect_sends` entry |
| `M365_CLIENT_ID` | `src/lib/graph.ts` | Same |
| `M365_CLIENT_SECRET` | `src/lib/graph.ts` | Same |
| `M365_SENDER_EMAIL` | `src/lib/graph.ts` | Same |
| `CRON_SECRET` | `src/app/api/cron/outreach-followups`, `outreach-replies` | Cron endpoints 401, Day+3/+7 and reply-poll never fire |

Other standing blockers from prior sessions (unchanged):
- Cloudflare Email Obfuscation still returning 67 broken `/cdn-cgi/` links — needs disabling in CF dashboard.
- `GITHUB_TOKEN` + `BLOG_ADMIN_KEY` still empty in Vercel (actually GITHUB_TOKEN + BLOG_ADMIN_KEY are set — double-check values aren't placeholders) → `/api/blog/generate` status unclear.
- Proxmox decommission outstanding (low priority).
- `rk_live_51TN2Mm…` restricted Stripe key still technically needs rotation (was pasted in chat previously).

## Next Steps

1. **Wire M365 app-registration env vars** (`M365_TENANT_ID`, `M365_CLIENT_ID`, `M365_CLIENT_SECRET`, `M365_SENDER_EMAIL`). Without these the whole outreach send path fails silently.
2. **Set `CRON_SECRET`** and verify Vercel cron config (`vercel.json` crons section) hits the follow-up + reply-poll endpoints.
3. **Source the first batch of prospects.** Console exists but prospect ingestion isn't wired to any source yet — currently requires manual URL paste. Options: bulk CSV import, Apollo MCP pull, or Google Maps scraper.
4. **End-to-end outreach smoke test** — add one real prospect, click Audit, click Send, confirm the email lands, confirm `prospect_sends` row created, wait 3 days, confirm follow-up fires.
5. **Fix `src/app/admin/layout.tsx:26` lint error** — either swap to `<Link>` or add a targeted disable with a comment explaining why hard nav is intentional.
6. **HANDOFF from earlier 2026-04-20 — still valid:** verify WAF-blocked email, rotate restricted Stripe key, Firecrawl fallback for WAF sites, PostHog funnel defn in dashboard UI (events fire, funnel not drawn), Stripe automatic_tax swap, real client testimonials, deepDive for Adelaide + Gold Coast + 6 industry pages.

## Context

### Admin access
- URL: `https://agenticconsciousness.com.au/admin`
- Auth: HTTP Basic. Creds in Vercel env as `ADMIN_USERNAME` + `ADMIN_PASSWORD` (Production + Preview).
- Gate code: `src/proxy.ts` (Next 16 renamed middleware.ts → proxy.ts).
- Covers `/admin/*` UI + `/api/admin/*` routes. `X-Robots-Tag: noindex, nofollow, noarchive` on all admin responses.

### Outreach console file map
```
UI:        src/app/admin/page.tsx, src/app/admin/ProspectsPanel.tsx, src/app/admin/layout.tsx
Routes:    src/app/api/admin/prospects/route.ts              (list/create)
           src/app/api/admin/prospects/[id]/route.ts         (single)
           src/app/api/admin/prospects/audit/route.ts        (run audit)
           src/app/api/admin/prospects/[id]/send/route.ts    (Graph send)
           src/app/api/admin/prospects/[id]/pdf/route.ts     (react-pdf render)
Cron:      src/app/api/cron/outreach-followups/route.ts
           src/app/api/cron/outreach-replies/route.ts
Libs:      src/lib/graph.ts        (Graph client-credentials)
           src/lib/audit-core.ts   (shared audit logic)
           src/lib/pg.ts           (Neon pool)
DB:        prospects, prospect_sends (Neon)
```

### Learnings (condensed)
- Adding env vars in Vercel dashboard triggers an auto-redeploy — no manual action needed, but it does need the deploy to complete before the runtime can read the new value.
- `ADMIN_EMAIL` ≠ `ADMIN_USERNAME`. The codebase reads `process.env.ADMIN_USERNAME` specifically; don't rename.
- Next 16's middleware file is renamed to `src/proxy.ts` in this project — new contributors/agents looking for `middleware.ts` will come up empty.

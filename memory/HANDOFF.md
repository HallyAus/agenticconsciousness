# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.

## Last Updated

- **Date:** 2026-03-30
- **Branch:** master
- **Focus:** Massive audit session — site audit, mobile UI, light mode, rate limiting, marketing suite

## Accomplished

### This Session (2026-03-28 to 2026-03-30)

**Site Audit (squirrel scan — 62 → 82, Grade D → B):**
- Structured Data: Organization.logo fixed (0% → 100%)
- Accessibility: form labels, focus indicators, nav aria, list structure, select IDs
- Core SEO: titles <60 chars, descriptions 120-155 chars, og:image on all pages
- Content: pricing page expanded (300+ words), heading hierarchy, keyword variation
- E-E-A-T: author bylines on blog listing
- Security: EmailLink component to bypass Cloudflare email obfuscation
- Performance: Cache-Control immutable for static assets
- Links: footer links to all /for/ pages, fixed broken CSIRO/SHRM URLs
- Removed double Nav + Footer on 7 routes (layout already provided them)

**Mobile UI Audit (impeccable skills):**
- Touch targets: all buttons/inputs 44px+ on mobile (py-3 / max-sm:py-4)
- Breakpoints: replaced all max-[900px] with standard max-md (768px)
- Padding: max-sm:px-4 tier across all 30+ sections
- Font sizes: 180 replacements, minimum 12px on mobile, desktop bumped to 0.75-0.8rem
- Gaps: max-sm:gap-4/6 on tools and process components
- Textareas: reduced min-height on mobile
- CaseStudies grid: max-sm:grid-cols-1 (fixes 320px overflow)
- Hero counter: max-sm:max-w-full

**Light Mode Fix:**
- ThemeProvider: fixed always-dark bug (prefers-color-scheme now respected)
- Inputs: bg-ac-black → bg-ac-card (inputs were invisible on light bg)
- Borders: border-white/* → border-border-subtle (theme-aware)
- Ghost text: text-white/20 → text-text-ghost
- Hover text: hover:text-ac-black → hover:text-[#0a0a0a] (always dark)
- Contrast: light mode text-dim 50%→65%, text-ghost 15%→25%
- Process.tsx: fixed undefined bg-ac-bg class

**Rate Limiting & Email Gate (SQLite):**
- 3-tier access: 3 free anonymous → email verification → 20/day verified → consultation CTA
- SQLite on Docker volume (better-sqlite3, WAL mode, atomic SQL increments)
- HMAC-signed cookies (90-day sliding), IP+UA fingerprinting
- ToolGate wrapper component with 5 states
- All 8 tool routes updated, client-side toolRateLimit deleted
- Verification flow with Resend email (auto-verify fallback if unconfigured)
- Design spec: docs/superpowers/specs/2026-03-29-tool-rate-limiting-design.md

**Umami Analytics:**
- Dedicated VM setup (VM 700 on Proxmox)
- Cloudflare Tunnel route: analytics.agenticconsciousness.com.au
- Docker Compose updated with build args for NEXT_PUBLIC_UMAMI_* vars
- Setup scripts: setup-umami-vm.sh, generate-umami-env.sh
- Tracking script in layout.tsx (renders from env vars)

**Marketing Suite (200 pieces):**
- 30 SVG logos (primary, full, stacked, horizontal, badge, monogram, icon, watermark, knockout, minimal)
- 10 SVG favicons (16-512px + Apple touch icon)
- 60 social media templates (Facebook 12, Instagram 15, TikTok 8, LinkedIn 15, Twitter 10)
- 40 banners (15 web, 10 email, 15 ad creatives)
- 40 templates (10 quote cards, 6 service cards, 8 tool cards, 8 blog share, 8 stories)
- 20 business materials (business cards, letterhead, proposals, presentations)

**Infrastructure:**
- Deploy docs fixed: /opt/agenticconsciousness (no hyphen)
- .env not .env.local for Docker Compose
- Auto-deploy cron: git fetch + conditional pull + rebuild every 15 minutes

### Previous Sessions
- Rebuilt /tools page: grid-of-cards → full-width hero sections per tool
- 8 AI-powered tools, dark/light theme, Stripe, proposals, email drip
- 53 pages, 20 API routes, live at agenticconsciousness.com.au

## In Progress

- Nothing actively in progress

## Blocked

- **Cloudflare Email Obfuscation**: 67 broken /cdn-cgi/ links — disable in Cloudflare dashboard (Security → Settings)
- Resend: needs domain DNS verification before emails actually send
- Stripe: needs live API keys
- Meta Pixel / Google Ads: needs account IDs

## Next Steps

1. **Disable Cloudflare Email Obfuscation** (Security → Settings) — fixes 67 broken links, will push score to ~90+
2. Set COOKIE_SECRET in production .env: `openssl rand -base64 32`
3. Verify rate limiting works on live site (3 free → email gate → 20/day)
4. Set up Resend domain verification (DNS records)
5. Add Stripe live keys + test checkout flow
6. Mobile testing on physical devices (320px, 375px, iPad)
7. Test light mode on live site
8. Blog list structure a11y fix (markdown renderer)

## Context

- Server: /opt/agenticconsciousness/ (no hyphen)
- Umami: VM 700 at analytics.agenticconsciousness.com.au (192.168.1.234:3000)
- Docker volumes: ac-data (SQLite DB here), ac-blog, ac-proposals, ac-drip
- SQLite DB: /app/data/ratelimit.db in production
- Haiku for 7 fast routes, Sonnet for 8 complex routes
- COOKIE_SECRET required for email gate — without it, checkToolAccess throws
- better-sqlite3 needs python3/make/g++ in Docker deps stage
- Auto-deploy cron runs every 15 min on server

## Key Files This Session

```
New:
  src/lib/db.ts, src/lib/toolAccess.ts
  src/app/api/tool-auth/route.ts, src/app/api/verify/route.ts, src/app/api/tool-usage/route.ts
  src/components/tools/ToolGate.tsx, src/components/EmailLink.tsx
  scripts/setup-umami-vm.sh, scripts/generate-umami-env.sh, scripts/setup-umami.sh
  docs/superpowers/specs/2026-03-29-tool-rate-limiting-design.md
  marketing/ (200 files — logos, social, banners, templates, business)

Modified:
  Dockerfile, next.config.ts, docker-compose.yml, package.json
  src/app/globals.css (light mode contrast)
  src/components/ThemeProvider.tsx (light mode fix)
  All 8 src/app/api/tools/*/route.ts (rate limiting)
  ~45 component/page .tsx files (fonts, a11y, mobile, light mode)
  6 content/blog/*.json (descriptions)

Deleted:
  src/lib/toolRateLimit.ts
```

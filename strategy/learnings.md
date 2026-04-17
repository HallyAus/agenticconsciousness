# Project Learnings

> Things discovered during development. Gotchas, workarounds, and non-obvious knowledge.

## Learnings

- [2026-04-17] Vercel domain redirects can loop silently when both apex AND www are bound to a project. The dashboard UI's "redirect to primary" UX can end up with apex→www plus a separate www→apex 301 from Next.js, causing ERR_TOO_MANY_REDIRECTS. Diagnose via `GET /v9/projects/{id}/domains?teamId=...` (look at each domain's `redirect` field); fix via `PATCH /v10/projects/{id}/domains/{domain}?teamId=...` with `{ "redirect": null }`. Can't be done via the Vercel CLI; must use the REST API directly.
- [2026-04-17] `@neondatabase/serverless` throws immediately on `neon('')` when DATABASE_URL is empty. Next.js imports every API route at build time for page-data collection, so a missing secret in CI (or any build without the env var) will blow up the whole build. Fix: lazy-init via Proxy/getter — `src/lib/pg.ts` defers the `neon()` call until first use. Build needs the module to export something; runtime needs the actual connection.
- [2026-04-17] Next.js `alternates.canonical` set in root `layout.tsx` CASCADES to every child page that doesn't override it. This causes Google Search Console to report every subpage as "Alternate page with proper canonical tag" — because their canonical all point back to the homepage. Fix: remove canonical from root layout; require each page to set its own `alternates: { canonical: '...' }`. Also set `dynamicParams = false` on catch-all `[slug]` routes so unknown slugs 404 instead of rendering a generic page with no canonical.
- [2026-04-17] Vercel env var existence in the CLI output does NOT mean it's populated — `vercel env ls` shows the key with "Encrypted" even when the value is empty string. Always `vercel env pull` + check `[len=N]` before assuming a secret is set. If it's len=0, the code will fall back to the "not configured" branch silently.
- [2026-04-17] Lighthouse CI perf budgets need CI-realistic values, not production-Vercel values. Ubuntu runner with `next start`, no CDN, no Edge caching will never hit the same LCP/FCP as Vercel's actual serving. Treat CI Lighthouse as a regression alarm with loose budgets (LCP 6s, script 450KB, etc.); use Vercel Analytics + PostHog for real performance SLOs.
- [2026-03-28] GEO audit: llms.txt spec recommends a llms-full.txt companion with extended detail. The llms.txt file should reference it. robots.txt should reference llms.txt for AI crawler discovery.
- [2026-03-28] Blog post JSON files should include modifiedAt field separate from publishedAt — Article schema dateModified should reflect actual content updates, not just publication date.
- [2026-03-28] HowTo schema is valuable for step-by-step guide content — Google and AI systems can extract individual steps as structured data for rich results.
- [2026-03-25] Docker nextjs user (UID 1001) can't write to mounted volumes unless directories are pre-created with chown in Dockerfile — caused "EACCES permission denied" on tool-stats.json
- [2026-03-25] Haiku model JSON failures were actually permission errors, not model unreliability — the parse error masked the real fs.writeFileSync error in incrementToolStat
- [2026-03-25] parseAiJson needs 5 extraction methods — Claude wraps JSON in markdown backticks, adds preamble text, or returns partial JSON. First-brace-to-last-brace greedy match is the most reliable fallback
- [2026-03-25] Cloudflare Tunnel (free plan) only provides cf-ipcountry header, not cf-ipcity or cf-ipregion — use ip-api.com for city-level geolocation (free, 45 req/min)
- [2026-03-25] Tool component interfaces MUST match the exact AI response JSON structure — field name mismatches (e.g. "summary" vs "meetingSummary", flat vs nested "wordCount") cause silent client-side crashes that show the error.tsx boundary
- [2026-03-25] Always use optional chaining (?.) on every AI response field access and every .map() call — AI responses can have unexpected shapes
- [2026-03-25] ToggleGroup sends capitalised values ("Standard") but API routes may validate against lowercase ("standard") — normalise with .toLowerCase() before validation
- [2026-03-25] Next.js 16 removed `next lint` command — use `eslint src --ext .ts,.tsx` directly
- [2026-03-25] Next.js 16 App Router disallows `ssr: false` in dynamic imports inside Server Components — need a ChatbotWrapper client component
- [2026-03-24] Cloudflare Tunnel must have a "Published application" route configured in Zero Trust dashboard — without it, returns 503. Service URL must be `http://ac-web:3000` (container name), NOT `localhost:3000`
- [2026-03-24] The tunnel service type must be HTTP not HTTPS — the Next.js container serves plain HTTP, Cloudflare handles SSL at the edge
- [2026-03-24] next-sitemap postbuild generates sitemap.xml and robots.txt in public/ — these need to be committed to git for Docker builds
- [2026-03-24] Server deployment path is /opt/agenticconsciousness/ (flat) — initial clone created nested directory which caused confusion
- [2026-03-29] NEXT_PUBLIC_ env vars must be Docker build args, not just runtime env — they're baked into JS at build time. Add to both Dockerfile ARG and docker-compose.yml build.args
- [2026-03-29] better-sqlite3 needs python3/make/g++ in Alpine Docker deps stage for native module compilation, plus serverExternalPackages in next.config.ts for standalone mode
- [2026-03-29] Cloudflare Email Obfuscation replaces mailto: links with /cdn-cgi/l/email-protection# URLs that 404 — either disable in dashboard or use client-side JS to assemble email addresses at runtime
- [2026-03-29] Docker Compose reads .env by default (not .env.local) — .env.local is a Next.js dev convention only. Deploy docs had this wrong.
- [2026-03-29] Squirrel audit scans the LIVE site, not local — changes must be deployed before re-auditing shows improvement
- [2026-03-30] hover:text-ac-black breaks in light mode because ac-black maps to var(--bg-page) which is light beige — use hover:text-[#0a0a0a] for always-dark hover text
- [2026-03-30] Form inputs using bg-ac-black disappear in light mode because page bg is the same colour — use bg-ac-card instead for theme-safe input backgrounds

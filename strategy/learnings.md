# Project Learnings

> Things discovered during development. Gotchas, workarounds, and non-obvious knowledge.

## Learnings

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

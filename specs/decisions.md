# Architecture Decisions

> ADR-style log of significant technical decisions. Claude adds entries when decisions are made.

## Format

```
### ADR-[N]: [Title] — [YYYY-MM-DD]
**Status:** Accepted | Superseded | Deprecated
**Context:** [Why this decision was needed]
**Decision:** [What was chosen]
**Consequences:** [Trade-offs and follow-up work]
```

## Decisions

### ADR-008: Server deployment path is /opt/agenticconsciousness (flat) — 2026-03-24
**Status:** Accepted
**Context:** Initial clone created a nested agenticconsciousness/agenticconsciousness directory. Fixed to flat structure.
**Decision:** Server path is `/opt/agenticconsciousness/` — docker-compose.yml and .env live here. No nesting.
**Consequences:** All server commands run from `/opt/agenticconsciousness/`.

### ADR-007: GitHub repo is HallyAus/agenticconsciousness — 2026-03-24
**Status:** Accepted
**Context:** Need a remote to push to.
**Decision:** Remote origin is https://github.com/HallyAus/agenticconsciousness
**Consequences:** Set as origin before first push.

### ADR-006: Build in 3 phases — 2026-03-24
**Status:** Accepted
**Context:** Reference docs cover build, production hardening, and deployment as one big pass
**Decision:** Split into (1) site build, (2) production hardening (SEO/security/perf), (3) Proxmox deployment
**Consequences:** Can ship and iterate. Each phase is a separate work cycle.

### ADR-005: Approach B — faithful design, pragmatic implementation — 2026-03-24
**Status:** Accepted
**Context:** Reference docs are very prescriptive. Need to decide how closely to follow.
**Decision:** Follow visual design and copy exactly. Use modern Next.js patterns where they improve the implementation.
**Consequences:** May diverge from reference code snippets but visual result will match.

### ADR-004: In-memory rate limiter, no Upstash — 2026-03-24
**Status:** Accepted
**Context:** Chat API needs rate limiting. Upstash adds external dependency.
**Decision:** Simple in-memory Map-based rate limiter. Suitable for single-instance Proxmox deployment.
**Consequences:** Won't persist across restarts. Fine for this use case.

### ADR-003: next/font/google instead of CSS @import — 2026-03-24
**Status:** Accepted
**Context:** Reference docs use Google Fonts CSS import which is render-blocking.
**Decision:** Use next/font/google for automatic font optimisation from day one.
**Consequences:** Eliminates render-blocking request. Fonts served from same origin.

### ADR-002: Chatbot lazy-loaded from day one — 2026-03-24
**Status:** Accepted
**Context:** Chatbot JS is heavy and not needed for initial page render.
**Decision:** Dynamic import with ssr: false from the start.
**Consequences:** Better initial load performance. Chatbot loads after page is interactive.

### ADR-001: Contact email ai@agenticconsciousness.com.au — 2026-03-24
**Status:** Accepted
**Context:** Reference docs had hello@agenticconsciousness.com (without .au). User corrected.
**Decision:** All references use ai@agenticconsciousness.com.au
**Consequences:** Must update all references in build output.

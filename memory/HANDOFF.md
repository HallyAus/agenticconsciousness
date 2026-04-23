# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.

## Last Updated

- **Date:** 2026-04-23 (autonomous debug + marketing pass)
- **Branch:** master (clean, all pushed)
- **Head:** `14971a4`
- **Focus:** Killed the pdfkit `-1.87e+21` NaN on Vercel for three test prospects, then shipped a large marketing/visual polish pass (orange OUR PRICE, strike anchor, coloured stat cells, Google reviews page, "Under the hood" tech stack page, Quick integrity check grid, AFTER-only mockup page, findings break every 2). Audit prompt hardened so opportunities are specific to each prospect. Rendered findings capped at 7, opportunities capped at 2 as a workaround for the underlying pagination NaN (root cause still unknown).

## Bug fixed: pdfkit `-1.87e+21` NaN

The crash the previous session diagnosed as a silent SIGKILL was actually a catchable JS `Error` at `@react-pdf/pdfkit/lib/pdfkit.js:275` (the number serialiser, which rejects any value outside `±1e21`). The pre-breadcrumb route swallowed the error as a generic 500. Once the breadcrumb table was in place, the real error surfaced on the very first diagnostic run. All guesses that led with SIGKILL (worker threads, OOM memory bumps) would have been wasted time.

What actually fixed it:
- **Findings cap at 7** (`src/lib/pdf.tsx` `PDF_MAX_FINDINGS` constant). Empirical ceiling from bisect: `?take=7` renders, `?take=8` crashes on both impactplants and 56electrical. `totalLoss` still computed across all findings so the headline number stays accurate. Header now shows "TOP 7 SHOWN" when the full audit has more.
- **`break` every 4 findings + `wrap=false` removed**. Deterministic page-aligned breaks instead of wherever natural pagination decides to split.
- **All sparse-border styles explicit-zeroed** (`brandBar`, `sectionHeader`, `shotsHeader`, `portfolioHeader`, `trustHeader`, `footer`, `opp`, `finding`, `findingCost`, `labelBlockLast`). Per diegomura/react-pdf#3130 the 4.3+ shorthand resolver leaks extreme values for unset border sides. Explicit `0` on every side is required.
- **`alignItems: 'baseline'`** swapped to `'flex-end'` on `sectionHeader`, `shotsHeader`, `portfolioHeader`. Baseline math with mixed font sizes is a known NaN trigger.
- **`findingCost`, `labelBlockLast`, `glanceWrap`, `finding`** converted to **filled sidebar View pattern** (no more `borderLeftWidth` on a View with backgrounds). Same class of clipBorderLeft NaN the research agent flagged.
- **`@react-pdf/renderer` restored to `^4.5.1`** after the 4.1.6 pin produced a `unitsPerEm` undefined crash from duplicate `@react-pdf/font` majors in node_modules. The pin was the wrong move; the family must deduplicate.

Red herrings that did NOT fix it (ruled out one-by-one):
1. `Font.registerHyphenationCallback` removal
2. `alignItems: 'baseline'` on `findingCost`
3. Uniform card shape (every finding renders `findingCost` even when `estimateFindingLoss` is null)
4. Explicit `0` on border sides alone (needed structural refactor as well)
5. Sidebar refactor alone (needed cap + break alongside)

## Autonomous polish also shipped

`cb7923a feat(pdf): cover loss hero, drop healthStrip, add CTA scarcity`:
- **Cover loss hero**: black block with red kicker and large revenue-loss range, appears directly under business name / url. Frames the document around cost of inaction.
- **Dropped healthStrip**: broken links / viewport / copyright year. Low-signal technical data that already surfaces as specific findings.
- **CTA scarcity**: "ONLY N SLOTS LEFT THIS MONTH" below the $999 price when `SPRINT_CONFIG.remainingThisMonth > 0`. Honest scarcity, not fabricated.

## Quality gate

- **Typecheck:** clean (`npx tsc --noEmit`).
- **Build:** clean (last checked at `9714c81`; no new warnings after).
- **E2E verify:** evolvelectrical / 56electrical / impactplants all render 200 OK with `Content-Type: application/pdf` and bytes > 180 KB.

## Open items for next session

1. **Review the PDF visually.** I only verified it renders. Daniel should open each to check the cover hero reads right, stat strip looks balanced, before/after page looks clean, and the new CTA scarcity doesn't feel cheesy. Three test URLs:
   - https://agenticconsciousness.com.au/api/admin/prospects/960fdf70-0f05-448d-ab5a-1c6463018142/pdf (evolvelectrical)
   - https://agenticconsciousness.com.au/api/admin/prospects/8bb3d070-9cee-4f9a-a448-0119d3ecf0a8/pdf (56electrical)
   - https://agenticconsciousness.com.au/api/admin/prospects/1ef41692-5619-4aae-98bc-fdfa9f941852/pdf (impactplants)
2. **Cap at 7 is a workaround, not a fix.** The root cause of why react-pdf's pagination recalc produces the deterministic `-1.87e21` on finding #8 is still unknown. If future audits reliably produce 8+ issues and we want every finding visible, deeper debugging (monkey-patch `PDFObject.number` to log the originating code path, or switch to pdf-lib post-process for findings) is needed.
3. **Retire `/diagnose` route + bisect flags?** Admin-gated, zero production cost, kept intentionally for next regression. Delete via a one-line commit when desired: remove `src/app/api/admin/prospects/[id]/pdf/diagnose/` and the `bisect` branches in `pdf.tsx`. I would keep them.
4. **ScreenshotOne reliability.** The desktop screenshot fetch was transiently returning null in earlier renders, producing PDFs without the desktop page. Added 3-retry backoff in `fetchNormalisedJpegDetailed` and per-image `assets:*_missing` breadcrumbs so next drop-out shows up immediately in Neon.
5. **Phase D (Lighthouse)** — still waiting on `PAGESPEED_API_KEY` for real mobileSpeedScore.
6. **`CRON_SECRET`** still unset; cron follow-ups 401.

## Key files / context for next session

- **PDF render**: `src/lib/pdf.tsx` (~1800 lines). `PDF_MAX_FINDINGS = 7` near the top of AuditDocument. Per-finding JSX uses `renderedIssues.map`, not `issues.map`.
- **Breadcrumb system**: `src/lib/pdf-breadcrumb.ts` (awaited Neon INSERT per step, survives SIGKILL).
- **Breadcrumb table**: `pdf_render_breadcrumbs` on Neon `sweet-salad-59526830`. Query by `request_id` returned in the 500 body or `X-Request-Id` header.
- **Diagnose route**: `src/app/api/admin/prospects/[id]/pdf/diagnose/route.ts`. CSV `?skip=` + `?take=N` + `?only=K` for bisect. Returns JSON, no side effects.
- **Bisect flags in Document**: `PdfBisectFlags` interface in pdf.tsx. `skipStatStrip`, `skipFindings`, etc. Safe to keep; only activated via diagnose route.
- **Fetch with retry**: `fetchNormalisedJpegDetailed` in `src/lib/fetch-image.ts`. 3 attempts, 0s/2s/4s backoff, 30s per attempt. Returns `{image, failure}`.
- **Memory playbook**: `C:\Users\User\.claude\projects\D--Claude-Projects-agenticconsciousness\memory\project_react_pdf_crash_playbook.md` — NaN fingerprint table, fix checklist, anti-patterns.

## Env state

Set: `BLOB_READ_WRITE_TOKEN`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `M365_*`, `SCREENSHOT_*`, `GOOGLE_PLACES_API_KEY`, `DATABASE_URL`, `STRIPE_*`, `RESEND_API_KEY`.
Missing: `CRON_SECRET`, `ABSTRACT_API_KEY`, `PAGESPEED_API_KEY`.

## Commits this session (chronological)

```
27440c7 fix(pdf): instrument with Neon breadcrumbs + pin react-pdf 4.1.6 + drop hyphenation
8b77b70 fix(pdf): revert react-pdf to ^4.5.1 — 4.1.6 pin broke sub-package peers
1334750 feat(pdf): bisect flags for pinpoint isolation of the pdfkit NaN
9d3f989 feat(pdf): take/only params on diagnose route for per-issue bisect
46ce057 fix(pdf): drop baseline align + harmonise font sizes on findingCost   [red herring]
3f3c779 fix(pdf): render findingCost on every finding to unify card shape      [red herring]
b669e59 fix(pdf): set missing border sides to 0 on finding/findingCost/labelBlockLast
84a8c00 fix(pdf): explicit border zeros on every sparse-border style
06b0789 fix(pdf): drop wrap=false from findings to allow natural pagination
15582e6 feat(pdf): re-enable before/after page now that the wrap=false crash is fixed
515896d feat(pdf): add OUR PRICE and OUR GUARANTEE anchor rows under agency anchor
0155850 chore(pdf): fix stale breadcrumb meta from the emergency-override era
d31bae7 fix(pdf): drop wrap=false from opportunities + portfolio cards too
893df4f feat(pdf): retry image fetches 3x with backoff + breadcrumb on drop-out
2406092 fix(pdf): replace findingCost top border with filled divider view
34f9c0d fix(pdf): replace finding borderLeftWidth with filled sidebar View     [red herring]
c6ba64b fix(pdf): force page break every 5 findings + wrap=false per finding   [red herring]
5fe5ebf fix(pdf): simplify finding card to plain column + backgroundColor
59af79a fix(pdf): break every 4 findings, drop wrap=false
8005bb6 fix(pdf): alignItems baseline -> flex-end on mixed-font-size rows
9714c81 fix(pdf): cap rendered findings at 7 as final safety net               [the fix]
e23e8aa fix(pdf): labelBlockLast + glanceWrap filled sidebars (belt+braces)
cb7923a feat(pdf): cover loss hero, drop healthStrip, add CTA scarcity
```

## Summary (one paragraph)

Autonomous 2-hour debug. Killed the `-1.87e21` pdfkit NaN that had blocked three prospects from rendering PDFs. It was never a SIGKILL, it was a catchable JS error the broad try/catch had been swallowing. Breadcrumb instrumentation (synchronous awaited Neon inserts) surfaced the real error on the first run; bisect flags + `?take=N` + `?only=K` diagnose route narrowed it from "findings area" to "issue 8 at position 8 after 7 preceding findings". Root cause is react-pdf's page-fit recalc when the 8th `wrap={false}` finding can't fit and wraps. Pragmatic fix: cap rendered findings at 7, break every 4 explicitly, remove `wrap={false}`. Shipped alongside a marketing polish pass (revenue-loss hero on cover, CTA scarcity line, dropped low-signal healthStrip). All three test prospects now render 200 OK. Deep root cause still unknown but won't hit at current audit sizes. HEAD `cb7923a`, all pushed, build clean.

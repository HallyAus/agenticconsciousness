# Project: Agentic Consciousness

> AI consulting website — neural brutalist design, Claude-powered chatbot, Proxmox deployment

## Owner

Daniel — Printforge (printforge.com.au) — Linux / Proxmox / Docker

## Quick Reference

| Need | Location |
|------|----------|
| Full PRD / product spec | `strategy/project-prd.md` |
| Design spec | `docs/superpowers/specs/2026-03-24-agentic-consciousness-site-design.md` |
| Build reference | `reference/AGENTIC-CONSCIOUSNESS-CLAUDE-CODE-INSTRUCTIONS.md` |
| Production reference | `reference/AGENTIC-CONSCIOUSNESS-PRODUCTION-MEGA-PROMPT.md` |
| Deployment reference | `reference/AGENTIC-CONSCIOUSNESS-PROXMOX-DEPLOY.md` |
| HTML prototype | `reference/agentic-consciousness-v2.html` |
| Project memory & learnings | `strategy/learnings.md` |
| Task tracking | `strategy/todo-list.md` |
| Architecture decisions | `specs/decisions.md` |
| Known bugs | `specs/bugs/` |
| My profile & preferences | `.claude/rules/memory-*.md` (auto-loaded) |
| Session handoff state | `memory/HANDOFF.md` |

## Stack

- **Runtime:** Node.js 20
- **Framework:** Next.js 15 (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **Animation:** Framer Motion
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`)
- **Icons:** lucide-react
- **Package Manager:** npm
- **Deployment:** Docker + Cloudflare Tunnel on Proxmox

## Commands

```bash
npm run dev       # dev server (localhost:3000)
npm run build     # production build
npm run lint      # eslint
npm run start     # production server
```

## Design Rules

1. ZERO rounded corners — no border-radius anywhere
2. Three colours only — black (#0a0a0a), white (opacity variants), red (#ff3d00)
3. Typography IS the design — Be Vietnam Pro weight 900 headlines, weight 300 body, Space Mono for labels
4. 2px red borders are structural
5. 2px gaps between grid blocks
6. Ghost elements (6% opacity) for depth
7. Hover states immediate (0.2s max)
8. Animations restrained — fadeInUp, red line scaleX, no spectacle

## Key Info

- **Domain:** agenticconsciousness.com.au
- **Contact email:** ai@agenticconsciousness.com.au
- **Owner:** Daniel Hall — 21+ years industry experience

## Workflow

1. **Session start:** Read `memory/HANDOFF.md`
2. **Before coding:** Check reference docs in `reference/`
3. **During work:** Update memory files AS YOU GO
4. **After changes:** Run `npm run build` to verify
5. **Session end:** Update `memory/HANDOFF.md`

## Commit Format

`type(scope): description`
Types: feat, fix, refactor, docs, test, chore

## Key Warnings

- Never add border-radius to anything
- Contact email is `ai@agenticconsciousness.com.au` (not .com)
- Anthropic SDK must NEVER appear in client bundles (server-side only)
- Always update HANDOFF.md before ending a session

---

### Auto-Update Memory (MANDATORY)

**Update memory files AS YOU GO, not at the end.** When you learn something new, update immediately.

| Trigger | Action |
|---------|--------|
| User shares a fact about themselves | Update `.claude/rules/memory-profile.md` |
| User states a preference | Update `.claude/rules/memory-preferences.md` |
| A decision is made | Update `.claude/rules/memory-decisions.md` with date |
| Completing substantive work | Add to `.claude/rules/memory-sessions.md` |
| Discovery, gotcha, or workaround | Add to `strategy/learnings.md` |
| Bug found | Create file in `specs/bugs/` |
| Architecture decision | Add entry to `specs/decisions.md` |

**DO NOT ASK. Just update the files when you learn something.**

---

### Progressive Disclosure

Do NOT read everything upfront. Load context as needed:
- Product questions: `strategy/project-prd.md`
- Architecture: `specs/decisions.md`
- Build reference: `reference/AGENTIC-CONSCIOUSNESS-CLAUDE-CODE-INSTRUCTIONS.md`
- Where we left off: `memory/HANDOFF.md`
- What we've learned: `strategy/learnings.md`

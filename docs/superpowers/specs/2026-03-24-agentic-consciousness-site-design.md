# Agentic Consciousness — Site Design

## Overview

AI consulting website for Agentic Consciousness (Daniel Hall). Neural brutalist aesthetic — black (#0a0a0a), white (opacity variants), red (#ff3d00). Zero rounded corners. Claude-powered chatbot. Deploys to Proxmox via Docker + Cloudflare Tunnel.

## Decisions

- **Approach:** Faithful to visual design and copy from reference docs, pragmatic improvements on implementation (next/font, lazy-loaded chatbot, rate limiting from day one)
- **Domain:** `agenticconsciousness.com.au`
- **Contact email:** `ai@agenticconsciousness.com.au` (changed from reference docs)
- **Chatbot:** Real Anthropic API from the start (key available)
- **Rate limiting:** In-memory (no Upstash) — suitable for single-instance Proxmox deployment
- **Fonts:** `next/font/google` (not CSS @import) — eliminates render-blocking request

## Stack

- Next.js 15 (App Router, TypeScript)
- Tailwind CSS
- Framer Motion (scroll animations)
- `@anthropic-ai/sdk` (server-side only)
- `lucide-react` (icons)
- Docker + Cloudflare Tunnel (production)

## Architecture

Single-page marketing site with sections: Nav, Hero, Services, Process, Case Studies, About, CTA, Footer. Chatbot as floating overlay. One API route (`/api/chat`).

### Component Breakdown

| Component | Type | Notes |
|-----------|------|-------|
| Nav | client | Fixed, mobile hamburger, backdrop blur |
| Hero | server + ScrollReveal wrapper | Staggered fadeInUp, counters |
| Services | server | 3-column grid, 2px gaps |
| Process | server | 4-column grid, hover red lines |
| CaseStudies | server | 3-column rows with metrics |
| About | server | 2x2 grid |
| CTA | server | Bordered box, ghost watermark |
| Footer | server | Minimal, red top border |
| Divider | client | Intersection Observer animated red line |
| Chatbot | client (dynamic import, ssr: false) | Claude API, typing indicator |
| ScrollReveal | client | Framer Motion whileInView wrapper |

### API Route: /api/chat

- POST only, validates message array shape
- In-memory rate limiter: 10 req/min, 50 req/hr per IP
- Conversation trimmed to last 20 messages
- Input length validation: max 2000 chars per message
- Structured JSON logging of token usage
- System prompt stored as constant

## Design Rules (from reference)

1. Zero rounded corners — no border-radius anywhere
2. Three colours only — black, white (opacity variants), red (#ff3d00). Exception: green status dot (#39ff14) on chatbot
3. Typography IS the design — weight 900 headlines, weight 300 body, Space Mono for labels
4. 2px red borders are structural — dividers, frames, hierarchy markers
5. 2px gaps between blocks — grid gaps with dark background showing through
6. Ghost elements for depth — large faded numbers, watermarks at 6% opacity
7. Hover states immediate — 0.2s max, bg shift or colour invert
8. Animations restrained — fadeInUp on scroll, red line scaleX, no spectacle

## Build Phases

1. **Phase 1 (this cycle):** Next.js project init, all components, chatbot API, design system, runs locally
2. **Phase 2 (next cycle):** Production hardening — SEO, structured data, security headers, performance audit
3. **Phase 3 (next cycle):** Proxmox deployment — Dockerfile, docker-compose, Cloudflare Tunnel

## Source of Truth

- Visual design: `reference/agentic-consciousness-v2.html`
- Full build spec: `reference/AGENTIC-CONSCIOUSNESS-CLAUDE-CODE-INSTRUCTIONS.md`
- Production spec: `reference/AGENTIC-CONSCIOUSNESS-PRODUCTION-MEGA-PROMPT.md`
- Deployment spec: `reference/AGENTIC-CONSCIOUSNESS-PROXMOX-DEPLOY.md`

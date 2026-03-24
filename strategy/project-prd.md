# Agentic Consciousness — Product Requirements Document

## Vision

AI consulting website for Agentic Consciousness, an Australian AI consulting business founded by Daniel Hall (21+ years industry experience). Neural brutalist design with a live Claude-powered chatbot. The site itself is proof of what the business delivers.

## Target Users

- Australian business owners exploring AI adoption (SMBs, enterprise, tradies, startups)
- Decision makers researching AI consulting options
- Anyone who wants to understand what AI can do for their business

## Core Features

### MVP (Must Have)

1. Single-page marketing site — Nav, Hero, Services, Process, Case Studies, About, CTA, Footer
2. Claude-powered chatbot — floating overlay, real Anthropic API, rate limited
3. Neural brutalist design — black/white/red, zero rounded corners, heavy typography
4. Mobile responsive — all sections and chatbot work on mobile
5. Scroll animations — fadeInUp on sections, animated red dividers

### V2 (Production Hardening)

1. SEO — sitemap, robots.txt, JSON-LD structured data, OG images
2. FAQ page with rich snippets
3. Blog infrastructure (placeholder routing)
4. Security headers, CSP, rate limiting enhancements
5. Analytics (Plausible/Umami self-hosted or Vercel Analytics)
6. Error boundaries, custom 404

### V3 (Deployment)

1. Docker build (standalone output)
2. docker-compose with Cloudflare Tunnel
3. Proxmox VM deployment
4. CI/CD via update script or GitHub Actions
5. Monitoring and backup

## Technical Requirements

- Next.js 15 App Router, TypeScript, Tailwind CSS
- Deploys to Proxmox VM via Docker + Cloudflare Tunnel
- Anthropic API for chatbot (Claude Sonnet)
- Rate limiting: 10 req/min, 50 req/hr per IP on chat API
- Standalone Next.js output for Docker
- Must work behind Cloudflare proxy

## Non-Goals

- No CMS — content is hardcoded for now
- No user accounts or authentication
- No payment processing
- No database — chat is stateless (client-side history only)

## Success Metrics

- Site loads and renders correctly on desktop and mobile
- Chatbot sends/receives messages via Claude API
- Lighthouse scores: Performance >90, SEO >95, Accessibility >90
- Docker container builds and serves on port 3000
- Accessible via Cloudflare Tunnel at agenticconsciousness.com.au

## Open Questions

- Google Business Profile setup (post-launch)
- Real case studies to replace placeholders (as clients are onboarded)
- Analytics platform choice (Plausible vs Umami vs Vercel)

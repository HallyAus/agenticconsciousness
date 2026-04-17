# Task Tracking

> Quick reference for current work priorities.

## In Progress

- [ ] Stripe keys — populate empty Vercel env vars (live `sk_live_/pk_live_/whsec_`)
- [ ] `GITHUB_TOKEN` + `BLOG_ADMIN_KEY` for `/api/blog/generate` GitHub-API publishing path

## Up Next

- [ ] Decommission Proxmox (docker compose down, remove Tunnel routes, shut VM 700)
- [ ] Update Stripe webhook URL to `https://agenticconsciousness.com.au/api/stripe/webhook` once live keys land
- [ ] Disable Cloudflare Email Obfuscation (67 broken `/cdn-cgi/` links)
- [ ] Content depth parity: add deepDive to `/for/{adelaide,gold-coast,manufacturing,professional-services,trades,healthcare,retail,finance}`
- [ ] Stripe Payment Element inline checkout (replace redirect)
- [ ] Exit-intent memory cookie so returning visitors skip the popup
- [ ] Simplify pricing — 8 cards is dense, consider collapse/toggle
- [ ] PostHog funnel analysis after ~1 week of data
- [ ] Mobile testing on physical devices (iPhone, Android at 320/375/iPad)
- [ ] Generate more blog content (target: 20 posts for SEO)
- [ ] Add real client testimonials
- [ ] Set up Meta Pixel + Google Ads IDs
- [ ] Flag Printforge apex DNS issue to Daniel (printforge.com.au unreachable, only www)

## Blocked

- [ ] Stripe payments — blocked by: live API keys empty in Vercel
- [ ] Blog auto-publish via GitHub API — blocked by: `GITHUB_TOKEN` + `BLOG_ADMIN_KEY` empty
- [ ] Retargeting ads — blocked by: Meta/Google account setup

## Done (Recent)

- [x] Migrate Proxmox → Vercel + Neon Postgres — 2026-04-17
- [x] Replace Umami analytics with PostHog (project 385449) — 2026-04-17
- [x] Custom domain cutover + redirect-loop fix via Vercel API — 2026-04-17
- [x] Homepage Portfolio section (5 live projects with screenshots) — 2026-04-17
- [x] Pricing: 5 quick-start offers ($300-$1,500) — 2026-04-17
- [x] Deep-dive content for /for/{sydney,melbourne,brisbane,perth} — 2026-04-17
- [x] SEO canonical cascade fix (site-wide alternate canonical removed) — 2026-04-17
- [x] Tool-agnostic FAQ entry for pos-7.7 keyword "tool agnostic ai consultant" — 2026-04-17
- [x] Facebook marketing PNG/JPG assets at 3x retina — 2026-04-17
- [x] CI stabilisation: Lighthouse perf budgets + real routes + lazy pg init — 2026-04-17
- [x] Full site build — Next.js, all components, chatbot — 2026-03-24
- [x] Production hardening — SEO, security, accessibility — 2026-03-24
- [x] AI greeting with geo-awareness — 2026-03-24
- [x] AI Business Audit tool — 2026-03-24
- [x] Smart Contact Form — 2026-03-24
- [x] Blog infrastructure + 8 posts — 2026-03-24/25
- [x] AI Tools page (8 tools) — 2026-03-25
- [x] Dark/light theme — 2026-03-25
- [x] Footer redesign (3-tier) — 2026-03-25
- [x] Animations (glitch, counters, scroll progress) — 2026-03-25
- [x] Dynamic hero personalisation + 12 landing pages — 2026-03-25
- [x] Exit intent popup — 2026-03-25
- [x] Proposal builder + Stripe + pricing page — 2026-03-25
- [x] Email drip system — 2026-03-25
- [x] Resend email utility + Plausible analytics — 2026-03-25
- [x] Privacy + Terms pages — 2026-03-25
- [x] Multiple security + SEO audits — 2026-03-25
- [x] Tool response shape fixes + parseAiJson — 2026-03-25
- [x] Favicon for Google + explicit declarations — 2026-03-25

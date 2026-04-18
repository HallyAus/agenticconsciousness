# Task Tracking

> Quick reference for current work priorities.

## In Progress

- [ ] Nothing actively — wrap-up clean

## Up Next

- [ ] Confirm Stripe webhook URL in dashboard matches `https://agenticconsciousness.com.au/api/stripe/webhook` and `STRIPE_WEBHOOK_SECRET` in Vercel
- [ ] Run PageSpeed Insights on deployed site post hero/pricing/portfolio refresh — Glitch + font loading first suspects if mobile < 75
- [ ] Define PostHog funnel: Pageview → PricingCardView → InitiateCheckout → PurchaseComplete
- [ ] Switch to Stripe Tax `automatic_tax: { enabled: true }` once origin + AU GST registration configured in dashboard
- [ ] Collect 3-5 real client testimonials with quote + outcome + title
- [ ] Decommission Proxmox (docker compose down, remove Tunnel routes, shut VM 700)
- [ ] Disable Cloudflare Email Obfuscation (67 broken `/cdn-cgi/` links)
- [ ] Content depth parity: add deepDive to `/for/{adelaide,gold-coast,manufacturing,professional-services,trades,healthcare,retail,finance}`
- [ ] `GITHUB_TOKEN` + `BLOG_ADMIN_KEY` for `/api/blog/generate` GitHub-API publishing path
- [ ] Stripe Payment Element inline checkout (replace redirect)
- [ ] Exit-intent memory cookie so returning visitors skip the popup
- [ ] Sticky book-a-call bar on scroll (design call needed — breaks brutalist no-chrome rule)
- [ ] Mobile testing on physical devices (iPhone, Android at 320/375/iPad)
- [ ] Generate more blog content (target: 20 posts for SEO)
- [ ] Set up Meta Pixel + Google Ads IDs
- [ ] Flag Printforge apex DNS issue to Daniel (printforge.com.au unreachable, only www)

## Blocked

- [ ] Blog auto-publish via GitHub API — blocked by: `GITHUB_TOKEN` + `BLOG_ADMIN_KEY` empty
- [ ] Retargeting ads — blocked by: Meta/Google account setup

## Done (Recent)

- [x] Dark-mode colour refresh — warm charcoal + off-white, WCAG AA audited — 2026-04-19
- [x] CRO audit + execution — hero value prop, pricing reorder, MOST BOOKED flag, outcome copy, PostHog event wiring — 2026-04-19
- [x] Vercel a11y/composition/web-guidelines audit fixes — focus-visible rings, aria-hidden glyphs, role=alert on checkout errors, PricingCards as server component, Stripe client module-scope — 2026-04-19
- [x] Stripe: 8 live products + prices created, checkout refactored to price IDs, GST line item added (was undercharging) — 2026-04-19
- [x] Pricing page: process grid + trust index + FAQ + 3 refactor passes (feature / tidy / impeccable) — 2026-04-19
- [x] Portfolio: +3 projects (SellMyOwnHome, Flat White Index, Printforge CRM), puppeteer capture pipeline, 3-col dense grid, outcome lines — 2026-04-19
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

# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.

## Last Updated

- **Date:** 2026-04-19
- **Branch:** master
- **Focus:** Stripe live products + GST fix, pricing-page redesign (3 passes), portfolio expansion + density, a11y audit, CRO audit + execution, dark-mode colour refresh

## Accomplished

### This Session (2026-04-19)

**11 commits, 37 files changed (~1,550 inserts / ~280 deletes).** Full
detail in `memory/sessions/2026-04-19.md`; summary below.

**Stripe:**
- Created 8 live products + AUD prices in Stripe via MCP. Mapping lives
  in `src/app/api/stripe/checkout/route.ts`.
- Checkout route now uses `price: priceId` (dashboard products), adds a
  10% GST line item (the site advertised `+ GST` but the session was
  only billing the base — bug fix). Stripe client hoisted to module
  scope for Fluid Compute instance reuse.

**Pricing page — three passes:**
- Added process grid, trust block (fine print), 8-question FAQ with
  FAQPage JSON-LD, bestFor microcopy per starter, closing CTA.
- Tidied — dropped redundant Pick-your-path, unified headers/spacing,
  removed duplicate FAQ schema (kept on `/faq`).
- Impeccable-lens break — process section rendered as an editorial
  numeric index (huge ghost-red numerals, 2px red rules), trust block
  as 2-col typographic index with red left-rules. Kills 9 cards off
  the page.
- **Reordered so prices render first**, process below.
- `MOST BOOKED` flag on AI Stack Audit ($500).

**Portfolio:**
- Capture script rewritten on puppeteer-core — emulates reduced motion,
  injects animation-kill CSS, waits for networkidle2, scrolls to trigger
  IntersectionObserver reveals, then snaps back. All 5 original captures
  regenerated clean.
- 3 new projects added: SellMyOwnHome.ai, Flat White Index, Printforge
  CRM. Grid is now 1 hero + 3 pairs + 1 hero (8 cards).
- Denser 3-col grid on desktop (was 2-col), 4:3 aspect (was 16:10),
  `p-5` (was `p-8`), line-clamp-3 descriptions.
- Outcome line added per card (2px red left rule).

**A11y + audit pass (Vercel's three rulesets):**
- `CheckoutButton` extracted as client leaf; `PricingCards` is now a
  pure server component.
- `alert()` replaced with inline `role="alert" aria-live="polite"`.
- Focus-visible rings on every paid CTA.
- `aria-hidden` on decorative bullets, arrows, tier numerals.
- `rel="noopener noreferrer"` on external portfolio links.
- `motion-reduce` escape on portfolio hover zoom.
- `Processing...` → `Processing…`.
- `transition-all` → `transition-colors`.

**CRO audit + execution:**
- Hero H1 swapped to `AI THAT / SHIPS.` with brand demoted to mono
  kicker. Location variants now `AI FOR / {CITY}.` Description renders
  as a real subhead (was held in state but never shown before). Counter
  fluff replaced with concrete facts. CTA copy: "Free consultation" →
  "Book a 30-min discovery call".
- `trackEvent` dispatches to PostHog alongside Meta Pixel + Google Ads.
- `EmailLink` fires `ContactIntent` on click with a `source` prop.

**Dark mode refresh:**
- WCAG 2.1 audit of every text/bg pair — all AA-compliant. Moved pure
  near-black to warm charcoal (`#0a0a0a` → `#141311`), pure white to
  off-white (`#ffffff` → `#fafaf8`). Neutrals now subtly tinted toward
  brand red-orange. Primary text ratio drops 19.8:1 → 17.7:1.

## In Progress

- Nothing actively in progress.

## Blocked

- **Cloudflare Email Obfuscation** — still returning 67 broken `/cdn-cgi/`
  links. Disable in Cloudflare dashboard (Security → Settings). Site
  improvement pending Daniel's action.
- **`GITHUB_TOKEN` + `BLOG_ADMIN_KEY`** empty in Vercel env → `/api/blog/generate`
  returns 503. Fine-grained PAT (`contents:write` on HallyAus/agenticconsciousness)
  + any random `BLOG_ADMIN_KEY` needed.
- **Proxmox decommission** — `docker compose down` at `/opt/agenticconsciousness/`,
  remove Cloudflare Tunnel routes, shut VM 700. Keep one week as rollback.

## Next Steps

1. **Confirm Stripe webhook URL** — Daniel set Stripe keys in Vercel
   directly. Verify webhook endpoint in Stripe dashboard points at
   `https://agenticconsciousness.com.au/api/stripe/webhook` and that the
   signing secret matches Vercel env `STRIPE_WEBHOOK_SECRET`.
2. **Run PageSpeed Insights** on the deployed site post all the hero /
   pricing / portfolio changes. Glitch component + font loading are the
   first suspects if mobile perf < 75.
3. **Define PostHog funnel** in the dashboard (code is ready): Pageview →
   PricingCardView → InitiateCheckout → PurchaseComplete. `ContactIntent`
   already fires on mailto clicks.
4. **Stripe Tax** — once Tax Settings (origin + AU GST registration) are
   configured in Stripe dashboard, swap the manual GST line item for
   `automatic_tax: { enabled: true }` in `src/app/api/stripe/checkout/route.ts`.
5. **Real client testimonials** — the pricing + hero both lack them. Ask
   3–5 clients for a quote + outcome + title for the new social-proof
   band.
6. **Content depth parity** — Adelaide, Gold Coast + 6 industry pages
   (Manufacturing, Professional Services, Trades, Healthcare, Retail,
   Finance) still need deepDive sections like Perth/Sydney/Melbourne/Brisbane.
7. **Conversion polish v2**: Stripe Payment Element inline checkout
   (replace redirect), exit-intent memory cookie, sticky book-a-call bar
   on scroll (deliberately skipped this session — breaks the brutalist
   no-chrome rule, needs a design call).
8. **Mobile testing on physical devices** (iPhone, Android at 320/375/iPad).
9. **Flag to Daniel:** `printforge.com.au` apex DNS is still dead (only
   www resolves).

## Context

### Platform
- **Frontend/API:** Vercel project `agenticconsciousness` under team
  `danieljhall-mecoms-projects` (`prj_buiBKqIjBMim4VNehiwl9p6HaVAH`).
- **Database:** Neon project `sweet-salad-59526830` (us-east-1).
- **Analytics:** PostHog project `385449`
  (`phc_Aq7QRuBcVJWbjJhXiFvnV8AFrky5xtUFGQ5Gf3pTAJS4`), host
  `https://us.i.posthog.com`.
- **Stripe:** account `acct_1TN2MmPTv8VxN1HB` ("Agentic Consciousness"),
  live mode. 8 products created 2026-04-17.
- **DNS:** Cloudflare grey-cloud → `cname.vercel-dns.com`. Apex serves;
  www 301s to apex.

### Stripe product / price IDs (live)

| packageId | Product ID | Price ID | A$ |
|---|---|---|---|
| claude-workshop | prod_ULk9nAFdNphocE | price_1TN2frPTv8VxN1HBYRWqlFNG | 300 |
| claude-code-setup | prod_ULk950lOZ32FWh | price_1TN2fsPTv8VxN1HB4Lf70QAI | 450 |
| ai-stack-audit | prod_ULk9YEk2hR5NHL | price_1TN2fxPTv8VxN1HBKqdq3lRa | 500 |
| claude-project-build | prod_ULk9F52kIdr2f6 | price_1TN2fyPTv8VxN1HBlMMGkmKM | 750 |
| automation-sprint | prod_ULk9edLkANFYOB | price_1TN2fyPTv8VxN1HB2pxyAvDL | 1,500 |
| strategy-deposit | prod_ULkAdWJOIWa64a | price_1TN2fzPTv8VxN1HBIKPTW8YK | 1,500 |
| implementation-deposit | prod_ULkANjMeI4yBEY | price_1TN2g0PTv8VxN1HBCTqIiDg8 | 2,500 |
| automation-deposit | prod_ULkAwGmB1ew1VG | price_1TN2g1PTv8VxN1HBbOfOKGtx | 5,000 |

### Gotchas discovered this session
- **Stripe inline `price_data` bypasses dashboard products** — reporting
  and Stripe Tax can't match an inline price to a Product record. Always
  use `price: priceId` for production commerce.
- **`+ GST` marketing copy requires an explicit line item** if Stripe
  Tax isn't configured — otherwise customers are literally undercharged
  by 10%. Current workaround is a manual GST line item computed as
  `Math.round(baseCents * 0.1)`.
- **`'use client'` was applied to components that didn't need it** —
  `PricingCards` had 350 lines of data arrays crossing the client
  boundary for a single loading-state hook. Extract the stateful leaf,
  keep the rest on the server.
- **Chrome headless `--screenshot` can't emulate `prefers-reduced-motion`**
  or inject CSS pre-load. Puppeteer-core + system Chrome is the right
  tool for capturing sites with framer-motion reveals.
- **Pricing pages should show prices first, then justify** — the
  opposite (process → prices) made visitors scroll past an editorial
  before seeing what things cost. Reverse on commerce pages.
- **Brand-wordmark-as-H1** optimises for recall but kills first-paint
  comprehension. Demote wordmark to a mono kicker, use the H1 for a
  value prop. SEO also prefers this.
- **WCAG 2.1 AA** isn't the ceiling — primary text at 19.8:1 causes
  eye strain on dark themes. Target 15–18:1 with off-white + warm
  charcoal, not pure `#fff` on pure `#000`.

### Key files this session
```
New:
  src/components/CheckoutButton.tsx
  memory/sessions/2026-04-19.md

Rewrote:
  scripts/capture-portfolio.cjs (puppeteer-core + motion-reduce)
  src/components/PricingCards.tsx (server component + CheckoutButton)
  src/components/EmailLink.tsx (tracking wrapper)

Modified:
  src/app/api/stripe/checkout/route.ts (price IDs + GST line + module-scope Stripe)
  src/app/pricing/page.tsx (3 passes: feature / tidy / impeccable + reorder)
  src/app/globals.css (dark-mode tokens)
  src/components/Portfolio.tsx (3 new projects + 3-col + outcome lines)
  src/components/Hero.tsx (value-prop H1 + real description + new metrics)
  src/lib/personalisation.ts (all location headlines + descriptions rewritten)
  src/lib/tracking.ts (PostHog dispatch)

Asset churn:
  +9 new portfolio images (sellmyownhome/flatwhiteindex/printforge-crm x3 formats)
  All 8 portfolio images regenerated via the new capture pipeline
```

# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.

## Last Updated

- **Date:** 2026-04-20
- **Branch:** master
- **Focus:** Website-Sprint launch offer ($999), /book cart + checkout, 14 Stripe extras, website audit tool (Opus 4.6 + sitemap + multi-page + tool-use + email delivery), WAF detection + AI-invisible alert, referral tracking, light/dark email template

## Accomplished

### This Session (2026-04-20)

**34 commits on master. Working tree clean (only `launch.cmd` untracked, pre-existing).**

**Launch Offer & booking flow:**
- New Stripe product `Lightning Website Sprint` ($999 AUD live) + 14 extras as real dashboard products on acct_1TN2MmPTv8VxN1HB. All 23 products live.
- `/book` page: hero pitch + interactive `ExtrasCart` (sprint preselected, 14 extras as tickboxes, sticky Subtotal/GST/Total bar, single Checkout button).
- `/extras` still works as an alias of the same cart.
- Checkout route accepts `packageIds[]` array; sprint uses dashboard price ID, extras use inline `price_data` where needed but every extra also has a real `prod_UMom*` product + `price_1TO58*` price.
- Home-page `LaunchOffer` primary CTA points at `/book`.
- Nav: `Book` link inserted; dropped old `AI Audit` anchor.
- Checkout now collects name, phone, billing address via Stripe; webhook expands line items + products into lead metadata.
- Website Sprint Stripe webhook emails a detailed admin alert per order.
- `Lightning Website Sprint - Launch Offer` + 14 extras created on the correct AC account after a Plant Planner MCP auth mix-up (Daniel generated an `rk_live_` restricted key; used via REST; Daniel should rotate).

**Website audit tool (`/api/website-audit`):**
- Two-step client UX: URL intent → email → fire-and-forget confirmation.
- `/api/website-audit/intent` logs URL before email is captured (source `website-audit-intent`).
- Main route uses Vercel `after()` so visitor never waits — ack returns in ~50ms; audit runs async.
- Sitemap discovery (`sitemap.xml`, falls back to `_index`, `-index`). Follows sitemap-of-sitemaps one level.
- Pick up to 4 trust-signal pages from sitemap (priority keywords: about, contact, services, licence, team, testimonials, reviews, pricing).
- Parallel fetch with browser UA + Sec-Fetch headers.
- Per-page HTML sanitised + middle-truncate at 20k chars (keeps head + footer).
- Meta-tag pre-extraction: `<title>`, meta description, canonical, theme-color, every `og:*` and `twitter:*`. Labelled table prepended to the HTML given to Claude.
- Claude Opus 4.6 (`claude-opus-4-6`) via **tool-use forcing** (`tool_choice: {type:'tool', name:'submit_audit'}`) for structured output. No prefill (Opus 4.6 rejects it). Tool schema: summary, score 0-100, 4-12 issues with category/severity/title/detail/fix.
- Categories: Conversion, Trust, Mobile, SEO, **Social**, Performance, Design, AI.
- Generic prompt (no AC branding, no AU-specific phrasing, no plumbing examples — portable).
- Delivery: audit email (light-default, dark-mode media-query adaptation), lead INSERT, admin heads-up.
- Failure path: visitor gets soft "we hit a hiccup, manual in 24h", admin gets full diagnostic with error name/message/Anthropic SDK extra context/stack top 12 lines.
- **WAF detection:** if all page fetches return 401/403/406/429/503, skip the audit and send a special **"URGENT: Your website is invisible to AI"** email framing the firewall as a commercial threat (ChatGPT, Claude, Perplexity, Google AI Overviews, Bing Copilot all blocked same as us). Lead stored with source `website-audit-waf-blocked`.
- URL input now accepts bare hostnames (`type=text`, `inputMode=url`) — `coastcompleteelectricalsolutions.com.au` without scheme works.

**Referral tracking:**
- `src/lib/referral.ts`: captures `?ref=` or `?utm_source=` on landing, stores in localStorage 30 days.
- `ExtrasCart`, `CheckoutButton`, `WebsiteAuditor` all attach the stored ref to their API calls.
- Route stores ref in Stripe Checkout Session metadata + leads metadata.
- Recommended convention: `?ref=fb`, `?ref=fb-ad-apr26`, `?ref=partner-joe`, etc.

**Email template:**
- `emailTemplate()` now defaults to **light mode** (white bg, `#333` text, `#0a0a0a` headings) with `@media (prefers-color-scheme: dark)` overrides via `.ac-*` class hooks that flip to the brutalist warm-charcoal palette for dark-mode clients.
- `<meta name="color-scheme" content="light dark">` + `supported-color-schemes`.
- All audit email bodies + issue cards use the light-default + class-hook pattern.

**SDK & model:**
- `@anthropic-ai/sdk` 0.39 → 0.90 (14 months of updates, Claude 4 family support).
- `AI_AUDIT_MODEL` env var overrides the default `claude-opus-4-6` without a deploy.

## In Progress

- Nothing mid-flight.

## Blocked

- **Cloudflare Email Obfuscation** still returning 67 broken `/cdn-cgi/` links — needs disabling in CF dashboard.
- **`GITHUB_TOKEN` + `BLOG_ADMIN_KEY`** still empty in Vercel env — `/api/blog/generate` returns 503.
- **Proxmox decommission** outstanding (low priority).

## Next Steps

1. **Verify WAF-blocked email lands** — have someone try a Wix/Squarespace/GoDaddy-hosted site that 403s, confirm "URGENT: Your website is invisible to AI" arrives.
2. **Rotate the `rk_live_51TN2Mm…` restricted Stripe key** (was pasted in chat for product creation; all 23 products live; key no longer needed).
3. **Verify the Stripe webhook endpoint** in Stripe dashboard points at `https://agenticconsciousness.com.au/api/stripe/webhook` and `STRIPE_WEBHOOK_SECRET` in Vercel matches.
4. **Consider Firecrawl or Browserless fallback** for WAF-blocked sites so we can audit them instead of just alerting. Paid service, adds latency + cost.
5. **Delete unused `ToolGate` lint warning** (`toolId` unused — pre-existing, low priority).
6. **PostHog funnel** not yet defined in the dashboard (events firing, just need to wire the funnel: Pageview → WebsiteAuditRequested → InitiateCheckout → Stripe purchase).
7. **Stripe Tax** once origin + AU GST registration configured → swap manual GST line for `automatic_tax: { enabled: true }`.
8. **Collect real client testimonials** for homepage + pricing trust.
9. **Content parity**: Adelaide, Gold Coast + 6 industry pages still need deepDive.

## Context

### Stripe live products on Agentic Consciousness (acct_1TN2MmPTv8VxN1HB)

8 consulting packages + Sprint + 14 extras = 23 products. All livemode.

| packageId | Price ID | A$ |
|---|---|---|
| claude-workshop | price_1TN2frPTv8VxN1HBYRWqlFNG | 300 |
| claude-code-setup | price_1TN2fsPTv8VxN1HB4Lf70QAI | 450 |
| ai-stack-audit | price_1TN2fxPTv8VxN1HBKqdq3lRa | 500 |
| claude-project-build | price_1TN2fyPTv8VxN1HBlMMGkmKM | 750 |
| automation-sprint | price_1TN2fyPTv8VxN1HB2pxyAvDL | 1,500 |
| strategy-deposit | price_1TN2fzPTv8VxN1HBIKPTW8YK | 1,500 |
| implementation-deposit | price_1TN2g0PTv8VxN1HBCTqIiDg8 | 2,500 |
| automation-deposit | price_1TN2g1PTv8VxN1HBbOfOKGtx | 5,000 |
| website-sprint | price_1TO4woPTv8VxN1HBlY6cCy8z | 999 |
| extra-page | price_1TO58lPTv8VxN1HB4aDSAuLX | 100 |
| blog-cms | price_1TO58mPTv8VxN1HBlPYS3HBb | 400 |
| multi-language | price_1TO58nPTv8VxN1HBt5lWNTKl | 300 |
| stripe-integration | price_1TO58oPTv8VxN1HBFcxPwbro | 300 |
| ecommerce-catalog | price_1TO58pPTv8VxN1HBFSVzZKsZ | 500 |
| booking-integration | price_1TO58qPTv8VxN1HBg3lmFk9c | 200 |
| auth-integration | price_1TO58rPTv8VxN1HBHdsyJwLB | 500 |
| contact-form | price_1TO58sPTv8VxN1HB9Plitw4K | 150 |
| extra-copywriting | price_1TO58tPTv8VxN1HB2lD7y5Ym | 100 |
| chatbot-training | price_1TO58uPTv8VxN1HBHvPSTa5D | 300 |
| ga4-gtm | price_1TO58vPTv8VxN1HBN1mVVBs2 | 150 |
| posthog-setup | price_1TO58wPTv8VxN1HB6psjvWsr | 150 |
| seo-deep | price_1TO58xPTv8VxN1HBGAyAMbSX | 250 |
| design-polish | price_1TO58yPTv8VxN1HB79V1hVRy | 400 |

### Gotchas discovered this session
- **`claude-opus-4-6` and `claude-opus-4-7` aliases** both work with SDK 0.90. With 0.39 the API rejected them. Upgrading the SDK was a required fix, not optional.
- **Opus 4.6 does NOT support assistant-message prefill.** API returns `"This model does not support assistant message prefill. The conversation must end with a user message."` Use tool-use forcing for structured output instead.
- **Sonnet 4 gives checklist-slop audits.** Opus 4.6 is worth the 5x token cost on a one-per-lead audit tool.
- **Email clients default dark-mode-invert **HTML emails unless you explicitly signal `color-scheme: light dark` via meta + CSS. Hardcoded `background:#0a0a0a` renders even when client is in light mode.
- **`type="url"` on HTML inputs** rejects bare hostnames (`coastcompleteelectricalsolutions.com.au` without scheme) at the browser level before JS runs. Use `type="text"` + `inputMode="url"` + client-side normalise.
- **Stripe MCP auth** can silently switch accounts between sessions. Always verify with `get_stripe_account_info` before creating products.
- **WAF-protected sites** (managed AU hosting, Cloudflare Bot Fight Mode) return 403 to every non-interactive fetch regardless of browser UA or Sec-Fetch headers. Need real-browser automation (Firecrawl / Browserless / ScrapingBee) to bypass. Currently we detect + alert rather than bypass.
- **Next.js `after()` import:** stable in Next 16, no `unstable_` prefix needed.
- **Sitemap scoring tiebreaker:** path-depth matters. A plumber site's `/our-services/hot-water-repairs-central-coast/` scores below `/our-services/` because the latter has shallower depth + matches the service keyword.

### Key files this session
```
New:
  src/app/api/website-audit/route.ts
  src/app/api/website-audit/intent/route.ts
  src/app/api/website-audit/email/route.ts (deprecated 410 stub)
  src/app/book/page.tsx, src/app/book/layout.tsx
  src/app/extras/page.tsx, src/app/extras/layout.tsx
  src/components/WebsiteAuditor.tsx
  src/components/ExtrasCart.tsx
  src/components/LaunchOffer.tsx
  src/lib/referral.ts

Modified:
  src/lib/email.ts (light-default template + dark-mode CSS)
  src/app/api/stripe/checkout/route.ts (cart + 14 extras + ref + billing collection)
  src/app/api/stripe/webhook/route.ts (line items + full customer capture)
  src/components/CheckoutButton.tsx (ref passthrough)
  src/components/Nav.tsx via src/lib/constants.ts (Book link)
  package.json (Anthropic SDK 0.39 -> 0.90)
```

## Learnings (condensed)
- Checklist-slop vs consultation-grade audit is 80% prompt + 20% model. Opus 4.6 + tool-use + evidence-quoting rule = different product.
- Email dark-mode is a CSS media-query problem, not a brand-palette problem. Default light, let clients opt-into dark via `@media (prefers-color-scheme: dark)`.
- Users type bare hostnames. Design for it from the start.
- WAF-blocked sites are hot leads, not dead ends — frame the block as a commercial threat and the alert email IS the sales pitch.
- Track everything in `leads.metadata` JSON. One table, `source` column, richly-typed metadata per source. Query across signals by email.

# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.

## Last Updated

- **Date:** 2026-03-27
- **Branch:** master
- **Focus:** Landing page unique content (critical SEO fix)

## Accomplished

- Fixed 12 landing pages to have UNIQUE server-rendered content per page (was duplicating homepage)
- Built entire site from scratch to production (53 pages, 20 API routes)
- 8 AI-powered tools on /tools page (grid layout with expandable panels)
- Dark/light theme with CSS custom properties
- Stripe payments + pricing page
- Proposal builder with acceptance flow
- Email drip system (5 emails over 14 days)
- Dynamic hero personalisation (UTM, landing pages, referrer, geo)
- Exit intent popup with AI opportunity snapshot
- 8 blog posts (3 seed + 5 new)
- Plausible analytics integrated
- Resend email utility (needs domain verification)
- Multiple security + SEO audits completed
- All tools use Haiku (fast) or Sonnet (complex) via centralised config

## In Progress

- Nothing actively in progress

## Blocked

- Resend: needs domain DNS verification before emails actually send
- Stripe: needs live API keys
- Meta Pixel / Google Ads: needs account IDs

## Next Steps

1. Verify all 8 tools work on live site after latest deploy
2. Set up Resend domain verification (DNS records)
3. Add Stripe live keys + test checkout flow
4. Mobile testing on physical devices
5. Set up drip email cron job on server
6. Generate more blog content for SEO

## Context

- Server: /opt/agenticconsciousness/ (flat structure, no nesting)
- Docker volumes: ac-data, ac-blog, ac-proposals, ac-drip
- Haiku for 7 fast routes, Sonnet for 8 complex routes
- parseAiJson handles markdown-wrapped JSON from Claude
- Docker nextjs user needs chown on /app/data and /app/content
- Cloudflare Tunnel: cf-ipcountry only (no city), using ip-api.com for geolocation

## Files Modified

```
Too many to list — see git log for full history (40+ commits)
Key: src/lib/parseAiJson.ts, src/lib/models.ts, src/lib/email.ts,
     all components in src/components/tools/,
     all routes in src/app/api/tools/
```

# Vercel Deployment Guide

## Environment variables (set in Vercel dashboard)

```
# Database — Neon Postgres
DATABASE_URL=postgresql://neondb_owner:...@ep-orange-dream-ang8s4s6-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Rate-limit cookie signing (required for tool rate limiting)
COOKIE_SECRET=<openssl rand -base64 32>

# Resend (email)
RESEND_API_KEY=re_...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Blog auto-publish via GitHub API
GITHUB_TOKEN=ghp_...             # needs 'contents:write' on the repo
GITHUB_REPO=HallyAus/agenticconsciousness
GITHUB_BRANCH=master
BLOG_ADMIN_KEY=<random secret to authorise /api/blog/generate>

# Admin
ADMIN_EMAIL=ai@agenticconsciousness.com.au
SITE_URL=https://agenticconsciousness.com.au

# Analytics (optional)
NEXT_PUBLIC_UMAMI_URL=https://analytics.agenticconsciousness.com.au
NEXT_PUBLIC_UMAMI_WEBSITE_ID=<umami uuid>

# Drip (optional)
DRIP_ADMIN_KEY=<random secret>
```

## First-time setup

1. Push this branch to GitHub.
2. In Vercel, `New Project` → import the `HallyAus/agenticconsciousness` repo.
3. Paste all env vars above (production + preview scopes).
4. Deploy. Vercel will build and give you a `*.vercel.app` URL.
5. Smoke-test that URL before touching DNS.

## DNS cutover (Cloudflare → Vercel)

- In Vercel project → Settings → Domains, add `agenticconsciousness.com.au` and `www.agenticconsciousness.com.au`. Vercel will give you the `cname.vercel-dns.com` target.
- In Cloudflare DNS, change the root record to a `CNAME` flattened to `cname.vercel-dns.com`, proxy **grey cloud (DNS only)**.
- Remove the old Cloudflare Tunnel public hostname for this domain.
- Wait for Vercel to validate and issue the cert (~30 s).

## Stripe webhook

After the Vercel domain is live, update the Stripe webhook endpoint to:
`https://agenticconsciousness.com.au/api/stripe/webhook`

## Decommissioning the Proxmox host

Only after Vercel is stable:

```bash
ssh proxmox
cd /opt/agenticconsciousness
docker compose down
```

Keep the host around for a week in case of rollback.

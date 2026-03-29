#!/bin/bash
# ============================================================
# Generate Umami env vars for the server + tracking snippets
# for multiple projects.
#
# Usage:
#   bash scripts/generate-umami-env.sh
#
# This generates:
#   1. Server-side env vars (add to /opt/agenticconsciousness/.env)
#   2. Tracking script snippets (add to each project after
#      creating the website in Umami dashboard)
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

UMAMI_URL="https://analytics.agenticconsciousness.com.au"

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}  UMAMI ENV GENERATOR${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Generate server secrets ──
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '=/+' | head -c 40)
APP_SECRET=$(openssl rand -base64 32 | tr -d '=/+' | head -c 40)

echo -e "${GREEN}Add these to /opt/agenticconsciousness/.env :${NC}"
echo ""
echo -e "# ── Umami Analytics ──"
echo -e "UMAMI_DB_PASSWORD=${DB_PASSWORD}"
echo -e "UMAMI_APP_SECRET=${APP_SECRET}"
echo ""

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  TRACKING SNIPPETS PER PROJECT${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}After Umami is running:${NC}"
echo -e "  1. Go to ${UMAMI_URL}"
echo -e "  2. Login: admin / umami (change password!)"
echo -e "  3. Settings → Websites → Add website for each domain"
echo -e "  4. Copy the Website ID and paste into the snippet below"
echo ""

PROJECTS=(
  "agenticconsciousness.com.au"
  "printforge.com.au"
  "firehero.au"
  "stlshield.com"
)

for project in "${PROJECTS[@]}"; do
  echo -e "${GREEN}${project}${NC}"
  echo -e "  HTML (static sites, WordPress, etc.):"
  echo -e "  ${YELLOW}<script async src=\"${UMAMI_URL}/script.js\" data-website-id=\"PASTE-ID-HERE\"></script>${NC}"
  echo ""
  echo -e "  Next.js (app router):"
  echo -e "  ${YELLOW}<Script async src=\"${UMAMI_URL}/script.js\" data-website-id=\"PASTE-ID-HERE\" strategy=\"afterInteractive\" />${NC}"
  echo ""
done

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  QUICK DEPLOY${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  1. Add the env vars above to /opt/agenticconsciousness/.env"
echo -e "  2. docker compose up -d umami-db umami"
echo -e "  3. Add Cloudflare Tunnel route:"
echo -e "     Subdomain: analytics"
echo -e "     Domain:    agenticconsciousness.com.au"
echo -e "     Service:   HTTP → ac-umami:3000"
echo -e "  4. Login, change password, add sites, copy IDs"
echo -e "  5. Paste tracking scripts into each project"
echo ""

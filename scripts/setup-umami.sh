#!/bin/bash
# ============================================================
# Umami Analytics — Setup Script for Proxmox
# ============================================================
# Run this on your Proxmox VM where agentic-consciousness
# is deployed. It will:
#   1. Generate secure passwords
#   2. Add Umami env vars to .env
#   3. Pull and start Umami + PostgreSQL containers
#   4. Wait for Umami to be healthy
#   5. Print next steps (Cloudflare Tunnel config)
#
# Usage:
#   cd /opt/agenticconsciousness
#   bash scripts/setup-umami.sh
# ============================================================

set -euo pipefail

PROJECT_DIR="${PWD}"
ENV_FILE="${PROJECT_DIR}/.env"
UMAMI_URL="https://analytics.agenticconsciousness.com.au"

# ── Colours ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}  UMAMI ANALYTICS SETUP${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Preflight checks ──
if [ ! -f "${ENV_FILE}" ]; then
  echo -e "${YELLOW}No .env file found. Creating from .env.example...${NC}"
  if [ -f "${PROJECT_DIR}/.env.example" ]; then
    cp "${PROJECT_DIR}/.env.example" "${ENV_FILE}"
  else
    touch "${ENV_FILE}"
  fi
fi

if [ ! -f "${PROJECT_DIR}/docker-compose.yml" ]; then
  echo -e "${RED}ERROR: docker-compose.yml not found. Are you in the project root?${NC}"
  exit 1
fi

if ! command -v docker &> /dev/null; then
  echo -e "${RED}ERROR: Docker not installed.${NC}"
  exit 1
fi

# ── Check if Umami vars already exist ──
if grep -q "UMAMI_DB_PASSWORD" "${ENV_FILE}" 2>/dev/null; then
  echo -e "${YELLOW}Umami env vars already exist in .env${NC}"
  echo -e "To reset, remove the UMAMI_ lines from .env and re-run."
  echo ""
  read -p "Continue anyway and just start containers? [y/N] " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
  fi
else
  # ── Generate secrets ──
  echo -e "${GREEN}Generating secure passwords...${NC}"
  DB_PASSWORD=$(openssl rand -base64 32 | tr -d '=/+' | head -c 40)
  APP_SECRET=$(openssl rand -base64 32 | tr -d '=/+' | head -c 40)

  # ── Append to .env ──
  cat >> "${ENV_FILE}" <<EOF

# ── Umami Analytics (self-hosted) ──
UMAMI_DB_PASSWORD=${DB_PASSWORD}
UMAMI_APP_SECRET=${APP_SECRET}
NEXT_PUBLIC_UMAMI_URL=${UMAMI_URL}
NEXT_PUBLIC_UMAMI_WEBSITE_ID=
EOF

  echo -e "${GREEN}Umami env vars added to .env${NC}"
fi

# ── Pull images ──
echo ""
echo -e "${GREEN}Pulling Umami and PostgreSQL images...${NC}"
docker compose pull umami umami-db

# ── Start Umami services only ──
echo ""
echo -e "${GREEN}Starting Umami services...${NC}"
docker compose up -d umami-db umami

# ── Wait for healthy ──
echo ""
echo -e "${YELLOW}Waiting for Umami to start (up to 60s)...${NC}"
for i in $(seq 1 12); do
  if docker inspect ac-umami --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
    echo -e "${GREEN}Umami is healthy!${NC}"
    break
  fi
  if [ "$i" -eq 12 ]; then
    echo -e "${YELLOW}Umami not healthy yet — check logs with: docker logs ac-umami${NC}"
  fi
  sleep 5
done

# ── Print status ──
echo ""
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  UMAMI IS RUNNING${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Local:  http://localhost:3001"
echo -e "  Login:  admin / umami  ${RED}(change this immediately)${NC}"
echo ""
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  NEXT STEPS${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  1. ${YELLOW}Add Cloudflare Tunnel route:${NC}"
echo -e "     Hostname:  analytics.agenticconsciousness.com.au"
echo -e "     Service:   http://ac-umami:3000"
echo -e ""
echo -e "  2. ${YELLOW}Login to Umami and change the admin password${NC}"
echo -e "     Go to: ${UMAMI_URL} (after tunnel is configured)"
echo -e "     Or locally: http://<vm-ip>:3001"
echo -e ""
echo -e "  3. ${YELLOW}Add your website in Umami:${NC}"
echo -e "     Settings → Websites → Add website"
echo -e "     Name: Agentic Consciousness"
echo -e "     Domain: agenticconsciousness.com.au"
echo -e "     Copy the Website ID"
echo -e ""
echo -e "  4. ${YELLOW}Paste the Website ID into .env:${NC}"
echo -e "     nano ${ENV_FILE}"
echo -e "     Set: NEXT_PUBLIC_UMAMI_WEBSITE_ID=<paste-id-here>"
echo -e ""
echo -e "  5. ${YELLOW}Rebuild the web container to pick up the tracking script:${NC}"
echo -e "     docker compose up -d --build web"
echo -e ""
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

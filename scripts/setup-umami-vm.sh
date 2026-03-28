#!/bin/bash
# ============================================================
# Umami Analytics — Dedicated VM Setup (Proxmox VM 700)
# ============================================================
# Run this on a fresh Ubuntu/Debian VM.
# Sets up Docker, Umami, and PostgreSQL.
#
# Usage:
#   curl -fsSL <this-script> | bash
#   OR
#   bash setup-umami-vm.sh
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}  UMAMI ANALYTICS — VM SETUP${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Install Docker if missing ──
if ! command -v docker &> /dev/null; then
  echo -e "${GREEN}Installing Docker...${NC}"
  apt update && apt install -y ca-certificates curl
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo -e "${GREEN}Docker installed.${NC}"
else
  echo -e "${GREEN}Docker already installed.${NC}"
fi

if ! docker compose version &> /dev/null; then
  echo -e "${GREEN}Installing Docker Compose plugin...${NC}"
  apt install -y docker-compose-plugin
fi

# ── Create project directory ──
mkdir -p /opt/umami
cd /opt/umami

# ── Generate secrets ──
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '=/+' | head -c 40)
APP_SECRET=$(openssl rand -base64 32 | tr -d '=/+' | head -c 40)

# ── Write .env ──
cat > .env <<EOF
UMAMI_DB_PASSWORD=${DB_PASSWORD}
UMAMI_APP_SECRET=${APP_SECRET}
EOF

echo -e "${GREEN}Secrets written to /opt/umami/.env${NC}"

# ── Write docker-compose.yml ──
cat > docker-compose.yml <<'COMPOSE'
services:
  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    container_name: umami
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://umami:${UMAMI_DB_PASSWORD}@umami-db:5432/umami
      - DISABLE_TELEMETRY=1
      - APP_SECRET=${UMAMI_APP_SECRET}
    depends_on:
      umami-db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  umami-db:
    image: postgres:16-alpine
    container_name: umami-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=umami
      - POSTGRES_USER=umami
      - POSTGRES_PASSWORD=${UMAMI_DB_PASSWORD}
    volumes:
      - umami-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U umami -d umami"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "2"

volumes:
  umami-db-data:
COMPOSE

echo -e "${GREEN}docker-compose.yml written to /opt/umami/${NC}"

# ── Start services ──
echo ""
echo -e "${GREEN}Pulling images...${NC}"
docker compose pull

echo ""
echo -e "${GREEN}Starting Umami...${NC}"
docker compose up -d

# ── Wait for healthy ──
echo ""
echo -e "${YELLOW}Waiting for Umami to start (up to 60s)...${NC}"
for i in $(seq 1 12); do
  if docker inspect umami --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
    echo -e "${GREEN}Umami is healthy!${NC}"
    break
  fi
  if [ "$i" -eq 12 ]; then
    echo -e "${YELLOW}Still starting — check: docker logs umami${NC}"
  fi
  sleep 5
done

# ── Get VM IP ──
VM_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  UMAMI IS RUNNING${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  URL:    http://${VM_IP}:3000"
echo -e "  Login:  admin / umami  ${RED}(change immediately)${NC}"
echo ""
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  NEXT STEPS${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  1. ${YELLOW}Update Cloudflare Tunnel route:${NC}"
echo -e "     analytics.agenticconsciousness.com.au"
echo -e "     Change service URL to: http://${VM_IP}:3000"
echo -e ""
echo -e "  2. ${YELLOW}Login and change admin password${NC}"
echo -e ""
echo -e "  3. ${YELLOW}Add your websites in Umami:${NC}"
echo -e "     Settings → Websites → Add website"
echo -e ""
echo -e "  4. ${YELLOW}Add tracking script to each project:${NC}"
echo ""
echo -e "     ${GREEN}HTML / static:${NC}"
echo -e '     <script async src="https://analytics.agenticconsciousness.com.au/script.js" data-website-id="PASTE-ID"></script>'
echo ""
echo -e "     ${GREEN}Next.js:${NC}"
echo -e '     <Script async src="https://analytics.agenticconsciousness.com.au/script.js" data-website-id="PASTE-ID" strategy="afterInteractive" />'
echo ""
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

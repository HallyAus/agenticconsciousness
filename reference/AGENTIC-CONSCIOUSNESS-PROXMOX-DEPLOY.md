# Agentic Consciousness — Proxmox Deployment Guide

## Overview

Deploy the Agentic Consciousness Next.js site on your existing Proxmox server using Docker Compose with Cloudflare Tunnel for public access. This follows the same pattern as your other self-hosted services.

**Target VM:** New LXC or VM on your Proxmox host (or add to an existing Docker VM)
**Public access:** Cloudflare Tunnel (same approach as your other *.firehero.au services)
**Stack:** Docker Compose → Next.js standalone → Cloudflare Tunnel
**Monitoring:** Plausible/Umami self-hosted analytics (optional)

---

## 1. Proxmox VM/LXC Setup

### Option A: New VM (Recommended for isolation)

```bash
# On Proxmox host — create a new VM
# Suggested: VM ID 501 (next after your STL Shield VM 500)
# Ubuntu 24.04 LTS, 2 cores, 2GB RAM, 20GB disk
# This is lightweight — Next.js standalone + tunnel doesn't need much

# After VM creation, SSH in and update
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### Option B: Add to existing Docker VM

If you already have a VM running Docker for other services, just create a new directory:

```bash
mkdir -p /opt/agentic-consciousness
cd /opt/agentic-consciousness
```

---

## 2. Project Files on the Server

### 2.1 — Clone from GitHub

```bash
cd /opt
git clone https://github.com/HallyAus/agentic-consciousness.git
cd agentic-consciousness
```

If the repo is private (recommended):

```bash
# Use your existing PAT (same pattern as stl-shield)
git clone https://<YOUR_GITHUB_PAT>@github.com/HallyAus/agentic-consciousness.git
```

### 2.2 — Environment File

```bash
cp .env.example .env
nano .env
```

Set these values:

```env
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
NEXT_PUBLIC_CONTACT_EMAIL=hello@agenticconsciousness.com
SITE_URL=https://agenticconsciousness.com.au
NODE_ENV=production
```

---

## 3. Docker Compose Stack

Create `docker-compose.yml` in the project root:

```yaml
services:
  # ── NEXT.JS APP ──
  web:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ac-web
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - NEXT_PUBLIC_CONTACT_EMAIL=${NEXT_PUBLIC_CONTACT_EMAIL}
      - SITE_URL=${SITE_URL}
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"

  # ── CLOUDFLARE TUNNEL ──
  tunnel:
    image: cloudflare/cloudflared:latest
    container_name: ac-tunnel
    restart: unless-stopped
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      web:
        condition: service_healthy
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "2"

  # ── PLAUSIBLE ANALYTICS (OPTIONAL) ──
  # Uncomment this block if you want self-hosted analytics
  # If you'd rather use a hosted solution, skip this and add
  # the Plausible Cloud script tag to layout.tsx instead.
  #
  # plausible:
  #   image: ghcr.io/plausible/community-edition:v2-latest
  #   container_name: ac-analytics
  #   restart: unless-stopped
  #   ports:
  #     - "8000:8000"
  #   environment:
  #     - BASE_URL=https://analytics.agenticconsciousness.com.au
  #     - SECRET_KEY_BASE=<generate-with-openssl-rand-hex-64>
  #     - TOTP_VAULT_KEY=<generate-with-openssl-rand-hex-32>
  #     - DISABLE_REGISTRATION=invite_only
  #   volumes:
  #     - plausible-data:/var/lib/plausible/db
  #
  # volumes:
  #   plausible-data:
```

### 3.1 — Dockerfile

This should already exist from the build instructions, but verify it's present:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

Make sure `next.config.ts` has `output: 'standalone'` — without this the standalone server.js won't be generated.

---

## 4. Cloudflare Tunnel Setup

### 4.1 — Create the Tunnel

```bash
# On your local machine (or wherever you manage Cloudflare)
# If you don't have cloudflared CLI installed:
# brew install cloudflare/cloudflare/cloudflared  (macOS)
# Or download from https://github.com/cloudflare/cloudflared/releases

# Login to Cloudflare
cloudflared tunnel login

# Create the tunnel
cloudflared tunnel create ac-website

# Note the tunnel ID and credentials file path — you'll need both
```

### 4.2 — Route DNS

```bash
# Point your domain to the tunnel
cloudflared tunnel route dns ac-website agenticconsciousness.com.au

# If you also want www:
cloudflared tunnel route dns ac-website www.agenticconsciousness.com.au
```

### 4.3 — Get the Tunnel Token

Go to the Cloudflare Zero Trust dashboard:
1. Navigate to **Networks → Tunnels**
2. Find the `ac-website` tunnel
3. Click **Configure**
4. Under **Install and run a connector**, copy the token from the Docker command

OR generate it via CLI:
```bash
cloudflared tunnel token ac-website
```

### 4.4 — Configure the Tunnel Ingress

In the Cloudflare Zero Trust dashboard, configure the tunnel's **Public Hostname**:

| Subdomain | Domain | Path | Service |
|-----------|--------|------|---------|
| (empty) | agenticconsciousness.com.au | | http://ac-web:3000 |
| www | agenticconsciousness.com.au | | http://ac-web:3000 |

**Important:** The service URL uses `ac-web` (the Docker container name) because the tunnel container and the web container are on the same Docker network.

### 4.5 — Add Token to Environment

```bash
nano .env.local
```

Add:
```env
CLOUDFLARE_TUNNEL_TOKEN=eyJ...your-tunnel-token-here
```

### 4.6 — Cloudflare DNS Settings

In your Cloudflare dashboard for the domain:
- The CNAME records will be created automatically by the `tunnel route dns` commands above
- Ensure **Proxy status** is set to **Proxied** (orange cloud) for DDoS protection
- SSL/TLS mode: **Full (strict)**

### 4.7 — Recommended Cloudflare Settings

In the Cloudflare dashboard for the domain:

**SSL/TLS:**
- Mode: Full (strict)
- Always Use HTTPS: ON
- Minimum TLS Version: 1.2
- Automatic HTTPS Rewrites: ON

**Security:**
- Security Level: Medium
- Bot Fight Mode: ON
- Browser Integrity Check: ON

**Speed:**
- Auto Minify: HTML, CSS, JS all ON
- Brotli: ON
- Early Hints: ON

**Caching:**
- Caching Level: Standard
- Browser Cache TTL: 4 hours
- Always Online: ON

**Page Rules (optional):**
- `www.agenticconsciousness.com.au/*` → Forwarding URL (301) → `https://agenticconsciousness.com.au/$1`

---

## 5. Build & Launch

```bash
cd /opt/agentic-consciousness

# Build and start everything
docker compose up -d --build

# Watch the logs
docker compose logs -f

# Check health
docker compose ps
```

Expected output:
```
NAME         STATUS                   PORTS
ac-web       Up (healthy)             0.0.0.0:3000->3000/3000
ac-tunnel    Up                       
```

### 5.1 — Verify It Works

```bash
# Local check (from the Proxmox VM)
curl -s http://localhost:3000 | head -20

# Should return HTML with "Agentic Consciousness" in the title

# Check the tunnel is connected
docker logs ac-tunnel 2>&1 | grep -i "registered"
# Should show: "Registered tunnel connection"

# Test from outside
curl -s -o /dev/null -w "%{http_code}" https://agenticconsciousness.com.au
# Should return 200
```

### 5.2 — Test the Chatbot

```bash
# Hit the API directly
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What services do you offer?"}]}'

# Should return a JSON response with Claude's reply
```

---

## 6. Auto-Updates & CI/CD

### 6.1 — Simple Git Pull + Rebuild

For a straightforward workflow (no GitHub Actions needed initially):

```bash
# Create an update script
cat > /opt/agentic-consciousness/update.sh << 'EOF'
#!/bin/bash
set -e
cd /opt/agentic-consciousness
echo "[$(date)] Pulling latest changes..."
git pull
echo "[$(date)] Rebuilding..."
docker compose up -d --build
echo "[$(date)] Cleaning old images..."
docker image prune -f
echo "[$(date)] Done. Status:"
docker compose ps
EOF

chmod +x /opt/agentic-consciousness/update.sh
```

Usage: `./update.sh`

### 6.2 — GitHub Actions (Optional)

If you want auto-deploy on push to main, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Proxmox

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROXMOX_HOST }}
          username: ${{ secrets.PROXMOX_USER }}
          key: ${{ secrets.PROXMOX_SSH_KEY }}
          script: /opt/agentic-consciousness/update.sh
```

Add the secrets in your GitHub repo settings. The `PROXMOX_HOST` would be your Cloudflare Tunnel address or WireGuard IP for SSH access.

---

## 7. Monitoring & Maintenance

### 7.1 — Container Health Monitoring

```bash
# Create a simple health check cron job
crontab -e
```

Add:
```cron
# Check every 5 minutes, restart if unhealthy
*/5 * * * * docker inspect --format='{{.State.Health.Status}}' ac-web | grep -q healthy || (docker compose -f /opt/agentic-consciousness/docker-compose.yml restart web && echo "[$(date)] Restarted ac-web" >> /var/log/ac-health.log)
```

### 7.2 — Log Rotation

Docker logs are already limited to 10MB / 3 files (configured in docker-compose.yml). To view:

```bash
# Live logs
docker compose logs -f web

# Chat API requests only (structured JSON logs)
docker compose logs web | grep "chat_request"

# Tunnel logs
docker compose logs -f tunnel

# Token usage summary (quick check)
docker compose logs web | grep "chat_request" | jq -r '.input_tokens + .output_tokens' | paste -sd+ | bc
```

### 7.3 — Disk Usage

```bash
# Check Docker disk usage
docker system df

# Clean up unused images/containers/volumes
docker system prune -a --volumes
```

### 7.4 — Backup

```bash
# Back up the project (env file is the critical piece)
tar -czf /root/backups/ac-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  /opt/agentic-consciousness/
```

Add to crontab for weekly backups:
```cron
0 3 * * 0 tar -czf /root/backups/ac-$(date +\%Y\%m\%d).tar.gz --exclude=node_modules --exclude=.next /opt/agentic-consciousness/
```

### 7.5 — Anthropic API Cost Monitoring

The chat route logs token usage. Quick daily cost estimate:

```bash
# Today's total tokens
docker compose logs web --since 24h | grep "chat_request" | \
  python3 -c "
import sys, json
total_in = total_out = 0
for line in sys.stdin:
    try:
        j = json.loads(line.split('|')[-1].strip())
        total_in += j.get('input_tokens', 0)
        total_out += j.get('output_tokens', 0)
    except: pass
cost = (total_in * 3 / 1_000_000) + (total_out * 15 / 1_000_000)
print(f'Input: {total_in:,} tokens | Output: {total_out:,} tokens | Est. cost: \${cost:.4f}')
"
```

Set a billing alert on your Anthropic dashboard for a monthly cap (e.g. $50).

---

## 8. Firewall & Network Security

### 8.1 — UFW on the VM

```bash
# Allow SSH (adjust port if using non-standard)
ufw allow 22/tcp

# Allow Docker internal traffic (the tunnel handles public access)
# Do NOT open port 3000 to the public — Cloudflare Tunnel handles this

# Enable
ufw enable
ufw status
```

Port 3000 stays internal to the VM. The Cloudflare Tunnel container connects outbound to Cloudflare's edge, which handles all incoming public traffic. No inbound ports need to be open to the internet.

### 8.2 — CrowdSec (Optional)

If you want to add CrowdSec to this VM (same as your main Proxmox setup):

```bash
curl -s https://install.crowdsec.net | bash
cscli collections install crowdsecurity/docker
```

This monitors Docker container logs for malicious patterns.

---

## 9. Proxmox-Specific Notes

### 9.1 — Resource Allocation

Recommended VM specs:
- **CPU:** 2 cores
- **RAM:** 2GB (1GB for Next.js + tunnel, 1GB buffer)
- **Disk:** 20GB (plenty for the app + Docker images)
- **Network:** Bridge to your LAN (same as other VMs)

If using LXC instead of a full VM:
- Enable nesting: `pct set <VMID> --features nesting=1`
- Required for Docker-in-LXC

### 9.2 — Memory Ballooning

If you want to use Proxmox memory ballooning (same as your other VMs):
- Set minimum: 1024MB
- Set maximum: 2048MB
- The VM will use what it needs

### 9.3 — Snapshot Before Major Updates

```bash
# On Proxmox host
qm snapshot <VMID> pre-update --description "Before AC website update $(date +%Y%m%d)"
```

Then run the update. If anything breaks, roll back:
```bash
qm rollback <VMID> pre-update
```

---

## 10. Quick Reference Commands

```bash
# Start everything
docker compose up -d

# Stop everything
docker compose down

# Rebuild after code changes
docker compose up -d --build

# View live logs
docker compose logs -f

# Check container health
docker compose ps

# Restart just the web app
docker compose restart web

# Shell into the web container
docker exec -it ac-web sh

# Update and redeploy
./update.sh

# Check Cloudflare Tunnel status
docker logs ac-tunnel 2>&1 | tail -5
```

---

## Architecture Diagram

```
Internet
   │
   ▼
Cloudflare Edge (CDN, DDoS, SSL)
   │
   ▼
Cloudflare Tunnel (encrypted)
   │
   ▼
Proxmox VM (e.g. VM 501)
   │
   ├── Docker: ac-tunnel (cloudflared)
   │       │
   │       ▼
   ├── Docker: ac-web (Next.js :3000)
   │       │
   │       ▼
   │   Anthropic API (outbound HTTPS)
   │
   └── (Optional) Docker: ac-analytics (Plausible :8000)
```

No inbound ports exposed. All public traffic flows through the encrypted Cloudflare Tunnel. The Anthropic API is called outbound from the Next.js server route only.

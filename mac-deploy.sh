#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Daddy Moto — Deploy from Mac
# Run this from your Mac terminal (not SSH).
# Usage: bash mac-deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

SERVER="root@206.81.14.171"
APP_DIR="/var/www/daddymoto.com"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Daddy Moto — Deploying to server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Create app directory on server
echo -e "${YELLOW}→ Creating app directory on server...${NC}"
ssh "$SERVER" "mkdir -p ${APP_DIR}"

# 2. Sync files (exclude node_modules, .next, .env.production)
echo -e "${YELLOW}→ Uploading files...${NC}"
rsync -az --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.env.production' \
  --exclude '.env.local' \
  --exclude '.git' \
  --exclude '.DS_Store' \
  "${LOCAL_DIR}/" \
  "${SERVER}:${APP_DIR}/"

echo -e "${GREEN}✓ Files uploaded${NC}"

# 3. Run setup script on server
echo -e "${YELLOW}→ Running server setup (this will take a few minutes)...${NC}"
echo ""
ssh -t "$SERVER" "bash ${APP_DIR}/server-setup.sh"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Deployed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Test it (before DNS): http://206.81.14.171:3004"
echo ""

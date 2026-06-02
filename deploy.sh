#!/bin/bash
# Daddy Moto — Full Deploy Script
# Run from your Mac: bash deploy.sh
# First run takes ~5 min. Subsequent deploys are fast.

set -e

SERVER="root@206.81.14.171"
APP_DIR="/var/www/daddymoto.com"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🏍  Daddy Moto Deploy"
echo "====================="

# ── 1. Upload files ───────────────────────────────────────────────────────────
echo ""
echo "▶ Uploading files..."
rsync -az --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.env' \
  "$LOCAL_DIR/" "$SERVER:$APP_DIR/"

echo "▶ Uploading .env..."
rsync -az "$LOCAL_DIR/.env" "$SERVER:$APP_DIR/.env"

# ── 2. Remote setup & build ───────────────────────────────────────────────────
echo ""
echo "▶ Running remote setup..."
ssh "$SERVER" bash << 'REMOTE'
set -e
APP_DIR="/var/www/daddymoto.com"

# Node.js 20 (if not installed)
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]]; then
  echo "  Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs -q
fi

# PM2 (if not installed)
if ! command -v pm2 &>/dev/null; then
  echo "  Installing PM2..."
  npm install -g pm2 -q
fi

# PostgreSQL (if not installed)
if ! command -v psql &>/dev/null; then
  echo "  Installing PostgreSQL..."
  apt install -y postgresql postgresql-contrib -q
fi

# Start PostgreSQL if not running
systemctl start postgresql 2>/dev/null || true

# Create DB user + database (idempotent)
echo "  Setting up database..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='daddymoto_user'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER daddymoto_user WITH PASSWORD 'dm_$(openssl rand -hex 8)';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='daddymoto_prod'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE daddymoto_prod OWNER daddymoto_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE daddymoto_prod TO daddymoto_user;" 2>/dev/null || true

# Update DATABASE_URL in .env with actual password
DB_PASS=$(sudo -u postgres psql -tc "SELECT rolpassword FROM pg_authid WHERE rolname='daddymoto_user'" | tr -d ' ')
# (user should set DATABASE_URL manually if auto-detect fails — see note below)

cd "$APP_DIR"

# Install dependencies
echo "  Installing npm packages..."
npm install --omit=dev 2>&1 | tail -3

# Run schema (idempotent — CREATE TABLE IF NOT EXISTS)
echo "  Running schema..."
DB_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)
psql "$DB_URL" -f scripts/schema.sql 2>&1 | grep -v "^$" || true

# Build
echo "  Building Next.js..."
npm run build 2>&1 | tail -5

# PM2 — start or restart
echo "  Starting app with PM2..."
if pm2 describe daddymoto &>/dev/null; then
  pm2 restart daddymoto
else
  pm2 start npm --name daddymoto -- start
fi
pm2 save

# PM2 startup (enable on reboot)
pm2 startup systemd -u root --hp /root 2>/dev/null | grep "sudo" | bash 2>/dev/null || true

echo ""
echo "✅ App running on port 3004"
REMOTE

# ── 3. Nginx ──────────────────────────────────────────────────────────────────
echo ""
echo "▶ Configuring Nginx..."
ssh "$SERVER" bash << 'REMOTE'
NGINX_CONF="/etc/nginx/sites-available/daddymoto.com"
cp /var/www/daddymoto.com/nginx/daddymoto.com.conf "$NGINX_CONF"
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/daddymoto.com
nginx -t && systemctl reload nginx
echo "✅ Nginx configured"
REMOTE

# ── 4. SSL ────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Checking SSL..."
ssh "$SERVER" bash << 'REMOTE'
if ! command -v certbot &>/dev/null; then
  apt install -y certbot python3-certbot-nginx -q
fi
if [ ! -d "/etc/letsencrypt/live/daddymoto.com" ]; then
  echo "  Requesting SSL cert (DNS must point to this server first)..."
  certbot --nginx -d daddymoto.com -d www.daddymoto.com --non-interactive --agree-tos -m admin@daddymoto.com 2>&1 | tail -5
else
  echo "  SSL cert already exists ✅"
fi
REMOTE

echo ""
echo "═══════════════════════════════════"
echo "🏍  Deploy complete!"
echo ""
echo "  Site:   https://daddymoto.com"
echo "  Logs:   ssh root@206.81.14.171 'pm2 logs daddymoto'"
echo "  Status: ssh root@206.81.14.171 'pm2 status'"
echo "═══════════════════════════════════"

#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Daddy Moto — Server Setup Script
# Run this ONCE on your DigitalOcean server after files are uploaded.
# Usage: bash /var/www/daddymoto.com/server-setup.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓ $1${NC}"; }
info() { echo -e "${YELLOW}→ $1${NC}"; }
err()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

APP_DIR="/var/www/daddymoto.com"
DB_NAME="daddymoto_prod"
DB_USER="daddymoto_user"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Daddy Moto — Server Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. System update ──────────────────────────────────────────────────────────
info "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
ok "System updated"

# ── 2. Install Node.js 20 ────────────────────────────────────────────────────
if command -v node &>/dev/null && [[ "$(node --version)" == v20* || "$(node --version)" == v22* ]]; then
  ok "Node.js already installed: $(node --version)"
else
  info "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y nodejs > /dev/null 2>&1
  ok "Node.js installed: $(node --version)"
fi

# ── 3. Install PM2 ───────────────────────────────────────────────────────────
if command -v pm2 &>/dev/null; then
  ok "PM2 already installed: $(pm2 --version)"
else
  info "Installing PM2..."
  npm install -g pm2 > /dev/null 2>&1
  ok "PM2 installed"
fi

# ── 4. Install PostgreSQL ────────────────────────────────────────────────────
if command -v psql &>/dev/null; then
  ok "PostgreSQL already installed: $(psql --version)"
else
  info "Installing PostgreSQL..."
  apt-get install -y postgresql postgresql-contrib > /dev/null 2>&1
  systemctl enable postgresql
  systemctl start postgresql
  ok "PostgreSQL installed"
fi

# ── 5. Install Nginx + Certbot ───────────────────────────────────────────────
if command -v nginx &>/dev/null; then
  ok "Nginx already installed"
else
  info "Installing Nginx and Certbot..."
  apt-get install -y nginx certbot python3-certbot-nginx > /dev/null 2>&1
  systemctl enable nginx
  ok "Nginx and Certbot installed"
fi

# ── 6. Firewall ──────────────────────────────────────────────────────────────
info "Configuring UFW firewall..."
ufw --force enable > /dev/null 2>&1
ufw allow OpenSSH > /dev/null 2>&1
ufw allow 'Nginx Full' > /dev/null 2>&1
ok "Firewall configured"

# ── 7. PostgreSQL database + user ────────────────────────────────────────────
info "Setting up PostgreSQL database..."

# Generate a random password
DB_PASS=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 32)

# Check if user already exists
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" 2>/dev/null || echo "")
if [[ "$USER_EXISTS" == "1" ]]; then
  ok "Database user '${DB_USER}' already exists"
else
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" > /dev/null 2>&1
  ok "Database user '${DB_USER}' created"
fi

DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null || echo "")
if [[ "$DB_EXISTS" == "1" ]]; then
  ok "Database '${DB_NAME}' already exists"
else
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" > /dev/null 2>&1
  ok "Database '${DB_NAME}' created"
fi

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" > /dev/null 2>&1

# ── 8. Create .env.production ────────────────────────────────────────────────
if [[ -f "${APP_DIR}/.env.production" ]]; then
  ok ".env.production already exists — skipping"
else
  info "Creating .env.production..."
  NEXTAUTH_SECRET=$(openssl rand -base64 32)
  cat > "${APP_DIR}/.env.production" << EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}

NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=https://daddymoto.com

# Cloudflare R2 — fill in after setting up bucket
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=daddymoto-listings
R2_PUBLIC_URL=

# SMTP — fill in with your email provider credentials
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@daddymoto.com

NEXT_PUBLIC_SITE_URL=https://daddymoto.com
NEXT_PUBLIC_SITE_NAME=Daddy Moto
EOF
  ok ".env.production created"
  echo ""
  echo -e "  ${YELLOW}DB password saved:${NC} ${DB_PASS}"
  echo -e "  ${YELLOW}File location:${NC}    ${APP_DIR}/.env.production"
  echo ""
fi

# ── 9. Run schema ────────────────────────────────────────────────────────────
info "Running database schema..."
DB_URL=$(grep DATABASE_URL "${APP_DIR}/.env.production" | cut -d= -f2-)
PGPASSWORD=$(echo $DB_URL | sed 's/.*:\(.*\)@.*/\1/') \
  psql "${DB_URL}" -f "${APP_DIR}/scripts/schema.sql" > /dev/null 2>&1 && ok "Schema applied" || echo "  (schema may already be applied)"

# ── 10. npm install + build ──────────────────────────────────────────────────
info "Installing npm dependencies..."
cd "${APP_DIR}"
npm install --production=false 2>&1 | tail -3

info "Building Next.js app (this takes ~1-2 min)..."
NODE_ENV=production npm run build 2>&1 | tail -5
ok "Build complete"

# ── 11. PM2 ─────────────────────────────────────────────────────────────────
info "Starting app with PM2..."
pm2 delete daddymoto 2>/dev/null || true
pm2 start npm --name daddymoto -- start
pm2 save
ok "App running on port 3004"

# Set PM2 to start on reboot
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root > /dev/null 2>&1
systemctl enable pm2-root > /dev/null 2>&1 || true

# ── 12. Nginx config ─────────────────────────────────────────────────────────
info "Configuring Nginx..."
cp "${APP_DIR}/nginx/daddymoto.com.conf" /etc/nginx/sites-available/daddymoto.com

# Enable site
if [[ ! -L /etc/nginx/sites-enabled/daddymoto.com ]]; then
  ln -s /etc/nginx/sites-available/daddymoto.com /etc/nginx/sites-enabled/
fi

# Test config
nginx -t 2>&1 && ok "Nginx config valid" || err "Nginx config invalid — check /etc/nginx/sites-available/daddymoto.com"
systemctl reload nginx
ok "Nginx reloaded"

# ── 13. Cron for expiry ──────────────────────────────────────────────────────
info "Setting up listing expiry cron..."
CRON_JOB="0 2 * * * cd ${APP_DIR} && /usr/bin/node scripts/expire-listings.js >> /var/log/daddymoto-expiry.log 2>&1"
(crontab -l 2>/dev/null | grep -v "expire-listings"; echo "$CRON_JOB") | crontab -
ok "Expiry cron set (runs daily at 2am)"

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}Setup complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  App running:  pm2 status"
echo "  App logs:     pm2 logs daddymoto"
echo "  Nginx logs:   tail -f /var/log/nginx/daddymoto.error.log"
echo ""
echo "  Next steps:"
echo "  1. Point daddymoto.com DNS → $(curl -s ifconfig.me 2>/dev/null || echo 'your server IP')"
echo "  2. Once DNS propagates, run:"
echo "     certbot --nginx -d daddymoto.com -d www.daddymoto.com"
echo "  3. Fill in R2 and SMTP in .env.production, then: pm2 restart daddymoto"
echo ""

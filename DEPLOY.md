# Daddy Moto — Deployment Guide

Deploys to your existing DigitalOcean server alongside edwardramos.com (WordPress).
This is completely isolated — it won't touch edwardramos.com at all.

---

## Prerequisites (one-time server setup)

SSH into your server, then:

```bash
# Node.js 20 LTS (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 (process manager)
sudo npm install -g pm2

# PostgreSQL (if not already installed)
sudo apt install -y postgresql postgresql-contrib
```

---

## Database setup (one-time)

```bash
sudo -u postgres psql

# In the psql prompt:
CREATE USER daddymoto_user WITH PASSWORD 'your-strong-password-here';
CREATE DATABASE daddymoto_prod OWNER daddymoto_user;
GRANT ALL PRIVILEGES ON DATABASE daddymoto_prod TO daddymoto_user;
\q

# Run schema
psql -U daddymoto_user -d daddymoto_prod -h localhost -f /var/www/daddymoto.com/scripts/schema.sql
```

---

## First deploy

```bash
# 1. Create app directory
sudo mkdir -p /var/www/daddymoto.com
sudo chown $USER:$USER /var/www/daddymoto.com

# 2. Clone / copy files
cd /var/www/daddymoto.com
git clone https://github.com/YOUR_REPO . 
# or scp/rsync your files up

# 3. Set up environment
cp .env.example .env.production
nano .env.production   # fill in all values

# 4. Install dependencies and build
npm install
npm run build

# 5. Start with PM2
pm2 start npm --name daddymoto -- start
pm2 save
pm2 startup   # follow the printed command to enable on reboot
```

---

## Nginx setup (one-time)

```bash
# Copy config
sudo cp nginx/daddymoto.com.conf /etc/nginx/sites-available/daddymoto.com
sudo ln -s /etc/nginx/sites-available/daddymoto.com /etc/nginx/sites-enabled/

# Test config (important — will catch errors before reload)
sudo nginx -t

# Only reload if test passes
sudo systemctl reload nginx

# Get SSL cert (after DNS is pointing to the server)
sudo certbot --nginx -d daddymoto.com -d www.daddymoto.com
```

---

## DNS

In Cloudflare (or your DNS provider), add:

| Type  | Name | Value             |
|-------|------|-------------------|
| A     | @    | YOUR_SERVER_IP    |
| CNAME | www  | daddymoto.com     |

Set Cloudflare proxy to **orange cloud (proxied)** once SSL is working.
Set SSL mode to **Full (strict)**.

---

## Subsequent deploys

```bash
cd /var/www/daddymoto.com
git pull

npm install
npm run build

pm2 restart daddymoto
```

---

## Useful commands

```bash
pm2 status                    # check if app is running
pm2 logs daddymoto            # tail logs
pm2 restart daddymoto         # restart app
sudo nginx -t                 # test nginx config
sudo systemctl reload nginx   # reload nginx
sudo tail -f /var/log/nginx/daddymoto.error.log   # nginx errors
```

---

## Cloudflare R2 setup (for photo uploads)

1. Go to Cloudflare Dashboard → R2 → Create bucket: `daddymoto-listings`
2. Create an R2 API token with read/write access
3. Enable public access on the bucket (or use a custom domain)
4. Fill in `.env.production`:
   - `R2_ACCOUNT_ID` — your Cloudflare account ID
   - `R2_ACCESS_KEY_ID` — from the R2 API token
   - `R2_SECRET_ACCESS_KEY` — from the R2 API token
   - `R2_BUCKET_NAME` — `daddymoto-listings`
   - `R2_PUBLIC_URL` — the public URL for your bucket (e.g. `https://pub-xxxx.r2.dev`)

---

## Ports in use

| Port | Service           |
|------|-------------------|
| 80   | Nginx (HTTP)      |
| 443  | Nginx (HTTPS)     |
| 3004 | Daddy Moto app    |

edwardramos.com continues to run on its existing port — untouched.

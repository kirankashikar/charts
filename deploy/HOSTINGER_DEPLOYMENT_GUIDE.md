# Hostinger Deployment Guide: charts.fluidpalette.com

**Application**: Chart Studio (Next.js 16 App Router + Prisma + NextAuth + MySQL)  
**Target Domain**: `https://charts.fluidpalette.com`  
**Root Domain**: `fluidpalette.com`  

---

## ⚡ Prerequisites Checklist

Before going live, ensure you have:
- [ ] Access to Hostinger **hPanel** for `fluidpalette.com`.
- [ ] A **Hostinger VPS** (Ubuntu 22.04/24.04 recommended) OR a **Hostinger Cloud/Business Hosting** plan with Node.js support. *(Note: Shared PHP-only hosting cannot run long-running Node.js processes).*
- [ ] Access to **Google Cloud Console** to configure OAuth credentials.

---

## 🌐 Step 1: DNS Configuration in Hostinger hPanel

1. Log in to [Hostinger hPanel](https://hpanel.hostinger.com).
2. Go to **Domains** &rarr; select **`fluidpalette.com`** &rarr; **DNS / Nameservers** (or **DNS Zone Editor**).
3. Add an **A record**:
   - **Type**: `A`
   - **Name**: `charts`
   - **Points to**: `<YOUR_HOSTINGER_SERVER_IP>` *(Your VPS or server public IP address)*
   - **TTL**: `300` (5 minutes)
4. Click **Add Record**.

> **Verification**: Test from terminal:
> ```bash
> dig +short charts.fluidpalette.com
> ```
> It should return your Hostinger server IP once propagated.

---

## 🗄️ Step 2: MySQL Database Setup in Hostinger

Chart Studio stores users, charts, sheets, versions, and sessions in MySQL.

1. In hPanel, navigate to **Databases** &rarr; **Management** (or **MySQL Databases**).
2. Create a new database:
   - **Database name**: e.g., `chartstudio` (full name will look like `u123456789_chartstudio`)
   - **Username**: e.g., `chartuser` (full name will look like `u123456789_chartuser`)
   - **Password**: `<Generate-a-strong-password>`
3. Note your connection details:
   - Host: `localhost` (if on same host) or the MySQL IP/Host shown in hPanel.
   - Port: `3306`
   - Formatted URL:
     ```env
     DATABASE_URL="mysql://u123456789_chartuser:YOUR_PASSWORD@localhost:3306/u123456789_chartstudio"
     ```

---

## 🔑 Step 3: Google OAuth Configuration

Chart Studio uses Google Sign-In for authentication.

1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Select your project (or create one) and open your **OAuth 2.0 Client ID** (Web application).
3. Under **Authorized JavaScript origins**, add:
   - `https://charts.fluidpalette.com`
4. Under **Authorized redirect URIs**, add:
   - `https://charts.fluidpalette.com/api/auth/callback/google`
5. Save changes and copy:
   - **Client ID** (`AUTH_GOOGLE_ID`)
   - **Client Secret** (`AUTH_GOOGLE_SECRET`)

---

## ⚙️ Step 4: Environment Variables (`.env`)

Create a `.env` file on your Hostinger server in the application root directory:

```env
# Database
DATABASE_URL="mysql://u123456789_chartuser:YOUR_PASSWORD@localhost:3306/u123456789_chartstudio"

# Auth.js secret (generate using: openssl rand -base64 32)
AUTH_SECRET="your-generated-secret-key-at-least-32-chars"

# Google OAuth
AUTH_GOOGLE_ID="your-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-your-secret-key"

# Production URLs & Proxy trust
AUTH_TRUST_HOST="true"
NEXT_PUBLIC_APP_URL="https://charts.fluidpalette.com"
PORT="3000"
NODE_ENV="production"
```

---

## 🚀 Step 5: Server Deployment & Execution

### Option A: VPS Deployment via Git (Recommended)

1. SSH into your Hostinger VPS:
   ```bash
   ssh root@<YOUR_SERVER_IP>
   ```
2. Install Node.js (v20.x or higher) and PM2:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx
   sudo npm install -g pm2
   ```
3. Clone the repository into `/var/www/charts`:
   ```bash
   mkdir -p /var/www/charts
   cd /var/www/charts
   git clone https://github.com/kirankashikar/charts.git .
   ```
4. Create `.env` using the values from Step 4:
   ```bash
   nano .env
   ```
5. Install dependencies, run database migrations, and build:
   ```bash
   npm ci
   npx prisma migrate deploy
   npm run build
   ```
6. Start and persist the app using PM2:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Option B: Deploying Pre-built Archive via File Manager

1. Run `./deploy/package_hostinger.sh` locally to generate `deploy/charts_fluidpalette_latest.zip`.
2. Upload and extract the archive to your server directory (e.g. `/var/www/charts` or `public_html/charts`).
3. SSH in, create `.env`, and run:
   ```bash
   npm ci --omit=dev
   npx prisma generate
   npx prisma migrate deploy
   pm2 start ecosystem.config.js
   ```

---

## 🔒 Step 6: Nginx Reverse Proxy & Free SSL (Let's Encrypt)

1. Copy the Nginx configuration to your server:
   ```bash
   sudo cp deploy/nginx-charts.fluidpalette.com.conf /etc/nginx/sites-available/charts.fluidpalette.com
   sudo ln -s /etc/nginx/sites-available/charts.fluidpalette.com /etc/nginx/sites-enabled/
   ```
2. Test Nginx syntax and reload:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```
3. Issue Let's Encrypt SSL certificate:
   ```bash
   sudo certbot --nginx -d charts.fluidpalette.com
   ```
   *(Certbot will automatically update the Nginx configuration with SSL paths and HTTP&rarr;HTTPS redirect).*

---

## ✅ Step 7: Post-Deployment Verification

1. **DNS check**: Confirm `https://charts.fluidpalette.com` loads the Chart Studio homepage.
2. **Authentication**: Test Google Sign-In button and verify redirect succeeds to `/dashboard`.
3. **Database connection**: Create a test chart in the wizard and verify it saves.
4. **Export verification**: Test PNG export (`/api/charts/[id]/image`) to verify `sharp` native library works on the host.
5. **Viewer links**: Test shareable link `/c/[id]` in an incognito window.

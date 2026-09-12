# 🚀 Chart Studio Deployment to chart.fluidpalette.com

**Status**: ✅ Ready for deployment  
**Package**: `charts_fluidpalette_latest.zip` (160MB)  
**Target**: Hostinger VPS (Ubuntu 22.04+) or Node.js host  
**Domains**: `https://chart.fluidpalette.com` (Primary) & `https://charts.fluidpalette.com` (Alias)

---

## 📋 Pre-Deployment Checklist

✅ **Environment**: Configured with:
- Database: `u352534340_charts`
- Google OAuth: Configured
- AUTH_SECRET: Generated
- NEXT_PUBLIC_APP_URL: `https://chart.fluidpalette.com`

✅ **DNS**: Configure in Hostinger hPanel before deployment:
- **Type**: A Record (or CNAME)
- **Name**: `chart` (and `charts`)
- **Points to**: `<YOUR_HOSTINGER_SERVER_IP>`
- **TTL**: 300

---

## 🔧 Quick Deployment Steps (SSH into VPS)

### Step 1: Create application directory and upload archive

```bash
mkdir -p /var/www/charts
cd /var/www/charts
```

Upload `charts_fluidpalette_latest.zip` via SFTP or SCP:
```bash
scp charts_fluidpalette_latest.zip root@<YOUR_SERVER_IP>:/var/www/charts/
```

Extract the archive:
```bash
cd /var/www/charts
unzip charts_fluidpalette_latest.zip -d .
rm charts_fluidpalette_latest.zip
```

### Step 2: Install system dependencies

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20.x or higher)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt-get install -y nginx

# Install SSL certificate management
sudo apt-get install -y certbot python3-certbot-nginx

# Install PM2 globally (process manager)
sudo npm install -g pm2
```

### Step 3: Install dependencies (production only)

```bash
cd /var/www/charts
npm ci --omit=dev
npx prisma generate
```

### Step 4: Create `.env` file

The `.env` is already included in the archive with your credentials. Verify it contains:

```bash
cat .env
```

It should show:
```
DATABASE_URL=mysql://u352534340_charts:***@localhost:3306/u352534340_charts
AUTH_SECRET=***
AUTH_GOOGLE_ID=***
AUTH_GOOGLE_SECRET=***
NEXT_PUBLIC_APP_URL=https://charts.fluidpalette.com
AUTH_TRUST_HOST=true
PORT=3000
NODE_ENV=production
```

### Step 5: Set up database (if first deployment)

```bash
# Run Prisma migrations
npx prisma migrate deploy
```

If you get connection errors, verify:
- MySQL is running: `sudo systemctl status mysql`
- Database exists: `mysql -u root -p -e "SHOW DATABASES;"`
- User has permissions

### Step 6: Start application with PM2

```bash
cd /var/www/charts
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Verify it's running:
```bash
pm2 status
pm2 logs charts-fluidpalette
```

Should show: `listen addr=http://127.0.0.1:3000`

### Step 7: Configure Nginx reverse proxy

Copy the included Nginx configuration:

```bash
sudo cp /var/www/charts/deploy/nginx-charts.fluidpalette.com.conf \
  /etc/nginx/sites-available/charts.fluidpalette.com

sudo ln -s /etc/nginx/sites-available/charts.fluidpalette.com \
  /etc/nginx/sites-enabled/
```

Test Nginx syntax:
```bash
sudo nginx -t
```

Should output: `syntax is ok` and `test is successful`

Reload Nginx:
```bash
sudo systemctl reload nginx
```

### Step 8: Set up SSL certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d charts.fluidpalette.com
```

Follow the prompts:
- Enter email
- Agree to terms
- Choose to redirect HTTP → HTTPS

Verify SSL auto-renewal:
```bash
sudo systemctl enable certbot.timer
sudo certbot renew --dry-run
```

### Step 9: Set proper permissions

```bash
sudo chown -R www-data:www-data /var/www/charts
sudo chmod -R 755 /var/www/charts
sudo chmod 600 /var/www/charts/.env
```

---

## ✅ Post-Deployment Verification

1. **Check DNS propagation**:
   ```bash
   dig +short charts.fluidpalette.com
   ```
   Should return your server IP

2. **Test HTTPS**:
   ```bash
   curl -I https://charts.fluidpalette.com
   ```
   Should return `200 OK`

3. **Open in browser**:
   - Navigate to `https://charts.fluidpalette.com`
   - Should see Chart Studio homepage
   - Test Google Sign-In button

4. **Create a test chart**:
   - Sign in with Google
   - Create a simple chart
   - Verify it saves to database

5. **Test PNG export**:
   - Export chart as PNG
   - Should download without errors

6. **Test viewer link**:
   - Create a chart and get shareable link
   - Open in incognito/private window
   - Should display chart without authentication

---

## 🔄 Ongoing Maintenance

### Check application status:
```bash
pm2 status
pm2 logs charts-fluidpalette --lines 50
```

### Update dependencies:
```bash
cd /var/www/charts
npm update
npm run build
pm2 restart charts-fluidpalette
```

### View database:
```bash
npx prisma studio
```

### Backup database:
```bash
mysqldump -u u352534340_charts -p u352534340_charts > backup_$(date +%Y%m%d).sql
```

---

## 🐛 Troubleshooting

### Port 3000 already in use:
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
pm2 restart charts-fluidpalette
```

### Database connection failed:
```bash
# Check MySQL status
sudo systemctl status mysql

# Verify credentials in .env
cat /var/www/charts/.env | grep DATABASE_URL

# Test connection
mysql -u u352534340_charts -p -h localhost -D u352534340_charts
```

### Nginx not routing requests:
```bash
sudo nginx -t  # Check syntax
sudo systemctl restart nginx
sudo tail -f /var/log/nginx/error.log  # View errors
```

### SSL certificate issues:
```bash
sudo certbot certificates  # List certificates
sudo certbot renew --force-renewal  # Force renewal
sudo systemctl restart nginx
```

---

## 📞 Support

If deployment fails, check:
1. Application logs: `pm2 logs`
2. Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. System logs: `sudo journalctl -xe`
4. Database connectivity: `mysql -u user -p`

---

**Ready to deploy!** Follow the steps above to go live with charts.fluidpalette.com 🎉

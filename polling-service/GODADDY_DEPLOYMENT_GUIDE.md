# GoDaddy Deployment Guide - EMD Polling Service

## Complete Step-by-Step Setup for api.ziklag.shop

This standalone polling service solves the data syncing issue by running continuously on your GoDaddy server, polling FileMaker every 30 seconds and storing data in Supabase.

---

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   FileMaker     │◄────────│  api.ziklag.shop │────────►│    Supabase     │
│   Database      │  Poll   │  Polling Service │  Store  │    Database     │
└─────────────────┘  every  └──────────────────┘  data   └─────────────────┘
                     30s            Runs 24/7                        │
                                                                     │
                                                                     ▼
                                                          ┌─────────────────┐
                                                          │ emd-rho.vercel  │
                                                          │   Front Dashboard    │
                                                          └─────────────────┘
```

**Result**: Vercel frontend reads data from Supabase (synced by your polling service)

---

## Part 1: GoDaddy Setup

### Step 1: Check Your GoDaddy Hosting Type

1. Log into GoDaddy.com
2. Go to "My Products"
3. Find your hosting for `ziklag.shop`
4. Check what type you have:
   - **cPanel Hosting** - ✅ Can run Node.js apps
   - **WordPress Hosting** - ❌ Cannot run Node.js (consider upgrade)
   - **VPS/Dedicated** - ✅ Full control
   - **Domain Only** - ❌ No hosting (need to add)

**If you DON'T have cPanel or VPS hosting**, you'll need to either:
- Upgrade your plan to include cPanel hosting (~$6-10/month)
- Or use a free alternative like Railway.app or Render.com

### Step 2: Access cPanel (If You Have It)

1. GoDaddy → My Products → Web Hosting → Manage
2. Click "cPanel Admin"
3. You should see the cPanel dashboard

### Step 3: Enable Node.js on GoDaddy

Most GoDaddy cPanel plans support Node.js applications:

1. In cPanel, look for **"Setup Node.js App"** or **"Application Manager"**
2. If you don't see it, contact GoDaddy support to enable Node.js
3. Note: Some plans may require "Deluxe" or "Ultimate" tier for Node.js

---

## Part 2: Upload Polling Service

### Option A: Using cPanel File Manager

1. **In cPanel, open File Manager**
2. **Navigate to** `public_html` or create new directory `polling-service`
3. **Upload these files** from your local `polling-service/` folder:
   - `server.js`
   - `package.json`
   - `.env.example`

4. **Create `.env` file**:
   - Click "New File" → name it `.env`
   - Edit the file and paste:
   ```env
   PORT=3001
   NODE_ENV=production
   
   FILEMAKER_HOST=modd.mainspringhost.com
   FILEMAKER_DATABASE=PEP2_1
   FILEMAKER_LAYOUT=jobs_api
   FILEMAKER_USER=trevor_api
   FILEMAKER_PASSWORD=XcScS2yRoTtMo7
   
   SUPABASE_URL=https://dqmbnodnhxowaatprnjj.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbWJub2RuaHhvd2FhdHBybmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTk1MTYsImV4cCI6MjA3ODM3NTUxNn0.f4ypjAUKamtoILho327jtkSduvmbbfF5CDuSd1Ln9RQ
   
   POLLING_INTERVAL=30000
   POLLING_AUTO_START=true
   ```

### Option B: Using FTP/SFTP

1. **Get FTP credentials** from GoDaddy cPanel → FTP Accounts
2. **Use FileZilla or similar** FTP client
3. **Upload files** to `/public_html/polling-service/`
4. **Create `.env`** file with credentials above

### Option C: Using SSH (VPS only)

```bash
# Connect to your server
ssh username@your-server-ip

# Create directory
mkdir -p /var/www/polling-service
cd /var/www/polling-service

# Upload files (or use git clone)
# Then create .env file
nano .env
# Paste credentials, save (Ctrl+X, Y, Enter)
```

---

## Part 3: Install Dependencies & Start Service

### Using cPanel "Setup Node.js App"

1. **In cPanel**, find **"Setup Node.js App"**
2. **Click "Create Application"**
3. **Fill in**:
   - **Node.js version**: 18.x or higher
   - **Application mode**: Production
   - **Application root**: `polling-service` (or path where you uploaded files)
   - **Application URL**: Choose subdomain like `api.ziklag.shop`
   - **Application startup file**: `server.js`
   - **Port**: 3001 (or any available port)

4. **Click "Create"**

5. **Install dependencies**:
   - cPanel will show a terminal/command option
   - Run: `npm install`
   - This installs axios, @supabase/supabase-js, express, etc.

6. **Start the application**:
   - Click "Start" button in the Node.js App Manager
   - Or run: `node server.js`

### Using SSH/Terminal

```bash
cd /path/to/polling-service

# Install dependencies
npm install

# Test locally first
npm start

# You should see:
# EMD Polling Service running on port 3001
# Auto-starting polling...
# [Poll #1] Starting at...

# Stop with Ctrl+C when satisfied it works
```

---

## Part 4: Configure DNS for api.ziklag.shop

### In GoDaddy DNS Settings:

1. **Go to** GoDaddy → My Products → Domains
2. **Click** on `ziklag.shop`
3. **Click** "Manage DNS" or "DNS"
4. **Add a new A Record**:
   - **Type**: A
   - **Name**: `api` (creates api.ziklag.shop)
   - **Value**: Your GoDaddy server IP address
     - Find this in cPanel → "Server Information" or
     - Contact GoDaddy support for your server IP
   - **TTL**: 600 (10 minutes)

5. **Click "Save"**

6. **Wait 10-60 minutes** for DNS propagation

### Find Your Server IP:

**Method 1 - cPanel**:
- cPanel → Expand "Stats" on right side
- Look for "Shared IP Address" or "Server IP"

**Method 2 - Terminal**:
```bash
curl ifconfig.me
```

**Method 3 - Ask GoDaddy**:
- Live chat support can provide your hosting IP instantly

---

## Part 5: Keep Service Running 24/7

Node.js processes stop when you close the terminal. Use **PM2** to keep it running:

### Install PM2 (Process Manager)

```bash
# Via cPanel Terminal or SSH
npm install -g pm2

# Start service with PM2
cd /path/to/polling-service
pm2 start server.js --name "emd-polling"

# Make it auto-restart on server reboot
pm2 startup
pm2 save

# Check status
pm2 status

# View logs
pm2 logs emd-polling
```

### PM2 Commands Reference:
```bash
pm2 start server.js --name emd-polling  # Start service
pm2 stop emd-polling                    # Stop service
pm2 restart emd-polling                 # Restart service
pm2 logs emd-polling                    # View logs
pm2 status                              # Check if running
pm2 delete emd-polling                  # Remove from PM2
```

---

## Part 6: Verify Everything Works

### Test 1: Check Service is Running

Visit: `http://api.ziklag.shop:3001/health`

**Expected Response**:
```json
{
  "status": "healthy",
  "service": "EMD Polling Service",
  "isPolling": true,
  "stats": {
    "totalPolls": 10,
    "successfulPolls": 10,
    ...
  }
}
```

### Test 2: Check Polling Status

Visit: `http://api.ziklag.shop:3001/stats`

Should show active polling with job counts.

### Test 3: Verify Data in Supabase

1. Go to https://app.supabase.com/project/dqmbnodnhxowaatprnjj
2. Table Editor → `jobs_history`
3. Should see new rows being added every 30 seconds
4. Check `snapshot_timestamp` - should be recent

### Test 4: Check Dashboard

1. Open https://emd-rho.vercel.app
2. Wait 1-2 minutes for data to populate
3. Click refresh
4. Should see alerts appear (if any exist)
5. "Last Update" should show recent time

---

## Part 7: Configure Firewall (Important for Security)

### Option A: If using cPanel's firewall interface
1. cPanel → Security → Firewall
2. Allow incoming connections on port 3001
3. Optionally restrict to specific IPs

### Option B: If using iptables (VPS)
```bash
# Allow port 3001
sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
sudo iptables-save
```

### Option C: Reverse Proxy (Recommended for Production)

Instead of exposing port 3001 directly, use Apache/Nginx:

**Apache** (create `.htaccess` in polling-service):
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

ProxyPass / http://localhost:3001/
ProxyPassReverse / http://localhost:3001/
```

**Nginx** (if available):
```nginx
server {
    listen 80;
    server_name api.ziklag.shop;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then access at: `http://api.ziklag.shop/health` (no port needed)

---

## Part 8: SSL Certificate (HTTPS)

For production, enable HTTPS:

### Using cPanel's Let's Encrypt (Free SSL)

1. **cPanel → Security → SSL/TLS Status**
2. **Find** `api.ziklag.shop` in the list
3. **Click** "Run AutoSSL"
4. **Wait** for certificate to install (1-5 minutes)
5. **Access** via `https://api.ziklag.shop/health`

Alternatively:
1. **cPanel → Security → Let's Encrypt SSL**
2. **Select** `api.ziklag.shop` subdomain
3. **Click** "Issue"

---

## Quick Setup Checklist

- [ ] Verify GoDaddy has Node.js support (cPanel/VPS)
- [ ] Upload polling-service files to GoDaddy
- [ ] Create `.env` file with credentials
- [ ] Run `npm install` in cPanel terminal
- [ ] Configure DNS: api.ziklag.shop → Your server IP
- [ ] Start service with PM2: `pm2 start server.js --name emd-polling`
- [ ] Configure PM2 auto-restart: `pm2 startup && pm2 save`
- [ ] Test: `http://api.ziklag.shop:3001/health`
- [ ] Verify data appearing in Supabase
- [ ] Check Vercel dashboard shows alerts
- [ ] Optional: Setup SSL certificate
- [ ] Optional: Configure reverse proxy

---

## Troubleshooting

### Issue: "Cannot connect to api.ziklag.shop"

**Causes**:
1. DNS not propagated yet (wait 30-60 minutes)
2. Firewall blocking port 3001
3. Service not running

**Solutions**:
- Check DNS: `nslookup api.ziklag.shop`
- Check service: `pm2 status`
- Check firewall: Allow port 3001
- Try server IP directly: `http://YOUR_IP:3001/health`

### Issue: "Service stops after closing terminal"

**Cause**: Not using PM2

**Solution**: Install and use PM2 as described above

### Issue: "Module not found" errors

**Cause**: Dependencies not installed

**Solution**:
```bash
cd /path/to/polling-service
npm install
pm2 restart emd-polling
```

### Issue: "Can't connect to FileMaker"

**Cause**: Firewall or credentials

**Solution**:
- Verify `.env` credentials are correct
- Check FileMaker server allows connections from your GoDaddy IP
- Test FileMaker connection manually

---

## Alternative: If GoDaddy Doesn't Support Node.js

If GoDaddy cannot run Node.js apps, use these FREE alternatives:

### Option 1: Railway.app (Free tier)
1. Sign up at https://railway.app
2. New Project → Deploy from GitHub
3. Connect this polling-service folder
4. Add environment variables
5. Deploy - runs 24/7 free

### Option 2: Render.com (Free tier)
1. Sign up at https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Point to `polling-service/`
5. Add environment variables  
6. Deploy - free tier available

### Option 3: Fly.io (Free tier)
1. Sign up at https://fly.io
2. Install flyctl CLI
3. `fly launch` in polling-service directory
4. Deploy - generous free tier

**All these provide**:
- Free Node.js hosting
- 24/7 uptime
- Easy deployment
- PM2-like process management built-in

---

## Cost Comparison

| Option | Monthly Cost | Setup Time | Reliability |
|--------|--------------|------------|-------------|
| **GoDaddy (if you already have hosting)** | $0 extra | 30-60 min | High |
| **Railway.app free tier** | $0 | 15 min | High |
| **Render.com free tier** | $0 | 15 min | Medium |
| **Vercel Pro (cron jobs)** | $20 | 10 min | High |
| **Your local computer (npm run dev)** | $0 | 0 min | Low (must stay on) |

---

## Support Resources

### GoDaddy Help:
- **Live Chat**: Available 24/7 at godaddy.com/help
- **Question**: "I need to run a Node.js application on my hosting. Is this supported?"
- **Ask for**: Node.js app installation guide for your plan

### If Node.js Not Available:
- **Recommendat ion**: Railway.app (easiest, free, reliable)
- **Setup time**: 15 minutes
- **Guide**: https://docs.railway.app/guides/nodejs

---

*Next Steps: Follow the deployment method that matches your hosting capability*
# Exception Management Dashboard - Deployment Guide

**Version**: 1.0  
**Last Updated**: November 10, 2025  
**Target Platform**: Vercel

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Vercel Deployment](#vercel-deployment)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Post-Deployment](#post-deployment)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- [x] GitHub account (for code repository)
- [x] Vercel account (for hosting)
- [x] FileMaker Data API access

### Required Software
- [x] Node.js 18+ installed
- [x] npm 9+ installed
- [x] Git installed

### Required Information
- FileMaker host URL
- FileMaker database name
- FileMaker API credentials
- FileMaker layout name

---

## Environment Setup

### 1. Prepare Your Repository

```bash
# Ensure all changes are committed
git status
git add .
git commit -m "Prepare for production deployment"

# Push to GitHub
git push origin master
```

### 2. Create Production Environment File

Create `.env.production` (do NOT commit this file):

```bash
# FileMaker Data API Configuration
FILEMAKER_HOST=modd.mainspringhost.com
FILEMAKER_DATABASE=PEP2_1
FILEMAKER_LAYOUT=jobs_api
FILEMAKER_USER=trevor_api
FILEMAKER_PASSWORD=your_production_password

# Polling Configuration
POLLING_INTERVAL=30000
POLLING_BATCH_SIZE=100
POLLING_ENABLED=true
POLLING_AUTO_START=true
ALERT_THRESHOLD=5

# Cache Configuration
CACHE_DB_PATH=./data/cache.db
CACHE_TTL=300000
CACHE_MAX_SIZE=1000
CACHE_PERSIST=true

# Timezone
TIMEZONE=America/Denver

# Application Settings
NODE_ENV=production
```

---

## Vercel Deployment

### Method 1: Vercel CLI (Recommended)

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

#### Step 3: Deploy

```bash
# First deployment (creates project)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No
# - Project name? emd-dashboard
# - Directory? ./
# - Override settings? No

# Production deployment
vercel --prod
```

### Method 2: Vercel Dashboard

#### Step 1: Import Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Click "Import"

#### Step 2: Configure Project

1. **Project Name**: `emd-dashboard`
2. **Framework Preset**: Next.js
3. **Root Directory**: `./`
4. **Build Command**: `npm run build`
5. **Output Directory**: `.next`
6. **Install Command**: `npm install`

#### Step 3: Add Environment Variables

Click "Environment Variables" and add all variables from `.env.production`:

| Name | Value | Environment |
|------|-------|-------------|
| `FILEMAKER_HOST` | `modd.mainspringhost.com` | Production |
| `FILEMAKER_DATABASE` | `PEP2_1` | Production |
| `FILEMAKER_LAYOUT` | `jobs_api` | Production |
| `FILEMAKER_USER` | `trevor_api` | Production |
| `FILEMAKER_PASSWORD` | `***` | Production |
| `POLLING_INTERVAL` | `30000` | Production |
| `POLLING_BATCH_SIZE` | `100` | Production |
| `POLLING_ENABLED` | `true` | Production |
| `POLLING_AUTO_START` | `true` | Production |
| `CACHE_TTL` | `300000` | Production |
| `TIMEZONE` | `America/Denver` | Production |
| `NODE_ENV` | `production` | Production |

#### Step 4: Deploy

Click "Deploy" and wait for the build to complete.

---

## Environment Variables

### Required Variables

```bash
# FileMaker Connection
FILEMAKER_HOST=modd.mainspringhost.com
FILEMAKER_DATABASE=PEP2_1
FILEMAKER_LAYOUT=jobs_api
FILEMAKER_USER=trevor_api
FILEMAKER_PASSWORD=your_password_here
```

### Optional Variables

```bash
# Polling Configuration
POLLING_INTERVAL=30000          # 30 seconds (default)
POLLING_BATCH_SIZE=100          # Jobs per poll (default)
POLLING_ENABLED=true            # Enable polling (default)
POLLING_AUTO_START=true         # Auto-start on launch (default)

# Cache Configuration
CACHE_TTL=300000                # 5 minutes (default)
CACHE_MAX_SIZE=1000             # Max cached jobs (default)
CACHE_PERSIST=true              # Enable SQLite persistence (default)

# Application Settings
TIMEZONE=America/Denver         # Your timezone
NODE_ENV=production             # Environment
```

### Security Best Practices

1. **Never commit** `.env` files to Git
2. **Use Vercel's** environment variable encryption
3. **Rotate passwords** regularly
4. **Use different credentials** for production vs development
5. **Limit API user permissions** in FileMaker

---

## Database Setup

### SQLite Cache Database

The application uses SQLite for caching. Vercel's filesystem is ephemeral, so:

**Option 1: In-Memory Only (Recommended for Vercel)**

Update `src/services/CacheService.js`:

```javascript
// Use in-memory cache only for Vercel
const CACHE_PERSIST = process.env.VERCEL ? false : true;
```

**Option 2: External Database (Future Enhancement)**

For persistent caching, consider:
- Vercel KV (Redis)
- Upstash Redis
- PlanetScale (MySQL)
- Supabase (PostgreSQL)

---

## Post-Deployment

### 1. Verify Deployment

```bash
# Get deployment URL
vercel ls

# Test the deployment
curl https://your-deployment-url.vercel.app/api/alerts
```

### 2. Test FileMaker Connection

```bash
# Test FileMaker API
curl https://your-deployment-url.vercel.app/api/polling/status
```

### 3. Configure Custom Domain (Optional)

```bash
# Add custom domain
vercel domains add emd.pepmove.com

# Verify domain
vercel domains verify emd.pepmove.com
```

### 4. Set Up Monitoring

1. Enable Vercel Analytics
2. Configure error tracking (Sentry)
3. Set up uptime monitoring (UptimeRobot)
4. Configure log aggregation (Logtail)

---

## Monitoring

### Vercel Analytics

Enable in Vercel Dashboard:
1. Go to your project
2. Click "Analytics"
3. Enable "Web Analytics"

### Error Tracking with Sentry

```bash
# Install Sentry
npm install @sentry/nextjs

# Initialize Sentry
npx @sentry/wizard -i nextjs
```

Add to `next.config.js`:

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig({
  // Your Next.js config
}, {
  // Sentry config
  silent: true,
  org: "pepmove",
  project: "emd-dashboard",
});
```

### Uptime Monitoring

Use UptimeRobot or similar:
- **URL**: `https://your-deployment-url.vercel.app/api/polling/status`
- **Interval**: 5 minutes
- **Alert**: Email/SMS on downtime

### Log Monitoring

Vercel provides built-in logging:
1. Go to your project
2. Click "Logs"
3. Filter by severity

---

## Troubleshooting

### Build Failures

**Error**: `Module not found`

```bash
# Solution: Ensure all dependencies are in package.json
npm install
npm run build
```

**Error**: `Environment variable not found`

```bash
# Solution: Add missing variables in Vercel dashboard
vercel env add VARIABLE_NAME
```

### Runtime Errors

**Error**: `FileMaker connection failed`

```bash
# Check environment variables
vercel env ls

# Test FileMaker credentials locally
npm run test:filemaker
```

**Error**: `Database error`

```bash
# Disable SQLite persistence for Vercel
# Set CACHE_PERSIST=false in environment variables
```

### Performance Issues

**Slow response times**

1. Check FileMaker API response time
2. Reduce `POLLING_BATCH_SIZE`
3. Increase `CACHE_TTL`
4. Enable Vercel Edge Functions

**High memory usage**

1. Reduce `CACHE_MAX_SIZE`
2. Disable cache persistence
3. Optimize alert rules

---

## Rollback Procedure

### Rollback to Previous Deployment

```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote <deployment-url>
```

### Rollback via Dashboard

1. Go to Vercel Dashboard
2. Click "Deployments"
3. Find previous successful deployment
4. Click "Promote to Production"

---

## Maintenance

### Regular Tasks

**Daily**:
- Monitor error logs
- Check uptime status
- Review alert accuracy

**Weekly**:
- Review performance metrics
- Check FileMaker API usage
- Update dependencies (if needed)

**Monthly**:
- Rotate API credentials
- Review and optimize alert rules
- Update documentation

### Updating the Application

```bash
# Make changes locally
git add .
git commit -m "Update: description"
git push origin master

# Vercel auto-deploys on push
# Or manually deploy:
vercel --prod
```

---

## Security Checklist

- [ ] Environment variables are encrypted
- [ ] FileMaker credentials are secure
- [ ] HTTPS is enabled (automatic with Vercel)
- [ ] API rate limiting is configured
- [ ] Error messages don't expose sensitive data
- [ ] Dependencies are up to date
- [ ] Security headers are configured

---

## Performance Optimization

### Next.js Configuration

Add to `next.config.js`:

```javascript
module.exports = {
  // Enable compression
  compress: true,
  
  // Optimize images
  images: {
    domains: ['your-domain.com'],
  },
  
  // Enable SWC minification
  swcMinify: true,
  
  // Production source maps
  productionBrowserSourceMaps: false,
};
```

### Caching Strategy

```javascript
// API route caching
export const config = {
  runtime: 'edge',
  regions: ['iad1'], // Closest to FileMaker server
};
```

---

## Support

### Deployment Issues
- **Vercel Support**: https://vercel.com/support
- **Documentation**: https://vercel.com/docs

### Application Issues
- **Email**: dev-team@pepmove.com
- **GitHub Issues**: https://github.com/pepmove/emd-dashboard/issues

---

## Appendix

### Useful Commands

```bash
# Check deployment status
vercel ls

# View logs
vercel logs

# Open deployment in browser
vercel open

# Remove deployment
vercel rm <deployment-url>

# List environment variables
vercel env ls

# Pull environment variables
vercel env pull
```

### Vercel Configuration File

Create `vercel.json`:

```json
{
  "version": 2,
  "name": "emd-dashboard",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "regions": ["iad1"]
}
```

---

**End of Deployment Guide**

*For the latest deployment procedures, refer to Vercel's official documentation.*


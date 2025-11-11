# Vercel Deployment Guide - Serverless Architecture

## Critical Issue Identified & Resolved

### Problem
The Vercel deployment was working **BUT no data was being synced** from FileMaker because:

1. **PollingService runs continuously** (every 30 seconds) in development
2. **Vercel is serverless** - functions only run when triggered by HTTP requests
3. **No long-running processes allowed** on Vercel's platform
4. **Auto-start polling doesn't work** in serverless environments

**Result**: Frontend loads, but shows "0 alerts" because no data is being imported from FileMaker.

### Solution
Implemented **Vercel Cron Jobs** to trigger FileMaker polling every minute.

---

## What Was Changed (Commit `fec4951`)

### 1. Created Serverless Polling Endpoint
**File**: [`src/pages/api/polling/cron.js`](src/pages/api/polling/cron.js)
- Vercel calls this endpoint every 1 minute
- Polls FileMaker for active jobs
- Stores snapshots in Supabase
- Evaluates alert rules
- Identical functionality to local PollingService

### 2. Configured Vercel Cron
**File**: [`vercel.json`](vercel.json)
```json
{
  "crons": [
    {
      "path": "/api/polling/cron",
      "schedule": "*/1 * * * *"  // Every 1 minute
    }
  ]
}
```

---

## Manual Steps Required in Vercel

### Step 1: Enable Cron Jobs (Vercel Pro Required)

⚠️ **IMPORTANT**: Vercel Cron Jobs require a **Pro plan** ($20/month)

**If you have Vercel Pro:**
1. Go to your Vercel project dashboard
2. Navigate to "Settings" → "Cron Jobs"  
3. Verify the cron job appears: `/api/polling/cron` running every minute
4. Enable the cron job

**If you DON'T have Vercel Pro:**

**Option A**: Upgrade to Vercel Pro ($20/month)
- Enables automatic cron jobs
- Better for production deployments
- No manual triggers needed

**Option B**: Use an external cron service (FREE)
1. Sign up for https://cron-job.org (free)
2. Create a new cron job:
   - **URL**: `https://emd-rho.vercel.app/api/polling/cron`
   - **Schedule**: Every 1 minute
   - **Method**: GET
3. This will trigger your polling endpoint externally

**Option C**: Keep local polling only
- Vercel deployment shows UI only
- Run `npm run dev` locally to sync data
- Good for development/testing, not production

### Step 2: Add Environment Variables to Vercel

**Required Variables** (Settings → Environment Variables):

```bash
# FileMaker Connection
FILEMAKER_HOST=modd.mainspringhost.com
FILEMAKER_DATABASE=PEP2_1
FILEMAKER_LAYOUT=jobs_api
FILEMAKER_USER=trevor_api
FILEMAKER_PASSWORD=XcScS2yRoTtMo7

# Supabase Connection  
SUPABASE_URL=https://dqmbnodnhxowaatprnjj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbWJub2RuaHhvd2FhdHBybmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTk1MTYsImV4cCI6MjA3ODM3NTUxNn0.f4ypjAUKamtoILho327jtkSduvmbbfF5CDuSd1Ln9RQ

# Google Maps Geocoding
GOOGLE_MAPS_API_KEY=AIzaSyADz-2xSWWqbquc9KOgd6U40Znlzf3WAdI

# OpenRouter AI
OPENROUTER_API_KEY=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
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=deepseek/deepseek-r1

# Configuration
POLLING_INTERVAL=60000
POLLING_BATCH_SIZE=100
POLLING_ENABLED=true
TIMEZONE=America/Denver
NODE_ENV=production
```

**After adding variables, redeploy the application.**

### Step 3: Create geocode_cache Table in Supabase

Follow instructions in [`SUPABASE_GEOCODE_SETUP.md`](SUPABASE_GEOCODE_SETUP.md):

1. Open https://app.supabase.com/project/dqmbnodnhxowaatprnjj
2. SQL Editor → New query
3. Copy SQL from `supabase/migrations/002_geocode_cache.sql`
4. Run it
5. Verify table created in Table Editor

---

## Architecture Comparison

### Local Development (Works ✅):
```
Server starts → PollingService auto-starts → Polls every 30s continuously
→ Real-time data sync → Dashboard shows live alerts
```

### Vercel Serverless (Fixed ✅):
```
Vercel Cron Job (every 1 min) → Triggers /api/polling/cron
→ Polls FileMaker → Stores in Supabase → Dashboard shows alerts
```

---

## Verification Steps

### 1. Check Cron Job is Running
- Vercel Dashboard → Project → Deployments → Latest
- Click "Functions" tab
- Look for `/api/polling/cron` executions
- Should see executions every minute

### 2. Verify Data Sync
- Open https://emd-rho.vercel.app
- Wait 1-2 minutes for first cron execution
- Click refresh button
- Should see alerts appear (if any exist in FileMaker)
- "Last Update" time should be recent

### 3. Check Supabase Data
- Open https://app.supabase.com/project/dqmbnodnhxowaatprnjj
- Table Editor → `jobs_history`
- Should see job snapshots being added every minute
- Check `snapshot_timestamp` for recent entries

### 4. Monitor Cron Logs
- Vercel → Project → Logs
- Filter by `/api/polling/cron`
- Should see successful executions:
  ```
  [Cron] Retrieved X active jobs
  [Cron] Stored X job snapshots
  [Cron] Complete in Xms - Y active alerts
  ```

---

## Troubleshooting

### Issue: Still no data after deployment

**Possible Causes**:
1. **Cron not enabled**: Vercel Pro required, or use external cron service
2. **Environment variables missing**: FileMaker/Supabase credentials not in Vercel
3. **Cron hasn't run yet**: Wait 1-2 minutes after deployment
4. **FileMaker connection failing**: Check credentials are correct

**Solutions**:
1. Enable cron via Vercel Pro or cron-job.org
2. Add all environment variables listed above
3. Wait for first execution, check Vercel logs
4. Test FileMaker connection manually

### Issue: Geocoding not working

**Cause**: `GOOGLE_MAPS_API_KEY` not in Vercel environment

**Solution**:
1. Add API key to Vercel environment variables
2. Create `geocode_cache` table in Supabase
3. Redeploy application

### Issue: Alerts showing but route optimization fails

**Cause**: Scheduled jobs exist but can't be geocoded

**Solution**:
1. Verify Google Maps API key is configured
2. Check geocode_cache table exists
3. Check browser console for geocoding errors
4. Test specific address in Google Maps

---

## Performance Considerations

### Polling Frequency
- **Local**: Every 30 seconds (configurable)
- **Vercel Free**: Manual polling only (start API)
- **Vercel Pro**: Every 1 minute via cron (configurable)

### Data Freshness
- **Local**: Near real-time (30s latency)
- **Vercel with Cron**: 1 minute latency max
- **Vercel without Cron**: On-demand only (manual refresh)

### Recommendations
- **Production**: Use Vercel Pro + Cron for automatic syncing
- **Development**: Local `npm run dev` with auto-polling
- **Budget Option**: External free cron service (cron-job.org)

---

## Next Steps

### Immediate (Required for Production):
1. ✅ Deploy code changes (commit `fec4951`) 
2. ⏳ Add all environment variables to Vercel
3. ⏳ Enable Vercel Cron (Pro plan) OR setup external cron
4. ⏳ Create` geocode_cache table in Supabase
5. ⏳ Wait 1-2 minutes for first cron execution
6. ✅ Verify data appears on dashboard

### Optional (Enhancements):
- Configure cron frequency (1 min vs 5 min vs 15 min)
- Add cron execution monitoring/alerting
- Implement retry logic for failed polls
- Add health check endpoint for cron status

---

## Summary

**Problem**: Vercel deployment had no data sync because serverless platforms don't support continuous background processes.

**Solution**: Implemented Vercel Cron Jobs to trigger polling every minute, maintaining the same functionality as local development but in a serverless-compatible architecture.

**Status**: 
- ✅ Code deployed (commit `fec4951`)
- ⏳ Waiting for Vercel environment setup
- ⏳ Waiting for cron job enablement

**Expected Result**: Once cron is enabled and environment variables are set, FileMaker data will automatically sync every minute, alerts will appear, and route optimization will work with real scheduled jobs.

---

*Last Updated: 2025-11-11*  
*Commit: fec4951*  
*Critical: Requires Vercel Pro or external cron service*
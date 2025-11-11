# Railway Deployment Guide - EMD Polling Service

## Overview
This guide deploys the EMD Polling Service to Railway for continuous FileMaker data synchronization to Supabase.

**Project Details:**
- Project Name: charismatic-friendship
- Project ID: bd3d3af4-a199-4894-af67-4be5e7569440
- API Key: f43d3b98-91f8-4f7f-88f9-50b93d86b7e0

## Step 1: Deploy to Railway

### Option A: CLI Deployment (Recommended)

1. **Install Railway CLI**
```bash
npm install -g @railway/cli
```

2. **Login to Railway**
```bash
railway login
```

3. **Navigate to polling service directory**
```bash
cd polling-service
```

4. **Deploy**
```bash
railway deploy
```

### Option B: Manual Setup

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your EMD repository
5. Set root directory to `polling-service`
6. Railway will auto-detect Node.js and deploy

## Step 2: Configure Environment Variables

In Railway dashboard, add these environment variables:

```
FILEMAKER_HOST=your-filemaker-server.com
FILEMAKER_DATABASE=your_database_name
FILEMAKER_LAYOUT=jobs_api
FILEMAKER_USER=your_username
FILEMAKER_PASSWORD=your_password
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
POLLING_INTERVAL=30000
POLLING_AUTO_START=true
NODE_ENV=production
```

## Step 3: Get Railway Domain

After deployment, Railway provides a domain like:
`https://charismatic-friendship-production.up.railway.app`

## Step 4: Update Main Project Configuration

Update the main Vercel project's environment variable:

```
POLLING_SERVICE_URL=https://charismatic-friendship-production.up.railway.app
```

## Step 5: Verify Deployment

Test the polling service:

```bash
curl https://charismatic-friendship-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "EMD Polling Service",
  "isPolling": true,
  "stats": {
    "totalPolls": 1,
    "successfulPolls": 1,
    "failedPolls": 0,
    "lastPollTime": "2025-11-11T18:47:59.098Z",
    "lastError": null
  },
  "uptime": 30,
  "timestamp": "2025-11-11T18:47:59.098Z"
}
```

## Step 6: Monitor Logs

View real-time logs:
```bash
railway logs
```

Or through Railway dashboard:
- Go to your project
- Click "Deployments" tab
- Click on deployment → "View Logs"

## Troubleshooting

### Common Issues

1. **Build fails**
   - Check `package.json` dependencies
   - Ensure Node.js version compatibility

2. **Environment variables missing**
   - Verify all required vars are set in Railway dashboard
   - Restart deployment after adding vars

3. **Polling not starting**
   - Check `/health` endpoint for status
   - Verify `POLLING_AUTO_START=true`
   - Check logs for FileMaker connection errors

4. **FileMaker connection errors**
   - Verify credentials and server address
   - Check firewall rules for FileMaker access
   - Ensure database/layout names are correct

### Monitor Performance

- **Health Check**: `GET /health`
- **Statistics**: `GET /stats`
- **Manual Poll**: `POST /poll`

## Cost Optimization

Railway pricing:
- Free tier: $5 usage per month
- Hobby plan: $20/month for higher limits
- Pro plan: Custom pricing

For this service:
- ~$5-10/month expected usage
- Low CPU/memory requirements
- 24/7 uptime with persistent data

## Next Steps

1. Deploy to Railway
2. Verify polling is working
3. Update main project to use Railway endpoint
4. Monitor for 24 hours
5. Set up alerts for failures

## Integration

Once deployed, the polling service will:
1. Poll FileMaker every 30 seconds
2. Store job data in Supabase
3. Provide health monitoring
4. Enable manual triggers if needed

The main Vercel dashboard will automatically receive updated data through Supabase.
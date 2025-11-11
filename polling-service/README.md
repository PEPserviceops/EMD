# EMD Polling Service - Standalone Server

## Purpose

This standalone service solves the Vercel serverless limitation by providing continuous FileMaker data polling that runs 24/7.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your credentials

# Start service
npm start
```

The service will:
- Poll FileMaker every 30 seconds
- Store job snapshots in Supabase
- Run continuously in background
- Provide health check endpoints

## Deployment

Deploy this to **api.ziklag.shop** subdomain on your GoDaddy server.

See **[GODADDY_DEPLOYMENT_GUIDE.md](GODADDY_DEPLOYMENT_GUIDE.md)** for complete step-by-step instructions.

## API Endpoints

- `GET /` - Service info and available endpoints
- `GET /health` - Health check and current status
- `GET /stats` - Polling statistics
- `POST /poll` - Trigger manual poll
- `POST /start` - Start polling
- `POST /stop` - Stop polling

## How It Works

```
api.ziklag.shop (polling service)
    ↓ Every 30s
FileMaker Database
    ↓ Store data
Supabase Database
    ↓ Read data  
emd-rho.vercel.app (dashboard)
```

## Files

- `server.js` - Main service code
- `package.json` - Dependencies
- `.env.example` - Configuration template
- `GODADDY_DEPLOYMENT_GUIDE.md` - Deployment instructions
- `README.md` - This file

## Requirements

- Node.js 18+ 
- GoDaddy cPanel with Node.js support (or VPS)
- PM2 for keeping service running 24/7

## Monitoring

Check service health:
```bash
curl http://api.ziklag.shop:3001/health
```

View logs with PM2:
```bash
pm2 logs emd-polling
```

## Troubleshooting

See [GODADDY_DEPLOYMENT_GUIDE.md](GODADDY_DEPLOYMENT_GUIDE.md) for complete troubleshooting guide.

**Quick fixes**:
- Service not running: `pm2 restart emd-polling`
- Check logs: `pm2 logs emd-polling --lines 100`
- Test manually: `curl http://localhost:3001/health`
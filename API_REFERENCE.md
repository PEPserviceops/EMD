# EMD API Reference

Complete API documentation for the Exception Management Dashboard.

## Core Endpoints

### Alerts API

#### GET /api/alerts
Get active alerts with filtering options.

**Query Parameters:**
- `severity` (optional): Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)
- `limit` (optional): Limit number of results

**Response:**
```json
{
  "success": true,
  "alerts": [...],
  "stats": {
    "total": 5,
    "critical": 1,
    "high": 2,
    "medium": 1,
    "low": 1
  },
  "source": "filemaker",
  "timestamp": "2025-11-11T..."
}
```

#### POST /api/alerts/[id]/acknowledge
Acknowledge a specific alert.

**Request Body:**
```json
{
  "acknowledgedBy": "user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert acknowledged successfully",
  "alertId": "alert_123"
}
```

#### POST /api/alerts/[id]/dismiss
Dismiss a specific alert.

**Request Body:**
```json
{
  "dismissedBy": "user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert dismissed successfully",
  "alertId": "alert_123"
}
```

### Fleet GPS API

#### GET /api/fleet/gps-status
Get current GPS status for all fleet vehicles.

**Response:**
```json
{
  "success": true,
  "gpsStatus": {
    "totalTrucks": 16,
    "trucksWithGps": 14,
    "activeTrucks": 12,
    "idleTrucks": 2,
    "trucks": [...]
  },
  "serviceInfo": {
    "enabled": true,
    "apiConfigured": true,
    "truckMappings": 14
  }
}
```

#### POST /api/fleet/sync-gps
Trigger manual GPS synchronization.

**Response:**
```json
{
  "success": true,
  "message": "GPS sync initiated"
}
```

### Analytics API

#### GET /api/analytics/system
Get system performance metrics.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "uptime": "99.9%",
    "responseTime": "<20ms",
    "errorRate": "<1%"
  }
}
```

#### GET /api/analytics/predictive
Get predictive analytics data.

**Query Parameters:**
- `action`: Type of analytics (history, forecast, etc.)

### Route Optimization API

#### POST /api/route-optimization
Optimize routes for job assignments.

**Request Body:**
```json
{
  "action": "optimize",
  "jobs": [...],
  "vehicles": [...],
  "options": {...}
}
```

**Response:**
```json
{
  "success": true,
  "optimization": {
    "algorithm": "nearest_neighbor",
    "routes": [...],
    "efficiency": 89.2
  }
}
```

## Service Architecture

### Core Services

- **OnDemandDataService**: FileMaker data fetching and caching
- **SamsaraIntegrationService**: GPS fleet tracking and location data
- **AlertEngine**: Intelligent alert generation and management
- **PredictiveAnalyticsService**: AI-powered route optimization
- **CacheService**: Unified in-memory caching
- **SupabaseService**: Database operations and historical storage

### Data Flow

```
FileMaker API → OnDemandDataService → AlertEngine → Frontend
Samsara GPS → SamsaraIntegrationService → GPS Status → Frontend
User Actions → API Routes → Services → Database
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error description",
  "timestamp": "2025-11-11T..."
}
```

## Rate Limiting

- FileMaker API: 10 requests/second
- Samsara GPS: 10 requests/second
- OpenRouter AI: 5 requests/minute

## Authentication

Environment variables required:
- `FILEMAKER_USER` / `FILEMAKER_PASSWORD`
- `SAMSARA_API_KEY`
- `OPENROUTER_API_KEY`
- `SUPABASE_ANON_KEY`

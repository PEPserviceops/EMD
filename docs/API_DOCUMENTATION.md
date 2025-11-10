# Exception Management Dashboard - API Documentation

**Version**: 1.0  
**Last Updated**: November 10, 2025  
**Base URL**: `http://localhost:3000/api`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Alert Endpoints](#alert-endpoints)
4. [Polling Endpoints](#polling-endpoints)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Examples](#examples)

---

## Overview

The EMD API provides RESTful endpoints for managing alerts and controlling the polling service. All endpoints return JSON responses and use standard HTTP status codes.

### Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.vercel.app/api
```

### Response Format

All successful responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-11-10T20:00:00.000Z"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-11-10T20:00:00.000Z"
}
```

---

## Authentication

Currently, the API does not require authentication for local development. For production deployment, implement one of the following:

- **API Keys**: Add `X-API-Key` header
- **JWT Tokens**: Bearer token authentication
- **Session Cookies**: Browser-based authentication

---

## Alert Endpoints

### GET /api/alerts

Retrieve all active alerts with statistics.

#### Request

```http
GET /api/alerts HTTP/1.1
Host: localhost:3000
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `severity` | string | No | Filter by severity (CRITICAL, HIGH, MEDIUM, LOW) |
| `limit` | number | No | Maximum number of alerts to return (default: all) |
| `acknowledged` | boolean | No | Filter by acknowledgment status |

#### Response

```json
{
  "alerts": [
    {
      "id": "arrival-without-completion-616542",
      "ruleId": "arrival-without-completion",
      "severity": "HIGH",
      "title": "Arrival Without Completion",
      "message": "Job 356231 has arrival time but no completion time (Status: Re-scheduled)",
      "jobId": "616542",
      "jobStatus": "Re-scheduled",
      "timestamp": "2025-11-10T20:06:34.601Z",
      "acknowledged": false,
      "acknowledgedAt": null,
      "acknowledgedBy": null
    }
  ],
  "stats": {
    "total": 9,
    "critical": 0,
    "high": 5,
    "medium": 4,
    "low": 0
  }
}
```

#### Status Codes

- `200 OK`: Success
- `400 Bad Request`: Invalid parameters
- `500 Internal Server Error`: Server error

---

### POST /api/alerts/[id]/acknowledge

Acknowledge a specific alert.

#### Request

```http
POST /api/alerts/arrival-without-completion-616542/acknowledge HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "acknowledgedBy": "dispatcher@pepmove.com"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Alert ID (in URL path) |
| `acknowledgedBy` | string | No | User who acknowledged the alert |

#### Response

```json
{
  "success": true,
  "alert": {
    "id": "arrival-without-completion-616542",
    "acknowledged": true,
    "acknowledgedAt": "2025-11-10T20:10:00.000Z",
    "acknowledgedBy": "dispatcher@pepmove.com"
  }
}
```

#### Status Codes

- `200 OK`: Alert acknowledged successfully
- `404 Not Found`: Alert not found
- `500 Internal Server Error`: Server error

---

### POST /api/alerts/[id]/dismiss

Dismiss a specific alert.

#### Request

```http
POST /api/alerts/arrival-without-completion-616542/dismiss HTTP/1.1
Host: localhost:3000
```

#### Response

```json
{
  "success": true,
  "message": "Alert dismissed successfully"
}
```

#### Status Codes

- `200 OK`: Alert dismissed successfully
- `404 Not Found`: Alert not found
- `500 Internal Server Error`: Server error

---

## Polling Endpoints

### GET /api/polling/status

Get the current status of the polling service.

#### Request

```http
GET /api/polling/status HTTP/1.1
Host: localhost:3000
```

#### Response

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalPolls": 150,
      "successfulPolls": 150,
      "failedPolls": 0,
      "successRate": 100,
      "totalJobsProcessed": 14700,
      "avgResponseTime": 336,
      "lastPollTime": "2025-11-10T20:15:00.000Z"
    },
    "health": {
      "status": "healthy",
      "errorCount": 0,
      "lastError": null
    },
    "alerts": {
      "total": 9,
      "new": 0,
      "resolved": 0,
      "bySeverity": {
        "CRITICAL": 0,
        "HIGH": 5,
        "MEDIUM": 4,
        "LOW": 0
      }
    }
  }
}
```

#### Status Codes

- `200 OK`: Success
- `500 Internal Server Error`: Server error

---

### POST /api/polling/start

Start the polling service.

#### Request

```http
POST /api/polling/start HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "interval": 30000
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `interval` | number | No | Polling interval in milliseconds (default: 30000) |

#### Response

```json
{
  "success": true,
  "message": "Polling service started",
  "interval": 30000
}
```

#### Status Codes

- `200 OK`: Service started successfully
- `400 Bad Request`: Service already running
- `500 Internal Server Error`: Server error

---

### POST /api/polling/stop

Stop the polling service.

#### Request

```http
POST /api/polling/stop HTTP/1.1
Host: localhost:3000
```

#### Response

```json
{
  "success": true,
  "message": "Polling service stopped"
}
```

#### Status Codes

- `200 OK`: Service stopped successfully
- `400 Bad Request`: Service not running
- `500 Internal Server Error`: Server error

---

## Data Models

### Alert Object

```typescript
interface Alert {
  id: string;                    // Unique alert identifier
  ruleId: string;                // Alert rule that triggered this
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;                 // Alert title
  message: string;               // Detailed alert message
  jobId: string;                 // FileMaker job ID
  jobStatus: string;             // Current job status
  timestamp: string;             // ISO 8601 timestamp
  acknowledged: boolean;         // Acknowledgment status
  acknowledgedAt: string | null; // When acknowledged
  acknowledgedBy: string | null; // Who acknowledged
}
```

### Stats Object

```typescript
interface Stats {
  total: number;      // Total number of alerts
  critical: number;   // Count of CRITICAL alerts
  high: number;       // Count of HIGH alerts
  medium: number;     // Count of MEDIUM alerts
  low: number;        // Count of LOW alerts
}
```

### Polling Stats Object

```typescript
interface PollingStats {
  totalPolls: number;           // Total polls executed
  successfulPolls: number;      // Successful polls
  failedPolls: number;          // Failed polls
  successRate: number;          // Success rate (0-100)
  totalJobsProcessed: number;   // Total jobs processed
  avgResponseTime: number;      // Average response time (ms)
  lastPollTime: string;         // Last poll timestamp
}
```

### Health Object

```typescript
interface Health {
  status: 'healthy' | 'degraded' | 'unhealthy';
  errorCount: number;           // Recent error count
  lastError: string | null;     // Last error message
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-11-10T20:00:00.000Z"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_PARAMETERS` | Request parameters are invalid |
| `ALERT_NOT_FOUND` | Alert ID does not exist |
| `POLLING_ERROR` | Error in polling service |
| `FILEMAKER_ERROR` | FileMaker API error |
| `DATABASE_ERROR` | Database operation failed |
| `INTERNAL_ERROR` | Unexpected server error |

---

## Rate Limiting

Currently, no rate limiting is implemented. For production, consider:

- **Per IP**: 100 requests per minute
- **Per User**: 1000 requests per hour
- **Polling**: Maximum 1 request per second

---

## Examples

### Example 1: Get All High-Priority Alerts

```bash
curl -X GET "http://localhost:3000/api/alerts?severity=HIGH"
```

### Example 2: Acknowledge an Alert

```bash
curl -X POST "http://localhost:3000/api/alerts/alert-id-123/acknowledge" \
  -H "Content-Type: application/json" \
  -d '{"acknowledgedBy": "john.doe@pepmove.com"}'
```

### Example 3: Check Polling Status

```bash
curl -X GET "http://localhost:3000/api/polling/status"
```

### Example 4: Start Polling with Custom Interval

```bash
curl -X POST "http://localhost:3000/api/polling/start" \
  -H "Content-Type: application/json" \
  -d '{"interval": 60000}'
```

### Example 5: JavaScript Fetch

```javascript
// Get all alerts
const response = await fetch('http://localhost:3000/api/alerts');
const data = await response.json();
console.log(data.alerts);

// Acknowledge an alert
await fetch(`http://localhost:3000/api/alerts/${alertId}/acknowledge`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    acknowledgedBy: 'dispatcher@pepmove.com'
  })
});
```

### Example 6: React Hook

```javascript
import { useState, useEffect } from 'react';

function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const response = await fetch('/api/alerts');
        const data = await response.json();
        setAlerts(data.alerts);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  return { alerts, loading };
}
```

---

## Webhooks (Future Feature)

### POST /api/webhooks/alerts

Subscribe to alert notifications via webhook.

**Coming in v2.0**

---

## Changelog

### v1.0 (November 10, 2025)
- Initial API release
- Alert management endpoints
- Polling control endpoints
- Real-time statistics

---

## Support

For API support or questions:
- **Email**: dev-team@pepmove.com
- **Documentation**: https://docs.pepmove.com/emd
- **GitHub**: https://github.com/pepmove/emd-dashboard

---

**End of API Documentation**


# Analytics API Quick Reference

## Base URL
```
http://localhost:3000/api/analytics
```

---

## Endpoints

### 1. Job History
```
GET /api/analytics/jobs?jobId={jobId}&limit={limit}
```

**Parameters:**
- `jobId` (required): Job ID to query
- `limit` (optional): Max records (default: 50)

**Example:**
```bash
curl "http://localhost:3000/api/analytics/jobs?jobId=356001&limit=20"
```

---

### 2. Alert Analytics
```
GET /api/analytics/alerts?startDate={start}&endDate={end}&severity={severity}
```

**Parameters:**
- `startDate` (required): ISO date string
- `endDate` (required): ISO date string
- `severity` (optional): LOW, MEDIUM, HIGH, CRITICAL
- `ruleId` (optional): Filter by rule
- `jobId` (optional): Filter by job
- `acknowledged` (optional): true/false
- `resolved` (optional): true/false
- `dismissed` (optional): true/false
- `limit` (optional): Max records (default: 100)

**Example:**
```bash
curl "http://localhost:3000/api/analytics/alerts?startDate=2025-01-01&endDate=2025-01-31&severity=HIGH"
```

---

### 3. Efficiency Metrics
```
GET /api/analytics/efficiency?startDate={start}&endDate={end}&truckId={truck}
POST /api/analytics/efficiency
```

**GET Parameters:**
- `startDate` (required): ISO date string
- `endDate` (required): ISO date string
- `truckId` (optional): Filter by truck
- `limit` (optional): Max records (default: 100)

**POST Body:**
```json
{
  "truck_id": "TRUCK-123",
  "date": "2025-01-15",
  "total_miles": 150.5,
  "optimal_miles": 140.0,
  "excess_miles": 10.5,
  "efficiency_score": 93.0,
  "efficiency_grade": "A",
  "on_time_jobs": 8,
  "late_jobs": 1,
  "completed_jobs": 9
}
```

**Example:**
```bash
# GET
curl "http://localhost:3000/api/analytics/efficiency?startDate=2025-01-01&endDate=2025-01-31&truckId=TRUCK-123"

# POST
curl -X POST "http://localhost:3000/api/analytics/efficiency" \
  -H "Content-Type: application/json" \
  -d '{"truck_id":"TRUCK-123","date":"2025-01-15","total_miles":150.5}'
```

---

### 4. Profitability Metrics
```
GET /api/analytics/profitability?startDate={start}&endDate={end}&aggregationLevel={level}
POST /api/analytics/profitability
```

**GET Parameters:**
- `startDate` (required): ISO date string
- `endDate` (required): ISO date string
- `aggregationLevel` (optional): job, route, truck, daily
- `jobId` (optional): Filter by job
- `routeId` (optional): Filter by route
- `truckId` (optional): Filter by truck
- `limit` (optional): Max records (default: 100)

**POST Body:**
```json
{
  "date": "2025-01-15",
  "aggregation_level": "daily",
  "total_revenue": 4500.00,
  "total_cost": 3200.00,
  "gross_profit": 1300.00,
  "job_count": 12
}
```

**Example:**
```bash
# GET
curl "http://localhost:3000/api/analytics/profitability?startDate=2025-01-01&endDate=2025-01-31&aggregationLevel=daily"

# POST
curl -X POST "http://localhost:3000/api/analytics/profitability" \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-01-15","aggregation_level":"daily","total_revenue":4500.00}'
```

---

### 5. System Metrics
```
GET /api/analytics/system?component={component}&metricType={type}
POST /api/analytics/system
```

**GET Parameters:**
- `component` (optional): polling, alerts, cache
- `metricType` (optional): Filter by type
- `metricName` (optional): Filter by name
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `limit` (optional): Max records (default: 100)

**POST Body:**
```json
{
  "type": "polling",
  "name": "poll_cycle_complete",
  "value": 1250,
  "unit": "milliseconds",
  "component": "polling",
  "metadata": {
    "poll_count": 100,
    "jobs_processed": 50
  }
}
```

**Example:**
```bash
# GET
curl "http://localhost:3000/api/analytics/system?component=polling&limit=50"

# POST
curl -X POST "http://localhost:3000/api/analytics/system" \
  -H "Content-Type: application/json" \
  -d '{"type":"polling","name":"poll_cycle_complete","value":1250}'
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "count": 10,
  "data": [...]
}
```

### Error Response
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

---

## Common Use Cases

### 1. Track Job Status Changes
```javascript
const response = await fetch('/api/analytics/jobs?jobId=356001&limit=50');
const { history } = await response.json();

// Find status transitions
const transitions = history.reduce((acc, curr, i) => {
  if (i > 0 && history[i-1].job_status !== curr.job_status) {
    acc.push({
      from: history[i-1].job_status,
      to: curr.job_status,
      timestamp: curr.snapshot_timestamp
    });
  }
  return acc;
}, []);
```

### 2. Get Alert Statistics for Last 7 Days
```javascript
const end = new Date();
const start = new Date(end);
start.setDate(start.getDate() - 7);

const response = await fetch(
  `/api/analytics/alerts?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
);
const { statistics } = await response.json();

console.log('Average response time:', statistics.average_response_time, 'seconds');
console.log('Total alerts:', statistics.total);
```

### 3. Monitor Truck Efficiency
```javascript
const end = new Date();
const start = new Date(end);
start.setDate(start.getDate() - 30);

const response = await fetch(
  `/api/analytics/efficiency?truckId=TRUCK-123&startDate=${start.toISOString()}&endDate=${end.toISOString()}`
);
const { summary, metrics } = await response.json();

console.log('Average efficiency score:', summary.averageEfficiencyScore);
console.log('Total excess miles:', summary.totalExcessMiles);
```

### 4. Calculate Daily Profitability
```javascript
const end = new Date();
const start = new Date(end);
start.setDate(start.getDate() - 30);

const response = await fetch(
  `/api/analytics/profitability?startDate=${start.toISOString()}&endDate=${end.toISOString()}&aggregationLevel=daily`
);
const { summary, metrics } = await response.json();

console.log('Total profit:', summary.totalProfit);
console.log('Average margin:', summary.averageProfitMargin, '%');
console.log('Profitable days:', summary.profitableCount);
```

### 5. Monitor System Performance
```javascript
const response = await fetch('/api/analytics/system?component=polling&limit=100');
const { metrics } = await response.json();

// Calculate average polling time
const avgTime = metrics.reduce((sum, m) => sum + m.metric_value, 0) / metrics.length;
console.log('Average poll time:', avgTime, 'ms');
```

---

## Date Format

All dates should be in ISO 8601 format:
```
2025-01-15T10:30:00Z
```

JavaScript example:
```javascript
const date = new Date();
const isoString = date.toISOString();
```

---

## Error Codes

- `400` - Bad Request (missing or invalid parameters)
- `405` - Method Not Allowed
- `500` - Internal Server Error
- `503` - Service Unavailable (Supabase not configured)

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding rate limiting for production use.

---

## Authentication

Currently no authentication is required. Consider adding authentication for production use.

---

## Testing

Test all endpoints after running the database migration:

```bash
# Test connection
node scripts/test-supabase-connection.js

# Start application
npm run dev

# Test endpoints (after some data is collected)
curl "http://localhost:3000/api/analytics/system?component=polling&limit=10"
```

---

## Resources

- **Integration Guide**: `docs/SUPABASE_INTEGRATION.md`
- **Setup Guide**: `docs/SUPABASE_SETUP.md`
- **Service Module**: `src/services/SupabaseService.js`


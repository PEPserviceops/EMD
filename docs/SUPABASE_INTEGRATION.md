# Supabase Integration Guide

## Overview

The EMD Dashboard is now fully integrated with Supabase for historical data storage and analytics. This document describes how the integration works and how to use the analytics features.

## Integration Points

### 1. PollingService Integration

**File:** `src/services/PollingService.js`

The PollingService automatically stores job snapshots and system metrics in Supabase during each polling cycle.

**What gets stored:**
- **Job Snapshots**: Every job retrieved from FileMaker is stored as a historical snapshot
- **System Metrics**: Polling performance metrics (response time, jobs processed, alerts generated)

**Code Example:**
```javascript
// Job snapshots are stored automatically after each poll
if (supabaseService.isEnabled() && activeJobs.length > 0) {
  await supabaseService.storeJobSnapshotBatch(activeJobs);
}

// System metrics are stored after each poll cycle
await supabaseService.storeSystemMetric({
  type: 'polling',
  name: 'poll_cycle_complete',
  value: responseTime,
  component: 'polling',
  metadata: { poll_count, jobs_processed, alerts_generated }
});
```

**Benefits:**
- Complete audit trail of all job changes
- Track job status transitions over time
- Analyze polling performance and system health

---

### 2. AlertEngine Integration

**File:** `src/api/alerts.js`

The AlertEngine automatically stores all alert lifecycle events in Supabase.

**What gets stored:**
- **New Alerts**: When an alert is first triggered
- **Acknowledged Alerts**: When a user acknowledges an alert
- **Dismissed Alerts**: When a user dismisses an alert
- **Resolved Alerts**: When an alert condition is no longer true

**Code Example:**
```javascript
// New alerts are stored automatically
if (supabaseService.isEnabled()) {
  await supabaseService.storeAlert({
    alert_id: alert.id,
    rule_id: alert.ruleId,
    severity: alert.severity,
    message: alert.message,
    job_id: job.fieldData._kp_job_id,
    details: { fieldData }
  });
}

// Alert updates are tracked automatically
await supabaseService.updateAlert(alertId, {
  acknowledged: true,
  acknowledged_at: new Date().toISOString(),
  acknowledged_by: userId
});
```

**Benefits:**
- Complete alert history and lifecycle tracking
- Calculate response times and resolution times
- Analyze alert patterns and trends
- Track team performance on alert handling

---

## Analytics API Endpoints

### 1. Job History API

**Endpoint:** `GET /api/analytics/jobs`

**Query Parameters:**
- `jobId` (required): The job ID to get history for
- `limit` (optional): Maximum number of records to return (default: 50)

**Example Request:**
```bash
curl "http://localhost:3000/api/analytics/jobs?jobId=356001&limit=20"
```

**Example Response:**
```json
{
  "success": true,
  "jobId": "356001",
  "count": 20,
  "history": [
    {
      "id": "uuid",
      "job_id": "356001",
      "job_date": "2025-01-15",
      "job_status": "Completed",
      "truck_id": "TRUCK-123",
      "time_arrival": "2025-01-15T10:30:00Z",
      "time_complete": "2025-01-15T14:45:00Z",
      "snapshot_timestamp": "2025-01-15T14:45:30Z"
    }
  ]
}
```

---

### 2. Alert Analytics API

**Endpoint:** `GET /api/analytics/alerts`

**Query Parameters:**
- `startDate` (required): Start date (ISO format)
- `endDate` (required): End date (ISO format)
- `severity` (optional): Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)
- `ruleId` (optional): Filter by rule ID
- `jobId` (optional): Filter by job ID
- `acknowledged` (optional): Filter by acknowledged status (true/false)
- `resolved` (optional): Filter by resolved status (true/false)
- `dismissed` (optional): Filter by dismissed status (true/false)
- `limit` (optional): Maximum number of records (default: 100)

**Example Request:**
```bash
curl "http://localhost:3000/api/analytics/alerts?startDate=2025-01-01&endDate=2025-01-31&severity=HIGH"
```

**Example Response:**
```json
{
  "success": true,
  "dateRange": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-01-31T23:59:59Z"
  },
  "count": 45,
  "alerts": [...],
  "statistics": {
    "total": 45,
    "by_severity": {
      "HIGH": 30,
      "CRITICAL": 15
    },
    "average_response_time": 1800,
    "average_resolution_time": 3600
  }
}
```

---

### 3. Efficiency Metrics API

**Endpoint:** `GET /api/analytics/efficiency`

**Query Parameters:**
- `startDate` (required): Start date (ISO format)
- `endDate` (required): End date (ISO format)
- `truckId` (optional): Filter by truck ID
- `limit` (optional): Maximum number of records (default: 100)

**Example Request:**
```bash
curl "http://localhost:3000/api/analytics/efficiency?startDate=2025-01-01&endDate=2025-01-31&truckId=TRUCK-123"
```

**Example Response:**
```json
{
  "success": true,
  "dateRange": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-01-31T23:59:59Z"
  },
  "truckId": "TRUCK-123",
  "count": 30,
  "summary": {
    "totalRecords": 30,
    "averageEfficiencyScore": 85.5,
    "averageExcessMiles": 12.3,
    "totalMiles": 3500,
    "totalOptimalMiles": 3200,
    "totalExcessMiles": 300,
    "gradeDistribution": {
      "A": 15,
      "B": 10,
      "C": 3,
      "D": 2,
      "F": 0
    }
  },
  "metrics": [...]
}
```

**Endpoint:** `POST /api/analytics/efficiency`

Store new efficiency metrics.

**Request Body:**
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

---

### 4. Profitability Metrics API

**Endpoint:** `GET /api/analytics/profitability`

**Query Parameters:**
- `startDate` (required): Start date (ISO format)
- `endDate` (required): End date (ISO format)
- `aggregationLevel` (optional): job, route, truck, or daily
- `jobId` (optional): Filter by job ID
- `routeId` (optional): Filter by route ID
- `truckId` (optional): Filter by truck ID
- `limit` (optional): Maximum number of records (default: 100)

**Example Request:**
```bash
curl "http://localhost:3000/api/analytics/profitability?startDate=2025-01-01&endDate=2025-01-31&aggregationLevel=daily"
```

**Example Response:**
```json
{
  "success": true,
  "dateRange": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-01-31T23:59:59Z"
  },
  "count": 31,
  "summary": {
    "totalRecords": 31,
    "totalRevenue": 125000.00,
    "totalCost": 95000.00,
    "totalProfit": 30000.00,
    "averageProfitMargin": 24.0,
    "profitableCount": 28,
    "unprofitableCount": 3
  },
  "metrics": [...]
}
```

**Endpoint:** `POST /api/analytics/profitability`

Store new profitability metrics.

**Request Body:**
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

---

### 5. System Metrics API

**Endpoint:** `GET /api/analytics/system`

**Query Parameters:**
- `component` (optional): Filter by component (polling, alerts, cache)
- `metricType` (optional): Filter by metric type
- `metricName` (optional): Filter by metric name
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)
- `limit` (optional): Maximum number of records (default: 100)

**Example Request:**
```bash
curl "http://localhost:3000/api/analytics/system?component=polling&limit=50"
```

**Example Response:**
```json
{
  "success": true,
  "count": 50,
  "summary": {
    "totalRecords": 50,
    "components": {
      "polling": 50
    },
    "metricTypes": {
      "polling": 50
    },
    "averageValue": 1250.5
  },
  "metrics": [...]
}
```

---

## Usage Examples

### Track Job Status Changes

```javascript
// Get history for a specific job
const response = await fetch('/api/analytics/jobs?jobId=356001&limit=50');
const data = await response.json();

// Analyze status transitions
const statusChanges = data.history.map((snapshot, index) => {
  if (index === 0) return null;
  const prev = data.history[index - 1];
  if (prev.job_status !== snapshot.job_status) {
    return {
      from: prev.job_status,
      to: snapshot.job_status,
      timestamp: snapshot.snapshot_timestamp
    };
  }
  return null;
}).filter(Boolean);
```

### Analyze Alert Response Times

```javascript
// Get alerts for the last 30 days
const endDate = new Date();
const startDate = new Date(endDate);
startDate.setDate(startDate.getDate() - 30);

const response = await fetch(
  `/api/analytics/alerts?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
);
const data = await response.json();

// Calculate average response time
const avgResponseTime = data.statistics.average_response_time;
console.log(`Average response time: ${avgResponseTime} seconds`);
```

### Monitor Truck Efficiency Trends

```javascript
// Get efficiency data for a truck over the last week
const endDate = new Date();
const startDate = new Date(endDate);
startDate.setDate(startDate.getDate() - 7);

const response = await fetch(
  `/api/analytics/efficiency?truckId=TRUCK-123&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
);
const data = await response.json();

// Plot efficiency score over time
const chartData = data.metrics.map(m => ({
  date: m.date,
  score: m.efficiency_score,
  grade: m.efficiency_grade
}));
```

---

## Data Flow Diagram

```
FileMaker API
     ↓
PollingService (every 30 seconds)
     ↓
     ├─→ Store Job Snapshots → Supabase (jobs_history)
     ├─→ Store System Metrics → Supabase (system_metrics)
     └─→ AlertEngine
            ↓
            ├─→ Store New Alerts → Supabase (alerts_history)
            ├─→ Update Acknowledged → Supabase (alerts_history)
            ├─→ Update Dismissed → Supabase (alerts_history)
            └─→ Update Resolved → Supabase (alerts_history)

Analytics API Endpoints
     ↓
Query Supabase
     ↓
Return Historical Data & Statistics
```

---

## Performance Considerations

### Automatic Storage
- Job snapshots are stored in batches for efficiency
- Alert storage is non-blocking (uses async/await with error handling)
- System metrics are stored after each poll cycle
- All Supabase operations have error handling to prevent polling failures

### Query Optimization
- All tables have proper indexes on commonly queried fields
- Date range queries use indexed timestamp fields
- Limit parameters prevent excessive data retrieval
- Pre-built views for common analytics queries

### Graceful Degradation
- Application continues to work if Supabase is not configured
- All Supabase operations check `isEnabled()` before executing
- Errors are logged but don't crash the application

---

## Next Steps

1. **Run the database migration** (if not done yet):
   - Copy SQL from `supabase/migrations/001_initial_schema.sql`
   - Paste into Supabase SQL Editor
   - Execute the migration

2. **Test the integration**:
   ```bash
   node scripts/test-supabase-connection.js
   ```

3. **Start the application**:
   ```bash
   npm run dev
   ```

4. **Monitor data collection**:
   - Check Supabase Table Editor to see data being stored
   - Use analytics endpoints to query historical data

5. **Build analytics dashboards**:
   - Create React components to visualize trends
   - Use the analytics API endpoints to fetch data
   - Display charts, graphs, and statistics

---

## Troubleshooting

### No data in Supabase
- Verify environment variables are set in `.env.local`
- Check that the database migration was run successfully
- Ensure the polling service is running
- Check console logs for Supabase errors

### Analytics endpoints return 503
- Supabase is not configured
- Check `.env.local` has correct values
- Restart the application

### Slow queries
- Use date range filters to limit data
- Use the `limit` parameter to restrict results
- Check Supabase dashboard for query performance
- Consider using the pre-built views for common queries

---

## Resources

- **Supabase Dashboard**: https://app.supabase.com/project/dqmbnodnhxowaatprnjj
- **Setup Guide**: `docs/SUPABASE_SETUP.md`
- **Service Module**: `src/services/SupabaseService.js`
- **Migration SQL**: `supabase/migrations/001_initial_schema.sql`


# Supabase Setup Guide - EMD Dashboard

## Overview

This guide explains how to set up Supabase for historical data storage and analysis in the Exception Management Dashboard (EMD). Supabase provides a PostgreSQL database with real-time capabilities, perfect for storing and analyzing historical job data, alerts, efficiency metrics, and profitability trends.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Project Setup](#supabase-project-setup)
3. [Database Migration](#database-migration)
4. [Environment Configuration](#environment-configuration)
5. [Database Schema](#database-schema)
6. [Using the Supabase Service](#using-the-supabase-service)
7. [Querying Historical Data](#querying-historical-data)
8. [Security & RLS Policies](#security--rls-policies)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 18+ installed
- Supabase account (free tier available at [supabase.com](https://supabase.com))
- EMD Dashboard project set up locally

---

## Supabase Project Setup

### Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in the project details:
   - **Name**: `emd-dashboard` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users (e.g., `us-east-1`)
   - **Pricing Plan**: Free tier is sufficient for development
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to be provisioned

### Step 2: Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

⚠️ **Important**: Never commit the `service_role` key to version control. Use the `anon` key for client-side and server-side operations with RLS enabled.

---

## Database Migration

### Step 3: Run the Database Migration

You have two options to create the database schema:

#### Option A: Using Supabase SQL Editor (Recommended)

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **"Run"** or press `Ctrl+Enter`
6. Verify success: You should see "Success. No rows returned"

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Step 4: Verify Database Setup

1. Go to **Table Editor** in your Supabase dashboard
2. You should see the following tables:
   - `jobs_history`
   - `alerts_history`
   - `efficiency_metrics`
   - `profitability_metrics`
   - `system_metrics`

---

## Environment Configuration

### Step 5: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: For client-side access (if needed)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace the values with your actual Supabase project URL and anon key.

### Step 6: Test the Connection

Create a test script to verify the connection:

```javascript
// test-supabase-connection.js
const supabaseService = require('./src/services/SupabaseService');

async function testConnection() {
  if (!supabaseService.isEnabled()) {
    console.error('❌ Supabase is not configured');
    return;
  }

  // Test storing a system metric
  const result = await supabaseService.storeSystemMetric({
    type: 'test',
    name: 'connection_test',
    value: 1,
    unit: 'boolean',
    component: 'setup'
  });

  if (result) {
    console.log('✅ Supabase connection successful!');
    console.log('Test metric stored:', result);
  } else {
    console.error('❌ Failed to store test metric');
  }
}

testConnection();
```

Run the test:

```bash
node test-supabase-connection.js
```

---

## Database Schema

### Tables Overview

#### 1. **jobs_history**
Stores historical snapshots of all jobs for trend analysis and auditing.

**Key Fields:**
- `job_id`, `record_id`, `mod_id` - Job identification
- `job_date`, `job_status`, `job_type` - Job details
- `truck_id`, `driver_id`, `route_id` - Assignments
- `time_arrival`, `time_complete` - Timing
- `address`, `customer_name` - Location & customer
- `raw_data` (JSONB) - Complete FileMaker data
- `snapshot_timestamp` - When this snapshot was taken

**Indexes:**
- `job_id`, `job_date`, `status`, `truck_id`, `snapshot_timestamp`

#### 2. **alerts_history**
Complete history of all alerts with lifecycle tracking.

**Key Fields:**
- `alert_id`, `rule_id`, `rule_name` - Alert identification
- `severity` - LOW, MEDIUM, HIGH, CRITICAL
- `title`, `message` - Alert content
- `job_id`, `job_status`, `truck_id` - Related job info
- `acknowledged`, `dismissed`, `resolved` - Lifecycle status
- `response_time_seconds`, `resolution_time_seconds` - Performance metrics

**Indexes:**
- `alert_id`, `severity`, `job_id`, `created_at`, `rule_id`

#### 3. **efficiency_metrics**
Route and truck efficiency metrics calculated over time.

**Key Fields:**
- `truck_id`, `route_id`, `date` - Identification
- `total_miles`, `optimal_miles`, `excess_miles` - Mileage metrics
- `efficiency_grade` (A-F), `efficiency_score` (0-100) - Scoring
- `proximity_waste_count`, `backtrack_count` - Issue counts
- `total_jobs`, `completed_jobs`, `on_time_jobs` - Job statistics
- `fuel_cost_estimate`, `potential_savings` - Financial impact

**Unique Constraint:** `(truck_id, date)`

#### 4. **profitability_metrics**
Financial performance metrics at various aggregation levels.

**Key Fields:**
- `job_id`, `truck_id`, `route_id`, `date` - Identification
- `aggregation_level` - job, route, truck, or daily
- `total_revenue`, `total_cost`, `gross_profit` - Financials
- `profit_margin` - Percentage (auto-calculated)
- `revenue_per_mile`, `cost_per_mile` - Efficiency ratios

**Auto-calculated Fields:**
- `total_cost` = sum of all cost fields
- `gross_profit` = revenue - total_cost
- `profit_margin` = (gross_profit / revenue) × 100

#### 5. **system_metrics**
System performance and health monitoring metrics.

**Key Fields:**
- `metric_type`, `metric_name`, `metric_value` - Metric details
- `component` - polling, alerts, cache, etc.
- `timestamp` - When metric was recorded
- `tags`, `metadata` (JSONB) - Additional context

### Views for Analysis

#### **daily_alert_summary**
Aggregated alert statistics by day and severity.

```sql
SELECT * FROM daily_alert_summary
WHERE alert_date >= '2025-11-01'
ORDER BY alert_date DESC;
```

#### **truck_efficiency_trends**
Efficiency metrics with calculated on-time percentage.

```sql
SELECT * FROM truck_efficiency_trends
WHERE truck_id = 'TRUCK-123'
ORDER BY date DESC
LIMIT 30;
```

#### **profitability_trends**
Aggregated profitability by date and level.

```sql
SELECT * FROM profitability_trends
WHERE date >= '2025-11-01'
  AND aggregation_level = 'daily'
ORDER BY date DESC;
```

#### **recent_job_changes**
Shows job status and assignment changes over time.

```sql
SELECT * FROM recent_job_changes
WHERE job_id = '356001'
LIMIT 10;
```

---

## Using the Supabase Service

### Import the Service

```javascript
const supabaseService = require('./src/services/SupabaseService');
```

### Store Job Snapshots

```javascript
// Store a single job snapshot
const job = {
  recordId: '282027',
  modId: '423',
  fieldData: {
    _kp_job_id: '356001',
    job_date: '11/10/2025',
    job_status: 'Completed',
    job_type: 'Delivery',
    _kf_trucks_id: 'TRUCK-123',
    time_arival: '08:30:00',
    time_complete: '09:15:00',
    address_C1: '123 Main St',
    Customer_C1: 'Acme Corp'
  }
};

await supabaseService.storeJobSnapshot(job);

// Store multiple jobs in batch
await supabaseService.storeJobSnapshotBatch(jobs);
```

### Store Alerts

```javascript
const alert = {
  id: 'alert-123',
  ruleId: 'arrival-without-completion',
  ruleName: 'Arrival Without Completion',
  severity: 'HIGH',
  title: 'Job arrived but not completed',
  message: 'Truck arrived at 08:30 but job not marked complete',
  jobId: '356001',
  jobStatus: 'In Progress',
  timestamp: new Date().toISOString()
};

await supabaseService.storeAlert(alert);

// Update alert status
await supabaseService.updateAlert('alert-123', {
  acknowledged: true,
  acknowledged_at: new Date().toISOString(),
  acknowledged_by: 'john.doe'
});
```

### Store Efficiency Metrics

```javascript
const efficiencyMetrics = {
  truck_id: 'TRUCK-123',
  date: '11/10/2025',
  total_miles: 125.5,
  optimal_miles: 98.2,
  excess_miles: 27.3,
  excess_percentage: 27.8,
  efficiency_grade: 'C',
  efficiency_score: 72.5,
  total_jobs: 15,
  completed_jobs: 14,
  on_time_jobs: 12,
  late_jobs: 2
};

await supabaseService.storeEfficiencyMetrics(efficiencyMetrics);
```

### Store Profitability Metrics

```javascript
const profitabilityMetrics = {
  truck_id: 'TRUCK-123',
  date: '11/10/2025',
  aggregation_level: 'daily',
  total_revenue: 2500.00,
  fuel_cost: 180.00,
  labor_cost: 450.00,
  vehicle_cost: 120.00,
  overhead_cost: 200.00,
  job_count: 15,
  miles_driven: 125.5
};

await supabaseService.storeProfitabilityMetrics(profitabilityMetrics);
```

---

## Querying Historical Data

### Get Job History

```javascript
// Get history for a specific job
const history = await supabaseService.getJobHistory('356001', 50);
console.log(`Found ${history.length} historical snapshots`);
```

### Get Alerts

```javascript
// Get alerts for the last 7 days
const startDate = new Date();
startDate.setDate(startDate.getDate() - 7);
const endDate = new Date();

const alerts = await supabaseService.getAlerts(startDate, endDate, {
  severity: 'HIGH',
  acknowledged: false
});

console.log(`Found ${alerts.length} unacknowledged HIGH severity alerts`);
```

### Get Alert Statistics

```javascript
const stats = await supabaseService.getAlertStats(startDate, endDate);
console.log('Alert statistics:', stats);
```

### Get Efficiency Metrics

```javascript
const metrics = await supabaseService.getEfficiencyMetrics(
  'TRUCK-123',
  startDate,
  endDate
);

console.log(`Efficiency data for ${metrics.length} days`);
```

### Get Profitability Metrics

```javascript
const profitability = await supabaseService.getProfitabilityMetrics(
  startDate,
  endDate,
  { truck_id: 'TRUCK-123', aggregation_level: 'daily' }
);

console.log('Profitability trends:', profitability);
```

---

## Security & RLS Policies

### Current Configuration

The database is configured with **Row Level Security (RLS)** enabled on all tables with permissive policies that allow full access. This is suitable for:
- Single-tenant applications
- Internal tools with trusted users
- Development environments

### For Multi-User Applications

If you need to restrict access based on users, modify the RLS policies:

```sql
-- Example: Restrict alerts to specific users
CREATE POLICY "Users can only see their own alerts" ON alerts_history
  FOR SELECT USING (auth.uid() = user_id);

-- Example: Allow only authenticated users to insert
CREATE POLICY "Authenticated users can insert" ON jobs_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### Using Service Role Key

For backend operations that need to bypass RLS:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key
);
```

⚠️ **Never expose the service role key in client-side code!**

---

## Troubleshooting

### Issue: "Supabase is not configured"

**Solution**: Verify that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `.env.local` and restart your application.

### Issue: "relation does not exist"

**Solution**: The database migration hasn't been run. Follow [Step 3](#step-3-run-the-database-migration) to create the tables.

### Issue: "permission denied for table"

**Solution**: Check your RLS policies. You may need to use the service role key for backend operations or adjust the policies.

### Issue: "insert or update on table violates foreign key constraint"

**Solution**: Ensure referenced data exists before inserting. For example, if referencing a job_id, make sure that job exists in jobs_history.

### Issue: Slow queries

**Solution**: 
1. Check that indexes are created (they should be from the migration)
2. Use the provided views for common queries
3. Add additional indexes if needed for your specific query patterns

### Viewing Logs

Check Supabase logs in the dashboard:
1. Go to **Logs** → **Database**
2. Filter by error level or search for specific queries
3. Use this to debug connection issues or query problems

---

## Next Steps

1. **Integrate with Polling Service**: Modify `PollingService.js` to store job snapshots on each poll
2. **Integrate with Alert Engine**: Modify alert creation to store in Supabase
3. **Create Analytics Dashboard**: Build UI components to visualize historical data
4. **Set up Scheduled Jobs**: Use Supabase Edge Functions or cron jobs to calculate daily metrics
5. **Add Real-time Subscriptions**: Use Supabase real-time features for live updates

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated**: 2025-11-10  
**Version**: 1.0

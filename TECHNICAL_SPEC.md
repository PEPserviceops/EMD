# EMD Technical Specification
## Exception Management Dashboard - Detailed Technical Design

---

## System Architecture

### Component Overview
```
┌─────────────────────────────────────────────────────────┐
│                   User Interface Layer                   │
│                  (Next.js + React + Tailwind)           │
├─────────────────────────────────────────────────────────┤
│                    Application Layer                     │
│         (Business Logic + Alert Engine + Cache)         │
├─────────────────────────────────────────────────────────┤
│                   Integration Layer                      │
│      (FileMaker API + Samsara API + Google Maps)       │
├─────────────────────────────────────────────────────────┤
│                     Data Layer                          │
│          (SQLite Cache + Real-time State Store)         │
└─────────────────────────────────────────────────────────┘
```

---

## Core Modules Specification

### 1. FileMaker Integration Module

```typescript
interface FileMakerConfig {
  host: string;
  database: string;
  layout: string;
  username: string;
  password: string;
  timeout: number;
  retryAttempts: number;
}

class FileMakerClient {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  
  async authenticate(): Promise<string> {
    // Basic auth for token generation
    const response = await fetch(
      `${this.config.host}/fmi/data/vLatest/databases/${this.config.database}/sessions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.username}:${this.config.password}`)}`
        }
      }
    );
    
    const data = await response.json();
    this.token = data.response.token;
    this.tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    return this.token;
  }
  
  async findJobs(query: JobQuery): Promise<Job[]> {
    if (!this.token || new Date() >= this.tokenExpiry) {
      await this.authenticate();
    }
    
    // Bearer token for API queries
    const response = await fetch(
      `${this.config.host}/fmi/data/vLatest/databases/${this.config.database}/layouts/${this.config.layout}/_find`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: [query] })
      }
    );
    
    const data = await response.json();
    return this.transformJobs(data.response.data);
  }
  
  private transformJobs(rawData: any[]): Job[] {
    return rawData.map(record => ({
      id: record.fieldData._kp_job_id,
      date: record.fieldData.job_date,
      status: record.fieldData.job_status,
      type: record.fieldData.job_type,
      truckId: record.fieldData['*kf*trucks_id'],
      arrivalTime: record.fieldData.time_arrival,
      completeTime: record.fieldData.time_complete,
      dueDate: record.fieldData.due_date,
      address: record.fieldData.address_C1,
      recordId: record.recordId,
      modId: record.modId
    }));
  }
}
```

### 2. Alert Engine Specification

```typescript
interface Alert {
  id: string;
  type: AlertType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  jobId: string;
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

enum AlertType {
  SCHEDULE_INTEGRITY = 'schedule_integrity',
  SERVICE_FAILURE = 'service_failure',
  PROFITABILITY = 'profitability',
  EFFICIENCY = 'efficiency',
  SYSTEM = 'system'
}

class AlertEngine {
  private rules: AlertRule[] = [];
  private alerts: Map<string, Alert> = new Map();
  private deduplicationWindow = 3600000; // 1 hour
  
  async evaluateJob(job: Job): Promise<Alert[]> {
    const newAlerts: Alert[] = [];
    
    for (const rule of this.rules) {
      if (this.shouldTriggerAlert(job, rule)) {
        const alert = this.createAlert(job, rule);
        
        if (!this.isDuplicate(alert)) {
          this.alerts.set(alert.id, alert);
          newAlerts.push(alert);
          await this.notifySubscribers(alert);
        }
      }
    }
    
    return newAlerts;
  }
  
  private shouldTriggerAlert(job: Job, rule: AlertRule): boolean {
    switch (rule.type) {
      case 'ARRIVAL_WITHOUT_COMPLETION':
        return job.arrivalTime && 
               !job.completeTime && 
               job.status === 'Scheduled';
               
      case 'UNASSIGNED_URGENT':
        const hoursUntilDue = (new Date(job.dueDate).getTime() - Date.now()) / 3600000;
        return hoursUntilDue <= 2 && 
               !job.truckId && 
               job.status === 'Scheduled';
               
      case 'OVERDUE_ACTIVE':
        return new Date(job.dueDate) < new Date() && 
               ['Scheduled', 'In Progress'].includes(job.status);
               
      default:
        return false;
    }
  }
  
  private isDuplicate(alert: Alert): boolean {
    const existingAlert = Array.from(this.alerts.values()).find(
      existing => 
        existing.jobId === alert.jobId &&
        existing.type === alert.type &&
        existing.timestamp.getTime() > Date.now() - this.deduplicationWindow
    );
    
    return !!existingAlert;
  }
}
```

### 3. Real-time Update System

```typescript
class RealTimeUpdater {
  private pollingInterval = 30000; // 30 seconds
  private lastUpdateTimestamp: Date | null = null;
  private subscribers: Set<(data: UpdatePayload) => void> = new Set();
  
  async startPolling(): Promise<void> {
    setInterval(async () => {
      try {
        const updates = await this.fetchUpdates();
        
        if (updates.hasChanges) {
          this.broadcastUpdates(updates);
          this.lastUpdateTimestamp = new Date();
        }
      } catch (error) {
        console.error('Polling error:', error);
        this.handlePollingError(error);
      }
    }, this.pollingInterval);
  }
  
  private async fetchUpdates(): Promise<UpdatePayload> {
    // Fetch all active jobs for today
    const today = new Date().toISOString().split('T')[0];
    const jobs = await fileMakerClient.findJobs({
      job_date: today,
      job_status: ['Scheduled', 'In Progress', 'Dispatched']
    });
    
    // Compare with cached state
    const changes = this.detectChanges(jobs);
    
    // Evaluate alerts for changed jobs
    const alerts = await this.evaluateAlerts(changes.modified);
    
    return {
      hasChanges: changes.added.length > 0 || 
                  changes.modified.length > 0 || 
                  changes.removed.length > 0,
      added: changes.added,
      modified: changes.modified,
      removed: changes.removed,
      alerts: alerts,
      timestamp: new Date()
    };
  }
  
  private detectChanges(currentJobs: Job[]): ChangeSet {
    const previousJobs = this.getCachedJobs();
    
    // CRITICAL: Only compare jobs from the same day
    // This prevents false "removed" alerts when comparing different days
    const today = new Date().toDateString();
    const todaysJobs = currentJobs.filter(job => 
      new Date(job.date).toDateString() === today
    );
    const previousTodaysJobs = previousJobs.filter(job => 
      new Date(job.date).toDateString() === today
    );
    
    return {
      added: this.findAddedJobs(todaysJobs, previousTodaysJobs),
      modified: this.findModifiedJobs(todaysJobs, previousTodaysJobs),
      removed: this.findRemovedJobs(todaysJobs, previousTodaysJobs)
    };
  }
}
```

### 4. Profitability Calculator

```typescript
interface CostFactors {
  mileageRate: number;        // $/mile
  hourlyRate: number;         // $/hour
  fuelSurchargeRate: number;  // $/gallon
  avgMPG: number;             // miles/gallon
  overheadPercentage: number; // % of revenue
}

class ProfitabilityAnalyzer {
  private costFactors: CostFactors = {
    mileageRate: 0.65,
    hourlyRate: 25,
    fuelSurchargeRate: 3.50,
    avgMPG: 8,
    overheadPercentage: 0.15
  };
  
  calculateJobProfitability(job: EnhancedJob): ProfitabilityMetrics {
    const revenue = job.revenue || 0;
    
    // Calculate costs
    const mileageCost = job.totalMiles * this.costFactors.mileageRate;
    const timeCost = job.durationHours * this.costFactors.hourlyRate;
    const fuelCost = (job.totalMiles / this.costFactors.avgMPG) * this.costFactors.fuelSurchargeRate;
    const overheadCost = revenue * this.costFactors.overheadPercentage;
    
    const totalCost = mileageCost + timeCost + fuelCost + overheadCost;
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    return {
      revenue,
      totalCost,
      profit,
      margin,
      breakdown: {
        mileage: mileageCost,
        time: timeCost,
        fuel: fuelCost,
        overhead: overheadCost
      },
      flags: this.generateProfitabilityFlags(job, margin)
    };
  }
  
  private generateProfitabilityFlags(job: EnhancedJob, margin: number): string[] {
    const flags: string[] = [];
    
    if (margin < 0) {
      flags.push('NEGATIVE_MARGIN');
    } else if (margin < 15) {
      flags.push('LOW_MARGIN');
    }
    
    if (job.totalMiles > 30 && job.revenue < 50) {
      flags.push('HIGH_MILEAGE_LOW_REVENUE');
    }
    
    if (job.deadheadMiles > job.totalMiles * 0.4) {
      flags.push('EXCESSIVE_DEADHEAD');
    }
    
    const revenuePerMile = job.revenue / job.totalMiles;
    if (revenuePerMile < 2) {
      flags.push('LOW_REVENUE_PER_MILE');
    }
    
    return flags;
  }
}
```

### 5. GPS & Efficiency Module

```typescript
interface Coordinates {
  lat: number;
  lng: number;
}

class EfficiencyAnalyzer {
  // Haversine formula for distance calculation
  private calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 3959; // Earth radius in miles
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLng = this.toRad(coord2.lng - coord1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(coord1.lat)) * Math.cos(this.toRad(coord2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  detectProximityWaste(truck: Truck, pendingJobs: Job[]): ProximityWaste[] {
    const wasteInstances: ProximityWaste[] = [];
    
    for (const job of pendingJobs) {
      const distance = this.calculateDistance(
        truck.currentLocation,
        job.coordinates
      );
      
      if (distance <= 2) {
        wasteInstances.push({
          truckId: truck.id,
          jobId: job.id,
          distance,
          estimatedTimeSavings: distance * 2, // minutes
          type: 'MISSED_NEARBY_DELIVERY'
        });
      }
    }
    
    return wasteInstances;
  }
  
  calculateRouteEfficiency(route: Route): EfficiencyGrade {
    const optimalDistance = this.calculateOptimalRoute(route.stops);
    const actualDistance = route.actualMiles;
    const excessPercentage = ((actualDistance - optimalDistance) / optimalDistance) * 100;
    
    if (excessPercentage < 10) {
      return { grade: 'A', color: '#10B981', excessPercentage };
    } else if (excessPercentage < 25) {
      return { grade: 'B', color: '#F59E0B', excessPercentage };
    } else {
      return { grade: 'C', color: '#EF4444', excessPercentage };
    }
  }
  
  private calculateOptimalRoute(stops: Coordinates[]): number {
    // Simplified TSP solution using nearest neighbor
    let totalDistance = 0;
    const visited = new Set<number>();
    let current = 0;
    
    while (visited.size < stops.length - 1) {
      visited.add(current);
      let nearest = -1;
      let nearestDistance = Infinity;
      
      for (let i = 0; i < stops.length; i++) {
        if (!visited.has(i)) {
          const distance = this.calculateDistance(stops[current], stops[i]);
          if (distance < nearestDistance) {
            nearest = i;
            nearestDistance = distance;
          }
        }
      }
      
      totalDistance += nearestDistance;
      current = nearest;
    }
    
    return totalDistance;
  }
}
```

---

## Database Schema

### SQLite Cache Tables

```sql
-- Jobs cache table
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY,
  job_id VARCHAR(20) UNIQUE NOT NULL,
  job_date DATE NOT NULL,
  status VARCHAR(50),
  type VARCHAR(50),
  truck_id VARCHAR(20),
  arrival_time TIMESTAMP,
  complete_time TIMESTAMP,
  due_date TIMESTAMP,
  address TEXT,
  revenue DECIMAL(10,2),
  total_miles DECIMAL(10,2),
  coordinates_lat DECIMAL(10,6),
  coordinates_lng DECIMAL(10,6),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  record_id VARCHAR(50),
  mod_id VARCHAR(50),
  INDEX idx_job_date (job_date),
  INDEX idx_status (status),
  INDEX idx_truck (truck_id)
);

-- Alerts table
CREATE TABLE alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  job_id VARCHAR(20),
  message TEXT,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by VARCHAR(100),
  acknowledged_at TIMESTAMP,
  INDEX idx_severity (severity),
  INDEX idx_job (job_id),
  INDEX idx_created (created_at)
);

-- Profitability metrics table
CREATE TABLE profitability_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  revenue DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  profit DECIMAL(10,2),
  margin_percentage DECIMAL(5,2),
  mileage_cost DECIMAL(10,2),
  time_cost DECIMAL(10,2),
  fuel_cost DECIMAL(10,2),
  overhead_cost DECIMAL(10,2),
  flags JSON,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_id, date)
);

-- Efficiency tracking table
CREATE TABLE efficiency_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  truck_id VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  total_miles DECIMAL(10,2),
  optimal_miles DECIMAL(10,2),
  excess_percentage DECIMAL(5,2),
  grade CHAR(1),
  proximity_waste_count INTEGER,
  backtrack_count INTEGER,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(truck_id, date)
);
```

---

## API Endpoints

### Alert Management

```typescript
// GET /api/alerts
// Retrieve active alerts with filtering
{
  query: {
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    type?: AlertType,
    acknowledged?: boolean,
    since?: ISO8601,
    limit?: number
  }
}

// POST /api/alerts/acknowledge
// Acknowledge an alert
{
  body: {
    alertId: string,
    userId: string,
    notes?: string
  }
}

// GET /api/alerts/stats
// Alert statistics and trends
{
  response: {
    total: number,
    bySeverity: Record<string, number>,
    byType: Record<string, number>,
    recentTrends: Array<{
      hour: string,
      count: number
    }>
  }
}
```

### Job Monitoring

```typescript
// GET /api/jobs/active
// Get all active jobs with real-time status
{
  response: {
    jobs: Job[],
    lastUpdated: ISO8601,
    totalCount: number
  }
}

// GET /api/jobs/:id/profitability
// Get profitability analysis for a specific job
{
  response: ProfitabilityMetrics
}

// GET /api/jobs/hygiene
// Get schedule hygiene issues
{
  response: {
    issues: Array<{
      jobId: string,
      type: string,
      severity: string,
      details: object
    }>,
    summary: {
      total: number,
      critical: number,
      resolved: number
    }
  }
}
```

---

## Performance Optimization

### Caching Strategy
- **L1 Cache**: In-memory for active jobs (30-second TTL)
- **L2 Cache**: SQLite for historical data (24-hour TTL)
- **L3 Cache**: FileMaker API direct query (fallback)

### Query Optimization
```javascript
// Batch queries to minimize API calls
const batchSize = 100;
const queries = jobIds.reduce((batches, id, index) => {
  const batchIndex = Math.floor(index / batchSize);
  if (!batches[batchIndex]) batches[batchIndex] = [];
  batches[batchIndex].push(id);
  return batches;
}, []);

// Parallel processing with rate limiting
const results = await Promise.all(
  batches.map((batch, index) => 
    delay(index * 100).then(() => fetchBatch(batch))
  )
);
```

### Real-time Optimization
- WebSocket connection for push updates
- Delta synchronization (only changed fields)
- Compression for large payloads
- Connection pooling for API calls

---

## Error Handling

### Retry Strategy
```typescript
class RetryHandler {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    backoffMs = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (this.isRetryable(error) && attempt < maxAttempts) {
          await this.delay(backoffMs * Math.pow(2, attempt - 1));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }
  
  private isRetryable(error: any): boolean {
    return error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT' ||
           error.status === 429 || // Rate limited
           error.status >= 500;    // Server errors
  }
}
```

---

## Security Considerations

### API Key Management
- Store credentials in environment variables
- Rotate tokens automatically before expiry
- Implement rate limiting per user/IP
- Log all API access for auditing

### Data Validation
```typescript
const validateJobData = (data: any): Job => {
  const schema = Joi.object({
    _kp_job_id: Joi.number().required(),
    job_date: Joi.date().iso().required(),
    job_status: Joi.string().valid(...VALID_STATUSES).required(),
    job_type: Joi.string().required(),
    '*kf*trucks_id': Joi.number().allow(null),
    time_arrival: Joi.date().iso().allow(null),
    time_complete: Joi.date().iso().allow(null),
    due_date: Joi.date().iso().allow(null),
    address_C1: Joi.string().max(500).allow(null)
  });
  
  const { error, value } = schema.validate(data);
  if (error) throw new ValidationError(error.message);
  
  return transformToJob(value);
};
```

---

## Testing Strategy

### Unit Tests
```javascript
describe('AlertEngine', () => {
  it('should detect arrival without completion', () => {
    const job = {
      id: '12345',
      status: 'Scheduled',
      arrivalTime: '2024-11-07T10:00:00',
      completeTime: null
    };
    
    const alerts = engine.evaluateJob(job);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('SCHEDULE_INTEGRITY');
  });
  
  it('should not create duplicate alerts', () => {
    const job = { /* ... */ };
    
    const alerts1 = engine.evaluateJob(job);
    const alerts2 = engine.evaluateJob(job);
    
    expect(alerts2).toHaveLength(0);
  });
});
```

### Integration Tests
```javascript
describe('FileMaker Integration', () => {
  it('should handle token expiry gracefully', async () => {
    const client = new FileMakerClient(config);
    
    // First call - gets new token
    const jobs1 = await client.findJobs({ job_date: '2024-11-07' });
    expect(jobs1).toBeDefined();
    
    // Simulate token expiry
    await delay(16 * 60 * 1000); // 16 minutes
    
    // Second call - should auto-refresh token
    const jobs2 = await client.findJobs({ job_date: '2024-11-07' });
    expect(jobs2).toBeDefined();
  });
});
```

### Load Testing
```javascript
describe('Performance', () => {
  it('should handle 500 concurrent jobs', async () => {
    const jobs = generateMockJobs(500);
    
    const startTime = Date.now();
    await Promise.all(jobs.map(job => engine.evaluateJob(job)));
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(2000); // 2 seconds max
  });
});
```

---

## Monitoring & Observability

### Key Metrics to Track
```yaml
application_metrics:
  - api_response_time_p95
  - alert_evaluation_duration
  - cache_hit_ratio
  - active_alerts_count
  
business_metrics:
  - false_positive_rate
  - alert_acknowledgment_time
  - jobs_with_issues_percentage
  - profitability_margin_average
  
system_metrics:
  - memory_usage
  - cpu_utilization
  - database_connection_pool
  - api_rate_limit_remaining
```

### Logging Strategy
```typescript
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'combined.log' 
    })
  ]
});

// Structured logging
logger.info('Alert created', {
  alertId: alert.id,
  type: alert.type,
  severity: alert.severity,
  jobId: alert.jobId,
  timestamp: alert.timestamp
});
```

---

*Technical Specification Version: 1.0*  
*Architecture Review Date: December 2024*  
*Performance Baseline: November 2024*
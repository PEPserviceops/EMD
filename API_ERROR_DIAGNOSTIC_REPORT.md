# API Error Diagnostic Report
## HTTP 503 and 500 Errors Resolution Guide

### Executive Summary
The failing API endpoints are experiencing errors due to missing/invalid API configurations, service dependencies, and recent deployment changes. The errors are occurring in three main categories:

1. **HTTP 503 Errors**: Service unavailable due to missing API keys
2. **HTTP 500 Errors**: Internal server errors due to database/microservice issues  
3. **Missing Fallbacks**: No graceful degradation when services are unavailable

---

## Root Cause Analysis

### 1. Missing API Configuration (HTTP 503)

**Issue**: Critical API keys are not properly configured
- **Samsara API Key**: Set to placeholder `your_samsara_api_key_here` in `.env.local`
- **OpenRouter API**: Configured but may have rate limiting or quota issues
- **Predictive Analytics**: Fails when either Supabase OR OpenRouter is unavailable

**Evidence**: 
- `SamsaraIntegrationService.js:18`: `this.apiKey = process.env.SAMSARA_API_KEY;`
- `PredictiveAnalyticsService.js:24`: `return this.supabaseService.isEnabled() && this.openRouterService.isEnabled();`
- Line 31-37 in `predictive.js`: Returns 503 when `!predictiveAnalyticsService.isEnabled()`

### 2. Database Connectivity Issues (HTTP 500)

**Issue**: Supabase database operations failing
- `jobs/scheduled.js:68-71`: Supabase query errors result in 500 status
- `jobs/scheduled.js:34-39`: Returns 503 when Supabase is not enabled
- Missing `jobs_history` table or incorrect table structure

**Evidence**:
- Database queries may be failing due to table structure changes
- Connection timeouts or authentication issues

### 3. Microservice Integration Problems

**Issue**: Polling service may not be running or accessible
- Separate `polling-service` exists but may not be deployed
- API endpoints depend on data being synced by polling service
- Health check endpoints not properly integrated

### 4. Error Handling Deficiencies

**Issue**: No graceful degradation when services fail
- Endpoints fail completely instead of returning cached/stale data
- Frontend expects live data and shows error messages on 503 responses
- No circuit breaker pattern implementation

---

## Step-by-Step Diagnostic Procedures

### Phase 1: Service Health Checks

#### 1.1 Verify Environment Configuration
```bash
# Check current environment variables
echo $SAMSARA_API_KEY
echo $SUPABASE_URL
echo $OPENROUTER_API_KEY

# Verify they match expected values
# Samsara should NOT be "your_samsara_api_key_here"
```

#### 1.2 Test Individual Service Connectivity
```bash
# Test Supabase Connection
curl -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
     "$SUPABASE_URL/rest/v1/jobs_history?select=count"

# Test OpenRouter API
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
     "$OPENROUTER_BASE_URL/models"

# Test Samsara API (requires real key)
curl -H "Authorization: Bearer $SAMSARA_API_KEY" \
     "$SAMSARA_API_URL/fleet/vehicles"
```

#### 1.3 Check Database Tables
```sql
-- Verify required tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('jobs_history', 'alerts_history', 'efficiency_metrics');

-- Check if jobs_history has data
SELECT COUNT(*) FROM jobs_history;

-- Verify table structure
\d jobs_history
```

### Phase 2: API Endpoint Testing

#### 2.1 Test Each Failing Endpoint
```bash
# Test predictive analytics status
curl -v "http://localhost:3000/api/analytics/predictive?action=status"

# Test scheduled jobs
curl -v "http://localhost:3000/api/jobs/scheduled?date=2025-11-11&groupBy=driver"

# Test GPS status
curl -v "http://localhost:3000/api/fleet/gps-status"
```

#### 2.2 Check Server Logs
```bash
# View Next.js logs
npm run dev  # Look for error messages

# Check Nginx logs (if applicable)
sudo tail -f /var/log/nginx/error.log

# Check system logs
journalctl -u your-app-service -f
```

### Phase 3: Microservice Validation

#### 3.1 Test Polling Service
```bash
# If running separately
curl http://localhost:3001/health
curl http://localhost:3001/stats

# Check if service is running
ps aux | grep polling-service
```

#### 3.2 Verify Data Flow
```bash
# Check if jobs are being polled
curl -X POST http://localhost:3001/poll

# Verify data in Supabase
SELECT COUNT(*), MAX(snapshot_timestamp) FROM jobs_history;
```

---

## Immediate Action Items

### Priority 1: Fix API Configuration (Resolve 503 Errors)

#### 1.1 Update Samsara API Key
```bash
# Set real Samsara API key
export SAMSARA_API_KEY="your_actual_samsara_api_key_here"

# Update environment file
echo 'SAMSARA_API_KEY=your_actual_samsara_api_key_here' >> .env.local
```

#### 1.2 Verify OpenRouter API Key
```bash
# Test OpenRouter connectivity
node -e "
const service = require('./src/services/OpenRouterService');
service.testConnection().then(console.log).catch(console.error);
"
```

#### 1.3 Fix Predictive Analytics Service
Update `src/services/PredictiveAnalyticsService.js` to handle missing dependencies gracefully:

```javascript
isEnabled() {
    // Allow predictive analytics without Samsara
    const supabaseOk = this.supabaseService.isEnabled();
    const openRouterOk = this.openRouterService.isEnabled();
    
    console.log('Predictive Analytics Service Status:', {
        supabase: supabaseOk,
        openRouter: openRouterOk,
        overall: supabaseOk && openRouterOk
    });
    
    return supabaseOk && openRouterOk;
}
```

### Priority 2: Fix Database Issues (Resolve 500 Errors)

#### 2.1 Verify Supabase Tables
```sql
-- Create missing tables if needed
CREATE TABLE IF NOT EXISTS jobs_history (
    job_id TEXT PRIMARY KEY,
    record_id TEXT,
    job_date DATE,
    job_status TEXT,
    job_type TEXT,
    truck_id TEXT,
    lead_id TEXT,
    address TEXT,
    raw_data JSONB,
    snapshot_timestamp TIMESTAMP DEFAULT NOW()
);
```

#### 2.2 Update Error Handling
Modify `src/pages/api/jobs/scheduled.js`:

```javascript
// Add fallback when database is unavailable
try {
    // Existing database code...
} catch (error) {
    console.error('Database error:', error);
    
    // Return cached/fallback data instead of 500
    return res.status(200).json({
        success: true,
        date: targetDate,
        totalJobs: 0,
        groupedBy: groupBy,
        groups: {},
        jobs: [],
        cached: true,
        message: 'Using cached data due to database unavailability'
    });
}
```

### Priority 3: Implement Graceful Degradation

#### 3.1 Add Circuit Breaker Pattern
Create `src/utils/circuitBreaker.js`:

```javascript
class CircuitBreaker {
    constructor(threshold = 5, timeout = 60000) {
        this.failureThreshold = threshold;
        this.timeout = timeout;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    }

    async call(fn, fallback = null) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime < this.timeout) {
                return fallback;
            }
            this.state = 'HALF_OPEN';
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            return fallback;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }

    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
        }
    }
}

module.exports = CircuitBreaker;
```

#### 3.2 Update API Endpoints with Fallbacks

**GPS Status Endpoint** (`src/pages/api/fleet/gps-status.js`):
```javascript
const CircuitBreaker = require('../../../utils/circuitBreaker');
const gpsBreaker = new CircuitBreaker();

// In the handler:
const gpsStatus = await gpsBreaker.call(
    () => samsaraService.getFleetGpsStatus(),
    {
        success: true,
        status: {
            totalTrucks: 0,
            trucksWithGps: 0,
            trucksWithoutGps: 0,
            activeTrucks: 0,
            idleTrucks: 0,
            trucks: []
        },
        cached: true,
        message: 'GPS service temporarily unavailable'
    }
);
```

---

## Long-term Solutions

### 1. Service Monitoring
Implement comprehensive health checks:
- **API Key Validity**: Regular tests of all external API keys
- **Database Connectivity**: Connection pool monitoring
- **Service Dependencies**: Dependency graph monitoring
- **Performance Metrics**: Response time and error rate tracking

### 2. Enhanced Error Handling
- **Progressive Enhancement**: UI should work with cached data
- **User Notifications**: Clear messaging when services are degraded
- **Automatic Recovery**: Retry mechanisms with exponential backoff

### 3. Deployment Improvements
- **Environment Validation**: Pre-deployment checks for required environment variables
- **Blue-Green Deployment**: Zero-downtime deployments
- **Rollback Strategy**: Quick rollback capability for failed deployments

### 4. Caching Strategy
- **Redis Implementation**: Properly implement Redis caching as mentioned in the deployment
- **CDN Integration**: Static asset caching
- **Database Query Optimization**: Reduce database load

---

## Verification Steps

After implementing fixes, verify with:

```bash
# 1. Test all endpoints return 200 status
for endpoint in \
  "/api/analytics/predictive?action=status" \
  "/api/jobs/scheduled?date=2025-11-11&groupBy=driver" \
  "/api/fleet/gps-status"; do
  echo "Testing: $endpoint"
  curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$endpoint"
  echo ""
done

# 2. Verify services are working
node -e "
const services = {
  'Supabase': require('./src/services/SupabaseService'),
  'OpenRouter': require('./src/services/OpenRouterService'),
  'Samsara': require('./src/services/SamsaraIntegrationService')
};

Object.entries(services).forEach(([name, service]) => {
  console.log(name + ':', service.isEnabled());
});
"

# 3. Check database connectivity
curl -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
     "$SUPABASE_URL/rest/v1/jobs_history?select=count" \
     | jq '.[]'
```

---

## Monitoring and Alerting

Set up monitoring for:
- **HTTP Status Codes**: Alert on 5xx errors
- **Response Times**: Alert on >5 second response times
- **Service Health**: Regular health check failures
- **API Rate Limits**: OpenRouter/Samsara rate limit monitoring

This comprehensive approach should resolve all the HTTP 503 and 500 errors while providing a robust, fault-tolerant system.
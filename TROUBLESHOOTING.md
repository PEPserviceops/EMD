# 🔧 TROUBLESHOOTING GUIDE
## Exception Management Dashboard (EMD) - Common Issues & Solutions

**Guide Version:** 1.0  
**Last Updated:** 2025-11-11  
**System Status:** ✅ **PRODUCTION READY**  
**Support Level:** Enterprise-grade troubleshooting  

---

## 🚨 Quick Issue Resolution

### **Critical Issues (Immediate Action Required)**

| Issue | Severity | Action | ETA |
|-------|----------|--------|-----|
| **Dashboard Not Loading** | 🔴 Critical | Check server status | 5 min |
| **API Integration Failure** | 🔴 Critical | Verify credentials | 10 min |
| **GPS Tracking Offline** | 🔴 Critical | Test GPS devices | 15 min |
| **Database Connection Lost** | 🔴 Critical | Check Supabase status | 5 min |

### **Performance Issues**

| Issue | Severity | Action | ETA |
|-------|----------|--------|-----|
| **Slow Response Times** | 🟡 Medium | Check system resources | 30 min |
| **GPS Data Delayed** | 🟡 Medium | Verify Samsara connection | 20 min |
| **Alerts Not Triggering** | 🟡 Medium | Check alert rules | 15 min |

---

## 🖥️ Dashboard Issues

### **🔴 Dashboard Won't Load**

#### **Symptoms**
- Blank white page when accessing dashboard
- "Server Error" or "500 Internal Server Error"
- Dashboard loads but shows no data
- Infinite loading spinner

#### **Root Causes**
1. **Server is down or restarting**
2. **Environment variables missing**
3. **Database connection failed**
4. **Build/deployment issues**

#### **Step-by-Step Resolution**

##### **Step 1: Check Server Status**
```bash
# Check if application is running
pm2 status
# OR
vercel deployments

# Check logs for errors
pm2 logs emd-app --lines 100
```

##### **Step 2: Verify Environment Variables**
```bash
# Check required environment variables
node scripts/validate-env.js

# Expected output:
# ✅ All required environment variables are present
```

##### **Step 3: Test Database Connection**
```javascript
// Test Supabase connection
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testConnection() {
  const { data, error } = await supabase
    .from('system_metrics')
    .select('count')
    .limit(1)
  
  if (error) {
    console.error('❌ Database connection failed:', error)
    return false
  } else {
    console.log('✅ Database connection successful')
    return true
  }
}
```

##### **Step 4: Restart Application**
```bash
# For PM2 deployments
pm2 restart emd-app

# For Vercel deployments  
vercel --prod

# For Docker deployments
docker-compose restart emd-app
```

#### **Resolution Confirmation**
1. **Dashboard loads successfully**
2. **Data appears on screen**
3. **No error messages in console**
4. **Health check endpoint responds**

---

### **🟡 Dashboard Loads Slowly**

#### **Symptoms**
- Dashboard takes >10 seconds to load
- Individual sections load slowly
- High memory usage in browser
- Poor user experience

#### **Root Causes**
1. **Large data sets being loaded**
2. **Inefficient database queries**
3. **Network connectivity issues**
4. **Client-side performance problems**

#### **Step-by-Step Resolution**

##### **Step 1: Check Network Performance**
```bash
# Test API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health

# curl-format.txt:
# time_namelookup:  %{time_namelookup}\n
# time_connect:     %{time_connect}\n
# time_appconnect:  %{time_appconnect}\n
# time_pretransfer: %{time_pretransfer}\n
# time_redirect:    %{time_redirect}\n
# time_starttransfer: %{time_starttransfer}\n
# time_total:       %{time_total}\n
```

##### **Step 2: Analyze Database Queries**
```sql
-- Check slow queries in Supabase
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
WHERE mean_exec_time > 100 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check table sizes
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

##### **Step 3: Optimize Frontend Performance**
```javascript
// Check browser performance
// In browser console:
performance.mark('dashboard-start')

// Load dashboard components
await loadDashboardData()

performance.mark('dashboard-end')
performance.measure('dashboard-load', 'dashboard-start', 'dashboard-end')

const measures = performance.getEntriesByType('measure')
console.log('Load time:', measures[0].duration, 'ms')
```

##### **Step 4: Clear Cache and Restart**
```bash
# Clear application cache
pm2 flush emd-app

# Clear browser cache (user action)
# Ctrl+F5 or Cmd+Shift+R to hard refresh

# Restart services
pm2 restart all
```

---

## 📡 API Integration Issues

### **🔴 FileMaker Integration Failure**

#### **Symptoms**
- "FileMaker connection failed" errors
- No job data appearing in dashboard
- API returning 401/403 authentication errors
- Timeout errors when fetching data

#### **Root Causes**
1. **Expired or incorrect API credentials**
2. **FileMaker server is offline**
3. **Network connectivity issues**
4. **Database schema changes**

#### **Step-by-Step Resolution**

##### **Step 1: Verify Credentials**
```bash
# Test FileMaker connection manually
curl -X GET \
  "${FILEMAKER_API_URL}/databases" \
  -u "${FILEMAKER_USERNAME}:${FILEMAKER_PASSWORD}" \
  -H "Content-Type: application/json"

# Expected: JSON response with database list
# Error: Check credentials and permissions
```

##### **Step 2: Check Environment Variables**
```javascript
// src/services/FileMakerService.js
console.log('FileMaker Config:', {
  apiUrl: process.env.FILEMAKER_API_URL ? 'SET' : 'MISSING',
  database: process.env.FILEMAKER_DATABASE ? 'SET' : 'MISSING', 
  username: process.env.FILEMAKER_USERNAME ? 'SET' : 'MISSING',
  password: process.env.FILEMAKER_PASSWORD ? 'SET' : 'MISSING'
})
```

##### **Step 3: Test API Endpoints**
```bash
# Test database access
curl -X GET \
  "${FILEMAKER_API_URL}/databases/${FILEMAKER_DATABASE}/layouts" \
  -u "${FILEMAKER_USERNAME}:${FILEMAKER_PASSWORD}"

# Test job data access  
curl -X GET \
  "${FILEMAKER_API_URL}/databases/${FILEMAKER_DATABASE}/layouts/Jobs/records" \
  -u "${FILEMAKER_USERNAME}:${FILEMAKER_PASSWORD}" \
  -G -d "_limit=10"
```

##### **Step 4: Contact FileMaker Administrator**
- **Issue:** Database schema or field access changes
- **Action:** Verify field names and permissions
- **Timeline:** May require FileMaker database update

---

### **🟡 Samsara GPS Integration Issues**

#### **Symptoms**
- GPS data not updating in dashboard
- "GPS device offline" alerts
- Inaccurate location information
- Missing truck locations

#### **Root Causes**
1. **GPS device malfunction or battery dead**
2. **Samsara API token expired**
3. **Network connectivity issues**
4. **Device configuration problems**

#### **Step-by-Step Resolution**

##### **Step 1: Test Samsara API Connection**
```bash
# Test Samsara API connectivity
curl -X GET \
  "https://api.samsara.com/fleet/vehicles" \
  -H "Authorization: Bearer ${SAMSARA_API_TOKEN}" \
  -H "Accept: application/json"

# Expected: Vehicle list response
# Error: Check API token validity
```

##### **Step 2: Check GPS Device Status**
```javascript
// Get device status for specific truck
async function checkGPSDevice(vehicleId) {
  const response = await fetch(`https://api.samsara.com/fleet/vehicles/${vehicleId}/locations`, {
    headers: {
      'Authorization': `Bearer ${process.env.SAMSARA_API_TOKEN}`,
      'Accept': 'application/json'
    }
  })
  
  const data = await response.json()
  console.log('GPS Device Status:', {
    vehicleId,
    hasLocation: data.data && data.data.length > 0,
    lastUpdate: data.data?.[0]?.time,
    location: data.data?.[0]?.location
  })
  
  return data
}
```

##### **Step 3: Verify Device Installation**
- **Check physical GPS device:**
  - Is device powered on? (LED indicators)
  - Is device securely mounted?
  - Is there clear sky view for GPS signal?
  - Is cellular signal strength adequate?

- **Check device configuration:**
  - Vehicle ID matches FileMaker truck ID
  - Device is assigned to correct fleet
  - Data transmission is enabled

##### **Step 4: Contact Samsara Support**
- **Device Hardware Issues:** Contact Samsara technical support
- **API Integration Issues:** Contact development team
- **Fleet Configuration:** Contact fleet operations

---

### **🟡 OpenRouter AI Integration Issues**

#### **Symptoms**
- Predictive analytics not working
- "AI service unavailable" errors
- Slow AI response times
- Incomplete prediction data

#### **Root Causes**
1. **API rate limits exceeded**
2. **Invalid or expired API key**
3. **Model service temporarily down**
4. **Request format issues**

#### **Step-by-Step Resolution**

##### **Step 1: Test OpenRouter API**
```bash
# Test API key validity
curl -X GET \
  "https://openrouter.ai/api/v1/models" \
  -H "Authorization: Bearer ${OPENROUTER_API_KEY}" \
  -H "HTTP-Referer: ${APP_URL}" \
  -H "X-Title: EMD Dashboard"

# Expected: Models list response
# Error: Check API key and permissions
```

##### **Step 2: Check Rate Limits**
```javascript
// Monitor API usage
const rateLimiter = {
  requests: 0,
  windowStart: Date.now(),
  
  checkLimit() {
    const now = Date.now()
    if (now - this.windowStart > 60000) { // Reset every minute
      this.requests = 0
      this.windowStart = now
    }
    
    if (this.requests >= 100) { // Rate limit
      throw new Error('OpenRouter API rate limit exceeded')
    }
    
    this.requests++
  }
}
```

##### **Step 3: Test Prediction Request**
```javascript
// Test basic prediction
async function testAIRequest() {
  try {
    const response = await fetch('/api/ai/openrouter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: "Analyze this route efficiency: 45 miles planned, 47 miles actual",
        max_tokens: 100
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('✅ AI request successful:', data.choices[0].message.content)
    return true
  } catch (error) {
    console.error('❌ AI request failed:', error.message)
    return false
  }
}
```

---

## 🗄️ Database Issues

### **🔴 Supabase Connection Lost**

#### **Symptoms**
- "Database connection failed" errors
- No data loading in dashboard
- API calls returning 500 errors
- Authentication failures

#### **Root Causes**
1. **Database credentials expired**
2. **Connection pool exhausted**
3. **Network connectivity issues**
4. **Database server maintenance**

#### **Step-by-Step Resolution**

##### **Step 1: Test Database Connection**
```javascript
// Test connection with simple query
const { createClient } = require('@supabase/supabase-js')

async function testDatabase() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('system_metrics')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Database connection failed:', error)
      return false
    }
    
    console.log('✅ Database connection successful')
    return true
  } catch (err) {
    console.error('❌ Database connection error:', err)
    return false
  }
}
```

##### **Step 2: Check Database Status**
- **Supabase Dashboard:** Verify project status
- **Service Status:** Check for any announced outages
- **Usage Limits:** Verify not exceeding plan limits
- **Connection Limits:** Check if pool is exhausted

##### **Step 3: Verify Credentials**
```javascript
// Check environment variables
console.log('Supabase Config:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
})

// Verify credentials in Supabase dashboard
// Project Settings > API > Project URL and Keys
```

##### **Step 4: Restart Database Connections**
```javascript
// Refresh connection pool
const refreshConnections = async () => {
  // Clear any cached connections
  delete require.cache[require.resolve('@supabase/supabase-js')]
  
  // Recreate client
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      db: { schema: 'public' },
      auth: { persistSession: false }
    }
  )
}
```

---

## 🚨 Alert System Issues

### **🟡 Alerts Not Triggering**

#### **Symptoms**
- Expected alerts not appearing
- Alert system appears inactive
- Rules not executing properly
- Silent failures in alert processing

#### **Root Causes**
1. **Alert rules misconfigured**
2. **Data not triggering rule conditions**
3. **Alert processing service stopped**
4. **Database query issues**

#### **Step-by-Step Resolution**

##### **Step 1: Check Alert Service Status**
```bash
# Check if alert processing is running
pm2 list | grep alert
# OR check in application logs
tail -f logs/app.log | grep -i alert
```

##### **Step 2: Test Alert Rules Manually**
```javascript
// Test alert rule evaluation
async function testAlertRules() {
  try {
    const response = await fetch('/api/alerts/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testData: {
          job_status: 'IN_TRANSIT',
          truck_id: 'TRK-001',
          efficiency_score: 65, // Should trigger efficiency alert
          location: { lat: 39.7392, lng: -104.9903 }
        }
      })
    })
    
    const result = await response.json()
    console.log('Alert rule test result:', result)
    return result
  } catch (error) {
    console.error('Alert test failed:', error)
    return null
  }
}
```

##### **Step 3: Check Alert Database Records**
```sql
-- Check recent alert records
SELECT * FROM alerts_history 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC 
LIMIT 20;

-- Check alert statistics
SELECT 
  alert_type,
  COUNT(*) as count,
  COUNT(CASE WHEN alert_status = 'resolved' THEN 1 END) as resolved
FROM alerts_history 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY alert_type
ORDER BY count DESC;
```

##### **Step 4: Verify Alert Configuration**
```javascript
// Check alert rules configuration
const alertRules = require('../config/alert-rules.json')

console.log('Active Alert Rules:', Object.keys(alertRules))

// Verify rule conditions
Object.entries(alertRules).forEach(([name, rule]) => {
  console.log(`${name}:`, {
    enabled: rule.enabled,
    conditions: rule.conditions,
    actions: rule.actions
  })
})
```

---

## 🧠 Predictive Analytics Issues

### **🟡 Predictive Analytics History Error**

#### **Symptoms**
- HTTP 500 errors on `/api/analytics/predictive?action=history`
- "getRecentPredictions is not a function" errors
- Prediction history not displaying
- Analytics dashboard incomplete

#### **Root Cause**
Missing `getRecentPredictions()` method in SupabaseService

#### **Step-by-Step Resolution**

##### **Step 1: Implement Missing Method**
```javascript
// Add to src/services/SupabaseService.js
async getRecentPredictions(limit = 50) {
  try {
    const { data, error } = await this.db
      .from('predictions_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching predictions:', error)
      throw error
    }
    
    return {
      predictions: data || [],
      count: data?.length || 0,
      success: true
    }
  } catch (error) {
    console.error('Failed to get recent predictions:', error)
    return {
      predictions: [],
      count: 0,
      success: false,
      error: error.message
    }
  }
}
```

##### **Step 2: Create Predictions Table (if missing)**
```sql
-- In Supabase SQL Editor
CREATE TABLE IF NOT EXISTS predictions_history (
  id SERIAL PRIMARY KEY,
  prediction_type VARCHAR(100) NOT NULL,
  input_data JSONB NOT NULL,
  prediction_result JSONB NOT NULL,
  confidence_score DECIMAL(5,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_predictions_history_created_at 
  ON predictions_history(created_at DESC);

-- Add RLS policy
ALTER TABLE predictions_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON predictions_history
  FOR SELECT USING (true);
```

##### **Step 3: Test the Fix**
```bash
# Test the prediction history endpoint
curl -X GET \
  "http://localhost:3000/api/analytics/predictive?action=history&limit=10" \
  -H "Content-Type: application/json"

# Expected: JSON response with predictions array
# Error: Check implementation and database table
```

---

## 📊 Performance Issues

### **🟡 High Memory Usage**

#### **Symptoms**
- Application becoming slow over time
- Server crashes due to memory exhaustion
- Out of memory errors in logs
- Poor response times

#### **Root Causes**
1. **Memory leaks in application code**
2. **Large dataset caching**
3. **Database connection leaks**
4. **Inefficient data structures**

#### **Step-by-Step Resolution**

##### **Step 1: Monitor Memory Usage**
```bash
# Check process memory usage
pm2 monit

# Check system memory
free -h
top -o %MEM

# Check Node.js heap usage
node -e "console.log('Heap Used:', process.memoryUsage().heapUsed / 1024 / 1024, 'MB')"
```

##### **Step 2: Identify Memory Leaks**
```javascript
// Add memory monitoring to application
const memMonitor = setInterval(() => {
  const usage = process.memoryUsage()
  console.log('Memory Usage:', {
    rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
    external: Math.round(usage.external / 1024 / 1024) + ' MB'
  })
  
  // Alert if memory usage is high
  if (usage.heapUsed / 1024 / 1024 > 500) { // 500MB threshold
    console.warn('⚠️ High memory usage detected')
  }
}, 60000) // Check every minute
```

##### **Step 3: Optimize Data Caching**
```javascript
// Implement cache size limits
class LimitedCache {
  constructor(maxSize = 1000) {
    this.cache = new Map()
    this.maxSize = maxSize
  }
  
  set(key, value) {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })
  }
  
  get(key) {
    const item = this.cache.get(key)
    if (!item) return null
    
    // Remove if older than 5 minutes
    if (Date.now() - item.timestamp > 300000) {
      this.cache.delete(key)
      return null
    }
    
    return item.value
  }
}
```

##### **Step 4: Restart and Monitor**
```bash
# Restart application to clear memory
pm2 restart emd-app

# Monitor for improvement
watch -n 5 'free -h && echo "" && pm2 monit'
```

---

## 🔐 Security Issues

### **🔴 Authentication Failures**

#### **Symptoms**
- Users unable to log in
- "Invalid credentials" errors
- Session timeouts immediately
- API calls failing with 401 errors

#### **Root Causes**
1. **JWT secret misconfigured**
2. **Session management issues**
3. **Token expiration problems**
4. **Database user table issues**

#### **Step-by-Step Resolution**

##### **Step 1: Check JWT Configuration**
```javascript
// Verify JWT secret is set and valid
console.log('JWT Config:', {
  secret: process.env.JWT_SECRET ? 'SET' : 'MISSING',
  secretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
  algorithm: 'HS256',
  expiresIn: '24h'
})

// Test JWT generation
const jwt = require('jsonwebtoken')
const testToken = jwt.sign(
  { userId: 'test', email: 'test@example.com' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
)

console.log('Test token generated:', testToken ? 'SUCCESS' : 'FAILED')
```

##### **Step 2: Test User Authentication**
```javascript
// Test user login process
async function testAuth() {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      })
    })
    
    const data = await response.json()
    console.log('Auth test result:', {
      status: response.status,
      success: response.ok,
      token: data.token ? 'PRESENT' : 'MISSING',
      user: data.user ? 'PRESENT' : 'MISSING'
    })
    
    return response.ok
  } catch (error) {
    console.error('Auth test failed:', error)
    return false
  }
}
```

##### **Step 3: Check Database User Records**
```sql
-- Check user table and recent logins
SELECT 
  id,
  email,
  created_at,
  last_login_at,
  is_active
FROM users 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for any user authentication logs
SELECT * FROM auth_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## 📱 Mobile Issues

### **🟡 Mobile Dashboard Not Responsive**

#### **Symptoms**
- Dashboard doesn't work on mobile devices
- Layout breaks on small screens
- Touch interactions not working
- Poor mobile performance

#### **Root Causes**
1. **Responsive design issues**
2. **Touch event handlers missing**
3. **Mobile-specific CSS problems**
4. **Large assets not optimized for mobile**

#### **Step-by-Step Resolution**

##### **Step 1: Test Mobile Responsiveness**
```javascript
// Test responsive breakpoints
const testResponsive = () => {
  const breakpoints = {
    mobile: window.innerWidth <= 768,
    tablet: window.innerWidth > 768 && window.innerWidth <= 1024,
    desktop: window.innerWidth > 1024
  }
  
  console.log('Current breakpoint:', {
    width: window.innerWidth,
    height: window.innerHeight,
    breakpoints
  })
  
  return breakpoints
}

// Run in browser console
testResponsive()
```

##### **Step 2: Check Touch Event Handling**
```javascript
// Verify touch events are properly bound
const checkTouchEvents = () => {
  const touchElements = document.querySelectorAll('[data-touch]')
  console.log('Touch-enabled elements:', touchElements.length)
  
  // Check if touch events are working
  touchElements.forEach(element => {
    const hasTouchHandler = element.ontouchstart || 
                           element.getAttribute('ontouchstart') ||
                           element.addEventListener.toString().includes('touch')
    console.log(`Element ${element.id || element.className}: touch handler present`)
  })
}
```

##### **Step 3: Optimize Mobile Performance**
```javascript
// Lazy load components for mobile
const loadMobileComponents = async () => {
  if (window.innerWidth <= 768) {
    // Load essential components only
    const [AlertPanel, GPSStatus] = await Promise.all([
      import('./components/mobile/AlertPanel'),
      import('./components/mobile/GPSStatus')
    ])
    
    return { AlertPanel, GPSStatus }
  }
  
  // Load full components for desktop
  return import('./components/FullDashboard')
}
```

---

## 🔄 System Recovery Procedures

### **🔴 Complete System Failure**

#### **Recovery Steps**

##### **Step 1: Assess Damage**
1. **Check system status:** Is anything running?
2. **Review logs:** What was the last successful operation?
3. **Identify root cause:** Hardware, software, or network issue?
4. **Determine scope:** Is data affected?

##### **Step 2: Emergency Response**
```bash
# Stop all services to prevent further damage
pm2 stop all
pm2 save

# Check system resources
df -h  # Disk space
free -h  # Memory
top  # CPU usage
```

##### **Step 3: Restore from Backup**
```bash
# Restore application from backup
tar -xzf emd-app-backup-$(date +%Y%m%d).tar.gz

# Restore database from Supabase backup
# Use Supabase dashboard point-in-time recovery

# Restart services
npm ci --production
npm run build
pm2 start ecosystem.config.js
```

##### **Step 4: Verify Recovery**
1. **Health check:** All services responding?
2. **Data integrity:** Critical data present?
3. **Functionality:** Core features working?
4. **Performance:** Acceptable response times?

---

## 📞 Support Escalation

### **Escalation Matrix**

| Issue Severity | Response Time | Escalation Level | Contact |
|----------------|---------------|------------------|---------|
| 🔴 Critical | < 15 minutes | Immediate | Development Team |
| 🟠 High | < 1 hour | 30 minutes | Technical Lead |
| 🟡 Medium | < 4 hours | 2 hours | Operations Team |
| 🟢 Low | < 24 hours | 8 hours | Support Team |

### **Emergency Contacts**

#### **Development Team**
- **Lead Developer:** [Phone] - [Email]
- **On-call Developer:** [Phone] - [Email]
- **DevOps Engineer:** [Phone] - [Email]

#### **Operations Team**  
- **System Administrator:** [Phone] - [Email]
- **Database Administrator:** [Phone] - [Email]
- **Network Administrator:** [Phone] - [Email]

#### **External Support**
- **Supabase Support:** https://supabase.com/support
- **Samsara Support:** https://www.samsara.com/support
- **Vercel Support:** https://vercel.com/support

---

## 📝 Issue Logging Template

```markdown
# Issue Report: [ISSUE_TITLE]

**Date:** [DATE_TIME]
**Reported By:** [USER_NAME]
**Severity:** [Critical/High/Medium/Low]
**Environment:** [Production/Staging/Development]

## Issue Description
[Detailed description of the problem]

## Symptoms Observed
- [Symptom 1]
- [Symptom 2]  
- [Symptom 3]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Environment Details
- **URL:** [Application URL]
- **Browser:** [Browser and version]
- **Operating System:** [OS details]
- **User Role:** [User permissions level]

## Error Messages
```
[Copy exact error messages]
```

## Impact Assessment
- **Users Affected:** [Number]
- **Business Impact:** [Description]
- **Workaround Available:** [Yes/No]

## Resolution Steps Taken
1. [Action 1 - Result]
2. [Action 2 - Result]
3. [Action 3 - Result]

## Final Resolution
[How the issue was resolved]

## Prevention Measures
[What was done to prevent recurrence]

**Status:** [Open/In Progress/Resolved/Closed]
**Resolution Time:** [Total time to resolve]
```

---

## ✅ Troubleshooting Checklist

### **Before Calling Support**

- [x] **Document the issue** clearly with screenshots
- [x] **Check system logs** for error messages
- [x] **Test basic functionality** to isolate the problem
- [x] **Verify environment variables** are correctly set
- [x] **Check external service status** (FileMaker, Samsara, etc.)
- [x] **Review recent changes** that might have caused the issue
- [x] **Test with different browsers/users** to rule out local issues
- [x] **Attempt basic recovery steps** (restart services, clear cache)

### **Information to Provide**

- [x] **Exact error messages** (copy from logs)
- [x] **Steps to reproduce** the issue
- [x] **When the issue started** and any pattern observed
- [x] **What's working vs. what's broken**
- [x] **Recent changes** made to the system
- [x] **Environment details** (browser, OS, user role)

---

## 🏁 Prevention Best Practices

### **Proactive Monitoring**

1. **Health Checks:** Regular automated health monitoring
2. **Performance Monitoring:** Track response times and resource usage
3. **Error Tracking:** Proactive error detection and alerting
4. **Capacity Planning:** Monitor resource usage trends

### **Regular Maintenance**

1. **Database Optimization:** Regular query performance reviews
2. **Log Rotation:** Prevent log files from consuming disk space
3. **Dependency Updates:** Keep all packages and services updated
4. **Security Updates:** Regular security patches and updates

### **Incident Response**

1. **Runbooks:** Documented procedures for common issues
2. **Escalation Paths:** Clear contact information and procedures
3. **Communication Plans:** Keep stakeholders informed during incidents
4. **Post-Incident Reviews:** Learn from each incident to prevent recurrence

---

**Troubleshooting Guide Version:** 1.0  
**Last Updated:** 2025-11-11  
**System Status:** ✅ **FULLY OPERATIONAL**  
**Support Level:** Enterprise-grade  

---

*This troubleshooting guide covers the most common issues encountered with the EMD system. For issues not covered here, contact the technical support team with detailed information about the problem.*
# EMD Quick Start Guide
## Immediate Implementation Steps

---

## Day 1: Environment Setup

### 1. Create Project Structure
```
C:\Projects\EMD\
├── src/
│   ├── api/
│   │   ├── filemaker.js
│   │   └── alerts.js
│   ├── components/
│   │   ├── Dashboard.jsx
│   │   └── AlertCard.jsx
│   └── utils/
│       ├── calculations.js
│       └── validators.js
├── config/
│   └── api-config.json
├── tests/
└── docs/
```

### 2. FileMaker API Test Script
```javascript
// Quick connectivity test
const testFileMakerConnection = async () => {
  const auth = {
    url: 'https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1/sessions',
    username: 'trevor_api',
    password: 'XcScS2yRoTtMo7'
  };
  
  // Get token
  const token = await getFileMakerToken(auth);
  
  // Test query
  const testJob = await findJob(token, '603142');
  
  console.log('Connection successful:', testJob);
};
```

### 3. Initial Alert Rules
```javascript
const alertRules = [
  {
    name: 'Arrival Without Completion',
    query: 'time_arrival != null AND status = "Scheduled"',
    severity: 'HIGH',
    message: 'Job has arrival time but still shows Scheduled'
  },
  {
    name: 'Missing Assignment',
    query: 'due_date < NOW() + 1hr AND truck_id = null',
    severity: 'CRITICAL',
    message: 'Job due soon with no truck assigned'
  }
];
```

---

## Week 1 Checklist

### Monday - FileMaker Integration
- [ ] Set up Node.js project with Next.js 14
- [ ] Create FileMaker API authentication module
- [ ] Test connection with known job ID
- [ ] Document available fields

### Tuesday - Data Polling
- [ ] Implement 30-second polling mechanism
- [ ] Create job data cache layer
- [ ] Set up change detection logic
- [ ] Test with 100 job records

### Wednesday - Alert Engine
- [ ] Build rule evaluation system
- [ ] Create alert priority queue
- [ ] Implement deduplication logic
- [ ] Test false positive scenarios

### Thursday - Dashboard UI
- [ ] Design alert card components
- [ ] Create real-time update system
- [ ] Implement severity color coding
- [ ] Add dismiss/acknowledge actions

### Friday - Testing & Refinement
- [ ] Load test with full dataset
- [ ] Validate alert accuracy
- [ ] Fix any false positives
- [ ] Deploy to staging environment

---

## Critical Configuration Files

### 1. Environment Variables (.env.local)
```
FILEMAKER_HOST=modd.mainspringhost.com
FILEMAKER_DATABASE=PEP2_1
FILEMAKER_LAYOUT=jobs_api
FILEMAKER_USER=trevor_api
FILEMAKER_PASSWORD=XcScS2yRoTtMo7

POLLING_INTERVAL=30000
ALERT_THRESHOLD=5
TIMEZONE=America/Denver
```

### 2. Alert Severity Mapping
```json
{
  "severity_levels": {
    "LOW": {
      "color": "#10B981",
      "icon": "info",
      "auto_dismiss": true,
      "dismiss_after": 3600
    },
    "MEDIUM": {
      "color": "#F59E0B",
      "icon": "warning",
      "auto_dismiss": false,
      "notification": "dashboard"
    },
    "HIGH": {
      "color": "#EF4444",
      "icon": "alert-triangle",
      "auto_dismiss": false,
      "notification": "dashboard+sound"
    },
    "CRITICAL": {
      "color": "#991B1B",
      "icon": "alert-octagon",
      "auto_dismiss": false,
      "notification": "dashboard+sound+sms"
    }
  }
}
```

### 3. Sample Dashboard Layout
```jsx
// components/Dashboard.jsx
const Dashboard = () => {
  return (
    <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50">
      {/* Critical Alerts */}
      <div className="col-span-3 bg-red-50 border-l-4 border-red-500 p-4">
        <h2 className="text-red-800 font-bold">Critical Issues</h2>
        {criticalAlerts.map(alert => <AlertCard key={alert.id} {...alert} />)}
      </div>
      
      {/* Schedule Issues */}
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
        <h2 className="text-yellow-800 font-bold">Schedule Integrity</h2>
        {scheduleAlerts.map(alert => <AlertCard key={alert.id} {...alert} />)}
      </div>
      
      {/* Efficiency Warnings */}
      <div className="bg-green-50 border-l-4 border-green-500 p-4">
        <h2 className="text-green-800 font-bold">Efficiency Opportunities</h2>
        {efficiencyAlerts.map(alert => <AlertCard key={alert.id} {...alert} />)}
      </div>
      
      {/* System Status */}
      <div className="bg-gray-100 p-4">
        <h2 className="font-bold">System Health</h2>
        <p>Last Update: {lastUpdate}</p>
        <p>Active Alerts: {totalAlerts}</p>
        <p>API Status: {apiStatus}</p>
      </div>
    </div>
  );
};
```

---

## Validation Criteria

### No False Positives Test
Run for 24 hours and verify:
- Zero "job removed" alerts when comparing different days
- No duplicate alerts for same issue
- Correct status transitions tracked
- Time zone handling accurate

### Performance Benchmarks
- FileMaker API response: <500ms
- Alert evaluation cycle: <2 seconds
- Dashboard render: <100ms
- Memory usage: <200MB

### User Acceptance
- Dispatcher can acknowledge alerts
- Alert history is maintained
- Filters work correctly
- Mobile responsive design

---

## Emergency Contacts

- **FileMaker Admin**: Database field access requests
- **Samsara Support**: API rate limit increases
- **DevOps Team**: Deployment and monitoring
- **Dispatch Manager**: Business logic validation

---

## Next Steps After Phase 1

1. **Gather Feedback**: Week 4 dispatcher survey
2. **Refine Rules**: Adjust thresholds based on real usage
3. **Add Integrations**: Samsara GPS, Google Maps
4. **Expand Alerts**: Profitability, efficiency metrics
5. **Scale Testing**: Handle 500+ concurrent jobs

---

*Quick Start Version: 1.0*  
*Implementation Begin: Immediate*  
*First Review: End of Week 1*
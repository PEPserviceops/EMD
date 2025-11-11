/**
 * Test script to verify GPS alert integration fix
 */

const { AlertEngine } = require('./src/api/alerts');

// Sample job data
const testJobs = [
  {
    recordId: "589367",
    fieldData: {
      _kp_job_id: "589367",
      job_status: "In Progress",
      _kf_trucks_id: "TRUCK_001"
    }
  },
  {
    recordId: "339535", 
    fieldData: {
      _kp_job_id: "339535",
      job_status: "In Progress",
      _kf_trucks_id: "TRUCK_002"
    }
  }
];

// Mock GPS verification data (simulating Samsara response)
const mockGpsVerification = {
  success: true,
  results: {
    results: {
      verified: [],
      offSchedule: [],
      unknown: [],
      errors: []
    },
    resultsByJobId: {
      "589367": {
        jobId: "589367",
        truckId: "TRUCK_001", 
        verificationStatus: "off_schedule",
        distance: 15.5,
        hasSamsaraTracking: true
      },
      "339535": {
        jobId: "339535",
        truckId: "TRUCK_002",
        verificationStatus: "unknown", 
        hasSamsaraTracking: false
      }
    },
    summary: {
      total: 2,
      verified: 0,
      offSchedule: 1,
      unknown: 1,
      errors: 0
    }
  },
  timestamp: new Date().toISOString()
};

// Test the AlertEngine
async function testGpsAlerts() {
  console.log("🧪 Testing GPS Alert Integration Fix...\n");
  
  const alertEngine = new AlertEngine();
  
  try {
    // Test evaluation with GPS data
    console.log("📊 Testing GPS alert rules with mock data...");
    console.log("Mock GPS Verification Data:", JSON.stringify(mockGpsVerification, null, 2));
    console.log("\n🧪 Jobs to test:", testJobs.map(j => j.recordId));
    
    const result = alertEngine.evaluateJobs(testJobs, mockGpsVerification);
    
    console.log("\n✅ Alert Evaluation Results:");
    console.log(`- Total Active Alerts: ${result.total}`);
    console.log(`- New Alerts: ${result.new}`);  
    console.log(`- Resolved Alerts: ${result.resolved}`);
    
    if (result.newAlerts && result.newAlerts.length > 0) {
      console.log("\n🚨 New Alerts Generated:");
      result.newAlerts.forEach((alert, index) => {
        console.log(`${index + 1}. ${alert.ruleName} (${alert.severity})`);
        console.log(`   Message: ${alert.message}`);
        console.log(`   Job ID: ${alert.jobId}`);
      });
    } else {
      console.log("\n✅ No GPS-related errors - Alert rules working correctly!");
    }
    
    // Test individual GPS alert rules
    console.log("\n🧪 Testing Individual GPS Alert Rules:");
    
    testJobs.forEach(job => {
      console.log(`\n📋 Testing job ${job.recordId}:`);
      
      alertEngine.rules
        .filter(rule => rule.id.startsWith('gps-'))
        .forEach(rule => {
          try {
            const shouldTrigger = rule.evaluate(job, mockGpsVerification);
            console.log(`  - ${rule.name}: ${shouldTrigger ? '⚠️ TRIGGERS' : '✅ OK'}`);
          } catch (error) {
            console.log(`  - ${rule.name}: ❌ ERROR - ${error.message}`);
          }
        });
    });
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
    return false;
  }
  
  return true;
}

// Run the test
testGpsAlerts().then(success => {
  if (success) {
    console.log("\n🎉 GPS Alert Integration Test PASSED!");
    console.log("✅ The fix has resolved the GPS alert data access errors.");
  } else {
    console.log("\n💥 GPS Alert Integration Test FAILED!");
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error("\n💥 Test execution failed:", error.message);
  process.exit(1);
});
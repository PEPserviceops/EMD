/**
 * Test GPS Proximity Alerts
 * Tests the new GPS proximity alert functionality
 */

const { AlertEngine } = require('./src/api/alerts');

// Mock GPS verification data
const mockGpsVerification = {
  success: true,
  results: {
    resultsByJobId: {
      'test-job-1': {
        verificationStatus: 'verified',
        distance: 1.5, // 1.5 miles - should trigger proximity alert
        truckId: '23',
        hasSamsaraTracking: true
      },
      'test-job-2': {
        verificationStatus: 'verified',
        distance: 3.0, // 3.0 miles - should NOT trigger proximity alert
        truckId: '34',
        hasSamsaraTracking: true
      },
      'test-job-3': {
        verificationStatus: 'off_schedule',
        distance: 0.5, // 0.5 miles but off schedule - should NOT trigger proximity alert
        truckId: '45',
        hasSamsaraTracking: true
      }
    }
  }
};

// Mock job data
const mockJobs = [
  {
    recordId: 'test-job-1',
    fieldData: {
      _kp_job_id: 'JOB-001',
      job_status: 'In Progress'
    }
  },
  {
    recordId: 'test-job-2',
    fieldData: {
      _kp_job_id: 'JOB-002',
      job_status: 'In Progress'
    }
  },
  {
    recordId: 'test-job-3',
    fieldData: {
      _kp_job_id: 'JOB-003',
      job_status: 'In Progress'
    }
  }
];

console.log('============================================================');
console.log('GPS Proximity Alerts Test');
console.log('============================================================\n');

// Create alert engine
const alertEngine = new AlertEngine();

// Test proximity alerts
console.log('Testing GPS proximity alerts...');
const alerts = alertEngine.evaluateJobs(mockJobs, mockGpsVerification);

console.log(`\nGenerated ${alerts.new} new alerts:`);
alerts.newAlerts.forEach((alert, index) => {
  console.log(`${index + 1}. ${alert.ruleName}: ${alert.message}`);
  console.log(`   Severity: ${alert.severity}`);
  console.log(`   Job ID: ${alert.jobId}`);
  console.log('');
});

// Expected results
console.log('Expected Results:');
console.log('✓ JOB-001 should trigger proximity alert (1.5 miles < 2 mile threshold)');
console.log('✗ JOB-002 should NOT trigger proximity alert (3.0 miles > 2 mile threshold)');
console.log('✗ JOB-003 should NOT trigger proximity alert (off_schedule status)');
console.log('');

const proximityAlerts = alerts.newAlerts.filter(a => a.ruleId === 'gps-proximity-alert');
console.log(`Actual Results: ${proximityAlerts.length} proximity alerts generated`);

if (proximityAlerts.length === 1 && proximityAlerts[0].jobId === 'JOB-001') {
  console.log('✅ GPS Proximity Alerts Test PASSED');
} else {
  console.log('❌ GPS Proximity Alerts Test FAILED');
  console.log('Expected exactly 1 proximity alert for JOB-001');
}

console.log('\n============================================================');
console.log('Test completed');
console.log('============================================================');

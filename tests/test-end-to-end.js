/**
 * End-to-End Testing Suite
 * Tests the complete workflow from FileMaker data to dashboard display
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS_FILE = 'tests/e2e-test-results.json';

// Test configuration
const config = {
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Test results tracker
const results = {
  timestamp: new Date().toISOString(),
  totalTests: 0,
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to log test results
function logTest(name, passed, details = {}) {
  results.totalTests++;
  if (passed) {
    results.passed++;
    console.log(`✓ ${name}`);
  } else {
    results.failed++;
    console.log(`✗ ${name}`);
    if (details.error) {
      console.log(`  Error: ${details.error}`);
    }
  }
  results.tests.push({ name, passed, ...details });
}

// Test 1: API Health Check
async function testAPIHealth() {
  console.log('\n=== Test 1: API Health Check ===');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/alerts`, config);
    logTest('API /api/alerts is accessible', response.status === 200, {
      status: response.status,
      responseTime: response.headers['x-response-time']
    });
    
    logTest('API returns valid JSON', typeof response.data === 'object', {
      dataType: typeof response.data
    });
    
    logTest('API includes alerts array', Array.isArray(response.data.alerts), {
      hasAlerts: Array.isArray(response.data.alerts)
    });
    
    logTest('API includes stats object', response.data.stats !== undefined, {
      hasStats: response.data.stats !== undefined
    });
    
    return response.data;
  } catch (error) {
    logTest('API Health Check', false, { error: error.message });
    return null;
  }
}

// Test 2: Polling Service Status
async function testPollingService() {
  console.log('\n=== Test 2: Polling Service Status ===');

  try {
    const response = await axios.get(`${BASE_URL}/api/polling/status`, config);
    logTest('Polling status endpoint accessible', response.status === 200);

    const status = response.data;

    // Check if response has the expected structure
    if (status.success && status.data) {
      const { stats, health } = status.data;

      logTest('Polling service returns stats', stats !== undefined, {
        hasStats: stats !== undefined
      });

      if (stats) {
        logTest('Polling has completed at least one poll', stats.totalPolls > 0, {
          totalPolls: stats.totalPolls
        });

        logTest('Polling success rate is 100%', stats.successRate === 100, {
          successRate: stats.successRate
        });

        logTest('Average response time < 500ms', stats.avgResponseTime < 500, {
          avgResponseTime: stats.avgResponseTime
        });
      }

      if (health) {
        logTest('Health status available', health.status !== undefined, {
          status: health.status
        });
      }
    } else {
      logTest('Polling service response structure', false, {
        error: 'Unexpected response structure'
      });
    }

    return status;
  } catch (error) {
    logTest('Polling Service Status', false, { error: error.message });
    return null;
  }
}

// Test 3: Alert Rules Validation
async function testAlertRules(alertsData) {
  console.log('\n=== Test 3: Alert Rules Validation ===');
  
  if (!alertsData || !alertsData.alerts) {
    logTest('Alert Rules Validation', false, { error: 'No alerts data available' });
    return;
  }
  
  const alerts = alertsData.alerts;
  const stats = alertsData.stats;
  
  // Test alert structure
  if (alerts.length > 0) {
    const sampleAlert = alerts[0];
    logTest('Alerts have required fields', 
      sampleAlert.id && sampleAlert.severity && sampleAlert.message,
      { fields: Object.keys(sampleAlert) }
    );
    
    logTest('Alert severity is valid', 
      ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(sampleAlert.severity),
      { severity: sampleAlert.severity }
    );
  }
  
  // Test stats accuracy
  const calculatedTotal = stats.critical + stats.high + stats.medium + stats.low;
  logTest('Stats total matches alert count', calculatedTotal === stats.total, {
    calculated: calculatedTotal,
    reported: stats.total
  });
  
  // Test severity distribution
  const severityCounts = {
    CRITICAL: alerts.filter(a => a.severity === 'CRITICAL').length,
    HIGH: alerts.filter(a => a.severity === 'HIGH').length,
    MEDIUM: alerts.filter(a => a.severity === 'MEDIUM').length,
    LOW: alerts.filter(a => a.severity === 'LOW').length
  };
  
  logTest('Critical count matches', severityCounts.CRITICAL === stats.critical, {
    counted: severityCounts.CRITICAL,
    reported: stats.critical
  });
  
  logTest('High count matches', severityCounts.HIGH === stats.high, {
    counted: severityCounts.HIGH,
    reported: stats.high
  });
  
  logTest('Medium count matches', severityCounts.MEDIUM === stats.medium, {
    counted: severityCounts.MEDIUM,
    reported: stats.medium
  });
  
  // Test for false positives
  const deletedJobAlerts = alerts.filter(a => 
    a.message && a.message.toLowerCase().includes('deleted')
  );
  logTest('No alerts for DELETED jobs', deletedJobAlerts.length === 0, {
    deletedJobAlerts: deletedJobAlerts.length
  });
  
  const completedJobAlerts = alerts.filter(a => 
    a.jobStatus === 'Completed' && a.severity !== 'LOW'
  );
  logTest('No high-priority alerts for completed jobs', completedJobAlerts.length === 0, {
    completedJobAlerts: completedJobAlerts.length
  });
}

// Test 4: Alert Actions (Acknowledge/Dismiss)
async function testAlertActions(alertsData) {
  console.log('\n=== Test 4: Alert Actions ===');

  if (!alertsData || !alertsData.alerts || alertsData.alerts.length === 0) {
    console.log('  Note: No alerts currently active - skipping action tests');
    logTest('Alert Actions (skipped - no alerts)', true, {
      reason: 'No alerts available for testing'
    });
    return;
  }

  const testAlert = alertsData.alerts[0];

  // Note: These endpoints may not work without proper implementation
  // This is a placeholder for when they are implemented
  console.log('  Note: Acknowledge/Dismiss endpoints require full implementation');
  console.log(`  Test alert ID: ${testAlert.id}`);

  logTest('Alert has ID for actions', testAlert.id !== undefined, {
    alertId: testAlert.id
  });
}

// Test 5: Performance Metrics
async function testPerformance() {
  console.log('\n=== Test 5: Performance Metrics ===');
  
  const iterations = 5;
  const responseTimes = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    try {
      await axios.get(`${BASE_URL}/api/alerts`, config);
      const responseTime = Date.now() - start;
      responseTimes.push(responseTime);
    } catch (error) {
      logTest(`Performance test iteration ${i + 1}`, false, { error: error.message });
    }
  }
  
  if (responseTimes.length > 0) {
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    
    logTest('Average response time < 500ms', avgResponseTime < 500, {
      avg: Math.round(avgResponseTime),
      min: minResponseTime,
      max: maxResponseTime
    });
    
    logTest('Max response time < 1000ms', maxResponseTime < 1000, {
      max: maxResponseTime
    });
    
    logTest('Response time consistency (max/min < 3)', maxResponseTime / minResponseTime < 3, {
      ratio: (maxResponseTime / minResponseTime).toFixed(2)
    });
  }
}

// Test 6: Data Integrity
async function testDataIntegrity(alertsData) {
  console.log('\n=== Test 6: Data Integrity ===');
  
  if (!alertsData || !alertsData.alerts) {
    logTest('Data Integrity', false, { error: 'No alerts data available' });
    return;
  }
  
  const alerts = alertsData.alerts;
  
  // Check for duplicate alert IDs
  const alertIds = alerts.map(a => a.id);
  const uniqueIds = new Set(alertIds);
  logTest('No duplicate alert IDs', alertIds.length === uniqueIds.size, {
    total: alertIds.length,
    unique: uniqueIds.size
  });
  
  // Check for required fields
  const alertsWithAllFields = alerts.filter(a => 
    a.id && a.severity && a.message && a.timestamp
  );
  logTest('All alerts have required fields', alertsWithAllFields.length === alerts.length, {
    complete: alertsWithAllFields.length,
    total: alerts.length
  });
  
  // Check timestamp validity
  const validTimestamps = alerts.filter(a => {
    const timestamp = new Date(a.timestamp);
    return !isNaN(timestamp.getTime());
  });
  logTest('All timestamps are valid', validTimestamps.length === alerts.length, {
    valid: validTimestamps.length,
    total: alerts.length
  });
}

// Main test runner
async function runAllTests() {
  console.log('======================================================================');
  console.log('End-to-End Testing Suite');
  console.log('======================================================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Started: ${new Date().toLocaleString()}`);
  
  // Run all tests
  const alertsData = await testAPIHealth();
  const pollingStatus = await testPollingService();
  await testAlertRules(alertsData);
  await testAlertActions(alertsData);
  await testPerformance();
  await testDataIntegrity(alertsData);
  
  // Summary
  console.log('\n======================================================================');
  console.log('Test Summary');
  console.log('======================================================================');
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`Passed: ${results.passed} (${Math.round(results.passed / results.totalTests * 100)}%)`);
  console.log(`Failed: ${results.failed}`);
  console.log('======================================================================');
  
  if (results.failed === 0) {
    console.log('\n✓ All tests passed!');
  } else {
    console.log(`\n✗ ${results.failed} test(s) failed`);
  }
  
  // Save results
  fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\n✓ Test results saved to: ${TEST_RESULTS_FILE}`);
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});


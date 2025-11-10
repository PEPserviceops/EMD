/**
 * Test Enhanced Alert Engine
 * Tests priority queue, deduplication, and false positive scenarios
 */

const { AlertEngine, SEVERITY } = require('../src/api/alerts');

// Test data
const createTestJob = (overrides = {}) => ({
  recordId: '12345',
  fieldData: {
    _kp_job_id: '356001',
    job_status: 'Entered',
    job_status_driver: '',
    time_arival: '',
    time_complete: '',
    _kf_trucks_id: '',
    _kf_driver_id: '',
    job_date: '11/10/2025',
    job_type: 'Delivery',
    ...overrides
  }
});

function runTests() {
  console.log('='.repeat(70));
  console.log('Testing Enhanced Alert Engine');
  console.log('='.repeat(70));
  console.log();

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Priority Queue Ordering
  console.log('Test 1: Priority Queue Ordering');
  console.log('-'.repeat(70));
  try {
    const engine = new AlertEngine();
    
    const jobs = [
      createTestJob({ _kp_job_id: '1', job_status: 'Re-scheduled' }), // MEDIUM
      createTestJob({ _kp_job_id: '2', job_status: 'Attempted' }), // HIGH
      createTestJob({ _kp_job_id: '3', job_status: 'Entered', _kf_trucks_id: '' }), // HIGH
      createTestJob({ _kp_job_id: '4', job_status: 'Re-scheduled' }) // MEDIUM
    ];

    engine.evaluateJobs(jobs);
    const alerts = engine.getActiveAlerts();

    console.log(`  Generated ${alerts.length} alerts`);
    console.log('  Alert order:');
    alerts.forEach((alert, i) => {
      console.log(`    ${i + 1}. [${alert.severity}] ${alert.ruleName}`);
    });

    // Verify HIGH alerts come before MEDIUM
    const firstHigh = alerts.findIndex(a => a.severity === 'HIGH');
    const lastMedium = alerts.map((a, i) => a.severity === 'MEDIUM' ? i : -1).filter(i => i !== -1).pop();
    
    if (firstHigh < lastMedium || firstHigh === -1) {
      console.log('  ✓ Priority ordering correct (HIGH before MEDIUM)');
      testsPassed++;
    } else {
      console.log('  ✗ Priority ordering incorrect');
      testsFailed++;
    }
  } catch (error) {
    console.log('  ✗ Test failed:', error.message);
    testsFailed++;
  }
  console.log();

  // Test 2: Deduplication
  console.log('Test 2: Deduplication Logic');
  console.log('-'.repeat(70));
  try {
    const engine = new AlertEngine();
    engine.setDeduplicationWindow(5000); // 5 seconds for testing

    const job = createTestJob({ job_status: 'Attempted' });

    // First evaluation - should create alert
    let result1 = engine.evaluateJobs([job]);
    console.log(`  First evaluation: ${result1.new} new alerts`);

    // Immediate second evaluation - should be deduplicated
    let result2 = engine.evaluateJobs([job]);
    console.log(`  Second evaluation (immediate): ${result2.new} new alerts`);

    if (result1.new === 1 && result2.new === 0) {
      console.log('  ✓ Deduplication working correctly');
      testsPassed++;
    } else {
      console.log('  ✗ Deduplication failed');
      testsFailed++;
    }

    const dedupStats = engine.getDeduplicationStats();
    console.log(`  Deduplication cache size: ${dedupStats.cacheSize}`);
  } catch (error) {
    console.log('  ✗ Test failed:', error.message);
    testsFailed++;
  }
  console.log();

  // Test 3: False Positive - Completed Job
  console.log('Test 3: False Positive - Completed Job');
  console.log('-'.repeat(70));
  try {
    const engine = new AlertEngine();
    
    const completedJob = createTestJob({
      job_status: 'Completed',
      time_arival: '10:00:00',
      time_complete: '11:30:00',
      _kf_trucks_id: '42',
      _kf_driver_id: 'John Smith'
    });

    const result = engine.evaluateJobs([completedJob]);
    
    console.log(`  Completed job generated ${result.new} alerts`);
    
    if (result.new === 0) {
      console.log('  ✓ No false positives for completed job');
      testsPassed++;
    } else {
      console.log('  ✗ False positive detected!');
      result.newAlerts.forEach(alert => {
        console.log(`    - ${alert.ruleName}: ${alert.message}`);
      });
      testsFailed++;
    }
  } catch (error) {
    console.log('  ✗ Test failed:', error.message);
    testsFailed++;
  }
  console.log();

  // Test 4: False Positive - Canceled Job
  console.log('Test 4: False Positive - Canceled Job');
  console.log('-'.repeat(70));
  try {
    const engine = new AlertEngine();
    
    const canceledJob = createTestJob({
      job_status: 'Canceled',
      _kf_trucks_id: '',
      _kf_driver_id: ''
    });

    const result = engine.evaluateJobs([canceledJob]);
    
    console.log(`  Canceled job generated ${result.new} alerts`);
    
    if (result.new === 0) {
      console.log('  ✓ No false positives for canceled job');
      testsPassed++;
    } else {
      console.log('  ✗ False positive detected!');
      result.newAlerts.forEach(alert => {
        console.log(`    - ${alert.ruleName}: ${alert.message}`);
      });
      testsFailed++;
    }
  } catch (error) {
    console.log('  ✗ Test failed:', error.message);
    testsFailed++;
  }
  console.log();

  // Test 5: Bulk Operations
  console.log('Test 5: Bulk Acknowledge/Dismiss');
  console.log('-'.repeat(70));
  try {
    const engine = new AlertEngine();

    // Use different job statuses to avoid deduplication
    const jobs = [
      createTestJob({ _kp_job_id: '1', recordId: '1', job_status: 'Attempted' }),
      createTestJob({ _kp_job_id: '2', recordId: '2', job_status: 'Re-scheduled' }),
      createTestJob({ _kp_job_id: '3', recordId: '3', job_status: 'Entered', _kf_trucks_id: '' })
    ];

    engine.evaluateJobs(jobs);
    const alerts = engine.getActiveAlerts();
    const alertIds = alerts.map(a => a.id);

    console.log(`  Generated ${alerts.length} alerts`);

    // Bulk acknowledge first 2
    const ackResult = engine.bulkAcknowledge(alertIds.slice(0, 2), 'test-user');
    console.log(`  Bulk acknowledged: ${ackResult.acknowledged} alerts`);

    // Bulk dismiss last one
    const dismissResult = engine.bulkDismiss([alertIds[2]], 'test-user');
    console.log(`  Bulk dismissed: ${dismissResult.dismissed} alerts`);

    const stats = engine.getStatistics();
    console.log(`  Acknowledged: ${stats.acknowledged}, Active: ${stats.total}`);

    if (ackResult.acknowledged === 2 && dismissResult.dismissed === 1 && stats.total === 2) {
      console.log('  ✓ Bulk operations working correctly');
      testsPassed++;
    } else {
      console.log('  ✗ Bulk operations failed');
      testsFailed++;
    }
  } catch (error) {
    console.log('  ✗ Test failed:', error.message);
    testsFailed++;
  }
  console.log();

  // Test 6: Alert Resolution
  console.log('Test 6: Alert Resolution');
  console.log('-'.repeat(70));
  try {
    const engine = new AlertEngine();

    // Create two jobs - one with issue, one without
    const jobWithIssue = createTestJob({
      _kp_job_id: '999',
      recordId: '999',
      job_status: 'Entered',
      _kf_trucks_id: ''
    });

    const jobFixed = createTestJob({
      _kp_job_id: '999',
      recordId: '999',
      job_status: 'Completed',  // Change to Completed to avoid all alerts
      _kf_trucks_id: '42',
      _kf_driver_id: 'John Smith',
      time_arival: '10:00:00',
      time_complete: '11:30:00'
    });

    // First evaluation - job has issue
    let result1 = engine.evaluateJobs([jobWithIssue]);
    console.log(`  Initial: ${result1.new} new alerts, ${result1.total} total`);

    // Clear deduplication cache
    engine.deduplicationCache.clear();

    // Second evaluation - job is fixed
    let result2 = engine.evaluateJobs([jobFixed]);
    console.log(`  After fix: ${result2.resolved} resolved, ${result2.new} new, ${result2.total} total`);

    // Debug: show what alerts are still active
    if (result2.total > 0) {
      const activeAlerts = engine.getActiveAlerts();
      console.log(`  Active alerts after fix:`);
      activeAlerts.forEach(a => {
        console.log(`    - ${a.id}: ${a.ruleName}`);
      });
    }

    if (result1.new === 1 && result2.resolved === 1 && result2.total === 0) {
      console.log('  ✓ Alert resolution working correctly');
      testsPassed++;
    } else {
      console.log('  ✗ Alert resolution failed');
      console.log(`    Expected: new=1, resolved=1, total=0`);
      console.log(`    Got: new=${result1.new}, resolved=${result2.resolved}, total=${result2.total}`);
      testsFailed++;
    }
  } catch (error) {
    console.log('  ✗ Test failed:', error.message);
    testsFailed++;
  }
  console.log();

  // Test 7: Statistics
  console.log('Test 7: Alert Statistics');
  console.log('-'.repeat(70));
  try {
    const engine = new AlertEngine();
    
    const jobs = [
      createTestJob({ _kp_job_id: '1', recordId: '1', job_status: 'Attempted' }),
      createTestJob({ _kp_job_id: '2', recordId: '2', job_status: 'Re-scheduled' }),
      createTestJob({ _kp_job_id: '3', recordId: '3', job_status: 'Entered', _kf_trucks_id: '' })
    ];

    engine.evaluateJobs(jobs);
    const stats = engine.getStatistics();

    console.log('  Statistics:');
    console.log(`    Total: ${stats.total}`);
    console.log(`    Acknowledged: ${stats.acknowledged}`);
    console.log(`    Unacknowledged: ${stats.unacknowledged}`);
    console.log(`    By Severity:`, stats.bySeverity);
    console.log(`    By Rule:`, stats.byRule);
    console.log(`    Priority Queue Size: ${stats.priorityQueueSize}`);

    if (stats.total === 3 && stats.priorityQueueSize === 3) {
      console.log('  ✓ Statistics accurate');
      testsPassed++;
    } else {
      console.log('  ✗ Statistics inaccurate');
      testsFailed++;
    }
  } catch (error) {
    console.log('  ✗ Test failed:', error.message);
    testsFailed++;
  }
  console.log();

  // Test 8: Highest Priority Alert
  console.log('Test 8: Highest Priority Alert');
  console.log('-'.repeat(70));
  try {
    const engine = new AlertEngine();
    
    const jobs = [
      createTestJob({ _kp_job_id: '1', job_status: 'Re-scheduled' }), // MEDIUM
      createTestJob({ _kp_job_id: '2', job_status: 'Attempted' }) // HIGH
    ];

    engine.evaluateJobs(jobs);
    const highest = engine.getHighestPriorityAlert();

    console.log(`  Highest priority: [${highest.severity}] ${highest.ruleName}`);

    if (highest.severity === 'HIGH') {
      console.log('  ✓ Highest priority alert correct');
      testsPassed++;
    } else {
      console.log('  ✗ Highest priority alert incorrect');
      testsFailed++;
    }
  } catch (error) {
    console.log('  ✗ Test failed:', error.message);
    testsFailed++;
  }
  console.log();

  // Summary
  console.log('='.repeat(70));
  console.log('Test Summary');
  console.log('='.repeat(70));
  console.log(`Tests Passed: ${testsPassed}`);
  console.log(`Tests Failed: ${testsFailed}`);
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  console.log();

  if (testsFailed === 0) {
    console.log('✓ All tests passed!');
    console.log();
    return 0;
  } else {
    console.log('✗ Some tests failed');
    console.log();
    return 1;
  }
}

// Run tests
process.exit(runTests());


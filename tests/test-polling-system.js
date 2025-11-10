/**
 * Test Polling System
 * Tests the complete polling, caching, and change detection system
 */

require('dotenv').config({ path: '.env.local' });
const PollingService = require('../src/services/PollingService');
const CacheService = require('../src/services/CacheService');
const ChangeDetectionService = require('../src/services/ChangeDetectionService');

async function testPollingSystem() {
  console.log('='.repeat(70));
  console.log('Testing Polling System with Change Detection');
  console.log('='.repeat(70));
  console.log();

  // Initialize services
  const cacheService = new CacheService({
    dbPath: './data/test-cache.db',
    ttl: 300000,
    maxSize: 1000,
    persistToDisk: true
  });

  const changeDetection = new ChangeDetectionService(cacheService);

  const pollingService = new PollingService({
    interval: 10000, // 10 seconds for testing
    batchSize: 100,
    enabled: true,
    fileMaker: {
      host: process.env.FILEMAKER_HOST,
      database: process.env.FILEMAKER_DATABASE,
      layout: process.env.FILEMAKER_LAYOUT,
      username: process.env.FILEMAKER_USER,
      password: process.env.FILEMAKER_PASSWORD
    }
  });

  // Set up event listeners
  let pollCount = 0;
  let totalChanges = 0;
  let totalAlerts = 0;

  pollingService.on('poll', (data) => {
    pollCount++;

    // Detect changes FIRST (before logging)
    let changes = null;
    if (data.jobCount > 0) {
      changes = changeDetection.detectChanges(data.jobs || []);
      if (changes.summary.totalChanges > 0) {
        totalChanges += changes.summary.totalChanges;
      }
    }

    console.log();
    console.log(`[Poll #${pollCount}] ${new Date().toISOString()}`);
    console.log(`  Jobs Retrieved: ${data.jobCount}`);
    console.log(`  Response Time: ${data.responseTime}ms`);
    console.log(`  Active Alerts: ${data.alertResult.total}`);
    console.log(`  New Alerts: ${data.alertResult.new}`);
    console.log(`  Resolved Alerts: ${data.alertResult.resolved}`);

    // Show changes
    if (changes && changes.summary.totalChanges > 0) {
      console.log();
      console.log('  Changes Detected:');
      console.log(`    New Jobs: ${changes.summary.newCount}`);
      console.log(`    Updated Jobs: ${changes.summary.updatedCount}`);
      console.log(`    Deleted Jobs: ${changes.summary.deletedCount}`);

        // Show details of updated jobs
        if (changes.updated.length > 0) {
          console.log();
          console.log('  Updated Job Details:');
          changes.updated.slice(0, 3).forEach(change => {
            console.log(`    Job ${change.jobId}:`);
            change.fieldChanges.forEach(fc => {
              console.log(`      ${fc.field}: "${fc.oldValue}" → "${fc.newValue}"`);
            });
          });
          if (changes.updated.length > 3) {
            console.log(`    ... and ${changes.updated.length - 3} more`);
          }
        }

        // Analyze changes
        const analysis = changeDetection.analyzeChanges(changes);
        if (Object.keys(analysis.mostChangedFields).length > 0) {
          console.log();
          console.log('  Most Changed Fields:');
          Object.entries(analysis.mostChangedFields).slice(0, 5).forEach(([field, count]) => {
            console.log(`    ${field}: ${count} changes`);
          });
        }
      } else if (pollCount === 1) {
        console.log(`  First poll - ${data.jobCount} jobs cached`);
      } else {
        console.log('  No changes detected');
      }
    }

    totalAlerts = data.alertResult.total;
  });

  pollingService.on('newAlerts', (data) => {
    console.log();
    console.log(`⚠ NEW ALERTS (${data.count}):`);
    data.alerts.slice(0, 3).forEach(alert => {
      console.log(`  [${alert.severity}] ${alert.message}`);
    });
    if (data.alerts.length > 3) {
      console.log(`  ... and ${data.alerts.length - 3} more`);
    }
  });

  pollingService.on('resolvedAlerts', (data) => {
    console.log();
    console.log(`✓ RESOLVED ALERTS (${data.count})`);
  });

  pollingService.on('error', (error) => {
    console.error();
    console.error('✗ ERROR:', error.message);
  });

  try {
    // Start polling
    console.log('Starting polling service...');
    console.log(`Interval: 10 seconds (for testing)`);
    console.log(`Batch Size: 100 jobs`);
    console.log();
    console.log('Press Ctrl+C to stop');
    console.log('-'.repeat(70));

    await pollingService.start();

    // Run for 5 polls (50 seconds)
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (pollCount >= 5) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
    });

    // Stop polling
    console.log();
    console.log('-'.repeat(70));
    console.log('Stopping polling service...');
    await pollingService.stop();

    // Show final statistics
    console.log();
    console.log('='.repeat(70));
    console.log('Test Complete - Final Statistics');
    console.log('='.repeat(70));
    console.log();

    const stats = pollingService.getStats();
    console.log('Polling Statistics:');
    console.log(`  Total Polls: ${stats.totalPolls}`);
    console.log(`  Successful Polls: ${stats.successfulPolls}`);
    console.log(`  Failed Polls: ${stats.failedPolls}`);
    console.log(`  Success Rate: ${Math.round((stats.successfulPolls / stats.totalPolls) * 100)}%`);
    console.log(`  Total Jobs Processed: ${stats.totalJobsProcessed}`);
    console.log(`  Average Response Time: ${Math.round(stats.averageResponseTime)}ms`);
    console.log();

    console.log('Change Detection Statistics:');
    console.log(`  Total Changes Detected: ${totalChanges}`);
    console.log(`  Cache Size: ${cacheService.size()} jobs`);
    console.log();

    console.log('Alert Statistics:');
    console.log(`  Total Alerts Generated: ${stats.totalAlertsGenerated}`);
    console.log(`  Active Alerts: ${totalAlerts}`);
    console.log();

    const alertSummary = pollingService.getAlertSummary();
    console.log('Alerts by Severity:');
    console.log(`  CRITICAL: ${alertSummary.bySeverity.CRITICAL}`);
    console.log(`  HIGH:     ${alertSummary.bySeverity.HIGH}`);
    console.log(`  MEDIUM:   ${alertSummary.bySeverity.MEDIUM}`);
    console.log(`  LOW:      ${alertSummary.bySeverity.LOW}`);
    console.log();

    const health = pollingService.getHealth();
    console.log('System Health:');
    console.log(`  Status: ${health.status.toUpperCase()}`);
    console.log(`  Success Rate: ${health.successRate}%`);
    console.log(`  Error Count: ${health.errorCount}`);
    console.log();

    const cacheStats = cacheService.getStats();
    console.log('Cache Statistics:');
    console.log(`  Size: ${cacheStats.size} / ${cacheStats.maxSize}`);
    console.log(`  TTL: ${cacheStats.ttl}ms`);
    console.log(`  Total Hits: ${cacheStats.totalHits}`);
    console.log(`  Persist to Disk: ${cacheStats.persistToDisk}`);
    console.log();

    // Show sample alerts
    if (alertSummary.recent.length > 0) {
      console.log('Recent Alerts:');
      console.log('-'.repeat(70));
      alertSummary.recent.slice(0, 5).forEach((alert, index) => {
        console.log(`${index + 1}. [${alert.severity}] ${alert.ruleName}`);
        console.log(`   ${alert.message}`);
        console.log(`   Job ID: ${alert.jobId}`);
        console.log();
      });
    }

    // Save test results
    const fs = require('fs');
    fs.writeFileSync(
      'tests/polling-test-results.json',
      JSON.stringify({
        stats,
        health,
        alertSummary,
        cacheStats,
        totalChanges,
        timestamp: new Date().toISOString()
      }, null, 2)
    );

    console.log('✓ Test results saved to: tests/polling-test-results.json');
    console.log();

    console.log('='.repeat(70));
    console.log('✓ Polling System Test Complete!');
    console.log('='.repeat(70));
    console.log();

    // Cleanup
    cacheService.close();

  } catch (error) {
    console.error('Error during test:', error);
    await pollingService.stop();
    cacheService.close();
    process.exit(1);
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\nTest interrupted by user');
  process.exit(0);
});

testPollingSystem();


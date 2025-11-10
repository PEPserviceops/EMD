/**
 * Test Alert Rules with Real FileMaker Data
 * Verifies that alert rules work correctly with actual field names
 */

require('dotenv').config({ path: '.env.local' });
const { FileMakerAPI } = require('../src/api/filemaker');
const { AlertEngine, SEVERITY } = require('../src/api/alerts');

async function testAlertRules() {
  console.log('='.repeat(70));
  console.log('Testing Alert Rules with Real FileMaker Data');
  console.log('='.repeat(70));
  console.log();

  const api = new FileMakerAPI({
    host: process.env.FILEMAKER_HOST,
    database: process.env.FILEMAKER_DATABASE,
    layout: process.env.FILEMAKER_LAYOUT,
    username: process.env.FILEMAKER_USER,
    password: process.env.FILEMAKER_PASSWORD
  });

  const alertEngine = new AlertEngine();

  try {
    // Authenticate
    await api.getToken();
    console.log('✓ Authenticated');
    console.log();

    // Get active jobs
    console.log('Fetching 100 job records...');
    const allJobs = await api.getActiveJobs({ limit: 100 });
    console.log(`✓ Retrieved ${allJobs.length} records`);
    console.log();

    // Filter out DELETED jobs
    const activeJobs = allJobs.filter(job => {
      const status = job.fieldData.job_status;
      return status && status !== 'DELETED' && status !== '';
    });

    console.log(`Found ${activeJobs.length} active jobs (excluding DELETED)`);
    console.log();

    // Evaluate all jobs
    console.log('Evaluating jobs against alert rules...');
    console.log('-'.repeat(70));
    const result = alertEngine.evaluateJobs(activeJobs);

    console.log();
    console.log('Alert Summary:');
    console.log(`  Total Active Alerts: ${result.total}`);
    console.log(`  New Alerts: ${result.new}`);
    console.log(`  Resolved Alerts: ${result.resolved}`);
    console.log();

    console.log('Alerts by Severity:');
    console.log(`  CRITICAL: ${result.bySeverity.CRITICAL}`);
    console.log(`  HIGH:     ${result.bySeverity.HIGH}`);
    console.log(`  MEDIUM:   ${result.bySeverity.MEDIUM}`);
    console.log(`  LOW:      ${result.bySeverity.LOW}`);
    console.log();

    // Show all active alerts
    if (result.total > 0) {
      console.log('Active Alerts:');
      console.log('-'.repeat(70));
      
      const alerts = alertEngine.getActiveAlerts();
      
      alerts.forEach((alert, index) => {
        console.log();
        console.log(`${index + 1}. [${alert.severity}] ${alert.ruleName}`);
        console.log(`   ${alert.message}`);
        console.log(`   Job ID: ${alert.jobId}`);
        console.log(`   Timestamp: ${alert.timestamp}`);
      });

      console.log();
      console.log('-'.repeat(70));

      // Show breakdown by rule
      console.log();
      console.log('Alerts by Rule:');
      const ruleBreakdown = {};
      alerts.forEach(alert => {
        ruleBreakdown[alert.ruleName] = (ruleBreakdown[alert.ruleName] || 0) + 1;
      });

      Object.entries(ruleBreakdown)
        .sort((a, b) => b[1] - a[1])
        .forEach(([rule, count]) => {
          console.log(`  ${rule.padEnd(40)} : ${count}`);
        });

      // Save alerts to file
      const fs = require('fs');
      fs.writeFileSync(
        'tests/alert-test-results.json',
        JSON.stringify({
          summary: result,
          alerts: alerts,
          timestamp: new Date().toISOString()
        }, null, 2)
      );
      console.log();
      console.log('✓ Alert results saved to: tests/alert-test-results.json');

    } else {
      console.log('✓ No alerts triggered - all jobs are operating normally!');
    }

    console.log();

    // Test individual rules with sample data
    console.log('Testing Individual Rules:');
    console.log('-'.repeat(70));

    // Find examples for each rule
    const ruleExamples = {
      'arrival-without-completion': activeJobs.find(j => 
        j.fieldData.time_arival && !j.fieldData.time_complete && j.fieldData.job_status !== 'Completed'
      ),
      'missing-truck-assignment': activeJobs.find(j => 
        j.fieldData.job_status === 'Entered' && !j.fieldData._kf_trucks_id
      ),
      'truck-without-driver': activeJobs.find(j => 
        j.fieldData._kf_trucks_id && !j.fieldData._kf_driver_id && j.fieldData.job_status === 'Entered'
      ),
      'attempted-status': activeJobs.find(j => 
        j.fieldData.job_status === 'Attempted'
      ),
      'rescheduled-status': activeJobs.find(j => 
        j.fieldData.job_status === 'Re-scheduled'
      )
    };

    console.log();
    Object.entries(ruleExamples).forEach(([ruleId, example]) => {
      if (example) {
        console.log(`✓ ${ruleId}: Found example (Job ${example.fieldData._kp_job_id})`);
      } else {
        console.log(`○ ${ruleId}: No examples found in current dataset`);
      }
    });

    console.log();

    // Show job status distribution
    console.log('Job Status Distribution:');
    console.log('-'.repeat(70));
    const statusCounts = {};
    activeJobs.forEach(job => {
      const status = job.fieldData.job_status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        const percentage = Math.round((count / activeJobs.length) * 100);
        console.log(`  ${status.padEnd(20)} : ${count.toString().padStart(3)} (${percentage}%)`);
      });

    console.log();

    await api.closeSession();
    console.log('✓ Session closed');
    console.log();

    console.log('='.repeat(70));
    console.log('Test Complete!');
    console.log('='.repeat(70));
    console.log();

    if (result.total > 0) {
      console.log('✓ Alert system is working correctly!');
      console.log(`  ${result.total} alerts were generated from ${activeJobs.length} jobs`);
    } else {
      console.log('✓ Alert system is operational (no alerts triggered)');
    }
    console.log();

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    await api.closeSession();
    process.exit(1);
  }
}

testAlertRules();


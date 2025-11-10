/**
 * Test Supabase Connection
 * 
 * This script tests the Supabase connection and verifies that:
 * 1. Environment variables are configured
 * 2. Connection to Supabase is successful
 * 3. Database tables exist
 * 4. Can insert and query data
 */

require('dotenv').config({ path: '.env.local' });
const supabaseService = require('../src/services/SupabaseService');

async function testConnection() {
  console.log('='.repeat(70));
  console.log('Testing Supabase Connection');
  console.log('='.repeat(70));
  console.log();

  // Test 1: Check if Supabase is configured
  console.log('Test 1: Checking configuration...');
  if (!supabaseService.isEnabled()) {
    console.error('❌ FAILED: Supabase is not configured');
    console.error('   Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set in .env.local');
    process.exit(1);
  }
  console.log('✅ PASSED: Supabase is configured');
  console.log();

  // Test 2: Store a system metric
  console.log('Test 2: Testing database write...');
  const testMetric = {
    type: 'test',
    name: 'connection_test',
    value: 1,
    unit: 'boolean',
    component: 'setup',
    metadata: {
      test_run: new Date().toISOString(),
      purpose: 'connection_verification'
    }
  };

  const insertResult = await supabaseService.storeSystemMetric(testMetric);
  if (!insertResult) {
    console.error('❌ FAILED: Could not insert test metric');
    console.error('   This usually means:');
    console.error('   - The database migration has not been run');
    console.error('   - The tables do not exist');
    console.error('   - There is a connection issue');
    console.error();
    console.error('   Run the migration first: node scripts/run-supabase-migration.js');
    process.exit(1);
  }
  console.log('✅ PASSED: Successfully inserted test metric');
  console.log('   Metric ID:', insertResult.id);
  console.log();

  // Test 3: Store a job snapshot
  console.log('Test 3: Testing job snapshot storage...');
  const testJob = {
    recordId: 'TEST-001',
    modId: '1',
    fieldData: {
      _kp_job_id: '999999',
      job_date: '11/10/2025',
      job_status: 'Test',
      job_type: 'Test Delivery',
      _kf_trucks_id: 'TEST-TRUCK',
      address_C1: '123 Test Street',
      Customer_C1: 'Test Customer'
    }
  };

  const jobResult = await supabaseService.storeJobSnapshot(testJob);
  if (!jobResult) {
    console.error('❌ FAILED: Could not insert test job snapshot');
    process.exit(1);
  }
  console.log('✅ PASSED: Successfully inserted job snapshot');
  console.log('   Job ID:', jobResult.job_id);
  console.log();

  // Test 4: Store an alert
  console.log('Test 4: Testing alert storage...');
  const testAlert = {
    id: 'test-alert-' + Date.now(),
    ruleId: 'test-rule',
    ruleName: 'Test Alert Rule',
    severity: 'LOW',
    title: 'Test Alert',
    message: 'This is a test alert for connection verification',
    jobId: '999999',
    jobStatus: 'Test',
    timestamp: new Date().toISOString()
  };

  const alertResult = await supabaseService.storeAlert(testAlert);
  if (!alertResult) {
    console.error('❌ FAILED: Could not insert test alert');
    process.exit(1);
  }
  console.log('✅ PASSED: Successfully inserted alert');
  console.log('   Alert ID:', alertResult.alert_id);
  console.log();

  // Test 5: Query job history
  console.log('Test 5: Testing data retrieval...');
  const jobHistory = await supabaseService.getJobHistory('999999', 10);
  if (!jobHistory || jobHistory.length === 0) {
    console.error('❌ FAILED: Could not retrieve job history');
    process.exit(1);
  }
  console.log('✅ PASSED: Successfully retrieved job history');
  console.log('   Records found:', jobHistory.length);
  console.log();

  // Test 6: Store efficiency metrics
  console.log('Test 6: Testing efficiency metrics storage...');
  const testEfficiency = {
    truck_id: 'TEST-TRUCK',
    date: '11/10/2025',
    total_miles: 100.5,
    optimal_miles: 85.0,
    excess_miles: 15.5,
    excess_percentage: 18.2,
    efficiency_grade: 'B',
    efficiency_score: 82.5,
    total_jobs: 10,
    completed_jobs: 9,
    on_time_jobs: 8,
    late_jobs: 1
  };

  const efficiencyResult = await supabaseService.storeEfficiencyMetrics(testEfficiency);
  if (!efficiencyResult) {
    console.error('❌ FAILED: Could not insert efficiency metrics');
    process.exit(1);
  }
  console.log('✅ PASSED: Successfully inserted efficiency metrics');
  console.log('   Truck ID:', efficiencyResult.truck_id);
  console.log('   Efficiency Grade:', efficiencyResult.efficiency_grade);
  console.log();

  // Test 7: Store profitability metrics
  console.log('Test 7: Testing profitability metrics storage...');
  const testProfitability = {
    truck_id: 'TEST-TRUCK',
    date: '11/10/2025',
    aggregation_level: 'daily',
    total_revenue: 1500.00,
    fuel_cost: 120.00,
    labor_cost: 350.00,
    vehicle_cost: 80.00,
    overhead_cost: 150.00,
    job_count: 10,
    miles_driven: 100.5
  };

  const profitabilityResult = await supabaseService.storeProfitabilityMetrics(testProfitability);
  if (!profitabilityResult) {
    console.error('❌ FAILED: Could not insert profitability metrics');
    process.exit(1);
  }
  console.log('✅ PASSED: Successfully inserted profitability metrics');
  console.log('   Truck ID:', profitabilityResult.truck_id);
  console.log('   Gross Profit:', profitabilityResult.gross_profit);
  console.log('   Profit Margin:', profitabilityResult.profit_margin + '%');
  console.log();

  // Summary
  console.log('='.repeat(70));
  console.log('✅ ALL TESTS PASSED!');
  console.log('='.repeat(70));
  console.log();
  console.log('Your Supabase database is properly configured and working.');
  console.log();
  console.log('Next steps:');
  console.log('1. View your data in Supabase dashboard:');
  console.log('   https://app.supabase.com/project/dqmbnodnhxowaatprnjj/editor');
  console.log();
  console.log('2. Integrate with your application:');
  console.log('   - Update PollingService to store job snapshots');
  console.log('   - Update AlertEngine to store alerts');
  console.log('   - Create analytics endpoints to query historical data');
  console.log();
  console.log('3. Clean up test data (optional):');
  console.log('   - Go to Table Editor in Supabase');
  console.log('   - Delete rows where job_id = "999999" or truck_id = "TEST-TRUCK"');
  console.log();
}

// Run the tests
testConnection().catch(error => {
  console.error();
  console.error('='.repeat(70));
  console.error('❌ TEST FAILED WITH ERROR');
  console.error('='.repeat(70));
  console.error();
  console.error('Error:', error.message);
  console.error();
  console.error('Stack trace:');
  console.error(error.stack);
  console.error();
  process.exit(1);
});


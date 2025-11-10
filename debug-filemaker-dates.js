/**
 * FileMaker Date Issue Diagnostic Script
 * Comprehensive troubleshooting for date-related data retrieval problems
 */

require('dotenv').config({ path: '.env.local' });
const { FileMakerAPI } = require('./src/api/filemaker');

async function runDiagnostics() {
  console.log('='.repeat(80));
  console.log('FileMaker Date Issue Diagnostic Report');
  console.log('='.repeat(80));
  console.log('Current Time:', new Date().toISOString());
  console.log('Expected Dates: November 2025 (Current)');
  console.log('Actual Dates: 2019 (Outdated)');
  console.log();

  const api = new FileMakerAPI({
    host: process.env.FILEMAKER_HOST,
    database: process.env.FILEMAKER_DATABASE,
    layout: process.env.FILEMAKER_LAYOUT || 'jobs_api',
    username: process.env.FILEMAKER_USER,
    password: process.env.FILEMAKER_PASSWORD
  });

  try {
    // Test 1: Basic Connection
    console.log('🔍 TEST 1: Basic FileMaker API Connection');
    console.log('-'.repeat(60));
    try {
      const token = await api.getToken();
      console.log('✅ Authentication: SUCCESS');
      console.log(`   Token acquired: ${token ? 'Yes' : 'No'}`);
    } catch (error) {
      console.log('❌ Authentication: FAILED');
      console.log(`   Error: ${error.message}`);
      console.log('   💡 SOLUTION: Check FileMaker server status and credentials');
      return;
    }

    // Test 2: Get Raw Records (No Filtering)
    console.log('\n🔍 TEST 2: Raw Record Retrieval (No Date Filters)');
    console.log('-'.repeat(60));
    try {
      const rawJobs = await api.getActiveJobs({ limit: 10 });
      console.log(`✅ Retrieved ${rawJobs.length} records`);
      
      if (rawJobs.length > 0) {
        const job = rawJobs[0];
        const jobDate = job.fieldData?.job_date;
        console.log(`   Sample job date: ${jobDate}`);
        console.log(`   Job ID: ${job.fieldData?._kp_job_id}`);
        console.log(`   Status: ${job.fieldData?.job_status}`);
        
        // Analyze date patterns
        const allDates = rawJobs
          .map(job => job.fieldData?.job_date)
          .filter(date => date)
          .slice(0, 10);
        
        console.log(`   Sample dates: ${allDates.join(', ')}`);
        
        if (allDates.every(date => date?.includes('2019'))) {
          console.log('   🚨 PROBLEM IDENTIFIED: All sample dates are from 2019');
        }
      }
    } catch (error) {
      console.log('❌ Raw Record Retrieval: FAILED');
      console.log(`   Error: ${error.message}`);
    }

    // Test 3: Date Range Queries
    console.log('\n🔍 TEST 3: Date Range Filtering');
    console.log('-'.repeat(60));
    
    // Test recent dates
    const recentQueries = [
      { name: 'Current Month (November 2025)', date: '11/10/2025' },
      { name: 'Current Year (2025)', date: '2025' },
      { name: 'Last 30 Days', date: '10/11/2025' }
    ];
    
    for (const query of recentQueries) {
      try {
        let results = [];
        if (query.date.includes('/')) {
          // Specific date query
          results = await api.findJobs([{ job_date: query.date }]);
        } else {
          // Year query
          results = await api.findJobs([{ job_date: query.date }]);
        }
        console.log(`✅ ${query.name}: ${results.length} results`);
        if (results.length > 0) {
          const sampleDate = results[0].fieldData?.job_date;
          console.log(`   Sample: ${sampleDate}`);
        }
      } catch (error) {
        console.log(`❌ ${query.name}: FAILED - ${error.message}`);
      }
    }

    // Test 4: Sorting Analysis
    console.log('\n🔍 TEST 4: Record Sorting Analysis');
    console.log('-'.repeat(60));
    try {
      const sortedJobs = await api.getActiveJobs({ limit: 20 });
      if (sortedJobs.length > 0) {
        const jobsWithDates = sortedJobs
          .filter(job => job.fieldData?.job_date)
          .map(job => ({
            id: job.fieldData._kp_job_id,
            date: job.fieldData.job_date,
            status: job.fieldData.job_status
          }));
        
        console.log('📊 Date Distribution Analysis:');
        const yearCount = {};
        jobsWithDates.forEach(job => {
          const year = job.date.split('/').pop();
          yearCount[year] = (yearCount[year] || 0) + 1;
        });
        
        Object.entries(yearCount).forEach(([year, count]) => {
          const percentage = Math.round((count / jobsWithDates.length) * 100);
          console.log(`   ${year}: ${count} records (${percentage}%)`);
        });
        
        if (yearCount['2019'] && yearCount['2019'] > yearCount['2025']) {
          console.log('   🚨 PROBLEM: 2019 records outnumber 2025 records');
          console.log('   💡 CAUSE: FileMaker layout is sorted by oldest first');
        }
      }
    } catch (error) {
      console.log(`❌ Sorting Analysis: FAILED - ${error.message}`);
    }

    // Test 5: Caching Analysis
    console.log('\n🔍 TEST 5: Caching Analysis');
    console.log('-'.repeat(60));
    try {
      const OnDemandDataService = require('./src/services/OnDemandDataService');
      const service = new OnDemandDataService();
      
      console.log(`   Cache TTL: ${service.config.cacheTTL}ms (${service.config.cacheTTL/1000} seconds)`);
      console.log(`   Cache Valid: ${service.isCacheValid()}`);
      
      if (service.isCacheValid()) {
        console.log('   🚨 POTENTIAL ISSUE: Cache may be serving stale data');
        console.log('   💡 SOLUTION: Clear cache or reduce cache TTL');
      } else {
        console.log('   ✅ Cache: Fresh data should be retrieved');
      }
    } catch (error) {
      console.log(`❌ Caching Analysis: FAILED - ${error.message}`);
    }

    // Generate Solutions Report
    console.log('\n' + '='.repeat(80));
    console.log('💡 RECOMMENDED SOLUTIONS');
    console.log('='.repeat(80));

    console.log('\n1. 🔧 IMMEDIATE FIXES:');
    console.log('   • Add date filtering to queries (get jobs from last 30 days)');
    console.log('   • Sort results by job_date DESC (newest first)');
    console.log('   • Reduce cache TTL to 10-15 seconds');
    console.log('   • Increase batch size to 200-500 records');

    console.log('\n2. 🛠️ CODE UPDATES NEEDED:');
    console.log('   • Update getActiveJobs() to accept date filters');
    console.log('   • Add order parameter for sorting');
    console.log('   • Implement date range queries');
    console.log('   • Add cache invalidation on data changes');

    console.log('\n3. 🔍 FileMaker SERVER ISSUES:');
    console.log('   • Check FileMaker server logs for 500 errors');
    console.log('   • Verify jobs_api layout configuration');
    console.log('   • Check database indexes on job_date field');
    console.log('   • Consider layout script triggers for sorting');

    console.log('\n4. 📊 MONITORING:');
    console.log('   • Add date range validation in data processing');
    console.log('   • Implement data freshness checks');
    console.log('   • Log data retrieval timestamps and sources');

    await api.closeSession();

  } catch (error) {
    console.log('\n❌ DIAGNOSTIC FAILED:', error.message);
    console.log('\nThis suggests a more fundamental issue with the FileMaker API connection.');
    console.log('Check:');
    console.log('• FileMaker server is running and accessible');
    console.log('• Database permissions and layout access');
    console.log('• Network connectivity to modd.mainspringhost.com');
  }
}

// Run the diagnostic
runDiagnostics().catch(console.error);
/**
 * Test job type filtering - should only return Delivery, Pickup, Move, Recover, Drop, Shuttle
 */

const { FileMakerAPI } = require('./src/api/filemaker');

async function testJobTypeFiltering() {
  console.log('Testing job type filtering...');
  console.log('Should only return: Delivery, Pickup, Move, Recover, Drop, Shuttle');
  console.log('='.repeat(70));

  const api = new FileMakerAPI({
    host: 'modd.mainspringhost.com',
    database: 'PEP2_1',
    username: 'trevor_api',
    password: 'XcScS2yRoTtMo7'
  });

  try {
    // Test with a simple query first - just get recent jobs and see if filtering works
    console.log('Testing with recent jobs (last 30 days)...');

    const jobs = await api.getActiveJobs({
      limit: 50
    });

    console.log(`\nFound ${jobs.length} jobs with filtered job types`);

    if (jobs.length > 0) {
      // Analyze job types
      const jobTypeCounts = {};
      const allowedTypes = ['Delivery', 'Pickup', 'Move', 'Recover', 'Drop', 'Shuttle'];

      jobs.forEach(job => {
        const jobType = job.fieldData?.job_type || 'Unknown';
        jobTypeCounts[jobType] = (jobTypeCounts[jobType] || 0) + 1;
      });

      console.log('\nJob Type Analysis:');
      console.log('==================');

      let allTypesAllowed = true;
      Object.entries(jobTypeCounts).forEach(([type, count]) => {
        const isAllowed = allowedTypes.includes(type);
        const status = isAllowed ? '✅' : '❌';
        console.log(`${status} ${type}: ${count} jobs`);

        if (!isAllowed) {
          allTypesAllowed = false;
        }
      });

      console.log('\nFiltering Status:');
      console.log('=================');
      if (allTypesAllowed) {
        console.log('✅ SUCCESS: All returned jobs have allowed job types');
      } else {
        console.log('❌ FAILURE: Some jobs have disallowed job types');
      }

      // Show sample jobs
      console.log('\nSample Filtered Jobs:');
      console.log('=====================');

      jobs.slice(0, 10).forEach((job, index) => {
        const data = job.fieldData;
        console.log(`${index + 1}. ID: ${data._kp_job_id} | Type: ${data.job_type} | Status: ${data.job_status} | Customer: ${data.Customer_C1 || 'N/A'}`);
      });

      if (jobs.length > 10) {
        console.log(`... and ${jobs.length - 10} more jobs`);
      }

    } else {
      console.log('No jobs found for today with the filtered job types');
    }

    await api.closeSession();

    const jobTypeCounts = {};
    jobs.forEach(job => {
      const jobType = job.fieldData?.job_type || 'Unknown';
      jobTypeCounts[jobType] = (jobTypeCounts[jobType] || 0) + 1;
    });

    return {
      success: true,
      jobCount: jobs.length,
      jobTypes: Object.keys(jobTypeCounts)
    };

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testJobTypeFiltering().then(result => {
  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));
  if (result.success) {
    console.log(`✅ Job type filtering test completed`);
    console.log(`📊 Jobs found: ${result.jobCount}`);
    console.log(`🔧 Job types: ${result.jobTypes.join(', ')}`);
  } else {
    console.log(`❌ Test failed: ${result.error}`);
  }
});

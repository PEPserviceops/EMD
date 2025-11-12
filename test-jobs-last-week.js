/**
 * Test script to fetch jobs from the last week (11/4/25 - 11/11/25)
 */

const { FileMakerAPI } = require('./src/api/filemaker');

async function testJobsLastWeek() {
  console.log('Fetching jobs from last week (11/4/25 - 11/11/25)...');
  console.log('==================================================');

  const api = new FileMakerAPI({
    host: 'modd.mainspringhost.com',
    database: 'PEP2_1',
    username: 'trevor_api',
    password: 'XcScS2yRoTtMo7'
  });

  try {
    // Fetch jobs from November 4, 2025 to November 11, 2025
    const jobs = await api.getActiveJobs({
      startDate: '11/4/2025',
      endDate: '11/11/2025',
      limit: 500 // Increased limit to get more jobs
    });

    console.log(`✅ SUCCESS: Retrieved ${jobs.length} jobs from the date range`);
    console.log();

    if (jobs.length > 0) {
      console.log('All Job Numbers:');
      console.log('================');
      jobs.forEach((job, index) => {
        const jobId = job.fieldData._kp_job_id;
        console.log(`${index + 1}. ${jobId}`);
      });
      console.log();

      console.log('Sample of first 5 jobs (detailed):');
      console.log('===================================');

      jobs.slice(0, 5).forEach((job, index) => {
        const data = job.fieldData;
        console.log(`${index + 1}. Job ID: ${data._kp_job_id}`);
        console.log(`   Date: ${data.job_date}`);
        console.log(`   Status: ${data.job_status}`);
        console.log(`   Type: ${data.job_type}`);
        console.log(`   Customer: ${data.Customer_C1 || 'N/A'}`);
        console.log(`   Address: ${data.address_C1 || 'N/A'}`);
        console.log(`   Driver: ${data._kf_driver_id || 'N/A'}`);
        console.log();
      });

      // Group by status
      const statusCounts = jobs.reduce((acc, job) => {
        const status = job.fieldData.job_status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      console.log('Job status summary:');
      console.log('===================');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`${status}: ${count} jobs`);
      });

      // Group by type
      const typeCounts = jobs.reduce((acc, job) => {
        const type = job.fieldData.job_type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      console.log();
      console.log('Job type summary:');
      console.log('=================');
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`${type}: ${count} jobs`);
      });

    } else {
      console.log('No jobs found in the specified date range.');
    }

    await api.closeSession();
    return jobs;

  } catch (error) {
    console.log('❌ FAILED: Error fetching jobs');
    console.log('Error:', error.message);

    if (error.response) {
      console.log('HTTP Status:', error.response.status);
      console.log('Response data:', error.response.data);
    }

    return [];
  }
}

// Run the test
testJobsLastWeek().then(jobs => {
  console.log();
  console.log('=====================================');
  console.log(`Total jobs retrieved: ${jobs.length}`);
  process.exit(jobs.length > 0 ? 0 : 1);
});

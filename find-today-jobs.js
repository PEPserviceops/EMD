/**
 * Find all jobs scheduled for today (11/12/2025)
 */

const axios = require('axios');

async function findTodayJobs() {
  console.log('Finding all jobs scheduled for today (11/12/2025)...');
  console.log('====================================================');

  try {
    // Authenticate
    const authResponse = await axios.post(
      'https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1/sessions',
      {},
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from('trevor_api:XcScS2yRoTtMo7').toString('base64'),
          'Content-Type': 'application/json',
          'User-Agent': 'FileMakerDataAPI/1.0',
          'Origin': 'MODD',
          'Referer': 'https://modd.mainspringhost.com/'
        },
        timeout: 15000
      }
    );

    const token = authResponse.data.response.token;
    console.log('✅ Authentication successful');

    // Query for today's jobs
    console.log('\nQuerying for jobs scheduled today: 11/12/2025');

    const response = await axios.post(
      'https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1/layouts/jobs_api/_find',
      {
        query: [{
          'job_date': '11/12/2025'
        }],
        limit: 200 // Get up to 200 jobs for today
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const jobs = response.data?.response?.data || [];
    console.log(`\n🎯 FOUND ${jobs.length} jobs scheduled for today (11/12/2025)`);

    if (jobs.length > 0) {
      console.log('\n📋 Today\'s Jobs:');
      console.log('================');

      // Group by status for better organization
      const jobsByStatus = {};
      jobs.forEach(job => {
        const status = job.fieldData?.job_status || 'Unknown';
        if (!jobsByStatus[status]) {
          jobsByStatus[status] = [];
        }
        jobsByStatus[status].push(job);
      });

      // Display jobs grouped by status
      Object.keys(jobsByStatus).forEach(status => {
        const statusJobs = jobsByStatus[status];
        console.log(`\n📊 ${status} Jobs (${statusJobs.length}):`);
        console.log('-'.repeat(40));

        statusJobs.forEach((job, index) => {
          const data = job.fieldData;
          console.log(`${index + 1}. ID: ${data._kp_job_id}`);
          console.log(`   Type: ${data.job_type}`);
          console.log(`   Customer: ${data.Customer_C1 || 'N/A'}`);
          console.log(`   Time: ${data.time_arival || 'N/A'}`);
          if (data._kf_driver_id) {
            console.log(`   Driver: ${data._kf_driver_id}`);
          }
          if (data.address_C1) {
            console.log(`   Address: ${data.address_C1}`);
          }
          console.log();
        });
      });

      // Summary statistics
      console.log('\n📊 Today\'s Jobs Summary:');
      console.log('========================');

      const statusCounts = {};
      const typeCounts = {};

      jobs.forEach(job => {
        const status = job.fieldData?.job_status || 'Unknown';
        const type = job.fieldData?.job_type || 'Unknown';

        statusCounts[status] = (statusCounts[status] || 0) + 1;
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      console.log('By Status:');
      Object.entries(statusCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([status, count]) => {
          console.log(`  ${status}: ${count} jobs`);
        });

      console.log('\nBy Type:');
      Object.entries(typeCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`  ${type}: ${count} jobs`);
        });

      console.log(`\n✅ SUCCESS: Retrieved ${jobs.length} jobs scheduled for today`);

    } else {
      console.log('❌ No jobs found scheduled for today');
    }

    // Close session
    await axios.delete(
      `https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1/sessions/${token}`
    );
    console.log('\nSession closed');

  } catch (error) {
    console.log('❌ Search failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

// Run the search
findTodayJobs();

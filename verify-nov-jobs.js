/**
 * Verify we can retrieve jobs from November 4-11, 2025
 */

const axios = require('axios');

async function verifyNovJobs() {
  console.log('Verifying jobs from November 4-11, 2025...');
  console.log('===========================================');

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

    // Query for November 4-11, 2025
    console.log('\nQuerying for jobs: November 4-11, 2025');
    console.log('Date range: 11/4/2025...11/11/2025');

    const response = await axios.post(
      'https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1/layouts/jobs_api/_find',
      {
        query: [{
          'job_date': '11/4/2025...11/11/2025'
        }],
        limit: 10 // Same as working test
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
    console.log(`\n🎯 FOUND ${jobs.length} jobs in November 4-11, 2025 date range`);

    if (jobs.length > 0) {
      console.log('\n📋 Jobs by date:');
      console.log('================');

      // Group jobs by date
      const jobsByDate = {};
      jobs.forEach(job => {
        const date = job.fieldData?.job_date;
        if (date) {
          if (!jobsByDate[date]) {
            jobsByDate[date] = [];
          }
          jobsByDate[date].push(job);
        }
      });

      // Sort dates and display
      Object.keys(jobsByDate)
        .sort()
        .forEach(date => {
          const dayJobs = jobsByDate[date];
          console.log(`\n📅 ${date} (${dayJobs.length} jobs):`);

          dayJobs.forEach((job, index) => {
            const data = job.fieldData;
            console.log(`   ${index + 1}. ID: ${data._kp_job_id}`);
            console.log(`      Status: ${data.job_status}`);
            console.log(`      Type: ${data.job_type}`);
            console.log(`      Customer: ${data.Customer_C1 || 'N/A'}`);
            if (data._kf_driver_id) {
              console.log(`      Driver: ${data._kf_driver_id}`);
            }
            console.log();
          });
        });

      // Summary statistics
      console.log('\n📊 Summary Statistics:');
      console.log('======================');

      const statusCounts = {};
      const typeCounts = {};

      jobs.forEach(job => {
        const status = job.fieldData?.job_status || 'Unknown';
        const type = job.fieldData?.job_type || 'Unknown';

        statusCounts[status] = (statusCounts[status] || 0) + 1;
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      console.log('Status breakdown:');
      Object.entries(statusCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([status, count]) => {
          console.log(`  ${status}: ${count} jobs`);
        });

      console.log('\nJob type breakdown:');
      Object.entries(typeCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`  ${type}: ${count} jobs`);
        });

      console.log(`\n✅ SUCCESS: Retrieved ${jobs.length} current jobs from November 4-11, 2025`);

    } else {
      console.log('❌ No jobs found in the specified date range');
    }

    // Close session
    await axios.delete(
      `https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1/sessions/${token}`
    );
    console.log('\nSession closed');

  } catch (error) {
    console.log('❌ Verification failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

// Run the verification
verifyNovJobs();

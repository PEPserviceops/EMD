/**
 * Test to find current jobs in the jobs_api layout
 */

const axios = require('axios');

async function testCurrentJobs() {
  console.log('Testing for current jobs in jobs_api layout...');
  console.log('===============================================');

  try {
    // Authenticate
    console.log('Authenticating...');
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

    // Test different date queries
    const dateQueries = [
      { name: 'November 2025', query: { job_date: '11/2025' } },
      { name: 'November 4-11 2025', query: { job_date: '11/4/2025...11/11/2025' } },
      { name: 'Last 30 days', query: { job_date: '10/13/2025...11/12/2025' } },
      { name: 'Today', query: { job_date: '11/12/2025' } },
      { name: 'Yesterday', query: { job_date: '11/11/2025' } },
      { name: 'This week', query: { job_date: '11/6/2025...11/12/2025' } }
    ];

    console.log('\nTesting date range queries...');
    for (const test of dateQueries) {
      try {
        console.log(`\nTesting: ${test.name}`);
        console.log(`Query: ${JSON.stringify(test.query)}`);

        const response = await axios.post(
          'https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1/layouts/jobs_api/_find',
          {
            query: [test.query],
            limit: 10
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );

        const count = response.data?.response?.data?.length || 0;
        console.log(`✅ Results: ${count} jobs found`);

        if (count > 0) {
          console.log('Sample jobs:');
          response.data.response.data.slice(0, 3).forEach((job, i) => {
            const data = job.fieldData;
            console.log(`  ${i+1}. ID: ${data._kp_job_id}, Date: ${data.job_date}, Status: ${data.job_status}`);
          });
        }

      } catch (error) {
        console.log(`❌ Failed: ${error.response?.status} ${error.response?.statusText}`);
        if (error.response?.data?.messages) {
          console.log(`   Error: ${error.response.data.messages[0]?.message}`);
        }
      }
    }

    // Test raw records to see date distribution
    console.log('\n\nAnalyzing date distribution in jobs_api...');
    try {
      const recordsResponse = await axios.get(
        'https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1/layouts/jobs_api/records',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: {
            _limit: 100,
            _offset: 1
          },
          timeout: 15000
        }
      );

      const jobs = recordsResponse.data?.response?.data || [];
      console.log(`Retrieved ${jobs.length} recent jobs for analysis`);

      // Analyze dates
      const dateCounts = {};
      jobs.forEach(job => {
        const date = job.fieldData?.job_date;
        if (date) {
          const year = date.split('/')[2];
          dateCounts[year] = (dateCounts[year] || 0) + 1;
        }
      });

      console.log('\nDate distribution in recent 100 jobs:');
      Object.entries(dateCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([year, count]) => {
          console.log(`  ${year}: ${count} jobs`);
        });

      // Check for current year
      const currentYear = new Date().getFullYear().toString();
      if (dateCounts[currentYear]) {
        console.log(`\n🎯 FOUND CURRENT JOBS: ${dateCounts[currentYear]} jobs from ${currentYear}!`);
      } else {
        console.log(`\n❌ NO CURRENT JOBS: No ${currentYear} jobs in recent 100 records`);
      }

    } catch (error) {
      console.log(`❌ Failed to get records: ${error.response?.status}`);
    }

    // Close session
    await axios.delete(
      `https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1/sessions/${token}`
    );
    console.log('\nSession closed');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
testCurrentJobs();

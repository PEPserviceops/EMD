/**
 * Count total jobs in all states/statuses
 */

const axios = require('axios');

async function countAllJobs() {
  console.log('Counting total jobs in all states...');
  console.log('====================================');

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

    // Get total count from records endpoint (more efficient than fetching all data)
    console.log('\nGetting total job count...');

    const recordsResponse = await axios.get(
      'https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1/layouts/jobs_api/records',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          _limit: 1 // Just get metadata, not actual records
        },
        timeout: 15000
      }
    );

    const totalCount = recordsResponse.data?.response?.dataInfo?.foundCount || 0;
    console.log(`📊 TOTAL JOBS: ${totalCount.toLocaleString()}`);

    // Sample a subset to analyze status distribution
    console.log('\nAnalyzing status distribution (sampling 1000 recent jobs)...');

    const sampleResponse = await axios.get(
      'https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1/layouts/jobs_api/records',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          _limit: 1000,
          _offset: 1
        },
        timeout: 30000
      }
    );

    const jobs = sampleResponse.data?.response?.data || [];
    console.log(`Sampled ${jobs.length} jobs for analysis`);

    // Analyze status distribution
    const statusCounts = {};
    const yearCounts = {};
    const typeCounts = {};

    jobs.forEach(job => {
      const status = job.fieldData?.job_status || 'Unknown';
      const type = job.fieldData?.job_type || 'Unknown';
      const date = job.fieldData?.job_date;

      statusCounts[status] = (statusCounts[status] || 0) + 1;
      typeCounts[type] = (typeCounts[type] || 0) + 1;

      if (date) {
        const year = date.split('/')[2];
        if (year) {
          yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
      }
    });

    console.log('\n📈 Status Distribution:');
    console.log('=======================');
    Object.entries(statusCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([status, count]) => {
        const percentage = ((count / jobs.length) * 100).toFixed(1);
        console.log(`  ${status}: ${count} jobs (${percentage}%)`);
      });

    console.log('\n📅 Year Distribution:');
    console.log('=====================');
    Object.entries(yearCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([year, count]) => {
        const percentage = ((count / jobs.length) * 100).toFixed(1);
        console.log(`  ${year}: ${count} jobs (${percentage}%)`);
      });

    console.log('\n🔧 Job Type Distribution:');
    console.log('=========================');
    Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        const percentage = ((count / jobs.length) * 100).toFixed(1);
        console.log(`  ${type}: ${count} jobs (${percentage}%)`);
      });

    // Calculate estimated current jobs
    const currentYear = new Date().getFullYear().toString();
    const currentJobsInSample = yearCounts[currentYear] || 0;
    const currentPercentage = (currentJobsInSample / jobs.length) * 100;
    const estimatedCurrentTotal = Math.round((currentPercentage / 100) * totalCount);

    console.log('\n🎯 Current Year Analysis:');
    console.log('========================');
    console.log(`  Current year (${currentYear}): ${currentJobsInSample} in sample (${currentPercentage.toFixed(1)}%)`);
    console.log(`  Estimated total ${currentYear} jobs: ${estimatedCurrentTotal.toLocaleString()}`);

    // Close session
    await axios.delete(
      `https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1/sessions/${token}`
    );
    console.log('\nSession closed');

    return {
      totalCount,
      statusCounts,
      yearCounts,
      typeCounts,
      estimatedCurrentTotal
    };

  } catch (error) {
    console.log('❌ Count failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
    return null;
  }
}

// Run the count
countAllJobs().then(result => {
  if (result) {
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Jobs: ${result.totalCount.toLocaleString()}`);
    console.log(`Estimated Current Jobs: ${result.estimatedCurrentTotal.toLocaleString()}`);
    console.log(`Sample Size: 1,000 jobs`);
  }
});

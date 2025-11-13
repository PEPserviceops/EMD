/**
 * Test to check actual job dates in FileMaker
 */

require('dotenv').config({ path: '.env.local' });
const { FileMakerAPI } = require('./src/api/filemaker');

async function testJobDates() {
  const api = new FileMakerAPI({});

  try {
    console.log('Testing FileMaker job dates...');

    // Get jobs without date filtering to see what's actually in the database
    const jobs = await api._getRecordsFallback(await api.getToken(), { limit: 20 });

    console.log(`\nFound ${jobs.length} jobs. Sample dates:`);
    jobs.slice(0, 10).forEach((job, index) => {
      const date = job.fieldData?.job_date;
      const status = job.fieldData?.job_status;
      const type = job.fieldData?.job_type;
      const id = job.fieldData?._kp_job_id;
      console.log(`${index + 1}. Job ${id}: ${date} - ${status} - ${type}`);
    });

    // Find the most recent job date
    const validJobs = jobs.filter(job => job.fieldData?.job_date);
    if (validJobs.length > 0) {
      const dates = validJobs.map(job => new Date(job.fieldData.job_date));
      const mostRecent = new Date(Math.max(...dates));
      const oldest = new Date(Math.min(...dates));

      console.log(`\nDate range in database:`);
      console.log(`Most recent: ${mostRecent.toLocaleDateString()}`);
      console.log(`Oldest: ${oldest.toLocaleDateString()}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testJobDates();

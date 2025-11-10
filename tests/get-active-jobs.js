/**
 * Get Active Jobs from FileMaker
 * Retrieves jobs that are not DELETED to see real working data
 */

require('dotenv').config({ path: '.env.local' });
const { FileMakerAPI } = require('../src/api/filemaker');
const fs = require('fs');

async function getActiveJobs() {
  console.log('='.repeat(70));
  console.log('Retrieving Active Jobs from FileMaker');
  console.log('='.repeat(70));
  console.log();

  const api = new FileMakerAPI({
    host: process.env.FILEMAKER_HOST,
    database: process.env.FILEMAKER_DATABASE,
    layout: process.env.FILEMAKER_LAYOUT,
    username: process.env.FILEMAKER_USER,
    password: process.env.FILEMAKER_PASSWORD
  });

  try {
    // Get token
    await api.getToken();
    console.log('✓ Authenticated');
    console.log();

    // Get more records to find active ones
    console.log('Fetching 50 job records...');
    const jobs = await api.getActiveJobs({ limit: 50 });
    console.log(`✓ Retrieved ${jobs.length} records`);
    console.log();

    // Filter for non-deleted jobs
    const activeJobs = jobs.filter(job => {
      const status = job.fieldData.job_status;
      return status && status !== 'DELETED' && status !== '';
    });

    console.log(`Found ${activeJobs.length} active (non-deleted) jobs`);
    console.log();

    if (activeJobs.length > 0) {
      // Show status breakdown
      const statusCounts = {};
      activeJobs.forEach(job => {
        const status = job.fieldData.job_status;
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      console.log('Status Breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status.padEnd(20)} : ${count}`);
      });
      console.log();

      // Show sample of each status
      console.log('Sample Jobs by Status:');
      console.log('-'.repeat(70));
      
      const uniqueStatuses = [...new Set(activeJobs.map(j => j.fieldData.job_status))];
      
      for (const status of uniqueStatuses) {
        const sample = activeJobs.find(j => j.fieldData.job_status === status);
        if (sample) {
          console.log();
          console.log(`Status: ${status}`);
          console.log(`  Record ID: ${sample.recordId}`);
          console.log(`  Job Date: ${sample.fieldData.job_date}`);
          console.log(`  Job Type: ${sample.fieldData.job_type}`);
          console.log(`  Customer: ${sample.fieldData.Customer_C1}`);
          console.log(`  Address: ${sample.fieldData.address_C1}`);
          console.log(`  Truck ID: ${sample.fieldData._kf_trucks_id || '(none)'}`);
          console.log(`  Driver ID: ${sample.fieldData._kf_driver_id || '(none)'}`);
          console.log(`  Due Date: ${sample.fieldData.due_date || '(none)'}`);
          console.log(`  Arrival Time: ${sample.fieldData.time_arival || '(none)'}`);
          console.log(`  Complete Time: ${sample.fieldData.time_complete || '(none)'}`);
        }
      }

      console.log();
      console.log('-'.repeat(70));

      // Save samples to file
      const samples = uniqueStatuses.map(status => {
        return activeJobs.find(j => j.fieldData.job_status === status);
      }).filter(Boolean);

      fs.writeFileSync(
        'tests/active-jobs-samples.json',
        JSON.stringify(samples, null, 2)
      );
      console.log('✓ Sample data saved to: tests/active-jobs-samples.json');
      console.log();

      // Analyze field usage
      console.log('Field Usage Analysis:');
      console.log('-'.repeat(70));
      
      const fieldUsage = {};
      activeJobs.forEach(job => {
        Object.entries(job.fieldData).forEach(([field, value]) => {
          if (!fieldUsage[field]) {
            fieldUsage[field] = { populated: 0, empty: 0 };
          }
          if (value && value !== '') {
            fieldUsage[field].populated++;
          } else {
            fieldUsage[field].empty++;
          }
        });
      });

      console.log();
      console.log('Fields with data (sorted by usage):');
      const sortedFields = Object.entries(fieldUsage)
        .sort((a, b) => b[1].populated - a[1].populated)
        .filter(([_, usage]) => usage.populated > 0);

      sortedFields.forEach(([field, usage]) => {
        const percentage = Math.round((usage.populated / activeJobs.length) * 100);
        console.log(`  ${field.padEnd(30)} : ${usage.populated}/${activeJobs.length} (${percentage}%)`);
      });

    } else {
      console.log('⚠ No active jobs found. All records may be DELETED or empty.');
    }

    await api.closeSession();
    console.log();
    console.log('='.repeat(70));
    console.log('Complete!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    await api.closeSession();
    process.exit(1);
  }
}

getActiveJobs();


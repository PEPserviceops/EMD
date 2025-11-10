/**
 * Detailed FileMaker Connection Test
 * Tests connectivity and retrieves actual field structure
 */

require('dotenv').config({ path: '.env.local' });
const { FileMakerAPI } = require('../src/api/filemaker');

async function runDetailedTest() {
  console.log('='.repeat(70));
  console.log('FileMaker Data API - Detailed Connection Test');
  console.log('='.repeat(70));
  console.log();

  const api = new FileMakerAPI({
    host: process.env.FILEMAKER_HOST,
    database: process.env.FILEMAKER_DATABASE,
    layout: process.env.FILEMAKER_LAYOUT,
    username: process.env.FILEMAKER_USER,
    password: process.env.FILEMAKER_PASSWORD
  });

  console.log('Configuration:');
  console.log(`  Host: ${process.env.FILEMAKER_HOST}`);
  console.log(`  Database: ${process.env.FILEMAKER_DATABASE}`);
  console.log(`  Layout: ${process.env.FILEMAKER_LAYOUT}`);
  console.log(`  User: ${process.env.FILEMAKER_USER}`);
  console.log();

  // Test 1: Authentication
  console.log('Test 1: Authentication');
  console.log('-'.repeat(70));
  try {
    const token = await api.getToken();
    console.log('✓ Authentication successful!');
    console.log(`  Token: ${token.substring(0, 20)}...`);
    console.log();
  } catch (error) {
    console.error('✗ Authentication failed!');
    console.error(`  Error: ${error.message}`);
    console.log();
    console.log('Please check your credentials in .env.local');
    process.exit(1);
  }

  // Test 2: Get Active Jobs (first 5 records)
  console.log('Test 2: Retrieve Active Jobs');
  console.log('-'.repeat(70));
  try {
    const jobs = await api.getActiveJobs({ limit: 5 });
    console.log(`✓ Retrieved ${jobs.length} job records`);
    console.log();

    if (jobs.length > 0) {
      console.log('Sample Job Record Structure:');
      console.log('-'.repeat(70));
      const sampleJob = jobs[0];
      
      console.log(`Record ID: ${sampleJob.recordId}`);
      console.log(`Modified ID: ${sampleJob.modId}`);
      console.log();
      console.log('Available Fields:');
      console.log();

      const fieldData = sampleJob.fieldData || {};
      const fieldNames = Object.keys(fieldData).sort();
      
      // Display all fields with their values
      fieldNames.forEach((fieldName, index) => {
        const value = fieldData[fieldName];
        const displayValue = value === null || value === '' ? '(empty)' : 
                           typeof value === 'string' && value.length > 50 ? 
                           value.substring(0, 47) + '...' : value;
        console.log(`  ${(index + 1).toString().padStart(2)}. ${fieldName.padEnd(30)} = ${displayValue}`);
      });

      console.log();
      console.log(`Total Fields: ${fieldNames.length}`);
      console.log();

      // Save full sample to file for detailed inspection
      const fs = require('fs');
      const sampleData = {
        recordId: sampleJob.recordId,
        modId: sampleJob.modId,
        fieldData: sampleJob.fieldData,
        portalData: sampleJob.portalData || {}
      };
      
      fs.writeFileSync(
        'tests/sample-job-data.json',
        JSON.stringify(sampleData, null, 2)
      );
      console.log('✓ Full sample data saved to: tests/sample-job-data.json');
      console.log();

      // Test 3: Analyze fields for alert requirements
      console.log('Test 3: Verify Required Fields for Alerts');
      console.log('-'.repeat(70));
      
      const requiredFields = {
        'Job Identification': ['job_id', 'Job_ID', 'JobID', 'id', 'ID'],
        'Status': ['status', 'Status', 'job_status', 'JobStatus'],
        'Dates/Times': [
          'due_date', 'DueDate', 'due_time',
          'start_time', 'StartTime', 'start_date',
          'completion_time', 'CompletionTime', 'completed_date',
          'time_arrival', 'ArrivalTime', 'arrival_time'
        ],
        'Assignments': [
          'truck_id', 'TruckID', 'truck', 'Truck',
          'driver_id', 'DriverID', 'driver', 'Driver'
        ],
        'Customer Info': [
          'customer_name', 'CustomerName', 'customer',
          'pickup_address', 'PickupAddress',
          'delivery_address', 'DeliveryAddress'
        ],
        'Financial': [
          'revenue', 'Revenue', 'price', 'Price',
          'cost', 'Cost'
        ]
      };

      const foundFields = {};
      const missingCategories = [];

      for (const [category, possibleNames] of Object.entries(requiredFields)) {
        const found = possibleNames.find(name => fieldNames.includes(name));
        if (found) {
          foundFields[category] = found;
          console.log(`  ✓ ${category.padEnd(20)} → ${found}`);
        } else {
          missingCategories.push(category);
          console.log(`  ✗ ${category.padEnd(20)} → NOT FOUND`);
        }
      }

      console.log();

      if (missingCategories.length > 0) {
        console.log('⚠ Warning: Some expected fields were not found.');
        console.log('  This may require field mapping adjustments.');
        console.log();
        console.log('  Missing categories:', missingCategories.join(', '));
        console.log();
        console.log('  Please review tests/sample-job-data.json to identify');
        console.log('  the correct field names in your FileMaker layout.');
      } else {
        console.log('✓ All required field categories found!');
      }

      console.log();

      // Test 4: Test specific job lookup
      console.log('Test 4: Test Specific Job Lookup');
      console.log('-'.repeat(70));
      
      // Try to find a job using the first job's ID
      const firstJobId = fieldData[foundFields['Job Identification']] || 
                        fieldData[fieldNames[0]];
      
      if (firstJobId) {
        console.log(`  Attempting to find job: ${firstJobId}`);
        try {
          const specificJob = await api.findJob(firstJobId);
          if (specificJob) {
            console.log(`  ✓ Successfully retrieved job ${firstJobId}`);
          } else {
            console.log(`  ✗ Job ${firstJobId} not found`);
          }
        } catch (error) {
          console.log(`  ✗ Error finding job: ${error.message}`);
        }
      }

      console.log();

    } else {
      console.log('⚠ No job records found in the database.');
      console.log('  This could mean:');
      console.log('  - The layout name is incorrect');
      console.log('  - There are no records in the layout');
      console.log('  - The user does not have permission to view records');
    }

  } catch (error) {
    console.error('✗ Failed to retrieve jobs!');
    console.error(`  Error: ${error.message}`);
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data:`, JSON.stringify(error.response.data, null, 2));
    }
    console.log();
    await api.closeSession();
    process.exit(1);
  }

  // Close session
  await api.closeSession();
  console.log('✓ Session closed');
  console.log();

  console.log('='.repeat(70));
  console.log('Test Complete!');
  console.log('='.repeat(70));
  console.log();
  console.log('Next Steps:');
  console.log('  1. Review tests/sample-job-data.json for full field structure');
  console.log('  2. Update alert rules with correct field names');
  console.log('  3. Create field mapping documentation');
  console.log();
}

// Run the test
runDetailedTest().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});


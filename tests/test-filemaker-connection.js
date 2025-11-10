/**
 * FileMaker Connection Test Script
 * Tests connectivity to FileMaker Data API
 */

require('dotenv').config({ path: '.env.local' });
const { testFileMakerConnection } = require('../src/api/filemaker');

async function runTest() {
  console.log('='.repeat(60));
  console.log('FileMaker Data API Connection Test');
  console.log('='.repeat(60));
  console.log();

  console.log('Configuration:');
  console.log(`  Host: ${process.env.FILEMAKER_HOST}`);
  console.log(`  Database: ${process.env.FILEMAKER_DATABASE}`);
  console.log(`  Layout: ${process.env.FILEMAKER_LAYOUT}`);
  console.log(`  User: ${process.env.FILEMAKER_USER}`);
  console.log();

  console.log('Testing connection...');
  console.log();

  try {
    const result = await testFileMakerConnection();
    
    if (result.success) {
      console.log('✓ Connection successful!');
      console.log(`  Token: ${result.token}`);
      console.log(`  Test Query: ${result.testQuery}`);
      console.log(`  Timestamp: ${result.timestamp}`);
      console.log();
      console.log('='.repeat(60));
      console.log('All tests passed! FileMaker API is ready to use.');
      console.log('='.repeat(60));
      process.exit(0);
    } else {
      console.error('✗ Connection failed!');
      console.error(`  Error: ${result.error}`);
      console.error(`  Timestamp: ${result.timestamp}`);
      console.log();
      console.log('='.repeat(60));
      console.log('Test failed. Please check your configuration.');
      console.log('='.repeat(60));
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Test failed with exception!');
    console.error(`  Error: ${error.message}`);
    console.error();
    console.error('Stack trace:');
    console.error(error.stack);
    console.log();
    console.log('='.repeat(60));
    console.log('Test failed. Please check your configuration and network.');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

// Run the test
runTest();


/**
 * Test FileMaker Connection
 * Exact replica of user's working test
 */

const axios = require('axios');

async function testFileMakerConnection() {
  console.log('Testing FileMaker Connection (Exact User Test)...');
  console.log('================================================');

  try {
    console.log('Testing authentication endpoint...');
    console.log('URL: https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1/sessions');
    console.log('Method: POST');
    console.log('Auth: Basic trevor_api:XcScS2yRoTtMo7');
    console.log();

    const response = await axios.post(
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

    console.log('✅ SUCCESS: Authentication worked!');
    console.log('Status:', response.status);
    console.log('Token:', response.data?.response?.token ? 'Received' : 'Missing');
    console.log('Full response:', JSON.stringify(response.data, null, 2));

    // Now test job lookup
    console.log('\nTesting job lookup...');
    const token = response.data.response.token;

    const jobResponse = await axios.post(
      'https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1/layouts/jobs_api/_find',
      {
        query: [{ _kp_job_id: "603142" }]
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    console.log('✅ SUCCESS: Job lookup worked!');
    console.log('Status:', jobResponse.status);
    console.log('Jobs found:', jobResponse.data?.response?.data?.length || 0);
    console.log('Sample job:', JSON.stringify(jobResponse.data?.response?.data?.[0], null, 2));

    return true;

  } catch (error) {
    console.log('❌ FAILED: Connection error');
    console.log('Error type:', error.code || 'Unknown');
    console.log('Error message:', error.message);

    if (error.response) {
      console.log('HTTP Status:', error.response.status);
      console.log('Response headers:', error.response.headers);
      console.log('Response data:', error.response.data);
    } else if (error.request) {
      console.log('No response received');
      console.log('Request details:', error.request);
    }

    return false;
  }
}

// Run the test
testFileMakerConnection().then(success => {
  console.log();
  console.log('================================');
  if (success) {
    console.log('✅ FileMaker connection is working');
  } else {
    console.log('❌ FileMaker connection failed');
    console.log();
    console.log('Possible issues:');
    console.log('1. FileMaker server is down');
    console.log('2. FileMaker Data API is not enabled');
    console.log('3. Firewall blocking connections');
    console.log('4. Invalid credentials');
    console.log('5. Network connectivity issues');
  }
  process.exit(success ? 0 : 1);
});

/**
 * Script to discover available layouts in FileMaker database
 */

const axios = require('axios');

async function discoverLayouts() {
  console.log('Discovering available layouts in PEP2_1 database...');
  console.log('==================================================');

  try {
    // First, authenticate
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
    console.log('✅ Authentication successful, token acquired');

    // Try to get database metadata (layouts)
    console.log('\nTrying to get database metadata...');
    try {
      const metadataResponse = await axios.get(
        'https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      console.log('✅ Database metadata retrieved');
      console.log('Available endpoints:', Object.keys(metadataResponse.data || {}));
    } catch (error) {
      console.log('❌ Metadata endpoint not available or accessible');
      console.log('Error:', error.response?.status, error.response?.statusText);
    }

    // Try common layout names
    console.log('\nTesting common layout names...');
    const commonLayouts = [
      'jobs',
      'jobs_api',
      'jobs_active',
      'active_jobs',
      'current_jobs',
      'jobs_current',
      'live_jobs',
      'jobs_live',
      'dispatch_jobs',
      'field_jobs'
    ];

    const workingLayouts = [];

    for (const layoutName of commonLayouts) {
      try {
        console.log(`Testing layout: ${layoutName}...`);

        // Try to get records from this layout
        const response = await axios.get(
          `https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1/layouts/${layoutName}/records`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            params: {
              _limit: 1 // Just get one record to test access
            },
            timeout: 10000
          }
        );

        if (response.data && response.data.response) {
          const recordCount = response.data.response.dataInfo?.foundCount || 0;
          console.log(`✅ ${layoutName}: Accessible (${recordCount} records)`);

          workingLayouts.push({
            name: layoutName,
            recordCount: recordCount,
            sampleData: response.data.response.data?.[0]?.fieldData
          });
        }
      } catch (error) {
        if (error.response?.status === 401) {
          console.log(`❌ ${layoutName}: Access denied (401)`);
        } else if (error.response?.status === 404) {
          console.log(`❌ ${layoutName}: Not found (404)`);
        } else {
          console.log(`❌ ${layoutName}: Error (${error.response?.status || 'unknown'})`);
        }
      }
    }

    // Analyze working layouts
    console.log('\n' + '='.repeat(50));
    console.log('ACCESSIBLE LAYOUTS SUMMARY');
    console.log('='.repeat(50));

    if (workingLayouts.length === 0) {
      console.log('❌ No layouts found or accessible');
    } else {
      workingLayouts.forEach(layout => {
        console.log(`📋 ${layout.name}: ${layout.recordCount} records`);

        // Check if this layout has current data
        if (layout.sampleData?.job_date) {
          const jobDate = layout.sampleData.job_date;
          console.log(`   Sample date: ${jobDate}`);

          // Check if date is recent (2024 or 2025)
          if (jobDate.includes('2024') || jobDate.includes('2025')) {
            console.log(`   🎯 POTENTIAL CURRENT DATA LAYOUT!`);
          }
        }
        console.log();
      });
    }

    // Close session
    try {
      await axios.delete(
        `https://modd.mainspringhost.com/fmi/data/vLatest/databases/PEP2_1/sessions/${token}`
      );
      console.log('Session closed');
    } catch (error) {
      console.log('Error closing session:', error.message);
    }

    return workingLayouts;

  } catch (error) {
    console.log('❌ FAILED: Error during layout discovery');
    console.log('Error:', error.message);

    if (error.response) {
      console.log('HTTP Status:', error.response.status);
      console.log('Response data:', error.response.data);
    }

    return [];
  }
}

// Run the discovery
discoverLayouts().then(layouts => {
  console.log('\nDiscovery complete.');
  if (layouts.length > 0) {
    console.log(`Found ${layouts.length} accessible layout(s)`);
  } else {
    console.log('No accessible layouts found');
  }
  process.exit(layouts.length > 0 ? 0 : 1);
});

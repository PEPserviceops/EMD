/**
 * Test Script for EMD Polling Service
 * 
 * This script tests the polling service functionality locally
 * before deploying to Railway
 */

require('dotenv').config();
const axios = require('axios');

// Configuration
const POLLING_URL = process.env.POLLING_SERVICE_URL || 'http://localhost:3001';

console.log('='.repeat(70));
console.log('EMD Polling Service Test Suite');
console.log('='.repeat(70));

async function testHealth() {
  console.log('\n1. Testing Health Endpoint...');
  
  try {
    const response = await axios.get(`${POLLING_URL}/health`);
    console.log('✅ Health check passed:');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Service: ${response.data.service}`);
    console.log(`   Polling: ${response.data.isPolling ? 'Active' : 'Inactive'}`);
    console.log(`   Uptime: ${response.data.uptime}s`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return null;
  }
}

async function testStats() {
  console.log('\n2. Testing Stats Endpoint...');
  
  try {
    const response = await axios.get(`${POLLING_URL}/stats`);
    console.log('✅ Stats retrieved:');
    console.log(`   Total Polls: ${response.data.stats.totalPolls}`);
    console.log(`   Successful: ${response.data.stats.successfulPolls}`);
    console.log(`   Failed: ${response.data.stats.failedPolls}`);
    console.log(`   Last Poll: ${response.data.stats.lastPollTime || 'Never'}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Stats check failed:', error.message);
    return null;
  }
}

async function testManualPoll() {
  console.log('\n3. Testing Manual Poll...');
  
  try {
    const response = await axios.post(`${POLLING_URL}/poll`);
    console.log('✅ Manual poll triggered:');
    console.log(`   Success: ${response.data.success}`);
    console.log(`   Jobs: ${response.data.jobs || 0}`);
    console.log(`   Time: ${response.data.time}ms`);
    
    if (response.data.error) {
      console.log(`   Error: ${response.data.error}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Manual poll failed:', error.message);
    return null;
  }
}

async function testSupabaseConnection() {
  console.log('\n4. Testing Supabase Connection...');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const { data, error } = await supabase
      .from('jobs_history')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
}

async function testFileMakerConnection() {
  console.log('\n5. Testing FileMaker Connection...');
  
  try {
    const response = await axios.post(`${POLLING_URL}/poll`, {}, { timeout: 10000 });
    
    if (response.data.success && response.data.jobs > 0) {
      console.log(`✅ FileMaker connection successful - Retrieved ${response.data.jobs} jobs`);
      return true;
    } else {
      console.log('⚠️ FileMaker connection succeeded but no jobs retrieved');
      return false;
    }
  } catch (error) {
    console.error('❌ FileMaker connection failed:', error.message);
    return false;
  }
}

async function runTests() {
  const results = {
    health: await testHealth(),
    stats: await testStats(),
    manualPoll: await testManualPoll(),
    supabase: await testSupabaseConnection(),
    fileMaker: await testFileMakerConnection()
  };
  
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log(`Passed: ${passed}/${total} tests`);
  console.log(`Health: ${results.health ? '✅' : '❌'}`);
  console.log(`Stats: ${results.stats ? '✅' : '❌'}`);
  console.log(`Manual Poll: ${results.manualPoll ? '✅' : '❌'}`);
  console.log(`Supabase: ${results.supabase ? '✅' : '❌'}`);
  console.log(`FileMaker: ${results.fileMaker ? '✅' : '❌'}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Ready for Railway deployment.');
  } else {
    console.log('\n⚠️ Some tests failed. Fix issues before deployment.');
  }
  
  console.log('\nTo run tests:');
  console.log('  npm run test:polling');
  console.log('  or: node test-polling-service.js');
  
  return results;
}

// Check if running locally
if (!process.env.POLLING_SERVICE_URL) {
  console.log('\n⚠️ POLLING_SERVICE_URL not set, assuming localhost:3001');
  console.log('Start polling service first: node server.js');
  console.log('Then run this test in another terminal.');
}

// Run tests
runTests().catch(console.error);
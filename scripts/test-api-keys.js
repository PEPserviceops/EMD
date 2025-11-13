#!/usr/bin/env node

/**
 * Test API Keys and Services
 * Tests all configured API integrations for connectivity and validity
 * Run with: node scripts/test-api-keys.js
 */

require('dotenv').config({path: '.env.local'});

const axios = require('axios');

console.log('🔧 TESTING API KEYS AND SERVICES');
console.log('================================\n');

async function testOpenRouter() {
  console.log('🤖 Testing OpenRouter API...');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  
  if (!apiKey) {
    console.log('❌ OpenRouter API key not set\n');
    return false;
  }
  
  console.log(`   Key preview: ${apiKey.substring(0, 20)}...`);
  console.log(`   Base URL: ${baseURL}`);
  
  try {
    const response = await axios.post(`${baseURL}/chat/completions`, {
      model: 'deepseek/deepseek-r1',
      messages: [{ role: 'user', content: 'Hello, this is a test. Please respond with "Test successful."' }],
      max_tokens: 50,
      temperature: 0
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Exception Management Dashboard - EMD'
      },
      timeout: 10000
    });
    
    console.log('✅ OpenRouter API test successful!');
    console.log(`   Response: ${response.data.choices[0].message.content.substring(0, 50)}...`);
    console.log(`   Model: ${response.data.model}\n`);
    return true;
    
  } catch (error) {
    console.log(`❌ OpenRouter API test failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Status Text: ${error.response.statusText}`);
      try {
        const errorData = JSON.parse(error.response.data);
        console.log(`   Error: ${errorData.error?.message || 'Unknown error'}`);
      } catch (e) {
        console.log(`   Error: ${error.response.data || 'No error details'}`);
      }
    }
    console.log('');
    return false;
  }
}

async function testSamsara() {
  console.log('🚚 Testing Samsara API...');
  
  const apiKey = process.env.SAMSARA_API_KEY;
  const baseURL = process.env.SAMSARA_API_URL || 'https://api.samsara.com';
  
  if (!apiKey) {
    console.log('❌ Samsara API key not set\n');
    return false;
  }
  
  console.log(`   Key preview: ${apiKey.substring(0, 20)}...`);
  console.log(`   Base URL: ${baseURL}`);
  
  try {
    const response = await axios.get(`${baseURL}/v1/fleet/vehicles`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Samsara API test successful!');
    console.log(`   Found ${response.data.data?.length || 0} vehicles\n`);
    return true;
    
  } catch (error) {
    console.log(`❌ Samsara API test failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Status Text: ${error.response.statusText}`);
      try {
        const errorData = JSON.parse(error.response.data);
        console.log(`   Error: ${errorData.errors?.[0]?.message || 'Unknown error'}`);
      } catch (e) {
        console.log(`   Error: ${error.response.data || 'No error details'}`);
      }
    }
    console.log('');
    return false;
  }
}

async function testSupabase() {
  console.log('🗄️ Testing Supabase API...');
  
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    console.log('❌ Supabase credentials not set\n');
    return false;
  }
  
  console.log(`   URL: ${url}`);
  console.log(`   Anon key preview: ${anonKey.substring(0, 20)}...`);
  
  try {
    const response = await axios.get(`${url}/rest/v1/`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Supabase API test successful!');
    console.log(`   Response: ${response.status} ${response.statusText}\n`);
    return true;
    
  } catch (error) {
    console.log(`❌ Supabase API test failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Status Text: ${error.response.statusText}`);
    }
    console.log('');
    return false;
  }
}

async function main() {
  const results = {
    openrouter: await testOpenRouter(),
    samsara: await testSamsara(),
    supabase: await testSupabase()
  };
  
  console.log('📊 TEST SUMMARY');
  console.log('===============');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([service, success]) => {
    console.log(`${success ? '✅' : '❌'} ${service.toUpperCase()}: ${success ? 'PASS' : 'FAIL'}`);
  });
  
  console.log(`\n🎯 Results: ${passed}/${total} services working`);
  
  if (passed < total) {
    console.log('\n🔧 TROUBLESHOOTING:');
    if (!results.openrouter) {
      console.log('   - Check OpenRouter API key validity at https://openrouter.ai');
      console.log('   - Verify model "deepseek/deepseek-r1" is accessible');
      console.log('   - Check account credits/billing');
    }
    if (!results.samsara) {
      console.log('   - Check Samsara API key permissions');
      console.log('   - Verify vehicle access in Samsara dashboard');
    }
    if (!results.supabase) {
      console.log('   - Check Supabase project status');
      console.log('   - Verify RLS policies and table permissions');
    }
  } else {
    console.log('\n🎉 All API services are working correctly!');
  }
  
  process.exit(passed === total ? 0 : 1);
}

main().catch(console.error);

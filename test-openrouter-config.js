/**
 * Simple test to verify OpenRouter configuration
 */
require('dotenv').config();

const openRouterService = require('./src/services/OpenRouterService');

async function quickTest() {
  console.log('🔍 Checking OpenRouter Configuration...\n');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log('- API Key configured:', !!process.env.OPENROUTER_API_KEY);
  console.log('- Base URL:', process.env.OPENROUTER_BASE_URL || 'Not set');
  console.log('- Model:', process.env.OPENROUTER_MODEL || 'Not set');
  console.log('- Service enabled:', openRouterService.isEnabled());
  console.log('');

  if (openRouterService.isEnabled()) {
    console.log('✅ OpenRouter service is properly configured!');
    console.log('🔑 API Key starts with:', process.env.OPENROUTER_API_KEY.substring(0, 10) + '...');
  } else {
    console.log('❌ OpenRouter service is not configured properly');
  }
}

quickTest().catch(console.error);
#!/usr/bin/env node

/**
 * Production Environment Validation Script
 * Validates that all required production environment variables are properly configured
 * Run with: node scripts/validate-production-env.js
 */

const requiredEnvVars = [
  // Application Configuration
  'NODE_ENV',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_API_URL',

  // FileMaker Configuration
  'FILEMAKER_HOST',
  'FILEMAKER_BASE_URL',
  'FILEMAKER_DATABASE',
  'FILEMAKER_USER',
  'FILEMAKER_PASSWORD',

  // Supabase Configuration
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',

  // Security Configuration
  'NEXTAUTH_SECRET',
  'JWT_SECRET',
  'ENCRYPTION_KEY',

  // Polling Configuration
  'POLLING_INTERVAL',
  'POLLING_ENABLED',

  // API Keys (will be validated for placeholder values)
  'SAMSARA_API_KEY',
  'OPENROUTER_API_KEY',
  'GOOGLE_MAPS_API_KEY'
];

const optionalEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SENTRY_DSN',
  'MONITORING_WEBHOOK_URL',
  'LOG_LEVEL',
  'RATE_LIMIT_WINDOW',
  'RATE_LIMIT_MAX'
];

console.log('🔍 PRODUCTION ENVIRONMENT VALIDATION');
console.log('=====================================\n');

let allValid = true;
const issues = [];

// Check required variables
console.log('📋 Checking REQUIRED environment variables:');
console.log('--------------------------------------------');

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];

  if (!value) {
    console.log(`❌ ${varName}: MISSING`);
    issues.push(`${varName} is missing`);
    allValid = false;
  } else if (value.includes('NEEDED') || value.includes('PLACEHOLDER')) {
    console.log(`⚠️  ${varName}: PLACEHOLDER VALUE (needs production key)`);
    issues.push(`${varName} has placeholder value`);
  } else {
    console.log(`✅ ${varName}: SET`);
  }
});

console.log('\n📋 Checking OPTIONAL environment variables:');
console.log('--------------------------------------------');

optionalEnvVars.forEach(varName => {
  const value = process.env[varName];

  if (!value) {
    console.log(`⚠️  ${varName}: NOT SET (optional)`);
  } else if (value.includes('NEEDED') || value.includes('PLACEHOLDER')) {
    console.log(`⚠️  ${varName}: PLACEHOLDER VALUE (optional)`);
  } else {
    console.log(`✅ ${varName}: SET`);
  }
});

// Validate specific configurations
console.log('\n🔧 Validating specific configurations:');
console.log('-------------------------------------');

// Check NODE_ENV
if (process.env.NODE_ENV !== 'production') {
  console.log('⚠️  NODE_ENV is not set to "production"');
  issues.push('NODE_ENV should be "production"');
} else {
  console.log('✅ NODE_ENV is correctly set to "production"');
}

// Check URLs
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (appUrl && !appUrl.startsWith('https://')) {
  console.log('⚠️  NEXT_PUBLIC_APP_URL should use HTTPS in production');
  issues.push('NEXT_PUBLIC_APP_URL should use HTTPS');
} else if (appUrl) {
  console.log('✅ NEXT_PUBLIC_APP_URL uses HTTPS');
}

if (apiUrl && !apiUrl.startsWith('https://')) {
  console.log('⚠️  NEXT_PUBLIC_API_URL should use HTTPS in production');
  issues.push('NEXT_PUBLIC_API_URL should use HTTPS');
} else if (apiUrl) {
  console.log('✅ NEXT_PUBLIC_API_URL uses HTTPS');
}

// Check secret lengths
const secretsToCheck = ['NEXTAUTH_SECRET', 'JWT_SECRET', 'ENCRYPTION_KEY'];
secretsToCheck.forEach(secret => {
  const value = process.env[secret];
  if (value && value.length < 32) {
    console.log(`⚠️  ${secret} is too short (${value.length} chars, should be >= 32)`);
    issues.push(`${secret} is too short`);
  } else if (value) {
    console.log(`✅ ${secret} has adequate length (${value.length} chars)`);
  }
});

// Summary
console.log('\n📊 VALIDATION SUMMARY:');
console.log('=====================');

if (allValid && issues.length === 0) {
  console.log('✅ ALL REQUIRED VARIABLES ARE PROPERLY CONFIGURED!');
  console.log('🎉 Production environment is ready for deployment.');
} else {
  console.log(`❌ ${issues.length} ISSUES FOUND:`);
  issues.forEach(issue => console.log(`   - ${issue}`));
  console.log('\n🔧 ACTION REQUIRED:');
  console.log('   1. Obtain production API keys from service providers');
  console.log('   2. Set SUPABASE_SERVICE_ROLE_KEY from Supabase dashboard');
  console.log('   3. Configure monitoring (Sentry, webhooks) if desired');
  console.log('   4. Update Railway environment variables');
}

console.log('\n🚀 Next steps:');
console.log('   1. Deploy to Railway: railway up');
console.log('   2. Test application at production URL');
console.log('   3. Verify all integrations work with production keys');

process.exit(allValid && issues.length === 0 ? 0 : 1);

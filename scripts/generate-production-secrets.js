#!/usr/bin/env node

/**
 * Production Secrets Generator
 * Generates secure random values for production environment variables
 * Run with: node scripts/generate-production-secrets.js
 */

const crypto = require('crypto');

// Generate secure random strings
function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Generate secure random base64 strings
function generateBase64Secret(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

console.log('🔐 PRODUCTION ENVIRONMENT SECRETS GENERATOR');
console.log('==========================================\n');

// Generate all required secrets
const secrets = {
  NEXTAUTH_SECRET: generateSecret(32),
  JWT_SECRET: generateSecret(32),
  ENCRYPTION_KEY: generateSecret(32),
  SAMSARA_API_KEY: 'samsara_api_' + generateSecret(16), // Placeholder format
  OPENROUTER_API_KEY: 'sk-or-v1-' + generateSecret(32),
  SUPABASE_SERVICE_ROLE_KEY: generateBase64Secret(32), // Supabase service keys are base64
  SENTRY_DSN: 'https://' + generateSecret(16) + '@sentry.io/' + Math.floor(Math.random() * 1000000),
  MONITORING_WEBHOOK_URL: 'https://discord.com/api/webhooks/' + generateSecret(8) + '/' + generateSecret(16)
};

console.log('📋 COPY THESE VALUES TO YOUR PRODUCTION ENVIRONMENT:\n');

Object.entries(secrets).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('\n⚠️  IMPORTANT NOTES:');
console.log('==================');
console.log('1. SAMSARA_API_KEY: Replace with actual Samsara production API key');
console.log('2. OPENROUTER_API_KEY: Replace with actual OpenRouter production API key');
console.log('3. SUPABASE_SERVICE_ROLE_KEY: Replace with actual Supabase service role key');
console.log('4. SENTRY_DSN: Replace with actual Sentry DSN after setting up Sentry project');
console.log('5. MONITORING_WEBHOOK_URL: Replace with actual Discord/Slack webhook URL');
console.log('\n🚀 Set these in Railway dashboard or via CLI:');
console.log('railway variables --set "KEY=VALUE" --set "KEY2=VALUE2"');

console.log('\n✅ Secrets generated successfully!');

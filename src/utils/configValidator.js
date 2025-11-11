/**
 * Environment Configuration Validator
 * Validates that required environment variables are properly configured
 */

const requiredEnvVars = {
  critical: [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ],
  optional: [
    'SAMSARA_API_KEY',
    'OPENROUTER_API_KEY',
    'FILEMAKER_HOST',
    'FILEMAKER_DATABASE',
    'FILEMAKER_USER',
    'FILEMAKER_PASSWORD'
  ]
};

function validateConfig() {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    config: {}
  };

  // Check critical environment variables
  requiredEnvVars.critical.forEach(envVar => {
    const value = process.env[envVar];
    if (!value) {
      results.valid = false;
      results.errors.push(`Missing critical environment variable: ${envVar}`);
    } else {
      results.config[envVar] = 'configured';
    }
  });

  // Check optional environment variables
  requiredEnvVars.optional.forEach(envVar => {
    const value = process.env[envVar];
    if (!value) {
      results.warnings.push(`Missing optional environment variable: ${envVar}`);
      results.config[envVar] = 'missing';
    } else {
      // Check for placeholder values
      if (value.includes('your_') || value.includes('placeholder')) {
        results.warnings.push(`Environment variable ${envVar} appears to be a placeholder`);
        results.config[envVar] = 'placeholder';
      } else {
        results.config[envVar] = 'configured';
      }
    }
  });

  return results;
}

function printConfigReport() {
  const results = validateConfig();
  
  console.log('\n=== Environment Configuration Report ===');
  console.log(`Overall Status: ${results.valid ? 'VALID' : 'INVALID'}`);
  
  if (results.errors.length > 0) {
    console.log('\nCRITICAL ERRORS:');
    results.errors.forEach(error => console.log(`  ❌ ${error}`));
  }
  
  if (results.warnings.length > 0) {
    console.log('\nWARNINGS:');
    results.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
  }
  
  console.log('\nConfiguration Status:');
  Object.entries(results.config).forEach(([key, status]) => {
    const icon = status === 'configured' ? '✅' : (status === 'placeholder' ? '⚠️' : '❌');
    console.log(`  ${icon} ${key}: ${status}`);
  });
  
  console.log('\n==========================================\n');
  
  return results;
}

module.exports = {
  validateConfig,
  printConfigReport,
  requiredEnvVars
};
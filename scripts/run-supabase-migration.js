/**
 * Supabase Migration Runner
 * 
 * This script helps you run the database migration in Supabase.
 * It will read the migration SQL file and provide instructions.
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('Supabase Database Migration Runner');
console.log('='.repeat(70));
console.log();

// Read the migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');

if (!fs.existsSync(migrationPath)) {
  console.error('❌ Migration file not found at:', migrationPath);
  process.exit(1);
}

const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
const lineCount = migrationSQL.split('\n').length;

console.log('✅ Migration file loaded successfully');
console.log(`   File: ${migrationPath}`);
console.log(`   Lines: ${lineCount}`);
console.log();

console.log('📋 INSTRUCTIONS TO RUN THE MIGRATION:');
console.log();
console.log('1. Open your Supabase project dashboard:');
console.log('   https://app.supabase.com/project/dqmbnodnhxowaatprnjj');
console.log();
console.log('2. Navigate to: SQL Editor (in the left sidebar)');
console.log();
console.log('3. Click "New query"');
console.log();
console.log('4. Copy the SQL from this file:');
console.log(`   ${migrationPath}`);
console.log();
console.log('5. Paste it into the SQL Editor');
console.log();
console.log('6. Click "Run" or press Ctrl+Enter');
console.log();
console.log('7. Verify success: You should see "Success. No rows returned"');
console.log();
console.log('8. Go to "Table Editor" to verify these tables were created:');
console.log('   - jobs_history');
console.log('   - alerts_history');
console.log('   - efficiency_metrics');
console.log('   - profitability_metrics');
console.log('   - system_metrics');
console.log();

console.log('='.repeat(70));
console.log('ALTERNATIVE: Copy SQL to Clipboard');
console.log('='.repeat(70));
console.log();
console.log('The migration SQL is printed below. Copy it and paste into Supabase:');
console.log();
console.log('-'.repeat(70));
console.log(migrationSQL);
console.log('-'.repeat(70));
console.log();

console.log('✅ After running the migration, run: node scripts/test-supabase-connection.js');
console.log();


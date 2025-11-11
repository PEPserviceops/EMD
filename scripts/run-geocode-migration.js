/**
 * Run Geocode Cache Migration
 * Creates the geocode_cache table in Supabase
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function runMigration() {
  console.log('='.repeat(70));
  console.log('Running Geocode Cache Migration');
  console.log('='.repeat(70));

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found in environment');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '002_geocode_cache.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log(`📋 Migration file: ${migrationPath}`);
  console.log(`📝 SQL length: ${sql.length} characters\n`);

  try {
    // Execute migration
    console.log('🔄 Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('Details:', error);
      process.exit(1);
    }

    console.log('✅ Migration executed successfully!');
    
    // Verify table was created
    console.log('\n🔍 Verifying geocode_cache table...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('geocode_cache')
      .select('count');

    if (tableError) {
      console.error('⚠️  Table verification failed:', tableError.message);
      console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
      console.log('-'.repeat(70));
      console.log(sql);
      console.log('-'.repeat(70));
    } else {
      console.log('✅ Table geocode_cache created and accessible');
    }

    console.log('\n' + '='.repeat(70));
    console.log('Migration Complete!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.log('\n📋 Manual SQL to run in Supabase:');
    console.log('-'.repeat(70));
    console.log(sql);
    console.log('-'.repeat(70));
    process.exit(1);
  }
}

runMigration();
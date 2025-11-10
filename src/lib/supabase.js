/**
 * Supabase Client Configuration
 *
 * Initializes and exports the Supabase client for database operations.
 * Used for storing and querying historical analysis data.
 *
 * Environment Variables Required:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_ANON_KEY: Your Supabase anonymous/public key
 *
 * @module lib/supabase
 */

const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.warn('⚠️  SUPABASE_URL is not set. Supabase features will be disabled.');
}

if (!supabaseAnonKey) {
  console.warn('⚠️  SUPABASE_ANON_KEY is not set. Supabase features will be disabled.');
}

/**
 * Supabase client instance
 * Returns null if environment variables are not configured
 */
const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Server-side doesn't need session persistence
        autoRefreshToken: false,
      },
      db: {
        schema: 'public'
      }
    })
  : null;

/**
 * Check if Supabase is configured and available
 * @returns {boolean} True if Supabase client is initialized
 */
function isSupabaseConfigured() {
  return supabase !== null;
}

/**
 * Get Supabase client with error handling
 * @throws {Error} If Supabase is not configured
 * @returns {Object} Supabase client instance
 */
function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }
  return supabase;
}

module.exports = {
  supabase,
  isSupabaseConfigured,
  getSupabaseClient
};


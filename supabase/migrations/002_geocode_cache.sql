-- Create geocode cache table for storing address coordinates
-- This minimizes Google Maps API calls and improves performance

CREATE TABLE IF NOT EXISTS geocode_cache (
  id BIGSERIAL PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  formatted_address TEXT,
  place_id TEXT,
  geocoded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_geocode_cache_key ON geocode_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_geocode_cache_created ON geocode_cache(created_at DESC);

-- Add comment
COMMENT ON TABLE geocode_cache IS 'Caches Google Maps geocoding results to minimize API calls and costs';
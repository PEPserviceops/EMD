# Supabase Geocode Cache Setup

## Quick Setup Instructions

To enable geocoding with caching, you need to create the `geocode_cache` table in your Supabase database.

### Steps:

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com/project/dqmbnodnhxowaatprnjj
   - Login with your credentials

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Run This SQL**

```sql
-- Create geocode cache table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_geocode_cache_key ON geocode_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_geocode_cache_created ON geocode_cache(created_at DESC);

-- Add comment
COMMENT ON TABLE geocode_cache IS 'Caches Google Maps geocoding results to minimize API calls';

-- Enable RLS
ALTER TABLE geocode_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Enable all access for service role" ON geocode_cache
  FOR ALL USING (true) WITH CHECK (true);
```

4. **Click "Run" or press Ctrl+Enter**

5. **Verify Success**
   - You should see "Success. No rows returned"
   - Go to "Table Editor" in left sidebar
   - You should see "geocode_cache" table listed

### What This Does:

- **Caches geocoded addresses** to avoid repeated Google Maps API calls
- **Saves money** by reducing API usage (~$5 per 1,000 requests after free tier)
- **Improves performance** by serving cached coordinates instantly
- **Unique cache key** prevents duplicate geocoding of same address

### Verification:

After running the migration, test with:

```bash
npm run dev
```

Then navigate to Route Optimization tab and click "Optim ize Routes". 

The first time it geocodes an address, it will:
1. Call Google Maps API
2. Store result in `geocode_cache`
3. Use cached result for future requests

---

## Troubleshooting

**If table creation fails:**
- Check if table already exists
- Verify you have database permissions
- Try creating without RLS first, then add policies separately

**If you see permissions errors:**
- Make sure SUPABASE_ANON_KEY has proper permissions
- Check RLS policies are configured correctly
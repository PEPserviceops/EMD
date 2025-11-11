/**
 * Geocoding Service
 * 
 * Converts addresses to lat/lng coordinates using Google Maps Geocoding API
 * Implements aggressive caching in Supabase to minimize API calls and costs
 * 
 * @module services/GeocodingService
 */

const axios = require('axios');
const supabaseService = require('./SupabaseService');

class GeocodingService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.enabled = !!this.apiKey;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    this.cache = new Map(); // In-memory cache
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      apiCalls: 0,
      errors: 0
    };
  }

  /**
   * Check if geocoding service is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Geocode a single address
   * @param {string} address - Full address string
   * @param {string} city - City name
   * @param {string} state - State code
   * @param {string} zip - ZIP code
   * @returns {Promise<Object>} Lat/lng coordinates
   */
  async geocodeAddress(address, city, state, zip) {
    this.stats.totalRequests++;

    if (!this.enabled) {
      throw new Error('Geocoding service not configured - GOOGLE_MAPS_API_KEY missing');
    }

    try {
      // Build full address string
      const fullAddress = this._buildFullAddress(address, city, state, zip);
      const cacheKey = this._generateCacheKey(fullAddress);

      // Check in-memory cache first
      if (this.cache.has(cacheKey)) {
        this.stats.cacheHits++;
        return this.cache.get(cacheKey);
      }

      // Check Supabase cache
      const cachedResult = await this._getFromSupabaseCache(cacheKey, fullAddress);
      if (cachedResult) {
        this.stats.cacheHits++;
        this.cache.set(cacheKey, cachedResult); // Add to memory cache
        return cachedResult;
      }

      // Make API call
      this.stats.apiCalls++;
      const coordinates = await this._callGoogleMapsAPI(fullAddress);

      // Store in caches
      await this._storeInSupabaseCache(cacheKey, fullAddress, coordinates);
      this.cache.set(cacheKey, coordinates);

      return coordinates;

    } catch (error) {
      this.stats.errors++;
      console.error('Geocoding error:', error.message);
      
      // Return null coordinates to allow processing to continue
      return {
        lat: null,
        lng: null,
        error: error.message,
        address: this._buildFullAddress(address, city, state, zip)
      };
    }
  }

  /**
   * Geocode multiple addresses in batch
   * @param {Array} addresses - Array of address objects
   * @returns {Promise<Array>} Array of geocoded results
   */
  async geocodeBatch(addresses) {
    const results = [];
    
    for (const addr of addresses) {
      const result = await this.geocodeAddress(
        addr.address,
        addr.city,
        addr.state,
        addr.zip
      );
      
      results.push({
        ...addr,
        coordinates: result,
        geocoded: result.lat !== null && result.lng !== null
      });
      
      // Rate limiting: Google allows 50 requests/second
      // Add small delay to be safe
      await this._delay(25);
    }
    
    return results;
  }

  /**
   * Get geocoding statistics
   */
  getStats() {
    const cacheHitRate = this.stats.totalRequests > 0
      ? (this.stats.cacheHits / this.stats.totalRequests) * 100
      : 0;

    return {
      ...this.stats,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      enabled: this.enabled
    };
  }

  /**
   * Clear in-memory cache
   */
  clearCache() {
    this.cache.clear();
  }

  // Private methods

  /**
   * Build full address string
   * @private
   */
  _buildFullAddress(address, city, state, zip) {
    const parts = [];
    
    if (address) parts.push(address.trim());
    if (city) parts.push(city.trim());
    if (state) parts.push(state.trim());
    if (zip) parts.push(zip.trim());
    
    return parts.join(', ');
  }

  /**
   * Generate cache key from address
   * @private
   */
  _generateCacheKey(address) {
    return address.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Get cached coordinates from Supabase
   * @private
   */
  async _getFromSupabaseCache(cacheKey, address) {
    if (!supabaseService.isEnabled()) {
      return null;
    }

    try {
      const { data, error } = await supabaseService.supabase
        .from('geocode_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          return null;
        }
        throw error;
      }

      if (data) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          formatted_address: data.formatted_address,
          cached: true
        };
      }

      return null;
    } catch (error) {
      console.error('Supabase cache read error:', error.message);
      return null;
    }
  }

  /**
   * Store coordinates in Supabase cache
   * @private
   */
  async _storeInSupabaseCache(cacheKey, address, coordinates) {
    if (!supabaseService.isEnabled() || !coordinates.lat) {
      return;
    }

    try {
      await supabaseService.supabase
        .from('geocode_cache')
        .upsert({
          cache_key: cacheKey,
          address: address,
          latitude: coordinates.lat,
          lng: coordinates.lng,
          formatted_address: coordinates.formatted_address,
          geocoded_at: new Date().toISOString()
        }, {
          onConflict: 'cache_key'
        });
    } catch (error) {
      console.error('Supabase cache write error:', error.message);
      // Don't throw - caching failure shouldn't break geocoding
    }
  }

  /**
   * Call Google Maps Geocoding API
   * @private
   */
  async _callGoogleMapsAPI(address) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          address: address,
          key: this.apiKey
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data.status === 'OK' && response.data.results && response.data.results[0]) {
        const result = response.data.results[0];
        const location = result.geometry.location;
        
        return {
          lat: location.lat,
          lng: location.lng,
          formatted_address: result.formatted_address,
          place_id: result.place_id,
          cached: false
        };
      }

      if (response.data.status === 'ZERO_RESULTS') {
        throw new Error(`Address not found: ${address}`);
      }

      if (response.data.status === 'OVER_QUERY_LIMIT') {
        throw new Error('Google Maps API quota exceeded');
      }

      throw new Error(`Geocoding failed: ${response.data.status}`);

    } catch (error) {
      if (error.response) {
        throw new Error(`Google Maps API error: ${error.response.status} - ${error.response.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Delay helper for rate limiting
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
module.exports = new GeocodingService();
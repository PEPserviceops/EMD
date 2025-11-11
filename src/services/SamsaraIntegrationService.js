/**
 * Samsara Integration Service
 * 
 * Provides GPS verification by integrating with Samsara Fleet API:
 * - Fetch real GPS location data for trucks
 * - Map FileMaker truck IDs to Samsara vehicle IDs
 * - Verify scheduled jobs against actual GPS locations
 * - Handle partial truck coverage (some trucks may not be in Samsara)
 * - Generate alerts when drivers are significantly off schedule
 * 
 * @module services/SamsaraIntegrationService
 */

const axios = require('axios');

class SamsaraIntegrationService {
  constructor() {
    this.apiKey = process.env.SAMSARA_API_KEY;
    this.apiUrl = process.env.SAMSARA_API_URL || 'https://api.samsara.com';
    this.enabled = !!this.apiKey;
    
    // Rate limiting
    this.rateLimits = {
      requestsPerSecond: 10,
      lastRequestTime: 0,
      minRequestInterval: 1000 / 10 // 100ms between requests
    };

    // Truck mapping: FileMaker truck ID -> Samsara vehicle ID
    this.truckMapping = new Map();
    
    // Cache GPS data to avoid excessive API calls
    this.gpsCache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
    
    // Verification thresholds
    this.verificationConfig = {
      distanceThreshold: 5, // miles - max acceptable distance from scheduled location
      timeThreshold: 15, // minutes - max acceptable time difference
      speedThreshold: 0, // minimum speed to consider vehicle active
      alertDistanceThreshold: 10, // miles - trigger alert if beyond this
      alertTimeThreshold: 30 // minutes - trigger alert if beyond this
    };

    this._initializeTruckMapping();
  }

  /**
   * Check if Samsara integration is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Initialize truck mapping configuration
   * In production, this would be loaded from database/environment config
   * @private
   */
  _initializeTruckMapping() {
    // Sample mapping - in production this would be dynamic
    // Updated to match actual FileMaker truck IDs from job data
    const defaultMapping = {
      // FileMaker truck ID: Samsara vehicle ID
      '80': '123456789',
      '67': '123456790',
      '45': '123456791',
      '12': null, // Not in Samsara
      '23': '123456792',
      '34': '123456793',
      '56': '123456794'
    };

    for (const [fileMakerId, samsaraId] of Object.entries(defaultMapping)) {
      this.truckMapping.set(fileMakerId, samsaraId);
    }

    console.log(`Samsara: Initialized with ${this.truckMapping.size} truck mappings`);
  }

  /**
   * Get truck mapping configuration
   */
  getTruckMapping() {
    const mapping = {};
    for (const [fileMakerId, samsaraId] of this.truckMapping.entries()) {
      mapping[fileMakerId] = samsaraId;
    }
    return mapping;
  }

  /**
   * Update truck mapping
   */
  updateTruckMapping(fileMakerId, samsaraId) {
    this.truckMapping.set(fileMakerId, samsaraId);
    console.log(`Updated mapping: ${fileMakerId} -> ${samsaraId}`);
  }

  /**
   * Add new truck mapping
   */
  addTruckMapping(fileMakerId, samsaraId) {
    if (!fileMakerId || !samsaraId) {
      throw new Error('Both fileMakerId and samsaraId are required');
    }
    
    this.truckMapping.set(fileMakerId, samsaraId);
    return {
      success: true,
      message: `Added mapping: ${fileMakerId} -> ${samsaraId}`
    };
  }

  /**
   * Remove truck mapping
   */
  removeTruckMapping(fileMakerId) {
    const removed = this.truckMapping.delete(fileMakerId);
    return {
      success: removed,
      message: removed ? `Removed mapping for ${fileMakerId}` : `No mapping found for ${fileMakerId}`
    };
  }

  /**
   * Get current GPS location for a specific truck
   * @param {string} fileMakerId - FileMaker truck ID
   * @returns {Promise<Object>} GPS location data
   */
  async getTruckLocation(fileMakerId) {
    try {
      if (!this.isEnabled()) {
        throw new Error('Samsara integration is not enabled - no API key configured');
      }

      const samsaraId = this.truckMapping.get(fileMakerId);
      
      if (!samsaraId) {
        return {
          success: false,
          error: 'Truck not found in mapping',
          truckId: fileMakerId,
          hasSamsaraId: false
        };
      }

      // Check cache first
      const cacheKey = `truck_${samsaraId}`;
      const cached = this.gpsCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return {
          success: true,
          truckId: fileMakerId,
          samsaraId: samsaraId,
          location: cached.location,
          cached: true
        };
      }

      // Rate limiting
      await this._enforceRateLimit();

      // Fetch from Samsara API
      const response = await axios.get(`${this.apiUrl}/fleet/vehicles/locations`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          vehicleIds: samsaraId
        }
      });

      if (!response.data || !response.data.data || response.data.data.length === 0) {
        return {
          success: false,
          error: 'No location data found for vehicle',
          truckId: fileMakerId,
          samsaraId: samsaraId
        };
      }

      const vehicleData = response.data.data[0];
      const locationData = {
        latitude: vehicleData.location?.latitude,
        longitude: vehicleData.location?.longitude,
        speed: vehicleData.location?.speed || 0,
        heading: vehicleData.location?.bearing || 0,
        timestamp: vehicleData.location?.time || new Date().toISOString(),
        address: vehicleData.location?.reverseGeo || null,
        isMoving: vehicleData.location?.speed > this.verificationConfig.speedThreshold
      };

      // Cache the result
      this.gpsCache.set(cacheKey, {
        location: locationData,
        timestamp: Date.now()
      });

      return {
        success: true,
        truckId: fileMakerId,
        samsaraId: samsaraId,
        location: locationData
      };

    } catch (error) {
      console.error(`Samsara GPS error for truck ${fileMakerId}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        truckId: fileMakerId
      };
    }
  }

  /**
   * Get GPS locations for multiple trucks
   * @param {Array} fileMakerIds - Array of FileMaker truck IDs
   * @returns {Promise<Object>} Map of truck IDs to GPS data
   */
  async getMultipleTruckLocations(fileMakerIds) {
    if (!this.isEnabled()) {
      throw new Error('Samsara integration is not enabled');
    }

    const results = {};
    const trucksWithSamsaraIds = [];

    // Filter trucks that have Samsara IDs
    for (const fileMakerId of fileMakerIds) {
      const samsaraId = this.truckMapping.get(fileMakerId);
      if (samsaraId) {
        trucksWithSamsaraIds.push({ fileMakerId, samsaraId });
      } else {
        results[fileMakerId] = {
          success: false,
          error: 'No Samsara mapping',
          hasSamsaraId: false
        };
      }
    }

    // Fetch GPS data for trucks with Samsara IDs
    for (const { fileMakerId, samsaraId } of trucksWithSamsaraIds) {
      try {
        const locationData = await this.getTruckLocation(fileMakerId);
        results[fileMakerId] = locationData;
      } catch (error) {
        results[fileMakerId] = {
          success: false,
          error: error.message,
          truckId: fileMakerId
        };
      }
    }

    return {
      success: true,
      results: results,
      total: fileMakerIds.length,
      withSamsaraIds: trucksWithSamsaraIds.length,
      withoutSamsaraIds: fileMakerIds.length - trucksWithSamsaraIds.length
    };
  }

  /**
   * Verify job location against actual GPS position
   * @param {Object} job - FileMaker job data
   * @param {Object} jobLocation - Scheduled job location (lat, lng)
   * @returns {Promise<Object>} Verification result
   */
  async verifyJobLocation(job, jobLocation) {
    try {
      const truckId = job.fieldData?._kf_trucks_id;
      if (!truckId) {
        return {
          success: false,
          error: 'No truck ID in job data',
          jobId: job.recordId,
          hasSamsaraTracking: false
        };
      }

      // Get current GPS location
      const gpsResult = await this.getTruckLocation(truckId);
      
      if (!gpsResult.success) {
        return {
          success: false,
          verificationStatus: 'unknown',
          reason: 'No GPS data available',
          error: gpsResult.error,
          jobId: job.recordId,
          truckId: truckId,
          hasSamsaraTracking: !!this.truckMapping.get(truckId)
        };
      }

      const gpsLocation = gpsResult.location;
      
      // Calculate distance from scheduled location
      const distance = this._calculateDistance(
        { lat: jobLocation.lat, lng: jobLocation.lng },
        { lat: gpsLocation.latitude, lng: gpsLocation.longitude }
      );

      // Determine verification status
      const isWithinDistance = distance <= this.verificationConfig.distanceThreshold;
      const isMoving = gpsLocation.isMoving;
      
      let verificationStatus = 'verified';
      let alerts = [];

      if (!isWithinDistance) {
        verificationStatus = 'off_schedule';
        if (distance > this.verificationConfig.alertDistanceThreshold) {
          alerts.push({
            type: 'location_mismatch',
            severity: 'high',
            message: `Truck ${truckId} is ${distance.toFixed(1)} miles from scheduled location`,
            truckId: truckId,
            jobId: job.recordId,
            distance: distance,
            scheduledLocation: jobLocation,
            actualLocation: {
              lat: gpsLocation.latitude,
              lng: gpsLocation.longitude
            }
          });
        }
      }

      // Check if truck appears to be working (moving)
      if (!isMoving && verificationStatus === 'verified') {
        verificationStatus = 'idle';
      }

      return {
        success: true,
        jobId: job.recordId,
        truckId: truckId,
        verificationStatus: verificationStatus,
        distance: Math.round(distance * 100) / 100,
        isWithinThreshold: isWithinDistance,
        isMoving: isMoving,
        scheduledLocation: jobLocation,
        actualLocation: {
          lat: gpsLocation.latitude,
          lng: gpsLocation.longitude,
          speed: gpsLocation.speed,
          timestamp: gpsLocation.timestamp
        },
        alerts: alerts
      };

    } catch (error) {
      console.error('Job verification error:', error);
      return {
        success: false,
        error: error.message,
        jobId: job.recordId,
        verificationStatus: 'error'
      };
    }
  }

  /**
   * Verify multiple jobs against GPS data
   * @param {Array} jobs - Array of FileMaker jobs
   * @returns {Promise<Object>} Verification results
   */
  async verifyJobs(jobs) {
    const results = {
      verified: [],
      offSchedule: [],
      unknown: [],
      errors: [],
      summary: {
        total: jobs.length,
        verified: 0,
        offSchedule: 0,
        unknown: 0,
        errors: 0
      }
    };

    for (const job of jobs) {
      try {
        // Extract job location (this would be enhanced based on actual job structure)
        const jobLocation = this._extractJobLocation(job);
        
        if (!jobLocation) {
          results.unknown.push({
            jobId: job.recordId,
            reason: 'No location data in job',
            truckId: job.fieldData?.truck_id
          });
          results.summary.unknown++;
          continue;
        }

        const verification = await this.verifyJobLocation(job, jobLocation);
        
        if (verification.success) {
          switch (verification.verificationStatus) {
            case 'verified':
              results.verified.push(verification);
              results.summary.verified++;
              break;
            case 'off_schedule':
              results.offSchedule.push(verification);
              results.summary.offSchedule++;
              break;
            case 'idle':
              results.verified.push(verification);
              results.summary.verified++;
              break;
            default:
              results.unknown.push(verification);
              results.summary.unknown++;
              break;
          }
        } else {
          results.errors.push(verification);
          results.summary.errors++;
        }

      } catch (error) {
        console.error(`Error verifying job ${job.recordId}:`, error);
        results.errors.push({
          jobId: job.recordId,
          error: error.message,
          truckId: job.fieldData?.truck_id
        });
        results.summary.errors++;
      }
    }

    return {
      success: true,
      results: results,
      resultsByJobId: this._convertResultsToByJobId(results),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get fleet GPS status summary
   * @returns {Promise<Object>} Fleet status overview
   */
  async getFleetGpsStatus() {
    const mapping = this.getTruckMapping();
    const truckIds = Object.keys(mapping);
    
    const locationResults = await this.getMultipleTruckLocations(truckIds);
    
    const status = {
      totalTrucks: truckIds.length,
      trucksWithGps: 0,
      trucksWithoutGps: 0,
      activeTrucks: 0,
      idleTrucks: 0,
      trucks: [],
      summary: {
        total: truckIds.length,
        withGps: 0,
        withoutGps: 0,
        active: 0,
        idle: 0
      }
    };

    for (const fileMakerId of truckIds) {
      const result = locationResults.results[fileMakerId];
      
      if (result && result.success) {
        status.trucksWithGps++;
        status.summary.withGps++;
        
        if (result.location.isMoving) {
          status.activeTrucks++;
          status.summary.active++;
        } else {
          status.idleTrucks++;
          status.summary.idle++;
        }

        status.trucks.push({
          truckId: fileMakerId,
          samsaraId: mapping[fileMakerId],
          location: result.location,
          status: result.location.isMoving ? 'active' : 'idle',
          lastUpdate: result.location.timestamp
        });
      } else {
        status.trucksWithoutGps++;
        status.summary.withoutGps++;
        
        status.trucks.push({
          truckId: fileMakerId,
          samsaraId: mapping[fileMakerId],
          status: result?.hasSamsaraId ? 'no_data' : 'no_mapping',
          error: result?.error
        });
      }
    }

    return {
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Force refresh GPS data (clear cache)
   */
  clearGpsCache() {
    this.gpsCache.clear();
    return {
      success: true,
      message: 'GPS cache cleared'
    };
  }

  /**
   * Get service configuration and health
   */
  getServiceInfo() {
    return {
      enabled: this.isEnabled(),
      apiConfigured: !!this.apiKey,
      truckMappings: this.truckMapping.size,
      cacheSize: this.gpsCache.size,
      verificationConfig: this.verificationConfig,
      rateLimits: this.rateLimits
    };
  }

  // Private helper methods

  /**
   * Enforce API rate limiting
   * @private
   */
  async _enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.rateLimits.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimits.minRequestInterval) {
      const waitTime = this.rateLimits.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.rateLimits.lastRequestTime = Date.now();
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @private
   */
  _calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2) return 0;
    
    const R = 3959; // Earth radius in miles
    const dLat = this._toRad(coord2.lat - coord1.lat);
    const dLng = this._toRad(coord2.lng - coord1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRad(coord1.lat)) * Math.cos(this._toRad(coord2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @private
   */
  _toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert array-based results to job ID indexed format for alert rules
   * @private
   */
  _convertResultsToByJobId(results) {
    const byJobId = {};
    
    // Process verified jobs
    for (const result of results.verified) {
      if (result.jobId) {
        byJobId[result.jobId] = result;
      }
    }
    
    // Process off-schedule jobs
    for (const result of results.offSchedule) {
      if (result.jobId) {
        byJobId[result.jobId] = result;
      }
    }
    
    // Process unknown jobs
    for (const result of results.unknown) {
      if (result.jobId) {
        byJobId[result.jobId] = result;
      }
    }
    
    // Process error jobs
    for (const result of results.errors) {
      if (result.jobId) {
        byJobId[result.jobId] = result;
      }
    }
    
    return byJobId;
  }

  /**
   * Extract job location from job data
   * This would be customized based on actual FileMaker job structure
   * @private
   */
  _extractJobLocation(job) {
    // This is a simplified example - customize based on actual job structure
    const fieldData = job.fieldData || {};
    
    // Try common location field names
    const possibleLatFields = ['job_latitude', 'latitude', 'job_lat', 'lat'];
    const possibleLngFields = ['job_longitude', 'longitude', 'job_lng', 'lng'];
    const possibleAddressFields = ['job_address', 'address', 'location'];
    
    let lat = null;
    let lng = null;
    
    // Find latitude
    for (const field of possibleLatFields) {
      if (fieldData[field]) {
        lat = parseFloat(fieldData[field]);
        break;
      }
    }
    
    // Find longitude
    for (const field of possibleLngFields) {
      if (fieldData[field]) {
        lng = parseFloat(fieldData[field]);
        break;
      }
    }
    
    // If we have coordinates, return them
    if (lat !== null && lng !== null) {
      return { lat, lng };
    }
    
    // If we have an address, return it (would need geocoding in real implementation)
    for (const field of possibleAddressFields) {
      if (fieldData[field]) {
        return { address: fieldData[field] };
      }
    }
    
    return null;
  }
}

// Export singleton instance
module.exports = new SamsaraIntegrationService();
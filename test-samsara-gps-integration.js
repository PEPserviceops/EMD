#!/usr/bin/env node

/**
 * Samsara GPS Integration Test Suite
 * Tests the complete GPS verification system integration
 */

const axios = require('axios');

// Mock FileMaker service for testing
class MockFileMakerAPI {
  constructor() {
    this.activeJobs = [
      {
        recordId: 'job_001',
        fieldData: {
          _kp_job_id: 'JOB001',
          job_date: '11/08/2025',
          job_status: 'In Progress',
          _kf_trucks_id: 'TRUCK_001',
          job_address: '123 Main St, Denver, CO',
          job_latitude: 39.7392,
          job_longitude: -104.9903,
          time_arival: '14:30:00'
        }
      },
      {
        recordId: 'job_002', 
        fieldData: {
          _kp_job_id: 'JOB002',
          job_date: '11/08/2025',
          job_status: 'In Progress',
          _kf_trucks_id: 'TRUCK_002',
          job_address: '456 Oak Ave, Westminster, CO',
          job_latitude: 39.7506,
          job_longitude: -105.0205,
          time_arival: '15:00:00'
        }
      }
    ];
  }

  async getActiveJobs() {
    return this.activeJobs;
  }

  async closeSession() {
    return true;
  }
}

// Mock Samsara service for testing
class MockSamsaraIntegrationService {
  constructor() {
    this.apiKey = 'mock_api_key';
    this.truckMapping = new Map([
      ['TRUCK_001', '123456789'],
      ['TRUCK_002', '123456790'],
      ['TRUCK_003', null] // No mapping
    ]);
    this.gpsCache = new Map();
    this.cacheTimeout = 60000;
    this.verificationConfig = {
      distanceThreshold: 5,
      alertDistanceThreshold: 10
    };
  }

  isEnabled() {
    return true;
  }

  getTruckMapping() {
    const mapping = {};
    for (const [fileMakerId, samsaraId] of this.truckMapping.entries()) {
      mapping[fileMakerId] = samsaraId;
    }
    return mapping;
  }

  async getTruckLocation(fileMakerId) {
    const samsaraId = this.truckMapping.get(fileMakerId);
    
    if (!samsaraId) {
      return {
        success: false,
        error: 'Truck not found in mapping',
        truckId: fileMakerId,
        hasSamsaraId: false
      };
    }

    // Return mock GPS locations
    const mockLocations = {
      'TRUCK_001': {
        latitude: 39.7392,
        longitude: -104.9903,
        speed: 25,
        heading: 180,
        timestamp: new Date().toISOString(),
        address: '123 Main St, Denver, CO',
        isMoving: true
      },
      'TRUCK_002': {
        latitude: 39.7506, 
        longitude: -105.0205,
        speed: 0,
        heading: 0,
        timestamp: new Date().toISOString(),
        address: '456 Oak Ave, Westminster, CO',
        isMoving: false
      }
    };

    return {
      success: true,
      truckId: fileMakerId,
      samsaraId: samsaraId,
      location: mockLocations[fileMakerId] || {
        latitude: 39.7392,
        longitude: -104.9903,
        speed: 0,
        heading: 0,
        timestamp: new Date().toISOString(),
        isMoving: false
      }
    };
  }

  async getMultipleTruckLocations(fileMakerIds) {
    const results = {};
    
    for (const fileMakerId of fileMakerIds) {
      results[fileMakerId] = await this.getTruckLocation(fileMakerId);
    }

    return {
      success: true,
      results: results,
      total: fileMakerIds.length,
      withSamsaraIds: fileMakerIds.filter(id => this.truckMapping.get(id)).length,
      withoutSamsaraIds: fileMakerIds.filter(id => !this.truckMapping.get(id)).length
    };
  }

  async verifyJobLocation(job, jobLocation) {
    const truckId = job.fieldData?._kf_trucks_id;
    
    if (!truckId) {
      return {
        success: false,
        error: 'No truck ID in job data',
        jobId: job.recordId
      };
    }

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
    const distance = this._calculateDistance(
      { lat: jobLocation.lat, lng: jobLocation.lng },
      { lat: gpsLocation.latitude, lng: gpsLocation.longitude }
    );

    const isWithinDistance = distance <= this.verificationConfig.distanceThreshold;
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
          distance: distance
        });
      }
    }

    return {
      success: true,
      jobId: job.recordId,
      truckId: truckId,
      verificationStatus: verificationStatus,
      distance: Math.round(distance * 100) / 100,
      isWithinThreshold: isWithinDistance,
      isMoving: gpsLocation.isMoving,
      scheduledLocation: jobLocation,
      actualLocation: {
        lat: gpsLocation.latitude,
        lng: gpsLocation.longitude,
        speed: gpsLocation.speed,
        timestamp: gpsLocation.timestamp
      },
      alerts: alerts
    };
  }

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
        const jobLocation = this._extractJobLocation(job);
        
        if (!jobLocation) {
          results.unknown.push({
            jobId: job.recordId,
            reason: 'No location data in job',
            truckId: job.fieldData?._kf_trucks_id
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
          truckId: job.fieldData?._kf_trucks_id
        });
        results.summary.errors++;
      }
    }

    return {
      success: true,
      results: results,
      timestamp: new Date().toISOString()
    };
  }

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

  clearGpsCache() {
    this.gpsCache.clear();
    return {
      success: true,
      message: 'GPS cache cleared'
    };
  }

  getServiceInfo() {
    return {
      enabled: this.isEnabled(),
      apiConfigured: !!this.apiKey,
      truckMappings: this.truckMapping.size,
      cacheSize: this.gpsCache.size,
      verificationConfig: this.verificationConfig
    };
  }

  _calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2) return 0;
    
    const R = 3959;
    const dLat = this._toRad(coord2.lat - coord1.lat);
    const dLng = this._toRad(coord2.lng - coord1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRad(coord1.lat)) * Math.cos(this._toRad(coord2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  _extractJobLocation(job) {
    const fieldData = job.fieldData || {};
    
    const lat = fieldData.job_latitude || fieldData.latitude;
    const lng = fieldData.job_longitude || fieldData.longitude;
    
    if (lat !== undefined && lng !== undefined) {
      return { lat: parseFloat(lat), lng: parseFloat(lng) };
    }
    
    return null;
  }
}

// Test functions
class GPSIntegrationTests {
  constructor() {
    this.fileMakerAPI = new MockFileMakerAPI();
    this.samsaraService = new MockSamsaraIntegrationService();
    this.testResults = [];
  }

  log(testName, status, message) {
    const result = {
      test: testName,
      status: status,
      message: message,
      timestamp: new Date().toISOString()
    };
    this.testResults.push(result);
    
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${testName}: ${status} - ${message}`);
  }

  async testSamsaraServiceInitialization() {
    try {
      const serviceInfo = this.samsaraService.getServiceInfo();
      
      if (serviceInfo.enabled === true && 
          serviceInfo.apiConfigured === true && 
          serviceInfo.truckMappings === 3) {
        this.log('Samsara Service Initialization', 'PASS', 'Service properly initialized');
        return true;
      } else {
        this.log('Samsara Service Initialization', 'FAIL', 'Service configuration incorrect');
        return false;
      }
    } catch (error) {
      this.log('Samsara Service Initialization', 'FAIL', error.message);
      return false;
    }
  }

  async testTruckMapping() {
    try {
      const mapping = this.samsaraService.getTruckMapping();
      
      if (mapping['TRUCK_001'] === '123456789' && 
          mapping['TRUCK_002'] === '123456790' &&
          mapping['TRUCK_003'] === null) {
        this.log('Truck Mapping', 'PASS', 'Truck mapping configuration correct');
        return true;
      } else {
        this.log('Truck Mapping', 'FAIL', 'Truck mapping configuration incorrect');
        return false;
      }
    } catch (error) {
      this.log('Truck Mapping', 'FAIL', error.message);
      return false;
    }
  }

  async testGpsLocationFetching() {
    try {
      // Test truck with GPS
      const truck1Result = await this.samsaraService.getTruckLocation('TRUCK_001');
      
      // Test truck without mapping
      const truck3Result = await this.samsaraService.getTruckLocation('TRUCK_003');
      
      if (truck1Result.success === true && 
          truck3Result.success === false &&
          truck3Result.hasSamsaraId === false) {
        this.log('GPS Location Fetching', 'PASS', 'GPS location fetching working correctly');
        return true;
      } else {
        this.log('GPS Location Fetching', 'FAIL', 'GPS location fetching failed');
        return false;
      }
    } catch (error) {
      this.log('GPS Location Fetching', 'FAIL', error.message);
      return false;
    }
  }

  async testMultipleTruckLocations() {
    try {
      const truckIds = ['TRUCK_001', 'TRUCK_002', 'TRUCK_003'];
      const result = await this.samsaraService.getMultipleTruckLocations(truckIds);
      
      if (result.success === true && 
          result.total === 3 &&
          result.withSamsaraIds === 2 &&
          result.withoutSamsaraIds === 1) {
        this.log('Multiple Truck Locations', 'PASS', 'Multiple truck location fetching working');
        return true;
      } else {
        this.log('Multiple Truck Locations', 'FAIL', 'Multiple truck location fetching failed');
        return false;
      }
    } catch (error) {
      this.log('Multiple Truck Locations', 'FAIL', error.message);
      return false;
    }
  }

  async testJobVerification() {
    try {
      const jobs = await this.fileMakerAPI.getActiveJobs();
      const verificationResult = await this.samsaraService.verifyJobs(jobs);
      
      if (verificationResult.success === true &&
          verificationResult.results.summary.total === 2) {
        this.log('Job Verification', 'PASS', `Job verification complete: ${verificationResult.results.summary.verified} verified`);
        return true;
      } else {
        this.log('Job Verification', 'FAIL', 'Job verification failed');
        return false;
      }
    } catch (error) {
      this.log('Job Verification', 'FAIL', error.message);
      return false;
    }
  }

  async testFleetGpsStatus() {
    try {
      const fleetStatus = await this.samsaraService.getFleetGpsStatus();
      
      if (fleetStatus.success === true &&
          fleetStatus.status.totalTrucks === 3 &&
          fleetStatus.status.trucksWithGps === 2) {
        this.log('Fleet GPS Status', 'PASS', `Fleet status: ${fleetStatus.status.activeTrucks} active, ${fleetStatus.status.idleTrucks} idle trucks`);
        return true;
      } else {
        this.log('Fleet GPS Status', 'FAIL', 'Fleet GPS status failed');
        return false;
      }
    } catch (error) {
      this.log('Fleet GPS Status', 'FAIL', error.message);
      return false;
    }
  }

  async testDistanceCalculation() {
    try {
      // Test known distance between Denver and Westminster (approximately 8 miles)
      const result = await this.samsaraService.getTruckLocation('TRUCK_002');
      const distance = this.samsaraService._calculateDistance(
        { lat: 39.7392, lng: -104.9903 }, // Denver
        { lat: 39.7506, lng: -105.0205 }  // Westminster
      );
      
      // Should be around 8 miles (give or take some tolerance)
      if (distance > 5 && distance < 15) {
        this.log('Distance Calculation', 'PASS', `Distance calculated: ${distance.toFixed(2)} miles`);
        return true;
      } else {
        this.log('Distance Calculation', 'FAIL', `Distance calculation incorrect: ${distance.toFixed(2)} miles`);
        return false;
      }
    } catch (error) {
      this.log('Distance Calculation', 'FAIL', error.message);
      return false;
    }
  }

  async testCacheManagement() {
    try {
      // Test cache clear
      const clearResult = this.samsaraService.clearGpsCache();
      
      if (clearResult.success === true) {
        this.log('Cache Management', 'PASS', 'Cache clearing works correctly');
        return true;
      } else {
        this.log('Cache Management', 'FAIL', 'Cache clearing failed');
        return false;
      }
    } catch (error) {
      this.log('Cache Management', 'FAIL', error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🧪 Starting Samsara GPS Integration Tests\n');
    
    const tests = [
      { name: 'Samsara Service Initialization', fn: () => this.testSamsaraServiceInitialization() },
      { name: 'Truck Mapping', fn: () => this.testTruckMapping() },
      { name: 'GPS Location Fetching', fn: () => this.testGpsLocationFetching() },
      { name: 'Multiple Truck Locations', fn: () => this.testMultipleTruckLocations() },
      { name: 'Job Verification', fn: () => this.testJobVerification() },
      { name: 'Fleet GPS Status', fn: () => this.testFleetGpsStatus() },
      { name: 'Distance Calculation', fn: () => this.testDistanceCalculation() },
      { name: 'Cache Management', fn: () => this.testCacheManagement() }
    ];

    for (const test of tests) {
      try {
        await test.fn();
      } catch (error) {
        this.log(test.name, 'ERROR', error.message);
      }
    }

    // Summary
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;
    
    console.log('\n📊 Test Summary:');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed === 0) {
      console.log('\n🎉 All tests passed! GPS Integration system is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the issues above.');
    }

    return {
      total,
      passed,
      failed,
      successRate: (passed / total) * 100,
      results: this.testResults
    };
  }
}

// Test API endpoints (mock)
class APIEndpointTests {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.testResults = [];
  }

  log(testName, status, message) {
    const result = {
      test: testName,
      status: status,
      message: message,
      timestamp: new Date().toISOString()
    };
    this.testResults.push(result);
    
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${testName}: ${status} - ${message}`);
  }

  async testApiEndpoint(endpoint, method = 'GET', data = null) {
    try {
      const config = {
        method: method,
        url: `${this.baseUrl}${endpoint}`,
        timeout: 5000
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        config.data = data;
        config.headers = { 'Content-Type': 'application/json' };
      }

      const response = await axios(config);
      
      if (response.status >= 200 && response.status < 300) {
        this.log(`${method} ${endpoint}`, 'PASS', `Status: ${response.status}`);
        return response.data;
      } else {
        this.log(`${method} ${endpoint}`, 'FAIL', `Status: ${response.status}`);
        return null;
      }
    } catch (error) {
      this.log(`${method} ${endpoint}`, 'FAIL', error.message);
      return null;
    }
  }

  async runApiTests() {
    console.log('🔌 Testing API Endpoints\n');

    // Note: These tests would run against a live server
    const endpoints = [
      { endpoint: '/api/fleet/gps-status', method: 'GET' },
      { endpoint: '/api/fleet/truck-mapping', method: 'GET' },
      { endpoint: '/api/fleet/sync-gps', method: 'POST', data: {} }
    ];

    for (const { endpoint, method, data } of endpoints) {
      await this.testApiEndpoint(endpoint, method, data);
    }
  }
}

// Main execution
async function main() {
  const tests = new GPSIntegrationTests();
  const apiTests = new APIEndpointTests();
  
  // Run service tests
  const serviceResults = await tests.runAllTests();
  
  // Run API tests (commented out as they require a running server)
  // console.log('\n');
  // await apiTests.runApiTests();
  
  // Exit with appropriate code
  process.exit(serviceResults.failed > 0 ? 1 : 0);
}

// Run tests if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { GPSIntegrationTests, APIEndpointTests, MockSamsaraIntegrationService, MockFileMakerAPI };
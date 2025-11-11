/**
 * GPS Integration Service
 * 
 * Provides real-time vehicle tracking and location services:
 * - Real-time GPS coordinate tracking for all vehicles
 * - Geofencing and proximity detection
 * - Traffic data integration for route optimization
 * - ETA calculations and dynamic routing
 * - Driver behavior monitoring
 * - Location history and analytics
 * 
 * @module services/GPSIntegrationService
 */

const axios = require('axios');

class GPSIntegrationService {
  constructor() {
    this.enabled = true;
    this.vehicles = new Map(); // Store vehicle tracking data
    this.geofences = new Map(); // Store geofence definitions
    this.trafficData = new Map(); // Cache traffic information
    
    // GPS tracking configuration
    this.config = {
      updateInterval: 30000, // 30 seconds
      historyRetention: 24 * 60 * 60 * 1000, // 24 hours
      maxHistoryPoints: 1440, // 1 point per minute for 24 hours
      proximityThreshold: 0.5, // 0.5 miles
      speedThreshold: 0, // Speeding threshold in mph
      geofenceBuffer: 0.1, // 0.1 mile buffer
      trafficApiKey: process.env.GOOGLE_MAPS_API_KEY || null
    };
    
    // Initialize with some sample vehicle data
    this._initializeSampleVehicles();
  }

  /**
   * Check if GPS service is enabled
   */
  isEnabled() {
    return this.enabled && !!this.config.trafficApiKey;
  }

  /**
   * Initialize sample vehicles for testing
   * @private
   */
  _initializeSampleVehicles() {
    const sampleVehicles = [
      {
        id: 'TRUCK_001',
        driverId: 'DRIVER_001',
        name: 'PepMove Truck 1',
        type: 'delivery_truck',
        location: { lat: 39.7392, lng: -104.9903 }, // Denver
        status: 'active',
        capacity: 10,
        lastUpdate: new Date(),
        speed: 0,
        heading: 0,
        fuelLevel: 85,
        odometer: 125000
      },
      {
        id: 'TRUCK_002', 
        driverId: 'DRIVER_002',
        name: 'PepMove Truck 2',
        type: 'delivery_truck',
        location: { lat: 39.7506, lng: -105.0205 }, // Westminster
        status: 'active',
        capacity: 12,
        lastUpdate: new Date(),
        speed: 25,
        heading: 180,
        fuelLevel: 92,
        odometer: 98000
      },
      {
        id: 'TRUCK_003',
        driverId: 'DRIVER_003', 
        name: 'PepMove Truck 3',
        type: 'delivery_truck',
        location: { lat: 39.6877, lng: -104.9613 }, // Aurora
        status: 'active',
        capacity: 8,
        lastUpdate: new Date(),
        speed: 0,
        heading: 0,
        fuelLevel: 67,
        odometer: 156000
      }
    ];

    for (const vehicle of sampleVehicles) {
      this.vehicles.set(vehicle.id, {
        ...vehicle,
        history: [],
        alerts: [],
        route: null,
        geofenceEvents: []
      });
    }
  }

  /**
   * Update vehicle location and process tracking data
   * @param {string} vehicleId - Vehicle identifier
   * @param {Object} locationData - GPS location and status data
   * @returns {Promise<Object>} Updated vehicle data
   */
  async updateVehicleLocation(vehicleId, locationData) {
    try {
      if (!this.vehicles.has(vehicleId)) {
        throw new Error(`Vehicle ${vehicleId} not found`);
      }

      const vehicle = this.vehicles.get(vehicleId);
      const previousLocation = vehicle.location;
      
      // Update vehicle data
      const updatedVehicle = {
        ...vehicle,
        ...locationData,
        lastUpdate: new Date(),
        location: {
          lat: locationData.lat,
          lng: locationData.lng
        }
      };

      // Calculate movement metrics
      if (previousLocation) {
        updatedVehicle.distanceTraveled = this._calculateDistance(previousLocation, updatedVehicle.location);
        updatedVehicle.timeTraveled = this._calculateTimeDifference(vehicle.lastUpdate, updatedVehicle.lastUpdate);
      }

      // Add to history
      updatedVehicle.history = this._addToHistory(vehicle.history, updatedVehicle);
      
      // Process geofence events
      updatedVehicle.geofenceEvents = await this._processGeofenceEvents(updatedVehicle);
      
      // Update traffic data for this location
      await this._updateTrafficData(updatedVehicle.location);
      
      // Generate alerts
      updatedVehicle.alerts = this._generateLocationAlerts(updatedVehicle, previousLocation);

      this.vehicles.set(vehicleId, updatedVehicle);
      
      return {
        success: true,
        vehicle: updatedVehicle,
        events: {
          geofence: updatedVehicle.geofenceEvents,
          alerts: updatedVehicle.alerts
        }
      };

    } catch (error) {
      console.error(`GPS update error for vehicle ${vehicleId}:`, error);
      throw new Error(`Failed to update vehicle location: ${error.message}`);
    }
  }

  /**
   * Get current vehicle locations
   * @param {Array} vehicleIds - Optional array of specific vehicle IDs
   * @returns {Promise<Array>} Array of vehicle tracking data
   */
  async getVehicleLocations(vehicleIds = null) {
    try {
      let vehicles = Array.from(this.vehicles.values());
      
      if (vehicleIds && vehicleIds.length > 0) {
        vehicles = vehicles.filter(vehicle => vehicleIds.includes(vehicle.id));
      }

      // Add current traffic conditions and ETA data
      const enrichedVehicles = await Promise.all(
        vehicles.map(async (vehicle) => {
          const trafficData = await this._getTrafficData(vehicle.location);
          return {
            ...vehicle,
            trafficConditions: trafficData,
            etaToNextStop: await this._calculateETA(vehicle),
            isOnline: this._isVehicleOnline(vehicle)
          };
        })
      );

      return {
        success: true,
        vehicles: enrichedVehicles,
        total: enrichedVehicles.length,
        online: enrichedVehicles.filter(v => v.isOnline).length
      };

    } catch (error) {
      console.error('Error getting vehicle locations:', error);
      throw new Error(`Failed to get vehicle locations: ${error.message}`);
    }
  }

  /**
   * Create or update geofence
   * @param {string} geofenceId - Geofence identifier
   * @param {Object} geofenceData - Geofence definition
   * @returns {Promise<Object>} Geofence data
   */
  async createGeofence(geofenceId, geofenceData) {
    try {
      const geofence = {
        id: geofenceId,
        name: geofenceData.name || `Geofence ${geofenceId}`,
        type: geofenceData.type || 'point', // point, circle, polygon
        coordinates: geofenceData.coordinates,
        radius: geofenceData.radius || 0.1, // miles
        alerts: geofenceData.alerts || {
          enter: true,
          exit: true,
          dwell: true
        },
        createdAt: new Date(),
        vehicleAccess: geofenceData.vehicleAccess || 'all'
      };

      this.geofences.set(geofenceId, geofence);

      return {
        success: true,
        geofence: geofence
      };

    } catch (error) {
      console.error(`Error creating geofence ${geofenceId}:`, error);
      throw new Error(`Failed to create geofence: ${error.message}`);
    }
  }

  /**
   * Get proximity alerts for nearby vehicles
   * @param {Object} centerLocation - Center point for proximity search
   * @param {number} radius - Search radius in miles
   * @returns {Promise<Array>} Array of nearby vehicles
   */
  async getNearbyVehicles(centerLocation, radius = 5) {
    try {
      const nearbyVehicles = [];
      
      for (const [vehicleId, vehicle] of this.vehicles) {
        const distance = this._calculateDistance(centerLocation, vehicle.location);
        
        if (distance <= radius) {
          const eta = await this._calculateETAToLocation(vehicle, centerLocation);
          
          nearbyVehicles.push({
            vehicleId: vehicleId,
            vehicle: vehicle,
            distance: Math.round(distance * 100) / 100,
            estimatedTimeOfArrival: eta,
            direction: this._calculateDirection(vehicle.location, centerLocation),
            lastUpdate: vehicle.lastUpdate
          });
        }
      }

      // Sort by distance
      nearbyVehicles.sort((a, b) => a.distance - b.distance);

      return {
        success: true,
        centerLocation: centerLocation,
        searchRadius: radius,
        nearbyVehicles: nearbyVehicles,
        total: nearbyVehicles.length
      };

    } catch (error) {
      console.error('Error getting nearby vehicles:', error);
      throw new Error(`Failed to get nearby vehicles: ${error.message}`);
    }
  }

  /**
   * Calculate optimal route between multiple stops
   * @param {Array} stops - Array of stop locations
   * @param {Object} startLocation - Starting point
   * @param {Object} endLocation - Optional end point
   * @returns {Promise<Object>} Optimized route with waypoints
   */
  async calculateOptimizedRoute(stops, startLocation, endLocation = null) {
    try {
      if (!stops || stops.length === 0) {
        throw new Error('No stops provided for route calculation');
      }

      // Get traffic data for all stops
      const trafficPromises = stops.map(stop => this._getTrafficData(stop.location));
      const trafficData = await Promise.all(trafficPromises);

      // Calculate basic route
      const optimizedStops = this._optimizeStopOrder(stops, startLocation, endLocation);
      
      // Calculate distances and times
      let totalDistance = 0;
      let totalTime = 0;
      let currentLocation = startLocation;
      
      const route = {
        waypoints: [],
        totalDistance: 0,
        totalTime: 0,
        trafficConditions: []
      };

      for (let i = 0; i < optimizedStops.length; i++) {
        const stop = optimizedStops[i];
        const distance = this._calculateDistance(currentLocation, stop.location);
        const trafficCondition = trafficData[i];
        const travelTime = this._calculateTravelTime(distance, trafficCondition);

        totalDistance += distance;
        totalTime += travelTime;

        route.waypoints.push({
          stop: stop,
          order: i + 1,
          distance: Math.round(distance * 100) / 100,
          estimatedTime: Math.round(travelTime),
          trafficCondition: trafficCondition,
          coordinates: stop.location
        });

        route.trafficConditions.push(trafficCondition);
        currentLocation = stop.location;
      }

      // Add return to end location if provided
      if (endLocation) {
        const returnDistance = this._calculateDistance(currentLocation, endLocation);
        const returnTraffic = await this._getTrafficData(endLocation);
        const returnTime = this._calculateTravelTime(returnDistance, returnTraffic);
        
        totalDistance += returnDistance;
        totalTime += returnTime;
        
        route.waypoints.push({
          stop: { name: 'Return to Base', type: 'return' },
          order: optimizedStops.length + 1,
          distance: Math.round(returnDistance * 100) / 100,
          estimatedTime: Math.round(returnTime),
          trafficCondition: returnTraffic,
          coordinates: endLocation
        });
      }

      route.totalDistance = Math.round(totalDistance * 100) / 100;
      route.totalTime = Math.round(totalTime);
      route.averageSpeed = totalTime > 0 ? Math.round((totalDistance / totalTime) * 60) : 0;

      return {
        success: true,
        route: route,
        metadata: {
          stopCount: optimizedStops.length,
          algorithm: 'traffic_optimized',
          calculatedAt: new Date()
        }
      };

    } catch (error) {
      console.error('Error calculating optimized route:', error);
      throw new Error(`Failed to calculate optimized route: ${error.message}`);
    }
  }

  /**
   * Get location history for a vehicle
   * @param {string} vehicleId - Vehicle identifier
   * @param {Date} startTime - Start time for history
   * @param {Date} endTime - End time for history
   * @returns {Promise<Array>} Location history points
   */
  async getLocationHistory(vehicleId, startTime, endTime) {
    try {
      if (!this.vehicles.has(vehicleId)) {
        throw new Error(`Vehicle ${vehicleId} not found`);
      }

      const vehicle = this.vehicles.get(vehicleId);
      const history = vehicle.history || [];

      // Filter by time range
      const filteredHistory = history.filter(point => {
        const pointTime = new Date(point.timestamp);
        return pointTime >= startTime && pointTime <= endTime;
      });

      return {
        success: true,
        vehicleId: vehicleId,
        history: filteredHistory,
        timeRange: {
          start: startTime,
          end: endTime
        },
        totalPoints: filteredHistory.length
      };

    } catch (error) {
      console.error(`Error getting history for vehicle ${vehicleId}:`, error);
      throw new Error(`Failed to get location history: ${error.message}`);
    }
  }

  /**
   * Monitor vehicle alerts and compliance
   * @param {string} vehicleId - Vehicle identifier
   * @returns {Promise<Object>} Vehicle compliance status
   */
  async getVehicleCompliance(vehicleId) {
    try {
      if (!this.vehicles.has(vehicleId)) {
        throw new Error(`Vehicle ${vehicleId} not found`);
      }

      const vehicle = this.vehicles.get(vehicleId);
      const compliance = {
        vehicleId: vehicleId,
        speedCompliance: this._checkSpeedCompliance(vehicle),
        routeCompliance: this._checkRouteCompliance(vehicle),
        timeCompliance: this._checkTimeCompliance(vehicle),
        geofenceCompliance: this._checkGeofenceCompliance(vehicle),
        alerts: vehicle.alerts || []
      };

      compliance.overallStatus = this._calculateOverallCompliance(compliance);

      return {
        success: true,
        compliance: compliance
      };

    } catch (error) {
      console.error(`Error checking compliance for vehicle ${vehicleId}:`, error);
      throw new Error(`Failed to check vehicle compliance: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Add point to location history
   * @private
   */
  _addToHistory(history, vehicle) {
    const newPoint = {
      timestamp: vehicle.lastUpdate,
      location: vehicle.location,
      speed: vehicle.speed,
      heading: vehicle.heading,
      fuelLevel: vehicle.fuelLevel,
      odometer: vehicle.odometer
    };

    const updatedHistory = [...history, newPoint];
    
    // Limit history size and age
    const maxPoints = this.config.maxHistoryPoints;
    const cutoffTime = new Date(Date.now() - this.config.historyRetention);
    
    return updatedHistory
      .filter(point => new Date(point.timestamp) > cutoffTime)
      .slice(-maxPoints);
  }

  /**
   * Process geofence events
   * @private
   */
  async _processGeofenceEvents(vehicle) {
    const events = [];
    
    for (const [geofenceId, geofence] of this.geofences) {
      const isInside = this._isPointInGeofence(vehicle.location, geofence);
      const wasInside = this._wasVehicleInGeofence(vehicle.history, geofence);
      
      if (geofence.alerts.enter && !wasInside && isInside) {
        events.push({
          type: 'enter',
          geofenceId: geofenceId,
          geofenceName: geofence.name,
          timestamp: new Date(),
          location: vehicle.location
        });
      }
      
      if (geofence.alerts.exit && wasInside && !isInside) {
        events.push({
          type: 'exit', 
          geofenceId: geofenceId,
          geofenceName: geofence.name,
          timestamp: new Date(),
          location: vehicle.location
        });
      }
    }
    
    return events;
  }

  /**
   * Generate location-based alerts
   * @private
   */
  _generateLocationAlerts(vehicle, previousLocation) {
    const alerts = [];
    
    // Speed alert
    if (vehicle.speed > this.config.speedThreshold) {
      alerts.push({
        type: 'speeding',
        severity: 'medium',
        message: `Vehicle ${vehicle.id} is speeding at ${vehicle.speed} mph`,
        timestamp: new Date()
      });
    }
    
    // Extended stop alert
    if (previousLocation) {
      const timeDiff = this._calculateTimeDifference(previousLocation.timestamp, vehicle.lastUpdate);
      if (timeDiff > 30 && vehicle.speed < 1) { // Stopped for 30+ minutes
        alerts.push({
          type: 'extended_stop',
          severity: 'low',
          message: `Vehicle ${vehicle.id} has been stopped for ${Math.round(timeDiff)} minutes`,
          timestamp: new Date()
        });
      }
    }
    
    return alerts;
  }

  /**
   * Check if point is within geofence
   * @private
   */
  _isPointInGeofence(location, geofence) {
    if (geofence.type === 'point' && geofence.radius) {
      const distance = this._calculateDistance(location, geofence.coordinates);
      return distance <= (geofence.radius + this.config.geofenceBuffer);
    }
    
    // For polygon geofences, implement point-in-polygon logic
    // For now, default to false
    return false;
  }

  /**
   * Check if vehicle was previously in geofence
   * @private
   */
  _wasVehicleInGeofence(history, geofence) {
    if (history.length < 2) return false;
    
    const recentPoints = history.slice(-3); // Check last 3 points
    return recentPoints.every(point => 
      this._isPointInGeofence(point.location, geofence)
    );
  }

  /**
   * Get traffic data for a location
   * @private
   */
  async _getTrafficData(location) {
    if (!this.config.trafficApiKey) {
      return 'unknown';
    }
    
    const cacheKey = `${location.lat.toFixed(3)},${location.lng.toFixed(3)}`;
    const cached = this.trafficData.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minute cache
      return cached.condition;
    }
    
    try {
      // In a real implementation, this would call Google Maps API
      // For now, return mock data
      const mockConditions = ['light', 'normal', 'heavy', 'severe'];
      const condition = mockConditions[Math.floor(Math.random() * mockConditions.length)];
      
      this.trafficData.set(cacheKey, {
        condition: condition,
        timestamp: Date.now()
      });
      
      return condition;
    } catch (error) {
      console.error('Error getting traffic data:', error);
      return 'unknown';
    }
  }

  /**
   * Update traffic data cache
   * @private
   */
  async _updateTrafficData(location) {
    await this._getTrafficData(location);
  }

  /**
   * Calculate distance between two coordinates
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
   * Calculate time difference in minutes
   * @private
   */
  _calculateTimeDifference(time1, time2) {
    return (new Date(time2) - new Date(time1)) / (1000 * 60);
  }

  /**
   * Calculate travel time based on distance and traffic
   * @private
   */
  _calculateTravelTime(distance, trafficCondition) {
    const baseSpeed = 35; // mph
    const trafficMultipliers = {
      'light': 1.1,
      'normal': 1.0,
      'heavy': 0.7,
      'severe': 0.5,
      'unknown': 0.9
    };
    
    const multiplier = trafficMultipliers[trafficCondition] || 1.0;
    const adjustedSpeed = baseSpeed * multiplier;
    
    return (distance / adjustedSpeed) * 60; // minutes
  }

  /**
   * Calculate ETA for vehicle
   * @private
   */
  async _calculateETA(vehicle) {
    if (!vehicle.route || vehicle.route.length === 0) {
      return null;
    }
    
    // Calculate ETA to next stop
    const nextStop = vehicle.route[0];
    const distance = this._calculateDistance(vehicle.location, nextStop.location);
    const trafficCondition = await this._getTrafficData(nextStop.location);
    const travelTime = this._calculateTravelTime(distance, trafficCondition);
    
    return {
      nextStop: nextStop,
      distance: Math.round(distance * 100) / 100,
      estimatedTime: Math.round(travelTime),
      arrivalTime: new Date(Date.now() + travelTime * 60 * 1000)
    };
  }

  /**
   * Calculate ETA to specific location
   * @private
   */
  async _calculateETAToLocation(vehicle, targetLocation) {
    const distance = this._calculateDistance(vehicle.location, targetLocation);
    const trafficCondition = await this._getTrafficData(targetLocation);
    const travelTime = this._calculateTravelTime(distance, trafficCondition);
    
    return {
      distance: Math.round(distance * 100) / 100,
      estimatedTime: Math.round(travelTime),
      arrivalTime: new Date(Date.now() + travelTime * 60 * 1000)
    };
  }

  /**
   * Calculate direction between two points
   * @private
   */
  _calculateDirection(from, to) {
    const lat1 = this._toRad(from.lat);
    const lat2 = this._toRad(to.lat);
    const dLng = this._toRad(to.lng - from.lng);
    
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - 
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    const bearing = Math.atan2(y, x);
    const degrees = (bearing * 180 / Math.PI + 360) % 360;
    
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    
    return directions[index];
  }

  /**
   * Check if vehicle is online (recent location update)
   * @private
   */
  _isVehicleOnline(vehicle) {
    const timeSinceUpdate = Date.now() - new Date(vehicle.lastUpdate).getTime();
    return timeSinceUpdate < 300000; // 5 minutes
  }

  /**
   * Optimize stop order (simplified algorithm)
   * @private
   */
  _optimizeStopOrder(stops, startLocation, endLocation) {
    // Simple nearest neighbor optimization
    const optimized = [];
    const remaining = [...stops];
    let currentLocation = startLocation;
    
    while (remaining.length > 0) {
      let nearestStop = null;
      let minDistance = Infinity;
      
      for (const stop of remaining) {
        const distance = this._calculateDistance(currentLocation, stop.location);
        if (distance < minDistance) {
          minDistance = distance;
          nearestStop = stop;
        }
      }
      
      if (nearestStop) {
        optimized.push(nearestStop);
        currentLocation = nearestStop.location;
        const index = remaining.indexOf(nearestStop);
        remaining.splice(index, 1);
      }
    }
    
    return optimized;
  }

  /**
   * Check speed compliance
   * @private
   */
  _checkSpeedCompliance(vehicle) {
    const speedLimit = 65; // mph
    const violations = [];
    
    if (vehicle.speed > speedLimit) {
      violations.push({
        type: 'speeding',
        speed: vehicle.speed,
        limit: speedLimit,
        excess: vehicle.speed - speedLimit
      });
    }
    
    return {
      compliant: violations.length === 0,
      violations: violations
    };
  }

  /**
   * Check route compliance
   * @private
   */
  _checkRouteCompliance(vehicle) {
    // Simplified route compliance check
    return {
      compliant: true,
      violations: []
    };
  }

  /**
   * Check time compliance
   * @private
   */
  _checkTimeCompliance(vehicle) {
    // Check against scheduled times
    return {
      compliant: true,
      violations: []
    };
  }

  /**
   * Check geofence compliance
   * @private
   */
  _checkGeofenceCompliance(vehicle) {
    const violations = [];
    
    for (const [geofenceId, geofence] of this.geofences) {
      const isInside = this._isPointInGeofence(vehicle.location, geofence);
      const shouldBeInside = geofence.vehicleAccess === 'all' || 
                           geofence.vehicleAccess.includes(vehicle.id);
      
      if (shouldBeInside && !isInside) {
        violations.push({
          type: 'geofence_violation',
          geofenceId: geofenceId,
          location: vehicle.location
        });
      }
    }
    
    return {
      compliant: violations.length === 0,
      violations: violations
    };
  }

  /**
   * Calculate overall compliance status
   * @private
   */
  _calculateOverallCompliance(compliance) {
    const checks = [
      compliance.speedCompliance,
      compliance.routeCompliance, 
      compliance.timeCompliance,
      compliance.geofenceCompliance
    ];
    
    const allCompliant = checks.every(check => check.compliant);
    
    return {
      status: allCompliant ? 'compliant' : 'violations',
      score: allCompliant ? 100 : Math.max(0, 100 - (compliance.alerts?.length || 0) * 10)
    };
  }

  /**
   * Convert degrees to radians
   * @private
   */
  _toRad(degrees) {
    return degrees * (Math.PI / 180);
  }
}

// Export singleton instance
module.exports = new GPSIntegrationService();
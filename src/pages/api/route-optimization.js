/**
 * Route Optimization API
 * 
 * Provides API endpoints for intelligent route optimization and dynamic dispatch:
 * - GET /api/route-optimization/status - Service status
 * - POST /api/route-optimization/optimize - Optimize routes for jobs
 * - GET /api/route-optimization/vehicles - Get vehicle locations
 * - POST /api/route-optimization/dispatch - Optimize dispatch assignments
 * - GET /api/route-optimization/performance - Get performance metrics
 * - POST /api/route-optimization/geofence - Create/update geofences
 * - GET /api/route-optimization/nearby - Find nearby vehicles
 * - POST /api/route-optimization/reassign - Dynamic job reassignment
 * 
 * @module pages/api/route-optimization
 */

const routeOptimizationService = require('../../../services/RouteOptimizationService');
const gpsIntegrationService = require('../../../services/GPSIntegrationService');
const dispatchManagementService = require('../../../services/DispatchManagementService');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGetRequest(req, res);
        break;
      case 'POST':
        await handlePostRequest(req, res);
        break;
      default:
        res.status(405).json({
          error: 'Method not allowed',
          message: `${req.method} is not supported for this endpoint`
        });
    }
  } catch (error) {
    console.error('Route Optimization API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Handle GET requests
 */
async function handleGetRequest(req, res) {
  const { action, vehicleId, geofenceId, startDate, endDate } = req.query;

  switch (action) {
    case 'status':
      return handleStatusCheck(req, res);
    case 'vehicles':
      return handleGetVehicles(req, res, vehicleId);
    case 'nearby':
      return handleGetNearbyVehicles(req, res);
    case 'performance':
      return handleGetPerformance(req, res, startDate, endDate);
    case 'geofence':
      return handleGetGeofence(req, res, geofenceId);
    case 'geofences':
      return handleGetAllGeofences(req, res);
    default:
      res.status(400).json({
        error: 'Invalid action',
        message: 'Supported actions: status, vehicles, nearby, performance, geofence, geofences'
      });
  }
}

/**
 * Handle POST requests
 */
async function handlePostRequest(req, res) {
  const { action, jobs, vehicles, options } = req.body || {};

  switch (action) {
    case 'optimize':
      return handleOptimizeRoutes(req, res, jobs, vehicles, options);
    case 'dispatch':
      return handleOptimizeDispatch(req, res, jobs, vehicles, options);
    case 'reassign':
      return handleJobReassignment(req, res, req.body);
    case 'geofence':
      return handleCreateGeofence(req, res, req.body);
    case 'emergency':
      return handleEmergencyDispatch(req, res, req.body);
    case 'workload-balance':
      return handleWorkloadBalancing(req, res, req.body);
    default:
      res.status(400).json({
        error: 'Invalid action',
        message: 'Supported actions: optimize, dispatch, reassign, geofence, emergency, workload-balance'
      });
  }
}

/**
 * GET /api/route-optimization?action=status
 * Check route optimization service status
 */
async function handleStatusCheck(req, res) {
  const routeStatus = {
    service: 'Route Optimization',
    enabled: routeOptimizationService.isEnabled(),
    algorithms: ['nearest_neighbor', 'dijkstra', 'genetic'],
    version: '1.0.0'
  };

  const gpsStatus = {
    service: 'GPS Integration',
    enabled: gpsIntegrationService.isEnabled(),
    vehicles: gpsIntegrationService.vehicles.size,
    geofences: gpsIntegrationService.geofences.size
  };

  const dispatchStatus = {
    service: 'Dispatch Management',
    enabled: dispatchManagementService.isEnabled(),
    activeDispatches: dispatchManagementService.activeDispatches.size,
    dispatchRules: dispatchManagementService.dispatchRules.size
  };

  res.status(200).json({
    success: true,
    service: 'Route Optimization & Dynamic Dispatch',
    status: {
      routeOptimization: routeStatus,
      gpsIntegration: gpsStatus,
      dispatchManagement: dispatchStatus
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * GET /api/route-optimization?action=vehicles&vehicleId=TRUCK_001
 * Get vehicle locations and status
 */
async function handleGetVehicles(req, res, vehicleId) {
  try {
    const vehicleIds = vehicleId ? [vehicleId] : null;
    const result = await gpsIntegrationService.getVehicleLocations(vehicleIds);
    
    res.status(200).json({
      success: true,
      vehicles: result.vehicles,
      summary: {
        total: result.total,
        online: result.online
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to get vehicle locations',
      message: error.message
    });
  }
}

/**
 * GET /api/route-optimization?action=nearby&lat=39.7392&lng=-104.9903&radius=5
 * Find nearby vehicles
 */
async function handleGetNearbyVehicles(req, res) {
  try {
    const { lat, lng, radius = 5 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Missing coordinates',
        message: 'lat and lng parameters are required'
      });
    }

    const centerLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const result = await gpsIntegrationService.getNearbyVehicles(centerLocation, parseFloat(radius));
    
    res.status(200).json({
      success: true,
      nearbyVehicles: result.nearbyVehicles,
      searchParams: {
        centerLocation: centerLocation,
        radius: parseFloat(radius)
      },
      total: result.total,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to get nearby vehicles',
      message: error.message
    });
  }
}

/**
 * GET /api/route-optimization?action=performance&startDate=2025-11-01&endDate=2025-11-11
 * Get dispatch performance metrics
 */
async function handleGetPerformance(req, res, startDate, endDate) {
  try {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const result = await dispatchManagementService.getDispatchPerformance(start, end);
    
    res.status(200).json({
      success: true,
      performance: result.kpis,
      trends: result.trends,
      period: result.period,
      totalDispatches: result.totalDispatches,
      insights: result.insights,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to get performance metrics',
      message: error.message
    });
  }
}

/**
 * GET /api/route-optimization?action=geofence&geofenceId=warehouse_1
 * Get specific geofence
 */
async function handleGetGeofence(req, res, geofenceId) {
  try {
    if (!geofenceId) {
      return res.status(400).json({
        error: 'Missing geofence ID',
        message: 'geofenceId parameter is required'
      });
    }

    const geofence = gpsIntegrationService.geofences.get(geofenceId);
    
    if (!geofence) {
      return res.status(404).json({
        error: 'Geofence not found',
        message: `Geofence ${geofenceId} does not exist`
      });
    }

    res.status(200).json({
      success: true,
      geofence: geofence,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to get geofence',
      message: error.message
    });
  }
}

/**
 * GET /api/route-optimization?action=geofences
 * Get all geofences
 */
async function handleGetAllGeofences(req, res) {
  try {
    const geofences = Array.from(gpsIntegrationService.geofences.values());
    
    res.status(200).json({
      success: true,
      geofences: geofences,
      total: geofences.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to get geofences',
      message: error.message
    });
  }
}

/**
 * POST /api/route-optimization
 * Optimize routes for jobs
 */
async function handleOptimizeRoutes(req, res, jobs, vehicles, options) {
  try {
    if (!jobs || !Array.isArray(jobs)) {
      return res.status(400).json({
        error: 'Invalid jobs data',
        message: 'jobs array is required'
      });
    }

    if (!vehicles || !Array.isArray(vehicles)) {
      return res.status(400).json({
        error: 'Invalid vehicles data',
        message: 'vehicles array is required'
      });
    }

    // Process job locations (convert addresses to coordinates if needed)
    const processedJobs = await processJobLocations(jobs);
    const processedVehicles = await processVehicleLocations(vehicles);

    const result = await routeOptimizationService.optimizeRoutes(
      processedJobs,
      processedVehicles,
      options
    );

    res.status(200).json({
      success: true,
      optimization: result,
      metadata: {
        algorithm: result.algorithm,
        jobsProcessed: result.metadata.totalJobs,
        vehiclesUsed: result.metadata.totalVehicles,
        executionTime: result.metadata.optimizationTime
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      error: 'Route optimization failed',
      message: error.message
    });
  }
}

/**
 * POST /api/route-optimization
 * Optimize dispatch assignments
 */
async function handleOptimizeDispatch(req, res, jobs, vehicles, options) {
  try {
    if (!jobs || !Array.isArray(jobs)) {
      return res.status(400).json({
        error: 'Invalid jobs data',
        message: 'jobs array is required'
      });
    }

    if (!vehicles || !Array.isArray(vehicles)) {
      return res.status(400).json({
        error: 'Invalid drivers data',
        message: 'drivers array is required'
      });
    }

    const result = await dispatchManagementService.optimizeDispatch(
      jobs,
      vehicles,
      options
    );

    res.status(200).json({
      success: true,
      dispatch: result,
      summary: result.summary,
      efficiency: result.efficiency,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      error: 'Dispatch optimization failed',
      message: error.message
    });
  }
}

/**
 * POST /api/route-optimization
 * Handle job reassignment
 */
async function handleJobReassignment(req, res, reassignmentData) {
  try {
    const { jobId, fromDriverId, toDriverId, reason } = reassignmentData;

    if (!jobId || !fromDriverId || !toDriverId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'jobId, fromDriverId, and toDriverId are required'
      });
    }

    const result = await dispatchManagementService.reassignJob(
      jobId,
      fromDriverId,
      toDriverId,
      reason || 'Manual reassignment'
    );

    res.status(200).json({
      success: result.success,
      reassignment: result.reassignment,
      estimatedSavings: result.estimatedSavings,
      message: result.success ? 'Job reassigned successfully' : 'Reassignment declined',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      error: 'Job reassignment failed',
      message: error.message
    });
  }
}

/**
 * POST /api/route-optimization
 * Create/update geofence
 */
async function handleCreateGeofence(req, res, geofenceData) {
  try {
    const { geofenceId, geofence } = geofenceData;

    if (!geofenceId || !geofence) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'geofenceId and geofence data are required'
      });
    }

    const result = await gpsIntegrationService.createGeofence(geofenceId, geofence);

    res.status(200).json({
      success: result.success,
      geofence: result.geofence,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      error: 'Geofence creation failed',
      message: error.message
    });
  }
}

/**
 * POST /api/route-optimization
 * Handle emergency dispatch
 */
async function handleEmergencyDispatch(req, res, emergencyData) {
  try {
    const { type, location, priority, affectedJobs, timeframe } = emergencyData;

    if (!type || !location) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'type and location are required for emergency dispatch'
      });
    }

    const result = await dispatchManagementService.handleEmergencyDispatch({
      type,
      location,
      priority: priority || 'URGENT',
      affectedJobs: affectedJobs || [],
      timeframe: timeframe || 60 // 60 minutes default
    });

    res.status(200).json({
      success: result.success,
      emergency: result,
      status: result.status,
      estimatedResolution: result.estimatedResolution,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      error: 'Emergency dispatch failed',
      message: error.message
    });
  }
}

/**
 * POST /api/route-optimization
 * Balance driver workloads
 */
async function handleWorkloadBalancing(req, res, balancingData) {
  try {
    const { driverWorkloads, options } = balancingData;

    if (!driverWorkloads || !Array.isArray(driverWorkloads)) {
      return res.status(400).json({
        error: 'Invalid driver workloads',
        message: 'driverWorkloads array is required'
      });
    }

    const result = await dispatchManagementService.balanceWorkloads(driverWorkloads, options);

    res.status(200).json({
      success: result.success,
      balancing: result,
      analysis: result.currentAnalysis,
      improvements: result.expectedImprovements,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      error: 'Workload balancing failed',
      message: error.message
    });
  }
}

// Helper functions

/**
 * Process job locations to ensure they have coordinates
 */
async function processJobLocations(jobs) {
  // In a real implementation, this would:
  // 1. Check if jobs have coordinates
  // 2. If not, geocode addresses using Google Maps API
  // 3. Cache results for performance
  
  return jobs.map(job => ({
    ...job,
    location: job.location || {
      lat: 39.7392 + (Math.random() - 0.5) * 0.1, // Mock coordinates
      lng: -104.9903 + (Math.random() - 0.5) * 0.1
    },
    priority: job.priority || 'MEDIUM',
    load: job.load || 1
  }));
}

/**
 * Process vehicle locations to ensure they have coordinates
 */
async function processVehicleLocations(vehicles) {
  // In a real implementation, this would get actual GPS coordinates
  
  return vehicles.map(vehicle => ({
    ...vehicle,
    location: vehicle.location || {
      lat: 39.7392 + (Math.random() - 0.5) * 0.2,
      lng: -104.9903 + (Math.random() - 0.5) * 0.2
    },
    capacity: vehicle.capacity || 10,
    currentJobs: vehicle.currentJobs || 0
  }));
}
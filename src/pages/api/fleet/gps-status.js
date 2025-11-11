/**
 * Fleet GPS Status API - FIXED VERSION
 * 
 * GET /api/fleet/gps-status
 * Returns current GPS verification status for all trucks
 */

const samsaraService = require('../../../services/SamsaraIntegrationService');
const CircuitBreaker = require('../../../utils/circuitBreaker');

// Create circuit breaker for GPS service
const gpsCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  timeout: 30000,
  monitor: (event, data) => {
    console.log(`GPS Circuit Breaker ${event}:`, data);
  }
});

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Use circuit breaker to handle GPS service failures gracefully
      const gpsStatus = await gpsCircuitBreaker.call(
        async () => await samsaraService.getFleetGpsStatus(),
        {
          success: true,
          status: {
            totalTrucks: 0,
            trucksWithGps: 0,
            trucksWithoutGps: 0,
            activeTrucks: 0,
            idleTrucks: 0,
            trucks: [],
            error: 'GPS service temporarily unavailable'
          },
          cached: true,
          timestamp: new Date().toISOString()
        }
      );
      
      // Get service information
      const serviceInfo = samsaraService.getServiceInfo();

      res.status(200).json({
        success: true,
        gpsStatus: gpsStatus.status || gpsStatus,
        serviceInfo: serviceInfo,
        circuitBreaker: gpsCircuitBreaker.getState(),
        timestamp: new Date().toISOString()
      });

    } else if (req.method === 'POST') {
      // Clear GPS cache and force refresh
      const clearResult = samsaraService.clearGpsCache();
      
      res.status(200).json({
        success: true,
        message: 'GPS cache cleared, data will refresh on next request',
        result: clearResult,
        timestamp: new Date().toISOString()
      });

    } else {
      res.status(405).json({
        error: 'Method not allowed',
        allowedMethods: ['GET', 'POST']
      });
    }

  } catch (error) {
    console.error('GPS Status API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
/**
 * Fleet GPS Status API
 * 
 * GET /api/fleet/gps-status
 * Returns current GPS verification status for all trucks
 */

const samsaraService = require('../../../services/SamsaraIntegrationService');

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Get current fleet GPS status
      const gpsStatus = await samsaraService.getFleetGpsStatus();
      
      // Get service information
      const serviceInfo = samsaraService.getServiceInfo();

      res.status(200).json({
        success: true,
        gpsStatus: gpsStatus.status,
        serviceInfo: serviceInfo,
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
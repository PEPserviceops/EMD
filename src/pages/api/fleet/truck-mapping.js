/**
 * Fleet Truck Mapping API
 * 
 * GET /api/fleet/truck-mapping - Get current truck ID mappings
 * POST /api/fleet/truck-mapping - Add/update truck mapping
 * DELETE /api/fleet/truck-mapping - Remove truck mapping
 */

const samsaraService = require('../../../services/SamsaraIntegrationService');

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Get current truck mapping
      const truckMapping = samsaraService.getTruckMapping();
      const serviceInfo = samsaraService.getServiceInfo();

      res.status(200).json({
        success: true,
        truckMapping: truckMapping,
        serviceInfo: serviceInfo,
        timestamp: new Date().toISOString()
      });

    } else if (req.method === 'POST') {
      // Add or update truck mapping
      const { fileMakerId, samsaraId } = req.body;

      if (!fileMakerId || !samsaraId) {
        res.status(400).json({
          success: false,
          error: 'Both fileMakerId and samsaraId are required'
        });
        return;
      }

      const result = samsaraService.addTruckMapping(fileMakerId, samsaraId);

      res.status(200).json({
        success: true,
        message: result.message,
        mapping: {
          fileMakerId: fileMakerId,
          samsaraId: samsaraId
        },
        timestamp: new Date().toISOString()
      });

    } else if (req.method === 'DELETE') {
      // Remove truck mapping
      const { fileMakerId } = req.body;

      if (!fileMakerId) {
        res.status(400).json({
          success: false,
          error: 'fileMakerId is required'
        });
        return;
      }

      const result = samsaraService.removeTruckMapping(fileMakerId);

      res.status(200).json({
        success: true,
        message: result.message,
        removedMapping: {
          fileMakerId: fileMakerId
        },
        timestamp: new Date().toISOString()
      });

    } else {
      res.status(405).json({
        error: 'Method not allowed',
        allowedMethods: ['GET', 'POST', 'DELETE']
      });
    }

  } catch (error) {
    console.error('Truck Mapping API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
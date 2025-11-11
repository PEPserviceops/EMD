/**
 * Fleet GPS Sync API
 * 
 * POST /api/fleet/sync-gps - Trigger manual GPS synchronization
 */

const samsaraService = require('../../../services/SamsaraIntegrationService');
const pollingService = require('../../../services/PollingService');

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      // Validate request
      if (!samsaraService.isEnabled()) {
        res.status(400).json({
          success: false,
          error: 'Samsara integration is not enabled. Please configure SAMSARA_API_KEY.'
        });
        return;
      }

      const { truckIds } = req.body; // Optional: specific truck IDs to sync

      console.log('Manual GPS sync triggered', { truckIds });

      let results = {};

      if (truckIds && Array.isArray(truckIds) && truckIds.length > 0) {
        // Sync specific trucks
        console.log(`Syncing GPS data for ${truckIds.length} specific trucks`);
        const gpsData = await samsaraService.getMultipleTruckLocations(truckIds);
        results.specificTrucks = gpsData;
      } else {
        // Sync all trucks in mapping
        const mapping = samsaraService.getTruckMapping();
        const allTruckIds = Object.keys(mapping);
        
        console.log(`Syncing GPS data for all ${allTruckIds.length} mapped trucks`);
        const gpsData = await samsaraService.getMultipleTruckLocations(allTruckIds);
        results.allTrucks = gpsData;

        // Also trigger verification for active jobs
        try {
          const pollingStats = pollingService.getStats();
          const currentJobs = pollingService.getCurrentJobs ? 
            await pollingService.getCurrentJobs() : [];
          
          if (currentJobs.length > 0) {
            console.log(`Running GPS verification for ${currentJobs.length} active jobs`);
            const verification = await samsaraService.verifyJobs(currentJobs);
            results.jobVerification = verification;
          }
        } catch (error) {
          console.error('Error running job verification during GPS sync:', error);
          results.jobVerification = { error: error.message };
        }
      }

      // Clear cache after sync
      samsaraService.clearGpsCache();

      res.status(200).json({
        success: true,
        message: 'GPS sync completed successfully',
        results: results,
        timestamp: new Date().toISOString()
      });

    } else {
      res.status(405).json({
        error: 'Method not allowed',
        allowedMethods: ['POST']
      });
    }

  } catch (error) {
    console.error('GPS Sync API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
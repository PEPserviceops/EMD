/**
 * API Route: /api/alerts/[id]/acknowledge
 * Acknowledge a specific alert
 */

const OnDemandDataService = require('../../../services/OnDemandDataService');

// Create a singleton instance for this serverless function
let dataService = null;

function getDataService() {
  if (!dataService) {
    dataService = new OnDemandDataService({
      cacheTTL: 30000, // 30 seconds
      batchSize: parseInt(process.env.POLLING_BATCH_SIZE) || 100,
      fileMaker: {
        host: process.env.FILEMAKER_HOST,
        database: process.env.FILEMAKER_DATABASE,
        layout: process.env.FILEMAKER_LAYOUT,
        username: process.env.FILEMAKER_USER,
        password: process.env.FILEMAKER_PASSWORD
      }
    });
  }
  return dataService;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { acknowledgedBy = 'user' } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Alert ID is required'
      });
    }

    const dataService = getDataService();
    const alertEngine = dataService.alertEngine;

    const success = alertEngine.acknowledgeAlert(id, acknowledgedBy);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Alert acknowledged successfully',
        alertId: id
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

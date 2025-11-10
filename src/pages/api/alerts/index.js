/**
 * API Route: /api/alerts
 * Get current alerts - fetches fresh data from FileMaker on each request
 */

import OnDemandDataService from '../../../services/OnDemandDataService';

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dataService = getDataService();
    const { severity, limit } = req.query;

    const filters = {};
    if (severity) filters.severity = severity;
    if (limit) filters.limit = parseInt(limit);

    // Fetch fresh alerts from FileMaker
    const alerts = await dataService.getAlerts(filters);

    // Calculate stats
    const stats = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'CRITICAL').length,
      high: alerts.filter(a => a.severity === 'HIGH').length,
      medium: alerts.filter(a => a.severity === 'MEDIUM').length,
      low: alerts.filter(a => a.severity === 'LOW').length
    };

    res.status(200).json({
      success: true,
      alerts,
      stats,
      total: alerts.length,
      source: 'filemaker'
    });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}


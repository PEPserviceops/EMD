/**
 * API Route: /api/polling/status
 * Get data service status and statistics (serverless-compatible)
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

    const stats = dataService.getStats();

    res.status(200).json({
      success: true,
      data: {
        stats,
        environment: 'serverless',
        mode: 'on-demand'
      }
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}


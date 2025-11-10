/**
 * API Route: /api/polling/status
 * Get polling service status and statistics
 */

import { getPollingService } from '../../../lib/pollingServiceInstance';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pollingService = getPollingService();
    
    const stats = pollingService.getStats();
    const health = pollingService.getHealth();
    const alertSummary = pollingService.getAlertSummary();

    res.status(200).json({
      success: true,
      data: {
        stats,
        health,
        alerts: alertSummary
      }
    });
  } catch (error) {
    console.error('Error getting polling status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}


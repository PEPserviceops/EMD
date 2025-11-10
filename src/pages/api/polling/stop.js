/**
 * API Route: /api/polling/stop
 * Stop the polling service
 */

import { getPollingService } from '../../../lib/pollingServiceInstance';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pollingService = getPollingService();
    
    await pollingService.stop();

    res.status(200).json({
      success: true,
      message: 'Polling service stopped',
      stats: pollingService.getStats()
    });
  } catch (error) {
    console.error('Error stopping polling service:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}


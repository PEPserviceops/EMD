/**
 * API Route: /api/polling/start
 * Start the polling service
 */

import { getPollingService } from '../../../lib/pollingServiceInstance';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pollingService = getPollingService();
    
    await pollingService.start();

    res.status(200).json({
      success: true,
      message: 'Polling service started',
      stats: pollingService.getStats()
    });
  } catch (error) {
    console.error('Error starting polling service:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}


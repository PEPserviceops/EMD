/**
 * API Route: /api/polling/status
 * Get external polling service status and statistics
 */

import axios from 'axios';

const POLLING_SERVICE_URL = process.env.POLLING_SERVICE_URL;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!POLLING_SERVICE_URL) {
    return res.status(500).json({
      success: false,
      error: 'POLLING_SERVICE_URL environment variable not set'
    });
  }

  try {
    const response = await axios.get(`${POLLING_SERVICE_URL}/stats`);
    
    res.status(200).json({
      success: true,
      data: {
        stats: response.data.stats,
        service: 'External Polling Service',
        environment: 'external',
        url: POLLING_SERVICE_URL
      }
    });
  } catch (error) {
    console.error('Error getting polling service status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}


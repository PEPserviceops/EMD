/**
 * API Route: /api/polling/stop
 * Stop the external polling service
 */

import axios from 'axios';

const POLLING_SERVICE_URL = process.env.POLLING_SERVICE_URL;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!POLLING_SERVICE_URL) {
    return res.status(500).json({
      success: false,
      error: 'POLLING_SERVICE_URL environment variable not set'
    });
  }

  try {
    const response = await axios.post(`${POLLING_SERVICE_URL}/stop`);
    
    res.status(200).json({
      success: true,
      message: 'Polling service stopped',
      data: response.data
    });
  } catch (error) {
    console.error('Error stopping polling service:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}


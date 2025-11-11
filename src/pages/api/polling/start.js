/**
 * API Route: /api/polling/start
 * Start the external polling service
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
    const response = await axios.post(`${POLLING_SERVICE_URL}/start`);
    
    res.status(200).json({
      success: true,
      message: 'Polling service started',
      data: response.data
    });
  } catch (error) {
    console.error('Error starting polling service:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}


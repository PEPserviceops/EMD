/**
 * API Route: /api/alerts/[id]/acknowledge
 * Acknowledge a specific alert
 */

import { getPollingService } from '../../../../lib/pollingServiceInstance';

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

    const pollingService = getPollingService();
    const alertEngine = pollingService.alertEngine;

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


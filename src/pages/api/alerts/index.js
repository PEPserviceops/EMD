/**
 * API Route: /api/alerts
 * Get current alerts
 */

import { getPollingService } from '../../../lib/pollingServiceInstance';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pollingService = getPollingService();

    const { severity, limit } = req.query;

    const filters = {};
    if (severity) filters.severity = severity;
    if (limit) filters.limit = parseInt(limit);

    const alerts = pollingService.getAlerts(filters);

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
      total: alerts.length
    });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}


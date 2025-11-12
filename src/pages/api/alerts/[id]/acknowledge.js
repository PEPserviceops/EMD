/**
 * API Route: /api/alerts/[id]/acknowledge
 * Acknowledge a specific alert
 *
 * TEMPORARILY DISABLED: Import issues with OnDemandDataService
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Temporary response until import issues are resolved
  return res.status(503).json({
    success: false,
    error: 'Alert acknowledgment service temporarily unavailable',
    message: 'Service is being updated - please try again later',
    alertId: req.query.id
  });
}

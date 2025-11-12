/**
 * API Route: /api/alerts
 * Get current alerts with circuit breaker pattern and graceful fallbacks
 */

const OnDemandDataService = require('../../services/OnDemandDataService');
const CircuitBreaker = require('../../utils/circuitBreaker');

// Create circuit breaker for alerts service
const alertsCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  timeout: 30000,
  monitor: (event, data) => {
    console.log(`Alerts Circuit Breaker ${event}:`, data);
  }
});

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
    const { severity, limit } = req.query;

    const filters = {};
    if (severity) filters.severity = severity;
    if (limit) filters.limit = parseInt(limit);

    // Use circuit breaker to handle FileMaker service failures gracefully
    const alertsResult = await alertsCircuitBreaker.call(
      async () => await dataService.getAlerts(filters),
      {
        success: true,
        alerts: [],
        stats: {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        cached: true,
        error: 'Alerts service temporarily unavailable',
        source: 'fallback'
      }
    );

    // Calculate stats if we have alerts
    const alerts = alertsResult.alerts || alertsResult;
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
      total: alerts.length,
      source: alertsResult.source || 'filemaker',
      circuitBreaker: alertsCircuitBreaker.getState(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(200).json({
      success: true,
      alerts: [],
      stats: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      error: 'Service temporarily unavailable',
      fallback: true,
      source: 'error_fallback',
      timestamp: new Date().toISOString()
    });
  }
}
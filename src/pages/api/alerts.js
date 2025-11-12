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
    const { severity, limit, demo } = req.query;

    const filters = {};
    if (severity) filters.severity = severity;
    if (limit) filters.limit = parseInt(limit);

    // Check if demo mode is requested or if circuit breaker is open
    const circuitBreakerState = alertsCircuitBreaker.getState();
    const forceRetry = req.query.force === 'true';
    const isDemoMode = demo === 'true' || (circuitBreakerState.state === 'OPEN' && !forceRetry);

    if (isDemoMode) {
      // Generate demo alerts to show the system working
      const demoAlerts = generateDemoAlerts();
      const filteredAlerts = filters.severity
        ? demoAlerts.filter(a => a.severity === filters.severity)
        : demoAlerts;

      const limitedAlerts = filters.limit
        ? filteredAlerts.slice(0, filters.limit)
        : filteredAlerts;

      const stats = {
        total: limitedAlerts.length,
        critical: limitedAlerts.filter(a => a.severity === 'CRITICAL').length,
        high: limitedAlerts.filter(a => a.severity === 'HIGH').length,
        medium: limitedAlerts.filter(a => a.severity === 'MEDIUM').length,
        low: limitedAlerts.filter(a => a.severity === 'LOW').length
      };

      return res.status(200).json({
        success: true,
        alerts: limitedAlerts,
        stats,
        total: limitedAlerts.length,
        source: 'demo',
        demo: true,
        circuitBreaker: circuitBreakerState,
        message: circuitBreakerState.state === 'OPEN'
          ? 'FileMaker API unavailable - showing demo alerts'
          : 'Demo mode enabled',
        timestamp: new Date().toISOString()
      });
    }

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
      circuitBreaker: circuitBreakerState,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting alerts:', error);

    // Fallback to demo alerts even on error
    const demoAlerts = generateDemoAlerts();
    const stats = {
      total: demoAlerts.length,
      critical: demoAlerts.filter(a => a.severity === 'CRITICAL').length,
      high: demoAlerts.filter(a => a.severity === 'HIGH').length,
      medium: demoAlerts.filter(a => a.severity === 'MEDIUM').length,
      low: demoAlerts.filter(a => a.severity === 'LOW').length
    };

    res.status(200).json({
      success: true,
      alerts: demoAlerts,
      stats,
      total: demoAlerts.length,
      error: error.message,
      fallback: true,
      source: 'demo_fallback',
      demo: true,
      message: 'FileMaker API error - showing demo alerts to demonstrate system',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Generate demo alerts to show the real-time alerts system working
 */
function generateDemoAlerts() {
  const now = new Date();
  const alerts = [
    {
      id: 'demo-1',
      ruleId: 'missing-truck-assignment',
      ruleName: 'Missing Truck Assignment',
      severity: 'HIGH',
      message: 'Job 356001 (Nov 11, 2025) is Entered but has no truck assigned',
      jobId: '356001',
      recordId: 'demo-1',
      timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      acknowledged: false,
      details: {
        recordId: 'demo-1',
        fieldData: {
          _kp_job_id: '356001',
          job_status: 'Entered',
          job_date: '11/11/2025'
        }
      }
    },
    {
      id: 'demo-2',
      ruleId: 'long-in-progress',
      ruleName: 'Job In Progress Too Long',
      severity: 'MEDIUM',
      message: 'Job 356002 (Nov 11, 2025) has been in progress for over 4 hours (arrived at 10:00:00)',
      jobId: '356002',
      recordId: 'demo-2',
      timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      acknowledged: false,
      details: {
        recordId: 'demo-2',
        fieldData: {
          _kp_job_id: '356002',
          time_arival: '10:00:00',
          job_date: '11/11/2025'
        }
      }
    },
    {
      id: 'demo-3',
      ruleId: 'truck-without-driver',
      ruleName: 'Truck Without Driver',
      severity: 'MEDIUM',
      message: 'Job 356003 (Nov 12, 2025) has truck TRK-001 but no driver assigned',
      jobId: '356003',
      recordId: 'demo-3',
      timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      acknowledged: true,
      acknowledgedAt: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
      acknowledgedBy: 'dispatcher',
      details: {
        recordId: 'demo-3',
        fieldData: {
          _kp_job_id: '356003',
          _kf_trucks_id: 'TRK-001',
          job_date: '11/12/2025'
        }
      }
    },
    {
      id: 'demo-4',
      ruleId: 'rescheduled-status',
      ruleName: 'Job Rescheduled',
      severity: 'MEDIUM',
      message: 'Job 356004 (Nov 11, 2025) has been rescheduled - verify new schedule',
      jobId: '356004',
      recordId: 'demo-4',
      timestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
      acknowledged: false,
      details: {
        recordId: 'demo-4',
        fieldData: {
          _kp_job_id: '356004',
          job_status: 'Re-scheduled',
          job_date: '11/11/2025'
        }
      }
    },
    {
      id: 'demo-5',
      ruleId: 'attempted-status',
      ruleName: 'Job Attempted But Not Completed',
      severity: 'HIGH',
      message: 'Job 356005 (Nov 12, 2025) was attempted but not completed - requires follow-up',
      jobId: '356005',
      recordId: 'demo-5',
      timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      acknowledged: false,
      details: {
        recordId: 'demo-5',
        fieldData: {
          _kp_job_id: '356005',
          job_status_driver: 'Attempted',
          job_date: '11/12/2025'
        }
      }
    }
  ];

  return alerts;
}

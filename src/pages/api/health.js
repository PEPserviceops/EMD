/**
 * Service Health Check Endpoint
 * 
 * GET /api/health
 * Returns the health status of all critical services
 */

const supabaseService = require('../../services/SupabaseService');
const samsaraService = require('../../services/SamsaraIntegrationService');
const openRouterService = require('../../services/OpenRouterService');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const healthChecks = {
      timestamp: new Date().toISOString(),
      services: {
        supabase: {
          enabled: supabaseService.isEnabled(),
          status: supabaseService.isEnabled() ? 'healthy' : 'disabled'
        },
        samsara: {
          enabled: samsaraService.isEnabled(),
          status: samsaraService.isEnabled() ? 'healthy' : 'disabled'
        },
        openrouter: {
          enabled: openRouterService.isEnabled(),
          status: openRouterService.isEnabled() ? 'healthy' : 'disabled'
        }
      },
      overall: 'healthy',
      issues: []
    };

    // Determine overall health - no critical services defined since all are optional
    const criticalServices = [];
    const availableServices = Object.entries(healthChecks.services)
      .filter(([name, check]) => check.enabled)
      .map(([name]) => name);

    if (availableServices.length === 0) {
      healthChecks.overall = 'critical';
      healthChecks.issues.push('No services are available');
    } else if (!criticalServices.every(service => availableServices.includes(service))) {
      healthChecks.overall = 'degraded';
      healthChecks.issues.push('Some critical services are unavailable');
    }

    const statusCode = healthChecks.overall === 'critical' ? 503 : 200;
    res.status(statusCode).json(healthChecks);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      overall: 'error',
      error: error.message
    });
  }
}
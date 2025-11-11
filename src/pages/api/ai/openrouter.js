/**
 * OpenRouter AI Integration API
 * 
 * Provides endpoints for AI-powered insights including:
 * - Job forecasting and prediction
 * - Route optimization analysis
 * - Business intelligence generation
 * - Alert analysis and root cause identification
 */

const openRouterService = require('../../../services/OpenRouterService');

export default async function handler(req, res) {
  // Enable CORS for frontend integration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Test connection endpoint
    try {
      if (!openRouterService.isEnabled()) {
        return res.status(503).json({
          error: 'OpenRouter service not configured',
          message: 'OpenRouter API is not properly configured',
          enabled: false
        });
      }

      const testResult = await openRouterService.testConnection();
      
      return res.status(200).json({
        success: true,
        message: 'OpenRouter service is working',
        service: {
          enabled: true,
          model: testResult.model,
          status: 'connected',
          lastTest: testResult.timestamp
        }
      });
    } catch (error) {
      return res.status(500).json({
        error: 'OpenRouter connection test failed',
        message: error.message,
        enabled: true
      });
    }
  }

  if (req.method === 'POST') {
    const { action, data } = req.body;

    try {
      if (!openRouterService.isEnabled()) {
        return res.status(503).json({
          error: 'OpenRouter service not configured',
          message: 'OpenRouter API is not available'
        });
      }

      let result;

      switch (action) {
        case 'forecast':
          result = await openRouterService.generateJobForecast(data.jobData, data.historicalData);
          break;

        case 'optimize':
          result = await openRouterService.analyzeRouteOptimization(data.routeData, data.trafficData);
          break;

        case 'insights':
          result = await openRouterService.generateBusinessInsights(data.metrics, data.context);
          break;

        case 'analyze':
          result = await openRouterService.analyzeAlert(data.alert, data.contextData);
          break;

        default:
          return res.status(400).json({
            error: 'Invalid action',
            message: 'Action must be one of: forecast, optimize, insights, analyze',
            availableActions: ['forecast', 'optimize', 'insights', 'analyze']
          });
      }

      return res.status(200).json({
        success: true,
        action,
        data: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`OpenRouter ${action} error:`, error);
      return res.status(500).json({
        error: `${action} operation failed`,
        message: error.message,
        action
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    error: 'Method not allowed',
    message: `${req.method} is not supported for this endpoint`,
    supportedMethods: ['GET', 'POST']
  });
}
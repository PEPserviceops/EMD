/**
 * Analytics API - Profitability Metrics
 * Provides financial performance data and profitability analysis
 */

const supabaseService = require('../../../services/SupabaseService');

export default async function handler(req, res) {
  // Check if Supabase is enabled
  if (!supabaseService.isEnabled()) {
    return res.status(503).json({
      error: 'Supabase is not configured',
      message: 'Historical analytics are not available'
    });
  }

  if (req.method === 'GET') {
    try {
      const {
        startDate,
        endDate,
        aggregationLevel,
        jobId,
        routeId,
        truckId,
        limit = 100
      } = req.query;

      // Validate parameters
      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'Missing required parameters',
          message: 'startDate and endDate are required'
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format',
          message: 'startDate and endDate must be valid ISO date strings'
        });
      }

      // Build filters
      const filters = {};
      if (aggregationLevel) filters.aggregationLevel = aggregationLevel;
      if (jobId) filters.jobId = jobId;
      if (routeId) filters.routeId = routeId;
      if (truckId) filters.truckId = truckId;
      if (limit) filters.limit = parseInt(limit);

      // Get profitability metrics from Supabase
      const metrics = await supabaseService.getProfitabilityMetrics(start, end, filters);

      // Calculate summary statistics
      const summary = {
        totalRecords: metrics.length,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        averageProfitMargin: 0,
        profitableCount: 0,
        unprofitableCount: 0
      };

      if (metrics.length > 0) {
        metrics.forEach(metric => {
          summary.totalRevenue += metric.total_revenue || 0;
          summary.totalCost += metric.total_cost || 0;
          summary.totalProfit += metric.gross_profit || 0;
          
          if ((metric.gross_profit || 0) > 0) {
            summary.profitableCount++;
          } else if ((metric.gross_profit || 0) < 0) {
            summary.unprofitableCount++;
          }
        });

        summary.averageProfitMargin = summary.totalRevenue > 0
          ? (summary.totalProfit / summary.totalRevenue) * 100
          : 0;
      }

      return res.status(200).json({
        success: true,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        filters,
        count: metrics.length,
        summary,
        metrics
      });

    } catch (error) {
      console.error('Error fetching profitability metrics:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const metricsData = req.body;

      if (!metricsData || typeof metricsData !== 'object') {
        return res.status(400).json({
          error: 'Invalid request body',
          message: 'Request body must be a valid profitability metrics object'
        });
      }

      // Store profitability metrics
      const result = await supabaseService.storeProfitabilityMetrics(metricsData);

      return res.status(201).json({
        success: true,
        message: 'Profitability metrics stored successfully',
        data: result
      });

    } catch (error) {
      console.error('Error storing profitability metrics:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    error: 'Method not allowed',
    message: `${req.method} is not supported for this endpoint`
  });
}


/**
 * Analytics API - Efficiency Metrics
 * Provides truck and route efficiency data over time
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
      const { truckId, startDate, endDate, limit = 100 } = req.query;

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

      // Get efficiency metrics from Supabase
      const metrics = await supabaseService.getEfficiencyMetrics(
        truckId || null,
        start,
        end,
        parseInt(limit)
      );

      // Calculate summary statistics
      const summary = {
        totalRecords: metrics.length,
        averageEfficiencyScore: 0,
        averageExcessMiles: 0,
        totalMiles: 0,
        totalOptimalMiles: 0,
        totalExcessMiles: 0,
        gradeDistribution: {
          A: 0,
          B: 0,
          C: 0,
          D: 0,
          F: 0
        }
      };

      if (metrics.length > 0) {
        metrics.forEach(metric => {
          summary.averageEfficiencyScore += metric.efficiency_score || 0;
          summary.averageExcessMiles += metric.excess_miles || 0;
          summary.totalMiles += metric.total_miles || 0;
          summary.totalOptimalMiles += metric.optimal_miles || 0;
          summary.totalExcessMiles += metric.excess_miles || 0;
          
          if (metric.efficiency_grade) {
            summary.gradeDistribution[metric.efficiency_grade]++;
          }
        });

        summary.averageEfficiencyScore /= metrics.length;
        summary.averageExcessMiles /= metrics.length;
      }

      return res.status(200).json({
        success: true,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        truckId: truckId || 'all',
        count: metrics.length,
        summary,
        metrics
      });

    } catch (error) {
      console.error('Error fetching efficiency metrics:', error);
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
          message: 'Request body must be a valid efficiency metrics object'
        });
      }

      // Store efficiency metrics
      const result = await supabaseService.storeEfficiencyMetrics(metricsData);

      return res.status(201).json({
        success: true,
        message: 'Efficiency metrics stored successfully',
        data: result
      });

    } catch (error) {
      console.error('Error storing efficiency metrics:', error);
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


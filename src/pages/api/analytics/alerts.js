/**
 * Analytics API - Alert History and Statistics
 * Provides historical alert data, trends, and statistics
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
        severity,
        ruleId,
        jobId,
        acknowledged,
        resolved,
        dismissed,
        limit = 100
      } = req.query;

      // Validate date parameters
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
      if (severity) filters.severity = severity;
      if (ruleId) filters.ruleId = ruleId;
      if (jobId) filters.jobId = jobId;
      if (acknowledged !== undefined) filters.acknowledged = acknowledged === 'true';
      if (resolved !== undefined) filters.resolved = resolved === 'true';
      if (dismissed !== undefined) filters.dismissed = dismissed === 'true';
      if (limit) filters.limit = parseInt(limit);

      // Get alerts and statistics from Supabase
      const [alerts, stats] = await Promise.all([
        supabaseService.getAlerts(start, end, filters),
        supabaseService.getAlertStats(start, end)
      ]);

      return res.status(200).json({
        success: true,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        filters,
        count: alerts.length,
        alerts,
        statistics: stats
      });

    } catch (error) {
      console.error('Error fetching alert analytics:', error);
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


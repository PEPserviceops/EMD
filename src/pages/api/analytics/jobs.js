/**
 * Analytics API - Job History
 * Provides historical job data and trends
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
      const { jobId, limit = 50 } = req.query;

      if (!jobId) {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'jobId is required'
        });
      }

      // Get job history from Supabase
      const history = await supabaseService.getJobHistory(jobId, parseInt(limit));

      return res.status(200).json({
        success: true,
        jobId,
        count: history.length,
        history
      });

    } catch (error) {
      console.error('Error fetching job history:', error);
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


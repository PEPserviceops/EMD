/**
 * Analytics API - System Metrics
 * Provides system performance and health monitoring data
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
        component,
        metricType,
        metricName,
        startDate,
        endDate,
        limit = 100
      } = req.query;

      // Get supabase client from service
      const { supabase } = require('../../../lib/supabase');

      if (!supabase) {
        return res.status(503).json({
          error: 'Supabase client not available',
          message: 'Database connection is not configured'
        });
      }

      // Build query for system metrics
      let query = supabase
        .from('system_metrics')
        .select('*')
        .order('timestamp', { ascending: false });

      if (component) {
        query = query.eq('component', component);
      }

      if (metricType) {
        query = query.eq('metric_type', metricType);
      }

      if (metricName) {
        query = query.eq('metric_name', metricName);
      }

      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          query = query.gte('timestamp', start.toISOString());
        }
      }

      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          query = query.lte('timestamp', end.toISOString());
        }
      }

      query = query.limit(parseInt(limit));

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Calculate summary statistics
      const summary = {
        totalRecords: data.length,
        components: {},
        metricTypes: {},
        averageValue: 0
      };

      if (data.length > 0) {
        let totalValue = 0;
        let valueCount = 0;

        data.forEach(metric => {
          // Count by component
          summary.components[metric.component] = 
            (summary.components[metric.component] || 0) + 1;

          // Count by metric type
          summary.metricTypes[metric.metric_type] = 
            (summary.metricTypes[metric.metric_type] || 0) + 1;

          // Calculate average value (if numeric)
          if (typeof metric.metric_value === 'number') {
            totalValue += metric.metric_value;
            valueCount++;
          }
        });

        if (valueCount > 0) {
          summary.averageValue = totalValue / valueCount;
        }
      }

      return res.status(200).json({
        success: true,
        filters: {
          component,
          metricType,
          metricName,
          startDate,
          endDate
        },
        count: data.length,
        summary,
        metrics: data
      });

    } catch (error) {
      console.error('Error fetching system metrics:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const metricData = req.body;

      if (!metricData || typeof metricData !== 'object') {
        return res.status(400).json({
          error: 'Invalid request body',
          message: 'Request body must be a valid system metric object'
        });
      }

      // Store system metric
      const result = await supabaseService.storeSystemMetric(metricData);

      return res.status(201).json({
        success: true,
        message: 'System metric stored successfully',
        data: result
      });

    } catch (error) {
      console.error('Error storing system metric:', error);
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


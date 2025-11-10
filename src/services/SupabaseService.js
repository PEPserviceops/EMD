/**
 * Supabase Service
 * 
 * Handles all database operations for historical data storage and retrieval.
 * Provides methods for storing jobs, alerts, efficiency metrics, and profitability data.
 * 
 * @module services/SupabaseService
 */

const { supabase, isSupabaseConfigured } = require('../lib/supabase');

class SupabaseService {
  constructor() {
    this.enabled = isSupabaseConfigured();
    if (!this.enabled) {
      console.warn('⚠️  SupabaseService: Supabase is not configured. Historical data storage is disabled.');
    }
  }

  /**
   * Check if Supabase is enabled and configured
   */
  isEnabled() {
    return this.enabled;
  }

  // =====================================================
  // JOBS HISTORY METHODS
  // =====================================================

  /**
   * Store a job snapshot in history
   * @param {Object} job - Job data from FileMaker
   * @returns {Promise<Object>} Inserted record or null
   */
  async storeJobSnapshot(job) {
    if (!this.enabled) return null;

    try {
      const fieldData = job.fieldData || {};
      
      const jobSnapshot = {
        job_id: fieldData._kp_job_id?.toString() || '',
        record_id: job.recordId || '',
        mod_id: job.modId || '',
        job_date: this._parseDate(fieldData.job_date),
        job_status: fieldData.job_status || '',
        job_type: fieldData.job_type || '',
        job_status_driver: fieldData.job_status_driver || null,
        truck_id: fieldData._kf_trucks_id || null,
        driver_id: fieldData._kf_driver_id || null,
        route_id: fieldData._kf_route_id || null,
        lead_id: fieldData._kf_lead_id || null,
        time_arrival: this._parseTimestamp(fieldData.job_date, fieldData.time_arival),
        time_complete: this._parseTimestamp(fieldData.job_date, fieldData.time_complete),
        due_date: this._parseDate(fieldData.due_date),
        address: fieldData.address_C1 || null,
        customer_name: fieldData.Customer_C1 || null,
        contact_info: fieldData.contact_C1 || null,
        raw_data: fieldData,
        snapshot_timestamp: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('jobs_history')
        .insert(jobSnapshot)
        .select()
        .single();

      if (error) {
        console.error('Error storing job snapshot:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception in storeJobSnapshot:', error);
      return null;
    }
  }

  /**
   * Store multiple job snapshots in batch
   * @param {Array} jobs - Array of job data
   * @returns {Promise<Array>} Inserted records
   */
  async storeJobSnapshotBatch(jobs) {
    if (!this.enabled || !jobs || jobs.length === 0) return [];

    try {
      const snapshots = jobs
        .map(job => {
          const fieldData = job.fieldData || {};
          const jobDate = this._parseDate(fieldData.job_date);

          // Skip jobs without a valid job_date (required field)
          if (!jobDate) {
            return null;
          }

          return {
            job_id: fieldData._kp_job_id?.toString() || '',
            record_id: job.recordId || '',
            mod_id: job.modId || '',
            job_date: jobDate,
            job_status: fieldData.job_status || '',
            job_type: fieldData.job_type || '',
            job_status_driver: fieldData.job_status_driver || null,
            truck_id: fieldData._kf_trucks_id || null,
            driver_id: fieldData._kf_driver_id || null,
            route_id: fieldData._kf_route_id || null,
            lead_id: fieldData._kf_lead_id || null,
            time_arrival: this._parseTimestamp(fieldData.job_date, fieldData.time_arival),
            time_complete: this._parseTimestamp(fieldData.job_date, fieldData.time_complete),
            due_date: this._parseDate(fieldData.due_date),
            address: fieldData.address_C1 || null,
            customer_name: fieldData.Customer_C1 || null,
            contact_info: fieldData.contact_C1 || null,
            raw_data: fieldData,
            snapshot_timestamp: new Date().toISOString()
          };
        })
        .filter(snapshot => snapshot !== null); // Remove null entries

      // If no valid snapshots, return empty array
      if (snapshots.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('jobs_history')
        .insert(snapshots)
        .select();

      if (error) {
        console.error('Error storing job snapshots batch:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception in storeJobSnapshotBatch:', error);
      return [];
    }
  }

  /**
   * Get job history for a specific job
   * @param {string} jobId - Job ID
   * @param {number} limit - Maximum number of records to return
   * @returns {Promise<Array>} Job history records
   */
  async getJobHistory(jobId, limit = 50) {
    if (!this.enabled) return [];

    try {
      const { data, error } = await supabase
        .from('jobs_history')
        .select('*')
        .eq('job_id', jobId)
        .order('snapshot_timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching job history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception in getJobHistory:', error);
      return [];
    }
  }

  // =====================================================
  // ALERTS HISTORY METHODS
  // =====================================================

  /**
   * Store an alert in history
   * @param {Object} alert - Alert data
   * @returns {Promise<Object>} Inserted record or null
   */
  async storeAlert(alert) {
    if (!this.enabled) return null;

    try {
      // Extract alert_id from various possible fields
      const alertId = alert.alert_id || alert.id || alert.alertId;

      // Validate required fields
      if (!alertId) {
        console.error('Cannot store alert: missing alert_id');
        return null;
      }

      const alertRecord = {
        alert_id: alertId,
        rule_id: alert.ruleId || alert.rule_id || 'unknown',
        rule_name: alert.ruleName || alert.rule_name || alert.name || 'Unknown Rule',
        severity: alert.severity || 'MEDIUM',
        title: alert.title || alert.name || alert.message?.substring(0, 100) || 'Alert',
        message: alert.message || 'No message provided',
        job_id: alert.jobId || alert.job_id || null,
        job_status: alert.jobStatus || alert.job_status || null,
        job_date: alert.jobDate ? this._parseDate(alert.jobDate) : (alert.job_date ? this._parseDate(alert.job_date) : null),
        truck_id: alert.truckId || alert.truck_id || null,
        created_at: alert.timestamp || alert.created_at || new Date().toISOString(),
        acknowledged: alert.acknowledged || false,
        acknowledged_at: alert.acknowledgedAt || alert.acknowledged_at || null,
        acknowledged_by: alert.acknowledgedBy || alert.acknowledged_by || null,
        dismissed: alert.dismissed || false,
        details: alert.details || {},
        metadata: alert.metadata || {}
      };

      const { data, error } = await supabase
        .from('alerts_history')
        .insert(alertRecord)
        .select()
        .single();

      if (error) {
        console.error('Error storing alert:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception in storeAlert:', error);
      return null;
    }
  }

  /**
   * Update alert status (acknowledge, dismiss, resolve)
   * @param {string} alertId - Alert ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated record or null
   */
  async updateAlert(alertId, updates) {
    if (!this.enabled) return null;

    try {
      const { data, error } = await supabase
        .from('alerts_history')
        .update(updates)
        .eq('alert_id', alertId)
        .select()
        .single();

      if (error) {
        console.error('Error updating alert:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception in updateAlert:', error);
      return null;
    }
  }

  /**
   * Get alerts for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} filters - Additional filters (severity, rule_id, etc.)
   * @returns {Promise<Array>} Alert records
   */
  async getAlerts(startDate, endDate, filters = {}) {
    if (!this.enabled) return [];

    try {
      let query = supabase
        .from('alerts_history')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Apply additional filters
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.rule_id) {
        query = query.eq('rule_id', filters.rule_id);
      }
      if (filters.job_id) {
        query = query.eq('job_id', filters.job_id);
      }
      if (filters.acknowledged !== undefined) {
        query = query.eq('acknowledged', filters.acknowledged);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching alerts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception in getAlerts:', error);
      return [];
    }
  }

  /**
   * Get alert statistics for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Alert statistics
   */
  async getAlertStats(startDate, endDate) {
    if (!this.enabled) return null;

    try {
      const { data, error } = await supabase
        .from('daily_alert_summary')
        .select('*')
        .gte('alert_date', startDate.toISOString().split('T')[0])
        .lte('alert_date', endDate.toISOString().split('T')[0])
        .order('alert_date', { ascending: false });

      if (error) {
        console.error('Error fetching alert stats:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception in getAlertStats:', error);
      return null;
    }
  }

  // =====================================================
  // EFFICIENCY METRICS METHODS
  // =====================================================

  /**
   * Store efficiency metrics for a truck/route
   * @param {Object} metrics - Efficiency metrics data
   * @returns {Promise<Object>} Inserted record or null
   */
  async storeEfficiencyMetrics(metrics) {
    if (!this.enabled) return null;

    try {
      const efficiencyRecord = {
        truck_id: metrics.truck_id || metrics.truckId,
        route_id: metrics.route_id || metrics.routeId || null,
        date: this._parseDate(metrics.date) || new Date().toISOString().split('T')[0],
        total_miles: metrics.total_miles || metrics.totalMiles || 0,
        optimal_miles: metrics.optimal_miles || metrics.optimalMiles || null,
        excess_miles: metrics.excess_miles || metrics.excessMiles || null,
        excess_percentage: metrics.excess_percentage || metrics.excessPercentage || null,
        efficiency_grade: metrics.efficiency_grade || metrics.grade || null,
        efficiency_score: metrics.efficiency_score || metrics.score || null,
        proximity_waste_count: metrics.proximity_waste_count || 0,
        backtrack_count: metrics.backtrack_count || 0,
        clustering_opportunities: metrics.clustering_opportunities || 0,
        total_jobs: metrics.total_jobs || metrics.totalJobs || 0,
        completed_jobs: metrics.completed_jobs || metrics.completedJobs || 0,
        on_time_jobs: metrics.on_time_jobs || metrics.onTimeJobs || 0,
        late_jobs: metrics.late_jobs || metrics.lateJobs || 0,
        total_drive_time_minutes: metrics.total_drive_time_minutes || null,
        total_service_time_minutes: metrics.total_service_time_minutes || null,
        idle_time_minutes: metrics.idle_time_minutes || null,
        fuel_cost_estimate: metrics.fuel_cost_estimate || null,
        labor_cost_estimate: metrics.labor_cost_estimate || null,
        potential_savings: metrics.potential_savings || null,
        calculation_method: metrics.calculation_method || 'automated'
      };

      const { data, error } = await supabase
        .from('efficiency_metrics')
        .upsert(efficiencyRecord, { onConflict: 'truck_id,date' })
        .select()
        .single();

      if (error) {
        console.error('Error storing efficiency metrics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception in storeEfficiencyMetrics:', error);
      return null;
    }
  }

  /**
   * Get efficiency metrics for a truck over a date range
   * @param {string} truckId - Truck ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Efficiency metrics records
   */
  async getEfficiencyMetrics(truckId, startDate, endDate) {
    if (!this.enabled) return [];

    try {
      const { data, error } = await supabase
        .from('efficiency_metrics')
        .select('*')
        .eq('truck_id', truckId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching efficiency metrics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception in getEfficiencyMetrics:', error);
      return [];
    }
  }

  // =====================================================
  // PROFITABILITY METRICS METHODS
  // =====================================================

  /**
   * Store profitability metrics
   * @param {Object} metrics - Profitability metrics data
   * @returns {Promise<Object>} Inserted record or null
   */
  async storeProfitabilityMetrics(metrics) {
    if (!this.enabled) return null;

    try {
      const profitabilityRecord = {
        job_id: metrics.job_id || metrics.jobId || null,
        truck_id: metrics.truck_id || metrics.truckId || null,
        route_id: metrics.route_id || metrics.routeId || null,
        date: this._parseDate(metrics.date) || new Date().toISOString().split('T')[0],
        aggregation_level: metrics.aggregation_level || metrics.level || 'job',
        total_revenue: metrics.total_revenue || metrics.revenue || 0,
        fuel_cost: metrics.fuel_cost || metrics.fuelCost || 0,
        labor_cost: metrics.labor_cost || metrics.laborCost || 0,
        vehicle_cost: metrics.vehicle_cost || metrics.vehicleCost || 0,
        overhead_cost: metrics.overhead_cost || metrics.overheadCost || 0,
        total_cost: metrics.total_cost || metrics.totalCost || 0,
        job_count: metrics.job_count || metrics.jobCount || 0,
        miles_driven: metrics.miles_driven || metrics.miles || 0,
        notes: metrics.notes || null
      };

      const { data, error } = await supabase
        .from('profitability_metrics')
        .insert(profitabilityRecord)
        .select()
        .single();

      if (error) {
        console.error('Error storing profitability metrics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception in storeProfitabilityMetrics:', error);
      return null;
    }
  }

  /**
   * Get profitability metrics for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Profitability metrics records
   */
  async getProfitabilityMetrics(startDate, endDate, filters = {}) {
    if (!this.enabled) return [];

    try {
      let query = supabase
        .from('profitability_metrics')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (filters.truck_id) {
        query = query.eq('truck_id', filters.truck_id);
      }
      if (filters.aggregation_level) {
        query = query.eq('aggregation_level', filters.aggregation_level);
      }

      query = query.order('date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching profitability metrics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception in getProfitabilityMetrics:', error);
      return [];
    }
  }

  // =====================================================
  // SYSTEM METRICS METHODS
  // =====================================================

  /**
   * Store a system metric
   * @param {Object} metric - System metric data
   * @returns {Promise<Object>} Inserted record or null
   */
  async storeSystemMetric(metric) {
    if (!this.enabled) return null;

    try {
      const metricRecord = {
        metric_type: metric.type || metric.metric_type,
        metric_name: metric.name || metric.metric_name,
        metric_value: metric.value || metric.metric_value,
        metric_unit: metric.unit || metric.metric_unit || null,
        component: metric.component || null,
        environment: metric.environment || process.env.NODE_ENV || 'production',
        tags: metric.tags || {},
        metadata: metric.metadata || {}
      };

      const { data, error } = await supabase
        .from('system_metrics')
        .insert(metricRecord)
        .select()
        .single();

      if (error) {
        console.error('Error storing system metric:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception in storeSystemMetric:', error);
      return null;
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Parse FileMaker date format (MM/DD/YYYY) to ISO date
   * @param {string} dateStr - Date string
   * @returns {string|null} ISO date string or null
   */
  _parseDate(dateStr) {
    if (!dateStr) return null;

    try {
      // FileMaker format: MM/DD/YYYY
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [month, day, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse FileMaker date and time to ISO timestamp
   * @param {string} dateStr - Date string (MM/DD/YYYY)
   * @param {string} timeStr - Time string (HH:MM:SS)
   * @returns {string|null} ISO timestamp or null
   */
  _parseTimestamp(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;

    try {
      const date = this._parseDate(dateStr);
      if (!date) return null;

      return `${date}T${timeStr}`;
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
module.exports = new SupabaseService();


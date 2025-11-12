/**
 * Alert Engine Module
 * Evaluates job data against rules and generates alerts
 * Integrated with Supabase for historical alert storage
 */

const { parseISO, addHours, isBefore } = require('date-fns');
const supabaseService = require('../services/SupabaseService');

// Alert severity levels
const SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

// Alert rules - Updated with actual FileMaker field names
// See docs/FILEMAKER_FIELD_MAPPING.md for complete field documentation
const alertRules = [
  {
    id: 'arrival-without-completion',
    name: 'Arrival Without Completion',
    severity: SEVERITY.HIGH,
    evaluate: (job) => {
      const fieldData = job.fieldData || {};
      // Note: FileMaker field has typo "time_arival" instead of "time_arrival"
      const hasArrival = fieldData.time_arival && fieldData.time_arival !== '';
      const noCompletion = !fieldData.time_complete || fieldData.time_complete === '';
      const notCompleted = fieldData.job_status !== 'Completed';
      return hasArrival && noCompletion && notCompleted;
    },
    message: (job) => `Job ${job.fieldData._kp_job_id} has arrival time but no completion time (Status: ${job.fieldData.job_status})`
  },
  {
    id: 'missing-truck-assignment',
    name: 'Missing Truck Assignment',
    severity: SEVERITY.HIGH,
    evaluate: (job) => {
      const fieldData = job.fieldData || {};
      const isEntered = fieldData.job_status === 'Entered';
      const noTruck = !fieldData._kf_trucks_id || fieldData._kf_trucks_id === '';
      return isEntered && noTruck;
    },
    message: (job) => `Job ${job.fieldData._kp_job_id} is Entered but has no truck assigned`
  },
  {
    id: 'truck-without-driver',
    name: 'Truck Without Driver',
    severity: SEVERITY.MEDIUM,
    evaluate: (job) => {
      const fieldData = job.fieldData || {};
      const hasTruck = fieldData._kf_trucks_id && fieldData._kf_trucks_id !== '';
      const noDriver = !fieldData._kf_driver_id || fieldData._kf_driver_id === '';
      const isEntered = fieldData.job_status === 'Entered';
      return hasTruck && noDriver && isEntered;
    },
    message: (job) => `Job ${job.fieldData._kp_job_id} has truck ${job.fieldData._kf_trucks_id} but no driver assigned`
  },
  {
    id: 'long-in-progress',
    name: 'Job In Progress Too Long',
    severity: SEVERITY.MEDIUM,
    evaluate: (job) => {
      const fieldData = job.fieldData || {};
      const hasArrival = fieldData.time_arival && fieldData.time_arival !== '';
      const noCompletion = !fieldData.time_complete || fieldData.time_complete === '';

      if (!hasArrival || !noCompletion) return false;

      try {
        // Combine job_date with time_arival to get full timestamp
        const jobDate = fieldData.job_date; // MM/DD/YYYY
        const arrivalTime = fieldData.time_arival; // HH:MM:SS

        if (!jobDate) return false;

        // Parse date and time
        const [month, day, year] = jobDate.split('/');
        const [hours, minutes, seconds] = arrivalTime.split(':');
        const arrivalDateTime = new Date(year, month - 1, day, hours, minutes, seconds);

        const fourHoursAgo = addHours(new Date(), -4);
        return isBefore(arrivalDateTime, fourHoursAgo);
      } catch (error) {
        return false;
      }
    },
    message: (job) => `Job ${job.fieldData._kp_job_id} has been in progress for over 4 hours (arrived at ${job.fieldData.time_arival})`
  },
  {
    id: 'attempted-status',
    name: 'Job Attempted But Not Completed',
    severity: SEVERITY.HIGH,
    evaluate: (job) => {
      const fieldData = job.fieldData || {};
      return fieldData.job_status === 'Attempted' || fieldData.job_status_driver === 'Attempted';
    },
    message: (job) => `Job ${job.fieldData._kp_job_id} was attempted but not completed - requires follow-up`
  },
  {
    id: 'rescheduled-status',
    name: 'Job Rescheduled',
    severity: SEVERITY.MEDIUM,
    evaluate: (job) => {
      const fieldData = job.fieldData || {};
      return fieldData.job_status === 'Re-scheduled';
    },
    message: (job) => `Job ${job.fieldData._kp_job_id} has been rescheduled - verify new schedule`
  },
  {
    id: 'gps-location-mismatch',
    name: 'GPS Location Mismatch',
    severity: SEVERITY.HIGH,
    evaluate: (job, gpsVerification) => {
      try {
        // If GPS verification is not available or has no results, skip
        if (!gpsVerification || !gpsVerification.success || !gpsVerification.results) return false;
        
        // Check if we have job-specific verification results
        if (!gpsVerification.results.resultsByJobId) return false;
        
        const verificationResult = gpsVerification.results.resultsByJobId[job.recordId];
        if (!verificationResult) return false;
        
        return verificationResult.verificationStatus === 'off_schedule';
      } catch (error) {
        console.warn(`GPS location mismatch evaluation error for job ${job.recordId}:`, error.message);
        return false;
      }
    },
    message: (job, gpsVerification) => {
      const verificationResult = gpsVerification?.results?.resultsByJobId?.[job.recordId];
      const distance = verificationResult?.distance || 0;
      return `Job ${job.fieldData._kp_job_id}: Truck ${verificationResult?.truckId} is ${distance} miles from scheduled location`;
    }
  },
  {
    id: 'gps-no-tracking',
    name: 'No GPS Tracking Available',
    severity: SEVERITY.MEDIUM,
    evaluate: (job, gpsVerification) => {
      try {
        if (!gpsVerification || !gpsVerification.success) return false;
        
        // GPS verification data may not be available for all jobs
        // If no results or job not in results, assume no tracking available
        const verificationResult = gpsVerification.results?.resultsByJobId?.[job.recordId];
        
        // If we have specific result data, use it
        if (verificationResult) {
          return verificationResult.verificationStatus === 'unknown' &&
                 verificationResult.hasSamsaraTracking === false;
        }
        
        // If no specific result but GPS service is working, 
        // assume truck is not in Samsara system
        return true;
      } catch (error) {
        console.warn(`GPS no-tracking evaluation error for job ${job.recordId}:`, error.message);
        return false;
      }
    },
    message: (job, gpsVerification) => `Job ${job.fieldData._kp_job_id}: No GPS tracking available for truck (not in Samsara)`
  },
  {
    id: 'gps-data-unavailable',
    name: 'GPS Data Unavailable',
    severity: SEVERITY.MEDIUM,
    evaluate: (job, gpsVerification) => {
      try {
        // If GPS verification is not available or has no results, skip
        if (!gpsVerification || !gpsVerification.success || !gpsVerification.results) return false;

        // Check if we have job-specific verification results
        if (!gpsVerification.results.resultsByJobId) return false;

        const verificationResult = gpsVerification.results.resultsByJobId[job.recordId];
        if (!verificationResult) return false;

        return verificationResult.verificationStatus === 'unknown' &&
               verificationResult.hasSamsaraTracking === true;
      } catch (error) {
        console.warn(`GPS data unavailable evaluation error for job ${job.recordId}:`, error.message);
        return false;
      }
    },
    message: (job, gpsVerification) => {
      const verificationResult = gpsVerification?.results?.resultsByJobId?.[job.recordId];
      const truckId = verificationResult?.truckId;
      return `Job ${job.fieldData._kp_job_id}: GPS data unavailable for truck ${truckId}`;
    }
  },
  {
    id: 'gps-proximity-alert',
    name: 'Truck Approaching Destination',
    severity: SEVERITY.LOW,
    evaluate: (job, gpsVerification) => {
      try {
        // If GPS verification is not available or has no results, skip
        if (!gpsVerification || !gpsVerification.success || !gpsVerification.results) return false;

        // Check if we have job-specific verification results
        if (!gpsVerification.results.resultsByJobId) return false;

        const verificationResult = gpsVerification.results.resultsByJobId[job.recordId];
        if (!verificationResult) return false;

        // Only trigger for verified (on-schedule) trucks within proximity threshold
        const distance = verificationResult.distance || 0;
        const proximityThreshold = 2; // miles - alert when within 2 miles of destination

        return verificationResult.verificationStatus === 'verified' &&
               distance > 0 && // Has valid distance data
               distance <= proximityThreshold; // Within proximity threshold
      } catch (error) {
        console.warn(`GPS proximity alert evaluation error for job ${job.recordId}:`, error.message);
        return false;
      }
    },
    message: (job, gpsVerification) => {
      const verificationResult = gpsVerification?.results?.resultsByJobId?.[job.recordId];
      const distance = verificationResult?.distance || 0;
      const truckId = verificationResult?.truckId;
      return `Job ${job.fieldData._kp_job_id}: Truck ${truckId} is ${distance.toFixed(1)} miles from destination`;
    }
  }
];

/**
 * Priority Queue for Alert Management
 * Maintains alerts sorted by severity and timestamp
 */
class AlertPriorityQueue {
  constructor() {
    this.queue = [];
    this.severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  }

  /**
   * Add alert to priority queue
   */
  enqueue(alert) {
    this.queue.push(alert);
    this._sort();
  }

  /**
   * Remove and return highest priority alert
   */
  dequeue() {
    return this.queue.shift();
  }

  /**
   * Get all alerts without removing
   */
  getAll() {
    return [...this.queue];
  }

  /**
   * Get alerts by severity
   */
  getBySeverity(severity) {
    return this.queue.filter(a => a.severity === severity);
  }

  /**
   * Remove specific alert
   */
  remove(alertId) {
    const index = this.queue.findIndex(a => a.id === alertId);
    if (index !== -1) {
      return this.queue.splice(index, 1)[0];
    }
    return null;
  }

  /**
   * Check if alert exists
   */
  has(alertId) {
    return this.queue.some(a => a.id === alertId);
  }

  /**
   * Get queue size
   */
  size() {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  clear() {
    this.queue = [];
  }

  /**
   * Sort queue by priority
   */
  _sort() {
    this.queue.sort((a, b) => {
      // First by severity
      const severityDiff = this.severityOrder[a.severity] - this.severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // Then by timestamp (newest first)
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }
}

class AlertEngine {
  constructor(customRules = []) {
    this.rules = [...alertRules, ...customRules];
    this.activeAlerts = new Map();
    this.alertHistory = [];
    this.priorityQueue = new AlertPriorityQueue();
    this.deduplicationCache = new Map(); // Track alert fingerprints
    this.deduplicationWindow = 300000; // 5 minutes
  }

  /**
   * Generate alert fingerprint for deduplication
   * @param {string} ruleId - Rule ID
   * @param {string} jobId - Job ID
   * @returns {string} Fingerprint
   */
  _generateFingerprint(ruleId, jobId) {
    return `${ruleId}:${jobId}`;
  }

  /**
   * Check if alert is duplicate within deduplication window
   * @param {string} fingerprint - Alert fingerprint
   * @returns {boolean} True if duplicate
   */
  _isDuplicate(fingerprint) {
    const lastSeen = this.deduplicationCache.get(fingerprint);
    if (!lastSeen) return false;

    const now = Date.now();
    const timeSinceLastSeen = now - lastSeen;

    // If within deduplication window, it's a duplicate
    if (timeSinceLastSeen < this.deduplicationWindow) {
      return true;
    }

    // Outside window, remove from cache
    this.deduplicationCache.delete(fingerprint);
    return false;
  }

  /**
   * Update deduplication cache
   * @param {string} fingerprint - Alert fingerprint
   */
  _updateDeduplicationCache(fingerprint) {
    this.deduplicationCache.set(fingerprint, Date.now());
  }

  /**
   * Clean up old deduplication entries
   */
  _cleanupDeduplicationCache() {
    const now = Date.now();
    for (const [fingerprint, timestamp] of this.deduplicationCache.entries()) {
      if (now - timestamp > this.deduplicationWindow) {
        this.deduplicationCache.delete(fingerprint);
      }
    }
  }

  /**
   * Evaluate a single job against all rules
   * @param {Object} job - Job record from FileMaker
   * @param {Object} gpsVerification - GPS verification data
   * @returns {Array} Array of triggered alerts
   */
  evaluateJob(job, gpsVerification = null) {
    const alerts = [];

    for (const rule of this.rules) {
      try {
        // Pass GPS verification data to rule evaluation
        if (rule.evaluate(job, gpsVerification)) {
          const jobId = job.fieldData?._kp_job_id || job.recordId;
          const fingerprint = this._generateFingerprint(rule.id, jobId);

          // Check for duplicate
          if (this._isDuplicate(fingerprint)) {
            continue; // Skip duplicate alert
          }

          const alert = {
            id: `${rule.id}-${job.recordId}`,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: rule.message(job, gpsVerification),
            jobId: jobId,
            recordId: job.recordId,
            timestamp: new Date().toISOString(),
            acknowledged: false,
            fingerprint: fingerprint
          };

          alerts.push(alert);
          this._updateDeduplicationCache(fingerprint);
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id} for job ${job.recordId}:`, error);
      }
    }

    return alerts;
  }

  /**
   * Evaluate multiple jobs and update active alerts
   * @param {Array} jobs - Array of job records
   * @param {Object} gpsVerification - GPS verification results
   * @returns {Object} Alert summary
   */
  evaluateJobs(jobs, gpsVerification = null) {
    const newAlerts = [];
    const currentAlertIds = new Set();

    // Clean up old deduplication entries periodically
    this._cleanupDeduplicationCache();

    // Evaluate all jobs
    for (const job of jobs) {
      const jobAlerts = this.evaluateJob(job, gpsVerification);
      for (const alert of jobAlerts) {
        currentAlertIds.add(alert.id);

        // Check if this is a new alert
        if (!this.activeAlerts.has(alert.id)) {
          newAlerts.push(alert);
          this.activeAlerts.set(alert.id, alert);
          this.priorityQueue.enqueue(alert);
          this.alertHistory.push({ ...alert, action: 'created' });

          // Store new alert in Supabase
          if (supabaseService.isEnabled()) {
            this._storeAlertInSupabase(alert, job).catch(error => {
              console.error('Failed to store alert in Supabase:', error.message);
            });
          }
        }
      }
    }

    // Remove resolved alerts
    const resolvedAlerts = [];
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (!currentAlertIds.has(alertId)) {
        resolvedAlerts.push(alert);
        this.activeAlerts.delete(alertId);
        this.priorityQueue.remove(alertId);
        this.alertHistory.push({ ...alert, action: 'resolved', resolvedAt: new Date().toISOString() });

        // Update alert as resolved in Supabase
        if (supabaseService.isEnabled()) {
          supabaseService.updateAlert(alert.id, {
            resolved: true,
            resolved_at: new Date().toISOString()
          }).catch(error => {
            console.error('Failed to update resolved alert in Supabase:', error.message);
          });
        }
      }
    }

    return {
      total: this.activeAlerts.size,
      new: newAlerts.length,
      resolved: resolvedAlerts.length,
      bySeverity: this.getAlertsBySeverity(),
      newAlerts,
      resolvedAlerts
    };
  }

  /**
   * Get count of alerts by severity
   * @returns {Object} Alert counts by severity
   */
  getAlertsBySeverity() {
    const counts = {
      [SEVERITY.LOW]: 0,
      [SEVERITY.MEDIUM]: 0,
      [SEVERITY.HIGH]: 0,
      [SEVERITY.CRITICAL]: 0
    };

    for (const alert of this.activeAlerts.values()) {
      counts[alert.severity]++;
    }

    return counts;
  }

  /**
   * Get all active alerts (using priority queue)
   * @param {Object} filters - Optional filters
   * @returns {Array} Active alerts sorted by priority
   */
  getActiveAlerts(filters = {}) {
    let alerts = this.priorityQueue.getAll();

    if (filters.severity) {
      alerts = alerts.filter(a => a.severity === filters.severity);
    }

    if (filters.ruleId) {
      alerts = alerts.filter(a => a.ruleId === filters.ruleId);
    }

    if (filters.acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === filters.acknowledged);
    }

    if (filters.limit) {
      alerts = alerts.slice(0, filters.limit);
    }

    return alerts;
  }

  /**
   * Get highest priority alert
   * @returns {Object|null} Highest priority alert
   */
  getHighestPriorityAlert() {
    const alerts = this.priorityQueue.getAll();
    return alerts.length > 0 ? alerts[0] : null;
  }

  /**
   * Get alerts by severity from priority queue
   * @param {string} severity - Severity level
   * @returns {Array} Alerts of specified severity
   */
  getAlertsBySeverityLevel(severity) {
    return this.priorityQueue.getBySeverity(severity);
  }

  /**
   * Acknowledge an alert
   * @param {string} alertId - Alert ID to acknowledge
   * @param {string} acknowledgedBy - User who acknowledged
   * @returns {boolean} True if acknowledged successfully
   */
  acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date().toISOString();
      this.alertHistory.push({ ...alert, action: 'acknowledged' });

      // Update alert in Supabase
      if (supabaseService.isEnabled()) {
        supabaseService.updateAlert(alertId, {
          acknowledged: true,
          acknowledged_at: alert.acknowledgedAt,
          acknowledged_by: acknowledgedBy
        }).catch(error => {
          console.error('Failed to update acknowledged alert in Supabase:', error.message);
        });
      }

      return true;
    }
    return false;
  }

  /**
   * Dismiss an alert
   * @param {string} alertId - Alert ID to dismiss
   * @param {string} dismissedBy - User who dismissed
   * @returns {boolean} True if dismissed successfully
   */
  dismissAlert(alertId, dismissedBy) {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      const dismissedAt = new Date().toISOString();
      this.activeAlerts.delete(alertId);
      this.priorityQueue.remove(alertId);
      this.alertHistory.push({
        ...alert,
        action: 'dismissed',
        dismissedBy,
        dismissedAt
      });

      // Update alert in Supabase
      if (supabaseService.isEnabled()) {
        supabaseService.updateAlert(alertId, {
          dismissed: true,
          dismissed_at: dismissedAt,
          dismissed_by: dismissedBy
        }).catch(error => {
          console.error('Failed to update dismissed alert in Supabase:', error.message);
        });
      }

      return true;
    }
    return false;
  }

  /**
   * Bulk acknowledge alerts
   * @param {Array} alertIds - Array of alert IDs
   * @param {string} acknowledgedBy - User who acknowledged
   * @returns {Object} Result summary
   */
  bulkAcknowledge(alertIds, acknowledgedBy) {
    let acknowledged = 0;
    let failed = 0;

    for (const alertId of alertIds) {
      if (this.acknowledgeAlert(alertId, acknowledgedBy)) {
        acknowledged++;
      } else {
        failed++;
      }
    }

    return { acknowledged, failed };
  }

  /**
   * Bulk dismiss alerts
   * @param {Array} alertIds - Array of alert IDs
   * @param {string} dismissedBy - User who dismissed
   * @returns {Object} Result summary
   */
  bulkDismiss(alertIds, dismissedBy) {
    let dismissed = 0;
    let failed = 0;

    for (const alertId of alertIds) {
      if (this.dismissAlert(alertId, dismissedBy)) {
        dismissed++;
      } else {
        failed++;
      }
    }

    return { dismissed, failed };
  }

  /**
   * Get alert history
   * @param {Object} options - Query options
   * @returns {Array} Alert history
   */
  getAlertHistory(options = {}) {
    let history = [...this.alertHistory];

    if (options.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * Get alert statistics
   * @returns {Object} Alert statistics
   */
  getStatistics() {
    const stats = {
      total: this.activeAlerts.size,
      acknowledged: 0,
      unacknowledged: 0,
      bySeverity: this.getAlertsBySeverity(),
      byRule: {},
      deduplicationCacheSize: this.deduplicationCache.size,
      priorityQueueSize: this.priorityQueue.size(),
      historySize: this.alertHistory.length
    };

    // Count acknowledged/unacknowledged
    for (const alert of this.activeAlerts.values()) {
      if (alert.acknowledged) {
        stats.acknowledged++;
      } else {
        stats.unacknowledged++;
      }

      // Count by rule
      stats.byRule[alert.ruleId] = (stats.byRule[alert.ruleId] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get deduplication statistics
   * @returns {Object} Deduplication stats
   */
  getDeduplicationStats() {
    return {
      cacheSize: this.deduplicationCache.size,
      window: this.deduplicationWindow,
      entries: Array.from(this.deduplicationCache.entries()).map(([fingerprint, timestamp]) => ({
        fingerprint,
        timestamp,
        age: Date.now() - timestamp
      }))
    };
  }

  /**
   * Clear all alerts (for testing)
   */
  clearAlerts() {
    this.activeAlerts.clear();
    this.alertHistory = [];
    this.priorityQueue.clear();
    this.deduplicationCache.clear();
  }

  /**
   * Set deduplication window
   * @param {number} milliseconds - Window in milliseconds
   */
  setDeduplicationWindow(milliseconds) {
    this.deduplicationWindow = milliseconds;
  }

  /**
   * Store alert in Supabase (helper method)
   * @param {Object} alert - Alert object
   * @param {Object} job - Job object that triggered the alert
   * @private
   */
  async _storeAlertInSupabase(alert, job) {
    try {
      const fieldData = job.fieldData || {};
      await supabaseService.storeAlert({
        alert_id: alert.id,  // This is the correct field name
        id: alert.id,        // Also pass as 'id' for compatibility
        ruleId: alert.ruleId,
        ruleName: alert.ruleName,
        severity: alert.severity,
        title: alert.ruleName || alert.message?.substring(0, 100),
        message: alert.message,
        jobId: fieldData._kp_job_id || job.recordId,
        job_date: fieldData.job_date,
        jobStatus: fieldData.job_status,
        truckId: fieldData._kf_trucks_id,
        timestamp: alert.timestamp || new Date().toISOString(),
        details: {
          recordId: job.recordId,
          modId: job.modId,
          fingerprint: alert.fingerprint,
          driver_id: fieldData._kf_driver_id,
          fieldData: fieldData
        }
      });
    } catch (error) {
      console.error('Error storing alert in Supabase:', error);
      throw error;
    }
  }
}

module.exports = {
  AlertEngine,
  AlertPriorityQueue,
  alertRules,
  SEVERITY
};

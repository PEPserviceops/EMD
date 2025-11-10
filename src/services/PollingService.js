/**
 * Polling Service
 * Manages 30-second polling of FileMaker data and change detection
 */

const { FileMakerAPI } = require('../api/filemaker');
const { AlertEngine } = require('../api/alerts');
const EventEmitter = require('events');

class PollingService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      interval: config.interval || parseInt(process.env.POLLING_INTERVAL) || 30000,
      batchSize: config.batchSize || 100,
      enabled: config.enabled !== false,
      ...config
    };

    this.fileMakerAPI = new FileMakerAPI(config.fileMaker || {});
    this.alertEngine = new AlertEngine(config.customRules || []);
    
    this.isRunning = false;
    this.intervalId = null;
    this.lastPollTime = null;
    this.pollCount = 0;
    this.errorCount = 0;
    
    // Statistics
    this.stats = {
      totalPolls: 0,
      successfulPolls: 0,
      failedPolls: 0,
      totalJobsProcessed: 0,
      totalAlertsGenerated: 0,
      averageResponseTime: 0,
      lastError: null
    };
  }

  /**
   * Start the polling service
   */
  async start() {
    if (this.isRunning) {
      console.log('Polling service is already running');
      return;
    }

    console.log(`Starting polling service (interval: ${this.config.interval}ms)`);
    this.isRunning = true;
    this.emit('started');

    // Run first poll immediately
    await this.poll();

    // Set up interval for subsequent polls
    this.intervalId = setInterval(() => {
      this.poll().catch(error => {
        console.error('Polling error:', error);
        this.emit('error', error);
      });
    }, this.config.interval);
  }

  /**
   * Stop the polling service
   */
  async stop() {
    if (!this.isRunning) {
      console.log('Polling service is not running');
      return;
    }

    console.log('Stopping polling service');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Close FileMaker session
    await this.fileMakerAPI.closeSession();
    
    this.emit('stopped');
  }

  /**
   * Execute a single poll cycle
   */
  async poll() {
    const startTime = Date.now();
    this.pollCount++;
    this.stats.totalPolls++;

    try {
      console.log(`[Poll #${this.pollCount}] Starting poll at ${new Date().toISOString()}`);

      // Fetch jobs from FileMaker
      const jobs = await this.fileMakerAPI.getActiveJobs({ 
        limit: this.config.batchSize 
      });

      // Filter out DELETED jobs
      const activeJobs = jobs.filter(job => {
        const status = job.fieldData?.job_status;
        return status && status !== 'DELETED' && status !== '';
      });

      console.log(`[Poll #${this.pollCount}] Retrieved ${activeJobs.length} active jobs (${jobs.length} total)`);

      // Evaluate jobs against alert rules
      const alertResult = this.alertEngine.evaluateJobs(activeJobs);

      // Update statistics
      const responseTime = Date.now() - startTime;
      this.stats.successfulPolls++;
      this.stats.totalJobsProcessed += activeJobs.length;
      this.stats.totalAlertsGenerated += alertResult.new;
      this.stats.averageResponseTime = 
        (this.stats.averageResponseTime * (this.stats.successfulPolls - 1) + responseTime) / 
        this.stats.successfulPolls;

      this.lastPollTime = new Date();

      // Emit events
      this.emit('poll', {
        pollCount: this.pollCount,
        jobCount: activeJobs.length,
        alertResult,
        responseTime,
        timestamp: this.lastPollTime
      });

      if (alertResult.new > 0) {
        this.emit('newAlerts', {
          alerts: alertResult.newAlerts,
          count: alertResult.new
        });
      }

      if (alertResult.resolved > 0) {
        this.emit('resolvedAlerts', {
          alerts: alertResult.resolvedAlerts,
          count: alertResult.resolved
        });
      }

      console.log(`[Poll #${this.pollCount}] Complete in ${responseTime}ms - ${alertResult.total} active alerts (${alertResult.new} new, ${alertResult.resolved} resolved)`);

      return {
        success: true,
        jobs: activeJobs,
        alertResult,
        responseTime
      };

    } catch (error) {
      this.errorCount++;
      this.stats.failedPolls++;
      this.stats.lastError = {
        message: error.message,
        timestamp: new Date().toISOString()
      };

      console.error(`[Poll #${this.pollCount}] Failed:`, error.message);
      this.emit('error', error);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      pollCount: this.pollCount,
      errorCount: this.errorCount,
      lastPollTime: this.lastPollTime,
      uptime: this.isRunning && this.lastPollTime ? 
        Date.now() - this.lastPollTime.getTime() : 0,
      config: {
        interval: this.config.interval,
        batchSize: this.config.batchSize
      }
    };
  }

  /**
   * Get current alerts
   */
  getAlerts(filters = {}) {
    return this.alertEngine.getActiveAlerts(filters);
  }

  /**
   * Get alert summary
   */
  getAlertSummary() {
    const alerts = this.alertEngine.getActiveAlerts();
    const bySeverity = this.alertEngine.getAlertsBySeverity();

    return {
      total: alerts.length,
      bySeverity,
      recent: alerts.slice(0, 10)
    };
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId, acknowledgedBy = 'system') {
    this.alertEngine.acknowledgeAlert(alertId, acknowledgedBy);
    this.emit('alertAcknowledged', { alertId, acknowledgedBy });
  }

  /**
   * Dismiss an alert
   */
  dismissAlert(alertId, dismissedBy = 'system') {
    this.alertEngine.dismissAlert(alertId, dismissedBy);
    this.emit('alertDismissed', { alertId, dismissedBy });
  }

  /**
   * Get alert history
   */
  getAlertHistory(options = {}) {
    return this.alertEngine.getAlertHistory(options);
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalPolls: 0,
      successfulPolls: 0,
      failedPolls: 0,
      totalJobsProcessed: 0,
      totalAlertsGenerated: 0,
      averageResponseTime: 0,
      lastError: null
    };
    this.pollCount = 0;
    this.errorCount = 0;
  }

  /**
   * Get service health status
   */
  getHealth() {
    const successRate = this.stats.totalPolls > 0 ? 
      (this.stats.successfulPolls / this.stats.totalPolls) * 100 : 100;

    const timeSinceLastPoll = this.lastPollTime ? 
      Date.now() - this.lastPollTime.getTime() : null;

    const isHealthy = this.isRunning && 
                     successRate > 90 && 
                     (timeSinceLastPoll === null || timeSinceLastPoll < this.config.interval * 2);

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      isRunning: this.isRunning,
      successRate: Math.round(successRate * 100) / 100,
      lastPollTime: this.lastPollTime,
      timeSinceLastPoll,
      errorCount: this.errorCount,
      lastError: this.stats.lastError
    };
  }
}

module.exports = PollingService;


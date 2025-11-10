/**
 * On-Demand Data Service
 * Fetches fresh data from FileMaker on each request (suitable for serverless)
 * Caches results in memory for a short period to avoid excessive API calls
 */

const { FileMakerAPI } = require('../api/filemaker');
const { AlertEngine } = require('../api/alerts');

class OnDemandDataService {
  constructor(config = {}) {
    this.config = {
      cacheTTL: config.cacheTTL || 30000, // 30 seconds
      batchSize: config.batchSize || 100,
      ...config
    };

    this.fileMakerAPI = new FileMakerAPI(config.fileMaker || {});
    this.alertEngine = new AlertEngine(config.customRules || []);

    // In-memory cache
    this.cache = {
      jobs: null,
      alerts: null,
      timestamp: null
    };

    this.stats = {
      totalFetches: 0,
      successfulFetches: 0,
      failedFetches: 0,
      lastError: null,
      lastFetchTime: null
    };
  }

  /**
   * Check if cache is still valid
   */
  isCacheValid() {
    if (!this.cache.timestamp) return false;
    return Date.now() - this.cache.timestamp < this.config.cacheTTL;
  }

  /**
   * Fetch fresh data from FileMaker
   */
  async fetchData() {
    this.stats.totalFetches++;
    const startTime = Date.now();

    try {
      console.log('[OnDemandDataService] Fetching data from FileMaker...');

      // Fetch jobs from FileMaker
      const jobs = await this.fileMakerAPI.getActiveJobs({
        limit: this.config.batchSize
      });

      // Filter out DELETED jobs
      const activeJobs = jobs.filter(job => {
        const status = job.fieldData?.job_status;
        return status && status !== 'DELETED' && status !== '';
      });

      console.log(`[OnDemandDataService] Retrieved ${activeJobs.length} active jobs`);

      // Generate alerts
      const alertResult = this.alertEngine.evaluateJobs(activeJobs);

      // Get all active alerts from the engine (not just new ones)
      const alerts = this.alertEngine.getActiveAlerts();

      // Update cache
      this.cache = {
        jobs: activeJobs,
        alerts: alerts,
        timestamp: Date.now()
      };

      this.stats.successfulFetches++;
      this.stats.lastFetchTime = new Date().toISOString();

      const responseTime = Date.now() - startTime;
      console.log(`[OnDemandDataService] Data fetch completed in ${responseTime}ms`);

      return {
        success: true,
        jobs: activeJobs,
        alerts: alerts,
        stats: {
          jobCount: activeJobs.length,
          alertCount: alerts.length,
          responseTime
        }
      };
    } catch (error) {
      this.stats.failedFetches++;
      this.stats.lastError = {
        message: error.message,
        timestamp: new Date().toISOString()
      };

      console.error('[OnDemandDataService] Error fetching data:', error.message);

      // Return cached data if available, even if expired
      if (this.cache.alerts) {
        console.log('[OnDemandDataService] Returning stale cached data due to error');
        return {
          success: false,
          error: error.message,
          jobs: this.cache.jobs,
          alerts: this.cache.alerts,
          cached: true,
          stale: true
        };
      }

      throw error;
    }
  }

  /**
   * Get alerts (fetch fresh or return cached)
   */
  async getAlerts(filters = {}) {
    // Use cache if valid
    if (this.isCacheValid() && this.cache.alerts) {
      console.log('[OnDemandDataService] Returning cached alerts');
      return this.applyFilters(this.cache.alerts, filters);
    }

    // Fetch fresh data
    const result = await this.fetchData();

    if (result.success || result.cached) {
      return this.applyFilters(result.alerts, filters);
    }

    return [];
  }

  /**
   * Apply filters to alerts
   */
  applyFilters(alerts, filters = {}) {
    let filtered = alerts;

    if (filters.severity) {
      filtered = filtered.filter(a => a.severity === filters.severity);
    }

    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheValid: this.isCacheValid(),
      cachedAlertCount: this.cache.alerts ? this.cache.alerts.length : 0,
      cachedJobCount: this.cache.jobs ? this.cache.jobs.length : 0
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache = {
      jobs: null,
      alerts: null,
      timestamp: null
    };
  }
}

module.exports = OnDemandDataService;


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
      cacheTTL: config.cacheTTL || 15000, // Reduced to 15 seconds for fresher data
      batchSize: config.batchSize || 200, // Increased batch size
      daysBack: config.daysBack || 30, // Default to last 30 days
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
   * Fetch fresh data from FileMaker with enhanced date filtering
   */
  async fetchData() {
    this.stats.totalFetches++;
    const startTime = Date.now();

    try {
      console.log('[OnDemandDataService] Testing FileMaker connectivity first...');

      // First test basic connectivity by trying to find a known job
      console.log('[OnDemandDataService] Testing with known job lookup...');
      try {
        const testJob = await this.fileMakerAPI.findJob('603142');
        console.log(`[OnDemandDataService] ✅ Basic connectivity test passed - found job: ${testJob?.fieldData?._kp_job_id}`);
      } catch (connectError) {
        console.log(`[OnDemandDataService] ❌ Basic connectivity test failed: ${connectError.message}`);
        throw new Error(`FileMaker connectivity test failed: ${connectError.message}`);
      }

      console.log('[OnDemandDataService] Fetching current data from FileMaker (Nov 11-12, 2025)...');

      // For demo purposes with historical data, use a broader range to get more jobs
      // Database has jobs from 2019-2023, so use all available data
      const endDate = new Date('2023-12-31');
      const startDate = new Date('2020-01-01');

      console.log(`[OnDemandDataService] Date range: ${startDate.toLocaleDateString('en-US')} to ${endDate.toLocaleDateString('en-US')}`);

      // Fetch jobs from FileMaker with date filtering
      const jobs = await this.fileMakerAPI.getActiveJobs({
        limit: this.config.batchSize,
        startDate: startDate.toLocaleDateString('en-US'),
        endDate: endDate.toLocaleDateString('en-US')
      });

      // Filter out DELETED jobs
      const activeJobs = jobs.filter(job => {
        const status = job.fieldData?.job_status;
        return status && status !== 'DELETED' && status !== '';
      });

      console.log(`[OnDemandDataService] Retrieved ${activeJobs.length} active jobs (${jobs.length} total)`);

      // For demo purposes, use all available jobs since database contains historical data
      // In production, this would filter for recent jobs only
      const recentJobs = activeJobs;

      console.log(`[OnDemandDataService] Using all ${recentJobs.length} available jobs for demo`);

      // Generate alerts
      const alertResult = this.alertEngine.evaluateJobs(recentJobs);

      // Get all active alerts from the engine (not just new ones)
      const alerts = this.alertEngine.getActiveAlerts();

      // Update cache
      this.cache = {
        jobs: recentJobs,
        alerts: alerts,
        timestamp: Date.now()
      };

      this.stats.successfulFetches++;
      this.stats.lastFetchTime = new Date().toISOString();

      const responseTime = Date.now() - startTime;
      console.log(`[OnDemandDataService] Data fetch completed in ${responseTime}ms`);

      return {
        success: true,
        jobs: recentJobs,
        alerts: alerts,
        stats: {
          jobCount: recentJobs.length,
          alertCount: alerts.length,
          responseTime,
          dateRange: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          }
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

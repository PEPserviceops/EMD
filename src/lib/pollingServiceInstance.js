/**
 * Polling Service Singleton Instance
 * Ensures only one polling service runs across the application
 */

const PollingService = require('../services/PollingService');
const CacheService = require('../services/CacheService');
const ChangeDetectionService = require('../services/ChangeDetectionService');

let pollingServiceInstance = null;
let cacheServiceInstance = null;
let changeDetectionInstance = null;

/**
 * Get or create the polling service instance
 */
function getPollingService() {
  if (!pollingServiceInstance) {
    // Initialize cache service
    // Disable disk persistence in Vercel (serverless environment)
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
    cacheServiceInstance = new CacheService({
      dbPath: process.env.CACHE_DB_PATH || './data/cache.db',
      ttl: parseInt(process.env.CACHE_TTL) || 300000, // 5 minutes
      maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
      persistToDisk: !isVercel && process.env.CACHE_PERSIST !== 'false'
    });

    // Initialize change detection service
    changeDetectionInstance = new ChangeDetectionService(cacheServiceInstance);

    // Initialize polling service
    pollingServiceInstance = new PollingService({
      interval: parseInt(process.env.POLLING_INTERVAL) || 30000, // 30 seconds
      batchSize: parseInt(process.env.POLLING_BATCH_SIZE) || 100,
      enabled: process.env.POLLING_ENABLED !== 'false',
      fileMaker: {
        host: process.env.FILEMAKER_HOST,
        database: process.env.FILEMAKER_DATABASE,
        layout: process.env.FILEMAKER_LAYOUT,
        username: process.env.FILEMAKER_USER,
        password: process.env.FILEMAKER_PASSWORD
      }
    });

    // Integrate change detection
    pollingServiceInstance.on('poll', (data) => {
      if (data.jobCount > 0) {
        const changes = changeDetectionInstance.detectChanges(data.jobs || []);
        
        if (changes.summary.totalChanges > 0) {
          console.log(`[Change Detection] ${changes.summary.totalChanges} changes detected:`, {
            new: changes.summary.newCount,
            updated: changes.summary.updatedCount,
            deleted: changes.summary.deletedCount
          });

          // Emit change event
          pollingServiceInstance.emit('changes', changes);
        }
      }
    });

    // Log events
    pollingServiceInstance.on('started', () => {
      console.log('✓ Polling service started');
    });

    pollingServiceInstance.on('stopped', () => {
      console.log('✓ Polling service stopped');
    });

    pollingServiceInstance.on('error', (error) => {
      console.error('✗ Polling service error:', error.message);
    });

    pollingServiceInstance.on('newAlerts', (data) => {
      console.log(`⚠ ${data.count} new alert(s) generated`);
    });

    pollingServiceInstance.on('resolvedAlerts', (data) => {
      console.log(`✓ ${data.count} alert(s) resolved`);
    });

    // Auto-start if enabled
    if (process.env.POLLING_AUTO_START !== 'false') {
      pollingServiceInstance.start().catch(error => {
        console.error('Error auto-starting polling service:', error);
      });
    }

    console.log('Polling service instance created');
  }

  return pollingServiceInstance;
}

/**
 * Get the cache service instance
 */
function getCacheService() {
  if (!cacheServiceInstance) {
    getPollingService(); // Initialize if not already
  }
  return cacheServiceInstance;
}

/**
 * Get the change detection service instance
 */
function getChangeDetectionService() {
  if (!changeDetectionInstance) {
    getPollingService(); // Initialize if not already
  }
  return changeDetectionInstance;
}

/**
 * Cleanup on process exit
 */
process.on('SIGINT', async () => {
  console.log('\nShutting down polling service...');
  if (pollingServiceInstance) {
    await pollingServiceInstance.stop();
  }
  if (cacheServiceInstance) {
    cacheServiceInstance.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down polling service...');
  if (pollingServiceInstance) {
    await pollingServiceInstance.stop();
  }
  if (cacheServiceInstance) {
    cacheServiceInstance.close();
  }
  process.exit(0);
});

module.exports = {
  getPollingService,
  getCacheService,
  getChangeDetectionService
};


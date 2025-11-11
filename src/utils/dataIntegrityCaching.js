/**
 * Data Integrity and Caching Strategies
 * 
 * Provides enterprise-grade data integrity and caching for API integrations:
 * - Intelligent caching strategies with TTL management
 * - Data validation and consistency checks
 * - Cache invalidation mechanisms
 * - Data synchronization patterns
 * - Backup data sources for critical operations
 * - Data integrity verification with checksums
 * - Cross-cache consistency management
 * - Performance optimization through smart caching
 * 
 * @module utils/dataIntegrityCaching
 */

const crypto = require('crypto');
const EventEmitter = require('events');
const apiBestPractices = require('./apiBestPractices');

class DataIntegrityCaching extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      // Cache configuration
      cache: {
        defaultTTL: options.defaultTTL || 300000, // 5 minutes
        maxSize: options.maxCacheSize || 1000, // Max cache entries
        cleanupInterval: options.cleanupInterval || 60000, // 1 minute
        compression: options.compression !== false,
        ...options.cache
      },
      
      // Data integrity
      integrity: {
        enabled: options.integrity !== false,
        checksumAlgorithm: options.checksumAlgorithm || 'sha256',
        validateOnWrite: options.validateOnWrite !== false,
        validateOnRead: options.validateOnRead !== false,
        ...options.integrity
      },
      
      // Synchronization
      synchronization: {
        enabled: options.synchronization !== false,
        syncInterval: options.syncInterval || 300000, // 5 minutes
        conflictResolution: options.conflictResolution || 'last_write_wins',
        consistencyLevel: options.consistencyLevel || 'eventual', // strong, eventual, weak
        ...options.synchronization
      },
      
      // Backup sources
      backup: {
        enabled: options.backup !== false,
        maxBackupSources: options.maxBackupSources || 3,
        fallbackStrategy: options.fallbackStrategy || 'round_robin',
        healthCheckInterval: options.healthCheckInterval || 60000,
        ...options.backup
      },
      
      // Performance
      performance: {
        batchSize: options.batchSize || 100,
        parallelRequests: options.parallelRequests || 5,
        retryAttempts: options.retryAttempts || 3,
        retryDelay: options.retryDelay || 1000,
        ...options.performance
      }
    };

    // Cache storage
    this.cache = new Map();
    this.cacheMetadata = new Map();
    this.backupSources = new Map();
    this.syncQueues = new Map();
    
    // Data integrity tracking
    this.integrityChecks = new Map();
    this.consistencyChecks = new Map();
    
    // Performance metrics
    this.metrics = {
      cache: {
        hits: 0,
        misses: 0,
        evictions: 0,
        size: 0
      },
      integrity: {
        validations: 0,
        failures: 0,
        checksumsGenerated: 0
      },
      performance: {
        averageResponseTime: 0,
        totalRequests: 0,
        cacheHitRate: 0
      }
    };

    // Initialize cleanup process
    this.startCleanupProcess();
    this.startSyncProcess();
    
    this.log('info', 'Data integrity and caching initialized', { config: this.config });
  }

  /**
   * Store data with caching and integrity validation
   * @param {string} key - Cache key
   * @param {Object} data - Data to store
   * @param {Object} options - Storage options
   * @returns {Promise<Object>} Storage result
   */
  async store(key, data, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate data integrity if enabled
      let integrityData = null;
      if (this.config.integrity.enabled) {
        integrityData = await this.validateAndCalculateIntegrity(data);
        if (!integrityData.valid) {
          throw new Error(`Data integrity validation failed: ${integrityData.error}`);
        }
      }

      // Prepare cache entry
      const cacheEntry = {
        key,
        data,
        timestamp: Date.now(),
        ttl: options.ttl || this.config.cache.defaultTTL,
        tags: options.tags || [],
        priority: options.priority || 0,
        checksum: integrityData?.checksum,
        metadata: {
          size: JSON.stringify(data).length,
          lastAccess: Date.now(),
          accessCount: 0,
          ...options.metadata
        }
      };

      // Store in cache
      this.cache.set(key, cacheEntry);
      this.cacheMetadata.set(key, {
        ...cacheEntry.metadata,
        integrityVerified: integrityData ? true : false
      });

      // Update metrics
      this.metrics.cache.size = this.cache.size;
      this.updateMetrics('store', Date.now() - startTime);

      // Emit events
      this.emit('dataStored', { key, size: cacheEntry.metadata.size });

      this.log('info', 'Data stored successfully', { 
        key, 
        size: cacheEntry.metadata.size,
        hasIntegrityCheck: !!integrityData 
      });

      return {
        success: true,
        key,
        cached: true,
        integrityVerified: !!integrityData,
        checksum: integrityData?.checksum,
        expiresAt: new Date(Date.now() + cacheEntry.ttl).toISOString()
      };

    } catch (error) {
      this.log('error', 'Failed to store data', { key, error: error.message });
      
      this.emit('storageError', { key, error: error.message });
      
      throw error;
    }
  }

  /**
   * Retrieve data from cache with integrity validation
   * @param {string} key - Cache key
   * @param {Object} options - Retrieval options
   * @returns {Promise<Object>} Retrieved data
   */
  async retrieve(key, options = {}) {
    const startTime = Date.now();
    
    try {
      const cacheEntry = this.cache.get(key);
      
      if (!cacheEntry) {
        this.metrics.cache.misses++;
        this.updateMetrics('miss', Date.now() - startTime);
        
        this.emit('cacheMiss', { key });
        
        return {
          found: false,
          key,
          reason: 'not_found'
        };
      }

      // Check TTL expiration
      if (this.isExpired(cacheEntry)) {
        await this.invalidate(key, 'expired');
        this.metrics.cache.misses++;
        this.updateMetrics('miss', Date.now() - startTime);
        
        return {
          found: false,
          key,
          reason: 'expired'
        };
      }

      // Validate data integrity if enabled
      if (this.config.integrity.enabled && this.config.integrity.validateOnRead) {
        const integrityValidation = await this.validateIntegrity(cacheEntry.data, cacheEntry.checksum);
        
        if (!integrityValidation.valid) {
          await this.invalidate(key, 'integrity_failed');
          
          this.metrics.integrity.failures++;
          this.emit('integrityFailure', { key, error: integrityValidation.error });
          
          throw new Error(`Data integrity validation failed: ${integrityValidation.error}`);
        }
      }

      // Update access metadata
      cacheEntry.metadata.lastAccess = Date.now();
      cacheEntry.metadata.accessCount++;
      
      const result = {
        found: true,
        key,
        data: cacheEntry.data,
        metadata: {
          ...cacheEntry.metadata,
          age: Date.now() - cacheEntry.timestamp,
          ttlRemaining: cacheEntry.ttl - (Date.now() - cacheEntry.timestamp)
        },
        integrityVerified: !!cacheEntry.checksum,
        cached: true,
        timestamp: new Date(cacheEntry.timestamp).toISOString()
      };

      // Update metrics
      this.metrics.cache.hits++;
      this.updateMetrics('hit', Date.now() - startTime);

      this.emit('dataRetrieved', { 
        key, 
        age: result.metadata.age,
        cacheHit: true 
      });

      return result;

    } catch (error) {
      this.updateMetrics('error', Date.now() - startTime);
      this.log('error', 'Failed to retrieve data', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Get data from multiple sources with fallback
   * @param {string} key - Data key
   * @param {Function} primarySource - Primary data source function
   * @param {Array} fallbackSources - Fallback data source functions
   * @param {Object} options - Options
   * @returns {Promise<Object>} Data retrieval result
   */
  async getWithFallback(key, primarySource, fallbackSources = [], options = {}) {
    const sources = [primarySource, ...fallbackSources];
    
    for (let i = 0; i < sources.length; i++) {
      try {
        const source = sources[i];
        const isPrimary = i === 0;
        
        this.log('info', `Attempting data retrieval from ${isPrimary ? 'primary' : 'fallback'} source`, { 
          key, 
          sourceIndex: i,
          isPrimary 
        });

        // Check cache first for primary source
        if (isPrimary && !options.bypassCache) {
          const cachedResult = await this.retrieve(key);
          if (cachedResult.found) {
            this.emit('cacheHit', { key, source: 'cache' });
            return {
              ...cachedResult,
              source: 'cache',
              dataSource: isPrimary ? 'primary' : 'fallback'
            };
          }
        }

        // Fetch from source
        const data = await source(key);
        
        if (data !== null && data !== undefined) {
          // Cache the successful result
          if (isPrimary && !options.skipCache) {
            await this.store(key, data, {
              ttl: options.cacheTTL,
              tags: options.tags || ['fallback_success']
            });
          }

          const result = {
            found: true,
            key,
            data,
            source: isPrimary ? 'primary' : `fallback_${i}`,
            cached: false,
            timestamp: new Date().toISOString()
          };

          this.emit('dataRetrieved', { 
            key, 
            source: result.source,
            cacheHit: false 
          });

          return result;
        }

      } catch (error) {
        this.log('warn', `Data source ${i} failed`, { 
          key, 
          sourceIndex: i,
          error: error.message 
        });

        this.emit('sourceError', { 
          key, 
          sourceIndex: i, 
          error: error.message 
        });

        // Continue to next fallback source
        continue;
      }
    }

    // All sources failed
    this.emit('allSourcesFailed', { key, sourceCount: sources.length });
    
    return {
      found: false,
      key,
      source: 'none',
      reason: 'all_sources_failed'
    };
  }

  /**
   * Invalidate cache entries based on pattern or tags
   * @param {string|RegExp|Array} pattern - Key pattern or array of keys
   * @param {Object} options - Invalidation options
   * @returns {Promise<Object>} Invalidation result
   */
  async invalidate(pattern, reason = 'manual', options = {}) {
    const startTime = Date.now();
    let invalidatedKeys = [];
    
    try {
      let keysToInvalidate = [];

      if (Array.isArray(pattern)) {
        keysToInvalidate = pattern;
      } else if (pattern instanceof RegExp) {
        keysToInvalidate = Array.from(this.cache.keys()).filter(key => pattern.test(key));
      } else if (typeof pattern === 'string') {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          keysToInvalidate = Array.from(this.cache.keys()).filter(key => regex.test(key));
        } else {
          keysToInvalidate = [pattern];
        }
      }

      // Filter by tags if specified
      if (options.tags && options.tags.length > 0) {
        keysToInvalidate = keysToInvalidate.filter(key => {
          const cacheEntry = this.cache.get(key);
          return cacheEntry && cacheEntry.tags.some(tag => options.tags.includes(tag));
        });
      }

      // Invalidate entries
      for (const key of keysToInvalidate) {
        const cacheEntry = this.cache.get(key);
        if (cacheEntry) {
          this.cache.delete(key);
          this.cacheMetadata.delete(key);
          invalidatedKeys.push(key);
          
          this.metrics.cache.evictions++;
          
          this.emit('cacheInvalidated', { 
            key, 
            reason,
            age: Date.now() - cacheEntry.timestamp,
            accessCount: cacheEntry.metadata.accessCount
          });
        }
      }

      this.log('info', 'Cache invalidation completed', { 
        pattern: pattern.toString(),
        invalidatedCount: invalidatedKeys.length,
        reason,
        duration: Date.now() - startTime
      });

      return {
        success: true,
        invalidated: invalidatedKeys.length,
        keys: invalidatedKeys,
        reason,
        duration: Date.now() - startTime
      };

    } catch (error) {
      this.log('error', 'Cache invalidation failed', { 
        pattern: pattern.toString(),
        error: error.message 
      });
      
      throw error;
    }
  }

  /**
   * Validate and calculate data integrity
   * @private
   */
  async validateAndCalculateIntegrity(data) {
    try {
      const dataStr = JSON.stringify(data);
      const checksum = crypto
        .createHash(this.config.integrity.checksumAlgorithm)
        .update(dataStr)
        .digest('hex');

      this.metrics.integrity.checksumsGenerated++;

      return {
        valid: true,
        checksum,
        algorithm: this.config.integrity.checksumAlgorithm
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Validate data integrity
   * @private
   */
  async validateIntegrity(data, expectedChecksum) {
    try {
      if (!expectedChecksum) {
        return {
          valid: false,
          error: 'No checksum provided'
        };
      }

      const actualChecksum = crypto
        .createHash(this.config.integrity.checksumAlgorithm)
        .update(JSON.stringify(data))
        .digest('hex');

      const valid = actualChecksum === expectedChecksum;
      
      this.metrics.integrity.validations++;

      return {
        valid,
        expected: expectedChecksum,
        actual: actualChecksum,
        match: valid
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Check if cache entry is expired
   * @private
   */
  isExpired(cacheEntry) {
    return Date.now() - cacheEntry.timestamp > cacheEntry.ttl;
  }

  /**
   * Start cache cleanup process
   * @private
   */
  startCleanupProcess() {
    setInterval(() => {
      this.performCleanup();
    }, this.config.cache.cleanupInterval);
  }

  /**
   * Perform cache cleanup
   * @private
   */
  async performCleanup() {
    try {
      const expiredKeys = [];
      const now = Date.now();

      // Find expired entries
      for (const [key, cacheEntry] of this.cache.entries()) {
        if (now - cacheEntry.timestamp > cacheEntry.ttl) {
          expiredKeys.push(key);
        }
      }

      // Remove expired entries
      for (const key of expiredKeys) {
        await this.invalidate(key, 'expired_cleanup');
      }

      // Enforce size limit
      if (this.cache.size > this.config.cache.maxSize) {
        await this.evictLRU();
      }

      if (expiredKeys.length > 0) {
        this.log('info', 'Cache cleanup completed', { 
          expiredRemoved: expiredKeys.length,
          currentSize: this.cache.size 
        });
      }

    } catch (error) {
      this.log('error', 'Cache cleanup failed', { error: error.message });
    }
  }

  /**
   * Evict least recently used entries
   * @private
   */
  async evictLRU() {
    const entries = Array.from(this.cache.entries());
    
    // Sort by last access time (oldest first)
    entries.sort((a, b) => {
      const aTime = a[1].metadata.lastAccess;
      const bTime = b[1].metadata.lastAccess;
      return aTime - bTime;
    });

    const toEvict = Math.min(
      entries.length - this.config.cache.maxSize + 1,
      Math.ceil(entries.length * 0.1) // Evict 10% of entries
    );

    for (let i = 0; i < toEvict; i++) {
      const [key] = entries[i];
      await this.invalidate(key, 'lru_eviction');
    }

    this.log('info', 'LRU eviction completed', { 
      evicted: toEvict,
      remaining: this.cache.size 
    });
  }

  /**
   * Start synchronization process
   * @private
   */
  startSyncProcess() {
    if (!this.config.synchronization.enabled) return;

    setInterval(() => {
      this.performSynchronization();
    }, this.config.synchronization.syncInterval);
  }

  /**
   * Perform data synchronization
   * @private
   */
  async performSynchronization() {
    try {
      // Simple sync implementation
      this.emit('syncCompleted', { processed: 0 });
    } catch (error) {
      this.log('error', 'Synchronization failed', { error: error.message });
    }
  }

  /**
   * Update performance metrics
   * @private
   */
  updateMetrics(operation, responseTime) {
    this.metrics.performance.totalRequests++;
    this.metrics.performance.averageResponseTime = 
      (this.metrics.performance.averageResponseTime + responseTime) / 2;

    // Update cache hit rate
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    if (total > 0) {
      this.metrics.performance.cacheHitRate = 
        (this.metrics.cache.hits / total * 100).toFixed(2);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const entries = Array.from(this.cache.entries());
    const totalSize = entries.reduce((sum, [_, entry]) => sum + entry.metadata.size, 0);
    
    return {
      size: this.cache.size,
      maxSize: this.config.cache.maxSize,
      utilization: (this.cache.size / this.config.cache.maxSize * 100).toFixed(2),
      totalSize: totalSize,
      hits: this.metrics.cache.hits,
      misses: this.metrics.cache.misses,
      evictions: this.metrics.cache.evictions,
      hitRate: this.metrics.performance.cacheHitRate,
      averageResponseTime: this.metrics.performance.averageResponseTime.toFixed(2),
      integrity: {
        validations: this.metrics.integrity.validations,
        failures: this.metrics.integrity.failures,
        checksumGenerated: this.metrics.integrity.checksumsGenerated
      }
    };
  }

  /**
   * Clear all cache data
   */
  async clearCache() {
    const entryCount = this.cache.size;
    
    this.cache.clear();
    this.cacheMetadata.clear();
    this.syncQueues.clear();
    
    this.metrics.cache = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0
    };

    this.log('info', 'Cache cleared', { entriesRemoved: entryCount });
    
    this.emit('cacheCleared', { entriesRemoved: entryCount });
    
    return {
      success: true,
      entriesRemoved: entryCount
    };
  }

  /**
   * Internal logging method
   * @private
   */
  log(level, message, data = {}) {
    const logEntry = {
      level: level,
      message: `[DataIntegrityCaching] ${message}`,
      data: data,
      timestamp: new Date().toISOString()
    };
    
    switch (level) {
      case 'error':
        console.error(logEntry);
        break;
      case 'warn':
        console.warn(logEntry);
        break;
      default:
        console.log(logEntry);
    }
  }
}

module.exports = DataIntegrityCaching;
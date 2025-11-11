/**
 * Intelligent Rate Limiter
 * 
 * Provides advanced rate limiting for API calls with:
 * - Configurable rate limits (requests per second, minute, hour)
 * - Token bucket algorithm for smooth rate limiting
 * - Request deduplication to avoid duplicate calls
 * - Priority-based request handling
 * - Cost tracking and budget management
 * - Queue management for burst handling
 * - Adaptive rate limiting based on API responses
 * - Comprehensive metrics and monitoring
 * 
 * @module utils/rateLimiter
 */

const crypto = require('crypto');

class RateLimiter {
  constructor(options = {}) {
    this.config = {
      // Basic rate limits
      requestsPerSecond: options.requestsPerSecond || 10,
      requestsPerMinute: options.requestsPerMinute || 300,
      requestsPerHour: options.requestsPerHour || 10000,
      requestsPerDay: options.requestsPerDay || 100000,

      // Token bucket configuration
      bucketSize: options.bucketSize || 100, // Max tokens in bucket
      refillRate: options.refillRate || 1, // Tokens per second
      refillInterval: options.refillInterval || 1000, // ms

      // Cost management
      costTracking: options.costTracking || false,
      budgetLimits: options.budgetLimits || {}, // { perDay: 100, perMonth: 1000 }
      costPerRequest: options.costPerRequest || 1,

      // Request deduplication
      deduplication: options.deduplication !== false,
      dedupCacheSize: options.dedupCacheSize || 1000,
      dedupTimeout: options.dedupTimeout || 5000, // 5 seconds

      // Queue management
      enableQueue: options.enableQueue !== false,
      maxQueueSize: options.maxQueueSize || 1000,
      queueTimeout: options.queueTimeout || 30000, // 30 seconds

      // Adaptive rate limiting
      adaptive: options.adaptive !== false,
      errorRateThreshold: options.errorRateThreshold || 0.05, // 5% error rate
      responseTimeThreshold: options.responseTimeThreshold || 5000, // 5 seconds

      // Monitoring
      monitoring: options.monitoring !== false,
      metricsRetention: options.metricsRetention || 3600000 // 1 hour
    };

    // Token buckets for different time windows
    this.buckets = {
      second: {
        tokens: this.config.bucketSize,
        lastRefill: Date.now(),
        maxTokens: this.config.bucketSize
      },
      minute: {
        tokens: this.config.requestsPerMinute,
        lastRefill: Date.now(),
        maxTokens: this.config.requestsPerMinute
      },
      hour: {
        tokens: this.config.requestsPerHour,
        lastRefill: Date.now(),
        maxTokens: this.config.requestsPerHour
      },
      day: {
        tokens: this.config.requestsPerDay,
        lastRefill: Date.now(),
        maxTokens: this.config.requestsPerDay
      }
    };

    // Request queue for handling bursts
    this.queue = [];
    this.isProcessingQueue = false;
    
    // Request deduplication cache
    this.dedupCache = new Map();
    
    // Metrics tracking
    this.metrics = {
      totalRequests: 0,
      allowedRequests: 0,
      rateLimitedRequests: 0,
      queuedRequests: 0,
      deduplicatedRequests: 0,
      errors: {
        rateLimited: 0,
        queueFull: 0,
        budgetExceeded: 0,
        system: 0
      },
      responseTimes: [],
      costTracking: {
        totalCost: 0,
        dailyCost: 0,
        monthlyCost: 0,
        budgetUsed: {}
      },
      buckets: {
        second: { used: 0, limit: this.config.requestsPerSecond },
        minute: { used: 0, limit: this.config.requestsPerMinute },
        hour: { used: 0, limit: this.config.requestsPerHour },
        day: { used: 0, limit: this.config.requestsPerDay }
      }
    };

    // Rate limiting history for adaptive algorithms
    this.rateHistory = [];
    this.errorHistory = [];
    
    // Start token refill process
    this.startRefillProcess();
    
    this.log('info', 'Rate limiter initialized', { config: this.config });
  }

  /**
   * Check if request is allowed and acquire tokens
   * @param {Object} request - Request information
   * @returns {Promise<Object>} Rate limiting result
   */
  async checkRateLimit(request = {}) {
    const requestId = request.id || crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Generate request fingerprint for deduplication
      const fingerprint = this.generateRequestFingerprint(request);

      // Check deduplication cache
      if (this.config.deduplication && this.dedupCache.has(fingerprint)) {
        const cachedResponse = this.dedupCache.get(fingerprint);
        if (Date.now() - cachedResponse.timestamp < this.config.dedupTimeout) {
          this.metrics.deduplicatedRequests++;
          this.log('info', 'Request deduplicated', { fingerprint, requestId });
          
          return {
            allowed: true,
            deduplicated: true,
            cachedResponse: cachedResponse.response,
            waitTime: 0,
            tokensUsed: {
              second: 0,
              minute: 0,
              hour: 0,
              day: 0
            }
          };
        }
      }

      // Refill tokens
      this.refillTokens();

      // Check all bucket limits
      const tokensNeeded = this.calculateTokensNeeded(request);
      const tokenCheck = this.checkTokenAvailability(tokensNeeded);

      if (!tokenCheck.allowed) {
        this.metrics.rateLimitedRequests++;
        this.metrics.errors.rateLimited++;
        
        this.log('warn', 'Request rate limited', { 
          requestId, 
          tokensNeeded, 
          availableTokens: tokenCheck.available 
        });
        
        return {
          allowed: false,
          reason: 'rate_limited',
          availableTokens: tokenCheck.available,
          tokensNeeded: tokensNeeded,
          waitTime: this.calculateWaitTime(tokensNeeded),
          retryAfter: this.getRetryAfter(tokensNeeded)
        };
      }

      // Check budget limits if enabled
      if (this.config.costTracking && this.config.budgetLimits) {
        const budgetCheck = this.checkBudgetLimits(tokensNeeded);
        if (!budgetCheck.allowed) {
          this.metrics.errors.budgetExceeded++;
          
          this.log('warn', 'Budget exceeded', { 
            requestId, 
            budgetCheck,
            tokensNeeded 
          });
          
          return {
            allowed: false,
            reason: 'budget_exceeded',
            budgetStatus: budgetCheck,
            waitTime: this.calculateWaitTime(tokensNeeded)
          };
        }
      }

      // Consume tokens
      this.consumeTokens(tokensNeeded);

      // Calculate response time
      const responseTime = Date.now() - startTime;
      this.recordMetrics(responseTime, true);

      // Adaptive rate limiting based on response time
      if (this.config.adaptive) {
        this.adjustRateLimit(responseTime);
      }

      // Cache successful request for deduplication
      if (this.config.deduplication) {
        this.dedupCache.set(fingerprint, {
          timestamp: Date.now(),
          response: { success: true, requestId }
        });
        
        // Clean old cache entries
        this.cleanupDedupCache();
      }

      this.metrics.allowedRequests++;
      this.updateUsageMetrics(tokensNeeded);

      this.log('info', 'Request allowed', { 
        requestId, 
        tokensUsed: tokensNeeded,
        responseTime 
      });

      return {
        allowed: true,
        deduplicated: false,
        tokensUsed: tokensNeeded,
        waitTime: 0,
        fingerprint: fingerprint
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordMetrics(responseTime, false);
      this.metrics.errors.system++;

      this.log('error', 'Rate limit check failed', { 
        requestId, 
        error: error.message,
        responseTime 
      });

      return {
        allowed: false,
        reason: 'system_error',
        error: error.message,
        waitTime: 1000 // Wait 1 second before retry
      };
    }
  }

  /**
   * Queue a request when rate limited
   * @param {Object} request - Request to queue
   * @returns {Promise<Object>} Queue result
   */
  async queueRequest(request = {}) {
    if (!this.config.enableQueue) {
      return {
        queued: false,
        reason: 'queue_disabled'
      };
    }

    if (this.queue.length >= this.config.maxQueueSize) {
      this.metrics.errors.queueFull++;
      
      this.log('warn', 'Queue full, request rejected', { 
        queueSize: this.queue.length,
        maxSize: this.config.maxQueueSize
      });
      
      return {
        queued: false,
        reason: 'queue_full',
        queueSize: this.queue.length
      };
    }

    const queueItem = {
      id: crypto.randomUUID(),
      request: request,
      timestamp: Date.now(),
      priority: request.priority || 0,
      timeout: this.config.queueTimeout
    };

    this.queue.push(queueItem);
    this.metrics.queuedRequests++;

    // Sort queue by priority (higher priority first)
    this.queue.sort((a, b) => b.priority - a.priority);

    this.log('info', 'Request queued', { 
      queueId: queueItem.id,
      queueSize: this.queue.length,
      priority: queueItem.priority
    });

    // Start processing queue if not already running
    if (!this.isProcessingQueue) {
      this.processQueue();
    }

    return {
      queued: true,
      queueId: queueItem.id,
      position: this.queue.findIndex(item => item.id === queueItem.id) + 1,
      estimatedWaitTime: this.calculateQueueWaitTime(queueItem)
    };
  }

  /**
   * Process the request queue
   * @private
   */
  async processQueue() {
    if (this.isProcessingQueue || this.queue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    this.log('info', 'Starting queue processing', { queueSize: this.queue.length });

    while (this.queue.length > 0) {
      const queueItem = this.queue.shift();
      
      try {
        // Check if request has timed out
        if (Date.now() - queueItem.timestamp > queueItem.timeout) {
          this.log('warn', 'Queued request timed out', { 
            queueId: queueItem.id,
            waitTime: Date.now() - queueItem.timestamp
          });
          
          // Emit timeout event if callback provided
          if (queueItem.request.onTimeout) {
            queueItem.request.onTimeout();
          }
          continue;
        }

        // Check rate limit again
        const rateLimitResult = await this.checkRateLimit(queueItem.request);
        
        if (rateLimitResult.allowed) {
          this.log('info', 'Queued request processed', { 
            queueId: queueItem.id,
            waitTime: Date.now() - queueItem.timestamp
          });
          
          // Execute callback if provided
          if (queueItem.request.onAllowed) {
            await queueItem.request.onAllowed(rateLimitResult);
          }
        } else {
          // Re-queue if still rate limited (with timeout protection)
          if (Date.now() - queueItem.timestamp < queueItem.timeout / 2) {
            this.queue.unshift(queueItem); // Re-queue at front
          } else {
            this.log('warn', 'Queued request timed out during processing', { 
              queueId: queueItem.id 
            });
            
            if (queueItem.request.onTimeout) {
              queueItem.request.onTimeout();
            }
          }
        }

      } catch (error) {
        this.log('error', 'Error processing queued request', { 
          queueId: queueItem.id,
          error: error.message 
        });
        
        if (queueItem.request.onError) {
          queueItem.request.onError(error);
        }
      }

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isProcessingQueue = false;
    this.log('info', 'Queue processing completed');
  }

  /**
   * Start the token refill process
   * @private
   */
  startRefillProcess() {
    setInterval(() => {
      this.refillTokens();
    }, this.config.refillInterval);
  }

  /**
   * Refill token buckets
   * @private
   */
  refillTokens() {
    const now = Date.now();
    
    for (const [window, bucket] of Object.entries(this.buckets)) {
      const timeDiff = now - bucket.lastRefill;
      const refillRate = this.getRefillRate(window);
      
      if (timeDiff > 0) {
        const tokensToAdd = Math.floor(timeDiff / this.config.refillInterval * refillRate);
        
        if (tokensToAdd > 0) {
          bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
          bucket.lastRefill = now;
        }
      }
    }
  }

  /**
   * Get refill rate for time window
   * @private
   */
  getRefillRate(window) {
    const rates = {
      second: this.config.requestsPerSecond,
      minute: Math.ceil(this.config.requestsPerMinute / 60),
      hour: Math.ceil(this.config.requestsPerHour / 3600),
      day: Math.ceil(this.config.requestsPerDay / 86400)
    };
    
    return rates[window] || 1;
  }

  /**
   * Generate request fingerprint for deduplication
   * @private
   */
  generateRequestFingerprint(request) {
    const fingerprintData = {
      method: request.method || 'GET',
      url: request.url || '',
      headers: request.headers || {},
      body: request.body || {},
      params: request.params || {}
    };
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');
  }

  /**
   * Calculate tokens needed for request
   * @private
   */
  calculateTokensNeeded(request) {
    return {
      second: 1,
      minute: 1,
      hour: 1,
      day: 1,
      cost: this.config.costPerRequest
    };
  }

  /**
   * Check if sufficient tokens are available
   * @private
   */
  checkTokenAvailability(tokensNeeded) {
    const available = {};
    let allowed = true;
    
    for (const [window, needed] of Object.entries(tokensNeeded)) {
      if (window === 'cost') continue;
      
      available[window] = this.buckets[window].tokens;
      
      if (needed > available[window]) {
        allowed = false;
      }
    }
    
    return { allowed, available };
  }

  /**
   * Consume tokens from buckets
   * @private
   */
  consumeTokens(tokensNeeded) {
    for (const [window, needed] of Object.entries(tokensNeeded)) {
      if (window === 'cost') continue;
      
      if (this.buckets[window] && this.buckets[window].tokens >= needed) {
        this.buckets[window].tokens -= needed;
      }
    }
  }

  /**
   * Calculate wait time for rate limit
   * @private
   */
  calculateWaitTime(tokensNeeded) {
    let maxWaitTime = 0;
    
    for (const [window, needed] of Object.entries(tokensNeeded)) {
      if (window === 'cost') continue;
      
      const bucket = this.buckets[window];
      const deficit = needed - bucket.tokens;
      
      if (deficit > 0) {
        const refillRate = this.getRefillRate(window);
        const waitTime = (deficit / refillRate) * this.config.refillInterval;
        maxWaitTime = Math.max(maxWaitTime, waitTime);
      }
    }
    
    return Math.ceil(maxWaitTime);
  }

  /**
   * Calculate queue wait time
   * @private
   */
  calculateQueueWaitTime(queueItem) {
    const position = this.queue.findIndex(item => item.id === queueItem.id);
    if (position === -1) return 0;
    
    // Estimate based on average processing time and queue position
    const avgProcessingTime = 100; // ms
    return (position + 1) * avgProcessingTime;
  }

  /**
   * Check budget limits
   * @private
   */
  checkBudgetLimits(tokensNeeded) {
    const cost = tokensNeeded.cost || 1;
    const currentCost = this.metrics.costTracking.totalCost;
    
    const budgetStatus = {};
    let allowed = true;
    
    for (const [period, limit] of Object.entries(this.config.budgetLimits)) {
      let currentPeriodCost = 0;
      
      // Calculate current period cost based on period
      switch (period) {
        case 'daily':
          currentPeriodCost = this.metrics.costTracking.dailyCost;
          break;
        case 'monthly':
          currentPeriodCost = this.metrics.costTracking.monthlyCost;
          break;
        default:
          currentPeriodCost = currentCost;
      }
      
      const remaining = limit - currentPeriodCost;
      budgetStatus[period] = {
        limit: limit,
        used: currentPeriodCost,
        remaining: remaining,
        canAfford: remaining >= cost
      };
      
      if (!budgetStatus[period].canAfford) {
        allowed = false;
      }
    }
    
    return { allowed, budgetStatus };
  }

  /**
   * Adaptive rate limiting adjustment
   * @private
   */
  adjustRateLimit(responseTime) {
    // Record response time for analysis
    this.rateHistory.push({
      timestamp: Date.now(),
      responseTime: responseTime,
      success: responseTime < this.config.responseTimeThreshold
    });
    
    // Keep only recent history
    const cutoffTime = Date.now() - this.config.metricsRetention;
    this.rateHistory = this.rateHistory.filter(entry => entry.timestamp > cutoffTime);
    
    // Calculate error rate
    const recentRequests = this.rateHistory.filter(entry => 
      entry.timestamp > Date.now() - 60000 // Last minute
    );
    
    if (recentRequests.length > 0) {
      const errorRate = recentRequests.filter(entry => !entry.success).length / recentRequests.length;
      
      if (errorRate > this.config.errorRateThreshold) {
        // Reduce rate limits temporarily
        this.reduceRateLimits(errorRate);
        this.log('warn', 'Rate limits reduced due to high error rate', { errorRate });
      }
    }
  }

  /**
   * Reduce rate limits temporarily
   * @private
   */
  reduceRateLimits(errorRate) {
    const reductionFactor = Math.min(errorRate / this.config.errorRateThreshold, 0.5);
    
    for (const [window, bucket] of Object.entries(this.buckets)) {
      bucket.tokens = Math.floor(bucket.tokens * (1 - reductionFactor));
      bucket.maxTokens = Math.floor(bucket.maxTokens * (1 - reductionFactor * 0.1));
    }
  }

  /**
   * Record metrics
   * @private
   */
  recordMetrics(responseTime, success) {
    this.metrics.totalRequests++;
    this.metrics.responseTimes.push(responseTime);
    
    // Keep only recent response times
    const cutoffTime = Date.now() - this.config.metricsRetention;
    this.metrics.responseTimes = this.metrics.responseTimes.filter(time => time > cutoffTime);
    
    // Track errors
    if (!success) {
      this.errorHistory.push({
        timestamp: Date.now(),
        responseTime: responseTime
      });
    }
  }

  /**
   * Update usage metrics
   * @private
   */
  updateUsageMetrics(tokensUsed) {
    for (const [window, used] of Object.entries(tokensUsed)) {
      if (window === 'cost') continue;
      
      if (this.metrics.buckets[window]) {
        this.metrics.buckets[window].used++;
      }
    }
    
    if (this.config.costTracking) {
      const cost = tokensUsed.cost || 1;
      this.metrics.costTracking.totalCost += cost;
      this.metrics.costTracking.dailyCost += cost;
      this.metrics.costTracking.monthlyCost += cost;
    }
  }

  /**
   * Get retry-after header value
   * @private
   */
  getRetryAfter(tokensNeeded) {
    const waitTime = this.calculateWaitTime(tokensNeeded);
    return Math.ceil(waitTime / 1000); // Return seconds
  }

  /**
   * Clean up deduplication cache
   * @private
   */
  cleanupDedupCache() {
    const now = Date.now();
    const cutoffTime = now - this.config.dedupTimeout;
    
    for (const [fingerprint, cached] of this.dedupCache.entries()) {
      if (cached.timestamp < cutoffTime) {
        this.dedupCache.delete(fingerprint);
      }
    }
    
    // Limit cache size
    if (this.dedupCache.size > this.config.dedupCacheSize) {
      const entries = Array.from(this.dedupCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest entries
      const toRemove = entries.slice(0, this.dedupCache.size - this.config.dedupCacheSize);
      for (const [fingerprint] of toRemove) {
        this.dedupCache.delete(fingerprint);
      }
    }
  }

  /**
   * Get current rate limiting status
   */
  getStatus() {
    this.refillTokens(); // Ensure tokens are current
    
    return {
      buckets: {
        second: {
          used: this.buckets.second.maxTokens - this.buckets.second.tokens,
          limit: this.buckets.second.maxTokens,
          remaining: this.buckets.second.tokens,
          resetTime: this.buckets.second.lastRefill + this.config.refillInterval
        },
        minute: {
          used: this.buckets.minute.maxTokens - this.buckets.minute.tokens,
          limit: this.buckets.minute.maxTokens,
          remaining: this.buckets.minute.tokens,
          resetTime: this.buckets.minute.lastRefill + this.config.refillInterval
        },
        hour: {
          used: this.buckets.hour.maxTokens - this.buckets.hour.tokens,
          limit: this.buckets.hour.maxTokens,
          remaining: this.buckets.hour.tokens,
          resetTime: this.buckets.hour.lastRefill + this.config.refillInterval
        },
        day: {
          used: this.buckets.day.maxTokens - this.buckets.day.tokens,
          limit: this.buckets.day.maxTokens,
          remaining: this.buckets.day.tokens,
          resetTime: this.buckets.day.lastRefill + this.config.refillInterval
        }
      },
      queue: {
        size: this.queue.length,
        maxSize: this.config.maxQueueSize,
        isProcessing: this.isProcessingQueue
      },
      metrics: {
        ...this.metrics,
        averageResponseTime: this.metrics.responseTimes.length > 0 ?
          this.metrics.responseTimes.reduce((sum, time) => sum + time, 0) / this.metrics.responseTimes.length : 0
      },
      config: this.config
    };
  }

  /**
   * Reset rate limiter metrics
   */
  reset() {
    this.metrics.totalRequests = 0;
    this.metrics.allowedRequests = 0;
    this.metrics.rateLimitedRequests = 0;
    this.metrics.queuedRequests = 0;
    this.metrics.deduplicatedRequests = 0;
    this.metrics.errors = {
      rateLimited: 0,
      queueFull: 0,
      budgetExceeded: 0,
      system: 0
    };
    this.metrics.responseTimes = [];
    this.metrics.costTracking = {
      totalCost: 0,
      dailyCost: 0,
      monthlyCost: 0,
      budgetUsed: {}
    };
    
    // Reset buckets
    for (const [window, bucket] of Object.entries(this.buckets)) {
      bucket.tokens = bucket.maxTokens;
      bucket.lastRefill = Date.now();
    }
    
    // Clear queues and caches
    this.queue = [];
    this.dedupCache.clear();
    
    this.log('info', 'Rate limiter reset');
  }

  /**
   * Internal logging method
   * @private
   */
  log(level, message, data = {}) {
    if (!this.config.monitoring) return;
    
    const logEntry = {
      level: level,
      message: `[RateLimiter] ${message}`,
      data: data,
      timestamp: new Date().toISOString(),
      queueSize: this.queue.length
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

module.exports = RateLimiter;
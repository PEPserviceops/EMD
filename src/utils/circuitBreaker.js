/**
 * Circuit Breaker Pattern Implementation
 * 
 * Provides fault tolerance for API calls by implementing the circuit breaker pattern:
 * - Prevents cascading failures when external APIs are down
 * - Automatically opens circuit after consecutive failures
 * - Implements half-open state for recovery testing
 * - Configurable thresholds and timeouts
 * - Fallback mechanisms when circuit is open
 * - Comprehensive state tracking and metrics
 * 
 * @module utils/circuitBreaker
 */

const EventEmitter = require('events');

class CircuitBreaker extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Circuit breaker configuration
    this.config = {
      // Failure threshold - number of consecutive failures to open circuit
      failureThreshold: options.failureThreshold || 5,
      
      // Reset timeout - time in ms to wait before trying half-open state
      resetTimeout: options.resetTimeout || 60000, // 1 minute
      
      // Success threshold - consecutive successes to close circuit in half-open state
      successThreshold: options.successThreshold || 3,
      
      // Request timeout - max time to wait for a single request
      requestTimeout: options.requestTimeout || 30000, // 30 seconds
      
      // Expected error types that should trigger the circuit breaker
      expectedErrors: options.expectedErrors || [],
      
      // Fallback function to execute when circuit is open
      fallback: options.fallback || null,
      
      // Monitoring configuration
      monitoring: {
        enabled: options.monitoring !== false,
        logLevel: options.logLevel || 'warn'
      }
    };

    // Circuit breaker state
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    
    // Request queue for handling requests when circuit is open
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    // Metrics tracking
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      openStateEntries: 0,
      halfOpenTests: 0,
      averageResponseTime: 0,
      responseTimes: []
    };

    this.log('info', 'Circuit breaker initialized', { 
      state: this.state, 
      config: this.config 
    });
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} operation - Function to execute
   * @param {Object} context - Execution context
   * @returns {Promise} Operation result
   */
  async execute(operation, context = {}) {
    this.metrics.totalRequests++;
    
    const startTime = Date.now();
    
    try {
      // Check circuit state
      if (this.state === 'OPEN') {
        return await this.handleOpenCircuit(operation, context);
      }

      // Execute operation with timeout
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Circuit breaker timeout')), 
          this.config.requestTimeout)
        )
      ]);

      const responseTime = Date.now() - startTime;
      this.recordSuccess(responseTime);
      
      this.log('info', 'Operation successful', { 
        responseTime, 
        state: this.state 
      });
      
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordFailure(error, responseTime);
      
      this.log('warn', 'Operation failed', { 
        error: error.message, 
        responseTime, 
        state: this.state 
      });
      
      throw error;
    }
  }

  /**
   * Handle requests when circuit is open
   * @private
   */
  async handleOpenCircuit(operation, context) {
    // Check if we should attempt to reset (transition to half-open)
    if (this.shouldAttemptReset()) {
      this.transitionToHalfOpen();
      return this.execute(operation, context);
    }

    // Execute fallback if available
    if (this.config.fallback) {
      this.log('info', 'Executing fallback for open circuit');
      try {
        return await this.config.fallback(context);
      } catch (fallbackError) {
        this.log('error', 'Fallback execution failed', { error: fallbackError.message });
        throw fallbackError;
      }
    }

    // Reject request with circuit open error
    const error = new Error('Circuit breaker is open');
    error.code = 'CIRCUIT_BREAKER_OPEN';
    error.state = this.state;
    error.nextRetryTime = this.getNextRetryTime();
    throw error;
  }

  /**
   * Record a successful operation
   * @private
   */
  recordSuccess(responseTime) {
    this.metrics.successfulRequests++;
    this.lastSuccessTime = new Date().toISOString();
    
    // Update response time metrics
    this.metrics.responseTimes.push(responseTime);
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-100);
    }
    this.metrics.averageResponseTime = 
      this.metrics.responseTimes.reduce((sum, time) => sum + time, 0) / 
      this.metrics.responseTimes.length;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      this.log('info', 'Half-open success', { successCount: this.successCount });
      
      if (this.successCount >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0; // Reset failure count on success
    }

    this.emit('success', { 
      responseTime, 
      state: this.state,
      metrics: this.getMetrics() 
    });
  }

  /**
   * Record a failed operation
   * @private
   */
  recordFailure(error, responseTime) {
    this.metrics.failedRequests++;
    this.lastFailureTime = new Date().toISOString();
    
    // Check if this error should trigger the circuit breaker
    const shouldTrigger = this.shouldTriggerCircuitBreaker(error);
    
    if (this.state === 'HALF_OPEN' && shouldTrigger) {
      // Any failure in half-open state returns to open
      this.transitionToOpen();
      this.log('warn', 'Half-open test failed, circuit opened', { 
        error: error.message 
      });
    } else if (this.state === 'CLOSED' && shouldTrigger) {
      this.failureCount++;
      this.log('warn', 'Failure recorded', { 
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold 
      });
      
      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionToOpen();
      }
    }

    this.emit('failure', { 
      error: error.message, 
      responseTime, 
      state: this.state,
      metrics: this.getMetrics() 
    });
  }

  /**
   * Determine if error should trigger circuit breaker
   * @private
   */
  shouldTriggerCircuitBreaker(error) {
    // Always trigger for network errors and timeouts
    const networkErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'];
    if (networkErrors.includes(error.code)) {
      return true;
    }

    // Check for HTTP errors that indicate service issues
    if (error.response && error.response.status >= 500) {
      return true;
    }

    // Check expected error types
    if (this.config.expectedErrors.includes(error.message)) {
      return true;
    }

    // Don't trigger for client errors (4xx) except timeout
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      return false;
    }

    return false;
  }

  /**
   * Check if circuit should attempt reset to half-open
   * @private
   */
  shouldAttemptReset() {
    if (!this.lastFailureTime) return false;
    
    const timeSinceLastFailure = Date.now() - new Date(this.lastFailureTime).getTime();
    return timeSinceLastFailure >= this.config.resetTimeout;
  }

  /**
   * Transition circuit to CLOSED state
   * @private
   */
  transitionToClosed() {
    const previousState = this.state;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.metrics.openStateEntries++;
    
    this.log('info', 'Circuit transitioned to CLOSED', { 
      previousState,
      totalRequests: this.metrics.totalRequests
    });
    
    this.emit('stateChange', { 
      from: previousState, 
      to: this.state,
      reason: 'Success threshold met' 
    });
  }

  /**
   * Transition circuit to OPEN state
   * @private
   */
  transitionToOpen() {
    const previousState = this.state;
    this.state = 'OPEN';
    this.successCount = 0;
    
    this.log('warn', 'Circuit transitioned to OPEN', { 
      previousState,
      failureCount: this.failureCount 
    });
    
    this.emit('stateChange', { 
      from: previousState, 
      to: this.state,
      reason: 'Failure threshold exceeded',
      nextRetryTime: this.getNextRetryTime()
    });
  }

  /**
   * Transition circuit to HALF_OPEN state
   * @private
   */
  transitionToHalfOpen() {
    const previousState = this.state;
    this.state = 'HALF_OPEN';
    this.successCount = 0;
    this.metrics.halfOpenTests++;
    
    this.log('info', 'Circuit transitioned to HALF_OPEN', { 
      previousState,
      resetTimeout: this.config.resetTimeout 
    });
    
    this.emit('stateChange', { 
      from: previousState, 
      to: this.state,
      reason: 'Reset timeout elapsed' 
    });
  }

  /**
   * Get next retry time for open circuit
   * @private
   */
  getNextRetryTime() {
    if (!this.lastFailureTime) return null;
    
    const nextRetry = new Date(this.lastFailureTime);
    nextRetry.setMilliseconds(nextRetry.getMilliseconds() + this.config.resetTimeout);
    return nextRetry.toISOString();
  }

  /**
   * Get current circuit breaker state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextRetryTime: this.getNextRetryTime()
    };
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics() {
    const totalRequests = this.metrics.totalRequests;
    const successRate = totalRequests > 0 ? 
      (this.metrics.successfulRequests / totalRequests * 100).toFixed(2) : 0;
    
    return {
      ...this.metrics,
      successRate: `${successRate}%`,
      state: this.state,
      currentStatus: this.getState()
    };
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset() {
    const previousState = this.state;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    
    // Reset queue if any
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    this.log('info', 'Circuit breaker reset', { 
      previousState,
      newState: this.state 
    });
    
    this.emit('stateChange', { 
      from: previousState, 
      to: this.state,
      reason: 'Manual reset' 
    });
  }

  /**
   * Force circuit breaker to open state
   */
  forceOpen() {
    this.transitionToOpen();
  }

  /**
   * Force circuit breaker to closed state
   */
  forceClosed() {
    this.transitionToClosed();
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const isHealthy = this.state === 'CLOSED';
    const healthDetails = {
      circuitState: this.state,
      isHealthy: isHealthy,
      metrics: this.getMetrics(),
      config: this.config,
      lastChecked: new Date().toISOString()
    };

    if (!isHealthy) {
      healthDetails.issues = [];
      
      if (this.state === 'OPEN') {
        healthDetails.issues.push('Circuit is open - API calls are failing');
        if (this.lastFailureTime) {
          healthDetails.issues.push(`Last failure: ${this.lastFailureTime}`);
        }
        healthDetails.nextRetryTime = this.getNextRetryTime();
      } else if (this.state === 'HALF_OPEN') {
        healthDetails.issues.push('Circuit is half-open - testing API recovery');
        healthDetails.successCount = this.successCount;
        healthDetails.successThreshold = this.config.successThreshold;
      }
    }

    return healthDetails;
  }

  /**
   * Internal logging method
   * @private
   */
  log(level, message, data = {}) {
    if (!this.config.monitoring.enabled) return;
    
    const logEntry = {
      level: level,
      message: `[CircuitBreaker] ${message}`,
      data: data,
      timestamp: new Date().toISOString(),
      state: this.state,
      failureCount: this.failureCount
    };
    
    // Use appropriate console method based on level
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
    
    // Emit log event for external logging systems
    this.emit('log', logEntry);
  }

  /**
   * Event listeners for external monitoring
   */
  onStateChange(callback) {
    this.on('stateChange', callback);
  }

  onFailure(callback) {
    this.on('failure', callback);
  }

  onSuccess(callback) {
    this.on('success', callback);
  }

  onLog(callback) {
    this.on('log', callback);
  }
}

module.exports = CircuitBreaker;
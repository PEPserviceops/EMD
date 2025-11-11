/**
 * API Best Practices Utility Framework
 * 
 * Provides enterprise-grade utilities for API integrations:
 * - Common patterns and utilities for all API services
 * - Standardized error handling and logging
 * - Request/response validation and sanitization
 * - Configuration management for API services
 * - Data consistency and integrity helpers
 * - Performance monitoring and metrics collection
 * 
 * @module utils/apiBestPractices
 */

const crypto = require('crypto');

class APIBestPractices {
  constructor() {
    this.serviceConfigs = new Map();
    this.metrics = new Map();
    this.alerts = [];
    this.healthChecks = new Map();
  }

  // =============================================================================
  // CONFIGURATION MANAGEMENT
  // =============================================================================

  /**
   * Register a service configuration
   * @param {string} serviceName - Name of the API service
   * @param {Object} config - Service configuration
   */
  registerServiceConfig(serviceName, config) {
    this.serviceConfigs.set(serviceName, {
      ...config,
      registeredAt: new Date().toISOString(),
      status: 'active'
    });
  }

  /**
   * Get service configuration with validation
   * @param {string} serviceName - Name of the API service
   * @returns {Object} Service configuration
   */
  getServiceConfig(serviceName) {
    const config = this.serviceConfigs.get(serviceName);
    if (!config) {
      throw new Error(`Service configuration not found: ${serviceName}`);
    }
    return config;
  }

  /**
   * Validate API configuration
   * @param {Object} config - API configuration to validate
   * @returns {Object} Validation result
   */
  validateApiConfig(config) {
    const required = ['apiKey', 'baseUrl'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
      return {
        valid: false,
        errors: missing.map(field => `Missing required field: ${field}`)
      };
    }

    // Validate API key format
    if (config.apiKey && typeof config.apiKey !== 'string') {
      return {
        valid: false,
        errors: ['API key must be a string']
      };
    }

    // Validate URL format
    try {
      new URL(config.baseUrl);
    } catch (error) {
      return {
        valid: false,
        errors: ['Invalid base URL format']
      };
    }

    return { valid: true, errors: [] };
  }

  // =============================================================================
  // REQUEST/RESPONSE VALIDATION & SANITIZATION
  // =============================================================================

  /**
   * Sanitize request data to prevent injection attacks
   * @param {Object} data - Request data to sanitize
   * @returns {Object} Sanitized data
   */
  sanitizeRequestData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Remove potential script injections and dangerous characters
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '')
          .trim();
      } else if (typeof value === 'number') {
        // Validate numeric inputs
        sanitized[key] = isFinite(value) ? value : 0;
      } else if (typeof value === 'boolean') {
        sanitized[key] = Boolean(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => this.sanitizeRequestData(item));
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeRequestData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Validate response structure
   * @param {Object} response - API response to validate
   * @param {Object} schema - Expected response schema
   * @returns {Object} Validation result
   */
  validateResponseSchema(response, schema = {}) {
    const errors = [];

    // Check required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!response.hasOwnProperty(field)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Check data types
    if (schema.types && typeof schema.types === 'object') {
      for (const [field, expectedType] of Object.entries(schema.types)) {
        if (response.hasOwnProperty(field)) {
          const actualType = Array.isArray(response[field]) ? 'array' : typeof response[field];
          if (actualType !== expectedType) {
            errors.push(`Field ${field} expected type ${expectedType}, got ${actualType}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // =============================================================================
  // SECURITY ENHANCEMENTS
  // =============================================================================

  /**
   * Generate secure API key hash for storage/monitoring
   * @param {string} apiKey - API key to hash
   * @returns {string} Hashed API key
   */
  hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Mask sensitive data for logging
   * @param {Object} data - Data to mask
   * @returns {Object} Data with sensitive fields masked
   */
  maskSensitiveData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = ['apiKey', 'token', 'password', 'secret', 'auth'];
    const masked = {};

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        masked[key] = value ? `${value.substring(0, 4)}***${value.substring(value.length - 4)}` : '***';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  /**
   * Generate audit log entry
   * @param {string} action - Action performed
   * @param {Object} details - Action details
   * @returns {Object} Audit log entry
   */
  createAuditLog(action, details = {}) {
    return {
      timestamp: new Date().toISOString(),
      action: action,
      details: this.maskSensitiveData(details),
      source: 'api-best-practices',
      id: crypto.randomUUID()
    };
  }

  // =============================================================================
  // DATA INTEGRITY & CONSISTENCY
  // =============================================================================

  /**
   * Validate data integrity using checksums
   * @param {Object} data - Data to validate
   * @param {string} checksum - Expected checksum
   * @returns {boolean} Data is valid
   */
  validateDataIntegrity(data, checksum) {
    const currentChecksum = crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
    return currentChecksum === checksum;
  }

  /**
   * Generate checksum for data
   * @param {Object} data - Data to generate checksum for
   * @returns {string} Checksum
   */
  generateDataChecksum(data) {
    return crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Validate coordinate data for GPS accuracy
   * @param {Object} coords - Coordinate object {lat, lng}
   * @returns {boolean} Coordinates are valid
   */
  validateCoordinates(coords) {
    if (!coords || typeof coords !== 'object') return false;
    
    const { lat, lng } = coords;
    return typeof lat === 'number' && 
           typeof lng === 'number' &&
           lat >= -90 && lat <= 90 &&
           lng >= -180 && lng <= 180 &&
           isFinite(lat) && isFinite(lng);
  }

  /**
   * Validate timestamp format
   * @param {string|Date} timestamp - Timestamp to validate
   * @returns {boolean} Timestamp is valid
   */
  validateTimestamp(timestamp) {
    const date = new Date(timestamp);
    return !isNaN(date.getTime()) && date.getTime() > 0;
  }

  // =============================================================================
  // PERFORMANCE MONITORING & METRICS
  // =============================================================================

  /**
   * Record API call metrics
   * @param {string} serviceName - Name of the API service
   * @param {Object} metrics - Metrics data
   */
  recordApiMetrics(serviceName, metrics) {
    if (!this.metrics.has(serviceName)) {
      this.metrics.set(serviceName, {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageResponseTime: 0,
        lastCallTime: null,
        errorTypes: {},
        responseTimes: []
      });
    }

    const serviceMetrics = this.metrics.get(serviceName);
    
    // Update call counts
    serviceMetrics.totalCalls++;
    if (metrics.success) {
      serviceMetrics.successfulCalls++;
    } else {
      serviceMetrics.failedCalls++;
      
      // Track error types
      const errorType = metrics.errorType || 'unknown';
      serviceMetrics.errorTypes[errorType] = (serviceMetrics.errorTypes[errorType] || 0) + 1;
    }

    // Update response times
    if (metrics.responseTime) {
      serviceMetrics.responseTimes.push(metrics.responseTime);
      
      // Keep only last 100 response times for average calculation
      if (serviceMetrics.responseTimes.length > 100) {
        serviceMetrics.responseTimes = serviceMetrics.responseTimes.slice(-100);
      }
      
      // Calculate average response time
      serviceMetrics.averageResponseTime = 
        serviceMetrics.responseTimes.reduce((sum, time) => sum + time, 0) / 
        serviceMetrics.responseTimes.length;
    }

    serviceMetrics.lastCallTime = new Date().toISOString();
  }

  /**
   * Get service metrics
   * @param {string} serviceName - Name of the API service
   * @returns {Object} Service metrics
   */
  getServiceMetrics(serviceName) {
    return this.metrics.get(serviceName) || null;
  }

  /**
   * Get all metrics summary
   * @returns {Object} All metrics summary
   */
  getAllMetrics() {
    const summary = {};
    
    for (const [serviceName, metrics] of this.metrics.entries()) {
      summary[serviceName] = {
        ...metrics,
        successRate: metrics.totalCalls > 0 ? 
          (metrics.successfulCalls / metrics.totalCalls * 100).toFixed(2) : 0
      };
    }
    
    return summary;
  }

  // =============================================================================
  // HEALTH CHECKS
  // =============================================================================

  /**
   * Register a health check for a service
   * @param {string} serviceName - Name of the API service
   * @param {Function} checkFunction - Health check function
   * @param {Object} options - Health check options
   */
  registerHealthCheck(serviceName, checkFunction, options = {}) {
    this.healthChecks.set(serviceName, {
      checkFunction,
      options: {
        interval: options.interval || 30000, // 30 seconds default
        timeout: options.timeout || 5000, // 5 seconds default
        enabled: options.enabled !== false,
        ...options
      },
      lastCheck: null,
      lastResult: null,
      consecutiveFailures: 0
    });
  }

  /**
   * Execute health check for a service
   * @param {string} serviceName - Name of the API service
   * @returns {Promise<Object>} Health check result
   */
  async executeHealthCheck(serviceName) {
    const healthCheck = this.healthChecks.get(serviceName);
    if (!healthCheck) {
      throw new Error(`No health check registered for service: ${serviceName}`);
    }

    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        healthCheck.checkFunction(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 
          healthCheck.options.timeout)
        )
      ]);

      const responseTime = Date.now() - startTime;
      
      healthCheck.lastCheck = new Date().toISOString();
      healthCheck.lastResult = { success: true, responseTime, data: result };
      healthCheck.consecutiveFailures = 0;

      return {
        service: serviceName,
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      healthCheck.lastCheck = new Date().toISOString();
      healthCheck.lastResult = { success: false, responseTime, error: error.message };
      healthCheck.consecutiveFailures++;

      return {
        service: serviceName,
        status: 'unhealthy',
        error: error.message,
        responseTime,
        consecutiveFailures: healthCheck.consecutiveFailures,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get health status for all services
   * @returns {Promise<Object>} Health status for all services
   */
  async getAllHealthStatus() {
    const healthStatus = {};
    
    for (const serviceName of this.healthChecks.keys()) {
      try {
        healthStatus[serviceName] = await this.executeHealthCheck(serviceName);
      } catch (error) {
        healthStatus[serviceName] = {
          service: serviceName,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    return healthStatus;
  }

  // =============================================================================
  // ERROR HANDLING & LOGGING
  // =============================================================================

  /**
   * Standardize error handling across API services
   * @param {Error} error - Original error
   * @param {Object} context - Error context
   * @returns {Object} Standardized error object
   */
  standardizeError(error, context = {}) {
    const errorTypes = {
      'ECONNREFUSED': 'connection_refused',
      'ETIMEDOUT': 'timeout',
      'ENOTFOUND': 'dns_resolution_failed',
      '401': 'unauthorized',
      '403': 'forbidden',
      '404': 'not_found',
      '429': 'rate_limited',
      '500': 'server_error',
      '502': 'bad_gateway',
      '503': 'service_unavailable'
    };

    const errorCode = error.code || (error.response && error.response.status);
    const errorType = errorTypes[errorCode] || 'unknown_error';

    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: errorType,
      message: error.message,
      code: errorCode,
      context: this.maskSensitiveData(context),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }

  /**
   * Create structured log entry
   * @param {string} level - Log level (info, warn, error)
   * @param {string} message - Log message
   * @param {Object} data - Additional log data
   * @returns {Object} Structured log entry
   */
  createLogEntry(level, message, data = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      data: this.maskSensitiveData(data),
      source: 'api-best-practices'
    };
  }
}

// Export singleton instance
module.exports = new APIBestPractices();
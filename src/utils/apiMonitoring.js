/**
 * API Monitoring and Observability Framework
 * 
 * Provides comprehensive monitoring for API integrations:
 * - Real-time API health monitoring
 * - Performance metrics collection and analysis
 * - Error tracking and alerting
 * - Request/response latency tracking
 * - Success rate monitoring
 * - Custom dashboard data generation
 * - Alert management system
 * - Historical data analysis
 * 
 * @module utils/apiMonitoring
 */

const EventEmitter = require('events');
const apiBestPractices = require('./apiBestPractices');

class APIMonitoring extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      // Monitoring configuration
      monitoringInterval: options.monitoringInterval || 30000, // 30 seconds
      dataRetention: options.dataRetention || 86400000, // 24 hours
      alertThresholds: {
        errorRate: options.errorRateThreshold || 0.05, // 5%
        responseTime: options.responseTimeThreshold || 5000, // 5 seconds
        availability: options.availabilityThreshold || 0.95, // 95%
        ...options.alertThresholds
      },
      
      // Alert configuration
      alerts: {
        enabled: options.alerts !== false,
        channels: options.channels || ['console'], // console, email, webhook
        escalation: options.escalation !== false,
        escalationDelays: options.escalationDelays || [300000, 900000, 3600000] // 5min, 15min, 1hr
      },
      
      // Dashboard configuration
      dashboard: {
        enabled: options.dashboard !== false,
        dataPoints: options.dataPoints || 100,
        refreshInterval: options.refreshInterval || 60000, // 1 minute
        ...options.dashboard
      },
      
      // Performance tracking
      performance: {
        trackLatency: options.trackLatency !== false,
        trackThroughput: options.trackThroughput !== false,
        trackAvailability: options.trackAvailability !== false,
        ...options.performance
      }
    };

    // Monitoring state
    this.isMonitoring = false;
    this.monitorInterval = null;
    
    // Service monitoring data
    this.services = new Map();
    
    // Alert state
    this.activeAlerts = new Map();
    this.alertHistory = [];
    this.escalationTimers = new Map();
    
    // Dashboard data cache
    this.dashboardData = {
      lastUpdate: null,
      services: {},
      global: {},
      alerts: []
    };
    
    // Performance metrics aggregation
    this.aggregatedMetrics = new Map();
    
    this.log('info', 'API Monitoring initialized', { config: this.config });
  }

  /**
   * Start monitoring for a service
   * @param {string} serviceName - Name of the service to monitor
   * @param {Object} config - Service monitoring configuration
   */
  startServiceMonitoring(serviceName, config = {}) {
    const serviceConfig = {
      name: serviceName,
      enabled: config.enabled !== false,
      healthCheck: config.healthCheck,
      healthCheckInterval: config.healthCheckInterval || this.config.monitoringInterval,
      customMetrics: config.customMetrics || {},
      tags: config.tags || [],
      ...config
    };

    this.services.set(serviceName, {
      config: serviceConfig,
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        responseTimes: [],
        errorTypes: {},
        statusCodes: {},
        lastHealthCheck: null,
        availability: 100,
        uptime: 0,
        downtime: 0,
        consecutiveFailures: 0,
        lastSuccessTime: null,
        lastFailureTime: null
      },
      history: [],
      alerts: new Set(),
      isHealthy: true,
      lastCheckTime: null
    });

    // Start health checks for this service
    if (serviceConfig.healthCheck && serviceConfig.enabled) {
      this.scheduleHealthCheck(serviceName);
    }

    this.log('info', 'Service monitoring started', { 
      service: serviceName, 
      config: serviceConfig 
    });

    this.emit('serviceAdded', { serviceName, config: serviceConfig });
  }

  /**
   * Stop monitoring for a service
   * @param {string} serviceName - Name of the service to stop monitoring
   */
  stopServiceMonitoring(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      this.log('warn', 'Attempted to stop monitoring non-existent service', { serviceName });
      return;
    }

    // Clear any existing health check timers
    if (service.healthCheckTimer) {
      clearInterval(service.healthCheckTimer);
    }

    this.services.delete(serviceName);
    
    this.log('info', 'Service monitoring stopped', { serviceName });
    this.emit('serviceRemoved', { serviceName });
  }

  /**
   * Record API call metrics
   * @param {string} serviceName - Name of the service
   * @param {Object} metrics - Metrics data
   */
  recordApiCall(serviceName, metrics) {
    const service = this.services.get(serviceName);
    if (!service) {
      this.log('warn', 'Metrics recorded for non-monitored service', { serviceName });
      return;
    }

    const serviceMetrics = service.metrics;
    
    // Update basic metrics
    serviceMetrics.totalRequests++;
    
    if (metrics.success) {
      serviceMetrics.successfulRequests++;
      serviceMetrics.lastSuccessTime = new Date().toISOString();
      serviceMetrics.consecutiveFailures = 0;
    } else {
      serviceMetrics.failedRequests++;
      serviceMetrics.lastFailureTime = new Date().toISOString();
      serviceMetrics.consecutiveFailures++;
      
      // Track error types
      const errorType = metrics.errorType || 'unknown';
      serviceMetrics.errorTypes[errorType] = (serviceMetrics.errorTypes[errorType] || 0) + 1;
    }

    // Track status codes
    if (metrics.statusCode) {
      serviceMetrics.statusCodes[metrics.statusCode] = 
        (serviceMetrics.statusCodes[metrics.statusCode] || 0) + 1;
    }

    // Update response time metrics
    if (metrics.responseTime !== undefined) {
      serviceMetrics.responseTimes.push(metrics.responseTime);
      
      // Keep only recent response times
      const cutoffTime = Date.now() - this.config.dataRetention;
      serviceMetrics.responseTimes = serviceMetrics.responseTimes.filter(time => time > cutoffTime);
      
      // Update min/max response times
      serviceMetrics.minResponseTime = Math.min(serviceMetrics.minResponseTime, metrics.responseTime);
      serviceMetrics.maxResponseTime = Math.max(serviceMetrics.maxResponseTime, metrics.responseTime);
      
      // Calculate average response time
      if (serviceMetrics.responseTimes.length > 0) {
        serviceMetrics.averageResponseTime = 
          serviceMetrics.responseTimes.reduce((sum, time) => sum + time, 0) / 
          serviceMetrics.responseTimes.length;
      }
    }

    // Update availability metrics
    const successRate = serviceMetrics.totalRequests > 0 ? 
      serviceMetrics.successfulRequests / serviceMetrics.totalRequests : 0;
    serviceMetrics.availability = successRate * 100;

    // Record to history
    this.recordMetricHistory(serviceName, {
      timestamp: Date.now(),
      ...metrics
    });

    // Check for alerts
    this.checkAlerts(serviceName);

    // Emit metrics event
    this.emit('metricsRecorded', {
      serviceName,
      metrics,
      serviceMetrics: this.getServiceMetrics(serviceName)
    });

    // Update dashboard data
    this.updateDashboardData();
  }

  /**
   * Execute health check for a service
   * @param {string} serviceName - Name of the service
   * @returns {Promise<Object>} Health check result
   */
  async executeHealthCheck(serviceName) {
    const service = this.services.get(serviceName);
    if (!service || !service.config.healthCheck) {
      throw new Error(`No health check configured for service: ${serviceName}`);
    }

    const startTime = Date.now();
    
    try {
      const result = await service.config.healthCheck();
      const responseTime = Date.now() - startTime;
      
      const healthResult = {
        service: serviceName,
        status: 'healthy',
        responseTime,
        data: result,
        timestamp: new Date().toISOString()
      };

      this.processHealthCheckResult(serviceName, healthResult);
      
      return healthResult;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const healthResult = {
        service: serviceName,
        status: 'unhealthy',
        responseTime,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      this.processHealthCheckResult(serviceName, healthResult);
      
      return healthResult;
    }
  }

  /**
   * Process health check result
   * @private
   */
  processHealthCheckResult(serviceName, healthResult) {
    const service = this.services.get(serviceName);
    if (!service) return;

    service.metrics.lastHealthCheck = healthResult.timestamp;
    service.lastCheckTime = Date.now();
    
    const wasHealthy = service.isHealthy;
    service.isHealthy = healthResult.status === 'healthy';

    // Update uptime/downtime
    if (service.isHealthy) {
      if (!wasHealthy) {
        // Service recovered
        service.metrics.downtime += Date.now() - service.lastFailureTime;
        this.resolveAlerts(serviceName, 'service_recovered');
      }
      service.lastSuccessTime = healthResult.timestamp;
    } else {
      if (wasHealthy) {
        // Service failed
        service.lastFailureTime = Date.now();
        this.triggerAlerts(serviceName, 'service_down', {
          error: healthResult.error,
          responseTime: healthResult.responseTime
        });
      }
    }

    // Record health check history
    service.history.push(healthResult);
    
    // Trim history to prevent memory issues
    const maxHistoryEntries = 1000;
    if (service.history.length > maxHistoryEntries) {
      service.history = service.history.slice(-maxHistoryEntries);
    }

    // Emit health check event
    this.emit('healthCheckCompleted', healthResult);

    this.log('info', 'Health check completed', { 
      service: serviceName, 
      status: healthResult.status,
      responseTime: healthResult.responseTime 
    });
  }

  /**
   * Schedule health check for a service
   * @private
   */
  scheduleHealthCheck(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) return;

    service.healthCheckTimer = setInterval(async () => {
      try {
        await this.executeHealthCheck(serviceName);
      } catch (error) {
        this.log('error', 'Scheduled health check failed', { 
          service: serviceName, 
          error: error.message 
        });
      }
    }, service.config.healthCheckInterval);
  }

  /**
   * Check for alert conditions
   * @private
   */
  checkAlerts(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) return;

    const metrics = service.metrics;
    
    // Check error rate
    if (metrics.totalRequests > 10) { // Only check after sufficient requests
      const errorRate = metrics.failedRequests / metrics.totalRequests;
      if (errorRate > this.config.alertThresholds.errorRate) {
        this.triggerAlerts(serviceName, 'high_error_rate', {
          errorRate,
          threshold: this.config.alertThresholds.errorRate
        });
      }
    }

    // Check response time
    if (metrics.averageResponseTime > this.config.alertThresholds.responseTime) {
      this.triggerAlerts(serviceName, 'high_response_time', {
        averageResponseTime: metrics.averageResponseTime,
        threshold: this.config.alertThresholds.responseTime
      });
    }

    // Check availability
    if (metrics.availability < this.config.alertThresholds.availability * 100) {
      this.triggerAlerts(serviceName, 'low_availability', {
        availability: metrics.availability,
        threshold: this.config.alertThresholds.availability * 100
      });
    }
  }

  /**
   * Trigger alerts
   * @private
   */
  triggerAlerts(serviceName, alertType, data) {
    if (!this.config.alerts.enabled) return;

    const alertId = `${serviceName}_${alertType}_${Date.now()}`;
    const service = this.services.get(serviceName);
    
    const alert = {
      id: alertId,
      service: serviceName,
      type: alertType,
      severity: this.getAlertSeverity(alertType),
      message: this.generateAlertMessage(alertType, serviceName, data),
      data: data,
      timestamp: new Date().toISOString(),
      status: 'active',
      escalationLevel: 0
    };

    this.activeAlerts.set(alertId, alert);
    service.alerts.add(alertId);
    this.alertHistory.push(alert);

    // Send alert through configured channels
    this.sendAlert(alert);

    // Schedule escalation if enabled
    if (this.config.alerts.escalation) {
      this.scheduleAlertEscalation(alertId);
    }

    this.log('warn', 'Alert triggered', { alert });
    this.emit('alertTriggered', alert);
  }

  /**
   * Resolve alerts
   * @private
   */
  resolveAlerts(serviceName, reason) {
    const service = this.services.get(serviceName);
    if (!service) return;

    for (const alertId of service.alerts) {
      const alert = this.activeAlerts.get(alertId);
      if (alert) {
        alert.status = 'resolved';
        alert.resolvedAt = new Date().toISOString();
        alert.resolution = reason;
        
        // Clear escalation timer
        if (this.escalationTimers.has(alertId)) {
          clearTimeout(this.escalationTimers.get(alertId));
          this.escalationTimers.delete(alertId);
        }
      }
    }

    service.alerts.clear();
    
    this.log('info', 'Alerts resolved', { service: serviceName, reason });
    this.emit('alertsResolved', { serviceName, reason });
  }

  /**
   * Get alert severity level
   * @private
   */
  getAlertSeverity(alertType) {
    const severityMap = {
      'service_down': 'critical',
      'high_error_rate': 'warning',
      'high_response_time': 'warning',
      'low_availability': 'critical',
      'connection_timeout': 'warning',
      'authentication_failure': 'critical'
    };
    
    return severityMap[alertType] || 'info';
  }

  /**
   * Generate alert message
   * @private
   */
  generateAlertMessage(alertType, serviceName, data) {
    const messages = {
      'service_down': `Service ${serviceName} is down`,
      'high_error_rate': `Service ${serviceName} has high error rate: ${(data.errorRate * 100).toFixed(2)}%`,
      'high_response_time': `Service ${serviceName} has high response time: ${data.averageResponseTime}ms`,
      'low_availability': `Service ${serviceName} availability is low: ${data.availability.toFixed(2)}%`,
      'connection_timeout': `Connection timeout for service ${serviceName}`,
      'authentication_failure': `Authentication failed for service ${serviceName}`
    };
    
    return messages[alertType] || `Alert for service ${serviceName}: ${alertType}`;
  }

  /**
   * Send alert through configured channels
   * @private
   */
  sendAlert(alert) {
    for (const channel of this.config.alerts.channels) {
      switch (channel) {
        case 'console':
          console.warn(`[ALERT] ${alert.message}`, alert);
          break;
        case 'email':
          // Email implementation would go here
          this.log('info', 'Email alert would be sent', { alert });
          break;
        case 'webhook':
          // Webhook implementation would go here
          this.log('info', 'Webhook alert would be sent', { alert });
          break;
      }
    }
  }

  /**
   * Schedule alert escalation
   * @private
   */
  scheduleAlertEscalation(alertId) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.status !== 'active') return;

    const escalationDelay = this.config.alerts.escalationDelays[alert.escalationLevel];
    
    if (escalationDelay && alert.escalationLevel < this.config.alerts.escalationDelays.length - 1) {
      const timer = setTimeout(() => {
        this.escalateAlert(alertId);
      }, escalationDelay);
      
      this.escalationTimers.set(alertId, timer);
    }
  }

  /**
   * Escalate alert
   * @private
   */
  escalateAlert(alertId) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.status !== 'active') return;

    alert.escalationLevel++;
    alert.escalatedAt = new Date().toISOString();
    
    // Re-send with higher priority
    this.sendAlert({ ...alert, escalated: true, escalationLevel: alert.escalationLevel });
    
    // Schedule next escalation if available
    this.scheduleAlertEscalation(alertId);
    
    this.log('warn', 'Alert escalated', { alertId, escalationLevel: alert.escalationLevel });
    this.emit('alertEscalated', { alertId, escalationLevel: alert.escalationLevel });
  }

  /**
   * Record metric to history
   * @private
   */
  recordMetricHistory(serviceName, metric) {
    const service = this.services.get(serviceName);
    if (!service) return;

    service.history.push(metric);
    
    // Trim history to prevent memory issues
    const cutoffTime = Date.now() - this.config.dataRetention;
    service.history = service.history.filter(entry => entry.timestamp > cutoffTime);
  }

  /**
   * Get service metrics
   * @param {string} serviceName - Name of the service
   * @returns {Object} Service metrics
   */
  getServiceMetrics(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) return null;

    const metrics = service.metrics;
    const totalRequests = metrics.totalRequests;
    
    return {
      ...metrics,
      successRate: totalRequests > 0 ? (metrics.successfulRequests / totalRequests * 100).toFixed(2) : 0,
      errorRate: totalRequests > 0 ? (metrics.failedRequests / totalRequests * 100).toFixed(2) : 0,
      requestsPerMinute: this.calculateRequestsPerMinute(serviceName),
      status: service.isHealthy ? 'healthy' : 'unhealthy',
      activeAlerts: Array.from(service.alerts),
      lastCheckTime: service.lastCheckTime
    };
  }

  /**
   * Calculate requests per minute
   * @private
   */
  calculateRequestsPerMinute(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) return 0;

    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = service.history.filter(entry => 
      entry.timestamp > oneMinuteAgo && entry.success !== undefined
    );

    return recentRequests.length;
  }

  /**
   * Get all services status
   * @returns {Object} All services status
   */
  getAllServicesStatus() {
    const status = {};
    
    for (const [serviceName] of this.services.entries()) {
      status[serviceName] = this.getServiceMetrics(serviceName);
    }
    
    return status;
  }

  /**
   * Get active alerts
   * @returns {Array} Active alerts
   */
  getActiveAlerts() {
    const activeAlerts = [];
    
    for (const alert of this.activeAlerts.values()) {
      if (alert.status === 'active') {
        activeAlerts.push(alert);
      }
    }
    
    return activeAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get dashboard data
   * @returns {Object} Dashboard data
   */
  getDashboardData() {
    return {
      ...this.dashboardData,
      services: this.getAllServicesStatus(),
      activeAlerts: this.getActiveAlerts(),
      summary: this.getSummaryMetrics()
    };
  }

  /**
   * Get summary metrics
   * @private
   */
  getSummaryMetrics() {
    const services = Array.from(this.services.values());
    const totalServices = services.length;
    const healthyServices = services.filter(s => s.isHealthy).length;
    const totalRequests = services.reduce((sum, s) => sum + s.metrics.totalRequests, 0);
    const totalErrors = services.reduce((sum, s) => sum + s.metrics.failedRequests, 0);
    
    return {
      totalServices,
      healthyServices,
      unhealthyServices: totalServices - healthyServices,
      availability: totalServices > 0 ? (healthyServices / totalServices * 100).toFixed(2) : 0,
      totalRequests,
      totalErrors,
      overallErrorRate: totalRequests > 0 ? (totalErrors / totalRequests * 100).toFixed(2) : 0,
      activeAlerts: this.getActiveAlerts().length
    };
  }

  /**
   * Update dashboard data cache
   * @private
   */
  updateDashboardData() {
    this.dashboardData.lastUpdate = new Date().toISOString();
    this.dashboardData.services = this.getAllServicesStatus();
    this.dashboardData.alerts = this.getActiveAlerts();
    this.dashboardData.global = this.getSummaryMetrics();
  }

  /**
   * Start global monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Start periodic dashboard updates
    this.monitorInterval = setInterval(() => {
      this.updateDashboardData();
      this.emit('dashboardUpdated', this.dashboardData);
    }, this.config.dashboard.refreshInterval);
    
    this.log('info', 'Global monitoring started');
    this.emit('monitoringStarted');
  }

  /**
   * Stop global monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    this.log('info', 'Global monitoring stopped');
    this.emit('monitoringStopped');
  }

  /**
   * Internal logging method
   * @private
   */
  log(level, message, data = {}) {
    const logEntry = {
      level: level,
      message: `[APIMonitoring] ${message}`,
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

module.exports = APIMonitoring;
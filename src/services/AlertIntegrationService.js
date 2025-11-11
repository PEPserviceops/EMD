/**
 * Alert Integration Service
 * 
 * Integrates route optimization events with the existing alert system:
 * - Generates alerts for route optimization events
 * - Sends dispatch notifications
 * - Monitors dispatch performance and issues alerts
 * - Integrates with existing EMD alert infrastructure
 * 
 * @module services/AlertIntegrationService
 */

const SupabaseService = require('./SupabaseService');

class AlertIntegrationService {
  constructor() {
    this.enabled = true;
    this.alertRules = new Map();
    this.notificationQueue = [];
    
    // Configuration
    this.config = {
      maxAlertFrequency: 300000, // 5 minutes
      criticalRouteDeviation: 0.2, // 20% deviation triggers alert
      excessiveDelayThreshold: 30, // 30 minutes
      lowFuelThreshold: 25, // 25% fuel
      emergencyResponseTime: 15, // 15 minutes
      dispatchEfficiencyThreshold: 0.7 // 70% efficiency
    };
    
    this._initializeAlertRules();
  }

  /**
   * Check if alert integration service is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Initialize default alert rules for route optimization
   * @private
   */
  _initializeAlertRules() {
    const rules = [
      {
        id: 'route_efficiency_low',
        name: 'Low Route Efficiency',
        type: 'EFFICIENCY',
        severity: 'MEDIUM',
        conditions: {
          efficiency: '< 0.7'
        },
        actions: ['generate_alert', 'notification']
      },
      {
        id: 'dispatch_delay_excessive',
        name: 'Excessive Dispatch Delay',
        type: 'DISPATCH',
        severity: 'HIGH',
        conditions: {
          delay: '> 30 minutes'
        },
        actions: ['generate_alert', 'notification', 'escalation']
      },
      {
        id: 'driver_emergency',
        name: 'Driver Emergency',
        type: 'EMERGENCY',
        severity: 'CRITICAL',
        conditions: {
          emergency: true
        },
        actions: ['generate_alert', 'notification', 'escalation', 'auto_dispatch']
      },
      {
        id: 'vehicle_low_fuel',
        name: 'Vehicle Low Fuel',
        type: 'VEHICLE',
        severity: 'MEDIUM',
        conditions: {
          fuel_level: '< 25%'
        },
        actions: ['generate_alert', 'notification']
      },
      {
        id: 'route_deviation_high',
        name: 'High Route Deviation',
        type: 'ROUTE',
        severity: 'HIGH',
        conditions: {
          deviation: '> 20%'
        },
        actions: ['generate_alert', 'notification', 'auto_reroute']
      }
    ];

    for (const rule of rules) {
      this.alertRules.set(rule.id, rule);
    }
  }

  /**
   * Generate alert for route optimization event
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Generated alert
   */
  async generateRouteOptimizationAlert(eventType, eventData) {
    try {
      // Determine alert rule based on event type
      const alertRule = this._findAlertRule(eventType, eventData);
      
      if (!alertRule) {
        console.log(`No alert rule found for event type: ${eventType}`);
        return null;
      }

      // Create alert object
      const alert = {
        alert_id: `route_opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        rule_id: alertRule.id,
        rule_name: alertRule.name,
        severity: alertRule.severity,
        title: this._generateAlertTitle(eventType, eventData),
        message: this._generateAlertMessage(eventType, eventData),
        job_id: eventData.jobId || null,
        truck_id: eventData.truckId || null,
        created_at: new Date().toISOString(),
        acknowledged: false,
        details: {
          eventType: eventType,
          eventData: eventData,
          source: 'route_optimization',
          automatic: true
        },
        metadata: {
          optimization_data: eventData.optimizationData || null,
          driver_id: eventData.driverId || null,
          vehicle_id: eventData.vehicleId || null
        }
      };

      // Store alert in Supabase
      const storedAlert = await SupabaseService.storeAlert(alert);
      
      if (storedAlert) {
        // Queue notification
        await this._queueNotification(alert);
        
        // Execute additional actions based on alert rule
        await this._executeAlertActions(alertRule, alert, eventData);
        
        return alert;
      }

      return null;

    } catch (error) {
      console.error('Error generating route optimization alert:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Find appropriate alert rule for event
   * @private
   */
  _findAlertRule(eventType, eventData) {
    // Map event types to alert rules
    const eventTypeMapping = {
      'DISPATCH_EFFICIENCY_LOW': 'dispatch_efficiency_low',
      'DISPATCH_DELAY_EXCESSIVE': 'dispatch_delay_excessive',
      'DRIVER_EMERGENCY': 'driver_emergency',
      'VEHICLE_LOW_FUEL': 'vehicle_low_fuel',
      'ROUTE_DEVIATION_HIGH': 'route_deviation_high',
      'OPTIMIZATION_FAILED': 'dispatch_efficiency_low',
      'ROUTE_EFFICIENT_LOW': 'route_efficiency_low',
      'EXCESSIVE_DEADHEAD': 'route_efficiency_low'
    };

    const ruleId = eventTypeMapping[eventType];
    return ruleId ? this.alertRules.get(ruleId) : null;
  }

  /**
   * Generate alert title
   * @private
   */
  _generateAlertTitle(eventType, eventData) {
    const titleTemplates = {
      'DISPATCH_EFFICIENCY_LOW': 'Low Dispatch Efficiency Detected',
      'DISPATCH_DELAY_EXCESSIVE': 'Excessive Dispatch Delay',
      'DRIVER_EMERGENCY': 'Driver Emergency Alert',
      'VEHICLE_LOW_FUEL': 'Vehicle Low Fuel Warning',
      'ROUTE_DEVIATION_HIGH': 'High Route Deviation Alert',
      'OPTIMIZATION_FAILED': 'Route Optimization Failed',
      'ROUTE_EFFICIENCY_LOW': 'Route Efficiency Below Standard',
      'EXCESSIVE_DEADHEAD': 'Excessive Deadhead Miles Detected'
    };

    return titleTemplates[eventType] || `Route Optimization Alert: ${eventType}`;
  }

  /**
   * Generate alert message
   * @private
   */
  _generateAlertMessage(eventType, eventData) {
    const messageTemplates = {
      'DISPATCH_EFFICIENCY_LOW': `Dispatch efficiency is ${(eventData.efficiency * 100).toFixed(1)}%, below the ${(eventData.threshold * 100).toFixed(1)}% threshold.`,
      'DISPATCH_DELAY_EXCESSIVE': `Dispatch response time is ${eventData.responseTime} minutes, exceeding the ${eventData.threshold} minute threshold.`,
      'DRIVER_EMERGENCY': `Emergency situation reported for ${eventData.vehicleId || 'vehicle'}. Response time: ${eventData.responseTime} minutes.`,
      'VEHICLE_LOW_FUEL': `Vehicle ${eventData.truckId} has ${eventData.fuelLevel}% fuel remaining, below the ${eventData.threshold}% threshold.`,
      'ROUTE_DEVIATION_HIGH': `Vehicle ${eventData.truckId} has deviated ${(eventData.deviation * 100).toFixed(1)}% from planned route.`,
      'OPTIMIZATION_FAILED': `Route optimization failed using ${eventData.algorithm} algorithm. Error: ${eventData.error}`,
      'ROUTE_EFFICIENCY_LOW': `Route efficiency for vehicle ${eventData.vehicleId} is grade ${eventData.efficiency}, below standard.`,
      'EXCESSIVE_DEADHEAD': `Vehicle ${eventData.vehicleId} has ${(eventData.deadheadRatio * 100).toFixed(1)}% deadhead miles, above optimal range.`
    };

    return messageTemplates[eventType] || `Route optimization event: ${eventType}`;
  }

  /**
   * Queue notification for sending
   * @private
   */
  async _queueNotification(alert) {
    this.notificationQueue.push({
      alert: alert,
      timestamp: new Date(),
      attempts: 0,
      maxAttempts: 3
    });
  }

  /**
   * Execute alert actions
   * @private
   */
  async _executeAlertActions(alertRule, alert, eventData) {
    for (const action of alertRule.actions) {
      try {
        switch (action) {
          case 'escalation':
            await this._escalateAlert(alert, eventData);
            break;
          case 'auto_dispatch':
            await this._triggerAutoDispatch(alert, eventData);
            break;
          case 'auto_reroute':
            await this._triggerAutoReroute(alert, eventData);
            break;
        }
      } catch (error) {
        console.error(`Error executing alert action ${action}:`, error);
      }
    }
  }

  /**
   * Escalate alert to higher priority
   * @private
   */
  async _escalateAlert(alert, eventData) {
    console.log(`Escalating alert ${alert.alert_id} to management`);
  }

  /**
   * Trigger automatic dispatch
   * @private
   */
  async _triggerAutoDispatch(alert, eventData) {
    console.log(`Triggering auto-dispatch for emergency: ${alert.alert_id}`);
  }

  /**
   * Trigger automatic rerouting
   * @private
   */
  async _triggerAutoReroute(alert, eventData) {
    console.log(`Triggering auto-reroute for vehicle: ${eventData.truckId}`);
  }
}

// Export singleton instance
module.exports = new AlertIntegrationService();
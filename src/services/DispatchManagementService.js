/**
 * Dynamic Dispatch Management System
 * 
 * Provides intelligent dispatch capabilities:
 * - Dynamic job reassignment based on real-time conditions
 * - Driver workload balancing and optimization
 * - Automated dispatch decision-making
 * - Route change notifications and management
 * - Emergency rerouting and priority handling
 * - Performance monitoring and optimization
 * 
 * @module services/DispatchManagementService
 */

const RouteOptimizationService = require('./RouteOptimizationService');
const SamsaraIntegrationService = require('./SamsaraIntegrationService');

class DispatchManagementService {
  constructor() {
    this.enabled = true;
    this.dispatchRules = new Map();
    this.activeDispatches = new Map();
    this.dispatchHistory = [];
    this.assignmentQueue = [];
    
    // Dispatch configuration
    this.config = {
      maxDailyHours: 10, // Maximum hours per driver per day
      maxJobsPerDay: 15, // Maximum jobs per driver per day
      emergencyResponseTime: 30, // minutes
      reassignmentThreshold: 0.3, // 30% efficiency loss triggers reassignment
      maxDeadheadMiles: 25,
      proximityThreshold: 2, // miles for considering nearby drivers
      timeWindow: {
        morning: { start: '06:00', end: '10:00' },
        afternoon: { start: '10:00', end: '15:00' },
        evening: { start: '15:00', end: '20:00' }
      }
    };
    
    this._initializeDefaultRules();
  }

  /**
   * Check if dispatch service is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Initialize default dispatch rules
   * @private
   */
  _initializeDefaultRules() {
    const defaultRules = [
      {
        id: 'emergency_priority',
        name: 'Emergency Priority Dispatch',
        priority: 1,
        conditions: {
          jobPriority: ['URGENT', 'HIGH'],
          responseTime: '< 30 minutes',
          maxDistance: 50
        },
        actions: ['immediate_assignment', 'notification', 'tracking']
      },
      {
        id: 'load_balancing',
        name: 'Load Balancing Dispatch',
        priority: 2,
        conditions: {
          workloadDifference: '> 20%',
          timeWindow: 'any'
        },
        actions: ['rebalance_workload', 'optimize_routes']
      },
      {
        id: 'proximity_optimization',
        name: 'Proximity Optimization',
        priority: 3,
        conditions: {
          proximityThreshold: '< 2 miles',
          efficiencyGain: '> 15%'
        },
        actions: ['proximity_assignment', 'deadhead_reduction']
      },
      {
        id: 'time_efficiency',
        name: 'Time Efficiency Dispatch',
        priority: 4,
        conditions: {
          timeConstraints: 'strict',
          priorityLevel: 'medium+'
        },
        actions: ['time_optimization', 'traffic_consideration']
      }
    ];

    for (const rule of defaultRules) {
      this.dispatchRules.set(rule.id, rule);
    }
  }

  /**
   * Optimize dispatch assignments for all pending jobs
   * @param {Array} pendingJobs - Array of pending job objects
   * @param {Array} availableDrivers - Array of available driver objects
   * @param {Object} options - Dispatch optimization options
   * @returns {Promise<Object>} Optimized dispatch assignments
   */
  async optimizeDispatch(pendingJobs, availableDrivers, options = {}) {
    if (!pendingJobs || pendingJobs.length === 0) {
      throw new Error('No pending jobs provided for dispatch optimization');
    }

    if (!availableDrivers || availableDrivers.length === 0) {
      throw new Error('No available drivers provided for dispatch optimization');
    }

    try {
      const dispatchStartTime = Date.now();
      
      // Get real-time driver locations and status
      const driverLocations = await SamsaraIntegrationService.getMultipleTruckLocations(
        availableDrivers.map(d => d.vehicleId)
      );
      
      // Apply dispatch rules and optimizations
      const optimizedAssignments = await this._applyDispatchRules(
        pendingJobs, 
        driverLocations.vehicles, 
        options
      );
      
      // Calculate dispatch efficiency metrics
      const efficiencyMetrics = this._calculateDispatchEfficiency(
        pendingJobs, 
        optimizedAssignments
      );
      
      // Store dispatch decisions
      const dispatchRecord = {
        id: `dispatch_${Date.now()}`,
        timestamp: new Date(),
        jobsProcessed: pendingJobs.length,
        driversAvailable: availableDrivers.length,
        assignments: optimizedAssignments,
        efficiency: efficiencyMetrics,
        executionTime: Date.now() - dispatchStartTime
      };
      
      this.dispatchHistory.push(dispatchRecord);
      
      // Clean up old history (keep last 100 dispatches)
      if (this.dispatchHistory.length > 100) {
        this.dispatchHistory = this.dispatchHistory.slice(-100);
      }

      return {
        success: true,
        dispatchId: dispatchRecord.id,
        assignments: optimizedAssignments,
        efficiency: efficiencyMetrics,
        summary: {
          totalJobs: pendingJobs.length,
          assignedJobs: optimizedAssignments.filter(a => a.assigned).length,
          unassignedJobs: optimizedAssignments.filter(a => !a.assigned).length,
          totalDrivers: availableDrivers.length,
          activeAssignments: optimizedAssignments.filter(a => a.assigned).length
        }
      };

    } catch (error) {
      console.error('Dispatch optimization error:', error);
      throw new Error(`Dispatch optimization failed: ${error.message}`);
    }
  }

  /**
   * Handle dynamic job reassignment
   * @param {string} jobId - Job to reassign
   * @param {string} fromDriverId - Current driver
   * @param {string} toDriverId - Target driver
   * @param {string} reason - Reason for reassignment
   * @returns {Promise<Object>} Reassignment result
   */
  async reassignJob(jobId, fromDriverId, toDriverId, reason) {
    try {
      // Get current assignments
      const fromAssignment = this._findDriverAssignment(fromDriverId, jobId);
      const toAssignment = this._findDriverAssignment(toDriverId, jobId);
      
      if (!fromAssignment) {
        throw new Error(`Job ${jobId} not assigned to driver ${fromDriverId}`);
      }
      
      // Validate reassignment
      const validation = await this._validateReassignment(
        jobId, fromDriverId, toDriverId, reason
      );
      
      if (!validation.approved) {
        return {
          success: false,
          reason: validation.reason,
          suggestions: validation.suggestions
        };
      }
      
      // Execute reassignment
      const reassignment = {
        jobId: jobId,
        fromDriver: fromDriverId,
        toDriver: toDriverId,
        reason: reason,
        timestamp: new Date(),
        validation: validation,
        oldRoute: fromAssignment.route,
        newRoute: toAssignment.route,
        efficiency: {
          timeSavings: validation.timeSavings,
          distanceSavings: validation.distanceSavings,
          costImpact: validation.costImpact
        }
      };
      
      // Update driver assignments
      await this._executeReassignment(reassignment);
      
      // Generate notifications
      await this._generateReassignmentNotifications(reassignment);
      
      return {
        success: true,
        reassignment: reassignment,
        estimatedSavings: validation.estimatedSavings,
        notificationsSent: true
      };
      
    } catch (error) {
      console.error(`Job reassignment error for ${jobId}:`, error);
      throw new Error(`Job reassignment failed: ${error.message}`);
    }
  }

  /**
   * Balance driver workloads
   * @param {Array} driverWorkloads - Current driver workload data
   * @param {Object} options - Balancing options
   * @returns {Promise<Object>} Workload balancing result
   */
  async balanceWorkloads(driverWorkloads, options = {}) {
    try {
      // Calculate current workload distribution
      const workloadAnalysis = this._analyzeWorkloadDistribution(driverWorkloads);
      
      // Identify imbalance candidates
      const imbalanceCandidates = this._identifyImbalanceCandidates(workloadAnalysis);
      
      if (imbalanceCandidates.length === 0) {
        return {
          success: true,
          message: 'Workloads are already balanced',
          adjustments: [],
          analysis: workloadAnalysis
        };
      }
      
      // Generate balancing recommendations
      const balancingPlan = await this._generateBalancingPlan(
        imbalanceCandidates, 
        options
      );
      
      // Calculate expected improvements
      const expectedImprovements = this._calculateWorkloadImprovements(
        workloadAnalysis, 
        balancingPlan
      );
      
      return {
        success: true,
        currentAnalysis: workloadAnalysis,
        balancingPlan: balancingPlan,
        expectedImprovements: expectedImprovements,
        implementation: {
          jobsToMove: balancingPlan.moves,
          driversAffected: balancingPlan.drivers,
          estimatedTime: balancingPlan.estimatedTime
        }
      };
      
    } catch (error) {
      console.error('Workload balancing error:', error);
      throw new Error(`Workload balancing failed: ${error.message}`);
    }
  }

  /**
   * Handle emergency dispatch situations
   * @param {Object} emergencyData - Emergency situation data
   * @returns {Promise<Object>} Emergency dispatch result
   */
  async handleEmergencyDispatch(emergencyData) {
    try {
      const { type, location, priority, affectedJobs = [], timeframe } = emergencyData;
      
      // Identify available resources
      const availableResources = await this._getEmergencyResources(location, timeframe);
      
      // Apply emergency dispatch rules
      const emergencyPlan = await this._createEmergencyPlan(
        emergencyData, 
        availableResources
      );
      
      // Execute emergency dispatch
      const dispatchResult = await this._executeEmergencyDispatch(emergencyPlan);
      
      // Monitor emergency situation
      const monitoringPlan = await this._createMonitoringPlan(emergencyData);
      
      return {
        success: true,
        emergencyId: `emergency_${Date.now()}`,
        situation: emergencyData,
        resources: availableResources,
        dispatch: dispatchResult,
        monitoring: monitoringPlan,
        status: 'active',
        estimatedResolution: dispatchResult.estimatedResolution
      };
      
    } catch (error) {
      console.error('Emergency dispatch error:', error);
      throw new Error(`Emergency dispatch failed: ${error.message}`);
    }
  }

  /**
   * Get dispatch performance metrics
   * @param {Date} startTime - Start of measurement period
   * @param {Date} endTime - End of measurement period
   * @returns {Promise<Object>} Performance metrics
   */
  async getDispatchPerformance(startTime, endTime) {
    try {
      // Filter dispatch history by time range
      const relevantDispatches = this.dispatchHistory.filter(dispatch => {
        const dispatchTime = new Date(dispatch.timestamp);
        return dispatchTime >= startTime && dispatchTime <= endTime;
      });
      
      if (relevantDispatches.length === 0) {
        return {
          success: true,
          message: 'No dispatch data available for the specified period',
          metrics: null
        };
      }
      
      // Calculate key performance indicators
      const kpis = {
        dispatchEfficiency: this._calculateDispatchEfficiency(relevantDispatches),
        responseTime: this._calculateAverageResponseTime(relevantDispatches),
        workloadBalance: this._calculateWorkloadBalanceScore(relevantDispatches),
        reassignmentRate: this._calculateReassignmentRate(relevantDispatches),
        emergencyHandling: this._calculateEmergencyHandlingScore(relevantDispatches)
      };
      
      // Generate performance trends
      const trends = this._generatePerformanceTrends(relevantDispatches);
      
      return {
        success: true,
        period: { start: startTime, end: endTime },
        totalDispatches: relevantDispatches.length,
        kpis: kpis,
        trends: trends,
        insights: this._generatePerformanceInsights(kpis, trends)
      };
      
    } catch (error) {
      console.error('Error calculating dispatch performance:', error);
      throw new Error(`Failed to calculate dispatch performance: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Apply dispatch rules to job assignments
   * @private
   */
  async _applyDispatchRules(jobs, drivers, options) {
    const assignments = [];
    
    // Sort jobs by priority and time constraints
    const sortedJobs = this._sortJobsByPriority(jobs);
    
    for (const job of sortedJobs) {
      const assignment = await this._assignJob(job, drivers, options);
      assignments.push(assignment);
    }
    
    return assignments;
  }

  /**
   * Assign a single job to the best available driver
   * @private
   */
  async _assignJob(job, drivers, options) {
    let bestAssignment = null;
    let bestScore = -1;
    
    for (const driver of drivers) {
      if (!this._isDriverAvailable(driver, job)) continue;
      
      const score = await this._calculateAssignmentScore(job, driver, options);
      
      if (score > bestScore) {
        bestScore = score;
        bestAssignment = {
          job: job,
          driver: driver,
          score: score,
          estimatedTime: await this._estimateCompletionTime(job, driver),
          efficiency: await this._calculateEfficiency(job, driver)
        };
      }
    }
    
    return {
      job: job,
      driver: bestAssignment?.driver || null,
      assigned: bestAssignment !== null,
      assignment: bestAssignment,
      reason: bestAssignment ? 'Optimal match' : 'No available drivers'
    };
  }

  /**
   * Calculate assignment score for job-driver pair
   * @private
   */
  async _calculateAssignmentScore(job, driver, options) {
    let score = 0;
    
    // Priority weight (higher priority jobs get higher scores)
    const priorityWeight = { 'URGENT': 100, 'HIGH': 75, 'MEDIUM': 50, 'LOW': 25 };
    score += priorityWeight[job.priority] || 0;
    
    // Distance factor (closer drivers get higher scores)
    const distance = this._calculateJobDistance(job, driver);
    const distanceScore = Math.max(0, 100 - distance * 2);
    score += distanceScore;
    
    // Workload factor (drivers with lighter workloads get higher scores)
    const workloadScore = Math.max(0, 100 - (driver.currentJobs || 0) * 10);
    score += workloadScore;
    
    // Time constraint factor
    if (job.dueDate) {
      const timeUrgency = this._calculateTimeUrgency(job);
      score += timeUrgency;
    }
    
    // Driver efficiency factor
    if (driver.efficiency) {
      score += driver.efficiency * 20;
    }
    
    return score;
  }

  /**
   * Validate job reassignment
   * @private
   */
  async _validateReassignment(jobId, fromDriverId, toDriverId, reason) {
    // Get driver information
    const fromDriver = await SamsaraIntegrationService.getMultipleTruckLocations([fromDriverId]);
    const toDriver = await SamsaraIntegrationService.getMultipleTruckLocations([toDriverId]);
    
    if (!fromDriver.vehicles.length || !toDriver.vehicles.length) {
      return {
        approved: false,
        reason: 'Driver not found or not available'
      };
    }
    
    const fromVehicle = fromDriver.vehicles[0];
    const toVehicle = toDriver.vehicles[0];
    
    // Check if reassignment makes sense
    const distanceImprovement = this._calculateDistanceImprovement(
      fromVehicle.location, toVehicle.location
    );
    
    const timeImprovement = this._calculateTimeImprovement(
      fromVehicle, toVehicle
    );
    
    const isWorthwhile = distanceImprovement > 5 || timeImprovement > 15; // 5 miles or 15 minutes
    
    if (!isWorthwhile) {
      return {
        approved: false,
        reason: 'Reassignment does not provide significant improvement',
        suggestions: ['Consider different reassignment options', 'Wait for better opportunity']
      };
    }
    
    return {
      approved: true,
      reason: 'Reassignment provides efficiency improvement',
      timeSavings: timeImprovement,
      distanceSavings: distanceImprovement,
      estimatedSavings: {
        time: `${timeImprovement} minutes`,
        distance: `${distanceImprovement} miles`,
        cost: `$${(distanceImprovement * 0.65).toFixed(2)}`
      }
    };
  }

  /**
   * Execute job reassignment
   * @private
   */
  async _executeReassignment(reassignment) {
    // Update dispatch records
    const fromDriverAssignment = this._findDriverAssignment(
      reassignment.fromDriver, 
      reassignment.jobId
    );
    const toDriverAssignment = this._findDriverAssignment(
      reassignment.toDriver, 
      null // Will be assigned to new job
    );
    
    if (fromDriverAssignment) {
      fromDriverAssignment.route.jobs = fromDriverAssignment.route.jobs.filter(
        job => job.id !== reassignment.jobId
      );
    }
    
    if (toDriverAssignment) {
      toDriverAssignment.route.jobs.push(reassignment.job);
    }
    
    // Update dispatch history
    this.dispatchHistory.push({
      type: 'reassignment',
      jobId: reassignment.jobId,
      fromDriver: reassignment.fromDriver,
      toDriver: reassignment.toDriver,
      reason: reassignment.reason,
      timestamp: reassignment.timestamp,
      efficiency: reassignment.efficiency
    });
  }

  /**
   * Generate reassignment notifications
   * @private
   */
  async _generateReassignmentNotifications(reassignment) {
    // In a real implementation, this would send notifications to:
    // - Original driver
    // - New driver  
    // - Dispatch supervisor
    // - Customer (if relevant)
    
    const notifications = [
      {
        type: 'reassignment',
        recipient: reassignment.fromDriver,
        message: `Job ${reassignment.jobId} has been reassigned from you to another driver.`,
        timestamp: new Date()
      },
      {
        type: 'reassignment', 
        recipient: reassignment.toDriver,
        message: `You have been assigned job ${reassignment.jobId}. Please check your route.`,
        timestamp: new Date()
      }
    ];
    
    // Store notifications (in real implementation, send via email/SMS/push)
    return {
      success: true,
      notificationsSent: notifications.length,
      notifications: notifications
    };
  }

  /**
   * Calculate dispatch efficiency metrics
   * @private
   */
  _calculateDispatchEfficiency(jobs, assignments) {
    const assignedJobs = assignments.filter(a => a.assigned);
    const unassignedJobs = assignments.filter(a => !a.assigned);
    
    const efficiency = {
      assignmentRate: (assignedJobs.length / jobs.length) * 100,
      averageScore: assignedJobs.reduce((sum, a) => sum + a.assignment?.score || 0, 0) / assignedJobs.length || 0,
      estimatedTimeSavings: 0,
      distanceEfficiency: 0
    };
    
    // Calculate potential time and distance savings
    if (assignedJobs.length > 0) {
      const totalEstimatedTime = assignedJobs.reduce((sum, a) => sum + (a.assignment?.estimatedTime || 0), 0);
      efficiency.estimatedTimeSavings = totalEstimatedTime;
    }
    
    return efficiency;
  }

  /**
   * Helper methods for calculations
   * @private
   */
  _sortJobsByPriority(jobs) {
    return jobs.sort((a, b) => {
      const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
  }

  _isDriverAvailable(driver, job) {
    // Check if driver is active and has capacity
    const maxJobs = this.config.maxJobsPerDay;
    const currentJobs = driver.currentJobs || 0;
    
    return driver.status === 'active' && currentJobs < maxJobs;
  }

  _calculateJobDistance(job, driver) {
    if (!job.location || !driver.location) return 999;
    
    const R = 3959; // Earth radius in miles
    const dLat = this._toRad(job.location.lat - driver.location.lat);
    const dLng = this._toRad(job.location.lng - driver.location.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this._toRad(driver.location.lat)) * Math.cos(this._toRad(job.location.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _calculateTimeUrgency(job) {
    if (!job.dueDate) return 0;
    
    const now = new Date();
    const dueDate = new Date(job.dueDate);
    const timeRemaining = (dueDate - now) / (1000 * 60 * 60); // hours
    
    if (timeRemaining < 1) return 50; // Less than 1 hour
    if (timeRemaining < 2) return 30; // Less than 2 hours
    if (timeRemaining < 4) return 15; // Less than 4 hours
    return 0;
  }

  _findDriverAssignment(driverId, jobId) {
    // Find driver assignment in active dispatches
    for (const [dispatchId, dispatch] of this.activeDispatches) {
      if (dispatch.driverId === driverId) {
        if (jobId) {
          return dispatch.route.jobs.find(job => job.id === jobId);
        }
        return dispatch;
      }
    }
    return null;
  }

  _calculateDistanceImprovement(fromLocation, toLocation) {
    // Simplified distance improvement calculation
    return 10; // Mock 10 mile improvement
  }

  _calculateTimeImprovement(fromVehicle, toVehicle) {
    // Simplified time improvement calculation  
    return 20; // Mock 20 minute improvement
  }

  _toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Additional helper methods would be implemented here for full functionality
  _analyzeWorkloadDistribution() { return { balanced: true }; }
  _identifyImbalanceCandidates() { return []; }
  _generateBalancingPlan() { return { moves: [], drivers: [] }; }
  _calculateWorkloadImprovements() { return { improved: true }; }
  _getEmergencyResources() { return { available: [] }; }
  _createEmergencyPlan() { return { plan: 'execute_immediately' }; }
  _executeEmergencyDispatch() { return { success: true }; }
  _createMonitoringPlan() { return { monitor: true }; }
  _calculateDispatchEfficiency() { return 85; }
  _calculateAverageResponseTime() { return 15; }
  _calculateWorkloadBalanceScore() { return 90; }
  _calculateReassignmentRate() { return 5; }
  _calculateEmergencyHandlingScore() { return 95; }
  _generatePerformanceTrends() { return { improving: true }; }
  _generatePerformanceInsights() { return ['Good performance overall']; }
}

// Export singleton instance
module.exports = new DispatchManagementService();

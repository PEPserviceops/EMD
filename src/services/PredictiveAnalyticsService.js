/**
 * Predictive Analytics Data Service
 * 
 * Handles data collection, preprocessing, and feature engineering for the
 * Predictive Analytics & Forecasting Engine. Integrates with existing
 * Supabase services to build training datasets from historical data.
 * 
 * @module services/PredictiveAnalyticsService
 */

const supabaseService = require('./SupabaseService');
const openRouterService = require('./OpenRouterService');

class PredictiveAnalyticsService {
  constructor() {
    this.supabaseService = supabaseService;
    this.openRouterService = openRouterService;
  }

  /**
   * Check if the service is enabled
   */
  isEnabled() {
    return this.supabaseService.isEnabled() && this.openRouterService.isEnabled();
  }

  /**
   * Collect and preprocess historical job data for machine learning
   * @param {Date} startDate - Start date for historical data
   * @param {Date} endDate - End date for historical data
   * @returns {Promise<Array>} Preprocessed training data
   */
  async collectTrainingData(startDate, endDate) {
    if (!this.isEnabled()) {
      throw new Error('Predictive Analytics service is not properly configured');
    }

    try {
      // Get job history from Supabase
      const jobHistory = await this.supabaseService.getJobHistoryRange(startDate, endDate);
      
      if (!jobHistory || jobHistory.length === 0) {
        console.log('No historical job data found for the specified range');
        return [];
      }

      // Get alert history for context
      const alertHistory = await this.supabaseService.getAlerts(startDate, endDate);
      
      // Get efficiency metrics for performance context
      const efficiencyMetrics = await this.supabaseService.getEfficiencyMetricsRange(startDate, endDate);

      // Preprocess and enrich the data
      const processedData = await this.preprocessData(jobHistory, alertHistory, efficiencyMetrics);
      
      return processedData;
    } catch (error) {
      console.error('Error collecting training data:', error);
      throw new Error('Failed to collect training data');
    }
  }

  /**
   * Preprocess raw data into features suitable for machine learning
   * @private
   */
  async preprocessData(jobHistory, alertHistory, efficiencyMetrics) {
    const processedData = [];

    for (const job of jobHistory) {
      try {
        const features = this.extractFeatures(job, alertHistory, efficiencyMetrics);
        const target = this.extractTargetVariable(job);
        
        processedData.push({
          features,
          target,
          jobId: job.job_id,
          date: job.job_date,
          processedAt: new Date().toISOString()
        });
      } catch (error) {
        console.warn(`Error processing job ${job.job_id}:`, error.message);
        continue;
      }
    }

    console.log(`Processed ${processedData.length} training samples`);
    return processedData;
  }

  /**
   * Extract meaningful features from job data
   * @private
   */
  extractFeatures(job, alertHistory, efficiencyMetrics) {
    const features = {
      // Temporal features
      dayOfWeek: this.getDayOfWeek(job.job_date),
      month: this.getMonth(job.job_date),
      isWeekend: this.isWeekend(job.job_date),
      isHoliday: this.isHoliday(job.job_date),
      
      // Job type features
      jobType: this.encodeJobType(job.job_type),
      jobStatus: this.encodeJobStatus(job.job_status),
      truckType: this.encodeTruckType(job.truck_id),
      
      // Duration features
      plannedDuration: this.calculatePlannedDuration(job),
      urgencyLevel: this.calculateUrgencyLevel(job),
      
      // Route complexity features
      addressComplexity: this.calculateAddressComplexity(job.address),
      routeLength: this.estimateRouteLength(job),
      
      // Context features
      concurrentJobs: this.countConcurrentJobs(job.job_date, job.job_id),
      seasonalPattern: this.getSeasonalPattern(job.job_date),
      
      // Historical performance features
      avgDeliveryTime: this.getHistoricalDeliveryTime(job, efficiencyMetrics),
      successRate: this.getHistoricalSuccessRate(job, jobHistory)
    };

    return features;
  }

  /**
   * Extract target variable (what we want to predict)
   * @private
   */
  extractTargetVariable(job) {
    // Binary classification: Will the job be delayed or failed?
    const hasDelay = job.time_complete && job.time_arrival && 
                    (new Date(job.time_complete) - new Date(job.time_arrival)) > 90 * 60 * 1000; // 90 minutes
    
    const isFailed = job.job_status === 'Cancelled' || 
                    (job.job_status === 'Scheduled' && new Date(job.due_date) < new Date());
    
    return {
      willBeDelayed: hasDelay,
      willBeFailed: isFailed,
      completionTimeMinutes: this.calculateCompletionTime(job),
      onTimeDelivery: !hasDelay && !isFailed
    };
  }

  // === Feature Engineering Helper Methods ===

  /**
   * Get day of week (0-6, Sunday=0)
   * @private
   */
  getDayOfWeek(dateString) {
    const date = new Date(dateString);
    return date.getDay();
  }

  /**
   * Get month (0-11)
   * @private
   */
  getMonth(dateString) {
    const date = new Date(dateString);
    return date.getMonth();
  }

  /**
   * Check if date is weekend
   * @private
   */
  isWeekend(dateString) {
    const dayOfWeek = this.getDayOfWeek(dateString);
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  /**
   * Simple holiday detection (basic implementation)
   * @private
   */
  isHoliday(dateString) {
    const date = new Date(dateString);
    const month = date.getMonth();
    const day = date.getDate();
    
    // Basic holiday list (can be expanded)
    const holidays = [
      [0, 1],   // New Year's Day
      [11, 25], // Christmas
      [6, 4],   // Independence Day
      [10, 4],  // Thanksgiving (approximate)
    ];
    
    return holidays.some(([m, d]) => month === m && day === d);
  }

  /**
   * Encode job type for ML model
   * @private
   */
  encodeJobType(jobType) {
    const types = {
      'Delivery': 0,
      'Pickup': 1,
      'Transfer': 2,
      'Maintenance': 3
    };
    return types[jobType] || 0;
  }

  /**
   * Encode job status
   * @private
   */
  encodeJobStatus(jobStatus) {
    const statuses = {
      'Scheduled': 0,
      'In Progress': 1,
      'Completed': 2,
      'Cancelled': 3,
      'Delayed': 4
    };
    return statuses[jobStatus] || 0;
  }

  /**
   * Encode truck type (simplified)
   * @private
   */
  encodeTruckType(truckId) {
    if (!truckId) return 0;
    
    // Simple encoding based on truck ID patterns
    const truckIdStr = truckId.toString();
    if (truckIdStr.includes('TRUCK')) {
      return 0; // Standard truck
    } else if (truckIdStr.includes('VAN')) {
      return 1; // Van
    } else {
      return 2; // Other
    }
  }

  /**
   * Calculate planned duration based on job details
   * @private
   */
  calculatePlannedDuration(job) {
    if (!job.time_arrival || !job.due_date) return 120; // Default 2 hours
    
    const arrival = new Date(job.time_arrival);
    const due = new Date(job.due_date);
    return Math.max(30, (due - arrival) / (1000 * 60)); // Minimum 30 minutes
  }

  /**
   * Calculate urgency level (0-1)
   * @private
   */
  calculateUrgencyLevel(job) {
    if (!job.due_date) return 0.5;
    
    const now = new Date();
    const due = new Date(job.due_date);
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    
    if (hoursUntilDue <= 1) return 1.0;
    if (hoursUntilDue <= 4) return 0.8;
    if (hoursUntilDue <= 8) return 0.6;
    if (hoursUntilDue <= 24) return 0.4;
    return 0.2;
  }

  /**
   * Estimate address complexity (simplified)
   * @private
   */
  calculateAddressComplexity(address) {
    if (!address) return 0.5;
    
    let complexity = 0.3; // Base complexity
    
    // More words = more complex
    const words = address.split(' ').length;
    complexity += Math.min(0.4, words * 0.1);
    
    // Special characters
    if (address.includes('#')) complexity += 0.1;
    if (address.includes('Suite') || address.includes('Apt')) complexity += 0.1;
    if (address.includes('&')) complexity += 0.1;
    
    return Math.min(1.0, complexity);
  }

  /**
   * Estimate route length (simplified)
   * @private
   */
  estimateRouteLength(job) {
    // This would be enhanced with actual distance calculations
    return Math.random() * 50 + 10; // 10-60 miles (placeholder)
  }

  /**
   * Count concurrent jobs on the same date
   * @private
   */
  countConcurrentJobs(dateString, currentJobId) {
    // This would be implemented with actual job data query
    return Math.floor(Math.random() * 10) + 1; // Placeholder
  }

  /**
   * Get seasonal pattern score
   * @private
   */
  getSeasonalPattern(dateString) {
    const month = this.getMonth(dateString);
    // Summer months might have different patterns
    if (month >= 5 && month <= 8) return 0.8; // High season
    if (month === 11 || month === 0) return 0.6; // Holiday season
    return 0.4; // Regular season
  }

  /**
   * Get historical average delivery time for similar jobs
   * @private
   */
  getHistoricalDeliveryTime(job, efficiencyMetrics) {
    // This would query historical data for similar jobs
    return 90; // Placeholder: 90 minutes average
  }

  /**
   * Get historical success rate
   * @private
   */
  getHistoricalSuccessRate(job, jobHistory) {
    // This would calculate success rate for similar jobs
    return 0.92; // Placeholder: 92% success rate
  }

  /**
   * Calculate actual completion time
   * @private
   */
  calculateCompletionTime(job) {
    if (!job.time_arrival || !job.time_complete) return null;
    
    const arrival = new Date(job.time_arrival);
    const complete = new Date(job.time_complete);
    return (complete - arrival) / (1000 * 60); // Minutes
  }

  /**
   * Generate predictions for new jobs using collected data
   * @param {Object} newJob - Job data to predict
   * @returns {Promise<Object>} Prediction results
   */
  async generatePredictions(newJob) {
    if (!this.isEnabled()) {
      throw new Error('Predictive Analytics service is not properly configured');
    }

    try {
      // Get recent training data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const trainingData = await this.collectTrainingData(thirtyDaysAgo, new Date());
      
      if (trainingData.length === 0) {
        throw new Error('Insufficient training data for predictions');
      }

      // Generate features for the new job
      const features = this.extractFeatures(newJob, [], []);
      
      // Use OpenRouter for AI-powered prediction
      const aiInsights = await this.openRouterService.generateJobForecast(newJob, trainingData);
      
      // Apply simple ML algorithms
      const mlPredictions = this.applySimpleML(features, trainingData);
      
      return {
        jobId: newJob.jobId || 'unknown',
        predictions: {
          riskLevel: this.calculateRiskLevel(mlPredictions, aiInsights),
          predictedDuration: mlPredictions.estimatedDuration,
          successProbability: mlPredictions.successProbability,
          recommendedActions: aiInsights.recommendations || [],
          confidence: mlPredictions.confidence
        },
        insights: aiInsights,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating predictions:', error);
      throw new Error('Failed to generate job predictions');
    }
  }

  /**
   * Apply simple ML algorithms (JavaScript-based)
   * @private
   */
  applySimpleML(features, trainingData) {
    // Simple linear regression and probability calculations
    
    // Calculate similarity to historical jobs
    const similarJobs = this.findSimilarJobs(features, trainingData);
    
    // Predict success probability based on similar jobs
    const successCount = similarJobs.filter(job => job.target.onTimeDelivery).length;
    const successProbability = similarJobs.length > 0 ? successCount / similarJobs.length : 0.5;
    
    // Predict duration based on similar jobs
    const completionTimes = similarJobs
      .map(job => job.target.completionTimeMinutes)
      .filter(time => time !== null);
    
    const estimatedDuration = completionTimes.length > 0 
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 120; // Default 2 hours
    
    return {
      successProbability,
      estimatedDuration,
      confidence: this.calculateConfidence(similarJobs, trainingData)
    };
  }

  /**
   * Find similar jobs based on features
   * @private
   */
  findSimilarJobs(newFeatures, trainingData) {
    const similarityThreshold = 0.7;
    const similarJobs = [];
    
    for (const job of trainingData) {
      const similarity = this.calculateSimilarity(newFeatures, job.features);
      if (similarity >= similarityThreshold) {
        similarJobs.push(job);
      }
    }
    
    return similarJobs;
  }

  /**
   * Calculate similarity between two feature sets
   * @private
   */
  calculateSimilarity(features1, features2) {
    let totalSimilarity = 0;
    let featureCount = 0;
    
    for (const key in features1) {
      if (typeof features1[key] === 'number' && typeof features2[key] === 'number') {
        const diff = Math.abs(features1[key] - features2[key]);
        const similarity = 1 - Math.min(diff, 1); // Invert and cap at 1
        totalSimilarity += similarity;
        featureCount++;
      }
    }
    
    return featureCount > 0 ? totalSimilarity / featureCount : 0;
  }

  /**
   * Calculate prediction confidence
   * @private
   */
  calculateConfidence(similarJobs, trainingData) {
    const sampleSize = similarJobs.length;
    const totalSamples = trainingData.length;
    
    // Confidence increases with more similar examples
    const sampleConfidence = Math.min(1.0, sampleSize / 10);
    
    // Confidence decreases if similar examples are rare
    const rarityPenalty = sampleSize / totalSamples;
    
    return sampleConfidence * rarityPenalty;
  }

  /**
   * Calculate overall risk level
   * @private
   */
  calculateRiskLevel(mlPredictions, aiInsights) {
    let riskScore = 0;
    
    // Low success probability increases risk
    if (mlPredictions.successProbability < 0.3) riskScore += 0.4;
    else if (mlPredictions.successProbability < 0.6) riskScore += 0.2;
    
    // High estimated duration increases risk
    if (mlPredictions.estimatedDuration > 180) riskScore += 0.3;
    else if (mlPredictions.estimatedDuration > 120) riskScore += 0.1;
    
    // Low confidence increases risk
    if (mlPredictions.confidence < 0.3) riskScore += 0.2;
    else if (mlPredictions.confidence < 0.6) riskScore += 0.1;
    
    // AI insights can adjust risk
    if (aiInsights.predictions && aiInsights.predictions.length > 0) {
      riskScore += 0.1; // Additional caution based on AI analysis
    }
    
    return Math.min(1.0, riskScore);
  }
}

// Export singleton instance
module.exports = new PredictiveAnalyticsService();
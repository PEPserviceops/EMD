/**
 * Predictive Analytics API
 * 
 * Provides endpoints for the Predictive Analytics & Forecasting Engine:
 * - Job prediction and risk assessment
 * - Model training and management
 * - Integration with existing alert system
 * - Real-time prediction triggering
 */

const predictiveAnalyticsService = require('../../../services/PredictiveAnalyticsService');
const predictiveModelService = require('../../../services/PredictiveModelService');
const supabaseService = require('../../../services/SupabaseService');
const CircuitBreaker = require('../../../utils/circuitBreaker');

// Create circuit breaker for predictive analytics
const predictiveCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  timeout: 60000,
  monitor: (event, data) => {
    console.log(`Predictive Circuit Breaker ${event}:`, data);
  }
});

export default async function handler(req, res) {
  // Enable CORS for frontend integration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action, jobId, data } = req.method === 'GET' ? req.query : req.body;

  try {
    // Always return graceful response instead of 503
    const serviceEnabled = predictiveAnalyticsService.isEnabled();
    
    if (!serviceEnabled) {
      return res.status(200).json({
        success: true,
        enabled: false,
        fallback: true,
        message: 'Predictive Analytics service is disabled - using fallback data',
        service: {
          enabled: false,
          models: [],
          lastUpdate: new Date().toISOString()
        },
        predictions: [],
        status: 'graceful_fallback',
        timestamp: new Date().toISOString()
      });
    }

    switch (req.method) {
      case 'GET':
        return await handleGetRequest(req, res, { action, jobId });
      
      case 'POST':
        return await handlePostRequest(req, res, { action, jobId, data });
      
      default:
        return res.status(405).json({
          error: 'Method not allowed',
          message: `${req.method} is not supported`,
          supportedMethods: ['GET', 'POST']
        });
    }
  } catch (error) {
    console.error('Predictive Analytics API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Handle GET requests
 * @private
 */
async function handleGetRequest(req, res, params) {
  const { action, jobId } = params;

  switch (action) {
    case 'status':
      const statusResult = await predictiveCircuitBreaker.call(
        async () => ({
          enabled: predictiveAnalyticsService.isEnabled(),
          models: predictiveModelService.listModels(),
          lastUpdate: new Date().toISOString()
        }),
        {
          enabled: false,
          models: [],
          lastUpdate: new Date().toISOString()
        }
      );
      return res.status(200).json({
        success: true,
        service: statusResult,
        circuitBreaker: predictiveCircuitBreaker.getState()
      });

    case 'models':
      const models = predictiveModelService.listModels().map(type => ({
        type,
        performance: predictiveModelService.getModelPerformance(type),
        available: !!predictiveModelService.getModel(type)
      }));
      return res.status(200).json({
        success: true,
        models
      });

    case 'predict':
      if (!jobId) {
        return res.status(400).json({
          error: 'Missing jobId parameter',
          message: 'jobId is required for prediction requests'
        });
      }
      return await handlePredictionRequest(req, res, jobId);

    case 'history':
      return await handlePredictionHistory(req, res, req.query);

    default:
      return res.status(400).json({
        error: 'Invalid action',
        message: 'Action must be one of: status, models, predict, history',
        availableActions: ['status', 'models', 'predict', 'history']
      });
  }
}

/**
 * Handle POST requests
 * @private
 */
async function handlePostRequest(req, res, params) {
  const { action, jobId, data } = params;

  switch (action) {
    case 'train':
      return await handleModelTraining(req, res, data);

    case 'predict':
      if (!data || !data.jobData) {
        return res.status(400).json({
          error: 'Missing job data',
          message: 'jobData is required for prediction requests'
        });
      }
      return await handleNewJobPrediction(req, res, data.jobData);

    case 'trigger':
      if (!jobId) {
        return res.status(400).json({
          error: 'Missing jobId',
          message: 'jobId is required for trigger requests'
        });
      }
      return await handlePredictionTrigger(req, res, jobId);

    default:
      return res.status(400).json({
        error: 'Invalid action',
        message: 'Action must be one of: train, predict, trigger',
        availableActions: ['train', 'predict', 'trigger']
      });
  }
}

/**
 * Handle model training request
 * @private
 */
async function handleModelTraining(req, res, trainingData) {
  const { startDate, endDate, config } = trainingData;

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: 'Missing date range',
      message: 'startDate and endDate are required for training'
    });
  }

  try {
    // Collect training data
    const data = await predictiveAnalyticsService.collectTrainingData(
      new Date(startDate), 
      new Date(endDate)
    );

    if (data.length === 0) {
      return res.status(404).json({
        error: 'No training data found',
        message: 'No historical data available for the specified date range'
      });
    }

    // Train models
    const trainingResult = await predictiveModelService.trainModels(data, config);

    return res.status(200).json({
      success: true,
      message: 'Model training completed successfully',
      result: trainingResult
    });
  } catch (error) {
    console.error('Model training error:', error);
    return res.status(500).json({
      error: 'Model training failed',
      message: error.message
    });
  }
}

/**
 * Handle new job prediction request
 * @private
 */
async function handleNewJobPrediction(req, res, jobData) {
  try {
    const prediction = await predictiveAnalyticsService.generatePredictions(jobData);
    
    // Store prediction result in Supabase
    if (supabaseService.isEnabled()) {
      try {
        await supabaseService.storePredictionResult({
          job_id: jobData.jobId,
          prediction_data: prediction,
          created_at: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Failed to store prediction result:', error.message);
      }
    }

    // Check if high-risk prediction should trigger alert
    if (prediction.predictions.riskLevel > 0.7) {
      await triggerPredictiveAlert(jobData, prediction);
    }

    return res.status(200).json({
      success: true,
      prediction
    });
  } catch (error) {
    console.error('Prediction error:', error);
    return res.status(500).json({
      error: 'Prediction failed',
      message: error.message
    });
  }
}

/**
 * Handle prediction trigger for existing job
 * @private
 */
async function handlePredictionTrigger(req, res, jobId) {
  try {
    // Get job data from Supabase
    const jobData = await supabaseService.getJobById(jobId);
    
    if (!jobData) {
      return res.status(404).json({
        error: 'Job not found',
        message: `Job with ID ${jobId} not found`
      });
    }

    // Generate prediction
    const prediction = await predictiveAnalyticsService.generatePredictions(jobData);
    
    // Store prediction result
    if (supabaseService.isEnabled()) {
      try {
        await supabaseService.storePredictionResult({
          job_id: jobId,
          prediction_data: prediction,
          created_at: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Failed to store prediction result:', error.message);
      }
    }

    // Check if high-risk prediction should trigger alert
    if (prediction.predictions.riskLevel > 0.6) {
      await triggerPredictiveAlert(jobData, prediction);
    }

    return res.status(200).json({
      success: true,
      prediction
    });
  } catch (error) {
    console.error('Prediction trigger error:', error);
    return res.status(500).json({
      error: 'Prediction trigger failed',
      message: error.message
    });
  }
}

/**
 * Handle prediction request for existing job
 * @private
 */
async function handlePredictionRequest(req, res, jobId) {
  try {
    // Get job data from Supabase
    const jobData = await supabaseService.getJobById(jobId);
    
    if (!jobData) {
      return res.status(404).json({
        error: 'Job not found',
        message: `Job with ID ${jobId} not found`
      });
    }

    // Get existing prediction or generate new one
    const existingPrediction = await supabaseService.getLatestPrediction(jobId);
    
    if (existingPrediction) {
      return res.status(200).json({
        success: true,
        prediction: existingPrediction,
        cached: true
      });
    }

    // Generate new prediction
    const prediction = await predictiveAnalyticsService.generatePredictions(jobData);
    
    return res.status(200).json({
      success: true,
      prediction,
      cached: false
    });
  } catch (error) {
    console.error('Prediction request error:', error);
    return res.status(500).json({
      error: 'Prediction request failed',
      message: error.message
    });
  }
}

/**
 * Handle prediction history request
 * @private
 */
async function handlePredictionHistory(req, res, query) {
  const { jobId, limit = 50, startDate, endDate } = query;

  try {
    let predictions;

    if (jobId) {
      // Get predictions for specific job
      predictions = await supabaseService.getJobPredictions(jobId, parseInt(limit));
    } else if (startDate && endDate) {
      // Get predictions for date range
      predictions = await supabaseService.getPredictionsByDateRange(
        new Date(startDate), 
        new Date(endDate), 
        parseInt(limit)
      );
    } else {
      // Get recent predictions
      predictions = await supabaseService.getRecentPredictions(parseInt(limit));
    }

    return res.status(200).json({
      success: true,
      predictions,
      count: predictions.length
    });
  } catch (error) {
    console.error('Prediction history error:', error);
    return res.status(500).json({
      error: 'Failed to fetch prediction history',
      message: error.message
    });
  }
}

/**
 * Trigger predictive alert based on high-risk prediction
 * @private
 */
async function triggerPredictiveAlert(jobData, prediction) {
  try {
    const alert = {
      alert_id: `PREDICTIVE_${jobData.jobId}_${Date.now()}`,
      rule_id: 'PREDICTIVE_RISK',
      rule_name: 'Predictive Risk Alert',
      severity: prediction.predictions.riskLevel > 0.85 ? 'CRITICAL' : 'HIGH',
      title: `High Risk Prediction for Job ${jobData.jobId}`,
      message: `AI prediction indicates ${(prediction.predictions.riskLevel * 100).toFixed(0)}% risk of delay/failure`,
      job_id: jobData.jobId,
      job_status: jobData.status,
      job_date: jobData.date,
      truck_id: jobData.truckId,
      created_at: new Date().toISOString(),
      acknowledged: false,
      details: {
        prediction: prediction.predictions,
        confidence: prediction.predictions.confidence,
        recommended_actions: prediction.predictions.recommendedActions,
        predicted_duration: prediction.predictions.predictedDuration
      },
      metadata: {
        source: 'predictive_analytics',
        model_type: 'ensemble',
        risk_score: prediction.predictions.riskLevel
      }
    };

    // Store alert in Supabase
    if (supabaseService.isEnabled()) {
      await supabaseService.storeAlert(alert);
      console.log(`Triggered predictive alert for job ${jobData.jobId} with risk level ${prediction.predictions.riskLevel}`);
    }
  } catch (error) {
    console.error('Error triggering predictive alert:', error);
  }
}
/**
 * Predictive Model Training Service
 * 
 * Handles machine learning model training, evaluation, and persistence
 * for the Predictive Analytics & Forecasting Engine. Implements simple
 * but effective algorithms for job forecasting.
 * 
 * @module services/PredictiveModelService
 */

const fs = require('fs').promises;
const path = require('path');

class PredictiveModelService {
  constructor() {
    this.models = new Map();
    this.evaluationMetrics = new Map();
    this.modelPath = path.join(process.cwd(), 'models', 'predictive');
    this.ensureModelDirectory();
  }

  /**
   * Ensure model directory exists
   * @private
   */
  async ensureModelDirectory() {
    try {
      await fs.mkdir(this.modelPath, { recursive: true });
    } catch (error) {
      console.warn('Could not create model directory:', error.message);
    }
  }

  /**
   * Train prediction models using collected training data
   * @param {Array} trainingData - Preprocessed training data
   * @param {Object} config - Training configuration
   * @returns {Promise<Object>} Trained model information
   */
  async trainModels(trainingData, config = {}) {
    if (!trainingData || trainingData.length === 0) {
      throw new Error('No training data provided');
    }

    const defaultConfig = {
      trainTestSplit: 0.8,
      crossValidationFolds: 5,
      modelTypes: ['logistic_regression', 'decision_tree', 'ensemble'],
      randomSeed: 42
    };

    const trainingConfig = { ...defaultConfig, ...config };

    try {
      console.log(`Starting model training with ${trainingData.length} samples...`);

      // Split data into training and testing sets
      const { trainData, testData } = this.splitData(trainingData, trainingConfig.trainTestSplit, trainingConfig.randomSeed);
      
      console.log(`Training set: ${trainData.length} samples, Test set: ${testData.length} samples`);

      const modelResults = {};

      // Train different model types
      for (const modelType of trainingConfig.modelTypes) {
        console.log(`Training ${modelType} model...`);
        
        let model;
        try {
          switch (modelType) {
            case 'logistic_regression':
              model = await this.trainLogisticRegression(trainData, testData);
              break;
            case 'decision_tree':
              model = await this.trainDecisionTree(trainData, testData);
              break;
            case 'ensemble':
              model = await this.trainEnsembleModel(trainData, testData);
              break;
            default:
              console.warn(`Unknown model type: ${modelType}`);
              continue;
          }

          if (model) {
            modelResults[modelType] = {
              model: model,
              performance: model.performance,
              trainingTime: model.trainingTime,
              features: model.features,
              version: Date.now()
            };

            console.log(`${modelType} model trained successfully`);
            console.log(`  Accuracy: ${(model.performance.accuracy * 100).toFixed(1)}%`);
            console.log(`  Precision: ${(model.performance.precision * 100).toFixed(1)}%`);
            console.log(`  Recall: ${(model.performance.recall * 100).toFixed(1)}%`);
            console.log(`  F1-Score: ${(model.performance.f1Score * 100).toFixed(1)}%`);
          }
        } catch (error) {
          console.error(`Error training ${modelType} model:`, error.message);
        }
      }

      // Store models in memory
      this.models = new Map(Object.entries(modelResults));

      // Select best model based on F1 score
      const bestModelType = this.selectBestModel(modelResults);
      const bestModel = modelResults[bestModelType];

      if (bestModel) {
        console.log(`Best model: ${bestModelType} with F1-score: ${(bestModel.performance.f1Score * 100).toFixed(1)}%`);
        
        // Save models to disk
        await this.saveModels(modelResults);
        
        return {
          success: true,
          bestModel: bestModelType,
          models: Object.keys(modelResults),
          performance: modelResults[bestModelType].performance,
          trainingSummary: {
            totalSamples: trainingData.length,
            trainingSamples: trainData.length,
            testSamples: testData.length,
            modelsTrained: Object.keys(modelResults).length
          }
        };
      } else {
        throw new Error('No models were successfully trained');
      }

    } catch (error) {
      console.error('Error in model training:', error);
      throw new Error(`Model training failed: ${error.message}`);
    }
  }

  /**
   * Split data into training and testing sets
   * @private
   */
  splitData(data, trainTestSplit, randomSeed) {
    const shuffled = this.shuffleArray([...data], randomSeed);
    const splitIndex = Math.floor(shuffled.length * trainTestSplit);
    
    return {
      trainData: shuffled.slice(0, splitIndex),
      testData: shuffled.slice(splitIndex)
    };
  }

  /**
   * Shuffle array with seed for reproducibility
   * @private
   */
  shuffleArray(array, seed) {
    let random = this.seededRandom(seed);
    
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    
    return array;
  }

  /**
   * Simple seeded random number generator
   * @private
   */
  seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return function() {
      x = Math.sin(x) * 10000;
      return x - Math.floor(x);
    };
  }

  /**
   * Train logistic regression model
   * @private
   */
  async trainLogisticRegression(trainData, testData) {
    const startTime = Date.now();
    
    // Extract features and targets
    const features = this.extractFeatureMatrix(trainData);
    const targets = this.extractTargetVector(trainData);
    
    // Simple logistic regression implementation
    const weights = this.initializeWeights(features[0].length);
    const learningRate = 0.01;
    const epochs = 100;
    
    // Gradient descent
    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i < features.length; i++) {
        const prediction = this.sigmoid(this.dotProduct(weights, features[i]));
        const error = targets[i] - prediction;
        
        // Update weights
        for (let j = 0; j < weights.length; j++) {
          weights[j] += learningRate * error * features[i][j];
        }
      }
    }
    
    // Test the model
    const testFeatures = this.extractFeatureMatrix(testData);
    const testTargets = this.extractTargetVector(testData);
    const predictions = testFeatures.map(feature => this.sigmoid(this.dotProduct(weights, feature)));
    
    const performance = this.evaluateModel(predictions, testTargets);
    
    return {
      type: 'logistic_regression',
      weights: weights,
      performance: performance,
      trainingTime: Date.now() - startTime,
      features: this.getFeatureNames(trainData)
    };
  }

  /**
   * Train decision tree model
   * @private
   */
  async trainDecisionTree(trainData, testData) {
    const startTime = Date.now();
    
    // Build a simple decision tree
    const tree = this.buildDecisionTree(trainData);
    
    // Test the model
    const testFeatures = this.extractFeatureMatrix(testData);
    const testTargets = this.extractTargetVector(testData);
    const predictions = testFeatures.map(feature => this.predictTree(tree, feature));
    
    const performance = this.evaluateModel(predictions, testTargets);
    
    return {
      type: 'decision_tree',
      tree: tree,
      performance: performance,
      trainingTime: Date.now() - startTime,
      features: this.getFeatureNames(trainData)
    };
  }

  /**
   * Train ensemble model (voting classifier)
   * @private
   */
  async trainEnsembleModel(trainData, testData) {
    const startTime = Date.now();
    
    // Train multiple simple models
    const models = [];
    
    // Simple decision stumps
    for (let i = 0; i < 5; i++) {
      const feature = Math.floor(Math.random() * this.getFeatureNames(trainData).length);
      const threshold = Math.random();
      
      models.push({
        feature: feature,
        threshold: threshold,
        predictions: this.getFeatureMatrix(trainData).map(row => row[feature] > threshold ? 1 : 0)
      });
    }
    
    // Test ensemble
    const testFeatures = this.getFeatureMatrix(testData);
    const testTargets = this.extractTargetVector(testData);
    const predictions = testFeatures.map(feature => {
      const votes = models.map(model => feature[model.feature] > model.threshold ? 1 : 0);
      return votes.reduce((a, b) => a + b, 0) / votes.length > 0.5 ? 1 : 0;
    });
    
    const performance = this.evaluateModel(predictions, testTargets);
    
    return {
      type: 'ensemble',
      models: models,
      performance: performance,
      trainingTime: Date.now() - startTime,
      features: this.getFeatureNames(trainData)
    };
  }

  /**
   * Build simple decision tree using Gini impurity
   * @private
   */
  buildDecisionTree(data, maxDepth = 5, currentDepth = 0) {
    if (currentDepth >= maxDepth || data.length < 5) {
      // Return majority class
      const positiveCount = data.filter(d => d.target.willBeDelayed).length;
      return { 
        prediction: positiveCount > data.length / 2 ? 1 : 0,
        type: 'leaf',
        depth: currentDepth
      };
    }
    
    // Find best split
    const features = this.getFeatureNames(data);
    let bestFeature = 0;
    let bestThreshold = 0;
    let bestGini = Infinity;
    
    for (let i = 0; i < features.length; i++) {
      // Try different thresholds
      for (let j = 1; j <= 10; j++) {
        const threshold = j / 10;
        const gini = this.calculateGiniImpurity(data, i, threshold);
        
        if (gini < bestGini) {
          bestGini = gini;
          bestFeature = i;
          bestThreshold = threshold;
        }
      }
    }
    
    // Split data
    const leftData = data.filter(d => d.features[features[bestFeature]] <= bestThreshold);
    const rightData = data.filter(d => d.features[features[bestFeature]] > bestThreshold);
    
    return {
      feature: features[bestFeature],
      threshold: bestThreshold,
      left: this.buildDecisionTree(leftData, maxDepth, currentDepth + 1),
      right: this.buildDecisionTree(rightData, maxDepth, currentDepth + 1),
      type: 'node',
      depth: currentDepth
    };
  }

  /**
   * Calculate Gini impurity for a split
   * @private
   */
  calculateGiniImpurity(data, featureIndex, threshold) {
    const left = data.filter(d => d.features[Object.keys(d.features)[featureIndex]] <= threshold);
    const right = data.filter(d => d.features[Object.keys(d.features)[featureIndex]] > threshold);
    
    const gini = (subset) => {
      if (subset.length === 0) return 0;
      const positive = subset.filter(d => d.target.willBeDelayed).length;
      const negative = subset.length - positive;
      const p1 = positive / subset.length;
      const p2 = negative / subset.length;
      return 1 - (p1 * p1 + p2 * p2);
    };
    
    const totalSize = data.length;
    return (left.length / totalSize) * gini(left) + (right.length / totalSize) * gini(right);
  }

  /**
   * Predict using decision tree
   * @private
   */
  predictTree(tree, features) {
    if (tree.type === 'leaf') {
      return tree.prediction;
    }
    
    const featureValue = features[Object.keys(features)[tree.featureIndex]] || 0;
    if (featureValue <= tree.threshold) {
      return this.predictTree(tree.left, features);
    } else {
      return this.predictTree(tree.right, features);
    }
  }

  /**
   * Extract feature matrix from data
   * @private
   */
  extractFeatureMatrix(data) {
    return data.map(d => Object.values(d.features));
  }

  /**
   * Get feature matrix (alias for extractFeatureMatrix)
   * @private
   */
  getFeatureMatrix(data) {
    return this.extractFeatureMatrix(data);
  }

  /**
   * Extract target vector
   * @private
   */
  extractTargetVector(data) {
    return data.map(d => d.target.willBeDelayed ? 1 : 0);
  }

  /**
   * Get feature names
   * @private
   */
  getFeatureNames(data) {
    return data.length > 0 ? Object.keys(data[0].features) : [];
  }

  /**
   * Initialize weights for logistic regression
   * @private
   */
  initializeWeights(featureCount) {
    return new Array(featureCount).fill(0).map(() => (Math.random() - 0.5) * 0.1);
  }

  /**
   * Sigmoid function
   * @private
   */
  sigmoid(x) {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
  }

  /**
   * Dot product
   * @private
   */
  dotProduct(a, b) {
    return a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
  }

  /**
   * Evaluate model performance
   * @private
   */
  evaluateModel(predictions, targets) {
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;
    
    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i] > 0.5 ? 1 : 0;
      const actual = targets[i];
      
      if (pred === 1 && actual === 1) truePositives++;
      else if (pred === 1 && actual === 0) falsePositives++;
      else if (pred === 0 && actual === 0) trueNegatives++;
      else if (pred === 0 && actual === 1) falseNegatives++;
    }
    
    const accuracy = (truePositives + trueNegatives) / (predictions.length || 1);
    const precision = truePositives / (truePositives + falsePositives || 1);
    const recall = truePositives / (truePositives + falseNegatives || 1);
    const f1Score = 2 * (precision * recall) / (precision + recall || 1);
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix: {
        truePositives,
        falsePositives,
        trueNegatives,
        falseNegatives
      }
    };
  }

  /**
   * Select best model based on F1 score
   * @private
   */
  selectBestModel(modelResults) {
    let bestModel = null;
    let bestScore = -1;
    
    for (const [modelType, result] of Object.entries(modelResults)) {
      if (result.performance.f1Score > bestScore) {
        bestScore = result.performance.f1Score;
        bestModel = modelType;
      }
    }
    
    return bestModel;
  }

  /**
   * Save trained models to disk
   * @private
   */
  async saveModels(modelResults) {
    try {
      for (const [modelType, result] of Object.entries(modelResults)) {
        const modelData = {
          type: result.model.type,
          data: result.model,
          performance: result.performance,
          version: result.version,
          savedAt: new Date().toISOString()
        };
        
        const filePath = path.join(this.modelPath, `${modelType}_model.json`);
        await fs.writeFile(filePath, JSON.stringify(modelData, null, 2));
        
        console.log(`Saved ${modelType} model to ${filePath}`);
      }
    } catch (error) {
      console.error('Error saving models:', error);
    }
  }

  /**
   * Load trained models from disk
   * @async
   */
  async loadModels() {
    try {
      const files = await fs.readdir(this.modelPath);
      const modelFiles = files.filter(f => f.endsWith('_model.json'));
      
      for (const file of modelFiles) {
        const filePath = path.join(this.modelPath, file);
        const modelData = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        this.models.set(modelData.type, modelData.data);
        this.evaluationMetrics.set(modelData.type, modelData.performance);
        
        console.log(`Loaded ${modelData.type} model from ${file}`);
      }
      
      return this.models.size > 0;
    } catch (error) {
      console.warn('No saved models found or error loading models:', error.message);
      return false;
    }
  }

  /**
   * Get loaded model for prediction
   * @param {string} modelType - Type of model to get
   * @returns {Object|null} Model object or null if not found
   */
  getModel(modelType = 'ensemble') {
    return this.models.get(modelType) || null;
  }

  /**
   * Get model performance metrics
   * @param {string} modelType - Type of model
   * @returns {Object|null} Performance metrics or null
   */
  getModelPerformance(modelType = 'ensemble') {
    return this.evaluationMetrics.get(modelType) || null;
  }

  /**
   * List available models
   * @returns {Array} List of available model types
   */
  listModels() {
    return Array.from(this.models.keys());
  }
}

// Export singleton instance
module.exports = new PredictiveModelService();
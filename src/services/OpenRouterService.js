/**
 * OpenRouter DeepSeek API Service
 * 
 * Handles integration with OpenRouter's DeepSeek model for advanced AI capabilities
 * including predictive analytics, route optimization insights, and business intelligence.
 * 
 * @module services/OpenRouterService
 */

const axios = require('axios');

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1';
    this.timeout = parseInt(process.env.OPENROUTER_TIMEOUT) || 30000;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NODE_ENV === 'production' ? 'https://emd-pepmove.vercel.app' : 'http://localhost:3000',
        'X-Title': 'Exception Management Dashboard - EMD'
      }
    });
  }

  /**
   * Check if OpenRouter is enabled and configured
   */
  isEnabled() {
    return !!(this.apiKey && this.baseURL);
  }

  /**
   * Generate predictive insights for job forecasting
   * @param {Object} jobData - Current job data for analysis
   * @param {Object} historicalData - Historical job performance data
   * @returns {Promise<Object>} AI-generated predictions and insights
   */
  async generateJobForecast(jobData, historicalData = []) {
    if (!this.isEnabled()) {
      throw new Error('OpenRouter service is not configured');
    }

    const prompt = this._buildJobForecastPrompt(jobData, historicalData);
    
    try {
      const response = await this._callModel(prompt, {
        max_tokens: 1000,
        temperature: 0.3,
        system_message: 'You are an AI assistant specializing in logistics and fleet management forecasting.'
      });

      return this._parseForecastResponse(response);
    } catch (error) {
      console.error('Error generating job forecast:', error);
      throw new Error('Failed to generate job forecast');
    }
  }

  /**
   * Analyze route efficiency and provide optimization suggestions
   * @param {Object} routeData - Current route data
   * @param {Object} trafficData - Real-time traffic information
   * @returns {Promise<Object>} Route optimization analysis
   */
  async analyzeRouteOptimization(routeData, trafficData = {}) {
    if (!this.isEnabled()) {
      throw new Error('OpenRouter service is not configured');
    }

    const prompt = this._buildRouteOptimizationPrompt(routeData, trafficData);
    
    try {
      const response = await this._callModel(prompt, {
        max_tokens: 800,
        temperature: 0.2,
        system_message: 'You are an AI specialist in route optimization and logistics efficiency.'
      });

      return this._parseOptimizationResponse(response);
    } catch (error) {
      console.error('Error analyzing route optimization:', error);
      throw new Error('Failed to analyze route optimization');
    }
  }

  /**
   * Generate business intelligence insights from operational data
   * @param {Object} metrics - Business performance metrics
   * @param {Object} context - Additional context about the business
   * @returns {Promise<Object>} Business intelligence analysis
   */
  async generateBusinessInsights(metrics, context = {}) {
    if (!this.isEnabled()) {
      throw new Error('OpenRouter service is not configured');
    }

    const prompt = this._buildBusinessInsightsPrompt(metrics, context);
    
    try {
      const response = await this._callModel(prompt, {
        max_tokens: 1200,
        temperature: 0.4,
        system_message: 'You are a business intelligence analyst specializing in logistics operations and fleet management.'
      });

      return this._parseBusinessInsightsResponse(response);
    } catch (error) {
      console.error('Error generating business insights:', error);
      throw new Error('Failed to generate business insights');
    }
  }

  /**
   * Generate automated alert insights and root cause analysis
   * @param {Object} alert - Alert data to analyze
   * @param {Object} contextData - Additional context about the system state
   * @returns {Promise<Object>} AI-generated alert analysis
   */
  async analyzeAlert(alert, contextData = {}) {
    if (!this.isEnabled()) {
      throw new Error('OpenRouter service is not configured');
    }

    const prompt = this._buildAlertAnalysisPrompt(alert, contextData);
    
    try {
      const response = await this._callModel(prompt, {
        max_tokens: 600,
        temperature: 0.2,
        system_message: 'You are an AI assistant specializing in operational alert analysis and root cause identification.'
      });

      return this._parseAlertAnalysisResponse(response);
    } catch (error) {
      console.error('Error analyzing alert:', error);
      throw new Error('Failed to analyze alert');
    }
  }

  /**
   * Make API call to OpenRouter model
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Additional options for the API call
   * @returns {Promise<Object>} API response
   * @private
   */
  async _callModel(prompt, options = {}) {
    const requestBody = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      ...options
    };

    const response = await this.client.post('/chat/completions', requestBody);
    
    if (!response.data.choices || response.data.choices.length === 0) {
      throw new Error('Invalid response from OpenRouter API');
    }

    return response.data.choices[0].message.content;
  }

  /**
   * Build prompt for job forecasting analysis
   * @private
   */
  _buildJobForecastPrompt(jobData, historicalData) {
    return `
Analyze the following job data and provide forecasting insights:

Current Job:
- Job ID: ${jobData.jobId || 'N/A'}
- Type: ${jobData.type || 'N/A'}
- Status: ${jobData.status || 'N/A'}
- Due Date: ${jobData.dueDate || 'N/A'}
- Address: ${jobData.address || 'N/A'}
- Truck ID: ${jobData.truckId || 'N/A'}
- Driver ID: ${jobData.driverId || 'N/A'}

Historical Context:
${JSON.stringify(historicalData.slice(0, 5), null, 2)}

Please provide:
1. Risk factors for this job (1-3 items)
2. Predicted completion time range
3. Potential efficiency issues
4. Recommended actions to ensure success
`;
  }

  /**
   * Build prompt for route optimization analysis
   * @private
   */
  _buildRouteOptimizationPrompt(routeData, trafficData) {
    return `
Analyze the following route for optimization opportunities:

Route Data:
- Current Stops: ${JSON.stringify(routeData.stops || [], null, 2)}
- Total Distance: ${routeData.totalDistance || 'N/A'} miles
- Estimated Duration: ${routeData.estimatedDuration || 'N/A'} minutes
- Truck ID: ${routeData.truckId || 'N/A'}
- Driver ID: ${routeData.driverId || 'N/A'}

Traffic Data:
${JSON.stringify(trafficData, null, 2)}

Please provide:
1. Route efficiency score (0-100)
2. Top 3 optimization recommendations
3. Estimated time/fuel savings
4. Risk factors to consider
5. Alternative routing suggestions
`;
  }

  /**
   * Build prompt for business insights analysis
   * @private
   */
  _buildBusinessInsightsPrompt(metrics, context) {
    return `
Generate business intelligence insights from the following operational data:

Performance Metrics:
- Total Jobs: ${metrics.totalJobs || 'N/A'}
- Completion Rate: ${metrics.completionRate || 'N/A'}%
- Average Delivery Time: ${metrics.avgDeliveryTime || 'N/A'} minutes
- Fuel Efficiency: ${metrics.fuelEfficiency || 'N/A'} MPG
- Cost per Mile: ${metrics.costPerMile || 'N/A'} $
- Profit Margin: ${metrics.profitMargin || 'N/A'}%
- On-time Delivery Rate: ${metrics.onTimeRate || 'N/A'}%

Business Context:
${JSON.stringify(context, null, 2)}

Please provide:
1. Key performance trends and patterns
2. Top 3 areas for improvement
3. Cost optimization opportunities
4. Growth potential assessment
5. Risk factors and mitigation strategies
`;
  }

  /**
   * Build prompt for alert analysis
   * @private
   */
  _buildAlertAnalysisPrompt(alert, contextData) {
    return `
Analyze the following operational alert:

Alert Details:
- Type: ${alert.type || 'N/A'}
- Severity: ${alert.severity || 'N/A'}
- Job ID: ${alert.jobId || 'N/A'}
- Message: ${alert.message || 'N/A'}
- Timestamp: ${alert.timestamp || 'N/A'}

System Context:
${JSON.stringify(contextData, null, 2)}

Please provide:
1. Root cause analysis (most likely cause)
2. Impact assessment (high/medium/low)
3. Immediate actions required
4. Preventive measures
5. Follow-up monitoring recommendations
`;
  }

  /**
   * Parse job forecast response
   * @private
   */
  _parseForecastResponse(response) {
    // Simple parsing - in production, you might want more sophisticated parsing
    const sections = response.split('\n').filter(line => line.trim());
    
    return {
      predictions: sections.filter(s => s.includes('Risk') || s.includes('Predicted')),
      recommendations: sections.filter(s => s.includes('recommend') || s.includes('action')),
      confidence: 'medium', // Could be enhanced with confidence scoring
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Parse route optimization response
   * @private
   */
  _parseOptimizationResponse(response) {
    const lines = response.split('\n').filter(line => line.trim());
    
    return {
      efficiencyScore: this._extractScore(lines, 'score'),
      recommendations: lines.filter(s => s.toLowerCase().includes('recommend')),
      savings: this._extractSavings(lines),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Parse business insights response
   * @private
   */
  _parseBusinessInsightsResponse(response) {
    const sections = response.split('\n').filter(s => s.trim());
    
    return {
      trends: sections.filter(s => s.toLowerCase().includes('trend') || s.toLowerCase().includes('pattern')),
      opportunities: sections.filter(s => s.toLowerCase().includes('opportunity') || s.toLowerCase().includes('improvement')),
      risks: sections.filter(s => s.toLowerCase().includes('risk') || s.toLowerCase().includes('factor')),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Parse alert analysis response
   * @private
   */
  _parseAlertAnalysisResponse(response) {
    const lines = response.split('\n').filter(line => line.trim());
    
    return {
      rootCause: this._extractSection(lines, 'root cause'),
      impact: this._extractSection(lines, 'impact'),
      actions: lines.filter(s => s.toLowerCase().includes('action') || s.toLowerCase().includes('immediate')),
      preventive: lines.filter(s => s.toLowerCase().includes('prevent') || s.toLowerCase().includes('mitigation')),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Helper method to extract score from text
   * @private
   */
  _extractScore(lines, keyword) {
    const scoreLine = lines.find(s => s.toLowerCase().includes(keyword));
    const match = scoreLine ? scoreLine.match(/\d+/) : null;
    return match ? parseInt(match[0]) : 50;
  }

  /**
   * Helper method to extract savings information
   * @private
   */
  _extractSavings(lines) {
    return lines.filter(s => s.toLowerCase().includes('saving') || s.toLowerCase().includes('efficiency'));
  }

  /**
   * Helper method to extract specific sections
   * @private
   */
  _extractSection(lines, keyword) {
    return lines.find(s => s.toLowerCase().includes(keyword)) || '';
  }

  /**
   * Test the OpenRouter API connection
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    if (!this.isEnabled()) {
      return { success: false, error: 'OpenRouter not configured' };
    }

    try {
      const response = await this._callModel('Hello, this is a connection test. Please respond with "Connection successful."', {
        max_tokens: 50,
        temperature: 0
      });

      return {
        success: true,
        message: response,
        timestamp: new Date().toISOString(),
        model: this.model
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
module.exports = new OpenRouterService();
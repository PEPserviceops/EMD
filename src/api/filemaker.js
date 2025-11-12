/**
 * FileMaker Data API Integration Module
 * Handles authentication, token management, and data queries
 */

const axios = require('axios');

class FileMakerAPI {
  constructor(config) {
    this.host = config.host || process.env.FILEMAKER_HOST;
    this.database = config.database || process.env.FILEMAKER_DATABASE;
    this.layout = config.layout || process.env.FILEMAKER_LAYOUT || 'jobs_api';
    this.username = config.username || process.env.FILEMAKER_USER;
    this.password = config.password || process.env.FILEMAKER_PASSWORD;
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Get authentication token from FileMaker
   * @returns {Promise<string>} Authentication token
   */
  async getToken() {
    // Return existing token if still valid
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const url = `https://${this.host}/fmi/data/vLatest/databases/${this.database}/sessions`;
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

      const response = await axios.post(url, {}, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'User-Agent': 'FileMakerDataAPI/1.0',
          'Origin': 'MODD',
          'Referer': 'https://modd.mainspringhost.com/'
        }
      });

      if (response.data && response.data.response && response.data.response.token) {
        this.token = response.data.response.token;
        // Token expires in 15 minutes, refresh after 14 minutes
        this.tokenExpiry = Date.now() + (14 * 60 * 1000);
        return this.token;
      }

      throw new Error('Failed to retrieve token from FileMaker');
    } catch (error) {
      console.error('FileMaker authentication error:', error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Close FileMaker session
   */
  async closeSession() {
    if (!this.token) return;

    try {
      const url = `https://${this.host}/fmi/data/vLatest/databases/${this.database}/sessions/${this.token}`;
      await axios.delete(url);
      this.token = null;
      this.tokenExpiry = null;
    } catch (error) {
      console.error('Error closing FileMaker session:', error.message);
    }
  }

  /**
   * Find a specific job by ID
   * @param {string} jobId - Job ID to search for
   * @returns {Promise<Object>} Job data
   */
  async findJob(jobId) {
    const token = await this.getToken();

    try {
      const url = `https://${this.host}/fmi/data/vLatest/databases/${this.database}/layouts/${this.layout}/_find`;
      
      const response = await axios.post(url, {
        query: [{
          'job_id': jobId
        }]
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.response && response.data.response.data) {
        return response.data.response.data[0];
      }

      return null;
    } catch (error) {
      console.error(`Error finding job ${jobId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all active jobs with enhanced filtering
   * @param {Object} options - Query options with date filtering
   * @returns {Promise<Array>} Array of job records
   */
  async getActiveJobs(options = {}) {
    const token = await this.getToken();

    try {
      // Default to recent jobs (last 30 days) to avoid historical data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const startDate = options.startDate || thirtyDaysAgo.toLocaleDateString('en-US');
      const endDate = options.endDate || new Date().toLocaleDateString('en-US');

      console.log(`[FileMaker] Fetching jobs from ${startDate} to ${endDate}`);

      // Filter for specific job types only
      const allowedJobTypes = ['Delivery', 'Pickup', 'Move', 'Recover', 'Drop', 'Shuttle'];

      // Use find query with date range and job type filtering
      const findQuery = {
        query: [{
          'job_date': `${startDate}...${endDate}`,
          'job_type': allowedJobTypes.join('...') // FileMaker OR syntax
        }],
        sort: [{
          'job_date': {
            'fieldName': 'job_date',
            'sortOrder': 'descend'
          }
        }],
        limit: options.limit || 200, // Increased default limit
        offset: options.offset || 1
      };

      const url = `https://${this.host}/fmi/data/vLatest/databases/${this.database}/layouts/${this.layout}/_find`;
      
      const response = await axios.post(url, findQuery, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.response && response.data.response.data) {
        const jobs = response.data.response.data;
        console.log(`[FileMaker] Retrieved ${jobs.length} jobs from date range query`);
        return jobs;
      }

      // Fallback to regular record query if find query fails
      console.log('[FileMaker] Fallback to regular record query');
      return await this._getRecordsFallback(token, options);
    } catch (error) {
      console.error('Error fetching active jobs with date filter:', error.message);
      // Try fallback without date filtering
      try {
        console.log('[FileMaker] Attempting fallback query...');
        return await this._getRecordsFallback(token, options);
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError.message);
        throw error;
      }
    }
  }

  /**
   * Fallback method for getting records without date filtering
   * @private
   */
  async _getRecordsFallback(token, options = {}) {
    const url = `https://${this.host}/fmi/data/vLatest/databases/${this.database}/layouts/${this.layout}/records`;

    const params = {
      _limit: options.limit || 200,
      _offset: options.offset || 1
    };

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params
    });

    if (response.data && response.data.response && response.data.response.data) {
      let jobs = response.data.response.data;

      // Filter for allowed job types
      const allowedJobTypes = ['Delivery', 'Pickup', 'Move', 'Recover', 'Drop', 'Shuttle'];

      // Filter out DELETED jobs, apply job type filtering, and client-side date filtering
      jobs = jobs.filter(job => {
        const status = job.fieldData?.job_status;
        const jobType = job.fieldData?.job_type;
        const isNotDeleted = status && status !== 'DELETED' && status !== '';
        const isAllowedType = allowedJobTypes.includes(jobType);

        // Apply date filtering if no server-side filtering
        let dateFilter = true;
        if (options.startDate && job.fieldData?.job_date) {
          const jobDate = new Date(job.fieldData.job_date);
          const startDate = new Date(options.startDate);
          dateFilter = jobDate >= startDate;
        }

        return isNotDeleted && isAllowedType && dateFilter;
      });

      // Sort by job_date desc (newest first)
      jobs.sort((a, b) => {
        const dateA = new Date(a.fieldData?.job_date || 0);
        const dateB = new Date(b.fieldData?.job_date || 0);
        return dateB - dateA;
      });

      console.log(`[FileMaker] Fallback: Retrieved ${jobs.length} filtered and sorted jobs`);
      return jobs;
    }

    return [];
  }

  /**
   * Get current/recent jobs specifically
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of recent job records
   */
  async getCurrentJobs(options = {}) {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startDate = options.startDate || yesterday.toLocaleDateString('en-US');
    const endDate = options.endDate || now.toLocaleDateString('en-US');
    
    return await this.getActiveJobs({
      ...options,
      startDate,
      endDate
    });
  }

  /**
   * Find jobs matching specific criteria
   * @param {Array} query - FileMaker query array
   * @returns {Promise<Array>} Matching job records
   */
  async findJobs(query) {
    const token = await this.getToken();

    try {
      const url = `https://${this.host}/fmi/data/vLatest/databases/${this.database}/layouts/${this.layout}/_find`;
      
      const response = await axios.post(url, {
        query: query
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.response && response.data.response.data) {
        return response.data.response.data;
      }

      return [];
    } catch (error) {
      console.error('Error finding jobs:', error.message);
      throw error;
    }
  }

  /**
   * Test FileMaker connection
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      const token = await this.getToken();
      const testJob = await this.findJob('603142');
      
      return {
        success: true,
        token: token ? 'Token acquired' : 'No token',
        testQuery: testJob ? 'Job found' : 'Job not found',
        timestamp: new Date().toISOString()
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

// Quick connectivity test function (from QUICK_START.md)
async function testFileMakerConnection() {
  const api = new FileMakerAPI({
    host: 'modd.mainspringhost.com',
    database: 'PEP2_1',
    username: 'trevor_api',
    password: 'XcScS2yRoTtMo7'
  });

  try {
    const result = await api.testConnection();
    console.log('Connection test result:', result);
    await api.closeSession();
    return result;
  } catch (error) {
    console.error('Connection test failed:', error);
    throw error;
  }
}

module.exports = {
  FileMakerAPI,
  testFileMakerConnection
};

/**
 * EMD Polling Service - Standalone Server
 * 
 * Continuously polls FileMaker and syncs data to Supabase
 * Designed to run on your GoDaddy server at api.ziklag.shop
 * 
 * This solves the Vercel serverless limitation by running as a persistent service
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Polling state
let isPolling = false;
let pollInterval = null;
let pollCount = 0;
let stats = {
  totalPolls: 0,
  successfulPolls: 0,
  failedPolls: 0,
  lastPollTime: null,
  lastError: null
};

// FileMaker API Class
class FileMakerAPI {
  constructor() {
    this.host = process.env.FILEMAKER_HOST;
    this.database = process.env.FILEMAKER_DATABASE;
    this.layout = process.env.FILEMAKER_LAYOUT || 'jobs_api';
    this.username = process.env.FILEMAKER_USER;
    this.password = process.env.FILEMAKER_PASSWORD;
    this.token = null;
    this.tokenExpiry = null;
  }

  async getToken() {
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const url = `https://${this.host}/fmi/data/vLatest/databases/${this.database}/sessions`;
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

      const response = await axios.post(url, {}, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.response?.token) {
        this.token = response.data.response.token;
        this.tokenExpiry = Date.now() + (14 * 60 * 1000);
        return this.token;
      }

      throw new Error('Failed to retrieve token');
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async getActiveJobs() {
    const token = await this.getToken();
    const url = `https://${this.host}/fmi/data/vLatest/databases/${this.database}/layouts/${this.layout}/records`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          _limit: 200,
          _offset: 1
        }
      });

      if (response.data?.response?.data) {
        let jobs = response.data.response.data;
        
        // Filter out DELETED jobs
        jobs = jobs.filter(job => {
          const status = job.fieldData?.job_status;
          return status && status !== 'DELETED' && status !== '';
        });

        // Sort by job_date desc
        jobs.sort((a, b) => {
          const dateA = new Date(a.fieldData?.job_date || 0);
          const dateB = new Date(b.fieldData?.job_date || 0);
          return dateB - dateA;
        });

        return jobs;
      }

      return [];
    } catch (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }
  }

  async closeSession() {
    if (!this.token) return;
    
    try {
      const url = `https://${this.host}/fmi/data/vLatest/databases/${this.database}/sessions/${this.token}`;
      await axios.delete(url);
      this.token = null;
      this.tokenExpiry = null;
    } catch (error) {
      console.error('Error closing session:', error.message);
    }
  }
}

const fileMakerAPI = new FileMakerAPI();

// Store job snapshots in Supabase
async function storeJobSnapshots(jobs) {
  try {
    const snapshots = jobs.map(job => ({
      job_id: job.fieldData?._kp_job_id || '',
      record_id: job.recordId || '',
      mod_id: job.modId || '',
      job_date: job.fieldData?.job_date || null,
      job_status: job.fieldData?.job_status || '',
      job_type: job.fieldData?.job_type || '',
      truck_id: job.fieldData?._kf_trucks_id || null,
      lead_id: job.fieldData?._kf_lead_id || null,
      address: job.fieldData?.address_C1 || null,
      raw_data: job,
      snapshot_timestamp: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('jobs_history')
      .insert(snapshots);

    if (error) throw error;

    return snapshots.length;
  } catch (error) {
    console.error('Supabase storage error:', error.message);
    throw error;
  }
}

// Main polling function
async function poll() {
  const startTime = Date.now();
  pollCount++;
  stats.totalPolls++;

  try {
    console.log(`[Poll #${pollCount}] Starting at ${new Date().toISOString()}`);

    const jobs = await fileMakerAPI.getActiveJobs();
    console.log(`[Poll #${pollCount}] Retrieved ${jobs.length} active jobs`);

    if (jobs.length > 0) {
      const stored = await storeJobSnapshots(jobs);
      console.log(`[Poll #${pollCount}] Stored ${stored} job snapshots in Supabase`);
    }

    const responseTime = Date.now() - startTime;
    stats.successfulPolls++;
    stats.lastPollTime = new Date().toISOString();

    console.log(`[Poll #${pollCount}] Complete in ${responseTime}ms`);

    return { success: true, jobs: jobs.length, time: responseTime };
  } catch (error) {
    stats.failedPolls++;
    stats.lastError = error.message;
    console.error(`[Poll #${pollCount}] Failed:`, error.message);
    return { success: false, error: error.message };
  }
}

// Start polling
async function startPolling() {
  if (isPolling) {
    console.log('Polling already running');
    return;
  }

  const interval = parseInt(process.env.POLLING_INTERVAL) || 30000;
  console.log(`Starting polling service (interval: ${interval}ms)`);
  
  isPolling = true;
  
  // Run first poll immediately
  await poll();
  
  // Set up interval
  pollInterval = setInterval(async () => {
    await poll();
  }, interval);
}

// Stop polling
function stopPolling() {
  if (!isPolling) return;
  
  console.log('Stopping polling service');
  isPolling = false;
  
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

// API Endpoints
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'EMD Polling Service',
    isPolling: isPolling,
    stats: stats,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Get stats
app.get('/stats', (req, res) => {
  res.json({
    success: true,
    isPolling: isPolling, 
    pollCount: pollCount,
    stats: stats
  });
});

// Manual trigger
app.post('/poll', async (req, res) => {
  try {
    const result = await poll();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start/stop controls
app.post('/start', async (req, res) => {
  await startPolling();
  res.json({ success: true, message: 'Polling started' });
});

app.post('/stop', (req, res) => {
  stopPolling();
  res.json({ success: true, message: 'Polling stopped' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'EMD Polling Service',
    version: '1.0.0',
    status: isPolling ? 'running' : 'stopped',
    endpoints: {
      health: 'GET /health',
      stats: 'GET /stats',
      poll: 'POST /poll',
      start: 'POST /start',
      stop: 'POST /stop'
    }
  });
});

// Start server
app.listen(PORT, async () => {
  console.log('='.repeat(70));
  console.log(`EMD Polling Service running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  console.log('='.repeat(70));
  
  // Auto-start polling
  if (process.env.POLLING_AUTO_START !== 'false') {
    console.log('Auto-starting polling...');
    await startPolling();
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down polling service...');
  stopPolling();
  await fileMakerAPI.closeSession();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down polling service...');
  stopPolling();
  await fileMakerAPI.closeSession();
  process.exit(0);
});
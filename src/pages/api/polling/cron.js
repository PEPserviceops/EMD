/**
 * Polling Cron Job Handler
 * 
 * This endpoint is triggered by Vercel Cron to poll FileMaker data
 * Replaces the continuous polling that works in development but not on serverless
 * 
 * Vercel calls this endpoint every 1 minute (configured in vercel.json)
 * 
 * @module pages/api/polling/cron
 */

const { FileMakerAPI } = require('../../../api/filemaker');
const { AlertEngine } = require('../../../api/alerts');
const supabaseService = require('../../../services/SupabaseService');

export default async function handler(req, res) {
  // Verify this is a cron request (Vercel adds this header)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For security, only allow Vercel cron jobs or requests with proper auth
    if (process.env.VERCEL !== '1' && process.env.NODE_ENV === 'production') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'This endpoint is only accessible via Vercel Cron'
      });
    }
  }

  const startTime = Date.now();

  try {
    console.log('[Cron] Starting FileMaker poll at', new Date().toISOString());

    // Initialize FileMaker API
    const fileMakerAPI = new FileMakerAPI({
      host: process.env.FILEMAKER_HOST,
      database: process.env.FILEMAKER_DATABASE,
      layout: process.env.FILEMAKER_LAYOUT,
      username: process.env.FILEMAKER_USER,
      password: process.env.FILEMAKER_PASSWORD
    });

    // Initialize Alert Engine
    const alertEngine = new AlertEngine();

    // Fetch jobs from FileMaker
    const jobs = await fileMakerAPI.getActiveJobs({ limit: 100 });

    // Filter out DELETED jobs
    const activeJobs = jobs.filter(job => {
      const status = job.fieldData?.job_status;
      return status && status !== 'DELETED' && status !== '';
    });

    console.log(`[Cron] Retrieved ${activeJobs.length} active jobs (${jobs.length} total)`);

    // Store job snapshots in Supabase
    if (supabaseService.isEnabled() && activeJobs.length > 0) {
      try {
        const storedJobs = await supabaseService.storeJobSnapshotBatch(activeJobs);
        console.log(`[Cron] Stored ${storedJobs.length} job snapshots in Supabase`);
      } catch (error) {
        console.error('[Cron] Failed to store job snapshots:', error.message);
      }
    }

    // Evaluate jobs against alert rules
    const alertResult = alertEngine.evaluateJobs(activeJobs);

    // Store system metrics
    if (supabaseService.isEnabled()) {
      try {
        const responseTime = Date.now() - startTime;
        await supabaseService.storeSystemMetric({
          type: 'polling',
          name: 'cron_poll_complete',
          value: responseTime,
          unit: 'milliseconds',
          component: 'cron-polling',
          metadata: {
            jobs_processed: activeJobs.length,
            alerts_generated: alertResult.new,
            alerts_resolved: alertResult.resolved,
            total_active_alerts: alertResult.total,
            execution_mode: 'serverless-cron'
          }
        });
      } catch (error) {
        console.error('[Cron] Failed to store system metrics:', error.message);
      }
    }

    // Close FileMaker session
    await fileMakerAPI.closeSession();

    const responseTime = Date.now() - startTime;
    console.log(`[Cron] Complete in ${responseTime}ms - ${alertResult.total} active alerts (${alertResult.new} new, ${alertResult.resolved} resolved)`);

    // Return success response
    return res.status(200).json({
      success: true,
      executionTime: responseTime,
      jobsProcessed: activeJobs.length,
      alerts: {
        total: alertResult.total,
        new: alertResult.new,
        resolved: alertResult.resolved
      },
      timestamp: new Date().toISOString(),
      mode: 'serverless-cron'
    });

  } catch (error) {
    console.error('[Cron] Polling error:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Disable body parsing (not needed for cron)
export const config = {
  api: {
    bodyParser: false,
  },
};
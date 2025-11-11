/**
 * Scheduled Jobs API
 * 
 * Fetches scheduled jobs from Supabase for route optimization
 * Filters by date and job status, groups by driver/truck
 * 
 * GET /api/jobs/scheduled?date=YYYY-MM-DD
 * 
 * @module pages/api/jobs/scheduled
 */

const supabaseService = require('../../../services/SupabaseService');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
  }

  try {
    // Get query parameters first
    const { date, driver, truck, groupBy = 'driver' } = req.query;
    
    // Default to today if no date provided
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Check if Supabase is enabled
    if (!supabaseService.isEnabled()) {
      return res.status(200).json({
        success: true,
        date: targetDate,
        totalJobs: 0,
        groupedBy: groupBy,
        groups: {},
        jobs: [],
        metadata: {
          drivers: [],
          trucks: [],
          statuses: []
        },
        fallback: true,
        message: 'Historical job data is not available - Supabase service disabled',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[Scheduled Jobs API] Fetching jobs for date: ${targetDate}`);

    // Query Supabase for jobs matching criteria
    let query = supabaseService.supabase
      .from('jobs_history')
      .select('*')
      .eq('job_date', targetDate)
      .in('job_status', ['Scheduled', 'Re-scheduled', 'Entered'])
      .order('snapshot_timestamp', { ascending: false });

    // Apply filters if provided
    if (driver) {
      query = query.eq('lead_id', driver);
    }

    if (truck) {
      query = query.eq('truck_id', truck);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(`Failed to fetch scheduled jobs: ${error.message}`);
    }

    // Remove duplicates (keep most recent snapshot per job)
    const uniqueJobs = [];
    const seenJobIds = new Set();

    for (const job of jobs) {
      if (!seenJobIds.has(job.job_id)) {
        seenJobIds.add(job.job_id);
        uniqueJobs.push(job);
      }
    }

    console.log(`[Scheduled Jobs API] Found ${uniqueJobs.length} unique scheduled jobs`);

    // Group jobs by driver or truck
    const grouped = groupBy === 'driver' 
      ? groupJobsByDriver(uniqueJobs)
      : groupJobsByTruck(uniqueJobs);

    // Format response
    return res.status(200).json({
      success: true,
      date: targetDate,
      totalJobs: uniqueJobs.length,
      groupedBy: groupBy,
      groups: grouped,
      jobs: uniqueJobs,
      metadata: {
        drivers: Array.from(new Set(uniqueJobs.map(j => j.lead_id).filter(Boolean))),
        trucks: Array.from(new Set(uniqueJobs.map(j => j.truck_id).filter(Boolean))),
        statuses: Array.from(new Set(uniqueJobs.map(j => j.job_status)))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scheduled jobs API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Group jobs by driver/lead
 */
function groupJobsByDriver(jobs) {
  const groups = {};

  for (const job of jobs) {
    const driver = job.lead_id || 'Unassigned';
    
    if (!groups[driver]) {
      groups[driver] = {
        driver: driver,
        truck: job.truck_id || null,
        jobs: [],
        totalJobs: 0,
        totalMiles: 0,
        locations: []
      };
    }

    groups[driver].jobs.push({
      jobId: job.job_id,
      jobType: job.job_type,
      status: job.job_status,
      address: job.address,
      city: job.raw_data?.fieldData?._kf_city_id || null,
      state: job.raw_data?.fieldData?._kf_state_id || null,
      zip: job.raw_data?.fieldData?.zip_C1 || null,
      miles: parseFloat(job.raw_data?.fieldData?.oneway_miles) || 0,
      weight: job.raw_data?.fieldData?._kf_product_weight_id || null,
      callAhead: job.raw_data?.fieldData?.notes_call_ahead || null,
      coordinates: {
        lat: job.coordinates_lat,
        lng: job.coordinates_lng
      }
    });

    groups[driver].totalJobs++;
    groups[driver].totalMiles += parseFloat(job.raw_data?.fieldData?.oneway_miles) || 0;
    
    if (job.address) {
      groups[driver].locations.push(job.address);
    }
  }

  return groups;
}

/**
 * Group jobs by truck
 */
function groupJobsByTruck(jobs) {
  const groups = {};

  for (const job of jobs) {
    const truck = job.truck_id || 'Unassigned';
    
    if (!groups[truck]) {
      groups[truck] = {
        truck: truck,
        driver: job.lead_id || null,
        jobs: [],
        totalJobs: 0,
        totalMiles: 0,
        locations: []
      };
    }

    groups[truck].jobs.push({
      jobId: job.job_id,
      jobType: job.job_type,
      status: job.job_status,
      address: job.address,
      city: job.raw_data?.fieldData?._kf_city_id || null,
      state: job.raw_data?.fieldData?._kf_state_id || null,
      zip: job.raw_data?.fieldData?.zip_C1 || null,
      miles: parseFloat(job.raw_data?.fieldData?.oneway_miles) || 0,
      weight: job.raw_data?.fieldData?._kf_product_weight_id || null,
      callAhead: job.raw_data?.fieldData?.notes_call_ahead || null,
      coordinates: {
        lat: job.coordinates_lat,
        lng: job.coordinates_lng
      }
    });

    groups[truck].totalJobs++;
    groups[truck].totalMiles += parseFloat(job.raw_data?.fieldData?.oneway_miles) || 0;
    
    if (job.address) {
      groups[truck].locations.push(job.address);
    }
  }

  return groups;
}
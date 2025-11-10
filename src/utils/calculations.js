/**
 * Calculation Utilities
 * Business logic calculations for job metrics and analytics
 */

const { parseISO, differenceInMinutes, differenceInHours, format } = require('date-fns');

/**
 * Calculate job duration in minutes
 * @param {string} startTime - ISO timestamp
 * @param {string} endTime - ISO timestamp (defaults to now)
 * @returns {number} Duration in minutes
 */
function calculateJobDuration(startTime, endTime = null) {
  try {
    const start = parseISO(startTime);
    const end = endTime ? parseISO(endTime) : new Date();
    return differenceInMinutes(end, start);
  } catch (error) {
    console.error('Error calculating job duration:', error);
    return 0;
  }
}

/**
 * Calculate time until due date
 * @param {string} dueDate - ISO timestamp
 * @returns {number} Minutes until due (negative if overdue)
 */
function calculateTimeUntilDue(dueDate) {
  try {
    const due = parseISO(dueDate);
    const now = new Date();
    return differenceInMinutes(due, now);
  } catch (error) {
    console.error('Error calculating time until due:', error);
    return 0;
  }
}

/**
 * Calculate efficiency score for a job
 * @param {Object} job - Job record
 * @returns {number} Efficiency score (0-100)
 */
function calculateEfficiencyScore(job) {
  const fieldData = job.fieldData || {};
  let score = 100;

  // Deduct points for delays
  if (fieldData.due_date && fieldData.completion_time) {
    const minutesLate = calculateTimeUntilDue(fieldData.due_date);
    if (minutesLate < 0) {
      score -= Math.min(50, Math.abs(minutesLate) / 10);
    }
  }

  // Deduct points for long duration
  if (fieldData.start_time && fieldData.completion_time) {
    const duration = calculateJobDuration(fieldData.start_time, fieldData.completion_time);
    const expectedDuration = fieldData.estimated_duration || 120; // 2 hours default
    if (duration > expectedDuration) {
      score -= Math.min(30, ((duration - expectedDuration) / expectedDuration) * 100);
    }
  }

  // Deduct points for missing data
  if (!fieldData.truck_id) score -= 10;
  if (!fieldData.driver_id) score -= 10;

  return Math.max(0, Math.round(score));
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in miles
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate estimated arrival time
 * @param {number} distance - Distance in miles
 * @param {number} averageSpeed - Average speed in mph (default 45)
 * @returns {Date} Estimated arrival time
 */
function calculateEstimatedArrival(distance, averageSpeed = 45) {
  const hours = distance / averageSpeed;
  const minutes = hours * 60;
  const arrival = new Date();
  arrival.setMinutes(arrival.getMinutes() + minutes);
  return arrival;
}

/**
 * Calculate job profitability metrics
 * @param {Object} job - Job record
 * @returns {Object} Profitability metrics
 */
function calculateProfitability(job) {
  const fieldData = job.fieldData || {};
  const revenue = parseFloat(fieldData.revenue) || 0;
  const cost = parseFloat(fieldData.cost) || 0;
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    revenue,
    cost,
    profit,
    margin: Math.round(margin * 10) / 10,
    isProfitable: profit > 0
  };
}

/**
 * Calculate truck utilization rate
 * @param {Array} jobs - Array of jobs for a truck
 * @param {number} totalHours - Total available hours
 * @returns {number} Utilization percentage
 */
function calculateTruckUtilization(jobs, totalHours = 8) {
  let totalJobHours = 0;

  for (const job of jobs) {
    const fieldData = job.fieldData || {};
    if (fieldData.start_time && fieldData.completion_time) {
      const duration = calculateJobDuration(fieldData.start_time, fieldData.completion_time);
      totalJobHours += duration / 60; // Convert to hours
    }
  }

  const utilization = (totalJobHours / totalHours) * 100;
  return Math.min(100, Math.round(utilization));
}

/**
 * Format duration for display
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format timestamp for display
 * @param {string} timestamp - ISO timestamp
 * @param {string} formatStr - Format string (default: 'MMM d, h:mm a')
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp, formatStr = 'MMM d, h:mm a') {
  try {
    const date = parseISO(timestamp);
    return format(date, formatStr);
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Calculate aggregate statistics for jobs
 * @param {Array} jobs - Array of job records
 * @returns {Object} Aggregate statistics
 */
function calculateAggregateStats(jobs) {
  const stats = {
    total: jobs.length,
    completed: 0,
    inProgress: 0,
    scheduled: 0,
    overdue: 0,
    avgDuration: 0,
    totalRevenue: 0,
    totalProfit: 0
  };

  let totalDuration = 0;
  let completedCount = 0;

  for (const job of jobs) {
    const fieldData = job.fieldData || {};
    
    // Count by status
    if (fieldData.status === 'Completed') stats.completed++;
    else if (fieldData.status === 'In Progress') stats.inProgress++;
    else if (fieldData.status === 'Scheduled') stats.scheduled++;

    // Check if overdue
    if (fieldData.due_date && fieldData.status !== 'Completed') {
      const minutesUntilDue = calculateTimeUntilDue(fieldData.due_date);
      if (minutesUntilDue < 0) stats.overdue++;
    }

    // Calculate duration for completed jobs
    if (fieldData.start_time && fieldData.completion_time) {
      const duration = calculateJobDuration(fieldData.start_time, fieldData.completion_time);
      totalDuration += duration;
      completedCount++;
    }

    // Sum revenue and profit
    const profitability = calculateProfitability(job);
    stats.totalRevenue += profitability.revenue;
    stats.totalProfit += profitability.profit;
  }

  // Calculate averages
  if (completedCount > 0) {
    stats.avgDuration = Math.round(totalDuration / completedCount);
  }

  return stats;
}

module.exports = {
  calculateJobDuration,
  calculateTimeUntilDue,
  calculateEfficiencyScore,
  calculateDistance,
  calculateEstimatedArrival,
  calculateProfitability,
  calculateTruckUtilization,
  formatDuration,
  formatTimestamp,
  calculateAggregateStats
};


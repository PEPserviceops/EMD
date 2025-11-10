/**
 * Validation Utilities
 * Input validation and data integrity checks
 */

const Joi = require('joi');

/**
 * Validate job data structure
 * @param {Object} job - Job record to validate
 * @returns {Object} Validation result
 */
function validateJobData(job) {
  const schema = Joi.object({
    recordId: Joi.string().required(),
    fieldData: Joi.object({
      job_id: Joi.string().required(),
      status: Joi.string().valid('Scheduled', 'In Progress', 'Completed', 'Cancelled').required(),
      due_date: Joi.string().isoDate().allow(null),
      start_time: Joi.string().isoDate().allow(null),
      completion_time: Joi.string().isoDate().allow(null),
      truck_id: Joi.string().allow(null, ''),
      driver_id: Joi.string().allow(null, ''),
      customer_name: Joi.string().allow(null, ''),
      pickup_address: Joi.string().allow(null, ''),
      delivery_address: Joi.string().allow(null, ''),
      revenue: Joi.number().min(0).allow(null),
      cost: Joi.number().min(0).allow(null)
    }).required()
  });

  const { error, value } = schema.validate(job);
  
  return {
    valid: !error,
    error: error ? error.details[0].message : null,
    value
  };
}

/**
 * Validate FileMaker API configuration
 * @param {Object} config - API configuration
 * @returns {Object} Validation result
 */
function validateApiConfig(config) {
  const schema = Joi.object({
    host: Joi.string().hostname().required(),
    database: Joi.string().required(),
    layout: Joi.string().required(),
    username: Joi.string().required(),
    password: Joi.string().required()
  });

  const { error, value } = schema.validate(config);
  
  return {
    valid: !error,
    error: error ? error.details[0].message : null,
    value
  };
}

/**
 * Validate alert rule structure
 * @param {Object} rule - Alert rule to validate
 * @returns {Object} Validation result
 */
function validateAlertRule(rule) {
  const schema = Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').required(),
    evaluate: Joi.function().required(),
    message: Joi.function().required()
  });

  const { error, value } = schema.validate(rule);
  
  return {
    valid: !error,
    error: error ? error.details[0].message : null,
    value
  };
}

/**
 * Validate coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} True if valid
 */
function validateCoordinates(lat, lon) {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Validate date range
 * @param {string} startDate - Start date ISO string
 * @param {string} endDate - End date ISO string
 * @returns {Object} Validation result
 */
function validateDateRange(startDate, endDate) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        valid: false,
        error: 'Invalid date format'
      };
    }

    if (start > end) {
      return {
        valid: false,
        error: 'Start date must be before end date'
      };
    }

    return {
      valid: true,
      error: null
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Sanitize job ID (remove special characters)
 * @param {string} jobId - Job ID to sanitize
 * @returns {string} Sanitized job ID
 */
function sanitizeJobId(jobId) {
  if (typeof jobId !== 'string') return '';
  return jobId.replace(/[^a-zA-Z0-9-_]/g, '');
}

/**
 * Validate and sanitize query parameters
 * @param {Object} params - Query parameters
 * @returns {Object} Sanitized parameters
 */
function sanitizeQueryParams(params) {
  const sanitized = {};

  if (params.limit) {
    const limit = parseInt(params.limit, 10);
    sanitized.limit = isNaN(limit) ? 100 : Math.min(Math.max(1, limit), 1000);
  }

  if (params.offset) {
    const offset = parseInt(params.offset, 10);
    sanitized.offset = isNaN(offset) ? 1 : Math.max(1, offset);
  }

  if (params.status) {
    const validStatuses = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
    sanitized.status = validStatuses.includes(params.status) ? params.status : null;
  }

  if (params.severity) {
    const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    sanitized.severity = validSeverities.includes(params.severity) ? params.severity : null;
  }

  return sanitized;
}

/**
 * Check if job data has required fields for alert evaluation
 * @param {Object} job - Job record
 * @returns {Object} Check result
 */
function checkRequiredFields(job) {
  const missing = [];
  const fieldData = job.fieldData || {};

  if (!fieldData.job_id) missing.push('job_id');
  if (!fieldData.status) missing.push('status');

  return {
    valid: missing.length === 0,
    missing,
    message: missing.length > 0 ? `Missing required fields: ${missing.join(', ')}` : null
  };
}

/**
 * Validate time format (HH:MM or HH:MM:SS)
 * @param {string} time - Time string
 * @returns {boolean} True if valid
 */
function validateTimeFormat(time) {
  if (typeof time !== 'string') return false;
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return timeRegex.test(time);
}

/**
 * Validate phone number (basic US format)
 * @param {string} phone - Phone number
 * @returns {boolean} True if valid
 */
function validatePhoneNumber(phone) {
  if (typeof phone !== 'string') return false;
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate email address
 * @param {string} email - Email address
 * @returns {boolean} True if valid
 */
function validateEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check data integrity for job record
 * @param {Object} job - Job record
 * @returns {Object} Integrity check result
 */
function checkDataIntegrity(job) {
  const issues = [];
  const fieldData = job.fieldData || {};

  // Check status consistency
  if (fieldData.status === 'Completed' && !fieldData.completion_time) {
    issues.push('Job marked as completed but missing completion time');
  }

  if (fieldData.status === 'In Progress' && !fieldData.start_time) {
    issues.push('Job in progress but missing start time');
  }

  // Check time sequence
  if (fieldData.start_time && fieldData.completion_time) {
    const start = new Date(fieldData.start_time);
    const end = new Date(fieldData.completion_time);
    if (start > end) {
      issues.push('Start time is after completion time');
    }
  }

  // Check assignment consistency
  if (fieldData.driver_id && !fieldData.truck_id) {
    issues.push('Driver assigned but no truck assigned');
  }

  // Check revenue/cost
  if (fieldData.revenue && fieldData.cost && fieldData.revenue < fieldData.cost) {
    issues.push('Revenue is less than cost (unprofitable job)');
  }

  return {
    valid: issues.length === 0,
    issues,
    severity: issues.length > 0 ? 'WARNING' : 'OK'
  };
}

/**
 * Validate batch of jobs
 * @param {Array} jobs - Array of job records
 * @returns {Object} Batch validation result
 */
function validateJobBatch(jobs) {
  if (!Array.isArray(jobs)) {
    return {
      valid: false,
      error: 'Jobs must be an array',
      validCount: 0,
      invalidCount: 0
    };
  }

  let validCount = 0;
  let invalidCount = 0;
  const errors = [];

  for (let i = 0; i < jobs.length; i++) {
    const result = validateJobData(jobs[i]);
    if (result.valid) {
      validCount++;
    } else {
      invalidCount++;
      errors.push({
        index: i,
        jobId: jobs[i]?.fieldData?.job_id || 'unknown',
        error: result.error
      });
    }
  }

  return {
    valid: invalidCount === 0,
    validCount,
    invalidCount,
    errors: errors.slice(0, 10), // Limit to first 10 errors
    totalErrors: errors.length
  };
}

module.exports = {
  validateJobData,
  validateApiConfig,
  validateAlertRule,
  validateCoordinates,
  validateDateRange,
  sanitizeJobId,
  sanitizeQueryParams,
  checkRequiredFields,
  validateTimeFormat,
  validatePhoneNumber,
  validateEmail,
  checkDataIntegrity,
  validateJobBatch
};


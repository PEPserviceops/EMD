/**
 * Change Detection Service
 * Detects changes in job data between polling cycles
 */

class ChangeDetectionService {
  constructor(cacheService) {
    this.cache = cacheService;
    this.changeListeners = [];
  }

  /**
   * Compare jobs and detect changes
   * @param {Array} newJobs - New jobs from FileMaker
   * @returns {Object} Change summary
   */
  detectChanges(newJobs) {
    const changes = {
      new: [],
      updated: [],
      deleted: [],
      unchanged: [],
      summary: {
        newCount: 0,
        updatedCount: 0,
        deletedCount: 0,
        unchangedCount: 0,
        totalChanges: 0
      }
    };

    // Track which jobs we've seen in this cycle
    const seenJobIds = new Set();

    // Check each new job
    for (const job of newJobs) {
      const jobId = job.fieldData._kp_job_id?.toString();
      if (!jobId) continue;

      seenJobIds.add(jobId);

      const cachedJob = this.cache.get(jobId);

      if (!cachedJob) {
        // New job
        changes.new.push({
          jobId,
          job,
          changeType: 'new',
          timestamp: new Date()
        });
        changes.summary.newCount++;
        
        // Add to cache
        this.cache.set(jobId, job);
        this.cache.addToHistory(jobId, job.recordId, job, 'new');
        
      } else {
        // Check for updates
        const fieldChanges = this.compareJobs(cachedJob, job);
        
        if (fieldChanges.length > 0) {
          changes.updated.push({
            jobId,
            job,
            previousJob: cachedJob,
            fieldChanges,
            changeType: 'updated',
            timestamp: new Date()
          });
          changes.summary.updatedCount++;
          
          // Update cache
          this.cache.set(jobId, job);
          this.cache.addToHistory(jobId, job.recordId, job, 'updated');
          
        } else {
          changes.unchanged.push({
            jobId,
            job,
            changeType: 'unchanged'
          });
          changes.summary.unchangedCount++;
        }
      }
    }

    // Check for deleted jobs (in cache but not in new data)
    const cachedJobIds = this.cache.keys();
    for (const jobId of cachedJobIds) {
      if (!seenJobIds.has(jobId)) {
        const cachedJob = this.cache.get(jobId);
        changes.deleted.push({
          jobId,
          job: cachedJob,
          changeType: 'deleted',
          timestamp: new Date()
        });
        changes.summary.deletedCount++;
        
        // Remove from cache
        this.cache.delete(jobId);
        this.cache.addToHistory(jobId, cachedJob?.recordId, cachedJob, 'deleted');
      }
    }

    changes.summary.totalChanges = 
      changes.summary.newCount + 
      changes.summary.updatedCount + 
      changes.summary.deletedCount;

    // Notify listeners
    if (changes.summary.totalChanges > 0) {
      this.notifyListeners(changes);
    }

    return changes;
  }

  /**
   * Compare two job objects and return field-level changes
   * @param {Object} oldJob - Previous job data
   * @param {Object} newJob - New job data
   * @returns {Array} Array of field changes
   */
  compareJobs(oldJob, newJob) {
    const changes = [];
    const oldFields = oldJob.fieldData || {};
    const newFields = newJob.fieldData || {};

    // Critical fields to monitor
    const criticalFields = [
      'job_status',
      'job_status_driver',
      'time_arival',
      'time_complete',
      '_kf_trucks_id',
      '_kf_driver_id',
      '_kf_route_id',
      'job_date',
      'job_type'
    ];

    // Check all fields in new data
    for (const [field, newValue] of Object.entries(newFields)) {
      const oldValue = oldFields[field];
      
      if (this.hasChanged(oldValue, newValue)) {
        changes.push({
          field,
          oldValue,
          newValue,
          isCritical: criticalFields.includes(field),
          timestamp: new Date()
        });
      }
    }

    // Check for removed fields
    for (const field of Object.keys(oldFields)) {
      if (!(field in newFields)) {
        changes.push({
          field,
          oldValue: oldFields[field],
          newValue: null,
          isCritical: criticalFields.includes(field),
          changeType: 'removed',
          timestamp: new Date()
        });
      }
    }

    return changes;
  }

  /**
   * Check if a value has changed
   * @param {*} oldValue - Previous value
   * @param {*} newValue - New value
   * @returns {boolean} True if changed
   */
  hasChanged(oldValue, newValue) {
    // Handle null/undefined
    if (oldValue === null || oldValue === undefined) {
      return newValue !== null && newValue !== undefined && newValue !== '';
    }
    if (newValue === null || newValue === undefined) {
      return oldValue !== null && oldValue !== undefined && oldValue !== '';
    }

    // Handle empty strings
    if (oldValue === '' && newValue === '') return false;
    if (oldValue === '' || newValue === '') return true;

    // Convert to strings for comparison
    return oldValue.toString() !== newValue.toString();
  }

  /**
   * Get change summary for a specific job
   * @param {string} jobId - Job ID
   * @param {number} limit - Number of history entries to return
   * @returns {Array} Change history
   */
  getJobChangeHistory(jobId, limit = 10) {
    return this.cache.getHistory(jobId, limit);
  }

  /**
   * Register a change listener
   * @param {Function} callback - Callback function to call on changes
   */
  onChanges(callback) {
    this.changeListeners.push(callback);
  }

  /**
   * Notify all listeners of changes
   * @param {Object} changes - Change data
   */
  notifyListeners(changes) {
    for (const listener of this.changeListeners) {
      try {
        listener(changes);
      } catch (error) {
        console.error('Error in change listener:', error);
      }
    }
  }

  /**
   * Get change statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size(),
      listeners: this.changeListeners.length,
      cacheStats: this.cache.getStats()
    };
  }

  /**
   * Analyze change patterns
   * @param {Array} changes - Array of change objects
   * @returns {Object} Analysis
   */
  analyzeChanges(changes) {
    const analysis = {
      mostChangedFields: {},
      criticalChanges: 0,
      statusChanges: 0,
      assignmentChanges: 0,
      timeChanges: 0
    };

    // Analyze updated jobs
    for (const change of changes.updated) {
      for (const fieldChange of change.fieldChanges) {
        // Count field changes
        analysis.mostChangedFields[fieldChange.field] = 
          (analysis.mostChangedFields[fieldChange.field] || 0) + 1;

        // Count critical changes
        if (fieldChange.isCritical) {
          analysis.criticalChanges++;
        }

        // Categorize changes
        if (fieldChange.field === 'job_status' || fieldChange.field === 'job_status_driver') {
          analysis.statusChanges++;
        }
        if (fieldChange.field === '_kf_trucks_id' || fieldChange.field === '_kf_driver_id') {
          analysis.assignmentChanges++;
        }
        if (fieldChange.field === 'time_arival' || fieldChange.field === 'time_complete') {
          analysis.timeChanges++;
        }
      }
    }

    // Sort most changed fields
    analysis.mostChangedFields = Object.entries(analysis.mostChangedFields)
      .sort((a, b) => b[1] - a[1])
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    return analysis;
  }

  /**
   * Get critical changes only
   * @param {Object} changes - Change data
   * @returns {Array} Critical changes
   */
  getCriticalChanges(changes) {
    const critical = [];

    for (const change of changes.updated) {
      const criticalFieldChanges = change.fieldChanges.filter(fc => fc.isCritical);
      if (criticalFieldChanges.length > 0) {
        critical.push({
          ...change,
          fieldChanges: criticalFieldChanges
        });
      }
    }

    return critical;
  }
}

module.exports = ChangeDetectionService;


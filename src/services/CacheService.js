/**
 * Cache Service
 * In-memory cache with SQLite persistence for job data
 */

const path = require('path');
const fs = require('fs');

// Try to load better-sqlite3, but don't fail if it's not available (e.g., in Vercel)
let Database;
try {
  Database = require('better-sqlite3');
} catch (error) {
  console.warn('⚠️  better-sqlite3 not available. Cache will run in memory-only mode.');
  Database = null;
}

class CacheService {
  constructor(config = {}) {
    this.config = {
      dbPath: config.dbPath || path.join(process.cwd(), 'data', 'cache.db'),
      ttl: config.ttl || 300000, // 5 minutes default TTL
      maxSize: config.maxSize || 1000,
      persistToDisk: config.persistToDisk !== false && Database !== null,
      ...config
    };

    // In-memory cache
    this.cache = new Map();
    this.metadata = new Map();

    // Initialize database
    if (this.config.persistToDisk) {
      this.initDatabase();
    } else if (config.persistToDisk !== false && Database === null) {
      console.warn('⚠️  CacheService: Running in memory-only mode (SQLite not available)');
    }
  }

  /**
   * Initialize SQLite database
   */
  initDatabase() {
    // Ensure data directory exists
    const dataDir = path.dirname(this.config.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Open database
    this.db = new Database(this.config.dbPath);

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        job_id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        data TEXT NOT NULL,
        cached_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS job_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT NOT NULL,
        record_id TEXT NOT NULL,
        data TEXT NOT NULL,
        change_type TEXT NOT NULL,
        changed_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_cached_at ON jobs(cached_at);
      CREATE INDEX IF NOT EXISTS idx_history_job_id ON job_history(job_id);
      CREATE INDEX IF NOT EXISTS idx_history_changed_at ON job_history(changed_at);
    `);

    // Prepare statements
    this.statements = {
      getJob: this.db.prepare('SELECT * FROM jobs WHERE job_id = ?'),
      setJob: this.db.prepare(`
        INSERT OR REPLACE INTO jobs (job_id, record_id, data, cached_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `),
      deleteJob: this.db.prepare('DELETE FROM jobs WHERE job_id = ?'),
      getAllJobs: this.db.prepare('SELECT * FROM jobs ORDER BY updated_at DESC'),
      addHistory: this.db.prepare(`
        INSERT INTO job_history (job_id, record_id, data, change_type, changed_at)
        VALUES (?, ?, ?, ?, ?)
      `),
      getHistory: this.db.prepare(`
        SELECT * FROM job_history 
        WHERE job_id = ? 
        ORDER BY changed_at DESC 
        LIMIT ?
      `),
      cleanOldJobs: this.db.prepare('DELETE FROM jobs WHERE cached_at < ?'),
      cleanOldHistory: this.db.prepare('DELETE FROM job_history WHERE changed_at < ?')
    };

    console.log(`Cache database initialized at ${this.config.dbPath}`);
  }

  /**
   * Set a job in cache
   */
  set(jobId, data) {
    const now = Date.now();
    
    // Store in memory
    this.cache.set(jobId, data);
    this.metadata.set(jobId, {
      cachedAt: now,
      updatedAt: now,
      hits: 0
    });

    // Persist to disk
    if (this.config.persistToDisk && this.db) {
      try {
        this.statements.setJob.run(
          jobId,
          data.recordId || '',
          JSON.stringify(data),
          now,
          now
        );
      } catch (error) {
        console.error('Error persisting to cache:', error);
      }
    }

    // Enforce max size
    if (this.cache.size > this.config.maxSize) {
      this.evictOldest();
    }
  }

  /**
   * Get a job from cache
   */
  get(jobId) {
    // Check memory first
    if (this.cache.has(jobId)) {
      const metadata = this.metadata.get(jobId);
      
      // Check TTL
      if (Date.now() - metadata.cachedAt > this.config.ttl) {
        this.delete(jobId);
        return null;
      }

      // Update hit count
      metadata.hits++;
      
      return this.cache.get(jobId);
    }

    // Try to load from disk
    if (this.config.persistToDisk && this.db) {
      try {
        const row = this.statements.getJob.get(jobId);
        if (row) {
          // Check TTL
          if (Date.now() - row.cached_at > this.config.ttl) {
            this.statements.deleteJob.run(jobId);
            return null;
          }

          const data = JSON.parse(row.data);
          
          // Load into memory
          this.cache.set(jobId, data);
          this.metadata.set(jobId, {
            cachedAt: row.cached_at,
            updatedAt: row.updated_at,
            hits: 1
          });

          return data;
        }
      } catch (error) {
        console.error('Error loading from cache:', error);
      }
    }

    return null;
  }

  /**
   * Check if job exists in cache
   */
  has(jobId) {
    return this.cache.has(jobId) || 
           (this.config.persistToDisk && this.db && this.statements.getJob.get(jobId) !== undefined);
  }

  /**
   * Delete a job from cache
   */
  delete(jobId) {
    this.cache.delete(jobId);
    this.metadata.delete(jobId);

    if (this.config.persistToDisk && this.db) {
      try {
        this.statements.deleteJob.run(jobId);
      } catch (error) {
        console.error('Error deleting from cache:', error);
      }
    }
  }

  /**
   * Get all jobs from cache
   */
  getAll() {
    return Array.from(this.cache.values());
  }

  /**
   * Get all job IDs
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.metadata.clear();

    if (this.config.persistToDisk && this.db) {
      try {
        this.db.exec('DELETE FROM jobs');
      } catch (error) {
        console.error('Error clearing cache:', error);
      }
    }
  }

  /**
   * Get cache size
   */
  size() {
    return this.cache.size;
  }

  /**
   * Evict oldest entries
   */
  evictOldest() {
    const entries = Array.from(this.metadata.entries())
      .sort((a, b) => a[1].cachedAt - b[1].cachedAt);

    const toRemove = Math.ceil(this.config.maxSize * 0.1); // Remove 10%
    
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.delete(entries[i][0]);
    }
  }

  /**
   * Clean expired entries
   */
  cleanExpired() {
    const now = Date.now();
    const expired = [];

    for (const [jobId, metadata] of this.metadata.entries()) {
      if (now - metadata.cachedAt > this.config.ttl) {
        expired.push(jobId);
      }
    }

    expired.forEach(jobId => this.delete(jobId));

    // Clean from disk
    if (this.config.persistToDisk && this.db) {
      try {
        const cutoff = now - this.config.ttl;
        this.statements.cleanOldJobs.run(cutoff);
      } catch (error) {
        console.error('Error cleaning expired cache:', error);
      }
    }

    return expired.length;
  }

  /**
   * Add job change to history
   */
  addToHistory(jobId, recordId, data, changeType) {
    if (!this.config.persistToDisk || !this.db) return;

    try {
      this.statements.addHistory.run(
        jobId,
        recordId,
        JSON.stringify(data),
        changeType,
        Date.now()
      );
    } catch (error) {
      console.error('Error adding to history:', error);
    }
  }

  /**
   * Get job history
   */
  getHistory(jobId, limit = 10) {
    if (!this.config.persistToDisk || !this.db) return [];

    try {
      const rows = this.statements.getHistory.all(jobId, limit);
      return rows.map(row => ({
        jobId: row.job_id,
        recordId: row.record_id,
        data: JSON.parse(row.data),
        changeType: row.change_type,
        changedAt: new Date(row.changed_at)
      }));
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }

  /**
   * Clean old history entries
   */
  cleanOldHistory(daysToKeep = 30) {
    if (!this.config.persistToDisk || !this.db) return 0;

    try {
      const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      const result = this.statements.cleanOldHistory.run(cutoff);
      return result.changes;
    } catch (error) {
      console.error('Error cleaning old history:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalHits = Array.from(this.metadata.values())
      .reduce((sum, meta) => sum + meta.hits, 0);

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      totalHits,
      persistToDisk: this.config.persistToDisk,
      dbPath: this.config.dbPath
    };
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log('Cache database closed');
    }
  }
}

module.exports = CacheService;


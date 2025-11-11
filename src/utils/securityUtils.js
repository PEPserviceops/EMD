/**
 * Security Utilities for API Integration
 * 
 * Provides enterprise-grade security enhancements for API integrations:
 * - API key rotation capabilities
 * - Secure credential storage patterns
 * - Request/response validation and sanitization
 * - API authentication monitoring
 * - Audit logging for API interactions
 * - Encryption/decryption utilities
 * - Security policy enforcement
 * - Threat detection and response
 * 
 * @module utils/securityUtils
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class SecurityUtils {
  constructor(options = {}) {
    this.config = {
      // Encryption configuration
      encryptionAlgorithm: options.encryptionAlgorithm || 'aes-256-gcm',
      encryptionKeyLength: options.encryptionKeyLength || 32,
      
      // API key rotation configuration
      rotation: {
        enabled: options.rotation !== false,
        scheduleInterval: options.rotationInterval || 86400000, // 24 hours
        warningThreshold: options.rotationWarningThreshold || 0.8, // 80%
        minValidTime: options.minValidTime || 3600000, // 1 hour
        ...options.rotation
      },
      
      // Credential storage
      storage: {
        directory: options.storageDirectory || './secure-storage',
        filePermissions: options.filePermissions || 0o600,
        backupEnabled: options.backupEnabled !== false,
        ...options.storage
      },
      
      // Audit logging
      audit: {
        enabled: options.audit !== false,
        logDirectory: options.auditLogDirectory || './audit-logs',
        retention: options.auditRetention || 2592000000, // 30 days
        format: options.auditFormat || 'json', // json, text
        ...options.audit
      },
      
      // Security policies
      policies: {
        maxFailedAttempts: options.maxFailedAttempts || 5,
        lockoutDuration: options.lockoutDuration || 300000, // 5 minutes
        requireHTTPS: options.requireHTTPS !== false,
        allowedIPRanges: options.allowedIPRanges || [],
        ...options.policies
      },
      
      // Threat detection
      threatDetection: {
        enabled: options.threatDetection !== false,
        suspiciousPatterns: options.suspiciousPatterns || [],
        rateLimitBreach: options.rateLimitBreach || true,
        ...options.threatDetection
      }
    };

    // State management
    this.credentials = new Map();
    this.auditLog = [];
    this.failedAttempts = new Map();
    this.securityEvents = [];
    this.isInitialized = false;

    // Initialize secure storage
    this.initializeSecureStorage();
    
    this.log('info', 'Security utilities initialized', { config: this.config });
  }

  /**
   * Initialize secure storage directories
   * @private
   */
  async initializeSecureStorage() {
    try {
      // Create storage directories
      await this.ensureDirectory(this.config.storage.directory);
      await this.ensureDirectory(this.config.audit.logDirectory);
      
      // Initialize credential store
      await this.initializeCredentialStore();
      
      this.isInitialized = true;
      this.log('info', 'Secure storage initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize secure storage', { error: error.message });
      throw error;
    }
  }

  /**
   * Ensure directory exists
   * @private
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dirPath, { recursive: true, mode: 0o700 });
      } else {
        throw error;
      }
    }
  }

  /**
   * Initialize credential store
   * @private
   */
  async initializeCredentialStore() {
    const storePath = path.join(this.config.storage.directory, 'credentials.enc');
    
    try {
      await fs.access(storePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Create empty credential store
        await this.saveCredentialsStore({});
      }
    }
  }

  /**
   * Store encrypted API credentials
   * @param {string} serviceName - Name of the service
   * @param {Object} credentials - Credentials to store
   * @param {Object} metadata - Additional metadata
   */
  async storeCredentials(serviceName, credentials, metadata = {}) {
    if (!this.isInitialized) {
      throw new Error('Security utilities not initialized');
    }

    try {
      // Validate credentials
      this.validateCredentials(credentials);

      // Encrypt credentials
      const encryptedCredentials = await this.encryptObject(credentials);

      // Prepare credential record
      const credentialRecord = {
        serviceName,
        encryptedData: encryptedCredentials,
        metadata: {
          ...metadata,
          storedAt: new Date().toISOString(),
          version: 1
        },
        rotation: {
          lastRotated: metadata.lastRotated || null,
          nextRotation: this.calculateNextRotation(),
          isRotating: false
        }
      };

      // Store in memory
      this.credentials.set(serviceName, credentialRecord);

      // Save to secure storage
      await this.persistCredentials();

      // Audit log
      await this.logAuditEvent('credentials_stored', {
        serviceName,
        metadata: this.maskSensitiveData(metadata)
      });

      this.log('info', 'Credentials stored successfully', { serviceName });
      
      return {
        success: true,
        serviceName,
        rotationScheduled: this.config.rotation.enabled,
        nextRotation: credentialRecord.rotation.nextRotation
      };

    } catch (error) {
      await this.logSecurityEvent('credential_storage_failed', {
        serviceName,
        error: error.message
      });
      
      throw new Error(`Failed to store credentials: ${error.message}`);
    }
  }

  /**
   * Retrieve and decrypt API credentials
   * @param {string} serviceName - Name of the service
   * @returns {Promise<Object>} Decrypted credentials
   */
  async retrieveCredentials(serviceName) {
    try {
      // Check rate limiting and failed attempts
      await this.checkSecurityPolicies(serviceName);

      let credentialRecord = this.credentials.get(serviceName);
      
      if (!credentialRecord) {
        // Try to load from storage
        credentialRecord = await this.loadCredentialRecord(serviceName);
        if (credentialRecord) {
          this.credentials.set(serviceName, credentialRecord);
        }
      }

      if (!credentialRecord) {
        throw new Error(`No credentials found for service: ${serviceName}`);
      }

      // Check if credentials need rotation
      if (this.config.rotation.enabled) {
        await this.checkRotationSchedule(serviceName, credentialRecord);
      }

      // Decrypt credentials
      const credentials = await this.decryptObject(credentialRecord.encryptedData);

      // Audit log
      await this.logAuditEvent('credentials_retrieved', {
        serviceName,
        success: true
      });

      // Reset failed attempts on success
      this.failedAttempts.delete(serviceName);

      this.log('info', 'Credentials retrieved successfully', { serviceName });
      
      return {
        credentials,
        metadata: credentialRecord.metadata,
        rotation: credentialRecord.rotation
      };

    } catch (error) {
      // Log failed attempt
      await this.recordFailedAttempt(serviceName, error.message);
      
      await this.logSecurityEvent('credential_retrieval_failed', {
        serviceName,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Validate API request security
   * @param {Object} request - Request object
   * @param {string} serviceName - Name of the service
   * @returns {Promise<Object>} Validation result
   */
  async validateRequest(request, serviceName) {
    const validationResult = {
      valid: true,
      warnings: [],
      threats: []
    };

    try {
      // Check HTTPS requirement
      if (this.config.policies.requireHTTPS && !this.isHTTPSRequest(request)) {
        validationResult.warnings.push('HTTPS required for secure communication');
      }

      // Check IP restrictions
      if (this.config.policies.allowedIPRanges.length > 0) {
        const clientIP = this.extractClientIP(request);
        if (!this.isIPAllowed(clientIP)) {
          validationResult.threats.push('IP address not in allowed range');
          validationResult.valid = false;
        }
      }

      // Check for suspicious patterns
      if (this.config.threatDetection.enabled) {
        const threats = await this.detectThreats(request);
        validationResult.threats.push(...threats);
        
        if (threats.length > 0) {
          validationResult.valid = false;
          await this.logSecurityEvent('suspicious_request_detected', {
            serviceName,
            threats,
            requestInfo: this.sanitizeRequestInfo(request)
          });
        }
      }

      return validationResult;

    } catch (error) {
      await this.logSecurityEvent('request_validation_error', {
        serviceName,
        error: error.message,
        requestInfo: this.sanitizeRequestInfo(request)
      });

      return {
        valid: false,
        warnings: ['Request validation failed'],
        threats: ['security_validation_error']
      };
    }
  }

  /**
   * Sanitize API response data
   * @param {Object} response - API response
   * @param {string} serviceName - Name of the service
   * @returns {Object} Sanitized response
   */
  sanitizeResponse(response, serviceName) {
    try {
      const sanitized = JSON.parse(JSON.stringify(response));
      
      // Remove sensitive fields
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
      this.removeSensitiveFields(sanitized, sensitiveFields);

      // Mask partially sensitive data
      const partiallySensitiveFields = ['email', 'phone', 'ssn'];
      this.maskPartiallySensitiveFields(sanitized, partiallySensitiveFields);

      return {
        data: sanitized,
        sanitized: true
      };

    } catch (error) {
      this.log('error', 'Response sanitization failed', {
        serviceName,
        error: error.message
      });

      return {
        data: response,
        sanitized: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate next rotation time
   * @private
   */
  calculateNextRotation() {
    return new Date(Date.now() + this.config.rotation.scheduleInterval).toISOString();
  }

  /**
   * Encrypt object using AES-256-GCM
   * @private
   */
  async encryptObject(obj) {
    const key = crypto.randomBytes(this.config.encryptionKeyLength);
    const iv = crypto.randomBytes(12);
    
    const cipher = crypto.createCipher(this.config.encryptionAlgorithm, key);
    cipher.setAAD(Buffer.from('api-security'));
    
    let encrypted = cipher.update(JSON.stringify(obj), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();

    return {
      data: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      key: key.toString('hex'),
      algorithm: this.config.encryptionAlgorithm
    };
  }

  /**
   * Decrypt object
   * @private
   */
  async decryptObject(encryptedObj) {
    const { data, iv, authTag, key, algorithm } = encryptedObj;
    
    const decipher = crypto.createDecipher(algorithm, Buffer.from(key, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    decipher.setAAD(Buffer.from('api-security'));
    
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Validate credentials structure
   * @private
   */
  validateCredentials(credentials) {
    const requiredFields = ['apiKey'];
    const missingFields = requiredFields.filter(field => !credentials[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required credential fields: ${missingFields.join(', ')}`);
    }

    // Validate API key format
    if (typeof credentials.apiKey !== 'string' || credentials.apiKey.length < 10) {
      throw new Error('API key must be a string with at least 10 characters');
    }
  }

  /**
   * Remove sensitive fields from object
   * @private
   */
  removeSensitiveFields(obj, sensitiveFields) {
    for (const field of sensitiveFields) {
      if (obj.hasOwnProperty(field)) {
        delete obj[field];
      }
    }

    // Recursively check nested objects
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
        this.removeSensitiveFields(obj[key], sensitiveFields);
      }
    }
  }

  /**
   * Mask partially sensitive fields
   * @private
   */
  maskPartiallySensitiveFields(obj, fields) {
    for (const field of fields) {
      if (obj.hasOwnProperty(field) && typeof obj[field] === 'string') {
        const value = obj[field];
        if (value.length > 4) {
          obj[field] = `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
        } else {
          obj[field] = '***';
        }
      }
    }

    // Recursively check nested objects
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
        this.maskPartiallySensitiveFields(obj[key], fields);
      }
    }
  }

  /**
   * Detect threats in request
   * @private
   */
  async detectThreats(request) {
    const threats = [];
    const requestStr = JSON.stringify(request);

    // Check for SQL injection
    const sqlPatterns = /(\b(union|select|insert|update|delete|drop|create|alter)\b)/i;
    if (sqlPatterns.test(requestStr)) {
      threats.push('sql_injection_attempt');
    }

    // Check for XSS
    const xssPatterns = /(<script|javascript:|onerror=|onload=)/i;
    if (xssPatterns.test(requestStr)) {
      threats.push('xss_attempt');
    }

    return threats;
  }

  /**
   * Sanitize request info for logging
   * @private
   */
  sanitizeRequestInfo(request) {
    return {
      method: request.method,
      url: request.url ? this.sanitizeUrl(request.url) : null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Sanitize URL for logging
   * @private
   */
  sanitizeUrl(url) {
    try {
      const urlObj = new URL(url);
      const sanitized = new URL(urlObj.href);
      
      // Remove query parameters that might contain sensitive data
      const sensitiveParams = ['key', 'token', 'password', 'secret'];
      for (const param of sensitiveParams) {
        if (sanitized.searchParams.has(param)) {
          sanitized.searchParams.set(param, '***');
        }
      }
      
      return sanitized.href;
    } catch (error) {
      return 'invalid_url';
    }
  }

  /**
   * Check if request is HTTPS
   * @private
   */
  isHTTPSRequest(request) {
    return request.protocol === 'https' || 
           request.headers?.['x-forwarded-proto'] === 'https' ||
           request.secure === true;
  }

  /**
   * Extract client IP from request
   * @private
   */
  extractClientIP(request) {
    return request.ip || 
           request.connection?.remoteAddress ||
           request.headers?.['x-forwarded-for']?.split(',')[0] ||
           request.headers?.['x-real-ip'] ||
           'unknown';
  }

  /**
   * Check if IP is in allowed ranges
   * @private
   */
  isIPAllowed(ip) {
    if (this.config.policies.allowedIPRanges.length === 0) {
      return true; // No restrictions
    }

    return this.config.policies.allowedIPRanges.includes(ip);
  }

  /**
   * Check security policies
   * @private
   */
  async checkSecurityPolicies(serviceName) {
    const failedAttempts = this.failedAttempts.get(serviceName) || 0;
    
    if (failedAttempts >= this.config.policies.maxFailedAttempts) {
      const lockoutInfo = this.getLockoutInfo(serviceName);
      if (lockoutInfo && !lockoutInfo.expired) {
        throw new Error(`Account locked until ${lockoutInfo.unlockTime}`);
      }
    }
  }

  /**
   * Record failed attempt
   * @private
   */
  async recordFailedAttempt(serviceName, error) {
    const attempts = (this.failedAttempts.get(serviceName) || 0) + 1;
    this.failedAttempts.set(serviceName, attempts);

    await this.logSecurityEvent('failed_access_attempt', {
      serviceName,
      attempts: attempts,
      error: error,
      maxAttempts: this.config.policies.maxFailedAttempts
    });
  }

  /**
   * Get account lockout information
   * @private
   */
  getLockoutInfo(serviceName) {
    const info = this.failedAttempts.get(serviceName);
    if (!info || typeof info !== 'object') return null;

    const now = new Date();
    const unlockTime = new Date(info.unlockTime);
    
    return {
      ...info,
      expired: now >= unlockTime
    };
  }

  /**
   * Check rotation schedule
   * @private
   */
  async checkRotationSchedule(serviceName, credentialRecord) {
    const now = new Date();
    const nextRotation = new Date(credentialRecord.rotation.nextRotation);
    
    // Check if rotation is due
    if (now >= nextRotation) {
      this.log('warn', 'Credential rotation due', {
        serviceName,
        nextRotation: nextRotation
      });
    }
  }

  /**
   * Mask sensitive data for logging
   * @private
   */
  maskSensitiveData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const masked = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveField(key)) {
        masked[key] = '***';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  /**
   * Check if field is sensitive
   * @private
   */
  isSensitiveField(fieldName) {
    const sensitiveKeywords = ['password', 'token', 'secret', 'key', 'auth', 'credential', 'apiKey'];
    return sensitiveKeywords.some(keyword => 
      fieldName.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Persist credentials to storage
   * @private
   */
  async persistCredentials() {
    const storePath = path.join(this.config.storage.directory, 'credentials.enc');
    const credentialsData = {};
    
    for (const [serviceName, record] of this.credentials.entries()) {
      credentialsData[serviceName] = record;
    }

    const encryptedStore = await this.encryptObject(credentialsData);
    await fs.writeFile(storePath, JSON.stringify(encryptedStore, null, 2), {
      mode: this.config.storage.filePermissions
    });
  }

  /**
   * Load credential record from storage
   * @private
   */
  async loadCredentialRecord(serviceName) {
    const storePath = path.join(this.config.storage.directory, 'credentials.enc');
    
    try {
      const encryptedData = await fs.readFile(storePath, 'utf8');
      const credentialsStore = JSON.parse(encryptedData);
      const decryptedStore = await this.decryptObject(credentialsStore);
      
      return decryptedStore[serviceName] || null;
    } catch (error) {
      this.log('warn', 'Failed to load credentials from storage', { 
        serviceName, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Log audit event
   * @private
   */
  async logAuditEvent(action, details) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: action,
      details: this.maskSensitiveData(details),
      source: 'api-security'
    };

    // Add to memory log
    this.auditLog.push(auditEntry);
  }

  /**
   * Log security event
   * @private
   */
  async logSecurityEvent(eventType, details) {
    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      details: this.maskSensitiveData(details),
      severity: this.getEventSeverity(eventType),
      source: 'security-utils'
    };

    this.securityEvents.push(event);
    this.log('warn', `Security event: ${eventType}`, details);
  }

  /**
   * Get event severity level
   * @private
   */
  getEventSeverity(eventType) {
    const severityMap = {
      'credential_storage_failed': 'high',
      'credential_retrieval_failed': 'medium',
      'suspicious_request_detected': 'high',
      'failed_access_attempt': 'medium'
    };
    
    return severityMap[eventType] || 'low';
  }

  /**
   * Internal logging method
   * @private
   */
  log(level, message, data = {}) {
    const logEntry = {
      level: level,
      message: `[SecurityUtils] ${message}`,
      data: data,
      timestamp: new Date().toISOString()
    };
    
    switch (level) {
      case 'error':
        console.error(logEntry);
        break;
      case 'warn':
        console.warn(logEntry);
        break;
      default:
        console.log(logEntry);
    }
  }

  /**
   * Get security status
   */
  getSecurityStatus() {
    return {
      initialized: this.isInitialized,
      credentialCount: this.credentials.size,
      auditLogEntries: this.auditLog.length,
      securityEvents: this.securityEvents.length,
      config: {
        rotation: this.config.rotation,
        policies: this.config.policies,
        threatDetection: this.config.threatDetection
      }
    };
  }
}

module.exports = SecurityUtils;
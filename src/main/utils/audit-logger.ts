/**
 * Audit Logger - Security audit logging with rotation
 *
 * Logs security-relevant events to a separate audit log file.
 * Includes automatic log rotation to prevent disk space issues.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Audit event types
 */
export enum AuditEventType {
  // Credential operations
  CREDENTIAL_SET = 'credential_set',
  CREDENTIAL_GET = 'credential_get',
  CREDENTIAL_DELETE = 'credential_delete',
  CREDENTIAL_MIGRATION = 'credential_migration',

  // File system operations
  PROJECT_CREATE = 'project_create',
  PROJECT_UPDATE = 'project_update',
  PROJECT_DELETE = 'project_delete',
  CONVERSATION_CREATE = 'conversation_create',
  CONVERSATION_UPDATE = 'conversation_update',
  CONVERSATION_DELETE = 'conversation_delete',

  // OAuth operations
  OAUTH_START = 'oauth_start',
  OAUTH_SUCCESS = 'oauth_success',
  OAUTH_FAILURE = 'oauth_failure',
  OAUTH_DISCONNECT = 'oauth_disconnect',

  // Site creation
  SITE_CREATE_START = 'site_create_start',
  SITE_CREATE_SUCCESS = 'site_create_success',
  SITE_CREATE_FAILURE = 'site_create_failure',

  // Validation failures
  VALIDATION_FAILURE = 'validation_failure',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SANITIZATION_WARNING = 'sanitization_warning',

  // Settings operations
  SETTINGS_UPDATE = 'settings_update',
  PROVIDER_CHANGE = 'provider_change',
  AUTH_MODE_CHANGE = 'auth_mode_change',
}

/**
 * Audit event interface
 */
export interface AuditEvent {
  timestamp: string;
  type: AuditEventType;
  action: string;
  success: boolean;
  details?: Record<string, any>;
  error?: string;
}

/**
 * Audit logger configuration
 */
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5;

/**
 * Audit logger class
 */
export class AuditLogger {
  private logPath: string;
  private logDir: string;

  constructor(userDataPath: string) {
    this.logDir = path.join(userDataPath, 'ai-site-builder');

    // Ensure directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.logPath = path.join(this.logDir, 'audit.log');
  }

  /**
   * Log an audit event
   */
  log(event: AuditEvent): void {
    try {
      // Check if rotation is needed
      this.rotateIfNeeded();

      // Format log entry
      const logEntry = this.formatLogEntry(event);

      // Append to log file
      fs.appendFileSync(this.logPath, logEntry + '\n', 'utf-8');
    } catch (error) {
      console.error('[Audit Logger] Error writing audit log:', error);
    }
  }

  /**
   * Log a successful event
   */
  logSuccess(type: AuditEventType, action: string, details?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      type,
      action,
      success: true,
      details,
    });
  }

  /**
   * Log a failed event
   */
  logFailure(
    type: AuditEventType,
    action: string,
    error: string,
    details?: Record<string, any>
  ): void {
    this.log({
      timestamp: new Date().toISOString(),
      type,
      action,
      success: false,
      error,
      details,
    });
  }

  /**
   * Format a log entry
   */
  private formatLogEntry(event: AuditEvent): string {
    const parts = [
      event.timestamp,
      `[${event.type.toUpperCase()}]`,
      event.action,
      event.success ? 'SUCCESS' : 'FAILURE',
    ];

    if (event.error) {
      parts.push(`error="${event.error}"`);
    }

    if (event.details) {
      // Sanitize details to prevent log injection
      const sanitizedDetails = this.sanitizeDetails(event.details);
      parts.push(`details=${JSON.stringify(sanitizedDetails)}`);
    }

    return parts.join(' | ');
  }

  /**
   * Sanitize details to prevent log injection
   */
  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(details)) {
      if (typeof value === 'string') {
        // Remove newlines and control characters
        sanitized[key] = value
          .replace(/[\r\n]/g, ' ')
          // eslint-disable-next-line no-control-regex
          .replace(/[\x00-\x1F\x7F]/g, '')
          .substring(0, 200); // Limit length
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = `[Array(${value.length})]`;
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = '[Object]';
      } else {
        sanitized[key] = String(value).substring(0, 100);
      }
    }

    return sanitized;
  }

  /**
   * Check if log rotation is needed and rotate if necessary
   */
  private rotateIfNeeded(): void {
    try {
      if (!fs.existsSync(this.logPath)) {
        return;
      }

      const stats = fs.statSync(this.logPath);

      if (stats.size >= MAX_LOG_SIZE) {
        this.rotateLog();
      }
    } catch (error) {
      console.error('[Audit Logger] Error checking log size:', error);
    }
  }

  /**
   * Rotate the log file
   */
  private rotateLog(): void {
    try {
      // Remove oldest log if we have too many
      const oldestLog = path.join(this.logDir, `audit.log.${MAX_LOG_FILES}`);
      if (fs.existsSync(oldestLog)) {
        fs.unlinkSync(oldestLog);
      }

      // Rotate existing logs
      for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
        const oldPath = path.join(this.logDir, `audit.log.${i}`);
        const newPath = path.join(this.logDir, `audit.log.${i + 1}`);

        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
        }
      }

      // Rotate current log to .1
      const rotatedPath = path.join(this.logDir, 'audit.log.1');
      fs.renameSync(this.logPath, rotatedPath);
    } catch (error) {
      console.error('[Audit Logger] Error rotating log:', error);
    }
  }

  /**
   * Get recent audit events (for debugging/monitoring)
   */
  getRecentEvents(limit: number = 100): AuditEvent[] {
    try {
      if (!fs.existsSync(this.logPath)) {
        return [];
      }

      const content = fs.readFileSync(this.logPath, 'utf-8');
      const lines = content.trim().split('\n');

      // Get last N lines
      const recentLines = lines.slice(-limit);

      return recentLines
        .map((line) => this.parseLogEntry(line))
        .filter((event): event is AuditEvent => event !== null);
    } catch (error) {
      console.error('[Audit Logger] Error reading audit log:', error);
      return [];
    }
  }

  /**
   * Parse a log entry back into an AuditEvent
   */
  private parseLogEntry(line: string): AuditEvent | null {
    try {
      const parts = line.split(' | ');

      if (parts.length < 4) {
        return null;
      }

      const timestamp = parts[0];
      const type = parts[1].replace(/^\[|\]$/g, '').toLowerCase() as AuditEventType;
      const action = parts[2];
      const success = parts[3] === 'SUCCESS';

      const event: AuditEvent = {
        timestamp,
        type,
        action,
        success,
      };

      // Parse error if present
      for (let i = 4; i < parts.length; i++) {
        if (parts[i].startsWith('error="')) {
          event.error = parts[i].substring(7, parts[i].length - 1);
        } else if (parts[i].startsWith('details=')) {
          try {
            event.details = JSON.parse(parts[i].substring(8));
          } catch {
            // Ignore parsing errors
          }
        }
      }

      return event;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear all audit logs (use with caution)
   */
  clear(): void {
    try {
      if (fs.existsSync(this.logPath)) {
        fs.unlinkSync(this.logPath);
      }

      // Remove rotated logs
      for (let i = 1; i <= MAX_LOG_FILES; i++) {
        const rotatedPath = path.join(this.logDir, `audit.log.${i}`);
        if (fs.existsSync(rotatedPath)) {
          fs.unlinkSync(rotatedPath);
        }
      }
    } catch (error) {
      console.error('[Audit Logger] Error clearing audit logs:', error);
    }
  }
}

// Create singleton instance (will be initialized in main process)
let auditLogger: AuditLogger | null = null;

/**
 * Initialize the audit logger
 */
export function initializeAuditLogger(userDataPath: string): AuditLogger {
  if (!auditLogger) {
    auditLogger = new AuditLogger(userDataPath);
  }
  return auditLogger;
}

/**
 * Get the audit logger instance
 */
export function getAuditLogger(): AuditLogger {
  if (!auditLogger) {
    throw new Error('Audit logger not initialized. Call initializeAuditLogger first.');
  }
  return auditLogger;
}

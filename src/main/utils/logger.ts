/**
 * Logger Wrapper - Configurable logging with level filtering
 *
 * Wraps Local's logger with level-based filtering and structured logging.
 * Makes log verbosity configurable via settings.
 */

/**
 * Log levels (ordered by severity)
 */
export enum LogLevel {
  DEBUG = 0, // Verbose internal state
  INFO = 1, // Normal operations
  WARN = 2, // Non-critical issues
  ERROR = 3, // Critical failures
}

/**
 * Log level names for display
 */
export const LogLevelNames: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  enableDebugLogging: boolean;
  enableStructuredLogging: boolean;
  logToConsole: boolean;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  enableDebugLogging: false,
  enableStructuredLogging: true,
  logToConsole: false, // Don't log to console by default (use Local's logger)
};

/**
 * Structured log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
  component?: string;
}

/**
 * Logger class
 */
export class Logger {
  private config: LoggerConfig;
  private localLogger: any;
  private component: string;

  constructor(component: string, localLogger: any, config?: Partial<LoggerConfig>) {
    this.component = component;
    this.localLogger = localLogger;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update logger configuration
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Enable/disable debug logging
   */
  setDebugEnabled(enabled: boolean): void {
    this.config.enableDebugLogging = enabled;
    if (enabled) {
      this.config.level = LogLevel.DEBUG;
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: any, context?: Record<string, any>): void {
    const finalContext = context || {};

    if (error) {
      finalContext.error = this.serializeError(error);
    }

    this.log(LogLevel.ERROR, message, finalContext);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    // Check if this log should be filtered
    if (!this.shouldLog(level)) {
      return;
    }

    // Create log entry
    const entry: LogEntry = {
      level,
      message: this.formatMessage(message),
      context,
      timestamp: new Date().toISOString(),
      component: this.component,
    };

    // Log to Local's logger
    this.logToLocal(entry);

    // Optionally log to console
    if (this.config.logToConsole) {
      this.logToConsole(entry);
    }
  }

  /**
   * Check if a log at this level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    // If debug logging is explicitly disabled, don't log DEBUG
    if (level === LogLevel.DEBUG && !this.config.enableDebugLogging) {
      return false;
    }

    // Check against configured level
    return level >= this.config.level;
  }

  /**
   * Format message with component prefix
   */
  private formatMessage(message: string): string {
    return `[${this.component}] ${message}`;
  }

  /**
   * Log to Local's logger
   */
  private logToLocal(entry: LogEntry): void {
    if (!this.localLogger) {
      return;
    }

    const formattedMessage = this.formatLogEntry(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        this.localLogger.info(formattedMessage);
        break;
      case LogLevel.WARN:
        this.localLogger.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        this.localLogger.error(formattedMessage);
        break;
    }
  }

  /**
   * Log to console (for debugging)
   */
  private logToConsole(entry: LogEntry): void {
    const formattedMessage = this.formatLogEntry(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  /**
   * Format log entry as string
   */
  private formatLogEntry(entry: LogEntry): string {
    if (!this.config.enableStructuredLogging || !entry.context) {
      return entry.message;
    }

    // Include context in structured format
    const contextStr =
      Object.keys(entry.context).length > 0 ? ` ${JSON.stringify(entry.context)}` : '';

    return `${entry.message}${contextStr}`;
  }

  /**
   * Serialize error for logging
   */
  private serializeError(error: any): any {
    if (error instanceof Error) {
      return {
        ...error, // Include any custom properties first
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return error;
  }

  /**
   * Create a child logger with a sub-component name
   */
  child(subComponent: string): Logger {
    return new Logger(`${this.component}:${subComponent}`, this.localLogger, this.config);
  }
}

/**
 * Global logger registry
 */
const loggerRegistry = new Map<string, Logger>();

/**
 * Global logger configuration
 */
let globalConfig: LoggerConfig = { ...DEFAULT_CONFIG };

/**
 * Global Local logger reference
 */
let globalLocalLogger: any = null;

/**
 * Initialize the logger system
 */
export function initializeLogger(localLogger: any, config?: Partial<LoggerConfig>): void {
  globalLocalLogger = localLogger;

  if (config) {
    globalConfig = { ...DEFAULT_CONFIG, ...config };
  }
}

/**
 * Update global logger configuration
 */
export function updateLoggerConfig(config: Partial<LoggerConfig>): void {
  globalConfig = { ...globalConfig, ...config };

  // Update all existing loggers
  loggerRegistry.forEach((logger) => {
    logger.setConfig(config);
  });
}

/**
 * Get or create a logger for a component
 */
export function getLogger(component: string): Logger {
  // Check if logger exists
  let logger = loggerRegistry.get(component);

  if (!logger) {
    // Create new logger
    logger = new Logger(component, globalLocalLogger, globalConfig);
    loggerRegistry.set(component, logger);
  }

  return logger;
}

/**
 * Set global log level
 */
export function setGlobalLogLevel(level: LogLevel): void {
  updateLoggerConfig({ level });
}

/**
 * Enable/disable global debug logging
 */
export function setGlobalDebugEnabled(enabled: boolean): void {
  updateLoggerConfig({
    enableDebugLogging: enabled,
    level: enabled ? LogLevel.DEBUG : LogLevel.INFO,
  });
}

/**
 * Helper to create logger configuration from settings
 */
export function createLoggerConfigFromSettings(settings: any): Partial<LoggerConfig> {
  const config: Partial<LoggerConfig> = {};

  if (settings.enableDebugLogging !== undefined) {
    config.enableDebugLogging = settings.enableDebugLogging;
  }

  if (settings.logLevel !== undefined) {
    // Map string to LogLevel enum
    config.level = parseLogLevel(settings.logLevel);
  }

  return config;
}

/**
 * Parse log level from string or number
 */
export function parseLogLevel(level: string | number): LogLevel {
  if (typeof level === 'number') {
    return level as LogLevel;
  }

  const levelMap: Record<string, LogLevel> = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    warning: LogLevel.WARN,
    error: LogLevel.ERROR,
  };

  return levelMap[level.toLowerCase()] ?? LogLevel.INFO;
}

/**
 * Convenience function to log operation start
 */
export function logOperationStart(
  logger: Logger,
  operation: string,
  context?: Record<string, any>
): void {
  logger.info(`Starting ${operation}`, context);
}

/**
 * Convenience function to log operation success
 */
export function logOperationSuccess(
  logger: Logger,
  operation: string,
  duration?: number,
  context?: Record<string, any>
): void {
  const finalContext = { ...context };

  if (duration !== undefined) {
    finalContext.durationMs = duration;
  }

  logger.info(`${operation} completed successfully`, finalContext);
}

/**
 * Convenience function to log operation failure
 */
export function logOperationFailure(
  logger: Logger,
  operation: string,
  error: any,
  duration?: number,
  context?: Record<string, any>
): void {
  const finalContext = { ...context };

  if (duration !== undefined) {
    finalContext.durationMs = duration;
  }

  logger.error(`${operation} failed`, error, finalContext);
}

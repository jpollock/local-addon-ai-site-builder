/**
 * Tests for logger utility
 */

import { Logger, LogLevel, getLogger, initializeLogger, setGlobalLogLevel } from '../../src/main/utils/logger';

describe('Logger Utility', () => {
  let mockLocalLogger: any;
  let logger: Logger;

  beforeEach(() => {
    mockLocalLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    logger = new Logger('TestComponent', mockLocalLogger, {
      level: LogLevel.INFO,
      enableDebugLogging: false,
      enableStructuredLogging: true,
      logToConsole: false,
    });
  });

  describe('log level filtering', () => {
    it('should not log DEBUG when level is INFO', () => {
      logger.debug('Test debug message');
      expect(mockLocalLogger.info).not.toHaveBeenCalled();
    });

    it('should log INFO when level is INFO', () => {
      logger.info('Test info message');
      expect(mockLocalLogger.info).toHaveBeenCalled();
      expect(mockLocalLogger.info).toHaveBeenCalledWith(expect.stringContaining('Test info message'));
    });

    it('should log WARN when level is INFO', () => {
      logger.warn('Test warning message');
      expect(mockLocalLogger.warn).toHaveBeenCalled();
    });

    it('should log ERROR when level is INFO', () => {
      logger.error('Test error message');
      expect(mockLocalLogger.error).toHaveBeenCalled();
    });

    it('should log DEBUG when explicitly enabled', () => {
      logger.setDebugEnabled(true);
      logger.debug('Test debug message');
      expect(mockLocalLogger.info).toHaveBeenCalled();
    });
  });

  describe('structured logging', () => {
    it('should include context in log messages', () => {
      logger.info('Test message', { key: 'value', number: 42 });
      expect(mockLocalLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('"key":"value"')
      );
      expect(mockLocalLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('"number":42')
      );
    });

    it('should serialize errors in context', () => {
      const error = new Error('Test error');
      logger.error('Operation failed', error, { operation: 'test' });

      expect(mockLocalLogger.error).toHaveBeenCalled();
      const logCall = mockLocalLogger.error.mock.calls[0][0];
      expect(logCall).toContain('Operation failed');
      expect(logCall).toContain('Test error');
    });
  });

  describe('component naming', () => {
    it('should prefix messages with component name', () => {
      logger.info('Test message');
      expect(mockLocalLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[TestComponent]')
      );
    });

    it('should support child loggers', () => {
      const childLogger = logger.child('SubComponent');
      childLogger.info('Test message');
      expect(mockLocalLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[TestComponent:SubComponent]')
      );
    });
  });

  describe('configuration updates', () => {
    it('should update log level', () => {
      logger.setLevel(LogLevel.WARN);
      logger.info('This should not log');
      expect(mockLocalLogger.info).not.toHaveBeenCalled();

      logger.warn('This should log');
      expect(mockLocalLogger.warn).toHaveBeenCalled();
    });

    it('should update debug logging', () => {
      logger.setDebugEnabled(true);
      logger.debug('Test debug');
      expect(mockLocalLogger.info).toHaveBeenCalled();

      mockLocalLogger.info.mockClear();
      logger.setDebugEnabled(false);
      logger.debug('Test debug 2');
      expect(mockLocalLogger.info).not.toHaveBeenCalled();
    });

    it('should update config via setConfig', () => {
      logger.setConfig({ level: LogLevel.ERROR });
      logger.warn('This should not log');
      expect(mockLocalLogger.warn).not.toHaveBeenCalled();

      logger.error('This should log');
      expect(mockLocalLogger.error).toHaveBeenCalled();
    });
  });

  describe('global logger initialization', () => {
    it('should initialize global logger', () => {
      initializeLogger(mockLocalLogger, {
        level: LogLevel.DEBUG,
        enableDebugLogging: true,
      });

      const globalLogger = getLogger('GlobalTest');
      globalLogger.debug('Test message');
      expect(mockLocalLogger.info).toHaveBeenCalled();
    });

    it('should update all loggers when global config changes', () => {
      initializeLogger(mockLocalLogger);
      const logger1 = getLogger('Logger1');
      const logger2 = getLogger('Logger2');

      setGlobalLogLevel(LogLevel.ERROR);

      mockLocalLogger.info.mockClear();
      logger1.info('Should not log');
      logger2.info('Should not log');
      expect(mockLocalLogger.info).not.toHaveBeenCalled();
    });
  });
});

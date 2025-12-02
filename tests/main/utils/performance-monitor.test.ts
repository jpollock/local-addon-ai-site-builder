/**
 * Tests for performance monitor utility
 */

import {
  DEFAULT_PERFORMANCE_CONFIG,
  PerformanceMonitor,
  PerformanceMonitorRegistry,
  getPerformanceMonitorRegistry,
} from '../../../src/main/utils/performance-monitor';

describe('performance monitor utility', () => {
  describe('DEFAULT_PERFORMANCE_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_PERFORMANCE_CONFIG.maxDataPoints).toBe(1000);
      expect(DEFAULT_PERFORMANCE_CONFIG.slowOperationThreshold).toBe(5000);
      expect(DEFAULT_PERFORMANCE_CONFIG.highErrorRateThreshold).toBe(0.1);
      expect(DEFAULT_PERFORMANCE_CONFIG.name).toBe('PerformanceMonitor');
    });
  });

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor({
        maxDataPoints: 10,
        slowOperationThreshold: 1000,
        highErrorRateThreshold: 0.2,
        name: 'TestMonitor',
      });
    });

    describe('initial state', () => {
      it('should return empty metrics initially', () => {
        const metrics = monitor.getMetrics();

        expect(metrics.totalRequests).toBe(0);
        expect(metrics.successCount).toBe(0);
        expect(metrics.failureCount).toBe(0);
        expect(metrics.timeoutCount).toBe(0);
        expect(metrics.retryCount).toBe(0);
        expect(metrics.circuitBreakerTrips).toBe(0);
        expect(metrics.averageDuration).toBe(0);
        expect(metrics.p50Duration).toBe(0);
        expect(metrics.p95Duration).toBe(0);
        expect(metrics.p99Duration).toBe(0);
        expect(metrics.successRate).toBe(0);
        expect(metrics.errorRate).toBe(0);
        expect(metrics.slowOperations).toBe(0);
      });
    });

    describe('record', () => {
      it('should record a successful operation', () => {
        monitor.record({
          operation: 'test-op',
          duration: 100,
          success: true,
        });

        const metrics = monitor.getMetrics();
        expect(metrics.totalRequests).toBe(1);
        expect(metrics.successCount).toBe(1);
        expect(metrics.failureCount).toBe(0);
        expect(metrics.successRate).toBe(1);
      });

      it('should record a failed operation', () => {
        monitor.record({
          operation: 'test-op',
          duration: 100,
          success: false,
          error: 'Something went wrong',
        });

        const metrics = monitor.getMetrics();
        expect(metrics.totalRequests).toBe(1);
        expect(metrics.successCount).toBe(0);
        expect(metrics.failureCount).toBe(1);
        expect(metrics.errorRate).toBe(1);
      });

      it('should track retry count', () => {
        monitor.record({
          operation: 'test-op',
          duration: 100,
          success: true,
          retryCount: 3,
        });

        const metrics = monitor.getMetrics();
        expect(metrics.retryCount).toBe(3);
      });

      it('should track cache hits', () => {
        monitor.record({
          operation: 'test-op',
          duration: 10,
          success: true,
          cacheHit: true,
        });

        monitor.record({
          operation: 'test-op',
          duration: 100,
          success: true,
          cacheHit: false,
        });

        const metrics = monitor.getMetrics();
        expect(metrics.cacheHits).toBe(1);
        expect(metrics.cacheMisses).toBe(1);
        expect(metrics.cacheHitRate).toBe(0.5);
      });

      it('should track provider', () => {
        monitor.record({
          operation: 'test-op',
          duration: 100,
          success: true,
          provider: 'claude',
        });

        const providerMetrics = monitor.getMetricsByProvider('claude');
        expect(providerMetrics.totalRequests).toBe(1);
      });

      it('should track slow operations', () => {
        monitor.record({
          operation: 'test-op',
          duration: 500,
          success: true,
        });

        monitor.record({
          operation: 'slow-op',
          duration: 2000,
          success: true,
        });

        const metrics = monitor.getMetrics();
        expect(metrics.slowOperations).toBe(1);
      });

      it('should enforce maxDataPoints limit', () => {
        // Record more than maxDataPoints (10)
        for (let i = 0; i < 15; i++) {
          monitor.record({
            operation: 'test-op',
            duration: 100,
            success: true,
          });
        }

        const metrics = monitor.getMetrics();
        expect(metrics.totalRequests).toBe(10);
      });
    });

    describe('recordTimeout', () => {
      it('should increment timeout count', () => {
        // Need at least one data point for getMetrics to return real values
        monitor.record({ operation: 'op', duration: 100, success: true });

        monitor.recordTimeout('test-op');
        monitor.recordTimeout('test-op', 'claude');

        const metrics = monitor.getMetrics();
        expect(metrics.timeoutCount).toBe(2);
      });
    });

    describe('recordCircuitBreakerTrip', () => {
      it('should increment circuit breaker trip count', () => {
        // Need at least one data point for getMetrics to return real values
        monitor.record({ operation: 'op', duration: 100, success: true });

        monitor.recordCircuitBreakerTrip('TestBreaker');
        monitor.recordCircuitBreakerTrip('TestBreaker2');

        const metrics = monitor.getMetrics();
        expect(metrics.circuitBreakerTrips).toBe(2);
      });
    });

    describe('getMetrics', () => {
      it('should calculate duration metrics correctly', () => {
        // Record various durations
        [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].forEach((duration) => {
          monitor.record({
            operation: 'test-op',
            duration,
            success: true,
          });
        });

        const metrics = monitor.getMetrics();
        expect(metrics.averageDuration).toBe(550); // (100+200+...+1000)/10
        expect(metrics.p50Duration).toBe(500); // 5th element
        expect(metrics.p95Duration).toBe(1000); // Near highest
        expect(metrics.p99Duration).toBe(1000); // Highest
      });

      it('should calculate success and error rates correctly', () => {
        for (let i = 0; i < 7; i++) {
          monitor.record({ operation: 'op', duration: 100, success: true });
        }
        for (let i = 0; i < 3; i++) {
          monitor.record({ operation: 'op', duration: 100, success: false });
        }

        const metrics = monitor.getMetrics();
        expect(metrics.successRate).toBe(0.7);
        expect(metrics.errorRate).toBe(0.3);
      });
    });

    describe('getMetricsByOperation', () => {
      it('should group metrics by operation', () => {
        monitor.record({ operation: 'op1', duration: 100, success: true });
        monitor.record({ operation: 'op1', duration: 200, success: true });
        monitor.record({ operation: 'op2', duration: 300, success: false, error: 'error' });

        const byOperation = monitor.getMetricsByOperation();

        expect(Object.keys(byOperation)).toHaveLength(2);
        expect(byOperation['op1'].metrics.totalRequests).toBe(2);
        expect(byOperation['op2'].metrics.totalRequests).toBe(1);
        expect(byOperation['op2'].recentErrors).toHaveLength(1);
      });

      it('should group by operation and provider', () => {
        monitor.record({
          operation: 'sendMessage',
          duration: 100,
          success: true,
          provider: 'claude',
        });
        monitor.record({
          operation: 'sendMessage',
          duration: 200,
          success: true,
          provider: 'openai',
        });

        const byOperation = monitor.getMetricsByOperation();

        expect(Object.keys(byOperation)).toHaveLength(2);
        expect(byOperation['sendMessage:claude'].metrics.totalRequests).toBe(1);
        expect(byOperation['sendMessage:openai'].metrics.totalRequests).toBe(1);
      });

      it('should track last success and failure times', () => {
        monitor.record({ operation: 'op', duration: 100, success: true });
        monitor.record({ operation: 'op', duration: 100, success: false, error: 'fail' });

        const byOperation = monitor.getMetricsByOperation();

        expect(byOperation['op'].lastSuccess).toBeDefined();
        expect(byOperation['op'].lastFailure).toBeDefined();
      });
    });

    describe('getMetricsByProvider', () => {
      it('should return metrics for specific provider', () => {
        monitor.record({
          operation: 'op1',
          duration: 100,
          success: true,
          provider: 'claude',
        });
        monitor.record({
          operation: 'op2',
          duration: 200,
          success: true,
          provider: 'claude',
        });
        monitor.record({
          operation: 'op1',
          duration: 300,
          success: true,
          provider: 'openai',
        });

        const claudeMetrics = monitor.getMetricsByProvider('claude');
        expect(claudeMetrics.totalRequests).toBe(2);

        const openaiMetrics = monitor.getMetricsByProvider('openai');
        expect(openaiMetrics.totalRequests).toBe(1);
      });

      it('should return empty metrics for unknown provider', () => {
        const metrics = monitor.getMetricsByProvider('unknown');
        expect(metrics.totalRequests).toBe(0);
      });
    });

    describe('exportMetrics', () => {
      it('should export overall and operation metrics', () => {
        monitor.record({ operation: 'op1', duration: 100, success: true });
        monitor.record({ operation: 'op2', duration: 200, success: false, error: 'error' });

        const exported = monitor.exportMetrics();

        expect(exported.overall.totalRequests).toBe(2);
        expect(Object.keys(exported.byOperation)).toHaveLength(2);
        expect(exported.timestamp).toBeDefined();
      });
    });

    describe('clear', () => {
      it('should reset all metrics', () => {
        monitor.record({ operation: 'op', duration: 100, success: true });
        monitor.recordTimeout('op');
        monitor.recordCircuitBreakerTrip('breaker');

        monitor.clear();

        const metrics = monitor.getMetrics();
        expect(metrics.totalRequests).toBe(0);
        expect(metrics.timeoutCount).toBe(0);
        expect(metrics.circuitBreakerTrips).toBe(0);
      });
    });

    describe('with logger', () => {
      it('should log operations', () => {
        const logger = {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        };

        const loggedMonitor = new PerformanceMonitor({}, logger);

        loggedMonitor.record({ operation: 'op', duration: 100, success: true });
        expect(logger.info).toHaveBeenCalled();
      });

      it('should log slow operations', () => {
        const logger = {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        };

        const loggedMonitor = new PerformanceMonitor(
          { slowOperationThreshold: 1000 },
          logger
        );

        loggedMonitor.record({ operation: 'slow', duration: 2000, success: true });
        expect(logger.warn).toHaveBeenCalled();
      });

      it('should log high error rate', () => {
        const logger = {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        };

        const loggedMonitor = new PerformanceMonitor(
          { highErrorRateThreshold: 0.1 },
          logger
        );

        // Add failures to trigger high error rate warning
        loggedMonitor.record({ operation: 'op', duration: 100, success: false });

        expect(logger.warn).toHaveBeenCalled();
      });

      it('should log timeouts and circuit breaker trips', () => {
        const logger = {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        };

        const loggedMonitor = new PerformanceMonitor({}, logger);

        loggedMonitor.recordTimeout('op', 'provider');
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Timeout'));

        loggedMonitor.recordCircuitBreakerTrip('TestBreaker');
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Circuit breaker'));
      });
    });
  });

  describe('PerformanceMonitorRegistry', () => {
    let registry: PerformanceMonitorRegistry;

    beforeEach(() => {
      registry = new PerformanceMonitorRegistry();
    });

    describe('getOrCreate', () => {
      it('should create new monitor if not exists', () => {
        const monitor = registry.getOrCreate('test');
        expect(monitor).toBeInstanceOf(PerformanceMonitor);
      });

      it('should return existing monitor if exists', () => {
        const monitor1 = registry.getOrCreate('test');
        const monitor2 = registry.getOrCreate('test');
        expect(monitor1).toBe(monitor2);
      });

      it('should use provided config', () => {
        const monitor = registry.getOrCreate('test', { maxDataPoints: 500 });
        expect(monitor).toBeInstanceOf(PerformanceMonitor);
      });
    });

    describe('get', () => {
      it('should return monitor if exists', () => {
        registry.getOrCreate('test');
        expect(registry.get('test')).toBeDefined();
      });

      it('should return undefined if not exists', () => {
        expect(registry.get('nonexistent')).toBeUndefined();
      });
    });

    describe('getAll', () => {
      it('should return all monitors', () => {
        registry.getOrCreate('monitor1');
        registry.getOrCreate('monitor2');

        const all = registry.getAll();
        expect(all.size).toBe(2);
        expect(all.has('monitor1')).toBe(true);
        expect(all.has('monitor2')).toBe(true);
      });
    });

    describe('exportAllMetrics', () => {
      it('should export metrics for all monitors', () => {
        const monitor1 = registry.getOrCreate('monitor1');
        const monitor2 = registry.getOrCreate('monitor2');

        monitor1.record({ operation: 'op1', duration: 100, success: true });
        monitor2.record({ operation: 'op2', duration: 200, success: false });

        const exported = registry.exportAllMetrics();
        expect(exported['monitor1'].overall.totalRequests).toBe(1);
        expect(exported['monitor2'].overall.totalRequests).toBe(1);
      });
    });

    describe('clearAll', () => {
      it('should clear all monitors', () => {
        const monitor1 = registry.getOrCreate('monitor1');
        const monitor2 = registry.getOrCreate('monitor2');

        monitor1.record({ operation: 'op1', duration: 100, success: true });
        monitor2.record({ operation: 'op2', duration: 200, success: true });

        registry.clearAll();

        expect(monitor1.getMetrics().totalRequests).toBe(0);
        expect(monitor2.getMetrics().totalRequests).toBe(0);
      });
    });
  });

  describe('getPerformanceMonitorRegistry', () => {
    it('should return singleton instance', () => {
      const registry1 = getPerformanceMonitorRegistry();
      const registry2 = getPerformanceMonitorRegistry();
      expect(registry1).toBe(registry2);
    });

    it('should return PerformanceMonitorRegistry instance', () => {
      const registry = getPerformanceMonitorRegistry();
      expect(registry).toBeInstanceOf(PerformanceMonitorRegistry);
    });
  });
});

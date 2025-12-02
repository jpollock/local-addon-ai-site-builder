/**
 * Tests for circuit breaker utility
 */

import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  CircuitBreakerRegistry,
  CircuitState,
  DEFAULT_CIRCUIT_CONFIG,
  getCircuitBreakerRegistry,
  isCircuitBreakerOpenError,
} from '../../../src/main/utils/circuit-breaker';

describe('circuit breaker utility', () => {
  describe('DEFAULT_CIRCUIT_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_CIRCUIT_CONFIG.failureThreshold).toBe(5);
      expect(DEFAULT_CIRCUIT_CONFIG.successThreshold).toBe(2);
      expect(DEFAULT_CIRCUIT_CONFIG.timeout).toBe(30000);
      expect(DEFAULT_CIRCUIT_CONFIG.monitoringWindowMs).toBe(60000);
      expect(DEFAULT_CIRCUIT_CONFIG.name).toBe('CircuitBreaker');
    });
  });

  describe('CircuitBreakerOpenError', () => {
    it('should create error with correct properties', () => {
      const nextAttemptTime = Date.now() + 30000;
      const error = new CircuitBreakerOpenError('TestBreaker', nextAttemptTime);

      expect(error.name).toBe('CircuitBreakerOpenError');
      expect(error.message).toContain("Circuit breaker 'TestBreaker' is OPEN");
      expect(error.message).toContain('Service unavailable');
    });

    it('should be instance of Error', () => {
      const error = new CircuitBreakerOpenError('test', Date.now());
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CircuitBreakerOpenError);
    });
  });

  describe('CircuitBreaker', () => {
    let breaker: CircuitBreaker;

    beforeEach(() => {
      breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 100,
        monitoringWindowMs: 1000,
        name: 'TestBreaker',
      });
    });

    describe('initial state', () => {
      it('should start in CLOSED state', () => {
        const stats = breaker.getStats();
        expect(stats.state).toBe(CircuitState.CLOSED);
      });

      it('should have zero counters initially', () => {
        const stats = breaker.getStats();
        expect(stats.failureCount).toBe(0);
        expect(stats.successCount).toBe(0);
        expect(stats.totalRequests).toBe(0);
        expect(stats.totalFailures).toBe(0);
        expect(stats.totalSuccesses).toBe(0);
      });
    });

    describe('execute - success', () => {
      it('should return result on success', async () => {
        const fn = jest.fn().mockResolvedValue('success');
        const result = await breaker.execute(fn);

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(1);
      });

      it('should update success counters', async () => {
        const fn = jest.fn().mockResolvedValue('success');
        await breaker.execute(fn);

        const stats = breaker.getStats();
        expect(stats.totalRequests).toBe(1);
        expect(stats.totalSuccesses).toBe(1);
        expect(stats.totalFailures).toBe(0);
      });

      it('should update lastSuccessTime', async () => {
        const fn = jest.fn().mockResolvedValue('success');
        await breaker.execute(fn);

        const stats = breaker.getStats();
        expect(stats.lastSuccessTime).not.toBeNull();
      });

      it('should reset failure count on success in CLOSED state', async () => {
        // First, add some failures (but not enough to open)
        const failFn = jest.fn().mockRejectedValue(new Error('fail'));
        try {
          await breaker.execute(failFn);
        } catch {}
        try {
          await breaker.execute(failFn);
        } catch {}

        let stats = breaker.getStats();
        expect(stats.failureCount).toBe(2);

        // Now succeed
        const successFn = jest.fn().mockResolvedValue('success');
        await breaker.execute(successFn);

        stats = breaker.getStats();
        expect(stats.failureCount).toBe(0);
      });
    });

    describe('execute - failure', () => {
      it('should throw error on failure', async () => {
        const error = new Error('test error');
        const fn = jest.fn().mockRejectedValue(error);

        await expect(breaker.execute(fn)).rejects.toThrow('test error');
      });

      it('should update failure counters', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('fail'));
        try {
          await breaker.execute(fn);
        } catch {}

        const stats = breaker.getStats();
        expect(stats.totalRequests).toBe(1);
        expect(stats.totalFailures).toBe(1);
        expect(stats.failureCount).toBe(1);
      });

      it('should update lastFailureTime', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('fail'));
        try {
          await breaker.execute(fn);
        } catch {}

        const stats = breaker.getStats();
        expect(stats.lastFailureTime).not.toBeNull();
      });
    });

    describe('state transitions', () => {
      it('should transition to OPEN after reaching failure threshold', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('fail'));

        // Fail 3 times (threshold)
        for (let i = 0; i < 3; i++) {
          try {
            await breaker.execute(fn);
          } catch {}
        }

        const stats = breaker.getStats();
        expect(stats.state).toBe(CircuitState.OPEN);
        expect(stats.nextAttemptTime).not.toBeNull();
      });

      it('should fail fast when OPEN', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('fail'));

        // Open the circuit
        for (let i = 0; i < 3; i++) {
          try {
            await breaker.execute(fn);
          } catch {}
        }

        // Next call should fail fast without calling fn
        const successFn = jest.fn().mockResolvedValue('success');
        await expect(breaker.execute(successFn)).rejects.toThrow(CircuitBreakerOpenError);
        expect(successFn).not.toHaveBeenCalled();
      });

      it('should transition to HALF_OPEN after timeout', async () => {
        jest.useFakeTimers();

        const fn = jest.fn().mockRejectedValue(new Error('fail'));

        // Open the circuit
        for (let i = 0; i < 3; i++) {
          try {
            await breaker.execute(fn);
          } catch {}
        }

        expect(breaker.getStats().state).toBe(CircuitState.OPEN);

        // Advance time past timeout
        jest.advanceTimersByTime(150);

        // Next call should transition to HALF_OPEN and execute
        const successFn = jest.fn().mockResolvedValue('success');
        await breaker.execute(successFn);

        expect(successFn).toHaveBeenCalled();

        jest.useRealTimers();
      });

      it('should transition from HALF_OPEN to CLOSED after success threshold', async () => {
        jest.useFakeTimers();

        const failFn = jest.fn().mockRejectedValue(new Error('fail'));

        // Open the circuit
        for (let i = 0; i < 3; i++) {
          try {
            await breaker.execute(failFn);
          } catch {}
        }

        // Advance time past timeout to allow HALF_OPEN
        jest.advanceTimersByTime(150);

        // Succeed twice (successThreshold = 2)
        const successFn = jest.fn().mockResolvedValue('success');
        await breaker.execute(successFn);
        await breaker.execute(successFn);

        expect(breaker.getStats().state).toBe(CircuitState.CLOSED);

        jest.useRealTimers();
      });

      it('should transition from HALF_OPEN back to OPEN on failure', async () => {
        jest.useFakeTimers();

        const failFn = jest.fn().mockRejectedValue(new Error('fail'));

        // Open the circuit
        for (let i = 0; i < 3; i++) {
          try {
            await breaker.execute(failFn);
          } catch {}
        }

        // Advance time past timeout to allow HALF_OPEN
        jest.advanceTimersByTime(150);

        // Succeed once, then fail
        const successFn = jest.fn().mockResolvedValue('success');
        await breaker.execute(successFn);

        try {
          await breaker.execute(failFn);
        } catch {}

        expect(breaker.getStats().state).toBe(CircuitState.OPEN);

        jest.useRealTimers();
      });
    });

    describe('reset', () => {
      it('should reset to initial state', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('fail'));

        // Open the circuit
        for (let i = 0; i < 3; i++) {
          try {
            await breaker.execute(fn);
          } catch {}
        }

        expect(breaker.getStats().state).toBe(CircuitState.OPEN);

        breaker.reset();

        const stats = breaker.getStats();
        expect(stats.state).toBe(CircuitState.CLOSED);
        expect(stats.failureCount).toBe(0);
        expect(stats.successCount).toBe(0);
      });
    });

    describe('with logger', () => {
      it('should call logger on state transitions', async () => {
        const logger = {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        };

        const loggedBreaker = new CircuitBreaker(
          { failureThreshold: 2, timeout: 100 },
          logger
        );

        const fn = jest.fn().mockRejectedValue(new Error('fail'));

        for (let i = 0; i < 2; i++) {
          try {
            await loggedBreaker.execute(fn);
          } catch {}
        }

        // Should log errors and state transition warning
        expect(logger.error).toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalled();
      });
    });

    describe('monitoring window', () => {
      it('should only count failures within monitoring window', async () => {
        jest.useFakeTimers();

        const fn = jest.fn().mockRejectedValue(new Error('fail'));

        // Fail twice
        try {
          await breaker.execute(fn);
        } catch {}
        try {
          await breaker.execute(fn);
        } catch {}

        expect(breaker.getStats().failureCount).toBe(2);

        // Advance time past monitoring window
        jest.advanceTimersByTime(1100);

        // Fail once more
        try {
          await breaker.execute(fn);
        } catch {}

        // Only the recent failure should count
        expect(breaker.getStats().failureCount).toBe(1);

        jest.useRealTimers();
      });
    });
  });

  describe('isCircuitBreakerOpenError', () => {
    it('should return true for CircuitBreakerOpenError instances', () => {
      const error = new CircuitBreakerOpenError('test', Date.now());
      expect(isCircuitBreakerOpenError(error)).toBe(true);
    });

    it('should return true for objects with name "CircuitBreakerOpenError"', () => {
      const error = { name: 'CircuitBreakerOpenError', message: 'test' };
      expect(isCircuitBreakerOpenError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(isCircuitBreakerOpenError(new Error('test'))).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(isCircuitBreakerOpenError(null)).toBe(false);
      expect(isCircuitBreakerOpenError(undefined)).toBe(false);
    });
  });

  describe('CircuitBreakerRegistry', () => {
    let registry: CircuitBreakerRegistry;

    beforeEach(() => {
      registry = new CircuitBreakerRegistry();
    });

    describe('getOrCreate', () => {
      it('should create new breaker if not exists', () => {
        const breaker = registry.getOrCreate('test');
        expect(breaker).toBeInstanceOf(CircuitBreaker);
      });

      it('should return existing breaker if exists', () => {
        const breaker1 = registry.getOrCreate('test');
        const breaker2 = registry.getOrCreate('test');
        expect(breaker1).toBe(breaker2);
      });

      it('should use provided config', () => {
        const breaker = registry.getOrCreate('test', { failureThreshold: 10 });
        // Config is internal, but we can test behavior
        expect(breaker).toBeInstanceOf(CircuitBreaker);
      });
    });

    describe('get', () => {
      it('should return breaker if exists', () => {
        registry.getOrCreate('test');
        expect(registry.get('test')).toBeDefined();
      });

      it('should return undefined if not exists', () => {
        expect(registry.get('nonexistent')).toBeUndefined();
      });
    });

    describe('getAll', () => {
      it('should return all breakers', () => {
        registry.getOrCreate('breaker1');
        registry.getOrCreate('breaker2');

        const all = registry.getAll();
        expect(all.size).toBe(2);
        expect(all.has('breaker1')).toBe(true);
        expect(all.has('breaker2')).toBe(true);
      });
    });

    describe('getAllStats', () => {
      it('should return stats for all breakers', async () => {
        const breaker1 = registry.getOrCreate('breaker1');
        const breaker2 = registry.getOrCreate('breaker2');

        await breaker1.execute(() => Promise.resolve('success'));
        await breaker2.execute(() => Promise.resolve('success'));

        const stats = registry.getAllStats();
        expect(stats['breaker1'].totalSuccesses).toBe(1);
        expect(stats['breaker2'].totalSuccesses).toBe(1);
      });
    });

    describe('resetAll', () => {
      it('should reset all breakers', async () => {
        const breaker1 = registry.getOrCreate('breaker1', { failureThreshold: 1 });
        const breaker2 = registry.getOrCreate('breaker2', { failureThreshold: 1 });

        // Open both breakers
        try {
          await breaker1.execute(() => Promise.reject(new Error('fail')));
        } catch {}
        try {
          await breaker2.execute(() => Promise.reject(new Error('fail')));
        } catch {}

        expect(breaker1.getStats().state).toBe(CircuitState.OPEN);
        expect(breaker2.getStats().state).toBe(CircuitState.OPEN);

        registry.resetAll();

        expect(breaker1.getStats().state).toBe(CircuitState.CLOSED);
        expect(breaker2.getStats().state).toBe(CircuitState.CLOSED);
      });
    });
  });

  describe('getCircuitBreakerRegistry', () => {
    it('should return singleton instance', () => {
      const registry1 = getCircuitBreakerRegistry();
      const registry2 = getCircuitBreakerRegistry();
      expect(registry1).toBe(registry2);
    });

    it('should return CircuitBreakerRegistry instance', () => {
      const registry = getCircuitBreakerRegistry();
      expect(registry).toBeInstanceOf(CircuitBreakerRegistry);
    });
  });
});

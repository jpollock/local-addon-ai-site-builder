/**
 * Tests for retry utility
 */

import {
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  RetryExhaustedError,
  isRetryableError,
  withRetry,
  isRetryExhaustedError,
} from '../../../src/main/utils/retry';

describe('retry utility', () => {
  describe('DEFAULT_RETRY_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_RETRY_CONFIG.maxAttempts).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.initialDelay).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(8000);
      expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
      expect(DEFAULT_RETRY_CONFIG.retryableErrors).toContain('ECONNRESET');
      expect(DEFAULT_RETRY_CONFIG.retryableStatusCodes).toContain(429);
      expect(DEFAULT_RETRY_CONFIG.retryableStatusCodes).toContain(503);
    });
  });

  describe('RetryExhaustedError', () => {
    it('should create error with correct properties', () => {
      const lastError = new Error('last error');
      const error = new RetryExhaustedError('All attempts failed', 3, lastError);

      expect(error.name).toBe('RetryExhaustedError');
      expect(error.message).toBe('All attempts failed');
      expect(error.attempts).toBe(3);
      expect(error.lastError).toBe(lastError);
    });

    it('should be instance of Error', () => {
      const error = new RetryExhaustedError('test', 1, new Error('last'));
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RetryExhaustedError);
    });
  });

  describe('isRetryableError', () => {
    const config = DEFAULT_RETRY_CONFIG;

    it('should return true for network errors with matching codes', () => {
      expect(isRetryableError({ code: 'ECONNRESET' }, config)).toBe(true);
      expect(isRetryableError({ code: 'ETIMEDOUT' }, config)).toBe(true);
      expect(isRetryableError({ code: 'ENOTFOUND' }, config)).toBe(true);
      expect(isRetryableError({ code: 'ECONNREFUSED' }, config)).toBe(true);
    });

    it('should return true for retryable HTTP status codes', () => {
      expect(isRetryableError({ status: 429 }, config)).toBe(true);
      expect(isRetryableError({ status: 500 }, config)).toBe(true);
      expect(isRetryableError({ status: 502 }, config)).toBe(true);
      expect(isRetryableError({ status: 503 }, config)).toBe(true);
      expect(isRetryableError({ status: 504 }, config)).toBe(true);
    });

    it('should return true for network-related error messages', () => {
      expect(isRetryableError({ message: 'Network error occurred' }, config)).toBe(true);
      expect(isRetryableError({ message: 'Connection timeout' }, config)).toBe(true);
      expect(isRetryableError({ message: 'socket hang up' }, config)).toBe(true);
      expect(isRetryableError({ message: 'ECONNRESET' }, config)).toBe(true);
    });

    it('should return false for auth errors', () => {
      expect(isRetryableError({ status: 401 }, config)).toBe(false);
      expect(isRetryableError({ status: 403 }, config)).toBe(false);
    });

    it('should return false for client errors (except 429)', () => {
      expect(isRetryableError({ status: 400 }, config)).toBe(false);
      expect(isRetryableError({ status: 404 }, config)).toBe(false);
      expect(isRetryableError({ status: 422 }, config)).toBe(false);
    });

    it('should return false for non-retryable errors', () => {
      expect(isRetryableError({ message: 'Invalid input' }, config)).toBe(false);
      expect(isRetryableError({ code: 'UNKNOWN' }, config)).toBe(false);
      expect(isRetryableError({}, config)).toBe(false);
    });
  });

  describe('withRetry', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const resultPromise = withRetry(fn);
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockResolvedValue('success after retry');

      const resultPromise = withRetry(fn, { maxAttempts: 3, initialDelay: 100 });

      // Advance timers to allow retry
      await jest.advanceTimersByTimeAsync(200);

      const result = await resultPromise;
      expect(result).toBe('success after retry');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw last error when all attempts fail', async () => {
      jest.useRealTimers(); // Use real timers for this test

      const originalError = { code: 'ECONNRESET' };
      const fn = jest.fn().mockRejectedValue(originalError);

      let thrownError: any;
      try {
        await withRetry(fn, { maxAttempts: 2, initialDelay: 10, maxDelay: 20 });
      } catch (error) {
        thrownError = error;
      }

      // When retries are exhausted, the last error is thrown
      expect(thrownError).toEqual(originalError);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw immediately for non-retryable errors', async () => {
      const error = { status: 401, message: 'Unauthorized' };
      const fn = jest.fn().mockRejectedValue(error);

      await expect(withRetry(fn)).rejects.toEqual(error);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use custom config', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockResolvedValue('success');

      const customConfig: Partial<RetryConfig> = {
        maxAttempts: 5,
        initialDelay: 50,
      };

      const resultPromise = withRetry(fn, customConfig);

      // Advance timers enough for all retries
      await jest.advanceTimersByTimeAsync(5000);

      const result = await resultPromise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(5);
    });

    it('should call logger on retry attempts', async () => {
      const logger = {
        info: jest.fn(),
        error: jest.fn(),
      };

      const fn = jest
        .fn()
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockResolvedValue('success');

      const resultPromise = withRetry(fn, { maxAttempts: 3, initialDelay: 100 }, logger);

      await jest.advanceTimersByTimeAsync(200);
      await resultPromise;

      expect(logger.info).toHaveBeenCalled();
    });

    it('should call logger on exhaustion', async () => {
      jest.useRealTimers(); // Use real timers for this test

      const logger = {
        info: jest.fn(),
        error: jest.fn(),
      };

      const originalError = { code: 'ECONNRESET' };
      const fn = jest.fn().mockRejectedValue(originalError);

      let thrownError: any;
      try {
        await withRetry(fn, { maxAttempts: 2, initialDelay: 10, maxDelay: 20 }, logger);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toEqual(originalError);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should respect Retry-After header', async () => {
      const error = {
        status: 429,
        response: {
          headers: {
            'retry-after': '2',
          },
        },
      };
      const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      const resultPromise = withRetry(fn, { maxAttempts: 3, initialDelay: 100 });

      // Should wait at least 2 seconds based on Retry-After
      await jest.advanceTimersByTimeAsync(2500);

      const result = await resultPromise;
      expect(result).toBe('success');
    });
  });

  describe('isRetryExhaustedError', () => {
    it('should return true for RetryExhaustedError instances', () => {
      const error = new RetryExhaustedError('test', 3, new Error('last'));
      expect(isRetryExhaustedError(error)).toBe(true);
    });

    it('should return true for objects with name "RetryExhaustedError"', () => {
      const error = { name: 'RetryExhaustedError', message: 'test' };
      expect(isRetryExhaustedError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(isRetryExhaustedError(new Error('test'))).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(isRetryExhaustedError(null)).toBe(false);
      expect(isRetryExhaustedError(undefined)).toBe(false);
    });
  });
});

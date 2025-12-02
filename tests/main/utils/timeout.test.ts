/**
 * Tests for timeout utility
 */

import { TimeoutError, withTimeout, isTimeoutError } from '../../../src/main/utils/timeout';

describe('timeout utility', () => {
  describe('TimeoutError', () => {
    it('should create error with correct name', () => {
      const error = new TimeoutError('test message');
      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe('test message');
    });

    it('should be instance of Error', () => {
      const error = new TimeoutError('test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TimeoutError);
    });
  });

  describe('withTimeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should resolve when promise completes before timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000);
      expect(result).toBe('success');
    });

    it('should reject with TimeoutError when timeout is exceeded', async () => {
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve('too late'), 2000);
      });

      const timeoutPromise = withTimeout(slowPromise, 100);

      // Advance timers past the timeout
      jest.advanceTimersByTime(150);

      await expect(timeoutPromise).rejects.toThrow(TimeoutError);
      await expect(timeoutPromise).rejects.toThrow('Operation timed out after 100ms');
    });

    it('should use custom error message when provided', async () => {
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve('too late'), 2000);
      });

      const timeoutPromise = withTimeout(slowPromise, 100, 'Custom timeout message');

      jest.advanceTimersByTime(150);

      await expect(timeoutPromise).rejects.toThrow('Custom timeout message');
    });

    it('should propagate errors from the original promise', async () => {
      const failingPromise = Promise.reject(new Error('Original error'));

      await expect(withTimeout(failingPromise, 1000)).rejects.toThrow('Original error');
    });

    it('should clear timeout when promise resolves', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const promise = Promise.resolve('success');
      await withTimeout(promise, 1000);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should clear timeout when promise rejects', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const promise = Promise.reject(new Error('failure'));
      await expect(withTimeout(promise, 1000)).rejects.toThrow('failure');

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should handle very short timeout', async () => {
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve('success'), 100);
      });

      const timeoutPromise = withTimeout(slowPromise, 10);

      // Advance timers past timeout but before promise resolves
      jest.advanceTimersByTime(20);

      await expect(timeoutPromise).rejects.toThrow(TimeoutError);
    });

    it('should work with async functions', async () => {
      const asyncFn = async () => {
        return 'async result';
      };

      const result = await withTimeout(asyncFn(), 1000);
      expect(result).toBe('async result');
    });
  });

  describe('isTimeoutError', () => {
    it('should return true for TimeoutError instances', () => {
      const error = new TimeoutError('test');
      expect(isTimeoutError(error)).toBe(true);
    });

    it('should return true for objects with name "TimeoutError"', () => {
      const error = { name: 'TimeoutError', message: 'test' };
      expect(isTimeoutError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('test');
      expect(isTimeoutError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isTimeoutError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isTimeoutError(undefined)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isTimeoutError({ message: 'test' })).toBe(false);
      expect(isTimeoutError('string')).toBe(false);
      expect(isTimeoutError(123)).toBe(false);
    });
  });
});

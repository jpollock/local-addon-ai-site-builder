/**
 * Tests for recovery manager utility
 */

import { RecoveryManager, DEFAULT_RETRY_CONFIG } from '../../src/main/utils/recovery-manager';
import { ErrorCategory } from '../../src/main/utils/error-messages';

describe('Recovery Manager', () => {
  let manager: RecoveryManager;

  beforeEach(() => {
    manager = new RecoveryManager();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt if operation succeeds', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const metadata = {
        id: 'test-op-1',
        name: 'Test Operation',
        timestamp: Date.now(),
      };

      const result = await manager.executeWithRetry(operation, metadata);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Network error');
          (error as any).retryable = true;
          throw error;
        }
        return Promise.resolve('success');
      });

      const metadata = {
        id: 'test-op-2',
        name: 'Retry Test',
        timestamp: Date.now(),
      };

      const result = await manager.executeWithRetry(operation, metadata, {
        ...DEFAULT_RETRY_CONFIG,
        initialDelay: 10,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry beyond max attempts', async () => {
      const operation = jest.fn().mockRejectedValue({
        retryable: true,
        message: 'Network error',
      });

      const metadata = {
        id: 'test-op-3',
        name: 'Max Attempts Test',
        timestamp: Date.now(),
      };

      await expect(
        manager.executeWithRetry(operation, metadata, {
          ...DEFAULT_RETRY_CONFIG,
          maxAttempts: 2,
          initialDelay: 10,
        })
      ).rejects.toBeTruthy();

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue({
        retryable: false,
        message: 'Auth error',
      });

      const metadata = {
        id: 'test-op-4',
        name: 'Non-Retryable Test',
        timestamp: Date.now(),
      };

      await expect(
        manager.executeWithRetry(operation, metadata, {
          ...DEFAULT_RETRY_CONFIG,
          initialDelay: 10,
        })
      ).rejects.toBeTruthy();

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should apply exponential backoff', async () => {
      const delays: number[] = [];
      let attempts = 0;

      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 4) {
          throw { retryable: true };
        }
        return Promise.resolve('success');
      });

      const metadata = {
        id: 'test-op-5',
        name: 'Backoff Test',
        timestamp: Date.now(),
      };

      const startTime = Date.now();
      await manager.executeWithRetry(operation, metadata, {
        ...DEFAULT_RETRY_CONFIG,
        maxAttempts: 4,
        initialDelay: 100,
        backoffMultiplier: 2,
      });
      const elapsed = Date.now() - startTime;

      // Should have delays of roughly: 100ms, 200ms, 400ms
      // Total: ~700ms (with some margin for execution time)
      expect(elapsed).toBeGreaterThan(600);
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('last failed operation tracking', () => {
    it('should store last failed operation', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));
      const metadata = {
        id: 'test-op-6',
        name: 'Failed Operation',
        timestamp: Date.now(),
      };

      await expect(
        manager.executeWithRetry(operation, metadata, {
          maxAttempts: 1,
          initialDelay: 10,
          maxDelay: 10,
          backoffMultiplier: 1,
        })
      ).rejects.toBeTruthy();

      const lastFailed = manager.getLastFailedOperation();
      expect(lastFailed).toBeTruthy();
      expect(lastFailed?.operation.id).toBe('test-op-6');
      expect(lastFailed?.attemptCount).toBe(1);
    });

    it('should clear last failed operation on success', async () => {
      // First fail
      const failOp = jest.fn().mockRejectedValue(new Error('Test error'));
      const metadata1 = {
        id: 'test-op-7',
        name: 'Failed Operation',
        timestamp: Date.now(),
      };

      await expect(
        manager.executeWithRetry(failOp, metadata1, {
          maxAttempts: 1,
          initialDelay: 10,
          maxDelay: 10,
          backoffMultiplier: 1,
        })
      ).rejects.toBeTruthy();

      expect(manager.getLastFailedOperation()).toBeTruthy();

      // Then succeed with same ID
      const successOp = jest.fn().mockResolvedValue('success');
      await manager.executeWithRetry(successOp, metadata1);

      expect(manager.getLastFailedOperation()).toBeNull();
    });

    it('should clear last failed operation manually', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));
      const metadata = {
        id: 'test-op-8',
        name: 'Failed Operation',
        timestamp: Date.now(),
      };

      await expect(
        manager.executeWithRetry(operation, metadata, {
          maxAttempts: 1,
          initialDelay: 10,
          maxDelay: 10,
          backoffMultiplier: 1,
        })
      ).rejects.toBeTruthy();

      expect(manager.getLastFailedOperation()).toBeTruthy();

      manager.clearLastFailedOperation();
      expect(manager.getLastFailedOperation()).toBeNull();
    });
  });

  describe('error type detection', () => {
    it('should retry on 5xx status codes', async () => {
      const operation = jest.fn().mockRejectedValue({ status: 503 });
      const metadata = {
        id: 'test-op-9',
        name: '5xx Test',
        timestamp: Date.now(),
      };

      await expect(
        manager.executeWithRetry(operation, metadata, {
          ...DEFAULT_RETRY_CONFIG,
          maxAttempts: 2,
          initialDelay: 10,
        })
      ).rejects.toBeTruthy();

      // Should retry at least once
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx status codes (except 429)', async () => {
      const operation = jest.fn().mockRejectedValue({ status: 404 });
      const metadata = {
        id: 'test-op-10',
        name: '4xx Test',
        timestamp: Date.now(),
      };

      await expect(
        manager.executeWithRetry(operation, metadata, {
          ...DEFAULT_RETRY_CONFIG,
          initialDelay: 10,
        })
      ).rejects.toBeTruthy();

      // Should not retry
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 (rate limit)', async () => {
      const operation = jest.fn().mockRejectedValue({ status: 429 });
      const metadata = {
        id: 'test-op-11',
        name: 'Rate Limit Test',
        timestamp: Date.now(),
      };

      await expect(
        manager.executeWithRetry(operation, metadata, {
          ...DEFAULT_RETRY_CONFIG,
          maxAttempts: 2,
          initialDelay: 10,
        })
      ).rejects.toBeTruthy();

      // Should retry
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});

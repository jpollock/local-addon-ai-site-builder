/**
 * Tests for rate limiter
 */

import { RateLimiter } from '../../src/main/utils/rate-limiter';

describe('Rate Limiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  afterEach(() => {
    limiter.clear();
  });

  describe('Basic rate limiting', () => {
    it('should allow requests within limit', () => {
      limiter.configure('test-channel', 5, 60000); // 5 requests per minute

      for (let i = 0; i < 5; i++) {
        const result = limiter.checkLimit('test-channel');
        expect(result.allowed).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      limiter.configure('test-channel', 3, 60000); // 3 requests per minute

      // First 3 should pass
      for (let i = 0; i < 3; i++) {
        const result = limiter.checkLimit('test-channel');
        expect(result.allowed).toBe(true);
      }

      // 4th should be blocked
      const blocked = limiter.checkLimit('test-channel');
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfter).toBeGreaterThan(0);
    });

    it('should provide retryAfter time', () => {
      limiter.configure('test-channel', 1, 5000); // 1 request per 5 seconds

      limiter.checkLimit('test-channel'); // First request
      const blocked = limiter.checkLimit('test-channel'); // Second request (blocked)

      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfter).toBeGreaterThan(0);
      expect(blocked.retryAfter).toBeLessThanOrEqual(5);
    });
  });

  describe('Sliding window', () => {
    it('should reset after time window passes', (done) => {
      limiter.configure('test-channel', 2, 100); // 2 requests per 100ms

      // Use up the limit
      limiter.checkLimit('test-channel');
      limiter.checkLimit('test-channel');

      // Should be blocked now
      expect(limiter.checkLimit('test-channel').allowed).toBe(false);

      // Wait for window to pass
      setTimeout(() => {
        const result = limiter.checkLimit('test-channel');
        expect(result.allowed).toBe(true);
        done();
      }, 150);
    }, 500);
  });

  describe('Channel isolation', () => {
    it('should isolate limits per channel', () => {
      limiter.configure('channel-1', 2, 60000);
      limiter.configure('channel-2', 2, 60000);

      // Use up channel-1 limit
      limiter.checkLimit('channel-1');
      limiter.checkLimit('channel-1');
      expect(limiter.checkLimit('channel-1').allowed).toBe(false);

      // Channel-2 should still work
      expect(limiter.checkLimit('channel-2').allowed).toBe(true);
      expect(limiter.checkLimit('channel-2').allowed).toBe(true);
    });
  });

  describe('Usage tracking', () => {
    it('should track current usage', () => {
      limiter.configure('test-channel', 10, 60000);

      limiter.checkLimit('test-channel');
      limiter.checkLimit('test-channel');
      limiter.checkLimit('test-channel');

      const usage = limiter.getUsage('test-channel');
      expect(usage).not.toBeNull();
      expect(usage!.current).toBe(3);
      expect(usage!.max).toBe(10);
      expect(usage!.windowMs).toBe(60000);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old entries', (done) => {
      limiter.configure('test-channel', 5, 100);

      limiter.checkLimit('test-channel');
      limiter.checkLimit('test-channel');

      // Initially should have 2 requests
      expect(limiter.getUsage('test-channel')!.current).toBe(2);

      // After cleanup and window expiry, should be clean
      setTimeout(() => {
        limiter.cleanup();
        const usage = limiter.getUsage('test-channel');
        expect(usage!.current).toBe(0);
        done();
      }, 150);
    }, 500);
  });
});

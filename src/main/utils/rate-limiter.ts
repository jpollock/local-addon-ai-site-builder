/**
 * Rate Limiter - Sliding window rate limiting for IPC handlers
 *
 * Prevents abuse by limiting the number of requests per time window.
 * Uses a sliding window algorithm for accurate rate limiting.
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RequestRecord {
  timestamp: number;
  count: number;
}

/**
 * Sliding window rate limiter
 */
export class RateLimiter {
  private requests: Map<string, RequestRecord[]> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  /**
   * Configure rate limit for a specific channel
   */
  configure(channel: string, maxRequests: number, windowMs: number): void {
    this.configs.set(channel, { maxRequests, windowMs });
  }

  /**
   * Check if a request should be allowed
   * Returns { allowed: true } or { allowed: false, retryAfter: number }
   */
  checkLimit(channel: string): { allowed: boolean; retryAfter?: number } {
    const config = this.configs.get(channel);

    if (!config) {
      // No rate limit configured for this channel
      return { allowed: true };
    }

    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get existing requests for this channel
    let channelRequests = this.requests.get(channel) || [];

    // Remove requests outside the current window
    channelRequests = channelRequests.filter((req) => req.timestamp > windowStart);

    // Count total requests in the window
    const totalRequests = channelRequests.reduce((sum, req) => sum + req.count, 0);

    if (totalRequests >= config.maxRequests) {
      // Rate limit exceeded
      // Calculate when the oldest request will fall out of the window
      const oldestRequest = channelRequests[0];
      const retryAfter = oldestRequest
        ? Math.ceil((oldestRequest.timestamp + config.windowMs - now) / 1000)
        : Math.ceil(config.windowMs / 1000);

      return { allowed: false, retryAfter };
    }

    // Allow the request and record it
    channelRequests.push({
      timestamp: now,
      count: 1,
    });

    this.requests.set(channel, channelRequests);

    return { allowed: true };
  }

  /**
   * Get current usage for a channel
   */
  getUsage(channel: string): { current: number; max: number; windowMs: number } | null {
    const config = this.configs.get(channel);

    if (!config) {
      return null;
    }

    const now = Date.now();
    const windowStart = now - config.windowMs;

    const channelRequests = this.requests.get(channel) || [];
    const activeRequests = channelRequests.filter((req) => req.timestamp > windowStart);
    const totalRequests = activeRequests.reduce((sum, req) => sum + req.count, 0);

    return {
      current: totalRequests,
      max: config.maxRequests,
      windowMs: config.windowMs,
    };
  }

  /**
   * Clear all rate limit data (useful for testing)
   */
  clear(): void {
    this.requests.clear();
  }

  /**
   * Clear rate limit data for a specific channel
   */
  clearChannel(channel: string): void {
    this.requests.delete(channel);
  }

  /**
   * Cleanup old entries (should be called periodically)
   */
  cleanup(): void {
    const now = Date.now();

    for (const [channel, requests] of this.requests.entries()) {
      const config = this.configs.get(channel);

      if (!config) {
        continue;
      }

      const windowStart = now - config.windowMs;
      const activeRequests = requests.filter((req) => req.timestamp > windowStart);

      if (activeRequests.length === 0) {
        this.requests.delete(channel);
      } else {
        this.requests.set(channel, activeRequests);
      }
    }
  }
}

/**
 * Create a singleton rate limiter instance
 */
const rateLimiter = new RateLimiter();

// Configure rate limits for different channels
// Format: channel name, max requests, window in milliseconds

// Critical operations - very restrictive
rateLimiter.configure('CREATE_SITE', 5, 5 * 60 * 1000); // 5 per 5 minutes
rateLimiter.configure('START_CONVERSATION', 10, 5 * 60 * 1000); // 10 per 5 minutes

// AI operations - moderate restrictions
rateLimiter.configure('SEND_MESSAGE', 20, 60 * 1000); // 20 per minute
rateLimiter.configure('VALIDATE_API_KEY', 10, 60 * 1000); // 10 per minute
rateLimiter.configure('ANALYZE_FIGMA', 10, 60 * 1000); // 10 per minute
rateLimiter.configure('GET_DYNAMIC_OPTIONS', 20, 60 * 1000); // 20 per minute

// OAuth operations - moderate restrictions
rateLimiter.configure('START_GOOGLE_OAUTH', 5, 5 * 60 * 1000); // 5 per 5 minutes
rateLimiter.configure('START_FIGMA_OAUTH', 5, 5 * 60 * 1000); // 5 per 5 minutes

// Figma operations
rateLimiter.configure('CONNECT_FIGMA', 10, 60 * 1000); // 10 per minute

// Read operations - less restrictive
rateLimiter.configure('GET_SETTINGS', 60, 60 * 1000); // 60 per minute
rateLimiter.configure('GET_PROJECTS', 60, 60 * 1000); // 60 per minute
rateLimiter.configure('GET_PROJECT', 60, 60 * 1000); // 60 per minute
rateLimiter.configure('GET_CONVERSATION_HISTORY', 60, 60 * 1000); // 60 per minute
rateLimiter.configure('GET_PROVIDERS', 60, 60 * 1000); // 60 per minute
rateLimiter.configure('GET_GOOGLE_OAUTH_STATUS', 60, 60 * 1000); // 60 per minute
rateLimiter.configure('GET_FIGMA_OAUTH_STATUS', 60, 60 * 1000); // 60 per minute
rateLimiter.configure('GET_FIGMA_TOKEN_STATUS', 60, 60 * 1000); // 60 per minute

// Write operations - moderate restrictions
rateLimiter.configure('UPDATE_SETTINGS', 30, 60 * 1000); // 30 per minute
rateLimiter.configure('UPDATE_PROJECT', 30, 60 * 1000); // 30 per minute
rateLimiter.configure('SET_ACTIVE_PROVIDER', 30, 60 * 1000); // 30 per minute
rateLimiter.configure('SET_GEMINI_AUTH_MODE', 30, 60 * 1000); // 30 per minute
rateLimiter.configure('SET_FIGMA_AUTH_MODE', 30, 60 * 1000); // 30 per minute

// Disconnect operations
rateLimiter.configure('DISCONNECT_GOOGLE_OAUTH', 10, 60 * 1000); // 10 per minute
rateLimiter.configure('DISCONNECT_FIGMA_OAUTH', 10, 60 * 1000); // 10 per minute

// Cleanup old entries every 5 minutes
setInterval(
  () => {
    rateLimiter.cleanup();
  },
  5 * 60 * 1000
);

export { rateLimiter };

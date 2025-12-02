/**
 * Circuit Breaker Pattern - Prevents cascading failures
 *
 * Implements the circuit breaker pattern to protect against repeated
 * failures in external service calls. Tracks failures and temporarily
 * blocks requests when a threshold is exceeded.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, all requests fail fast
 * - HALF_OPEN: Testing if service has recovered
 */

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing fast
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes in half-open before closing
  timeout: number; // Time to wait before attempting recovery (ms)
  monitoringWindowMs: number; // Time window to track failures (ms)
  name?: string; // Name for logging
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 failures
  successThreshold: 2, // Close after 2 successes in half-open
  timeout: 30000, // 30 seconds
  monitoringWindowMs: 60000, // 60 seconds
  name: 'CircuitBreaker',
};

/**
 * Error thrown when circuit is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(name: string, nextAttemptTime: number) {
    super(
      `Circuit breaker '${name}' is OPEN. Service unavailable. Next attempt at ${new Date(nextAttemptTime).toISOString()}`
    );
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextAttemptTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

/**
 * Failure record for tracking
 */
interface FailureRecord {
  timestamp: number;
  error: string;
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private lastSuccessTime: number = 0;
  private nextAttemptTime: number = 0;
  private recentFailures: FailureRecord[] = [];
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private config: CircuitBreakerConfig;
  private logger?: {
    info?: (msg: string) => void;
    warn?: (msg: string) => void;
    error?: (msg: string, err?: any) => void;
  };

  constructor(
    config: Partial<CircuitBreakerConfig> = {},
    logger?: {
      info?: (msg: string) => void;
      warn?: (msg: string) => void;
      error?: (msg: string, err?: any) => void;
    }
  ) {
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
    this.logger = logger;
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we should attempt to reset from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) {
      this.transitionToHalfOpen();
    }

    // If circuit is OPEN, fail fast
    if (this.state === CircuitState.OPEN) {
      const error = new CircuitBreakerOpenError(
        this.config.name || 'CircuitBreaker',
        this.nextAttemptTime
      );
      this.logger?.warn?.(
        `[${this.config.name}] Circuit is OPEN, failing fast. Next attempt: ${new Date(this.nextAttemptTime).toISOString()}`
      );
      throw error;
    }

    this.totalRequests++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error: any) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime || null,
      lastSuccessTime: this.lastSuccessTime || null,
      nextAttemptTime: this.nextAttemptTime || null,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.lastSuccessTime = 0;
    this.nextAttemptTime = 0;
    this.recentFailures = [];
    this.logger?.info?.(`[${this.config.name}] Circuit breaker reset`);
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.totalSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      this.logger?.info?.(
        `[${this.config.name}] Success in HALF_OPEN state (${this.successCount}/${this.config.successThreshold})`
      );

      // If we have enough successes, close the circuit
      if (this.successCount >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Clear failure count on success in CLOSED state
      this.failureCount = 0;
      this.recentFailures = [];
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: any): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.totalFailures++;

    // Record the failure
    this.recentFailures.push({
      timestamp: now,
      error: error.message || String(error),
    });

    // Clean up old failures outside monitoring window
    this.recentFailures = this.recentFailures.filter(
      (f) => now - f.timestamp < this.config.monitoringWindowMs
    );

    this.failureCount = this.recentFailures.length;

    this.logger?.error?.(
      `[${this.config.name}] Failure recorded (${this.failureCount}/${this.config.failureThreshold})`,
      error
    );

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN state reopens the circuit
      this.transitionToOpen();
    } else if (
      this.state === CircuitState.CLOSED &&
      this.failureCount >= this.config.failureThreshold
    ) {
      // Too many failures, open the circuit
      this.transitionToOpen();
    }
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    return Date.now() >= this.nextAttemptTime;
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.recentFailures = [];
    this.nextAttemptTime = 0;
    this.logger?.info?.(`[${this.config.name}] Circuit transitioned to CLOSED`);
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.successCount = 0;
    this.nextAttemptTime = Date.now() + this.config.timeout;
    this.logger?.warn?.(
      `[${this.config.name}] Circuit transitioned to OPEN. Next attempt: ${new Date(this.nextAttemptTime).toISOString()}`
    );
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.successCount = 0;
    this.logger?.info?.(
      `[${this.config.name}] Circuit transitioned to HALF_OPEN (testing recovery)`
    );
  }
}

/**
 * Check if an error is a circuit breaker open error
 */
export function isCircuitBreakerOpenError(error: unknown): boolean {
  return (
    error instanceof CircuitBreakerOpenError ||
    (error as any)?.name === 'CircuitBreakerOpenError'
  );
}

/**
 * Circuit breaker registry for managing multiple breakers
 */
export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker
   */
  getOrCreate(
    name: string,
    config?: Partial<CircuitBreakerConfig>,
    logger?: any
  ): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(
        name,
        new CircuitBreaker({ ...config, name }, logger)
      );
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get a circuit breaker by name
   */
  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  /**
   * Get all circuit breakers
   */
  getAll(): Map<string, CircuitBreaker> {
    return this.breakers;
  }

  /**
   * Get stats for all circuit breakers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// Global registry instance
let registryInstance: CircuitBreakerRegistry | null = null;

/**
 * Get the global circuit breaker registry
 */
export function getCircuitBreakerRegistry(): CircuitBreakerRegistry {
  if (!registryInstance) {
    registryInstance = new CircuitBreakerRegistry();
  }
  return registryInstance;
}

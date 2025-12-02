/**
 * Performance Monitor - Tracks API call performance metrics
 *
 * Collects and aggregates performance data for external API calls:
 * - Call latencies (p50, p95, p99)
 * - Success/failure rates
 * - Timeout occurrences
 * - Retry attempts
 * - Circuit breaker trips
 * - Cache hit rates
 */

/**
 * Performance metric data point
 */
interface MetricDataPoint {
  timestamp: number;
  duration: number;
  success: boolean;
  operation: string;
  provider?: string;
  error?: string;
  retryCount?: number;
  cacheHit?: boolean;
  authMode?: string;
}

/**
 * Aggregated performance metrics
 */
export interface PerformanceMetrics {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  retryCount: number;
  circuitBreakerTrips: number;
  averageDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  successRate: number;
  errorRate: number;
  slowOperations: number; // Operations > 5s
  cacheHits?: number;
  cacheMisses?: number;
  cacheHitRate?: number;
}

/**
 * Operation-specific metrics
 */
export interface OperationMetrics {
  operation: string;
  provider?: string;
  metrics: PerformanceMetrics;
  recentErrors: Array<{ timestamp: number; error: string }>;
  lastSuccess?: number;
  lastFailure?: number;
}

/**
 * Performance monitor configuration
 */
export interface PerformanceMonitorConfig {
  maxDataPoints: number; // Maximum data points to keep in memory
  slowOperationThreshold: number; // Threshold for slow operations (ms)
  highErrorRateThreshold: number; // Threshold for high error rate (0-1)
  name?: string;
}

/**
 * Default configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceMonitorConfig = {
  maxDataPoints: 1000,
  slowOperationThreshold: 5000, // 5 seconds
  highErrorRateThreshold: 0.1, // 10%
  name: 'PerformanceMonitor',
};

/**
 * Performance Monitor
 */
export class PerformanceMonitor {
  private dataPoints: MetricDataPoint[] = [];
  private config: PerformanceMonitorConfig;
  private timeoutCount: number = 0;
  private retryCount: number = 0;
  private circuitBreakerTrips: number = 0;
  private logger?: {
    info?: (msg: string) => void;
    warn?: (msg: string) => void;
    error?: (msg: string, err?: any) => void;
  };

  constructor(
    config: Partial<PerformanceMonitorConfig> = {},
    logger?: {
      info?: (msg: string) => void;
      warn?: (msg: string) => void;
      error?: (msg: string, err?: any) => void;
    }
  ) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
    this.logger = logger;
  }

  /**
   * Record a performance metric
   */
  record(data: {
    operation: string;
    duration: number;
    success: boolean;
    provider?: string;
    error?: string;
    retryCount?: number;
    cacheHit?: boolean;
    authMode?: string;
  }): void {
    const dataPoint: MetricDataPoint = {
      timestamp: Date.now(),
      operation: data.operation,
      duration: data.duration,
      success: data.success,
      provider: data.provider,
      error: data.error,
      retryCount: data.retryCount,
      cacheHit: data.cacheHit,
      authMode: data.authMode,
    };

    this.dataPoints.push(dataPoint);

    // Update counters
    if (data.retryCount && data.retryCount > 0) {
      this.retryCount += data.retryCount;
    }

    // Trim old data points if we exceed max
    if (this.dataPoints.length > this.config.maxDataPoints) {
      this.dataPoints = this.dataPoints.slice(-this.config.maxDataPoints);
    }

    // Log slow operations
    if (data.duration > this.config.slowOperationThreshold) {
      this.logger?.warn?.(
        `[PERFORMANCE] Slow operation: ${data.operation} took ${(data.duration / 1000).toFixed(1)}s`
      );
    }

    // Log operation result
    const status = data.success ? 'success' : 'failure';
    const durationStr = (data.duration / 1000).toFixed(1);
    const cacheStr = data.cacheHit ? ' (cache hit)' : '';
    this.logger?.info?.(
      `[PERFORMANCE] ${data.operation}: ${durationStr}s (${status})${cacheStr}`
    );

    // Check for high error rate
    const metrics = this.getMetrics();
    if (metrics.errorRate > this.config.highErrorRateThreshold) {
      this.logger?.warn?.(
        `[PERFORMANCE] High error rate detected: ${(metrics.errorRate * 100).toFixed(1)}%`
      );
    }
  }

  /**
   * Record a timeout
   */
  recordTimeout(operation: string, provider?: string): void {
    this.timeoutCount++;
    this.logger?.warn?.(
      `[PERFORMANCE] Timeout: ${operation}${provider ? ` (${provider})` : ''}`
    );
  }

  /**
   * Record a circuit breaker trip
   */
  recordCircuitBreakerTrip(breaker: string): void {
    this.circuitBreakerTrips++;
    this.logger?.warn?.(
      `[PERFORMANCE] Circuit breaker tripped: ${breaker}`
    );
  }

  /**
   * Get overall performance metrics
   */
  getMetrics(): PerformanceMetrics {
    if (this.dataPoints.length === 0) {
      return this.getEmptyMetrics();
    }

    const successCount = this.dataPoints.filter((d) => d.success).length;
    const failureCount = this.dataPoints.filter((d) => !d.success).length;
    const durations = this.dataPoints.map((d) => d.duration).sort((a, b) => a - b);
    const slowOperations = this.dataPoints.filter(
      (d) => d.duration > this.config.slowOperationThreshold
    ).length;

    const cacheDataPoints = this.dataPoints.filter(
      (d) => d.cacheHit !== undefined
    );
    const cacheHits = cacheDataPoints.filter((d) => d.cacheHit).length;
    const cacheMisses = cacheDataPoints.filter((d) => !d.cacheHit).length;

    return {
      totalRequests: this.dataPoints.length,
      successCount,
      failureCount,
      timeoutCount: this.timeoutCount,
      retryCount: this.retryCount,
      circuitBreakerTrips: this.circuitBreakerTrips,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50Duration: this.calculatePercentile(durations, 0.5),
      p95Duration: this.calculatePercentile(durations, 0.95),
      p99Duration: this.calculatePercentile(durations, 0.99),
      successRate: successCount / this.dataPoints.length,
      errorRate: failureCount / this.dataPoints.length,
      slowOperations,
      cacheHits: cacheHits > 0 ? cacheHits : undefined,
      cacheMisses: cacheMisses > 0 ? cacheMisses : undefined,
      cacheHitRate:
        cacheDataPoints.length > 0
          ? cacheHits / cacheDataPoints.length
          : undefined,
    };
  }

  /**
   * Get metrics by operation
   */
  getMetricsByOperation(): Record<string, OperationMetrics> {
    const operationMap: Record<string, MetricDataPoint[]> = {};

    // Group data points by operation
    for (const point of this.dataPoints) {
      const key = point.provider
        ? `${point.operation}:${point.provider}`
        : point.operation;

      if (!operationMap[key]) {
        operationMap[key] = [];
      }
      operationMap[key].push(point);
    }

    // Calculate metrics for each operation
    const result: Record<string, OperationMetrics> = {};
    for (const [key, points] of Object.entries(operationMap)) {
      const metrics = this.calculateMetricsForPoints(points);
      const recentErrors = points
        .filter((p) => !p.success && p.error)
        .slice(-5)
        .map((p) => ({ timestamp: p.timestamp, error: p.error! }));

      const successPoints = points.filter((p) => p.success);
      const failurePoints = points.filter((p) => !p.success);

      result[key] = {
        operation: points[0].operation,
        provider: points[0].provider,
        metrics,
        recentErrors,
        lastSuccess:
          successPoints.length > 0
            ? Math.max(...successPoints.map((p) => p.timestamp))
            : undefined,
        lastFailure:
          failurePoints.length > 0
            ? Math.max(...failurePoints.map((p) => p.timestamp))
            : undefined,
      };
    }

    return result;
  }

  /**
   * Get metrics for a specific provider
   */
  getMetricsByProvider(provider: string): PerformanceMetrics {
    const providerPoints = this.dataPoints.filter((d) => d.provider === provider);
    return this.calculateMetricsForPoints(providerPoints);
  }

  /**
   * Export metrics to JSON (for debugging/logging)
   */
  exportMetrics(): {
    overall: PerformanceMetrics;
    byOperation: Record<string, OperationMetrics>;
    timestamp: number;
  } {
    return {
      overall: this.getMetrics(),
      byOperation: this.getMetricsByOperation(),
      timestamp: Date.now(),
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.dataPoints = [];
    this.timeoutCount = 0;
    this.retryCount = 0;
    this.circuitBreakerTrips = 0;
    this.logger?.info?.(`[${this.config.name}] Metrics cleared`);
  }

  /**
   * Calculate metrics for a set of data points
   */
  private calculateMetricsForPoints(points: MetricDataPoint[]): PerformanceMetrics {
    if (points.length === 0) {
      return this.getEmptyMetrics();
    }

    const successCount = points.filter((d) => d.success).length;
    const failureCount = points.filter((d) => !d.success).length;
    const durations = points.map((d) => d.duration).sort((a, b) => a - b);
    const slowOperations = points.filter(
      (d) => d.duration > this.config.slowOperationThreshold
    ).length;

    const cachePoints = points.filter((d) => d.cacheHit !== undefined);
    const cacheHits = cachePoints.filter((d) => d.cacheHit).length;
    const cacheMisses = cachePoints.filter((d) => !d.cacheHit).length;

    const retryTotal = points.reduce(
      (sum, p) => sum + (p.retryCount || 0),
      0
    );

    return {
      totalRequests: points.length,
      successCount,
      failureCount,
      timeoutCount: 0, // Not tracked per operation
      retryCount: retryTotal,
      circuitBreakerTrips: 0, // Not tracked per operation
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50Duration: this.calculatePercentile(durations, 0.5),
      p95Duration: this.calculatePercentile(durations, 0.95),
      p99Duration: this.calculatePercentile(durations, 0.99),
      successRate: successCount / points.length,
      errorRate: failureCount / points.length,
      slowOperations,
      cacheHits: cacheHits > 0 ? cacheHits : undefined,
      cacheMisses: cacheMisses > 0 ? cacheMisses : undefined,
      cacheHitRate: cachePoints.length > 0 ? cacheHits / cachePoints.length : undefined,
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Get empty metrics (for when no data is available)
   */
  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      timeoutCount: 0,
      retryCount: 0,
      circuitBreakerTrips: 0,
      averageDuration: 0,
      p50Duration: 0,
      p95Duration: 0,
      p99Duration: 0,
      successRate: 0,
      errorRate: 0,
      slowOperations: 0,
    };
  }
}

/**
 * Performance monitor registry for managing multiple monitors
 */
export class PerformanceMonitorRegistry {
  private monitors: Map<string, PerformanceMonitor> = new Map();

  /**
   * Get or create a performance monitor
   */
  getOrCreate(
    name: string,
    config?: Partial<PerformanceMonitorConfig>,
    logger?: any
  ): PerformanceMonitor {
    if (!this.monitors.has(name)) {
      this.monitors.set(
        name,
        new PerformanceMonitor({ ...config, name }, logger)
      );
    }
    return this.monitors.get(name)!;
  }

  /**
   * Get a monitor by name
   */
  get(name: string): PerformanceMonitor | undefined {
    return this.monitors.get(name);
  }

  /**
   * Get all monitors
   */
  getAll(): Map<string, PerformanceMonitor> {
    return this.monitors;
  }

  /**
   * Export all metrics
   */
  exportAllMetrics(): Record<string, ReturnType<PerformanceMonitor['exportMetrics']>> {
    const result: Record<string, ReturnType<PerformanceMonitor['exportMetrics']>> = {};
    for (const [name, monitor] of this.monitors.entries()) {
      result[name] = monitor.exportMetrics();
    }
    return result;
  }

  /**
   * Clear all monitors
   */
  clearAll(): void {
    for (const monitor of this.monitors.values()) {
      monitor.clear();
    }
  }
}

// Global registry instance
let registryInstance: PerformanceMonitorRegistry | null = null;

/**
 * Get the global performance monitor registry
 */
export function getPerformanceMonitorRegistry(): PerformanceMonitorRegistry {
  if (!registryInstance) {
    registryInstance = new PerformanceMonitorRegistry();
  }
  return registryInstance;
}

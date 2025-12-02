/**
 * Recovery Manager - Handles error recovery and retry strategies
 *
 * Provides automatic retry logic for transient failures and
 * manages recovery flows for different error scenarios.
 */

import { ErrorCategory, UserFriendlyError } from './error-messages';

/**
 * Retry strategy configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors?: ErrorCategory[];
}

/**
 * Default retry configurations for different scenarios
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    ErrorCategory.NETWORK,
    ErrorCategory.TIMEOUT,
    ErrorCategory.RATE_LIMIT,
    ErrorCategory.API_ERROR, // Only 5xx errors
  ],
};

/**
 * Retry config for rate limit scenarios (longer delays)
 */
export const RATE_LIMIT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
  initialDelay: 5000,
  maxDelay: 60000,
  backoffMultiplier: 2,
  retryableErrors: [ErrorCategory.RATE_LIMIT],
};

/**
 * Retry config for timeout scenarios
 */
export const TIMEOUT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 1, // Only retry once for timeouts
  initialDelay: 2000,
  maxDelay: 2000,
  backoffMultiplier: 1,
  retryableErrors: [ErrorCategory.TIMEOUT],
};

/**
 * Operation metadata for recovery
 */
export interface OperationMetadata {
  id: string;
  name: string;
  context?: any;
  timestamp: number;
}

/**
 * Last failed operation state (for retry)
 */
interface FailedOperation {
  operation: OperationMetadata;
  error: UserFriendlyError;
  attemptCount: number;
}

/**
 * Recovery Manager class
 */
export class RecoveryManager {
  private lastFailedOperation: FailedOperation | null = null;
  private operationHistory: Map<string, FailedOperation> = new Map();

  /**
   * Execute an operation with automatic retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    metadata: OperationMetadata,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: any;
    let attempt = 0;

    while (attempt < config.maxAttempts) {
      try {
        attempt++;
        const result = await operation();

        // Success - clear last failed operation if it was this one
        if (this.lastFailedOperation?.operation.id === metadata.id) {
          this.lastFailedOperation = null;
        }

        return result;
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        const shouldRetry = this.shouldRetry(error, config, attempt);

        if (!shouldRetry || attempt >= config.maxAttempts) {
          // Store failed operation for manual retry
          this.storeFailedOperation(metadata, error, attempt);
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, config);

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Retry the last failed operation
   */
  async retryLastOperation<T>(
    operationExecutor: (metadata: OperationMetadata) => Promise<T>
  ): Promise<T | null> {
    if (!this.lastFailedOperation) {
      return null;
    }

    const failedOp = this.lastFailedOperation;
    const { operation } = failedOp;

    try {
      const result = await operationExecutor(operation);
      this.lastFailedOperation = null;
      return result;
    } catch (error) {
      failedOp.attemptCount++;
      failedOp.error = error as UserFriendlyError;
      throw error;
    }
  }

  /**
   * Get the last failed operation
   */
  getLastFailedOperation(): FailedOperation | null {
    return this.lastFailedOperation;
  }

  /**
   * Clear the last failed operation
   */
  clearLastFailedOperation(): void {
    this.lastFailedOperation = null;
  }

  /**
   * Get operation from history by ID
   */
  getOperationFromHistory(operationId: string): FailedOperation | undefined {
    return this.operationHistory.get(operationId);
  }

  /**
   * Clear operation history
   */
  clearOperationHistory(): void {
    this.operationHistory.clear();
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: any, config: RetryConfig, attempt: number): boolean {
    // Don't retry if we've hit max attempts
    if (attempt >= config.maxAttempts) {
      return false;
    }

    // Check if error has retryable property
    if (error && typeof error === 'object' && 'retryable' in error) {
      return Boolean(error.retryable);
    }

    // Check error category
    if (error && typeof error === 'object' && 'category' in error) {
      const category = error.category as ErrorCategory;
      return config.retryableErrors?.includes(category) ?? false;
    }

    // Check HTTP status codes
    if (error && typeof error === 'object') {
      const status = this.getStatusCode(error);
      if (status) {
        // Retry on 5xx errors (server errors)
        if (status >= 500 && status < 600) return true;
        // Retry on 429 (rate limit)
        if (status === 429) return true;
        // Don't retry 4xx errors (client errors)
        if (status >= 400 && status < 500) return false;
      }
    }

    // Check for network errors
    if (this.isNetworkError(error)) {
      return true;
    }

    // Default: don't retry
    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelay);
  }

  /**
   * Store failed operation for manual retry
   */
  private storeFailedOperation(
    metadata: OperationMetadata,
    error: any,
    attemptCount: number
  ): void {
    const failedOp: FailedOperation = {
      operation: metadata,
      error: error as UserFriendlyError,
      attemptCount,
    };

    this.lastFailedOperation = failedOp;
    this.operationHistory.set(metadata.id, failedOp);

    // Keep history limited to last 10 operations
    if (this.operationHistory.size > 10) {
      const firstKey = this.operationHistory.keys().next().value;
      if (firstKey !== undefined) {
        this.operationHistory.delete(firstKey);
      }
    }
  }

  /**
   * Extract HTTP status code from error
   */
  private getStatusCode(error: any): number | undefined {
    if ('status' in error && typeof error.status === 'number') {
      return error.status;
    }
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      return error.statusCode;
    }
    return undefined;
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: any): boolean {
    const message = error?.message || String(error);
    const networkKeywords = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'network', 'fetch failed'];
    return networkKeywords.some((keyword) => message.includes(keyword));
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Global recovery manager instance
 */
let globalRecoveryManager: RecoveryManager | null = null;

/**
 * Get or create the global recovery manager
 */
export function getRecoveryManager(): RecoveryManager {
  if (!globalRecoveryManager) {
    globalRecoveryManager = new RecoveryManager();
  }
  return globalRecoveryManager;
}

/**
 * Retry wrapper for async operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  metadata: OperationMetadata,
  config?: Partial<RetryConfig>
): Promise<T> {
  const manager = getRecoveryManager();
  const finalConfig = config ? { ...DEFAULT_RETRY_CONFIG, ...config } : DEFAULT_RETRY_CONFIG;
  return manager.executeWithRetry(operation, metadata, finalConfig);
}

/**
 * Auto-save conversation state before risky operations
 */
export async function saveConversationState(
  conversationId: string,
  state: any,
  storage: any
): Promise<void> {
  try {
    await storage.saveConversationState(conversationId, state);
  } catch (error) {
    console.error('[Recovery] Failed to save conversation state:', error);
    // Don't throw - saving state is best-effort
  }
}

/**
 * Auto-save project progress before risky operations
 */
export async function saveProjectProgress(
  projectId: string,
  progress: any,
  storage: any
): Promise<void> {
  try {
    await storage.saveProjectProgress(projectId, progress);
  } catch (error) {
    console.error('[Recovery] Failed to save project progress:', error);
    // Don't throw - saving progress is best-effort
  }
}

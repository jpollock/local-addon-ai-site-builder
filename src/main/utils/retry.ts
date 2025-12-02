/**
 * Retry Utility - Implements exponential backoff retry logic
 *
 * Provides configurable retry strategies for handling transient failures
 * in external API calls. Supports exponential backoff with jitter.
 */

/**
 * Retry configuration options
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  retryableStatusCodes: number[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000, // 1s
  maxDelay: 8000, // 8s
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'ENETUNREACH',
    'EAI_AGAIN',
  ],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Error thrown when all retry attempts are exhausted
 */
export class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public lastError: Error
  ) {
    super(message);
    this.name = 'RetryExhaustedError';
  }
}

/**
 * Check if an error should be retried
 */
export function isRetryableError(error: any, config: RetryConfig): boolean {
  // Check for network errors
  if (error.code && config.retryableErrors.includes(error.code)) {
    return true;
  }

  // Check for HTTP status codes
  if (error.status && config.retryableStatusCodes.includes(error.status)) {
    return true;
  }

  // Check for specific error messages
  const errorMessage = error.message?.toLowerCase() || '';
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('econnreset') ||
    errorMessage.includes('socket hang up')
  ) {
    return true;
  }

  // Don't retry auth errors
  if (error.status === 401 || error.status === 403) {
    return false;
  }

  // Don't retry client errors (except 429)
  if (error.status >= 400 && error.status < 500 && error.status !== 429) {
    return false;
  }

  return false;
}

/**
 * Calculate delay for next retry with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig, retryAfterHeader?: number): number {
  // If we have a Retry-After header (e.g., from 429 response), use it
  if (retryAfterHeader && retryAfterHeader > 0) {
    // Cap at max delay for UX
    return Math.min(retryAfterHeader * 1000, config.maxDelay);
  }

  // Exponential backoff: initialDelay * (backoffMultiplier ^ attempt)
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

  // Add jitter (randomness) to prevent thundering herd
  // Jitter is between 0% and 25% of the delay
  const jitter = cappedDelay * 0.25 * Math.random();

  return cappedDelay + jitter;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract Retry-After header from error if available
 */
function getRetryAfterHeader(error: any): number | undefined {
  // Check if error has response headers with Retry-After
  const retryAfter = error.response?.headers?.['retry-after'];
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds;
    }
  }
  return undefined;
}

/**
 * Retry an async operation with exponential backoff
 * @param fn - The async function to retry
 * @param config - Retry configuration (uses defaults if not provided)
 * @param logger - Optional logger for retry attempts
 * @returns Promise that resolves to the function result
 * @throws RetryExhaustedError if all attempts fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  logger?: { info?: (msg: string) => void; error?: (msg: string, err: any) => void }
): Promise<T> {
  const mergedConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error = new Error('Unknown error');
  let attempt = 0;

  while (attempt < mergedConfig.maxAttempts) {
    try {
      const result = await fn();
      if (attempt > 0 && logger?.info) {
        logger.info(`[Retry] Operation succeeded on attempt ${attempt + 1}`);
      }
      return result;
    } catch (error: any) {
      lastError = error;
      attempt++;

      // Check if we should retry
      const shouldRetry =
        attempt < mergedConfig.maxAttempts && isRetryableError(error, mergedConfig);

      if (!shouldRetry) {
        if (logger?.error) {
          logger.error(
            `[Retry] Operation failed after ${attempt} attempt(s), not retryable`,
            error
          );
        }
        throw error;
      }

      // Calculate delay for next attempt
      const retryAfter = getRetryAfterHeader(error);
      const delay = calculateDelay(attempt - 1, mergedConfig, retryAfter);

      if (logger?.info) {
        logger.info(
          `[Retry] Attempt ${attempt}/${mergedConfig.maxAttempts} failed, retrying in ${Math.round(delay)}ms...`
        );
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // All attempts exhausted
  if (logger?.error) {
    logger.error(`[Retry] All ${mergedConfig.maxAttempts} attempts exhausted`, lastError);
  }

  throw new RetryExhaustedError(
    `Operation failed after ${mergedConfig.maxAttempts} attempts`,
    mergedConfig.maxAttempts,
    lastError
  );
}

/**
 * Check if an error is a retry exhausted error
 */
export function isRetryExhaustedError(error: unknown): boolean {
  return error instanceof RetryExhaustedError || (error as any)?.name === 'RetryExhaustedError';
}

/**
 * Timeout Utility - Wraps promises with timeout handling
 *
 * Provides a generic way to add timeout constraints to any async operation.
 * Returns clear timeout errors when operations exceed the specified duration.
 */

/**
 * Error thrown when an operation times out
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout duration in milliseconds
 * @param errorMessage - Custom error message for timeout
 * @returns Promise that rejects with TimeoutError if timeout is exceeded
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new TimeoutError(
          errorMessage || `Operation timed out after ${timeoutMs}ms`
        )
      );
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}

/**
 * Check if an error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof TimeoutError || (error as any)?.name === 'TimeoutError';
}

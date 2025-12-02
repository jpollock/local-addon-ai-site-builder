/**
 * Error Messages Utility - Centralized error formatting and categorization
 *
 * Converts technical errors into user-friendly, actionable messages.
 * Provides consistent error handling across the addon.
 */

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  NETWORK = 'network',
  AUTH = 'auth',
  VALIDATION = 'validation',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  API_ERROR = 'api_error',
  INTERNAL = 'internal',
  FILE_SYSTEM = 'file_system',
  OAUTH = 'oauth',
}

/**
 * User-friendly error with actionable guidance
 */
export interface UserFriendlyError {
  category: ErrorCategory;
  title: string;
  message: string;
  action: string; // What user should do
  code?: string; // Error code for debugging
  technical?: string; // Technical details (for logs)
  recoverable?: boolean; // Can this error be recovered automatically?
  retryable?: boolean; // Should user retry this operation?
}

/**
 * Format an error into a user-friendly message
 */
export function formatError(error: unknown, context?: string): UserFriendlyError {
  // Handle null/undefined
  if (!error) {
    return {
      category: ErrorCategory.INTERNAL,
      title: 'Unknown Error',
      message: 'An unexpected error occurred.',
      action: 'Please try again. If the problem persists, contact support.',
      recoverable: false,
      retryable: true,
    };
  }

  // Extract error details
  const errorMessage = getErrorMessage(error);
  const errorCode = getErrorCode(error);
  const statusCode = getStatusCode(error);

  // Categorize and format based on error type
  if (isNetworkError(error, errorMessage)) {
    return formatNetworkError(error, errorMessage);
  }

  if (isAuthError(error, errorMessage, statusCode)) {
    return formatAuthError(error, errorMessage, context);
  }

  if (isTimeoutError(error, errorMessage)) {
    return formatTimeoutError(error, errorMessage);
  }

  if (isRateLimitError(error, errorMessage, statusCode)) {
    return formatRateLimitError(error, errorMessage);
  }

  if (isValidationError(error, errorMessage)) {
    return formatValidationError(error, errorMessage);
  }

  if (isOAuthError(error, errorMessage)) {
    return formatOAuthError(error, errorMessage);
  }

  if (isFileSystemError(error, errorMessage)) {
    return formatFileSystemError(error, errorMessage);
  }

  // API errors (4xx, 5xx)
  if (statusCode && statusCode >= 400) {
    return formatAPIError(error, errorMessage, statusCode);
  }

  // Default internal error
  return {
    category: ErrorCategory.INTERNAL,
    title: 'Unexpected Error',
    message: 'An unexpected error occurred while processing your request.',
    action: 'Please try again. If the problem persists, check the logs for details.',
    code: errorCode,
    technical: errorMessage,
    recoverable: false,
    retryable: true,
  };
}

/**
 * Network error formatting
 */
function formatNetworkError(error: unknown, message: string): UserFriendlyError {
  return {
    category: ErrorCategory.NETWORK,
    title: 'Connection Failed',
    message: 'Unable to connect to the API. Please check your internet connection.',
    action:
      "Verify your internet connection and try again. If you're behind a firewall or proxy, check your network settings.",
    technical: message,
    recoverable: true,
    retryable: true,
  };
}

/**
 * Authentication error formatting
 */
function formatAuthError(error: unknown, message: string, context?: string): UserFriendlyError {
  const contextHint = context ? ` for ${context}` : '';

  // Check if it's an API key issue
  if (message.includes('API') || message.includes('api')) {
    return {
      category: ErrorCategory.AUTH,
      title: 'Invalid API Key',
      message: `Your API key${contextHint} appears to be invalid or expired.`,
      action:
        "Please check your API key in Settings and ensure it's correct. You can get a new key from your provider's dashboard.",
      technical: message,
      recoverable: false,
      retryable: false,
    };
  }

  // OAuth/Token issue
  return {
    category: ErrorCategory.AUTH,
    title: 'Authentication Failed',
    message: `Your credentials${contextHint} are invalid or have expired.`,
    action: 'Please sign in again or check your credentials in Settings.',
    technical: message,
    recoverable: false,
    retryable: false,
  };
}

/**
 * Timeout error formatting
 */
function formatTimeoutError(error: unknown, message: string): UserFriendlyError {
  return {
    category: ErrorCategory.TIMEOUT,
    title: 'Request Timed Out',
    message: 'The request took too long to complete (exceeded 60 seconds).',
    action: 'The service may be experiencing high load. Please wait a moment and try again.',
    technical: message,
    recoverable: true,
    retryable: true,
  };
}

/**
 * Rate limit error formatting
 */
function formatRateLimitError(error: unknown, message: string): UserFriendlyError {
  // Try to extract retry time
  const retryAfter = extractRetryAfter(error);
  const retryMessage = retryAfter
    ? `Please wait ${retryAfter} seconds before trying again.`
    : 'Please wait a few minutes before trying again.';

  return {
    category: ErrorCategory.RATE_LIMIT,
    title: 'Rate Limit Exceeded',
    message: "You've made too many requests in a short time.",
    action: `${retryMessage} Consider upgrading your plan for higher limits.`,
    technical: message,
    recoverable: true,
    retryable: true,
  };
}

/**
 * Validation error formatting
 */
function formatValidationError(error: unknown, message: string): UserFriendlyError {
  return {
    category: ErrorCategory.VALIDATION,
    title: 'Invalid Input',
    message: 'The information provided is not valid.',
    action: `Please check your input and try again. ${extractValidationDetails(message)}`,
    technical: message,
    recoverable: false,
    retryable: false,
  };
}

/**
 * OAuth error formatting
 */
function formatOAuthError(error: unknown, message: string): UserFriendlyError {
  if (message.includes('expired') || message.includes('token')) {
    return {
      category: ErrorCategory.OAUTH,
      title: 'Session Expired',
      message: 'Your authentication session has expired.',
      action: 'Please sign in again to continue.',
      technical: message,
      recoverable: false,
      retryable: false,
    };
  }

  return {
    category: ErrorCategory.OAUTH,
    title: 'Authentication Failed',
    message: 'Unable to complete the sign-in process.',
    action:
      'Please try signing in again. If the problem persists, try using a different authentication method.',
    technical: message,
    recoverable: false,
    retryable: true,
  };
}

/**
 * File system error formatting
 */
function formatFileSystemError(error: unknown, message: string): UserFriendlyError {
  if (message.includes('ENOENT') || message.includes('not found')) {
    return {
      category: ErrorCategory.FILE_SYSTEM,
      title: 'File Not Found',
      message: 'A required file or directory could not be found.',
      action: 'The file may have been moved or deleted. Please check your setup.',
      technical: message,
      recoverable: false,
      retryable: false,
    };
  }

  if (message.includes('EACCES') || message.includes('permission')) {
    return {
      category: ErrorCategory.FILE_SYSTEM,
      title: 'Permission Denied',
      message: 'Unable to access a file or directory due to insufficient permissions.',
      action: 'Check file permissions and ensure the application has the necessary access rights.',
      technical: message,
      recoverable: false,
      retryable: false,
    };
  }

  return {
    category: ErrorCategory.FILE_SYSTEM,
    title: 'File System Error',
    message: 'An error occurred while accessing the file system.',
    action: 'Check disk space and file permissions, then try again.',
    technical: message,
    recoverable: false,
    retryable: true,
  };
}

/**
 * API error formatting (generic 4xx/5xx)
 */
function formatAPIError(error: unknown, message: string, statusCode: number): UserFriendlyError {
  if (statusCode >= 500) {
    return {
      category: ErrorCategory.API_ERROR,
      title: 'Service Unavailable',
      message: `The API service is currently unavailable (Error ${statusCode}).`,
      action: 'This is a temporary issue on the service side. Please try again in a few minutes.',
      code: String(statusCode),
      technical: message,
      recoverable: true,
      retryable: true,
    };
  }

  if (statusCode === 404) {
    return {
      category: ErrorCategory.API_ERROR,
      title: 'Resource Not Found',
      message: 'The requested resource could not be found.',
      action: 'Please check the URL or ID and try again.',
      code: '404',
      technical: message,
      recoverable: false,
      retryable: false,
    };
  }

  if (statusCode === 403) {
    return {
      category: ErrorCategory.API_ERROR,
      title: 'Access Denied',
      message: "You don't have permission to access this resource.",
      action: 'Check your API key permissions or contact support.',
      code: '403',
      technical: message,
      recoverable: false,
      retryable: false,
    };
  }

  return {
    category: ErrorCategory.API_ERROR,
    title: 'API Error',
    message: `The API returned an error (${statusCode}).`,
    action: 'Please try again. If the problem persists, contact support.',
    code: String(statusCode),
    technical: message,
    recoverable: false,
    retryable: true,
  };
}

/**
 * Helper: Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Unknown error';
}

/**
 * Helper: Extract error code if available
 */
function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object') {
    if ('code' in error && error.code) {
      return String(error.code);
    }
    if ('status' in error && error.status) {
      return String(error.status);
    }
    if ('statusCode' in error && error.statusCode) {
      return String(error.statusCode);
    }
  }
  return undefined;
}

/**
 * Helper: Extract HTTP status code if available
 */
function getStatusCode(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    if ('status' in error && typeof error.status === 'number') {
      return error.status;
    }
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      return error.statusCode;
    }
  }
  return undefined;
}

/**
 * Helper: Check if error is network-related
 */
function isNetworkError(error: unknown, message: string): boolean {
  const networkKeywords = [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'network',
    'fetch failed',
    'connection',
  ];
  return networkKeywords.some((keyword) => message.toLowerCase().includes(keyword.toLowerCase()));
}

/**
 * Helper: Check if error is authentication-related
 */
function isAuthError(error: unknown, message: string, statusCode?: number): boolean {
  if (statusCode === 401) return true;
  const authKeywords = [
    'unauthorized',
    'invalid api key',
    'authentication',
    'invalid key',
    'api key',
  ];
  return authKeywords.some((keyword) => message.toLowerCase().includes(keyword.toLowerCase()));
}

/**
 * Helper: Check if error is timeout-related
 */
function isTimeoutError(error: unknown, message: string): boolean {
  const timeoutKeywords = ['timeout', 'timed out', 'ETIMEDOUT'];
  return timeoutKeywords.some((keyword) => message.toLowerCase().includes(keyword.toLowerCase()));
}

/**
 * Helper: Check if error is rate limit-related
 */
function isRateLimitError(error: unknown, message: string, statusCode?: number): boolean {
  if (statusCode === 429) return true;
  const rateLimitKeywords = ['rate limit', 'too many requests', 'quota exceeded'];
  return rateLimitKeywords.some((keyword) => message.toLowerCase().includes(keyword.toLowerCase()));
}

/**
 * Helper: Check if error is validation-related
 */
function isValidationError(error: unknown, message: string): boolean {
  const validationKeywords = ['validation', 'invalid', 'required', 'must be', 'should be'];
  return validationKeywords.some((keyword) =>
    message.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * Helper: Check if error is OAuth-related
 */
function isOAuthError(error: unknown, message: string): boolean {
  const oauthKeywords = ['oauth', 'token', 'expired', 'refresh', 'authorization'];
  return oauthKeywords.some((keyword) => message.toLowerCase().includes(keyword.toLowerCase()));
}

/**
 * Helper: Check if error is file system-related
 */
function isFileSystemError(error: unknown, message: string): boolean {
  const fsKeywords = ['ENOENT', 'EACCES', 'EPERM', 'EEXIST', 'file', 'directory', 'permission'];
  return fsKeywords.some((keyword) => message.includes(keyword));
}

/**
 * Helper: Extract retry-after value from error
 */
function extractRetryAfter(error: unknown): number | null {
  if (error && typeof error === 'object') {
    // Check for Retry-After header
    if ('headers' in error && error.headers && typeof error.headers === 'object') {
      const headers = error.headers as any;
      if (headers['retry-after']) {
        const retryAfter = parseInt(headers['retry-after'], 10);
        if (!isNaN(retryAfter)) return retryAfter;
      }
    }
    // Check for retryAfter property
    if ('retryAfter' in error && typeof error.retryAfter === 'number') {
      return error.retryAfter;
    }
  }
  return null;
}

/**
 * Helper: Extract validation details from error message
 */
function extractValidationDetails(message: string): string {
  // Try to extract field name or specific validation error
  const fieldMatch = message.match(/field ['"]?(\w+)['"]?/i);
  if (fieldMatch) {
    return `Check the "${fieldMatch[1]}" field.`;
  }
  return 'Please review all fields.';
}

/**
 * Create a user-friendly error for common scenarios
 */
export const ErrorMessages = {
  /**
   * Network/Connection errors
   */
  NETWORK_UNAVAILABLE: {
    category: ErrorCategory.NETWORK,
    title: 'No Internet Connection',
    message: 'Unable to connect to the internet.',
    action: 'Please check your network connection and try again.',
    recoverable: true,
    retryable: true,
  } as UserFriendlyError,

  /**
   * API Key errors
   */
  INVALID_API_KEY: (provider: string): UserFriendlyError => ({
    category: ErrorCategory.AUTH,
    title: 'Invalid API Key',
    message: `Your ${provider} API key is invalid or expired.`,
    action: `Please check your ${provider} API key in Settings and ensure it's correct.`,
    recoverable: false,
    retryable: false,
  }),

  MISSING_API_KEY: (provider: string): UserFriendlyError => ({
    category: ErrorCategory.AUTH,
    title: 'API Key Required',
    message: `No ${provider} API key found.`,
    action: `Please add your ${provider} API key in Settings to continue.`,
    recoverable: false,
    retryable: false,
  }),

  /**
   * OAuth errors
   */
  OAUTH_EXPIRED: {
    category: ErrorCategory.OAUTH,
    title: 'Session Expired',
    message: 'Your authentication session has expired.',
    action: 'Please sign in again to continue.',
    recoverable: false,
    retryable: false,
  } as UserFriendlyError,

  OAUTH_FAILED: {
    category: ErrorCategory.OAUTH,
    title: 'Sign In Failed',
    message: 'Unable to complete the sign-in process.',
    action: 'Please try signing in again.',
    recoverable: false,
    retryable: true,
  } as UserFriendlyError,

  /**
   * Figma errors
   */
  FIGMA_INVALID_URL: {
    category: ErrorCategory.VALIDATION,
    title: 'Invalid Figma URL',
    message: 'The Figma URL provided is not valid.',
    action:
      'Please enter a valid Figma file URL (e.g., figma.com/file/KEY or figma.com/design/KEY).',
    recoverable: false,
    retryable: false,
  } as UserFriendlyError,

  FIGMA_ACCESS_DENIED: {
    category: ErrorCategory.AUTH,
    title: 'Cannot Access Figma File',
    message: 'Unable to access the Figma file with your current credentials.',
    action:
      'Make sure the file exists and your token has access to it. You may need to request access from the file owner.',
    recoverable: false,
    retryable: false,
  } as UserFriendlyError,

  /**
   * File system errors
   */
  FILE_NOT_FOUND: (path: string): UserFriendlyError => ({
    category: ErrorCategory.FILE_SYSTEM,
    title: 'File Not Found',
    message: `Cannot find the file: ${path}`,
    action: 'The file may have been moved or deleted. Please check the file path.',
    recoverable: false,
    retryable: false,
  }),

  /**
   * Generic errors
   */
  UNKNOWN_ERROR: {
    category: ErrorCategory.INTERNAL,
    title: 'Unexpected Error',
    message: 'An unexpected error occurred.',
    action: 'Please try again. If the problem persists, contact support.',
    recoverable: false,
    retryable: true,
  } as UserFriendlyError,
};

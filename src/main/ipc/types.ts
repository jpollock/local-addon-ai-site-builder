/**
 * Shared types and utilities for IPC handlers
 */

import { UserFriendlyError, formatError, ErrorCategory } from '../utils/error-messages';

/**
 * Handler context passed to each handler registration function
 */
export interface HandlerContext {
  localLogger: any;
  services: any;
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: string;
  errorDetails?: UserFriendlyError;
}

/**
 * Create a standardized error response using UserFriendlyError
 * Logs the error and returns a formatted response with user-actionable information
 */
export function createErrorResponse(error: unknown, context: string, logger: any): ErrorResponse {
  const formatted = formatError(error, context);

  // Log with appropriate level based on error category
  if (
    formatted.category === ErrorCategory.INTERNAL ||
    formatted.category === ErrorCategory.FILE_SYSTEM
  ) {
    logger.error(`[${context}] ${formatted.title}:`, formatted.technical || formatted.message);
  } else {
    logger.warn(`[${context}] ${formatted.title}: ${formatted.message}`);
  }

  return {
    success: false,
    error: formatted.message,
    errorDetails: formatted,
  };
}

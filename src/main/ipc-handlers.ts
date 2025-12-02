/**
 * IPC handlers for AI Site Builder addon
 *
 * This file has been refactored to use domain-specific handler modules
 * located in the ./ipc/ directory. The structure is:
 *
 * - ipc/types.ts          - Shared types and utilities
 * - ipc/figma-utils.ts    - Figma API helper functions
 * - ipc/settings-handlers.ts  - Settings and provider handlers
 * - ipc/oauth-handlers.ts     - Google and Figma OAuth handlers
 * - ipc/ai-handlers.ts        - Conversation and AI handlers
 * - ipc/wordpress-handlers.ts - Site creation and project handlers
 * - ipc/figma-handlers.ts     - Figma integration handlers
 * - ipc/monitoring-handlers.ts - Health, circuit breakers, recovery
 * - ipc/index.ts              - Main coordinator
 *
 * This decomposition improves maintainability, testability, and readability
 * by organizing handlers into focused, domain-specific modules.
 */

// Re-export everything from the new modular structure
export { registerIPCHandlers } from './ipc';
export { createErrorResponse, type ErrorResponse, type HandlerContext } from './ipc/types';
export {
  extractFigmaFileKey,
  fetchFigmaFile,
  fetchFigmaStyles,
  fetchFigmaComponents,
  extractDesignTokens,
  extractFigmaPages,
  extractFigmaComponentsFromData,
  FigmaRateLimitError,
  type FigmaRateLimitInfo,
} from './ipc/figma-utils';

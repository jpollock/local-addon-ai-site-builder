/**
 * IPC Handlers Registration Coordinator
 *
 * This module coordinates the registration of all IPC handlers from
 * domain-specific handler modules. This decomposition improves:
 * - Maintainability: Each domain is in its own file
 * - Testability: Handlers can be tested in isolation
 * - Readability: Smaller, focused files
 */

import * as LocalMain from '@getflywheel/local/main';
import { settingsManager } from '../index';
import { AIService } from '../ai-service';
import { initializeLogger, createLoggerConfigFromSettings, getLogger } from '../utils/logger';
import { initializeHealthCheck } from '../utils/health-check';

// Import domain-specific handler registration functions
import { registerSettingsHandlers } from './settings-handlers';
import { registerOAuthHandlers } from './oauth-handlers';
import { registerAIHandlers } from './ai-handlers';
import { registerWordPressHandlers } from './wordpress-handlers';
import { registerFigmaHandlers } from './figma-handlers';
import { registerMonitoringHandlers } from './monitoring-handlers';

/**
 * Register all IPC handlers
 *
 * This function initializes shared services and then delegates to
 * domain-specific handler registration functions.
 */
export function registerIPCHandlers(_context: LocalMain.AddonMainContext): void {
  const services = LocalMain.getServiceContainer().cradle as any;
  const { localLogger } = services;

  // Initialize logger system
  const settings = settingsManager.getSettings();
  initializeLogger(localLogger, createLoggerConfigFromSettings(settings));
  const logger = getLogger('IPC');

  // Initialize health check service
  initializeHealthCheck(settingsManager, {
    enablePeriodicChecks: false, // Only check on-demand
  });

  // Initialize AI service (supports Claude, OpenAI, Gemini)
  const aiService = new AIService();

  logger.info('IPC handlers initializing');

  // Register domain-specific handlers
  registerSettingsHandlers(localLogger, aiService);
  registerOAuthHandlers(localLogger, aiService);
  registerAIHandlers(localLogger, aiService);
  registerWordPressHandlers(localLogger);
  registerFigmaHandlers(localLogger);
  registerMonitoringHandlers(localLogger, logger);

  logger.info('IPC handlers registered successfully');
}

// Re-export types and utilities for external use
export { createErrorResponse, type ErrorResponse, type HandlerContext } from './types';
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
} from './figma-utils';

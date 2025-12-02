/**
 * Monitoring and Recovery IPC Handlers
 *
 * Handles:
 * - GET_CIRCUIT_BREAKER_STATUS / RESET_CIRCUIT_BREAKERS
 * - GET_PERFORMANCE_METRICS
 * - CLEAR_CACHES
 * - GET_HEALTH_STATUS / CHECK_SERVICE_HEALTH
 * - RETRY_LAST_OPERATION / CLEAR_ERROR_STATE / GET_LAST_ERROR
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../common/constants';
import { getHealthCheck } from '../utils/health-check';
import { getCircuitBreakerRegistry } from '../utils/circuit-breaker';
import { getPerformanceMonitorRegistry } from '../utils/performance-monitor';
import { getCacheRegistry } from '../utils/cache';
import { getRecoveryManager } from '../utils/recovery-manager';
import { formatError } from '../utils/error-messages';
import { createErrorResponse } from './types';

/**
 * Register monitoring and recovery IPC handlers
 */
export function registerMonitoringHandlers(localLogger: any, logger: any): void {
  const recoveryManager = getRecoveryManager();

  // ========================================
  // API Resilience Handlers
  // ========================================

  /**
   * Get circuit breaker status for all providers
   */
  ipcMain.handle(IPC_CHANNELS.GET_CIRCUIT_BREAKER_STATUS, async () => {
    try {
      localLogger.info('[AI Site Builder] Getting circuit breaker status');

      const registry = getCircuitBreakerRegistry();
      const stats = registry.getAllStats();

      return {
        success: true,
        circuitBreakers: stats,
      };
    } catch (error: any) {
      return createErrorResponse(error, 'get circuit breaker status', localLogger);
    }
  });

  /**
   * Get performance metrics for all operations
   */
  ipcMain.handle(IPC_CHANNELS.GET_PERFORMANCE_METRICS, async () => {
    try {
      localLogger.info('[AI Site Builder] Getting performance metrics');

      const registry = getPerformanceMonitorRegistry();
      const metrics = registry.exportAllMetrics();

      return {
        success: true,
        metrics,
      };
    } catch (error: any) {
      return createErrorResponse(error, 'get performance metrics', localLogger);
    }
  });

  /**
   * Clear all caches
   */
  ipcMain.handle(IPC_CHANNELS.CLEAR_CACHES, async () => {
    try {
      localLogger.info('[AI Site Builder] Clearing all caches');

      const registry = getCacheRegistry();
      registry.clearAll();

      return {
        success: true,
      };
    } catch (error: any) {
      return createErrorResponse(error, 'clear caches', localLogger);
    }
  });

  /**
   * Reset all circuit breakers
   */
  ipcMain.handle(IPC_CHANNELS.RESET_CIRCUIT_BREAKERS, async () => {
    try {
      localLogger.info('[AI Site Builder] Resetting all circuit breakers');

      const registry = getCircuitBreakerRegistry();
      registry.resetAll();

      return {
        success: true,
      };
    } catch (error: any) {
      return createErrorResponse(error, 'reset circuit breakers', localLogger);
    }
  });

  // ========================================
  // Health Check Handlers
  // ========================================

  /**
   * Get health status for all services
   */
  ipcMain.handle(IPC_CHANNELS.GET_HEALTH_STATUS, async () => {
    try {
      logger.info('Getting health status for all services');

      const healthCheck = getHealthCheck();
      if (!healthCheck) {
        return {
          success: false,
          error: 'Health check service not initialized',
        };
      }

      const health = await healthCheck.checkAllServices();

      return {
        success: true,
        health,
      };
    } catch (error: any) {
      logger.error('Error getting health status', error);
      const formattedError = formatError(error, 'health check');

      return {
        success: false,
        error: formattedError.message,
        errorDetails: formattedError,
      };
    }
  });

  /**
   * Check health of a specific service
   */
  ipcMain.handle(
    IPC_CHANNELS.CHECK_SERVICE_HEALTH,
    async (_event, data: { service: 'claude' | 'openai' | 'gemini' | 'figma' }) => {
      try {
        logger.info('Checking health for service', { service: data.service });

        const healthCheck = getHealthCheck();
        if (!healthCheck) {
          return {
            success: false,
            error: 'Health check service not initialized',
          };
        }

        const health = await healthCheck.checkService(data.service);

        return {
          success: true,
          health,
        };
      } catch (error: any) {
        logger.error('Error checking service health', error, { service: data.service });
        const formattedError = formatError(error, `${data.service} health check`);

        return {
          success: false,
          error: formattedError.message,
          errorDetails: formattedError,
        };
      }
    }
  );

  // ========================================
  // Error Recovery Handlers
  // ========================================

  /**
   * Retry the last failed operation
   */
  ipcMain.handle(IPC_CHANNELS.RETRY_LAST_OPERATION, async () => {
    try {
      logger.info('Retrying last failed operation');

      const lastFailed = recoveryManager.getLastFailedOperation();
      if (!lastFailed) {
        return {
          success: false,
          error: 'No failed operation to retry',
        };
      }

      // TODO: Implement operation replay based on operation metadata
      // For now, just return the operation info for the UI to handle
      return {
        success: true,
        operation: {
          id: lastFailed.operation.id,
          name: lastFailed.operation.name,
          context: lastFailed.operation.context,
          attemptCount: lastFailed.attemptCount,
        },
        message: 'Please retry the operation manually',
      };
    } catch (error: any) {
      logger.error('Error retrying operation', error);
      const formattedError = formatError(error, 'retry operation');

      return {
        success: false,
        error: formattedError.message,
        errorDetails: formattedError,
      };
    }
  });

  /**
   * Clear error state
   */
  ipcMain.handle(IPC_CHANNELS.CLEAR_ERROR_STATE, async () => {
    try {
      logger.info('Clearing error state');
      recoveryManager.clearLastFailedOperation();

      return {
        success: true,
      };
    } catch (error: any) {
      return createErrorResponse(error, 'clear error state', logger);
    }
  });

  /**
   * Get last error
   */
  ipcMain.handle(IPC_CHANNELS.GET_LAST_ERROR, async () => {
    try {
      const lastFailed = recoveryManager.getLastFailedOperation();

      if (!lastFailed) {
        return {
          success: true,
          hasError: false,
        };
      }

      return {
        success: true,
        hasError: true,
        error: lastFailed.error,
        operation: {
          id: lastFailed.operation.id,
          name: lastFailed.operation.name,
          context: lastFailed.operation.context,
          attemptCount: lastFailed.attemptCount,
        },
      };
    } catch (error: any) {
      return createErrorResponse(error, 'get last error', logger);
    }
  });

  localLogger.info('[AI Site Builder] Monitoring handlers registered');
}

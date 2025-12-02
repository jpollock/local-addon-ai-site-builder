/**
 * Settings and Provider IPC Handlers
 *
 * Handles:
 * - GET_SETTINGS / UPDATE_SETTINGS
 * - GET_PROVIDERS / SET_ACTIVE_PROVIDER
 * - VALIDATE_API_KEY
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../common/constants';
import {
  GetSettingsResponse,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
} from '../../common/types';
import {
  PROVIDER_METADATA,
  getSupportedProviders,
  isValidProviderType,
} from '../../common/ai-provider.types';
import { settingsManager } from '../index';
import { AIService } from '../ai-service';
import { AIProviderFactory } from '../ai-providers';
import { getGoogleOAuthService } from '../google-oauth';
import {
  validateInput,
  ValidateApiKeyRequestSchema,
  SetActiveProviderRequestSchema,
} from '../utils/validators';
import { createErrorResponse } from './types';

/**
 * Register settings-related IPC handlers
 */
export function registerSettingsHandlers(localLogger: any, aiService: AIService): void {
  // ========================================
  // GET_SETTINGS
  // ========================================
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async (): Promise<GetSettingsResponse> => {
    try {
      localLogger.info('[AI Site Builder] Getting settings');

      const settings = settingsManager.getSettings();

      return { success: true, settings };
    } catch (error) {
      localLogger.error('[AI Site Builder] Error getting settings:', error);
      return {
        success: true,
        settings: {
          acfProDetected: false,
          showAdvancedOptions: false,
        },
      };
    }
  });

  // ========================================
  // UPDATE_SETTINGS
  // ========================================
  ipcMain.handle(
    IPC_CHANNELS.UPDATE_SETTINGS,
    async (_event, data: UpdateSettingsRequest): Promise<UpdateSettingsResponse> => {
      try {
        localLogger.info('[AI Site Builder] Updating settings');
        const settingsAny = data.settings as any;
        localLogger.info(
          `[AI Site Builder] Settings to update: geminiAuthMode=${settingsAny?.geminiAuthMode}, figmaAuthMode=${settingsAny?.figmaAuthMode}`
        );

        // Check if the update includes OAuth tokens (it shouldn't!)
        if (settingsAny?.geminiOAuthTokens) {
          localLogger.info(
            '[AI Site Builder] WARNING: Settings update includes geminiOAuthTokens - removing them'
          );
          delete settingsAny.geminiOAuthTokens;
        }
        if (settingsAny?.figmaOAuthTokens) {
          localLogger.info(
            '[AI Site Builder] WARNING: Settings update includes figmaOAuthTokens - removing them'
          );
          delete settingsAny.figmaOAuthTokens;
        }

        settingsManager.updateSettings(data.settings);
        aiService.resetProvider(); // Reset provider in case API keys or auth mode changed
        localLogger.info('[AI Site Builder] Settings updated successfully');

        return { success: true };
      } catch (error: any) {
        return createErrorResponse(error, 'update settings', localLogger);
      }
    }
  );

  // ========================================
  // GET_PROVIDERS
  // ========================================
  ipcMain.handle(IPC_CHANNELS.GET_PROVIDERS, async () => {
    try {
      // For Gemini with OAuth, try to refresh expired token before checking credentials
      if (settingsManager.getGeminiAuthMode() === 'oauth') {
        const tokens = settingsManager.getGeminiOAuthTokens();
        // If we have a refresh token but the access token is expired, try refreshing
        if (tokens?.refreshToken && tokens.expiresAt <= Date.now()) {
          localLogger.info(
            '[AI Site Builder] GET_PROVIDERS: Gemini token expired, attempting refresh'
          );
          try {
            const oauthService = getGoogleOAuthService();
            const refreshResult = await oauthService.refreshAccessToken(tokens.refreshToken);
            if (refreshResult.success && refreshResult.tokens) {
              // Update stored tokens with refreshed ones
              settingsManager.setGeminiOAuthTokens({
                ...tokens,
                accessToken: refreshResult.tokens.accessToken,
                expiresAt: refreshResult.tokens.expiresAt,
              });
              localLogger.info('[AI Site Builder] GET_PROVIDERS: Token refreshed successfully');
            } else {
              localLogger.warn(
                '[AI Site Builder] GET_PROVIDERS: Token refresh failed, user may need to re-authenticate'
              );
            }
          } catch (refreshError) {
            localLogger.warn('[AI Site Builder] GET_PROVIDERS: Token refresh error:', refreshError);
          }
        }
      }

      const providers = getSupportedProviders().map((type) => ({
        type,
        ...PROVIDER_METADATA[type],
        // For Gemini, check both OAuth and API key credentials
        hasApiKey:
          type === 'gemini'
            ? settingsManager.hasGeminiCredentials()
            : settingsManager.hasApiKey(type),
        isActive: settingsManager.getActiveProvider() === type,
      }));

      return {
        success: true,
        providers,
        activeProvider: settingsManager.getActiveProvider(),
      };
    } catch (error: any) {
      const response = createErrorResponse(error, 'get providers', localLogger);
      return {
        ...response,
        providers: [],
      };
    }
  });

  // ========================================
  // SET_ACTIVE_PROVIDER
  // ========================================
  ipcMain.handle(IPC_CHANNELS.SET_ACTIVE_PROVIDER, async (_event, data: { provider: string }) => {
    // Validate input
    const validation = validateInput(SetActiveProviderRequestSchema, data);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    try {
      if (!isValidProviderType(validation.data.provider)) {
        return {
          success: false,
          error: `Invalid provider type: ${validation.data.provider}`,
        };
      }

      settingsManager.setActiveProvider(validation.data.provider);
      aiService.resetProvider(); // Ensure next call uses new provider
      localLogger.info(`[AI Site Builder] Active provider set to: ${validation.data.provider}`);

      return { success: true };
    } catch (error: any) {
      return createErrorResponse(error, 'set active provider', localLogger);
    }
  });

  // ========================================
  // VALIDATE_API_KEY
  // ========================================
  ipcMain.handle(
    IPC_CHANNELS.VALIDATE_API_KEY,
    async (_event, data: { provider: string; apiKey: string }) => {
      // Validate input
      const validation = validateInput(ValidateApiKeyRequestSchema, data);
      if (!validation.success) {
        return { success: false, valid: false, error: validation.error };
      }

      try {
        if (!isValidProviderType(validation.data.provider)) {
          return {
            success: false,
            valid: false,
            error: `Invalid provider type: ${validation.data.provider}`,
          };
        }

        localLogger.info(`[AI Site Builder] Validating API key for: ${validation.data.provider}`);

        // Create a provider instance to validate the key
        const provider = AIProviderFactory.create({
          type: validation.data.provider,
          apiKey: validation.data.apiKey,
        });

        const isValid = await provider.validateApiKey();

        return {
          success: true,
          valid: isValid,
        };
      } catch (error: any) {
        const response = createErrorResponse(error, 'validate API key', localLogger);
        return {
          ...response,
          valid: false,
        };
      }
    }
  );

  localLogger.info('[AI Site Builder] Settings handlers registered');
}

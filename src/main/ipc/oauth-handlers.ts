/**
 * OAuth IPC Handlers
 *
 * Handles Google OAuth (for Gemini) authentication using PKCE flow:
 * - START_GOOGLE_OAUTH / GET_GOOGLE_OAUTH_STATUS / DISCONNECT_GOOGLE_OAUTH
 * - SET_GEMINI_AUTH_MODE
 *
 * Note: Figma OAuth was removed as Figma doesn't properly support PKCE for desktop apps.
 * Use Figma Personal Access Tokens (PAT) instead.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../common/constants';
import { GeminiAuthMode } from '../../common/ai-provider.types';
import { settingsManager } from '../index';
import { AIService } from '../ai-service';
import { getGoogleOAuthService } from '../google-oauth';
import { validateInput, SetGeminiAuthModeRequestSchema } from '../utils/validators';
import { createErrorResponse } from './types';

/**
 * Register OAuth-related IPC handlers
 */
export function registerOAuthHandlers(localLogger: any, aiService: AIService): void {
  // ========================================
  // Google OAuth Handlers (for Gemini)
  // ========================================

  /**
   * Start Google OAuth flow for Gemini authentication
   */
  ipcMain.handle(IPC_CHANNELS.START_GOOGLE_OAUTH, async () => {
    try {
      localLogger.info('[AI Site Builder] Starting Google OAuth flow');

      const oauthService = getGoogleOAuthService();

      if (!oauthService.isConfigured()) {
        return {
          success: false,
          error: 'Google OAuth is not configured. Please contact support.',
        };
      }

      const result = await oauthService.startOAuthFlow();

      if (result.success && result.tokens) {
        // Store the tokens
        settingsManager.setGeminiOAuthTokens(result.tokens);
        settingsManager.setGeminiAuthMode('oauth');
        aiService.resetProvider(); // Reset provider to use new OAuth tokens

        localLogger.info('[AI Site Builder] Google OAuth completed successfully');

        return {
          success: true,
          email: result.tokens.email,
        };
      }

      return {
        success: false,
        error: result.error || 'OAuth flow failed',
      };
    } catch (error: any) {
      return createErrorResponse(error, 'Google OAuth', localLogger);
    }
  });

  /**
   * Get Google OAuth connection status
   */
  ipcMain.handle(IPC_CHANNELS.GET_GOOGLE_OAUTH_STATUS, async () => {
    try {
      const isConnected = settingsManager.isGeminiOAuthConnected();
      const authMode = settingsManager.getGeminiAuthMode();
      const email = settingsManager.getGeminiConnectedEmail();
      const hasTokens = !!settingsManager.getGeminiOAuthTokens();

      localLogger.info(
        `[AI Site Builder] GET_GOOGLE_OAUTH_STATUS: isConnected=${isConnected}, authMode=${authMode}, email=${email}, hasTokens=${hasTokens}`
      );

      // If connected but token is expired, try to refresh
      if (authMode === 'oauth' && !isConnected) {
        const tokens = settingsManager.getGeminiOAuthTokens();
        if (tokens?.refreshToken) {
          localLogger.info('[AI Site Builder] Token expired, attempting refresh');
          const oauthService = getGoogleOAuthService();
          const refreshResult = await oauthService.refreshAccessToken(tokens.refreshToken);

          if (refreshResult.success && refreshResult.tokens) {
            settingsManager.setGeminiOAuthTokens(refreshResult.tokens);
            return {
              success: true,
              connected: true,
              authMode: 'oauth',
              email: refreshResult.tokens.email || email,
            };
          }
        }
      }

      return {
        success: true,
        connected: isConnected,
        authMode,
        email: isConnected ? email : undefined,
      };
    } catch (error: any) {
      const response = createErrorResponse(error, 'get OAuth status', localLogger);
      return {
        ...response,
        connected: false,
        authMode: 'api-key' as const,
      };
    }
  });

  /**
   * Disconnect Google OAuth (clear tokens)
   */
  ipcMain.handle(IPC_CHANNELS.DISCONNECT_GOOGLE_OAUTH, async () => {
    try {
      const beforeAuthMode = settingsManager.getGeminiAuthMode();
      const beforeHasTokens = !!settingsManager.getGeminiOAuthTokens();

      localLogger.info(
        `[AI Site Builder] Disconnecting Google OAuth - before: authMode=${beforeAuthMode}, hasTokens=${beforeHasTokens}`
      );

      settingsManager.clearGeminiOAuthTokens();

      const afterAuthMode = settingsManager.getGeminiAuthMode();
      const afterHasTokens = !!settingsManager.getGeminiOAuthTokens();
      const afterIsConnected = settingsManager.isGeminiOAuthConnected();

      localLogger.info(
        `[AI Site Builder] After clear: authMode=${afterAuthMode}, hasTokens=${afterHasTokens}, isConnected=${afterIsConnected}`
      );

      return { success: true };
    } catch (error: any) {
      return createErrorResponse(error, 'disconnect OAuth', localLogger);
    }
  });

  /**
   * Set Gemini authentication mode
   */
  ipcMain.handle(
    IPC_CHANNELS.SET_GEMINI_AUTH_MODE,
    async (_event, data: { mode: GeminiAuthMode }) => {
      // Validate input
      const validation = validateInput(SetGeminiAuthModeRequestSchema, data);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      try {
        settingsManager.setGeminiAuthMode(validation.data.mode);
        aiService.resetProvider(); // Reset provider to pick up new auth mode
        localLogger.info(`[AI Site Builder] Gemini auth mode set to: ${validation.data.mode}`);

        return { success: true };
      } catch (error: any) {
        return createErrorResponse(error, 'set auth mode', localLogger);
      }
    }
  );

  localLogger.info('[AI Site Builder] OAuth handlers registered');
}

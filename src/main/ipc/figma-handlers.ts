/**
 * Figma Integration IPC Handlers
 *
 * Handles:
 * - CONNECT_FIGMA
 * - ANALYZE_FIGMA
 * - GET_FIGMA_TOKEN_STATUS
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../common/constants';
import {
  ConnectFigmaRequest,
  ConnectFigmaResponse,
  AnalyzeFigmaRequest,
  AnalyzeFigmaResponse,
  FigmaAnalysis,
} from '../../common/types';
import { settingsManager } from '../index';
import {
  validateInput,
  ConnectFigmaRequestSchema,
  AnalyzeFigmaRequestSchema,
} from '../utils/validators';
import {
  extractFigmaFileKey,
  fetchFigmaFile,
  fetchFigmaStyles,
  fetchFigmaComponents,
  extractFigmaComponentsFromData,
  extractFigmaPages,
  extractDesignTokens,
  FigmaRateLimitError,
} from './figma-utils';

/**
 * Register Figma integration IPC handlers
 */
export function registerFigmaHandlers(localLogger: any): void {
  // ========================================
  // CONNECT_FIGMA
  // ========================================
  ipcMain.handle(
    IPC_CHANNELS.CONNECT_FIGMA,
    async (_event, data: ConnectFigmaRequest): Promise<ConnectFigmaResponse> => {
      // Validate input
      const validation = validateInput(ConnectFigmaRequestSchema, data);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      try {
        localLogger.info('[AI Site Builder] Connecting to Figma:', {
          fileUrl: validation.data.fileUrl,
        });

        // Get token from request, or use stored PAT
        const token = validation.data.token || settingsManager.getEffectiveFigmaToken();

        if (!token) {
          return {
            success: false,
            error:
              'Figma access token is required. Get one from Figma Settings → Account → Personal Access Tokens.',
          };
        }

        // Parse Figma URL to extract file key
        const fileKey = extractFigmaFileKey(validation.data.fileUrl, localLogger);
        if (!fileKey) {
          // Check if it's a /site/ URL and give specific guidance
          if (validation.data.fileUrl.includes('figma.com/site/')) {
            return {
              success: false,
              error:
                'This appears to be a Figma website page, not a design file. Please use a Figma design URL (e.g., figma.com/file/... or figma.com/design/...).',
            };
          }
          return {
            success: false,
            error:
              'Invalid Figma URL. Please enter a valid Figma file URL (e.g., figma.com/file/KEY or figma.com/design/KEY).',
          };
        }

        // Fetch file info from Figma API to verify access
        localLogger.info('[AI Site Builder] Attempting to fetch Figma file with key:', fileKey);
        const fileInfo = await fetchFigmaFile(fileKey, token, localLogger);

        // Save token if provided in request (user entered it)
        if (validation.data.token) {
          settingsManager.setFigmaAccessToken(validation.data.token);
          localLogger.info('[AI Site Builder] Saved Figma access token');
        }

        localLogger.info('[AI Site Builder] Connected to Figma file:', fileInfo.name);

        return {
          success: true,
          fileKey,
          fileName: fileInfo.name,
        };
      } catch (error: any) {
        localLogger.error('[AI Site Builder] Error connecting to Figma:', error);

        // Handle rate limit errors with structured response
        if (error instanceof FigmaRateLimitError) {
          return {
            success: false,
            error: error.message,
            rateLimited: true,
            rateLimitInfo: {
              retryAfter: error.rateLimitInfo.retryAfter,
              upgradeLink: error.rateLimitInfo.upgradeLink,
              planTier: error.rateLimitInfo.planTier,
            },
          };
        }

        // Provide user-friendly error messages
        let errorMessage = error.message || 'Failed to connect to Figma';
        if (error.message?.includes('403')) {
          errorMessage = 'Invalid access token. Please check your token and try again.';
        } else if (error.message?.includes('404')) {
          errorMessage =
            'Could not access this Figma file. Make sure it exists and your token has access.';
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    }
  );

  // ========================================
  // ANALYZE_FIGMA
  // ========================================
  ipcMain.handle(
    IPC_CHANNELS.ANALYZE_FIGMA,
    async (_event, data: AnalyzeFigmaRequest): Promise<AnalyzeFigmaResponse> => {
      // Validate input
      const validation = validateInput(AnalyzeFigmaRequestSchema, data);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      try {
        localLogger.info('[AI Site Builder] Analyzing Figma file:', validation.data.fileKey);

        const token = settingsManager.getEffectiveFigmaToken();
        if (!token) {
          return {
            success: false,
            error: 'Figma token not found. Please connect to Figma first.',
          };
        }

        // Fetch file with full document tree, styles, and components
        // Note: These are fetched sequentially to avoid hitting rate limits
        const fileData = await fetchFigmaFile(validation.data.fileKey, token, localLogger);

        // Add a small delay between requests to be nice to the API
        await new Promise((resolve) => setTimeout(resolve, 500));
        const stylesData = await fetchFigmaStyles(validation.data.fileKey, token, localLogger);

        await new Promise((resolve) => setTimeout(resolve, 500));
        const componentsData = await fetchFigmaComponents(
          validation.data.fileKey,
          token,
          localLogger
        );

        // Extract design tokens from the file
        const designTokens = extractDesignTokens(fileData, stylesData, localLogger);

        // Extract pages
        const pages = extractFigmaPages(fileData);

        // Extract components
        const components = extractFigmaComponentsFromData(componentsData);

        const analysis: FigmaAnalysis = {
          fileKey: validation.data.fileKey,
          fileName: fileData.name,
          pages,
          designTokens,
          components,
        };

        localLogger.info('[AI Site Builder] Figma analysis complete:', {
          fileName: analysis.fileName,
          pageCount: pages.length,
          componentCount: components.length,
          colorCount: Object.keys(designTokens.colors).filter(
            (k) => typeof designTokens.colors[k] === 'string'
          ).length,
          fontCount: designTokens.typography.fontFamilies.length,
        });

        return {
          success: true,
          analysis,
        };
      } catch (error: any) {
        localLogger.error('[AI Site Builder] Error analyzing Figma:', error);

        // Handle rate limit errors with structured response
        if (error instanceof FigmaRateLimitError) {
          return {
            success: false,
            error: error.message,
            rateLimited: true,
            rateLimitInfo: {
              retryAfter: error.rateLimitInfo.retryAfter,
              upgradeLink: error.rateLimitInfo.upgradeLink,
              planTier: error.rateLimitInfo.planTier,
            },
          };
        }

        return {
          success: false,
          error: error.message || 'Failed to analyze Figma file',
        };
      }
    }
  );

  // ========================================
  // GET_FIGMA_TOKEN_STATUS
  // ========================================
  ipcMain.handle(IPC_CHANNELS.GET_FIGMA_TOKEN_STATUS, async (): Promise<boolean> => {
    try {
      // Check if user has valid Figma credentials (OAuth or PAT)
      return settingsManager.hasFigmaCredentials();
    } catch (error) {
      localLogger.error('[AI Site Builder] Error checking Figma token status:', error);
      return false;
    }
  });

  localLogger.info('[AI Site Builder] Figma handlers registered');
}

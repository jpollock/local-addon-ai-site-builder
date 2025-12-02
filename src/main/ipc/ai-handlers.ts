/**
 * AI Conversation IPC Handlers
 *
 * Handles:
 * - START_CONVERSATION / SEND_MESSAGE
 * - GET_DYNAMIC_OPTIONS
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../common/constants';
import {
  StartConversationRequest,
  StartConversationResponse,
  SendMessageRequest,
  SendMessageResponse,
  QuestionContext,
  DynamicOptionsResponse,
} from '../../common/types';
import { projectManager } from '../index';
import { AIService } from '../ai-service';
import {
  validateInput,
  StartConversationRequestSchema,
  SendMessageRequestSchema,
} from '../utils/validators';
import { createErrorResponse } from './types';

/**
 * Register AI conversation IPC handlers
 */
export function registerAIHandlers(localLogger: any, aiService: AIService): void {
  // ========================================
  // START_CONVERSATION
  // ========================================
  ipcMain.handle(
    IPC_CHANNELS.START_CONVERSATION,
    async (_event, data: StartConversationRequest): Promise<StartConversationResponse> => {
      // Validate input
      const validation = validateInput(StartConversationRequestSchema, data);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      try {
        localLogger.info('[AI Site Builder] Starting conversation:', validation.data);

        // Create the project first if it doesn't exist
        const existingProject = projectManager.getProject(validation.data.projectId);
        if (!existingProject) {
          localLogger.info('[AI Site Builder] Creating new project:', validation.data.projectId);
          projectManager.createProject({
            id: validation.data.projectId,
            name: 'Untitled Project',
            entryPathway: validation.data.entryPathway || 'describe',
            status: 'planning',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        const result = await aiService.startConversation(
          validation.data.projectId,
          validation.data.initialMessage
        );

        // Update project with conversation ID
        projectManager.updateProject(validation.data.projectId, {
          conversationId: result.conversationId,
        });

        return {
          success: true,
          ...result,
        };
      } catch (error: any) {
        return createErrorResponse(error, 'start conversation', localLogger);
      }
    }
  );

  // ========================================
  // SEND_MESSAGE
  // ========================================
  ipcMain.handle(
    IPC_CHANNELS.SEND_MESSAGE,
    async (_event, data: SendMessageRequest): Promise<SendMessageResponse> => {
      // Validate input
      const validation = validateInput(SendMessageRequestSchema, data);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      try {
        localLogger.info('[AI Site Builder] Sending message:', validation.data);

        const result = await aiService.sendMessage(
          validation.data.conversationId,
          validation.data.message
        );

        // If conversation is completed and we have a structure, update the project
        if (result.completed && result.structure) {
          const conversation = projectManager.getConversation(validation.data.conversationId);
          if (conversation) {
            projectManager.updateProject(conversation.projectId, {
              structure: result.structure,
              status: 'building',
            });
          }
        }

        return {
          success: true,
          ...result,
        };
      } catch (error: any) {
        return createErrorResponse(error, 'send message', localLogger);
      }
    }
  );

  // ========================================
  // GET_DYNAMIC_OPTIONS
  // ========================================
  /**
   * Get dynamic options for a wizard question based on context
   *
   * This handler calls the Claude AI to enhance question options based on:
   * - User's entry description (what they're building)
   * - Previous answers in the wizard
   * - Figma analysis (if connected)
   *
   * Returns enhanced options with graceful degradation on failure
   */
  ipcMain.handle(
    IPC_CHANNELS.GET_DYNAMIC_OPTIONS,
    async (
      _event,
      context: QuestionContext
    ): Promise<{ success: boolean; data: DynamicOptionsResponse; error?: string }> => {
      const startTime = Date.now();

      try {
        localLogger.info('[AI Site Builder] Getting dynamic options for question:', {
          questionIndex: context.questionIndex,
          question: context.currentQuestion?.question,
          hasEntryDescription: !!context.entryDescription,
          previousAnswersCount: Object.keys(context.previousAnswers || {}).filter(
            (k) => context.previousAnswers[k]
          ).length,
          hasFigma: !!context.figmaAnalysis,
        });

        const response = await aiService.getDynamicOptions(context);

        const elapsed = Date.now() - startTime;
        localLogger.info('[AI Site Builder] Dynamic options response:', {
          suggestedOptionsCount: response.suggestedOptions?.length || 0,
          removedCount: response.removedOptionIds?.length || 0,
          defaultsCount: response.defaultSelections?.length || 0,
          hintsCount: Object.keys(response.hints || {}).length,
          responseTimeMs: elapsed,
        });

        return {
          success: true,
          data: response,
        };
      } catch (error: any) {
        const elapsed = Date.now() - startTime;
        localLogger.error('[AI Site Builder] Error getting dynamic options:', {
          error: error.message,
          responseTimeMs: elapsed,
        });

        // Graceful degradation - return empty enhancement
        return {
          success: false,
          data: {
            suggestedOptions: [],
            removedOptionIds: [],
            defaultSelections: [],
            hints: {},
          },
          error: error.message || 'Failed to get dynamic options',
        };
      }
    }
  );

  localLogger.info('[AI Site Builder] AI handlers registered');
}

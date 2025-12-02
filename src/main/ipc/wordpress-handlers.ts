/**
 * WordPress Site and Project IPC Handlers
 *
 * Handles:
 * - CREATE_SITE
 * - GET_PROJECTS / GET_PROJECT / UPDATE_PROJECT
 * - GET_CONVERSATION_HISTORY
 * - CLEAR_PROGRESS_TRACKING
 */

import * as LocalMain from '@getflywheel/local/main';
import { ipcMain } from 'electron';
import * as path from 'path';
import * as os from 'os';
import { IPC_CHANNELS } from '../../common/constants';
import { CreateSiteRequest, CreateSiteResponse } from '../../common/types';
import {
  pendingStructures,
  projectManager,
  registerSiteCreation,
  clearProgressTracking,
} from '../index';
import {
  validateInput,
  CreateSiteRequestSchema,
  UpdateProjectRequestSchema,
  GenericIdSchema,
  ConversationIdSchema,
} from '../utils/validators';
import { createErrorResponse } from './types';

/**
 * Register WordPress site and project management IPC handlers
 */
export function registerWordPressHandlers(localLogger: any): void {
  const services = LocalMain.getServiceContainer().cradle as any;

  // ========================================
  // CREATE_SITE
  // ========================================
  ipcMain.handle(
    IPC_CHANNELS.CREATE_SITE,
    async (_event, data: CreateSiteRequest): Promise<CreateSiteResponse> => {
      // Validate input
      const validation = validateInput(CreateSiteRequestSchema, data);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      try {
        localLogger.info('[AI Site Builder] Creating site:', {
          projectId: validation.data.projectId,
          siteName: validation.data.siteName,
          siteDomain: validation.data.siteDomain,
        });

        // Get the addSite service and userData
        const { addSite: addSiteService, userData } = services;

        // Generate site path using user's configured Local Sites directory
        const newSiteDefaults = userData.get('newSiteDefaults', {});
        const defaultSitesPath =
          newSiteDefaults.sitesPath || path.join(os.homedir(), 'Local Sites');
        const sitePath = path.join(defaultSitesPath, validation.data.siteName);

        // Prepare site info
        const newSiteInfo = {
          siteName: validation.data.siteName,
          sitePath,
          siteDomain: validation.data.siteDomain,
          multiSite: { enabled: false },
          phpVersion: validation.data.environment?.php || '8.2.0',
          webServer: validation.data.environment?.webServer || 'nginx',
          database: validation.data.environment?.database || '8.0.16',
          xdebugEnabled: false,
        };

        // Prepare WordPress credentials
        const wpCredentials = {
          adminUsername: 'admin',
          adminEmail: validation.data.adminEmail || 'admin@local.test',
          adminPassword: validation.data.adminPassword || 'password',
        };

        // Register site for progress tracking BEFORE creating it
        // This allows hooks to fire during addSite() and still be tracked
        registerSiteCreation(validation.data.siteName);

        // Queue structure BEFORE creating site (using siteName as key)
        // The wordPressInstaller:standardInstall hook will look it up by site.name
        if (validation.data.structure) {
          pendingStructures.set(validation.data.siteName, {
            projectId: validation.data.projectId,
            structure: validation.data.structure,
            figmaAnalysis: validation.data.figmaAnalysis, // Include Figma analysis for enhanced design application
          });
          localLogger.info(
            `[AI Site Builder] Queued structure for ${validation.data.siteName} (before site creation)`
          );
          if (validation.data.figmaAnalysis) {
            localLogger.info(
              `[AI Site Builder] Including Figma analysis: ${validation.data.figmaAnalysis.pages?.length || 0} pages, ${validation.data.figmaAnalysis.components?.length || 0} components`
            );
          }
        }

        // Create the site
        const site = await addSiteService.addSite({
          newSiteInfo,
          wpCredentials,
          goToSite: false, // Stay in addon flow to show BuildingScreen
          installWP: true,
        });

        // Update tracking with siteId
        registerSiteCreation(validation.data.siteName, site.id);

        // Update pendingStructures to use siteId as key (for cleanup)
        if (validation.data.structure) {
          const pending = pendingStructures.get(validation.data.siteName);
          if (pending) {
            pendingStructures.delete(validation.data.siteName); // Remove siteName key
            pendingStructures.set(site.id, pending); // Add siteId key
          }
          localLogger.info(
            `[AI Site Builder] Updated structure key from ${validation.data.siteName} to ${site.id}`
          );
        }

        localLogger.info(
          `[AI Site Builder] Site ${site.id} created for project ${validation.data.projectId}`
        );

        return {
          success: true,
          siteId: site.id,
        };
      } catch (error: any) {
        return createErrorResponse(error, 'create site', localLogger);
      }
    }
  );

  // ========================================
  // GET_PROJECTS
  // ========================================
  ipcMain.handle(IPC_CHANNELS.GET_PROJECTS, async () => {
    try {
      localLogger.info('[AI Site Builder] Getting all projects');
      const projects = projectManager.getAllProjects();
      return { success: true, projects };
    } catch (error: any) {
      const response = createErrorResponse(error, 'get projects', localLogger);
      return {
        ...response,
        projects: [],
      };
    }
  });

  // ========================================
  // GET_PROJECT
  // ========================================
  ipcMain.handle(IPC_CHANNELS.GET_PROJECT, async (_event, data: { projectId: string }) => {
    // Validate input
    const validation = validateInput(GenericIdSchema, data?.projectId);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    try {
      localLogger.info('[AI Site Builder] Getting project:', validation.data);
      const project = projectManager.getProject(validation.data);

      if (!project) {
        return {
          success: false,
          error: 'Project not found',
        };
      }

      return { success: true, project };
    } catch (error: any) {
      return createErrorResponse(error, 'get project', localLogger);
    }
  });

  // ========================================
  // UPDATE_PROJECT
  // ========================================
  ipcMain.handle(
    IPC_CHANNELS.UPDATE_PROJECT,
    async (_event, data: { projectId: string; updates: any }) => {
      // Validate input
      const validation = validateInput(UpdateProjectRequestSchema, data);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      try {
        localLogger.info('[AI Site Builder] Updating project:', validation.data.projectId);
        projectManager.updateProject(validation.data.projectId, validation.data.updates);
        return { success: true };
      } catch (error: any) {
        return createErrorResponse(error, 'update project', localLogger);
      }
    }
  );

  // ========================================
  // GET_CONVERSATION_HISTORY
  // ========================================
  ipcMain.handle(
    IPC_CHANNELS.GET_CONVERSATION_HISTORY,
    async (_event, data: { conversationId: string }) => {
      // Validate input
      const validation = validateInput(ConversationIdSchema, data?.conversationId);
      if (!validation.success) {
        return { success: false, error: validation.error, messages: [] };
      }

      try {
        localLogger.info('[AI Site Builder] Getting conversation history:', validation.data);
        const messages = projectManager.getConversationHistory(validation.data);
        return { success: true, messages };
      } catch (error: any) {
        const response = createErrorResponse(error, 'get conversation history', localLogger);
        return {
          ...response,
          messages: [],
        };
      }
    }
  );

  // ========================================
  // CLEAR_PROGRESS_TRACKING
  // ========================================
  ipcMain.handle(IPC_CHANNELS.CLEAR_PROGRESS_TRACKING, async () => {
    try {
      localLogger.info('[AI Site Builder] Clearing progress tracking');
      clearProgressTracking();
      return { success: true };
    } catch (error: any) {
      return createErrorResponse(error, 'clear progress tracking', localLogger);
    }
  });

  localLogger.info('[AI Site Builder] WordPress handlers registered');
}

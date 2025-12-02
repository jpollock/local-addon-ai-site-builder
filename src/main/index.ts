/**
 * Main process entry point for AI Site Builder addon
 */

import * as LocalMain from '@getflywheel/local/main';
import { BrowserWindow } from 'electron';
import { registerIPCHandlers } from './ipc-handlers';
import { SiteStructure, FigmaAnalysis } from '../common/types';
import { SettingsManager } from './settings-manager';
import { ProjectManager } from './project-manager';
import { applyStructureToSite } from './structure-applicator';

// Store site structure by site ID for application after WordPress installs
export const pendingStructures = new Map<
  string,
  { projectId: string; structure: SiteStructure; figmaAnalysis?: FigmaAnalysis }
>();

// Track active site creation processes for progress monitoring
// Maps siteName -> siteId (we know siteName before addSite(), get siteId after)
const activeSiteCreations = new Map<string, string | null>();

// Track WordPress installation progress timers (by siteId)
const wpInstallTimers = new Map<string, NodeJS.Timeout>();

// Track last broadcasted progress per site to avoid duplicates
const lastBroadcastedProgress = new Map<string, number>();

// Manager instances (initialized in main function)
export let settingsManager: SettingsManager;
export let projectManager: ProjectManager;

/**
 * Main addon initialization
 */
export default function (context: LocalMain.AddonMainContext): void {
  const services = LocalMain.getServiceContainer().cradle as any;
  const { localLogger } = services;

  localLogger.info('[AI Site Builder] Initializing addon');

  // Initialize managers
  const userDataPath = (process as any).electronPaths.userDataPath;
  settingsManager = new SettingsManager(userDataPath);
  projectManager = new ProjectManager(userDataPath);
  localLogger.info('[AI Site Builder] Settings and project managers initialized');

  // Register IPC handlers
  registerIPCHandlers(context);

  /**
   * Helper function to check if a site is being tracked
   * Checks by siteId in values (after site created) OR by siteName (before site created)
   */
  function isTrackedSite(site: any): boolean {
    // Priority 1: Check if tracking by siteId (most reliable)
    for (const [_siteName, siteId] of activeSiteCreations.entries()) {
      if (siteId && siteId === site.id) {
        return true;
      }
    }

    // Priority 2: Check if tracking by siteName (only if we don't have siteId yet)
    // This prevents matching old/existing sites with the same name
    for (const [siteName, siteId] of activeSiteCreations.entries()) {
      if (!siteId && siteName === site.name) {
        return true;
      }
    }

    return false;
  }

  /**
   * Helper function to check if a site is being tracked by siteId
   * Used for IPC event listeners that only have siteId available
   * Returns true if either:
   * 1. We have this siteId tracked (after addSite completes)
   * 2. We're tracking ANY site that doesn't have a siteId yet (during addSite)
   */
  function isTrackedSiteById(siteId: string): boolean {
    // Check if we have this specific siteId tracked
    for (const [_siteName, trackedSiteId] of activeSiteCreations.entries()) {
      if (trackedSiteId === siteId) {
        return true;
      }
    }

    // Check if we're tracking any site without a siteId yet
    // (events during addSite() before we know the siteId)
    for (const [_siteName2, trackedSiteId] of activeSiteCreations.entries()) {
      if (trackedSiteId === null) {
        return true; // We're in the middle of creating a site
      }
    }

    return false;
  }

  /**
   * Helper function to broadcast progress updates to all renderer windows
   */
  function broadcastProgress(site: any, stage: string, progress: number, message: string) {
    if (!isTrackedSite(site)) {
      return; // Not one of our sites
    }

    // Skip if we already sent this exact progress percentage (deduplication)
    const lastProgress = lastBroadcastedProgress.get(site.id);
    if (lastProgress === progress) {
      localLogger.info(
        `[AI Site Builder] Skipping duplicate progress: ${progress}% for site ${site.id}`
      );
      return;
    }

    lastBroadcastedProgress.set(site.id, progress);
    localLogger.info(`[AI Site Builder] Progress: ${stage} (${progress}%) - ${message}`);

    // Send to all renderer windows
    const windows = BrowserWindow.getAllWindows();
    localLogger.info(`[AI Site Builder] Broadcasting to ${windows.length} window(s)`);

    windows.forEach((window) => {
      window.webContents.send('ai-site-builder:progress', {
        siteId: site.id,
        stage,
        progress,
        message,
      });
      localLogger.info(`[AI Site Builder] Sent progress event to window ${window.id}`);
    });
  }

  // ========================================
  // Site Creation Progress Hooks
  // ========================================

  // HOOK 1: Site provisioning started (container creation)
  context.hooks.addAction('siteProvisioning', (site: any) => {
    if (isTrackedSite(site)) {
      localLogger.info(`[AI Site Builder] Site provisioning started: ${site.id} (${site.name})`);
      broadcastProgress(site, 'creating', 15, 'Creating site container...');
    }
  });

  // HOOK 2: Site provisioned (container ready)
  context.hooks.addAction('siteProvisioned', (site: any) => {
    if (isTrackedSite(site)) {
      localLogger.info(`[AI Site Builder] Site provisioned: ${site.id} (${site.name})`);
      broadcastProgress(
        site,
        'provisioned',
        30,
        'Site container created, preparing WordPress installation...'
      );

      // Start simulated progress during WordPress download/install (30% -> 55%)
      // This fills the gap where no hooks fire during WordPress installation
      let currentProgress = 30;
      const timer = setInterval(() => {
        if (currentProgress < 55) {
          currentProgress += 5;
          const messages = [
            'Downloading WordPress...',
            'Installing WordPress core...',
            'Setting up database...',
            'Configuring WordPress...',
            'Finalizing WordPress installation...',
          ];
          const messageIndex = Math.min(
            Math.floor((currentProgress - 30) / 5),
            messages.length - 1
          );
          broadcastProgress(site, 'installing', currentProgress, messages[messageIndex]);
        } else {
          // Stop at 55%, waiting for actual WordPress install hook
          clearInterval(timer);
          wpInstallTimers.delete(site.id);
        }
      }, 3000); // Update every 3 seconds

      wpInstallTimers.set(site.id, timer);
    }
  });

  // HOOK 3: WordPress installation completed
  // Hook into WordPress installation to apply AI-generated structure
  context.hooks.addAction('wordPressInstaller:standardInstall', async (site: any) => {
    try {
      // Clear any running WordPress install timer
      const timer = wpInstallTimers.get(site.id);
      if (timer) {
        clearInterval(timer);
        wpInstallTimers.delete(site.id);
      }

      // Broadcast progress if this is one of our sites
      if (isTrackedSite(site)) {
        localLogger.info(
          `[AI Site Builder] WordPress installation completed: ${site.id} (${site.name})`
        );
        broadcastProgress(site, 'installing', 60, 'WordPress installed successfully!');
      }

      // Check if this site was created with AI Site Builder
      // Look up by site.id first, then by site.name (in case IPC handler hasn't updated key yet)
      let pending = pendingStructures.get(site.id);
      if (!pending) {
        pending = pendingStructures.get(site.name);
      }

      if (!pending) {
        // Not one of our sites
        localLogger.info(
          `[AI Site Builder] No pending structure found for ${site.id} (${site.name})`
        );
        return;
      }

      localLogger.info(`[AI Site Builder] Found pending structure for ${site.id} (${site.name})`);

      // If we found it by siteName, update to use siteId as key
      if (!pendingStructures.has(site.id)) {
        pendingStructures.delete(site.name);
        pendingStructures.set(site.id, pending);
        localLogger.info(`[AI Site Builder] Updated structure key from ${site.name} to ${site.id}`);
      }

      localLogger.info(
        `[AI Site Builder] Applying AI-generated structure to site ${site.id} (project ${pending.projectId})`
      );

      // Update progress before applying structure
      const hasFigma = !!pending.figmaAnalysis;
      const progressMessage = hasFigma
        ? 'Installing plugins, configuring content types, and applying Figma design...'
        : 'Installing plugins and configuring content types...';
      broadcastProgress(site, 'applying', 70, progressMessage);

      // Wait for WordPress to fully initialize
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Apply the structure to the site (with optional Figma analysis for enhanced design)
      await applyStructureToSite(site, pending.structure, localLogger, pending.figmaAnalysis);

      // Update progress after structure applied
      const completionMessage = hasFigma
        ? 'AI structure and Figma design applied, starting site services...'
        : 'AI structure applied, starting site services...';
      broadcastProgress(site, 'applied', 90, completionMessage);

      // Clean up
      pendingStructures.delete(site.id);

      localLogger.info(`[AI Site Builder] Structure application completed for site ${site.id}`);

      // Wait a moment for services to fully start, then send completion
      // (siteStarted hook fires too early and we miss it after structure is processed)
      setTimeout(() => {
        localLogger.info(`[AI Site Builder] Site ${site.id} ready - sending completion`);
        broadcastProgress(site, 'complete', 100, 'Your site is ready!');

        // Remove from tracking after completion
        for (const [siteName, siteId] of activeSiteCreations.entries()) {
          if (siteId === site.id || siteName === site.name) {
            activeSiteCreations.delete(siteName);
            localLogger.info(`[AI Site Builder] Removed ${siteName} from active tracking`);
          }
        }

        // Clean up deduplication map
        lastBroadcastedProgress.delete(site.id);
      }, 3000);
    } catch (error) {
      localLogger.error('[AI Site Builder] Error in wordPressInstaller hook:', error);

      // Broadcast error if this is one of our sites
      if (isTrackedSite(site)) {
        // Clean up timer
        const timer = wpInstallTimers.get(site.id);
        if (timer) {
          clearInterval(timer);
          wpInstallTimers.delete(site.id);
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        broadcastProgress(site, 'error', 0, `Error applying structure: ${errorMessage}`);

        // Remove from tracking (by siteName)
        for (const [siteName, siteId] of activeSiteCreations.entries()) {
          if (siteId === site.id || siteName === site.name) {
            activeSiteCreations.delete(siteName);
          }
        }

        // Clean up deduplication map
        lastBroadcastedProgress.delete(site.id);
      }
    }
  });

  // HOOK 4: Site starting (services spinning up)
  // Only respond if we have a siteId (site has been created)
  context.hooks.addAction('siteStarting', (site: any) => {
    if (!isTrackedSite(site)) {
      return;
    }

    // Extra safety: Only respond if we have siteId in our tracking (not just siteName)
    let hasSiteId = false;
    for (const [_siteName, siteId] of activeSiteCreations.entries()) {
      if (siteId === site.id) {
        hasSiteId = true;
        break;
      }
    }

    if (hasSiteId) {
      localLogger.info(`[AI Site Builder] Site starting: ${site.id} (${site.name})`);
      broadcastProgress(site, 'starting', 95, 'Starting WordPress services (PHP, MySQL, Nginx)...');
    }
  });

  // HOOK 5: Site fully started - Complete!
  // Only respond if this is our site AND structure has been processed
  context.hooks.addAction('siteStarted', (site: any) => {
    if (!isTrackedSite(site)) {
      return;
    }

    // Check that structure has been processed (or wasn't required)
    // Check by BOTH site.id and site.name because structure might still be keyed by siteName
    const hasStructureById = pendingStructures.has(site.id);
    const hasStructureByName = pendingStructures.has(site.name);
    const hadStructure = hasStructureById || hasStructureByName;
    const structureProcessed = !hadStructure; // If no structure was pending, it's processed

    localLogger.info(
      `[AI Site Builder] siteStarted check for ${site.id} (${site.name}): ` +
        `structureById=${hasStructureById}, structureByName=${hasStructureByName}, processed=${structureProcessed}`
    );

    if (structureProcessed) {
      localLogger.info(`[AI Site Builder] Site fully started: ${site.id} (${site.name})`);
      broadcastProgress(site, 'complete', 100, 'Your site is ready!');

      // Cleanup after a short delay
      setTimeout(() => {
        // Clean up any remaining timers
        const timer = wpInstallTimers.get(site.id);
        if (timer) {
          clearInterval(timer);
          wpInstallTimers.delete(site.id);
        }

        // Remove from tracking (by siteName)
        for (const [siteName, siteId] of activeSiteCreations.entries()) {
          if (siteId === site.id || siteName === site.name) {
            activeSiteCreations.delete(siteName);
            localLogger.info(`[AI Site Builder] Removed ${siteName} from active tracking`);
          }
        }

        // Clean up deduplication map
        lastBroadcastedProgress.delete(site.id);
      }, 5000);
    } else {
      localLogger.info(
        `[AI Site Builder] Waiting for structure to be processed for ${site.id} (${site.name})`
      );
    }
  });

  // ========================================
  // Listen to Local's Internal Progress Events
  // ========================================

  // Map Local's internal progress messages to percentages
  const localProgressMap: Record<string, number> = {
    'Creating Site Folders': 5,
    'Compiling Service Configs': 10,
    'Provisioning Services': 15,
    'Starting up Site Services': 25,
    'Downloading WordPress': 35,
    'Installing WordPress': 45,
  };

  // Listen to Local's updateSiteMessage IPC events
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ipcMain } = require('electron');

  ipcMain.on('updateSiteMessage', (event: any, siteId: string, message: any) => {
    // Log ALL events for debugging (even non-tracked sites)
    localLogger.info(`[AI Site Builder] ========================================`);
    localLogger.info(`[AI Site Builder] Received updateSiteMessage event`);
    localLogger.info(`[AI Site Builder] siteId: ${siteId}`);
    localLogger.info(`[AI Site Builder] message type: ${typeof message}`);
    localLogger.info(`[AI Site Builder] message value: ${message}`);
    localLogger.info(`[AI Site Builder] message JSON:`, JSON.stringify(message, null, 2));
    localLogger.info(
      `[AI Site Builder] message keys:`,
      message ? Object.keys(message) : 'null/undefined'
    );
    localLogger.info(`[AI Site Builder] isTracked: ${isTrackedSiteById(siteId)}`);

    // Only respond to our tracked sites
    if (!isTrackedSiteById(siteId)) {
      localLogger.info(`[AI Site Builder] Ignoring - not a tracked site`);
      localLogger.info(`[AI Site Builder] ========================================`);
      return;
    }

    // Get the site object (need it for broadcastProgress)
    const site = services.siteData.getSite(siteId);
    if (!site) {
      localLogger.info(`[AI Site Builder] Local progress event for unknown site: ${siteId}`);
      localLogger.info(`[AI Site Builder] ========================================`);
      return;
    }

    // Map the message to a progress percentage
    const messageLabel = message?.label || '';
    localLogger.info(`[AI Site Builder] Extracted label: "${messageLabel}"`);

    const progress = localProgressMap[messageLabel];
    localLogger.info(`[AI Site Builder] Mapped progress: ${progress}`);

    if (progress) {
      localLogger.info(`[AI Site Builder] Broadcasting: ${messageLabel} (${progress}%)`);
      broadcastProgress(site, 'creating', progress, messageLabel);
    } else {
      localLogger.info(`[AI Site Builder] No progress mapping found for: "${messageLabel}"`);
      localLogger.info(`[AI Site Builder] Available mappings:`, Object.keys(localProgressMap));
    }

    localLogger.info(`[AI Site Builder] ========================================`);
  });

  localLogger.info('[AI Site Builder] Registered Local IPC progress listener');
  localLogger.info('[AI Site Builder] Addon initialized successfully');
}

/**
 * Register a site for progress tracking
 * Call with siteName BEFORE addSite(), then update with siteId AFTER addSite()
 */
export function registerSiteCreation(siteName: string, siteId?: string): void {
  const services = LocalMain.getServiceContainer().cradle as any;
  const { localLogger } = services;

  if (siteId) {
    // Update existing entry with siteId
    activeSiteCreations.set(siteName, siteId);
    localLogger.info(`[AI Site Builder] Updated tracking for ${siteName} with siteId: ${siteId}`);
  } else {
    // Register by siteName only (before addSite)
    activeSiteCreations.set(siteName, null);
    localLogger.info(`[AI Site Builder] Registered site ${siteName} for progress tracking`);
  }
}

/**
 * Clear all progress tracking
 * Useful for resetting state before starting a new site creation
 */
export function clearProgressTracking(): void {
  const services = LocalMain.getServiceContainer().cradle as any;
  const { localLogger } = services;

  const siteCount = activeSiteCreations.size;
  const timerCount = wpInstallTimers.size;

  // Clear all timers
  wpInstallTimers.forEach((timer) => {
    clearInterval(timer);
  });
  wpInstallTimers.clear();

  // Clear tracking
  activeSiteCreations.clear();

  // Clear deduplication map
  lastBroadcastedProgress.clear();

  localLogger.info(
    `[AI Site Builder] Cleared progress tracking (${siteCount} sites, ${timerCount} timers)`
  );
}

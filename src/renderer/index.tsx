/**
 * Renderer process entry point for AI Site Builder addon
 */

import * as React from 'react';
import * as LocalRenderer from '@getflywheel/local/renderer';
import { EntryScreen } from './components/EntryScreen';
import { QuestionScreen } from './components/QuestionScreen';
import { ConversationScreen } from './components/ConversationScreen';
import { FigmaConnectScreen } from './components/FigmaConnectScreen';
import { ReviewStructure } from './components/ReviewStructure';
import { BuildingScreen } from './components/BuildingScreen';
import { PreferencesPanel } from './components/PreferencesPanel';
import { FLOW_NAME, ROUTES, STEPS, IPC_CHANNELS } from '../common/constants';
import { setElectron } from './electron-context';

/**
 * Renderer addon initialization
 *
 * Uses filter hooks to register a custom site creation flow:
 * - CreateSite:RadioOptions - Adds "AI Site Builder" option to the radio selector
 * - CreateSite:Steps - Provides step definitions and components for our flow
 */
export default function (context: LocalRenderer.AddonRendererContext): void {
  console.log('[AI Site Builder] Initializing renderer');

  const { hooks } = context;

  // Store electron reference for components to access
  const electron = context.electron || (window as any).electron;
  if (electron) {
    setElectron(electron);
    console.log('[AI Site Builder] Electron context stored');
  } else {
    console.warn('[AI Site Builder] Electron not available during initialization');
  }

  if (!hooks || !hooks.addFilter) {
    console.error('[AI Site Builder] Hooks not available in context');
    return;
  }

  // Add our custom flow to the radio options
  hooks.addFilter('CreateSite:RadioOptions', (options: any) => {
    return {
      ...options,
      [FLOW_NAME]: {
        label: 'AI Site Builder',
        description: React.createElement(
          'div',
          null,
          'Build a WordPress site with AI assistance. Describe your project, connect a Figma design, or choose from templates.'
        ),
      },
    };
  });

  // Add steps for our flow
  hooks.addFilter('CreateSite:Steps', function (this: any, steps: any) {
    console.log('[AI Site Builder] ======== CreateSite:Steps FILTER ========');
    console.log('[AI Site Builder] selectedCreateSiteFlow:', this.selectedCreateSiteFlow);
    console.log('[AI Site Builder] FLOW_NAME:', FLOW_NAME);
    console.log('[AI Site Builder] Match?', this.selectedCreateSiteFlow === FLOW_NAME);

    if (this.selectedCreateSiteFlow === FLOW_NAME) {
      const customSteps = [
        {
          key: STEPS.ENTRY,
          path: ROUTES.ENTRY,
          name: 'Get Started',
          component: EntryScreen,
        },
        {
          key: STEPS.FIGMA_CONNECT,
          path: ROUTES.FIGMA_CONNECT,
          name: 'Figma',
          component: FigmaConnectScreen,
        },
        {
          key: STEPS.QUESTIONS,
          path: ROUTES.QUESTIONS,
          name: 'Questions',
          component: QuestionScreen,
        },
        {
          key: STEPS.CONVERSATION,
          path: ROUTES.CONVERSATION,
          name: 'Conversation',
          component: ConversationScreen,
        },
        {
          key: STEPS.REVIEW_STRUCTURE,
          path: ROUTES.REVIEW_STRUCTURE,
          name: 'Review',
          component: ReviewStructure,
        },
        {
          key: STEPS.BUILDING,
          path: ROUTES.BUILDING,
          name: 'Building',
          component: BuildingScreen,
        },
      ];

      console.log('[AI Site Builder] Returning custom steps:');
      customSteps.forEach((step, i) => {
        console.log(
          `[AI Site Builder]   Step ${i}: key="${step.key}", path="${step.path}", name="${step.name}"`
        );
      });
      console.log('[AI Site Builder] =========================================');
      return customSteps;
    }

    // Return original steps for other flows
    console.log('[AI Site Builder] Not our flow, returning original steps');
    console.log('[AI Site Builder] =========================================');
    return steps;
  });

  // Register preferences panel
  let pendingSettings: any = null;

  hooks.addFilter('preferencesMenuItems', (items: any[]) => {
    return [
      ...items,
      {
        path: '/ai-site-builder',
        displayName: '🤖 AI Site Builder',
        sections: (props: any) =>
          React.createElement(PreferencesPanel, {
            context,
            setApplyButtonDisabled: props?.setApplyButtonDisabled,
            onSettingsChange: (settings: any) => {
              pendingSettings = settings;
            },
          }),
        onApply: async () => {
          if (!pendingSettings) return;

          const electron = context.electron || (window as any).electron;
          if (electron) {
            try {
              const response = await electron.ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTINGS, {
                settings: pendingSettings,
              });

              if (response.success) {
                console.log('[AI Site Builder] Settings saved successfully');
                pendingSettings = null;
              } else {
                console.error('[AI Site Builder] Failed to save settings:', response.error);
              }
            } catch (error) {
              console.error('[AI Site Builder] Error saving settings:', error);
            }
          }
        },
      },
    ];
  });

  console.log('[AI Site Builder] Flow and preferences registered successfully');
}

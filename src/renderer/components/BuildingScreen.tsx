/**
 * Building Screen - Shows progress while WordPress installs and structure applies
 *
 * Displays animated progress through 4 stages:
 * 1. Creating (0-30%) - Site container creation
 * 2. Installing (30-70%) - WordPress installation
 * 3. Applying (70-95%) - AI structure application
 * 4. Complete (100%) - Ready to view
 */

import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { getElectron } from '../electron-context';
import { CustomStepper } from './CustomStepper';

interface Props extends RouteComponentProps {
  siteSettings: any;
  updateSiteSettings?: (settings: any) => void;
  context?: any;
}

type Stage = 'creating' | 'installing' | 'applying' | 'complete' | 'error';

interface State {
  stage: Stage;
  message: string;
  progress: number;
  error: string | null;
}

export class BuildingScreen extends React.Component<Props, State> {
  private progressListener?: any;

  constructor(props: Props) {
    super(props);
    this.state = {
      stage: 'creating',
      message: 'Preparing site creation...',
      progress: 0,
      error: null,
    };
  }

  componentDidMount() {
    console.log('[BuildingScreen] Component mounted');
    console.log('[BuildingScreen] Current URL:', window.location.href);
    console.log('[BuildingScreen] Current hash:', window.location.hash);
    console.log('[BuildingScreen] Current pathname:', window.location.pathname);
    console.log('[BuildingScreen] History location:', this.props.history.location);
    console.log('[BuildingScreen] Site settings:', this.props.siteSettings);
    console.log('[BuildingScreen] Current siteId:', this.props.siteSettings.siteId);

    // Set up IPC listener for real-time progress events
    try {
      const electron = getElectron();
      console.log('[BuildingScreen] Got electron context:', !!electron);
      console.log('[BuildingScreen] IpcRenderer available:', !!electron?.ipcRenderer);

      this.progressListener = (_event: any, data: any) => {
        console.log('[BuildingScreen] ========================================');
        console.log('[BuildingScreen] Progress event received!');
        console.log('[BuildingScreen] Event data:', data);
        console.log(
          '[BuildingScreen] Current props.siteSettings.siteId:',
          this.props.siteSettings.siteId
        );

        const { siteId, stage, progress, message } = data;

        // Only update if this is our site (or if we don't have a siteId yet)
        const shouldUpdate =
          !this.props.siteSettings.siteId || siteId === this.props.siteSettings.siteId;
        console.log('[BuildingScreen] Should update?', shouldUpdate);

        if (shouldUpdate) {
          console.log('[BuildingScreen] Updating state to:', { stage, progress, message });
          this.setState({
            stage,
            progress,
            message,
            error: stage === 'error' ? message : null,
          });
          console.log('[BuildingScreen] State updated');
        } else {
          console.log('[BuildingScreen] Ignoring event - siteId mismatch');
        }
        console.log('[BuildingScreen] ========================================');
      };

      electron.ipcRenderer.on('ai-site-builder:progress', this.progressListener);
      console.log('[BuildingScreen] Progress listener registered successfully');
      console.log('[BuildingScreen] Listening on channel: ai-site-builder:progress');
    } catch (error) {
      console.error('[BuildingScreen] Error setting up progress listener:', error);
      this.setState({
        stage: 'error',
        error: 'Unable to connect to Local. Please restart the app.',
        progress: 0,
      });
    }
  }

  componentWillUnmount() {
    // Clean up IPC listener
    if (this.progressListener) {
      try {
        const electron = getElectron();
        electron.ipcRenderer.removeListener('ai-site-builder:progress', this.progressListener);
        console.log('[BuildingScreen] Progress listener removed');
      } catch (error) {
        console.error('[BuildingScreen] Error removing progress listener:', error);
      }
    }
  }

  handleViewSite = () => {
    console.log('[BuildingScreen] User requested to view site');
    const { siteId } = this.props.siteSettings;

    if (!siteId) {
      console.error('[BuildingScreen] No siteId available');
      alert('Unable to locate site. Please check the sidebar.');
      return;
    }

    try {
      console.log('[BuildingScreen] Navigating to site:', siteId);
      // Use replace() so back button doesn't return to completion screen
      this.props.history.replace(`/site-info/${siteId}/overview`);
    } catch (error) {
      console.error('[BuildingScreen] Navigation failed:', error);
      alert('Unable to navigate to site. Please find it in the sidebar.');
    }
  };

  handleStartOver = () => {
    console.log('[BuildingScreen] User requested to start over');
    this.props.history.push('/main/create-site/ai-builder');
  };

  private getStageColor(stage: Stage): string {
    switch (stage) {
      case 'creating':
        return '#ff9800'; // Orange
      case 'installing':
        return '#2196F3'; // Blue
      case 'applying':
        return '#9c27b0'; // Purple
      case 'complete':
        return '#4caf50'; // Green
      case 'error':
        return '#f44336'; // Red
      default:
        return '#666';
    }
  }

  private getStageLabel(stage: Stage): string {
    switch (stage) {
      case 'creating':
        return 'Creating';
      case 'installing':
        return 'Installing';
      case 'applying':
        return 'Applying Structure';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Error';
      default:
        return stage;
    }
  }

  render() {
    const { stage, message, progress, error } = this.state;

    console.log('[BuildingScreen] ========== RENDER ==========');
    console.log('[BuildingScreen] Rendering with state:', { stage, progress, message, error });
    console.log('[BuildingScreen] Current URL:', window.location.href);
    console.log('[BuildingScreen] Current pathname:', window.location.pathname);
    console.log('[BuildingScreen] ================================');

    // Error state
    if (error) {
      return React.createElement(
        'div',
        {
          className: 'AddSiteContent',
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '40px',
          },
        },
        React.createElement(
          'div',
          {
            style: {
              textAlign: 'center',
              maxWidth: '500px',
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            },
          },
          React.createElement(
            'div',
            {
              style: {
                fontSize: '48px',
                marginBottom: '16px',
              },
            },
            '❌'
          ),
          React.createElement(
            'h2',
            {
              style: {
                color: '#f44336',
                marginBottom: '16px',
                fontSize: '24px',
                fontWeight: 600,
              },
            },
            'Error Creating Site'
          ),
          React.createElement('p', { style: { color: '#666', marginBottom: '24px' } }, error),
          React.createElement(
            'button',
            {
              onClick: this.handleStartOver,
              className: 'Button Button--primary',
              style: { width: '100%' },
            },
            'Start Over'
          )
        )
      );
    }

    // Building/Complete state
    return React.createElement(
      'div',
      {
        className: 'AddSiteContent',
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          backgroundColor: '#fafafa',
          padding: '40px',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            textAlign: 'center',
            maxWidth: '600px',
            width: '100%',
            padding: '40px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          },
        },

        // Animated spinner (only show when not complete)
        stage !== 'complete' &&
          React.createElement('div', {
            style: {
              width: '80px',
              height: '80px',
              margin: '0 auto 24px',
              borderRadius: '50%',
              border: '4px solid #e0e0e0',
              borderTopColor: this.getStageColor(stage),
              animation: 'spin 1s linear infinite',
            },
          }),

        // Completion checkmark
        stage === 'complete' &&
          React.createElement(
            'div',
            {
              style: {
                fontSize: '64px',
                marginBottom: '24px',
              },
            },
            '✅'
          ),

        // Stage indicator badge
        React.createElement(
          'div',
          { style: { marginBottom: '24px' } },
          React.createElement(
            'div',
            {
              style: {
                display: 'inline-block',
                padding: '8px 16px',
                backgroundColor: this.getStageColor(stage),
                color: 'white',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              },
            },
            this.getStageLabel(stage)
          )
        ),

        // Title
        React.createElement(
          'h2',
          {
            style: {
              fontSize: '28px',
              marginBottom: '12px',
              fontWeight: 600,
              color: '#333',
            },
          },
          stage === 'complete' ? 'Site Created Successfully!' : 'Building Your Site'
        ),

        // Message
        React.createElement(
          'p',
          {
            style: {
              color: '#666',
              marginBottom: '32px',
              fontSize: '16px',
              lineHeight: '1.6',
            },
          },
          message
        ),

        // Progress bar container
        React.createElement(
          'div',
          {
            style: {
              width: '100%',
              marginBottom: '24px',
            },
          },

          // Progress bar background
          React.createElement(
            'div',
            {
              style: {
                width: '100%',
                height: '8px',
                backgroundColor: '#e0e0e0',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '8px',
              },
            },

            // Progress bar fill
            React.createElement('div', {
              style: {
                width: `${progress}%`,
                height: '100%',
                backgroundColor: this.getStageColor(stage),
                transition: 'width 0.3s ease, background-color 0.3s ease',
              },
            })
          ),

          // Progress percentage
          React.createElement(
            'div',
            {
              style: {
                color: '#999',
                fontSize: '14px',
                fontWeight: 600,
              },
            },
            `${progress}%`
          )
        ),

        // Site details card
        React.createElement(
          'div',
          {
            style: {
              backgroundColor: '#f5f5f5',
              padding: '20px',
              borderRadius: '8px',
              marginTop: '24px',
              textAlign: 'left',
            },
          },

          React.createElement(
            'div',
            {
              style: {
                fontSize: '12px',
                color: '#999',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              },
            },
            'Site Name'
          ),

          React.createElement(
            'div',
            {
              style: {
                fontSize: '16px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '16px',
              },
            },
            this.props.siteSettings.projectName ||
              this.props.siteSettings.siteName ||
              'Unnamed Site'
          ),

          this.props.siteSettings.siteId &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement(
                'div',
                {
                  style: {
                    fontSize: '12px',
                    color: '#999',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  },
                },
                'Site ID'
              ),
              React.createElement(
                'div',
                {
                  style: {
                    fontSize: '14px',
                    color: '#666',
                    fontFamily: 'monospace',
                  },
                },
                this.props.siteSettings.siteId
              )
            )
        ),

        // View Site button (only when complete)
        stage === 'complete' &&
          React.createElement(
            'button',
            {
              onClick: this.handleViewSite,
              className: 'Button Button--primary',
              style: {
                marginTop: '24px',
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                fontWeight: 600,
              },
            },
            'View Site in Local'
          ),

        // CSS animation for spinner
        React.createElement(
          'style',
          null,
          `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `
        )
      ),

      // Custom stepper with proper state management
      React.createElement(CustomStepper, {
        currentPath: this.props.history.location.pathname,
      })
    );
  }
}

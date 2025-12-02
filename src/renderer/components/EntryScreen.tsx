/**
 * Entry Screen - First step of AI Site Builder flow
 * Presents pathways for starting a new site
 */

import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { ENTRY_PATHWAYS, ROUTES, IPC_CHANNELS } from '../../common/constants';
import { getElectron } from '../electron-context';
import { CustomStepper } from './CustomStepper';

interface Props extends RouteComponentProps {
  siteSettings: any;
  updateSiteSettings?: (settings: any) => void;
}

interface State {
  descriptionText: string;
  hasProvider: boolean;
  checkingProvider: boolean;
}

export class EntryScreen extends React.Component<Props, State> {
  private textareaRef: React.RefObject<HTMLTextAreaElement>;

  constructor(props: Props) {
    super(props);
    this.textareaRef = React.createRef();
    this.state = {
      descriptionText: '',
      hasProvider: true,
      checkingProvider: true,
    };
  }

  async componentDidMount() {
    // Check provider status
    await this.checkProviderStatus();

    // Auto-focus the description textarea
    if (this.textareaRef.current) {
      this.textareaRef.current.focus();
    }
  }

  async checkProviderStatus() {
    try {
      const electron = getElectron();
      const response = await electron.ipcRenderer.invoke(IPC_CHANNELS.GET_PROVIDERS);

      const hasConfigured = response.success &&
        response.providers.some((p: { hasApiKey: boolean }) => p.hasApiKey);

      console.log('[EntryScreen] Provider status:', { hasConfigured, providers: response.providers });

      this.setState({
        hasProvider: hasConfigured,
        checkingProvider: false,
      });
    } catch (error) {
      console.error('[EntryScreen] Error checking provider status:', error);
      // On error, assume provider exists to not block users
      this.setState({
        hasProvider: true,
        checkingProvider: false,
      });
    }
  }

  handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ descriptionText: e.target.value });
  };

  handleContinueToQuestions = () => {
    // Store the description
    if (this.props.updateSiteSettings) {
      this.props.updateSiteSettings({
        entryPathway: ENTRY_PATHWAYS.DESCRIBE,
        initialDescription: this.state.descriptionText,
      });
    }

    // Navigate to questions wizard
    console.log('[EntryScreen] Navigating to questions wizard');
    this.props.history.push(ROUTES.QUESTIONS);
  };

  handleFigmaConnect = () => {
    console.log('[EntryScreen] Navigating to Figma connect');
    this.props.history.push(ROUTES.FIGMA_CONNECT);
  };

  renderNoProviderState() {
    return React.createElement(
      'div',
      {
        className: 'AddSiteContent',
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '80px 40px',
          textAlign: 'center',
        }
      },

      // Icon
      React.createElement(
        'div',
        { style: { fontSize: '64px', marginBottom: '24px' } },
        '🔑'
      ),

      // Headline
      React.createElement(
        'h2',
        {
          style: {
            fontSize: '24px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '12px',
          }
        },
        'Configure an AI Provider to Get Started'
      ),

      // Description
      React.createElement(
        'p',
        {
          style: {
            fontSize: '15px',
            color: '#666',
            marginBottom: '24px',
            maxWidth: '450px',
            lineHeight: '1.6',
          }
        },
        'AI Site Builder uses AI to help you create WordPress sites. Configure an AI provider to enable AI-powered site generation.'
      ),

      // Instructions box
      React.createElement(
        'div',
        {
          style: {
            backgroundColor: '#f5f5f5',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '20px 24px',
            marginBottom: '24px',
            maxWidth: '400px',
          }
        },
        React.createElement(
          'p',
          {
            style: {
              fontSize: '14px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '8px',
            }
          },
          'To configure your AI provider:'
        ),
        React.createElement(
          'p',
          {
            style: {
              fontSize: '14px',
              color: '#666',
              margin: 0,
              fontFamily: 'monospace',
            }
          },
          'Local → Preferences → AI Site Builder'
        )
      ),

      // Help text
      React.createElement(
        'p',
        {
          style: {
            fontSize: '13px',
            color: '#999',
            maxWidth: '420px',
            lineHeight: '1.5',
          }
        },
        'You\'ll need an API key from your chosen provider. Get one from console.anthropic.com (Claude), platform.openai.com (OpenAI), or aistudio.google.com (Gemini).'
      )
    );
  }

  renderLoadingState() {
    return React.createElement(
      'div',
      {
        className: 'AddSiteContent',
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }
      },
      React.createElement(
        'div',
        { style: { color: '#666', fontSize: '15px' } },
        'Loading...'
      )
    );
  }

  render() {
    const { descriptionText, hasProvider, checkingProvider } = this.state;

    // Show loading state while checking provider status
    if (checkingProvider) {
      return this.renderLoadingState();
    }

    // Show empty state if no provider configured
    if (!hasProvider) {
      return this.renderNoProviderState();
    }

    return React.createElement(
      'div',
      {
        className: 'AddSiteContent',
        style: {
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'auto',
        }
      },

      // Main content
      React.createElement(
        'div',
        {
          style: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '60px 40px 40px',
            maxWidth: '900px',
            margin: '0 auto',
            width: '100%',
          }
        },

        // Title
        React.createElement(
          'h1',
          {
            style: {
              fontSize: '36px',
              fontWeight: 600,
              marginBottom: '12px',
              textAlign: 'center',
              color: '#1a1a1a',
            }
          },
          'Create your WordPress site'
        ),

        // Subtitle
        React.createElement(
          'p',
          {
            style: {
              color: '#666',
              fontSize: '16px',
              marginBottom: '40px',
              textAlign: 'center',
            }
          },
          'Describe what you\'re building and we\'ll help you create it'
        ),

        // Main textarea container with button inside
        React.createElement(
          'div',
          {
            style: {
              width: '100%',
              maxWidth: '700px',
              border: '2px solid #51a351',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              backgroundColor: '#fff',
            }
          },

          // Textarea
          React.createElement('textarea', {
            ref: this.textareaRef,
            value: descriptionText,
            onChange: this.handleDescriptionChange,
            placeholder: 'Describe what you\'re building... (e.g., \'A recipe sharing website with user-submitted content\')',
            style: {
              width: '100%',
              minHeight: '80px',
              padding: '0',
              border: 'none',
              fontSize: '16px',
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none',
              lineHeight: '1.5',
              color: '#333',
            },
            onKeyDown: (e: any) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                this.handleContinueToQuestions();
              }
            },
          }),

          // Bottom row with keyboard hint and button
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '16px',
                marginTop: '16px',
              }
            },

            // Keyboard hint
            React.createElement(
              'span',
              {
                style: {
                  fontSize: '13px',
                  color: '#999',
                }
              },
              '⌘ + Enter to submit'
            ),

            // Continue button
            React.createElement(
              'button',
              {
                onClick: this.handleContinueToQuestions,
                style: {
                  padding: '12px 24px',
                  fontSize: '15px',
                  fontWeight: 600,
                  backgroundColor: '#51a351',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                },
              },
              'Continue to questions',
              React.createElement('span', null, '→')
            )
          )
        ),

        // Connect Figma button
        React.createElement(
          'button',
          {
            onClick: this.handleFigmaConnect,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 28px',
              fontSize: '15px',
              fontWeight: 500,
              backgroundColor: '#fff',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
            },
          },
          React.createElement('span', { style: { fontSize: '18px' } }, '📐'),
          'Connect a Figma design'
        )
      ),

      // Custom stepper
      React.createElement(CustomStepper, {
        currentPath: this.props.history.location.pathname,
      })
    );
  }
}

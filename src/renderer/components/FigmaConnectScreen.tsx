/**
 * FigmaConnectScreen - Connect Figma designs to extract design tokens
 * Allows users to paste a Figma URL and personal access token
 * to analyze their design and extract colors, typography, spacing
 */

import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { ROUTES, IPC_CHANNELS } from '../../common/constants';
import { FigmaAnalysis, FigmaRateLimitInfo } from '../../common/types';
import { getElectron } from '../electron-context';
import { CustomStepper } from './CustomStepper';

interface Props extends RouteComponentProps {
  siteSettings: any;
  updateSiteSettings?: (settings: any) => void;
}

interface State {
  step: 'input' | 'connecting' | 'preview' | 'error';
  figmaUrl: string;
  figmaToken: string;
  analysis: FigmaAnalysis | null;
  error: string | null;
  hasStoredToken: boolean;
  showTokenInput: boolean;
  // Rate limit handling
  rateLimited: boolean;
  rateLimitInfo: FigmaRateLimitInfo | null;
  retryCountdown: number;
}

export class FigmaConnectScreen extends React.Component<Props, State> {
  private urlInputRef: React.RefObject<HTMLInputElement>;
  private countdownInterval: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.urlInputRef = React.createRef();
    this.state = {
      step: 'input',
      figmaUrl: '',
      figmaToken: '',
      analysis: null,
      error: null,
      hasStoredToken: false,
      showTokenInput: false,
      rateLimited: false,
      rateLimitInfo: null,
      retryCountdown: 0,
    };
  }

  componentWillUnmount() {
    // Clear countdown timer on unmount
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  /**
   * Start countdown timer for rate limit retry
   */
  startRetryCountdown(seconds: number) {
    // Clear any existing countdown
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.setState({ retryCountdown: seconds });

    this.countdownInterval = setInterval(() => {
      this.setState((prev) => {
        const newCount = prev.retryCountdown - 1;
        if (newCount <= 0) {
          if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
          }
          return { retryCountdown: 0 };
        }
        return { retryCountdown: newCount };
      });
    }, 1000);
  }

  async componentDidMount() {
    // Check if we have a stored token
    try {
      const electron = getElectron();
      const hasToken = await electron.ipcRenderer.invoke(IPC_CHANNELS.GET_FIGMA_TOKEN_STATUS);
      this.setState({ hasStoredToken: hasToken });
    } catch (err) {
      console.log('[FigmaConnectScreen] Could not check token status');
    }

    // Focus URL input
    if (this.urlInputRef.current) {
      this.urlInputRef.current.focus();
    }
  }

  handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ figmaUrl: e.target.value, error: null });
  };

  handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ figmaToken: e.target.value, error: null });
  };

  toggleTokenInput = () => {
    this.setState((prev) => ({ showTokenInput: !prev.showTokenInput }));
  };

  handleConnect = async () => {
    const { figmaUrl, figmaToken, hasStoredToken } = this.state;

    if (!figmaUrl.trim()) {
      this.setState({ error: 'Please enter a Figma URL' });
      return;
    }

    // Validate URL format
    if (!figmaUrl.includes('figma.com')) {
      this.setState({ error: 'Please enter a valid Figma URL' });
      return;
    }

    // Need token if not stored
    if (!hasStoredToken && !figmaToken.trim()) {
      this.setState({
        error: 'Please enter your Figma Personal Access Token',
        showTokenInput: true,
      });
      return;
    }

    this.setState({ step: 'connecting', error: null });

    try {
      const electron = getElectron();

      // Step 1: Connect and validate
      const connectResponse = await electron.ipcRenderer.invoke(IPC_CHANNELS.CONNECT_FIGMA, {
        fileUrl: figmaUrl.trim(),
        token: figmaToken.trim() || undefined,
      });

      if (!connectResponse.success) {
        // Check for rate limiting
        if (connectResponse.rateLimited && connectResponse.rateLimitInfo) {
          this.setState({
            step: 'error',
            error: connectResponse.error || 'Figma API rate limit exceeded',
            rateLimited: true,
            rateLimitInfo: connectResponse.rateLimitInfo,
          });
          // Start countdown timer
          this.startRetryCountdown(connectResponse.rateLimitInfo.retryAfter);
        } else {
          this.setState({
            step: 'error',
            error: connectResponse.error || 'Failed to connect to Figma',
            rateLimited: false,
            rateLimitInfo: null,
          });
        }
        return;
      }

      // Step 2: Analyze design
      const analyzeResponse = await electron.ipcRenderer.invoke(IPC_CHANNELS.ANALYZE_FIGMA, {
        fileKey: connectResponse.fileKey,
      });

      if (!analyzeResponse.success) {
        // Check for rate limiting
        if (analyzeResponse.rateLimited && analyzeResponse.rateLimitInfo) {
          this.setState({
            step: 'error',
            error: analyzeResponse.error || 'Figma API rate limit exceeded',
            rateLimited: true,
            rateLimitInfo: analyzeResponse.rateLimitInfo,
          });
          // Start countdown timer
          this.startRetryCountdown(analyzeResponse.rateLimitInfo.retryAfter);
        } else {
          this.setState({
            step: 'error',
            error: analyzeResponse.error || 'Failed to analyze Figma design',
            rateLimited: false,
            rateLimitInfo: null,
          });
        }
        return;
      }

      // Success - show preview
      this.setState({
        step: 'preview',
        analysis: analyzeResponse.analysis,
        hasStoredToken: true, // Token was saved during connect
      });

      console.log('[FigmaConnectScreen] Analysis complete:', analyzeResponse.analysis);
    } catch (err: any) {
      console.error('[FigmaConnectScreen] Error:', err);
      this.setState({
        step: 'error',
        error: err.message || 'An unexpected error occurred',
      });
    }
  };

  handleContinue = () => {
    const { analysis } = this.state;

    // Save analysis to site settings
    if (this.props.updateSiteSettings && analysis) {
      this.props.updateSiteSettings({
        figmaAnalysis: analysis,
        designTokens: analysis.designTokens,
        entryPathway: 'figma-connect',
      });
    }

    // Navigate to questions flow
    this.props.history.push(ROUTES.QUESTIONS);
  };

  handleBack = () => {
    this.props.history.push(ROUTES.ENTRY);
  };

  handleRetry = () => {
    // Clear countdown timer
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    this.setState({
      step: 'input',
      error: null,
      analysis: null,
      rateLimited: false,
      rateLimitInfo: null,
      retryCountdown: 0,
    });
  };

  render() {
    const { step } = this.state;

    return React.createElement(
      'div',
      {
        className: 'AddSiteContent',
        style: {
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'auto',
        },
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
            maxWidth: '700px',
            margin: '0 auto',
            width: '100%',
          },
        },

        step === 'input' && this.renderInputStep(),
        step === 'connecting' && this.renderConnectingStep(),
        step === 'preview' && this.renderPreviewStep(),
        step === 'error' && this.renderErrorStep()
      ),

      // Custom stepper
      React.createElement(CustomStepper, {
        currentPath: this.props.history.location.pathname,
      })
    );
  }

  renderInputStep() {
    const { figmaUrl, figmaToken, hasStoredToken, showTokenInput, error } = this.state;

    return React.createElement(
      React.Fragment,
      null,

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
          },
        },
        'Connect your Figma design'
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
            maxWidth: '500px',
          },
        },
        "Paste a link to your Figma file and we'll extract colors, typography, and spacing to match your design."
      ),

      // URL input container
      React.createElement(
        'div',
        {
          style: {
            width: '100%',
            border: '2px solid #51a351',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            backgroundColor: '#fff',
          },
        },

        // URL input
        React.createElement('input', {
          ref: this.urlInputRef,
          type: 'text',
          value: figmaUrl,
          onChange: this.handleUrlChange,
          placeholder: 'https://figma.com/file/abc123/My-Design',
          style: {
            width: '100%',
            padding: '12px 0',
            border: 'none',
            fontSize: '16px',
            outline: 'none',
            color: '#333',
          },
          onKeyDown: (e: any) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              this.handleConnect();
            }
          },
        }),

        // Token section
        !hasStoredToken &&
          React.createElement(
            'div',
            { style: { marginTop: '16px', borderTop: '1px solid #e0e0e0', paddingTop: '16px' } },

            // Toggle button
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: this.toggleTokenInput,
                style: {
                  background: 'none',
                  border: 'none',
                  color: '#51a351',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                },
              },
              showTokenInput ? '\u25BC' : '\u25B6',
              'Personal Access Token',
              !showTokenInput &&
                React.createElement(
                  'span',
                  { style: { color: '#999', fontWeight: 'normal' } },
                  '(required)'
                )
            ),

            // Token input (when expanded)
            showTokenInput &&
              React.createElement(
                'div',
                { style: { marginTop: '12px' } },
                React.createElement('input', {
                  type: 'password',
                  value: figmaToken,
                  onChange: this.handleTokenChange,
                  placeholder: 'figd_xxxxxxxxxxxx',
                  style: {
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                  },
                }),
                React.createElement(
                  'p',
                  {
                    style: {
                      fontSize: '12px',
                      color: '#888',
                      marginTop: '8px',
                      lineHeight: '1.4',
                    },
                  },
                  'Get your token from Figma Settings > Account > Personal access tokens. ',
                  React.createElement(
                    'a',
                    {
                      href: 'https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens',
                      target: '_blank',
                      rel: 'noopener noreferrer',
                      style: { color: '#51a351' },
                    },
                    'Learn more'
                  )
                )
              )
          ),

        // Stored token indicator
        hasStoredToken &&
          React.createElement(
            'div',
            {
              style: {
                marginTop: '16px',
                borderTop: '1px solid #e0e0e0',
                paddingTop: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#666',
                fontSize: '14px',
              },
            },
            React.createElement('span', { style: { color: '#51a351' } }, '\u2713'),
            'Using saved access token'
          ),

        // Bottom row
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '16px',
              marginTop: '20px',
            },
          },

          // Keyboard hint
          React.createElement(
            'span',
            { style: { fontSize: '13px', color: '#999' } },
            '\u2318 + Enter to connect'
          ),

          // Connect button
          React.createElement(
            'button',
            {
              onClick: this.handleConnect,
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
            'Connect to Figma',
            React.createElement('span', null, '\u2192')
          )
        )
      ),

      // Error message
      error &&
        React.createElement(
          'div',
          {
            style: {
              color: '#d32f2f',
              fontSize: '14px',
              marginBottom: '16px',
              padding: '12px 16px',
              backgroundColor: '#ffebee',
              borderRadius: '8px',
              width: '100%',
            },
          },
          error
        ),

      // Back button
      React.createElement(
        'button',
        {
          onClick: this.handleBack,
          style: {
            marginTop: '24px',
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: 'transparent',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
          },
        },
        '\u2190 Back to start'
      )
    );
  }

  renderConnectingStep() {
    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px',
        },
      },

      // Spinner
      React.createElement('div', {
        style: {
          width: '48px',
          height: '48px',
          border: '4px solid #e0e0e0',
          borderTopColor: '#51a351',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '24px',
        },
      }),

      // Add keyframe animation
      React.createElement(
        'style',
        null,
        `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `
      ),

      React.createElement(
        'h2',
        {
          style: {
            fontSize: '20px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '8px',
          },
        },
        'Connecting to Figma...'
      ),

      React.createElement(
        'p',
        {
          style: {
            fontSize: '14px',
            color: '#666',
          },
        },
        'Analyzing your design for colors, typography, and spacing'
      )
    );
  }

  renderPreviewStep() {
    const { analysis } = this.state;
    const tokens = analysis?.designTokens;

    return React.createElement(
      React.Fragment,
      null,

      // Success icon
      React.createElement(
        'div',
        {
          style: {
            width: '64px',
            height: '64px',
            backgroundColor: '#e8f5e9',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            marginBottom: '24px',
          },
        },
        '\u2713'
      ),

      // Title
      React.createElement(
        'h1',
        {
          style: {
            fontSize: '28px',
            fontWeight: 600,
            marginBottom: '8px',
            color: '#1a1a1a',
          },
        },
        'Design connected!'
      ),

      // File name
      analysis &&
        React.createElement(
          'p',
          {
            style: {
              color: '#666',
              fontSize: '16px',
              marginBottom: '32px',
            },
          },
          analysis.fileName
        ),

      // Extracted tokens preview
      React.createElement(
        'div',
        {
          style: {
            width: '100%',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
          },
        },

        // Colors section
        tokens?.colors &&
          Object.keys(tokens.colors).length > 0 &&
          React.createElement(
            'div',
            { style: { marginBottom: '20px' } },
            React.createElement(
              'h3',
              {
                style: {
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#666',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                },
              },
              'Colors'
            ),
            React.createElement(
              'div',
              { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
              Object.entries(tokens.colors).map(([name, color]) =>
                React.createElement(
                  'div',
                  {
                    key: name,
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    },
                  },
                  React.createElement('div', {
                    style: {
                      width: '40px',
                      height: '40px',
                      backgroundColor: color as string,
                      borderRadius: '8px',
                      border: '1px solid rgba(0,0,0,0.1)',
                    },
                  }),
                  React.createElement('span', { style: { fontSize: '11px', color: '#888' } }, name)
                )
              )
            )
          ),

        // Typography section
        tokens?.typography &&
          React.createElement(
            'div',
            { style: { marginBottom: '20px' } },
            React.createElement(
              'h3',
              {
                style: {
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#666',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                },
              },
              'Typography'
            ),
            React.createElement(
              'div',
              { style: { display: 'flex', gap: '16px', flexWrap: 'wrap' } },

              // Font families
              tokens.typography.fontFamilies.length > 0 &&
                React.createElement(
                  'div',
                  {
                    key: 'fonts',
                    style: {
                      backgroundColor: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e0e0e0',
                    },
                  },
                  React.createElement(
                    'span',
                    { style: { fontSize: '12px', color: '#888' } },
                    'Fonts: '
                  ),
                  React.createElement(
                    'span',
                    { style: { fontSize: '14px', fontWeight: 500, color: '#333' } },
                    tokens.typography.fontFamilies.slice(0, 3).join(', ')
                  )
                ),

              // Font sizes
              ...Object.entries(tokens.typography.fontSizes).map(([name, size]) =>
                React.createElement(
                  'div',
                  {
                    key: `size-${name}`,
                    style: {
                      backgroundColor: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e0e0e0',
                    },
                  },
                  React.createElement(
                    'span',
                    { style: { fontSize: '12px', color: '#888' } },
                    `${name}: `
                  ),
                  React.createElement(
                    'span',
                    { style: { fontSize: '14px', fontWeight: 500, color: '#333' } },
                    size as string
                  )
                )
              )
            )
          ),

        // Pages count
        analysis?.pages &&
          React.createElement(
            'div',
            null,
            React.createElement(
              'p',
              { style: { fontSize: '14px', color: '#666' } },
              `Found ${analysis.pages.length} page${analysis.pages.length !== 1 ? 's' : ''} in your design`
            )
          )
      ),

      // Continue button
      React.createElement(
        'button',
        {
          onClick: this.handleContinue,
          style: {
            padding: '14px 32px',
            fontSize: '16px',
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
        React.createElement('span', null, '\u2192')
      ),

      // Back button
      React.createElement(
        'button',
        {
          onClick: this.handleRetry,
          style: {
            marginTop: '16px',
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: 'transparent',
            color: '#666',
            border: 'none',
            cursor: 'pointer',
          },
        },
        'Connect a different design'
      )
    );
  }

  renderErrorStep() {
    const { error, rateLimited, rateLimitInfo, retryCountdown } = this.state;
    const isRateLimited = rateLimited && rateLimitInfo;
    const canRetry = !isRateLimited || retryCountdown === 0;

    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px',
        },
      },

      // Error icon - clock for rate limit, exclamation for other errors
      React.createElement(
        'div',
        {
          style: {
            width: '64px',
            height: '64px',
            backgroundColor: isRateLimited ? '#fff3e0' : '#ffebee',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            color: isRateLimited ? '#f57c00' : '#d32f2f',
            marginBottom: '24px',
          },
        },
        isRateLimited ? '\u23F1' : '!' // Clock emoji for rate limit
      ),

      React.createElement(
        'h2',
        {
          style: {
            fontSize: '20px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '8px',
          },
        },
        isRateLimited ? 'Figma API Rate Limit' : 'Connection failed'
      ),

      React.createElement(
        'p',
        {
          style: {
            fontSize: '14px',
            color: '#666',
            marginBottom: isRateLimited ? '16px' : '24px',
            textAlign: 'center',
            maxWidth: '450px',
          },
        },
        isRateLimited
          ? 'Figma limits how often we can access your designs. This is normal for free Figma accounts.'
          : error || 'An unexpected error occurred'
      ),

      // Rate limit specific content
      isRateLimited &&
        React.createElement(
          'div',
          {
            style: {
              backgroundColor: '#fff3e0',
              borderRadius: '12px',
              padding: '20px 24px',
              marginBottom: '24px',
              textAlign: 'center',
              maxWidth: '400px',
            },
          },

          // Countdown timer
          retryCountdown > 0 &&
            React.createElement(
              'div',
              {
                style: {
                  fontSize: '32px',
                  fontWeight: 700,
                  color: '#f57c00',
                  marginBottom: '8px',
                  fontFamily: 'monospace',
                },
              },
              `${Math.floor(retryCountdown / 60)}:${(retryCountdown % 60).toString().padStart(2, '0')}`
            ),

          React.createElement(
            'p',
            {
              style: {
                fontSize: '14px',
                color: '#666',
                margin: 0,
              },
            },
            retryCountdown > 0 ? 'Please wait before trying again' : 'You can try again now!'
          ),

          // Upgrade link if available
          rateLimitInfo?.upgradeLink &&
            React.createElement(
              'a',
              {
                href: rateLimitInfo.upgradeLink,
                target: '_blank',
                rel: 'noopener noreferrer',
                style: {
                  display: 'inline-block',
                  marginTop: '12px',
                  fontSize: '13px',
                  color: '#51a351',
                  textDecoration: 'underline',
                },
              },
              'Upgrade your Figma plan for higher limits \u2192'
            ),

          // Plan tier info
          rateLimitInfo?.planTier &&
            React.createElement(
              'p',
              {
                style: {
                  fontSize: '12px',
                  color: '#999',
                  marginTop: '8px',
                  marginBottom: 0,
                },
              },
              `Current plan: ${rateLimitInfo.planTier}`
            )
        ),

      // Retry button
      React.createElement(
        'button',
        {
          onClick: this.handleRetry,
          disabled: !canRetry,
          style: {
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: 600,
            backgroundColor: canRetry ? '#51a351' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: canRetry ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s',
          },
        },
        canRetry ? 'Try again' : `Wait ${retryCountdown}s...`
      ),

      // Back button
      React.createElement(
        'button',
        {
          onClick: this.handleBack,
          style: {
            marginTop: '16px',
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: 'transparent',
            color: '#666',
            border: 'none',
            cursor: 'pointer',
          },
        },
        'Back to start'
      )
    );
  }
}

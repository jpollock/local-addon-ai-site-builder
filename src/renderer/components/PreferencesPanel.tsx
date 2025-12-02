/**
 * Preferences Panel - Settings UI for AI Site Builder
 *
 * Allows users to configure:
 * - AI provider selection (Claude, OpenAI, Gemini)
 * - API keys for each provider
 * - Figma access token (optional, for Figma integration)
 * - Advanced options toggle
 */

import * as React from 'react';
import type * as LocalRenderer from '@getflywheel/local/renderer';
import {
  AIProviderType,
  PROVIDER_METADATA,
  getSupportedProviders,
  GeminiAuthMode,
} from '../../common/ai-provider.types';
import { IPC_CHANNELS } from '../../common/constants';
import { ProviderHealthStatus } from './ProviderHealthStatus';

interface PreferencesPanelProps {
  context: LocalRenderer.AddonRendererContext;
  onSettingsChange?: (settings: any) => void;
  setApplyButtonDisabled?: (disabled: boolean) => void;
}

interface ProviderApiKeys {
  claude?: string;
  openai?: string;
  gemini?: string;
}

interface PreferencesPanelState {
  settings: {
    activeProvider: AIProviderType;
    apiKeys: ProviderApiKeys;
    figmaAccessToken: string;
    acfProDetected: boolean;
    showAdvancedOptions: boolean;
    geminiAuthMode?: GeminiAuthMode;
  };
  loading: boolean;
  error: string | null;
  // Gemini OAuth state
  geminiOAuth: {
    connected: boolean;
    email?: string;
    loading: boolean;
    error?: string;
  };
}

export class PreferencesPanel extends React.Component<
  PreferencesPanelProps,
  PreferencesPanelState
> {
  state: PreferencesPanelState = {
    settings: {
      activeProvider: 'claude',
      apiKeys: {},
      figmaAccessToken: '',
      acfProDetected: false,
      showAdvancedOptions: false,
      geminiAuthMode: 'api-key',
    },
    loading: true,
    error: null,
    geminiOAuth: {
      connected: false,
      email: undefined,
      loading: false,
      error: undefined,
    },
  };

  async componentDidMount() {
    await this.loadSettings();
    await this.loadGeminiOAuthStatus();

    // Disable Apply button initially (no changes yet)
    if (this.props.setApplyButtonDisabled) {
      this.props.setApplyButtonDisabled(true);
    }
  }

  loadSettings = async () => {
    const electron = this.props.context.electron || (window as any).electron;

    if (!electron) {
      this.setState({ error: 'Electron not available', loading: false });
      return;
    }

    try {
      const response = await electron.ipcRenderer.invoke('ai-site-builder:get-settings');

      if (response.success) {
        this.setState({
          settings: { ...this.state.settings, ...response.settings },
          loading: false,
        });

        // Notify parent of initial settings
        if (this.props.onSettingsChange) {
          this.props.onSettingsChange(response.settings);
        }
      } else {
        this.setState({ error: response.error || 'Failed to load settings', loading: false });
      }
    } catch (error: any) {
      this.setState({ error: error.message, loading: false });
    }
  };

  updateSetting = (key: string, value: any) => {
    const newSettings = {
      ...this.state.settings,
      [key]: value,
    };

    this.setState({ settings: newSettings });

    // Enable Apply button when changes are made
    if (this.props.setApplyButtonDisabled) {
      this.props.setApplyButtonDisabled(false);
    }

    // Notify parent component for onApply handler
    if (this.props.onSettingsChange) {
      this.props.onSettingsChange(newSettings);
    }
  };

  updateApiKey = (provider: AIProviderType, value: string) => {
    const newApiKeys = {
      ...this.state.settings.apiKeys,
      [provider]: value,
    };

    const newSettings = {
      ...this.state.settings,
      apiKeys: newApiKeys,
    };

    this.setState({ settings: newSettings });

    // Enable Apply button when changes are made
    if (this.props.setApplyButtonDisabled) {
      this.props.setApplyButtonDisabled(false);
    }

    // Notify parent component for onApply handler
    if (this.props.onSettingsChange) {
      this.props.onSettingsChange(newSettings);
    }
  };

  // ========================================
  // Gemini OAuth Methods
  // ========================================

  loadGeminiOAuthStatus = async () => {
    const electron = this.props.context.electron || (window as any).electron;
    if (!electron) return;

    try {
      const response = await electron.ipcRenderer.invoke(IPC_CHANNELS.GET_GOOGLE_OAUTH_STATUS);

      if (response.success) {
        this.setState({
          geminiOAuth: {
            connected: response.connected,
            email: response.email,
            loading: false,
            error: undefined,
          },
          settings: {
            ...this.state.settings,
            geminiAuthMode: response.authMode || 'api-key',
          },
        });
      }
    } catch (error: any) {
      console.error('[PreferencesPanel] Error loading OAuth status:', error);
    }
  };

  setGeminiAuthMode = async (mode: GeminiAuthMode) => {
    const electron = this.props.context.electron || (window as any).electron;
    if (!electron) return;

    try {
      await electron.ipcRenderer.invoke(IPC_CHANNELS.SET_GEMINI_AUTH_MODE, { mode });

      const newSettings = {
        ...this.state.settings,
        geminiAuthMode: mode,
      };

      this.setState({ settings: newSettings });

      // Enable Apply button when changes are made
      if (this.props.setApplyButtonDisabled) {
        this.props.setApplyButtonDisabled(false);
      }

      if (this.props.onSettingsChange) {
        this.props.onSettingsChange(newSettings);
      }
    } catch (error: any) {
      console.error('[PreferencesPanel] Error setting auth mode:', error);
    }
  };

  startGoogleOAuth = async () => {
    const electron = this.props.context.electron || (window as any).electron;
    if (!electron) return;

    this.setState({
      geminiOAuth: { ...this.state.geminiOAuth, loading: true, error: undefined },
    });

    try {
      const response = await electron.ipcRenderer.invoke(IPC_CHANNELS.START_GOOGLE_OAUTH);

      if (response.success) {
        const newSettings = {
          ...this.state.settings,
          geminiAuthMode: 'oauth' as const,
        };

        this.setState({
          geminiOAuth: {
            connected: true,
            email: response.email,
            loading: false,
            error: undefined,
          },
          settings: newSettings,
        });

        // Enable Apply button and update pending settings
        if (this.props.setApplyButtonDisabled) {
          this.props.setApplyButtonDisabled(false);
        }

        if (this.props.onSettingsChange) {
          this.props.onSettingsChange(newSettings);
        }
      } else {
        this.setState({
          geminiOAuth: {
            ...this.state.geminiOAuth,
            loading: false,
            error: response.error || 'OAuth failed',
          },
        });
      }
    } catch (error: any) {
      this.setState({
        geminiOAuth: {
          ...this.state.geminiOAuth,
          loading: false,
          error: error.message || 'OAuth failed',
        },
      });
    }
  };

  disconnectGoogleOAuth = async () => {
    const electron = this.props.context.electron || (window as any).electron;
    if (!electron) return;

    try {
      await electron.ipcRenderer.invoke(IPC_CHANNELS.DISCONNECT_GOOGLE_OAUTH);

      // Remove tokens from local state - spread and then delete
      const { geminiOAuthTokens: _geminiOAuthTokens, ...settingsWithoutTokens } = this.state
        .settings as any;
      const newSettings = {
        ...settingsWithoutTokens,
        geminiAuthMode: 'api-key' as const,
      };

      this.setState({
        geminiOAuth: {
          connected: false,
          email: undefined,
          loading: false,
          error: undefined,
        },
        settings: newSettings,
      });

      // Enable Apply button and update pending settings
      if (this.props.setApplyButtonDisabled) {
        this.props.setApplyButtonDisabled(false);
      }

      if (this.props.onSettingsChange) {
        this.props.onSettingsChange(newSettings);
      }
    } catch (error: any) {
      console.error('[PreferencesPanel] Error disconnecting OAuth:', error);
    }
  };

  // ========================================
  // Render Methods
  // ========================================

  renderGeminiAuthSection(isActive: boolean) {
    const { geminiOAuth, settings } = this.state;
    const metadata = PROVIDER_METADATA['gemini'];
    const apiKey = settings.apiKeys.gemini || '';
    const authMode = settings.geminiAuthMode || 'api-key';

    return React.createElement(
      'div',
      {
        key: 'gemini',
        style: {
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: isActive ? '#f0f7ff' : '#fafafa',
          border: isActive ? '2px solid #0066cc' : '1px solid #e0e0e0',
          borderRadius: '8px',
          transition: 'all 0.2s ease',
        },
      },
      // Provider header with active badge
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '15px',
          },
        },
        React.createElement(
          'label',
          {
            style: {
              fontWeight: 'bold',
              fontSize: '14px',
              flex: 1,
            },
          },
          `${metadata.displayName}${isActive ? ' *' : ''}`
        ),
        isActive &&
          React.createElement(
            'span',
            {
              style: {
                backgroundColor: '#0066cc',
                color: 'white',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 'bold',
              },
            },
            'ACTIVE'
          ),
        // Health status indicator
        React.createElement(
          'div',
          { style: { marginLeft: 'auto' } },
          React.createElement(ProviderHealthStatus, {
            provider: 'gemini',
            compact: true,
          })
        )
      ),

      // Auth mode selection
      React.createElement(
        'div',
        {
          style: { marginBottom: '15px' },
        },
        React.createElement(
          'div',
          {
            style: { fontSize: '12px', color: '#666', marginBottom: '10px' },
          },
          'Authentication Method:'
        ),

        // OAuth option
        React.createElement(
          'label',
          {
            style: {
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '12px',
              padding: '12px',
              backgroundColor: authMode === 'oauth' ? '#e8f5e9' : '#fff',
              border: authMode === 'oauth' ? '2px solid #4caf50' : '1px solid #e0e0e0',
              borderRadius: '6px',
              cursor: 'pointer',
            },
          },
          React.createElement('input', {
            type: 'radio',
            name: 'gemini-auth-mode',
            checked: authMode === 'oauth',
            onChange: () => this.setGeminiAuthMode('oauth'),
            style: { marginRight: '10px', marginTop: '3px' },
          }),
          React.createElement(
            'div',
            { style: { flex: 1 } },
            React.createElement(
              'div',
              {
                style: { fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' },
              },
              '🔐 Sign in with Google (Recommended)'
            ),
            React.createElement(
              'div',
              {
                style: { fontSize: '12px', color: '#666' },
              },
              'Secure OAuth authentication with automatic token refresh'
            )
          )
        ),

        // OAuth status and button (shown when OAuth mode selected)
        authMode === 'oauth' &&
          React.createElement(
            'div',
            {
              style: { marginLeft: '24px', marginBottom: '12px' },
            },
            geminiOAuth.connected
              ? React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 12px',
                      backgroundColor: '#e8f5e9',
                      borderRadius: '4px',
                    },
                  },
                  React.createElement(
                    'span',
                    {
                      style: { color: '#4caf50', marginRight: '8px', fontSize: '18px' },
                    },
                    '✓'
                  ),
                  React.createElement(
                    'span',
                    {
                      style: { flex: 1, fontSize: '13px' },
                    },
                    `Connected as ${geminiOAuth.email || 'Google User'}`
                  ),
                  React.createElement(
                    'button',
                    {
                      onClick: this.disconnectGoogleOAuth,
                      style: {
                        padding: '4px 12px',
                        backgroundColor: 'transparent',
                        border: '1px solid #999',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#666',
                      },
                    },
                    'Disconnect'
                  )
                )
              : React.createElement(
                  'div',
                  null,
                  React.createElement(
                    'button',
                    {
                      onClick: this.startGoogleOAuth,
                      disabled: geminiOAuth.loading,
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 20px',
                        backgroundColor: geminiOAuth.loading ? '#ccc' : '#4285f4',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: geminiOAuth.loading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                      },
                    },
                    geminiOAuth.loading ? 'Signing in...' : '🔵 Sign in with Google'
                  ),
                  geminiOAuth.error &&
                    React.createElement(
                      'div',
                      {
                        style: { color: '#dc3545', fontSize: '12px', marginTop: '8px' },
                      },
                      geminiOAuth.error
                    )
                )
          ),

        // API key option
        React.createElement(
          'label',
          {
            style: {
              display: 'flex',
              alignItems: 'flex-start',
              padding: '12px',
              backgroundColor: authMode === 'api-key' ? '#f0f7ff' : '#fff',
              border: authMode === 'api-key' ? '2px solid #0066cc' : '1px solid #e0e0e0',
              borderRadius: '6px',
              cursor: 'pointer',
            },
          },
          React.createElement('input', {
            type: 'radio',
            name: 'gemini-auth-mode',
            checked: authMode === 'api-key',
            onChange: () => this.setGeminiAuthMode('api-key'),
            style: { marginRight: '10px', marginTop: '3px' },
          }),
          React.createElement(
            'div',
            { style: { flex: 1 } },
            React.createElement(
              'div',
              {
                style: { fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' },
              },
              '🔑 Use API Key'
            ),
            React.createElement(
              'div',
              {
                style: { fontSize: '12px', color: '#666' },
              },
              'Manual API key from Google AI Studio'
            )
          )
        ),

        // API key input (shown when API key mode selected)
        authMode === 'api-key' &&
          React.createElement(
            'div',
            {
              style: { marginLeft: '24px', marginTop: '12px' },
            },
            React.createElement('input', {
              type: 'password',
              value: apiKey,
              onChange: (e: any) => this.updateApiKey('gemini', e.target.value),
              placeholder: metadata.apiKeyPlaceholder,
              style: {
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                width: '100%',
                maxWidth: '476px',
                fontFamily: 'monospace',
                fontSize: '13px',
                boxSizing: 'border-box',
              },
            }),
            React.createElement(
              'div',
              {
                style: { marginTop: '8px', fontSize: '12px', color: '#666' },
              },
              'Get your API key from ',
              React.createElement(
                'a',
                {
                  href: '#',
                  onClick: (e: any) => {
                    e.preventDefault();
                    const electron = this.props.context.electron || (window as any).electron;
                    if (electron?.shell) {
                      electron.shell.openExternal(metadata.docsUrl);
                    }
                  },
                  style: { color: '#0066cc', textDecoration: 'none' },
                },
                metadata.docsUrl.replace('https://', '')
              )
            )
          )
      )
    );
  }

  renderApiKeyField(providerType: AIProviderType, isActive: boolean) {
    const metadata = PROVIDER_METADATA[providerType];
    const apiKey = this.state.settings.apiKeys[providerType] || '';

    return React.createElement(
      'div',
      {
        key: providerType,
        style: {
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: isActive ? '#f0f7ff' : '#fafafa',
          border: isActive ? '2px solid #0066cc' : '1px solid #e0e0e0',
          borderRadius: '8px',
          transition: 'all 0.2s ease',
        },
      },
      // Provider header with active badge
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '10px',
          },
        },
        React.createElement(
          'label',
          {
            htmlFor: `api-key-${providerType}`,
            style: {
              fontWeight: 'bold',
              fontSize: '14px',
              flex: 1,
            },
          },
          `${metadata.displayName} API Key${isActive ? ' *' : ''}`
        ),
        isActive &&
          React.createElement(
            'span',
            {
              style: {
                backgroundColor: '#0066cc',
                color: 'white',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 'bold',
              },
            },
            'ACTIVE'
          ),
        // Health status indicator
        React.createElement(
          'div',
          { style: { marginLeft: 'auto' } },
          React.createElement(ProviderHealthStatus, {
            provider: providerType as 'claude' | 'openai' | 'gemini',
            compact: true,
          })
        )
      ),

      // API key input
      React.createElement('input', {
        id: `api-key-${providerType}`,
        type: 'password',
        value: apiKey,
        onChange: (e: any) => this.updateApiKey(providerType, e.target.value),
        placeholder: metadata.apiKeyPlaceholder,
        style: {
          padding: '10px 12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          width: '100%',
          maxWidth: '500px',
          fontFamily: 'monospace',
          fontSize: '13px',
          boxSizing: 'border-box',
        },
      }),

      // Help link
      React.createElement(
        'div',
        {
          style: { marginTop: '8px', fontSize: '12px', color: '#666' },
        },
        'Get your API key from ',
        React.createElement(
          'a',
          {
            href: '#',
            onClick: (e: any) => {
              e.preventDefault();
              const electron = this.props.context.electron || (window as any).electron;
              if (electron?.shell) {
                electron.shell.openExternal(metadata.docsUrl);
              }
            },
            style: { color: '#0066cc', textDecoration: 'none' },
          },
          metadata.docsUrl.replace('https://', '')
        )
      )
    );
  }

  renderFigmaAuthSection() {
    const { settings } = this.state;
    const patToken = settings.figmaAccessToken || '';

    return React.createElement(
      'div',
      {
        style: {
          marginBottom: '30px',
          padding: '15px',
          backgroundColor: '#fafafa',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
        },
      },
      // Section header
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '15px',
          },
        },
        React.createElement(
          'label',
          {
            style: {
              fontWeight: 'bold',
              fontSize: '14px',
              flex: 1,
            },
          },
          'Figma Access Token (Optional)'
        )
      ),

      React.createElement(
        'div',
        {
          style: { fontSize: '12px', color: '#666', marginBottom: '15px' },
        },
        'Required only if you want to import designs from Figma. Get a Personal Access Token from Figma Settings.'
      ),

      // PAT input
      React.createElement('input', {
        type: 'password',
        value: patToken,
        onChange: (e: any) => this.updateSetting('figmaAccessToken', e.target.value),
        placeholder: 'figd_...',
        style: {
          padding: '10px 12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          width: '100%',
          maxWidth: '476px',
          fontFamily: 'monospace',
          fontSize: '13px',
          boxSizing: 'border-box',
        },
      }),
      React.createElement(
        'div',
        {
          style: { marginTop: '8px', fontSize: '12px', color: '#666' },
        },
        'Get your token from ',
        React.createElement(
          'a',
          {
            href: '#',
            onClick: (e: any) => {
              e.preventDefault();
              const electron = this.props.context.electron || (window as any).electron;
              if (electron?.shell) {
                electron.shell.openExternal('https://www.figma.com/developers/api#access-tokens');
              }
            },
            style: { color: '#0066cc', textDecoration: 'none' },
          },
          'Figma Settings'
        )
      )
    );
  }

  render() {
    const { settings, loading, error } = this.state;

    if (loading) {
      return React.createElement('div', { style: { padding: '20px' } }, 'Loading settings...');
    }

    if (error) {
      return React.createElement(
        'div',
        {
          style: { padding: '20px', color: '#dc3545' },
        },
        `Error: ${error}`
      );
    }

    return React.createElement(
      'div',
      {
        className: 'ai-site-builder-preferences',
        style: {
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          margin: '20px 0',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '4px',
          },
        },
        // Header
        React.createElement(
          'h3',
          {
            style: { marginTop: 0, marginBottom: '20px' },
          },
          '🤖 AI Site Builder Settings'
        ),

        React.createElement(
          'p',
          {
            style: { color: '#666', marginBottom: '30px', lineHeight: '1.6' },
          },
          'Configure your AI Site Builder addon. Select an AI provider and enter your API key to enable AI-powered site generation.'
        ),

        // AI Provider Selection
        React.createElement(
          'div',
          {
            style: { marginBottom: '30px' },
          },
          React.createElement(
            'label',
            {
              htmlFor: 'ai-provider',
              style: {
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                fontSize: '14px',
              },
            },
            'Active AI Provider'
          ),
          React.createElement(
            'select',
            {
              id: 'ai-provider',
              value: settings.activeProvider,
              onChange: (e: any) => this.updateSetting('activeProvider', e.target.value),
              className: 'ai-site-builder-select',
              style: {
                padding: '12px 14px',
                border: '2px solid #51a351',
                borderRadius: '4px',
                width: '100%',
                maxWidth: '500px',
                fontSize: '14px',
                lineHeight: '1.4',
                height: '44px',
                boxSizing: 'border-box',
                backgroundColor: '#fff',
                color: '#000000',
                cursor: 'pointer',
                fontWeight: 500,
                WebkitTextFillColor: '#000000',
                opacity: 1,
              },
            },
            getSupportedProviders().map((providerType) =>
              React.createElement(
                'option',
                {
                  key: providerType,
                  value: providerType,
                  style: {
                    color: '#000000',
                    backgroundColor: '#ffffff',
                  },
                },
                PROVIDER_METADATA[providerType].displayName
              )
            )
          ),
          React.createElement(
            'div',
            {
              style: { marginTop: '8px', fontSize: '12px', color: '#666' },
            },
            'Choose which AI provider to use for site generation.'
          )
        ),

        // API Keys Section Header
        React.createElement(
          'div',
          {
            style: { marginBottom: '20px' },
          },
          React.createElement(
            'h4',
            {
              style: { marginTop: 0, marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' },
            },
            'API Keys'
          ),
          React.createElement(
            'div',
            {
              style: { fontSize: '12px', color: '#666', marginBottom: '15px' },
            },
            "Configure API keys for each provider. Only the active provider's key is required."
          )
        ),

        // API Key Fields for Each Provider
        // Note: Gemini uses special auth section with OAuth support
        ...getSupportedProviders().map((providerType) =>
          providerType === 'gemini'
            ? this.renderGeminiAuthSection(settings.activeProvider === providerType)
            : this.renderApiKeyField(providerType, settings.activeProvider === providerType)
        ),

        // Figma Access Token Section (with OAuth support)
        this.renderFigmaAuthSection(),

        // Advanced Options Section
        React.createElement(
          'div',
          {
            style: {
              marginTop: '40px',
              paddingTop: '20px',
              borderTop: '1px solid #e0e0e0',
            },
          },
          React.createElement(
            'h4',
            {
              style: { marginTop: 0, marginBottom: '15px', fontSize: '14px', fontWeight: 'bold' },
            },
            'Advanced Options'
          ),

          React.createElement(
            'label',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                marginBottom: '10px',
              },
            },
            React.createElement('input', {
              type: 'checkbox',
              checked: settings.showAdvancedOptions || false,
              onChange: (e: any) => this.updateSetting('showAdvancedOptions', e.target.checked),
              style: { marginRight: '10px' },
            }),
            React.createElement(
              'span',
              {
                style: { fontSize: '14px' },
              },
              'Show advanced options during site creation'
            )
          ),

          React.createElement(
            'div',
            {
              style: { fontSize: '12px', color: '#666', marginLeft: '24px' },
            },
            'Display additional configuration options in the site creation flow'
          )
        ),

        // ACF Pro Detection Info
        settings.acfProDetected &&
          React.createElement(
            'div',
            {
              style: {
                marginTop: '20px',
                padding: '12px',
                backgroundColor: '#e8f5e9',
                border: '1px solid #4caf50',
                borderRadius: '4px',
              },
            },
            React.createElement(
              'div',
              {
                style: {
                  fontSize: '13px',
                  color: '#2e7d32',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                },
              },
              '✓ ACF Pro Detected'
            ),
            React.createElement(
              'div',
              {
                style: { fontSize: '12px', color: '#2e7d32' },
              },
              'Advanced Custom Fields Pro is installed. Custom field generation is available.'
            )
          ),

        // Help Text
        React.createElement(
          'div',
          {
            style: {
              marginTop: '30px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#666',
              lineHeight: '1.6',
            },
          },
          React.createElement('strong', null, 'Note:'),
          ' Settings are saved when you click the Apply button. Changes will take effect immediately for new site creation flows.'
        )
      )
    );
  }
}

/**
 * Settings Manager - Handles persistent storage of addon settings
 *
 * Stores settings in JSON file in Local's user data directory.
 * Settings include AI provider configuration, ACF Pro detection, and user preferences.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  AIProviderType,
  getSupportedProviders,
  GeminiAuthMode,
  GoogleOAuthTokens,
} from '../common/ai-provider.types';

/**
 * API keys for all supported providers
 */
export interface ProviderApiKeys {
  claude?: string;
  openai?: string;
  gemini?: string;
}

/**
 * Model selections for each provider
 */
export interface ProviderModels {
  claude?: string;
  openai?: string;
  gemini?: string;
}

export interface AddonSettings {
  // Multi-provider support
  activeProvider: AIProviderType;
  apiKeys: ProviderApiKeys;
  models?: ProviderModels;

  // Gemini OAuth support
  geminiAuthMode?: GeminiAuthMode;
  geminiOAuthTokens?: GoogleOAuthTokens;

  // Legacy field (for migration)
  claudeApiKey?: string;

  // Figma integration (PAT-based, OAuth removed)
  figmaAccessToken?: string;

  // Logging configuration
  logLevel?: string; // 'debug' | 'info' | 'warn' | 'error'
  enableDebugLogging?: boolean;

  // Other settings
  acfProDetected: boolean;
  showAdvancedOptions: boolean;
  conversationMaxQuestions?: number;
  autoDetectAcf?: boolean;
}

const DEFAULT_SETTINGS: AddonSettings = {
  activeProvider: 'claude',
  apiKeys: {},
  acfProDetected: false,
  showAdvancedOptions: false,
  conversationMaxQuestions: 8,
  autoDetectAcf: true,
  logLevel: 'info',
  enableDebugLogging: false,
};

export class SettingsManager {
  private settingsPath: string;
  private settings: AddonSettings;

  constructor(userDataPath: string) {
    // Store settings in Local's user data directory
    const addonDataDir = path.join(userDataPath, 'ai-site-builder');

    // Ensure directory exists
    if (!fs.existsSync(addonDataDir)) {
      fs.mkdirSync(addonDataDir, { recursive: true });
    }

    this.settingsPath = path.join(addonDataDir, 'settings.json');
    this.settings = this.loadSettings();
  }

  /**
   * Load settings from JSON file with migration support
   */
  private loadSettings(): AddonSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8');
        const loaded = JSON.parse(data);

        // Merge with defaults to ensure all keys exist
        // Deep copy apiKeys to avoid mutating DEFAULT_SETTINGS
        const merged = {
          ...DEFAULT_SETTINGS,
          ...loaded,
          apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...(loaded.apiKeys || {}) },
        };

        // Migrate from old claudeApiKey format to new apiKeys format
        const migrated = this.migrateSettings(merged);

        return migrated;
      }
    } catch (error) {
      console.error('[Settings Manager] Error loading settings:', error);
    }

    // Return defaults if file doesn't exist or error occurred
    // Deep copy apiKeys to avoid mutating DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, apiKeys: {} };
  }

  /**
   * Migrate settings from old format to new multi-provider format
   */
  private migrateSettings(settings: any): AddonSettings {
    // Check if we need to migrate from old claudeApiKey format
    if (settings.claudeApiKey && !settings.apiKeys?.claude) {
      console.log('[Settings Manager] Migrating from old claudeApiKey format');

      // Ensure apiKeys object exists
      if (!settings.apiKeys) {
        settings.apiKeys = {};
      }

      // Move claudeApiKey to new structure
      settings.apiKeys.claude = settings.claudeApiKey;

      // Set active provider to claude (since they were using it)
      if (!settings.activeProvider) {
        settings.activeProvider = 'claude';
      }

      // Clear old key (will be saved on next saveSettings call)
      delete settings.claudeApiKey;

      // Save migrated settings
      this.settings = settings;
      this.saveSettings();
    }

    // Ensure apiKeys object exists
    if (!settings.apiKeys) {
      settings.apiKeys = {};
    }

    // Ensure activeProvider is valid
    if (!settings.activeProvider || !getSupportedProviders().includes(settings.activeProvider)) {
      settings.activeProvider = 'claude';
    }

    return settings as AddonSettings;
  }

  /**
   * Save settings to JSON file
   */
  private saveSettings(): void {
    try {
      const data = JSON.stringify(this.settings, null, 2);
      fs.writeFileSync(this.settingsPath, data, 'utf-8');
    } catch (error) {
      console.error('[Settings Manager] Error saving settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  /**
   * Get all settings
   */
  getSettings(): AddonSettings {
    return { ...this.settings };
  }

  /**
   * Update settings (partial update)
   */
  updateSettings(updates: Partial<AddonSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
  }

  /**
   * Get active AI provider type
   */
  getActiveProvider(): AIProviderType {
    return this.settings.activeProvider;
  }

  /**
   * Set active AI provider type
   */
  setActiveProvider(provider: AIProviderType): void {
    if (!getSupportedProviders().includes(provider)) {
      throw new Error(`Invalid provider type: ${provider}`);
    }
    this.settings.activeProvider = provider;
    this.saveSettings();
  }

  /**
   * Get API key for a specific provider
   */
  getApiKey(provider: AIProviderType): string | undefined {
    return this.settings.apiKeys[provider];
  }

  /**
   * Set API key for a specific provider
   */
  setApiKey(provider: AIProviderType, apiKey: string): void {
    if (!getSupportedProviders().includes(provider)) {
      throw new Error(`Invalid provider type: ${provider}`);
    }
    this.settings.apiKeys[provider] = apiKey;
    this.saveSettings();
  }

  /**
   * Get all API keys
   */
  getApiKeys(): ProviderApiKeys {
    return { ...this.settings.apiKeys };
  }

  /**
   * Check if API key is configured for a provider
   */
  hasApiKey(provider: AIProviderType): boolean {
    const key = this.settings.apiKeys[provider];
    return !!key && key.trim().length > 0;
  }

  /**
   * Check if the active provider has credentials configured
   * For Gemini, this checks both OAuth and API key modes
   */
  hasActiveProviderApiKey(): boolean {
    const activeProvider = this.settings.activeProvider;
    // Gemini can use OAuth instead of API key
    if (activeProvider === 'gemini') {
      return this.hasGeminiCredentials();
    }
    return this.hasApiKey(activeProvider);
  }

  /**
   * Get model for a specific provider
   */
  getModel(provider: AIProviderType): string | undefined {
    return this.settings.models?.[provider];
  }

  /**
   * Set model for a specific provider
   */
  setModel(provider: AIProviderType, model: string): void {
    if (!this.settings.models) {
      this.settings.models = {};
    }
    this.settings.models[provider] = model;
    this.saveSettings();
  }

  // Legacy methods for backwards compatibility
  // These delegate to the new multi-provider methods

  /**
   * Get Claude API key (legacy - use getApiKey('claude') instead)
   * @deprecated Use getApiKey('claude') instead
   */
  getClaudeApiKey(): string | undefined {
    return this.getApiKey('claude');
  }

  /**
   * Set Claude API key (legacy - use setApiKey('claude', key) instead)
   * @deprecated Use setApiKey('claude', key) instead
   */
  setClaudeApiKey(apiKey: string): void {
    this.setApiKey('claude', apiKey);
  }

  /**
   * Check if Claude API key is configured (legacy)
   * @deprecated Use hasApiKey('claude') instead
   */
  hasClaudeApiKey(): boolean {
    return this.hasApiKey('claude');
  }

  /**
   * Get Figma access token
   */
  getFigmaAccessToken(): string | undefined {
    return this.settings.figmaAccessToken;
  }

  /**
   * Set Figma access token
   */
  setFigmaAccessToken(token: string): void {
    this.settings.figmaAccessToken = token;
    this.saveSettings();
  }

  // Gemini OAuth methods

  /**
   * Get Gemini authentication mode
   */
  getGeminiAuthMode(): GeminiAuthMode {
    return this.settings.geminiAuthMode || 'api-key';
  }

  /**
   * Set Gemini authentication mode
   */
  setGeminiAuthMode(mode: GeminiAuthMode): void {
    this.settings.geminiAuthMode = mode;
    this.saveSettings();
  }

  /**
   * Get Gemini OAuth tokens
   */
  getGeminiOAuthTokens(): GoogleOAuthTokens | undefined {
    return this.settings.geminiOAuthTokens;
  }

  /**
   * Set Gemini OAuth tokens
   */
  setGeminiOAuthTokens(tokens: GoogleOAuthTokens): void {
    this.settings.geminiOAuthTokens = tokens;
    this.saveSettings();
  }

  /**
   * Clear Gemini OAuth tokens (disconnect)
   */
  clearGeminiOAuthTokens(): void {
    delete this.settings.geminiOAuthTokens;
    // Optionally reset to API key mode
    this.settings.geminiAuthMode = 'api-key';
    this.saveSettings();
  }

  /**
   * Check if Gemini OAuth is connected
   */
  isGeminiOAuthConnected(): boolean {
    const tokens = this.settings.geminiOAuthTokens;
    return !!(tokens && tokens.accessToken && tokens.expiresAt > Date.now());
  }

  /**
   * Get Gemini connected email (from OAuth)
   */
  getGeminiConnectedEmail(): string | undefined {
    return this.settings.geminiOAuthTokens?.email;
  }

  /**
   * Check if Gemini has valid credentials (either OAuth or API key)
   */
  hasGeminiCredentials(): boolean {
    if (this.getGeminiAuthMode() === 'oauth') {
      return this.isGeminiOAuthConnected();
    }
    return this.hasApiKey('gemini');
  }

  // Figma PAT methods (OAuth was removed - Figma doesn't support PKCE for desktop apps)

  /**
   * Check if Figma has valid credentials (PAT only)
   */
  hasFigmaCredentials(): boolean {
    const pat = this.settings.figmaAccessToken;
    return !!pat && pat.trim().length > 0;
  }

  /**
   * Get Figma access token (PAT)
   * @deprecated Use getFigmaAccessToken() instead - this exists for compatibility
   */
  getEffectiveFigmaToken(): string | undefined {
    return this.settings.figmaAccessToken;
  }

  /**
   * Reset all settings to defaults
   */
  resetSettings(): void {
    // Deep copy to avoid mutating DEFAULT_SETTINGS
    this.settings = {
      ...DEFAULT_SETTINGS,
      apiKeys: {}, // Fresh empty object
    };
    this.saveSettings();
  }
}

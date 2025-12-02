/**
 * Settings Manager - Handles persistent storage of addon settings with secure credential storage
 *
 * SECURITY IMPROVEMENTS:
 * - API keys stored in OS keychain (macOS Keychain, Windows Credential Vault, Linux Secret Service)
 * - OAuth tokens stored in OS keychain
 * - Automatic migration from plaintext JSON to secure storage
 * - Audit logging for credential operations
 * - Non-sensitive settings remain in JSON for UI preferences
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  AIProviderType,
  getSupportedProviders,
  GeminiAuthMode,
  GoogleOAuthTokens,
} from '../common/ai-provider.types';
import { SecureStorage } from './utils/secure-storage';
import { getAuditLogger, AuditEventType } from './utils/audit-logger';

/**
 * API keys for all supported providers (DEPRECATED - now stored in secure storage)
 * Kept for migration purposes only
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

/**
 * Addon settings (non-sensitive data only)
 * Sensitive data (API keys, tokens) are stored in secure storage
 */
export interface AddonSettings {
  // Multi-provider support
  activeProvider: AIProviderType;
  apiKeys?: ProviderApiKeys; // DEPRECATED - migration only
  models?: ProviderModels;

  // Auth modes (non-sensitive)
  geminiAuthMode?: GeminiAuthMode;

  // Legacy field (for migration)
  claudeApiKey?: string; // DEPRECATED - migration only

  // OAuth tokens (DEPRECATED - now in secure storage)
  geminiOAuthTokens?: GoogleOAuthTokens; // DEPRECATED - migration only
  figmaAccessToken?: string; // DEPRECATED - migration only (Figma OAuth removed)

  // Logging configuration
  logLevel?: string;
  enableDebugLogging?: boolean;

  // Other settings (non-sensitive)
  acfProDetected: boolean;
  showAdvancedOptions: boolean;
  conversationMaxQuestions?: number;
  autoDetectAcf?: boolean;

  // Migration flag
  credentialsMigrated?: boolean;
}

const DEFAULT_SETTINGS: AddonSettings = {
  activeProvider: 'claude',
  acfProDetected: false,
  showAdvancedOptions: false,
  conversationMaxQuestions: 8,
  autoDetectAcf: true,
  logLevel: 'info',
  enableDebugLogging: false,
  credentialsMigrated: false,
};

/**
 * Secure credential keys for keychain storage
 */
const CREDENTIAL_KEYS = {
  API_KEY_CLAUDE: 'api-key-claude',
  API_KEY_OPENAI: 'api-key-openai',
  API_KEY_GEMINI: 'api-key-gemini',
  GEMINI_OAUTH_TOKENS: 'gemini-oauth-tokens',
  FIGMA_ACCESS_TOKEN: 'figma-access-token', // PAT only - OAuth removed
};

export class SettingsManager {
  private settingsPath: string;
  private settings: AddonSettings;
  private secureStorage: SecureStorage;

  constructor(userDataPath: string) {
    // Store settings in Local's user data directory
    const addonDataDir = path.join(userDataPath, 'ai-site-builder');

    // Ensure directory exists
    if (!fs.existsSync(addonDataDir)) {
      fs.mkdirSync(addonDataDir, { recursive: true });
    }

    this.settingsPath = path.join(addonDataDir, 'settings.json');
    this.secureStorage = new SecureStorage(userDataPath);
    this.settings = this.loadSettings();

    // Perform credential migration on first run
    this.migrateCredentialsToSecureStorage().catch((error) => {
      console.error('[Settings Manager] Error migrating credentials:', error);
    });
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
        const merged = { ...DEFAULT_SETTINGS, ...loaded };

        // Migrate from old claudeApiKey format to new apiKeys format
        const migrated = this.migrateSettings(merged);

        return migrated;
      }
    } catch (error) {
      console.error('[Settings Manager] Error loading settings:', error);
    }

    // Return defaults if file doesn't exist or error occurred
    return { ...DEFAULT_SETTINGS };
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
    }

    // Ensure apiKeys object exists (for migration)
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
   * Migrate credentials from JSON to secure storage
   */
  private async migrateCredentialsToSecureStorage(): Promise<void> {
    try {
      // Skip if already migrated
      if (this.settings.credentialsMigrated) {
        console.log('[Settings Manager] Credentials already migrated to secure storage');
        return;
      }

      console.log('[Settings Manager] Starting credential migration to secure storage...');
      let migrationCount = 0;

      // Migrate API keys
      if (this.settings.apiKeys) {
        if (this.settings.apiKeys.claude) {
          await this.secureStorage.setCredential(
            CREDENTIAL_KEYS.API_KEY_CLAUDE,
            this.settings.apiKeys.claude
          );
          migrationCount++;
        }
        if (this.settings.apiKeys.openai) {
          await this.secureStorage.setCredential(
            CREDENTIAL_KEYS.API_KEY_OPENAI,
            this.settings.apiKeys.openai
          );
          migrationCount++;
        }
        if (this.settings.apiKeys.gemini) {
          await this.secureStorage.setCredential(
            CREDENTIAL_KEYS.API_KEY_GEMINI,
            this.settings.apiKeys.gemini
          );
          migrationCount++;
        }
      }

      // Migrate Gemini OAuth tokens
      if (this.settings.geminiOAuthTokens) {
        await this.secureStorage.setCredential(
          CREDENTIAL_KEYS.GEMINI_OAUTH_TOKENS,
          JSON.stringify(this.settings.geminiOAuthTokens)
        );
        migrationCount++;
      }

      // Migrate Figma access token (PAT) - Note: Figma OAuth was removed
      if (this.settings.figmaAccessToken) {
        await this.secureStorage.setCredential(
          CREDENTIAL_KEYS.FIGMA_ACCESS_TOKEN,
          this.settings.figmaAccessToken
        );
        migrationCount++;
      }

      // Migrate legacy claudeApiKey if it exists
      if (this.settings.claudeApiKey) {
        const existingClaude = await this.secureStorage.getCredential(
          CREDENTIAL_KEYS.API_KEY_CLAUDE
        );
        if (!existingClaude) {
          await this.secureStorage.setCredential(
            CREDENTIAL_KEYS.API_KEY_CLAUDE,
            this.settings.claudeApiKey
          );
          migrationCount++;
        }
      }

      if (migrationCount > 0) {
        console.log(
          `[Settings Manager] Migrated ${migrationCount} credential(s) to secure storage`
        );

        // Log audit event
        try {
          const auditLogger = getAuditLogger();
          auditLogger.logSuccess(
            AuditEventType.CREDENTIAL_MIGRATION,
            'Migrate credentials to secure storage',
            {
              count: migrationCount,
              usingKeychain: this.secureStorage.isUsingKeychain(),
            }
          );
        } catch (error) {
          // Audit logger might not be initialized yet
          console.log('[Settings Manager] Audit logger not available for migration logging');
        }

        // Remove sensitive data from JSON
        delete this.settings.apiKeys;
        delete this.settings.claudeApiKey;
        delete this.settings.geminiOAuthTokens;
        delete this.settings.figmaAccessToken;

        // Mark migration as complete
        this.settings.credentialsMigrated = true;

        // Save cleaned settings
        this.saveSettings();

        console.log('[Settings Manager] Credential migration completed successfully');

        if (!this.secureStorage.isUsingKeychain()) {
          console.warn(
            '[Settings Manager] WARNING: Using encrypted file fallback instead of OS keychain. ' +
              'For better security, ensure keytar is properly installed.'
          );
        }
      } else {
        console.log('[Settings Manager] No credentials to migrate');
        this.settings.credentialsMigrated = true;
        this.saveSettings();
      }
    } catch (error) {
      console.error('[Settings Manager] Error during credential migration:', error);
      // Don't throw - allow app to continue with potentially unmigrated credentials
    }
  }

  /**
   * Save settings to JSON file (non-sensitive data only)
   */
  private saveSettings(): void {
    try {
      // Ensure sensitive fields are not saved
      const sanitized = { ...this.settings };
      delete sanitized.apiKeys;
      delete sanitized.claudeApiKey;
      delete sanitized.geminiOAuthTokens;
      delete sanitized.figmaAccessToken;

      const data = JSON.stringify(sanitized, null, 2);
      fs.writeFileSync(this.settingsPath, data, 'utf-8');
    } catch (error) {
      console.error('[Settings Manager] Error saving settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  /**
   * Get all settings (sanitized - no sensitive data)
   */
  getSettings(): AddonSettings {
    const sanitized = { ...this.settings };
    delete sanitized.apiKeys;
    delete sanitized.claudeApiKey;
    delete sanitized.geminiOAuthTokens;
    delete sanitized.figmaAccessToken;
    return sanitized;
  }

  /**
   * Update settings (partial update - non-sensitive only)
   */
  updateSettings(updates: Partial<AddonSettings>): void {
    // Remove sensitive fields from updates
    const sanitized = { ...updates };
    delete sanitized.apiKeys;
    delete sanitized.claudeApiKey;
    delete sanitized.geminiOAuthTokens;
    delete sanitized.figmaAccessToken;

    this.settings = { ...this.settings, ...sanitized };
    this.saveSettings();

    // Log audit event
    try {
      const auditLogger = getAuditLogger();
      auditLogger.logSuccess(AuditEventType.SETTINGS_UPDATE, 'Update non-sensitive settings', {
        fields: Object.keys(sanitized),
      });
    } catch (error) {
      // Audit logger might not be initialized
    }
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

    // Log audit event
    try {
      const auditLogger = getAuditLogger();
      auditLogger.logSuccess(AuditEventType.PROVIDER_CHANGE, 'Change active AI provider', {
        provider,
      });
    } catch (error) {
      // Audit logger might not be initialized
    }
  }

  /**
   * Get API key for a specific provider (from secure storage)
   */
  async getApiKey(provider: AIProviderType): Promise<string | undefined> {
    try {
      const key =
        provider === 'claude'
          ? CREDENTIAL_KEYS.API_KEY_CLAUDE
          : provider === 'openai'
            ? CREDENTIAL_KEYS.API_KEY_OPENAI
            : CREDENTIAL_KEYS.API_KEY_GEMINI;

      const value = await this.secureStorage.getCredential(key);

      // Log audit event
      try {
        const auditLogger = getAuditLogger();
        auditLogger.logSuccess(AuditEventType.CREDENTIAL_GET, `Get API key for ${provider}`, {
          provider,
          hasValue: !!value,
        });
      } catch (error) {
        // Audit logger might not be initialized
      }

      return value || undefined;
    } catch (error) {
      console.error(`[Settings Manager] Error getting API key for ${provider}:`, error);
      return undefined;
    }
  }

  /**
   * Set API key for a specific provider (in secure storage)
   */
  async setApiKey(provider: AIProviderType, apiKey: string): Promise<void> {
    if (!getSupportedProviders().includes(provider)) {
      throw new Error(`Invalid provider type: ${provider}`);
    }

    try {
      const key =
        provider === 'claude'
          ? CREDENTIAL_KEYS.API_KEY_CLAUDE
          : provider === 'openai'
            ? CREDENTIAL_KEYS.API_KEY_OPENAI
            : CREDENTIAL_KEYS.API_KEY_GEMINI;

      await this.secureStorage.setCredential(key, apiKey);

      // Log audit event
      try {
        const auditLogger = getAuditLogger();
        auditLogger.logSuccess(AuditEventType.CREDENTIAL_SET, `Set API key for ${provider}`, {
          provider,
        });
      } catch (error) {
        // Audit logger might not be initialized
      }
    } catch (error) {
      console.error(`[Settings Manager] Error setting API key for ${provider}:`, error);
      throw new Error('Failed to save API key');
    }
  }

  /**
   * Check if API key is configured for a provider
   */
  async hasApiKey(provider: AIProviderType): Promise<boolean> {
    const key = await this.getApiKey(provider);
    return !!key && key.trim().length > 0;
  }

  /**
   * Check if the active provider has credentials configured
   */
  async hasActiveProviderApiKey(): Promise<boolean> {
    const activeProvider = this.settings.activeProvider;
    // Gemini can use OAuth instead of API key
    if (activeProvider === 'gemini') {
      return await this.hasGeminiCredentials();
    }
    return await this.hasApiKey(activeProvider);
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

  // Synchronous methods for backward compatibility
  // These will be deprecated in favor of async versions

  /**
   * Get Claude API key (synchronous - for backward compatibility)
   * @deprecated Use getApiKey('claude') instead (async)
   */
  getClaudeApiKey(): string | undefined {
    // This is a compatibility shim - in production, callers should use async version
    console.warn(
      '[Settings Manager] getClaudeApiKey is deprecated and may not return secure storage value'
    );
    return undefined;
  }

  /**
   * Set Claude API key (synchronous - for backward compatibility)
   * @deprecated Use setApiKey('claude', key) instead (async)
   */
  setClaudeApiKey(apiKey: string): void {
    // This is a compatibility shim
    this.setApiKey('claude', apiKey).catch((error) => {
      console.error('[Settings Manager] Error setting Claude API key:', error);
    });
  }

  /**
   * Check if Claude API key is configured (synchronous - for backward compatibility)
   * @deprecated Use hasApiKey('claude') instead (async)
   */
  hasClaudeApiKey(): boolean {
    // This is a compatibility shim - may not be accurate
    console.warn(
      '[Settings Manager] hasClaudeApiKey is deprecated and may not reflect secure storage state'
    );
    return false;
  }

  /**
   * Get Figma access token (from secure storage)
   */
  async getFigmaAccessToken(): Promise<string | undefined> {
    try {
      const value = await this.secureStorage.getCredential(CREDENTIAL_KEYS.FIGMA_ACCESS_TOKEN);

      // Log audit event
      try {
        const auditLogger = getAuditLogger();
        auditLogger.logSuccess(AuditEventType.CREDENTIAL_GET, 'Get Figma access token', {
          hasValue: !!value,
        });
      } catch (error) {
        // Audit logger might not be initialized
      }

      return value || undefined;
    } catch (error) {
      console.error('[Settings Manager] Error getting Figma access token:', error);
      return undefined;
    }
  }

  /**
   * Set Figma access token (in secure storage)
   */
  async setFigmaAccessToken(token: string): Promise<void> {
    try {
      await this.secureStorage.setCredential(CREDENTIAL_KEYS.FIGMA_ACCESS_TOKEN, token);

      // Log audit event
      try {
        const auditLogger = getAuditLogger();
        auditLogger.logSuccess(AuditEventType.CREDENTIAL_SET, 'Set Figma access token');
      } catch (error) {
        // Audit logger might not be initialized
      }
    } catch (error) {
      console.error('[Settings Manager] Error setting Figma access token:', error);
      throw new Error('Failed to save Figma access token');
    }
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

    // Log audit event
    try {
      const auditLogger = getAuditLogger();
      auditLogger.logSuccess(AuditEventType.AUTH_MODE_CHANGE, 'Set Gemini auth mode', { mode });
    } catch (error) {
      // Audit logger might not be initialized
    }
  }

  /**
   * Get Gemini OAuth tokens (from secure storage)
   */
  async getGeminiOAuthTokens(): Promise<GoogleOAuthTokens | undefined> {
    try {
      const value = await this.secureStorage.getCredential(CREDENTIAL_KEYS.GEMINI_OAUTH_TOKENS);
      if (!value) return undefined;

      const tokens = JSON.parse(value) as GoogleOAuthTokens;

      // Log audit event
      try {
        const auditLogger = getAuditLogger();
        auditLogger.logSuccess(AuditEventType.CREDENTIAL_GET, 'Get Gemini OAuth tokens', {
          email: tokens.email,
        });
      } catch (error) {
        // Audit logger might not be initialized
      }

      return tokens;
    } catch (error) {
      console.error('[Settings Manager] Error getting Gemini OAuth tokens:', error);
      return undefined;
    }
  }

  /**
   * Set Gemini OAuth tokens (in secure storage)
   */
  async setGeminiOAuthTokens(tokens: GoogleOAuthTokens): Promise<void> {
    try {
      await this.secureStorage.setCredential(
        CREDENTIAL_KEYS.GEMINI_OAUTH_TOKENS,
        JSON.stringify(tokens)
      );

      // Log audit event
      try {
        const auditLogger = getAuditLogger();
        auditLogger.logSuccess(AuditEventType.CREDENTIAL_SET, 'Set Gemini OAuth tokens', {
          email: tokens.email,
        });
      } catch (error) {
        // Audit logger might not be initialized
      }
    } catch (error) {
      console.error('[Settings Manager] Error setting Gemini OAuth tokens:', error);
      throw new Error('Failed to save Gemini OAuth tokens');
    }
  }

  /**
   * Clear Gemini OAuth tokens (disconnect)
   */
  async clearGeminiOAuthTokens(): Promise<void> {
    try {
      await this.secureStorage.deleteCredential(CREDENTIAL_KEYS.GEMINI_OAUTH_TOKENS);
      this.settings.geminiAuthMode = 'api-key';
      this.saveSettings();

      // Log audit event
      try {
        const auditLogger = getAuditLogger();
        auditLogger.logSuccess(AuditEventType.CREDENTIAL_DELETE, 'Clear Gemini OAuth tokens');
      } catch (error) {
        // Audit logger might not be initialized
      }
    } catch (error) {
      console.error('[Settings Manager] Error clearing Gemini OAuth tokens:', error);
    }
  }

  /**
   * Check if Gemini OAuth is connected
   */
  async isGeminiOAuthConnected(): Promise<boolean> {
    const tokens = await this.getGeminiOAuthTokens();
    return !!(tokens && tokens.accessToken && tokens.expiresAt > Date.now());
  }

  /**
   * Get Gemini connected email (from OAuth)
   */
  async getGeminiConnectedEmail(): Promise<string | undefined> {
    const tokens = await this.getGeminiOAuthTokens();
    return tokens?.email;
  }

  /**
   * Check if Gemini has valid credentials (either OAuth or API key)
   */
  async hasGeminiCredentials(): Promise<boolean> {
    if (this.getGeminiAuthMode() === 'oauth') {
      return await this.isGeminiOAuthConnected();
    }
    return await this.hasApiKey('gemini');
  }

  // Figma PAT methods (OAuth was removed - Figma doesn't support PKCE for desktop apps)

  /**
   * Check if Figma has valid credentials (PAT only)
   */
  async hasFigmaCredentials(): Promise<boolean> {
    const pat = await this.getFigmaAccessToken();
    return !!pat && pat.trim().length > 0;
  }

  /**
   * Get Figma access token (PAT)
   * @deprecated Use getFigmaAccessToken() instead - this exists for compatibility
   */
  async getEffectiveFigmaToken(): Promise<string | undefined> {
    return await this.getFigmaAccessToken();
  }

  /**
   * Reset all settings to defaults
   */
  resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
  }
}

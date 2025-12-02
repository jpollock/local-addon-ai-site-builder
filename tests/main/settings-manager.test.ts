/**
 * Settings Manager Tests
 *
 * Comprehensive tests for settings persistence, migration, and API key management.
 * Target: 90%+ code coverage
 */

import { SettingsManager, AddonSettings, ProviderApiKeys } from '../../src/main/settings-manager';
import { TEST_API_KEYS, TEST_GOOGLE_OAUTH_TOKENS } from '../helpers/test-fixtures';
import * as path from 'path';

// In-memory file system for test isolation
let mockFileSystem: Map<string, string>;

// Helper functions for accessing mock file system in tests
const mockFs = {
  existsSync: (p: string) => mockFileSystem.has(p.replace(/\\/g, '/')),
  readFileSync: (p: string, _encoding?: string) => {
    const content = mockFileSystem.get(p.replace(/\\/g, '/'));
    if (content === undefined) throw new Error(`ENOENT: ${p}`);
    return content;
  },
  writeFileSync: (p: string, content: string, _encoding?: string) => {
    mockFileSystem.set(p.replace(/\\/g, '/'), content);
  },
};

// Mock fs module with in-memory implementation
jest.mock('fs', () => {
  // This will be initialized in beforeEach
  const normalizePath = (p: string) => p.replace(/\\/g, '/');

  return {
    existsSync: jest.fn((filePath: string) => {
      return mockFileSystem?.has(normalizePath(filePath)) ?? false;
    }),
    readFileSync: jest.fn((filePath: string, encoding?: string) => {
      const content = mockFileSystem?.get(normalizePath(filePath));
      if (content === undefined) {
        throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      }
      return content;
    }),
    writeFileSync: jest.fn((filePath: string, content: string, encoding?: string) => {
      // Also mark parent directory as existing
      const dir = filePath.substring(0, filePath.lastIndexOf('/'));
      if (dir && !mockFileSystem?.has(normalizePath(dir))) {
        mockFileSystem?.set(normalizePath(dir), '');
      }
      mockFileSystem?.set(normalizePath(filePath), content);
    }),
    mkdirSync: jest.fn((dirPath: string, options?: { recursive?: boolean }) => {
      mockFileSystem?.set(normalizePath(dirPath), '');
    }),
    readdirSync: jest.fn((dirPath: string) => []),
    unlinkSync: jest.fn((filePath: string) => {
      mockFileSystem?.delete(normalizePath(filePath));
    }),
    rmdirSync: jest.fn((dirPath: string) => {
      mockFileSystem?.delete(normalizePath(dirPath));
    }),
  };
});

describe('SettingsManager', () => {
  const TEST_USER_DATA_PATH = '/test/user/data';
  const SETTINGS_FILE = path.join(TEST_USER_DATA_PATH, 'ai-site-builder', 'settings.json');

  let settingsManager: SettingsManager;

  beforeEach(() => {
    // Reset mock file system - create fresh Map for each test
    mockFileSystem = new Map<string, string>();

    // Create instance (will create directories)
    settingsManager = new SettingsManager(TEST_USER_DATA_PATH);
  });

  afterEach(() => {
    mockFileSystem = new Map<string, string>();
  });

  describe('initialization', () => {
    it('should create addon directory if it does not exist', () => {
      const addonDir = path.join(TEST_USER_DATA_PATH, 'ai-site-builder');
      expect(mockFs.existsSync(addonDir)).toBe(true);
    });

    it('should load default settings if file does not exist', () => {
      const settings = settingsManager.getSettings();
      expect(settings.activeProvider).toBe('claude');
      expect(settings.acfProDetected).toBe(false);
      expect(settings.showAdvancedOptions).toBe(false);
      expect(settings.conversationMaxQuestions).toBe(8);
      expect(settings.autoDetectAcf).toBe(true);
    });

    it('should load existing settings from file', () => {
      // Pre-populate settings file
      const existingSettings: AddonSettings = {
        activeProvider: 'openai',
        apiKeys: { openai: 'test-key' },
        acfProDetected: true,
        showAdvancedOptions: true,
      };
      mockFs.writeFileSync(SETTINGS_FILE, JSON.stringify(existingSettings), 'utf-8');

      // Create new instance
      const manager = new SettingsManager(TEST_USER_DATA_PATH);
      const loaded = manager.getSettings();

      expect(loaded.activeProvider).toBe('openai');
      expect(loaded.apiKeys.openai).toBe('test-key');
      expect(loaded.acfProDetected).toBe(true);
      expect(loaded.showAdvancedOptions).toBe(true);
    });

    it('should handle corrupted settings file gracefully', () => {
      // Write invalid JSON
      mockFs.writeFileSync(SETTINGS_FILE, 'not valid json', 'utf-8');

      // Should not throw, should use defaults
      const manager = new SettingsManager(TEST_USER_DATA_PATH);
      const settings = manager.getSettings();

      expect(settings.activeProvider).toBe('claude');
      expect(settings.apiKeys).toEqual({});
    });
  });

  describe('settings migration', () => {
    it('should migrate from old claudeApiKey format to new apiKeys format', () => {
      const oldSettings = {
        claudeApiKey: 'sk-ant-old-key',
        acfProDetected: false,
        showAdvancedOptions: false,
      };
      mockFs.writeFileSync(SETTINGS_FILE, JSON.stringify(oldSettings), 'utf-8');

      const manager = new SettingsManager(TEST_USER_DATA_PATH);
      const settings = manager.getSettings();

      expect(settings.apiKeys.claude).toBe('sk-ant-old-key');
      expect(settings.activeProvider).toBe('claude');
      expect(settings.claudeApiKey).toBeUndefined();

      // Check that migrated settings were saved
      const savedData = JSON.parse(mockFs.readFileSync(SETTINGS_FILE, 'utf-8'));
      expect(savedData.apiKeys.claude).toBe('sk-ant-old-key');
      expect(savedData.claudeApiKey).toBeUndefined();
    });

    it('should not overwrite existing apiKeys during migration', () => {
      const settings = {
        claudeApiKey: 'sk-ant-old-key',
        apiKeys: { claude: 'sk-ant-new-key', openai: 'sk-openai-key' },
        activeProvider: 'claude' as const,
        acfProDetected: false,
        showAdvancedOptions: false,
      };
      mockFs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings), 'utf-8');

      const manager = new SettingsManager(TEST_USER_DATA_PATH);
      const loaded = manager.getSettings();

      // Should keep new key, not migrate old one
      expect(loaded.apiKeys.claude).toBe('sk-ant-new-key');
      expect(loaded.apiKeys.openai).toBe('sk-openai-key');
    });

    it('should ensure apiKeys object exists after migration', () => {
      const oldSettings = {
        acfProDetected: false,
        showAdvancedOptions: false,
      };
      mockFs.writeFileSync(SETTINGS_FILE, JSON.stringify(oldSettings), 'utf-8');

      const manager = new SettingsManager(TEST_USER_DATA_PATH);
      const settings = manager.getSettings();

      expect(settings.apiKeys).toBeDefined();
      expect(typeof settings.apiKeys).toBe('object');
    });

    it('should validate activeProvider during migration', () => {
      const settings = {
        activeProvider: 'invalid-provider',
        apiKeys: {},
        acfProDetected: false,
        showAdvancedOptions: false,
      };
      mockFs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings), 'utf-8');

      const manager = new SettingsManager(TEST_USER_DATA_PATH);
      const loaded = manager.getSettings();

      // Should default to claude if invalid
      expect(loaded.activeProvider).toBe('claude');
    });
  });

  describe('getSettings and updateSettings', () => {
    it('should return a copy of settings to prevent mutation', () => {
      const settings1 = settingsManager.getSettings();
      const settings2 = settingsManager.getSettings();

      expect(settings1).not.toBe(settings2);
      expect(settings1).toEqual(settings2);
    });

    it('should update settings and persist to file', () => {
      settingsManager.updateSettings({
        acfProDetected: true,
        showAdvancedOptions: true,
      });

      const settings = settingsManager.getSettings();
      expect(settings.acfProDetected).toBe(true);
      expect(settings.showAdvancedOptions).toBe(true);

      // Verify persistence
      const savedData = JSON.parse(mockFs.readFileSync(SETTINGS_FILE, 'utf-8'));
      expect(savedData.acfProDetected).toBe(true);
      expect(savedData.showAdvancedOptions).toBe(true);
    });

    it('should support partial updates', () => {
      settingsManager.updateSettings({ acfProDetected: false });
      settingsManager.updateSettings({ showAdvancedOptions: true });

      const settings = settingsManager.getSettings();
      expect(settings.acfProDetected).toBe(false);
      expect(settings.showAdvancedOptions).toBe(true);
    });
  });

  describe('AI provider management', () => {
    it('should get active provider', () => {
      expect(settingsManager.getActiveProvider()).toBe('claude');
    });

    it('should set active provider', () => {
      settingsManager.setActiveProvider('openai');
      expect(settingsManager.getActiveProvider()).toBe('openai');

      // Verify persistence
      const savedData = JSON.parse(mockFs.readFileSync(SETTINGS_FILE, 'utf-8'));
      expect(savedData.activeProvider).toBe('openai');
    });

    it('should throw error for invalid provider type', () => {
      expect(() => {
        settingsManager.setActiveProvider('invalid' as any);
      }).toThrow('Invalid provider type: invalid');
    });

    it('should get API key for specific provider', () => {
      settingsManager.setApiKey('claude', TEST_API_KEYS.claude);
      expect(settingsManager.getApiKey('claude')).toBe(TEST_API_KEYS.claude);
    });

    it('should return undefined for non-existent API key', () => {
      expect(settingsManager.getApiKey('openai')).toBeUndefined();
    });

    it('should set API key for specific provider', () => {
      settingsManager.setApiKey('openai', TEST_API_KEYS.openai);
      expect(settingsManager.getApiKey('openai')).toBe(TEST_API_KEYS.openai);

      // Verify persistence
      const savedData = JSON.parse(mockFs.readFileSync(SETTINGS_FILE, 'utf-8'));
      expect(savedData.apiKeys.openai).toBe(TEST_API_KEYS.openai);
    });

    it('should throw error when setting invalid provider API key', () => {
      expect(() => {
        settingsManager.setApiKey('invalid' as any, 'test-key');
      }).toThrow('Invalid provider type: invalid');
    });

    it('should get all API keys', () => {
      settingsManager.setApiKey('claude', TEST_API_KEYS.claude);
      settingsManager.setApiKey('openai', TEST_API_KEYS.openai);

      const keys = settingsManager.getApiKeys();
      expect(keys.claude).toBe(TEST_API_KEYS.claude);
      expect(keys.openai).toBe(TEST_API_KEYS.openai);
    });

    it('should check if provider has API key', () => {
      expect(settingsManager.hasApiKey('claude')).toBe(false);

      settingsManager.setApiKey('claude', TEST_API_KEYS.claude);
      expect(settingsManager.hasApiKey('claude')).toBe(true);
    });

    it('should return false for empty API key', () => {
      settingsManager.setApiKey('claude', '   ');
      expect(settingsManager.hasApiKey('claude')).toBe(false);
    });

    it('should check if active provider has credentials', () => {
      expect(settingsManager.hasActiveProviderApiKey()).toBe(false);

      settingsManager.setActiveProvider('claude');
      settingsManager.setApiKey('claude', TEST_API_KEYS.claude);
      expect(settingsManager.hasActiveProviderApiKey()).toBe(true);
    });
  });

  describe('model management', () => {
    it('should get model for specific provider', () => {
      settingsManager.setModel('claude', 'claude-3-opus-20240229');
      expect(settingsManager.getModel('claude')).toBe('claude-3-opus-20240229');
    });

    it('should return undefined for non-existent model', () => {
      expect(settingsManager.getModel('openai')).toBeUndefined();
    });

    it('should set model for specific provider', () => {
      settingsManager.setModel('openai', 'gpt-4-turbo');
      expect(settingsManager.getModel('openai')).toBe('gpt-4-turbo');

      // Verify persistence
      const savedData = JSON.parse(mockFs.readFileSync(SETTINGS_FILE, 'utf-8'));
      expect(savedData.models.openai).toBe('gpt-4-turbo');
    });
  });

  describe('legacy methods (backwards compatibility)', () => {
    it('should get Claude API key via legacy method', () => {
      settingsManager.setApiKey('claude', TEST_API_KEYS.claude);
      expect(settingsManager.getClaudeApiKey()).toBe(TEST_API_KEYS.claude);
    });

    it('should set Claude API key via legacy method', () => {
      settingsManager.setClaudeApiKey(TEST_API_KEYS.claude);
      expect(settingsManager.getApiKey('claude')).toBe(TEST_API_KEYS.claude);
    });

    it('should check Claude API key via legacy method', () => {
      expect(settingsManager.hasClaudeApiKey()).toBe(false);
      settingsManager.setClaudeApiKey(TEST_API_KEYS.claude);
      expect(settingsManager.hasClaudeApiKey()).toBe(true);
    });
  });

  describe('Figma access token', () => {
    it('should get Figma access token', () => {
      settingsManager.setFigmaAccessToken('test-figma-token');
      expect(settingsManager.getFigmaAccessToken()).toBe('test-figma-token');
    });

    it('should set Figma access token', () => {
      settingsManager.setFigmaAccessToken('test-figma-token');

      const savedData = JSON.parse(mockFs.readFileSync(SETTINGS_FILE, 'utf-8'));
      expect(savedData.figmaAccessToken).toBe('test-figma-token');
    });
  });

  describe('Gemini OAuth management', () => {
    it('should get default Gemini auth mode', () => {
      expect(settingsManager.getGeminiAuthMode()).toBe('api-key');
    });

    it('should set Gemini auth mode', () => {
      settingsManager.setGeminiAuthMode('oauth');
      expect(settingsManager.getGeminiAuthMode()).toBe('oauth');

      const savedData = JSON.parse(mockFs.readFileSync(SETTINGS_FILE, 'utf-8'));
      expect(savedData.geminiAuthMode).toBe('oauth');
    });

    it('should get and set Gemini OAuth tokens', () => {
      settingsManager.setGeminiOAuthTokens(TEST_GOOGLE_OAUTH_TOKENS);
      const tokens = settingsManager.getGeminiOAuthTokens();

      expect(tokens).toEqual(TEST_GOOGLE_OAUTH_TOKENS);
    });

    it('should check if Gemini OAuth is connected', () => {
      expect(settingsManager.isGeminiOAuthConnected()).toBe(false);

      settingsManager.setGeminiOAuthTokens(TEST_GOOGLE_OAUTH_TOKENS);
      expect(settingsManager.isGeminiOAuthConnected()).toBe(true);
    });

    it('should return false for expired OAuth tokens', () => {
      const expiredTokens = {
        ...TEST_GOOGLE_OAUTH_TOKENS,
        expiresAt: Date.now() - 1000, // Expired
      };

      settingsManager.setGeminiOAuthTokens(expiredTokens);
      expect(settingsManager.isGeminiOAuthConnected()).toBe(false);
    });

    it('should get Gemini connected email', () => {
      settingsManager.setGeminiOAuthTokens(TEST_GOOGLE_OAUTH_TOKENS);
      expect(settingsManager.getGeminiConnectedEmail()).toBe('test@example.com');
    });

    it('should clear Gemini OAuth tokens', () => {
      settingsManager.setGeminiOAuthTokens(TEST_GOOGLE_OAUTH_TOKENS);
      settingsManager.setGeminiAuthMode('oauth');

      settingsManager.clearGeminiOAuthTokens();

      expect(settingsManager.getGeminiOAuthTokens()).toBeUndefined();
      expect(settingsManager.getGeminiAuthMode()).toBe('api-key');
    });

    it('should check Gemini credentials based on auth mode', () => {
      // API key mode
      settingsManager.setGeminiAuthMode('api-key');
      expect(settingsManager.hasGeminiCredentials()).toBe(false);

      settingsManager.setApiKey('gemini', TEST_API_KEYS.gemini);
      expect(settingsManager.hasGeminiCredentials()).toBe(true);

      // OAuth mode
      settingsManager.setGeminiAuthMode('oauth');
      expect(settingsManager.hasGeminiCredentials()).toBe(false);

      settingsManager.setGeminiOAuthTokens(TEST_GOOGLE_OAUTH_TOKENS);
      expect(settingsManager.hasGeminiCredentials()).toBe(true);
    });

    it('should check active provider credentials for Gemini OAuth', () => {
      settingsManager.setActiveProvider('gemini');
      settingsManager.setGeminiAuthMode('oauth');

      expect(settingsManager.hasActiveProviderApiKey()).toBe(false);

      settingsManager.setGeminiOAuthTokens(TEST_GOOGLE_OAUTH_TOKENS);
      expect(settingsManager.hasActiveProviderApiKey()).toBe(true);
    });
  });

  describe('Figma PAT management', () => {
    // Note: Figma OAuth was removed - Figma now uses PAT only

    it('should check Figma credentials with PAT', () => {
      expect(settingsManager.hasFigmaCredentials()).toBe(false);

      settingsManager.setFigmaAccessToken('test-pat-token');
      expect(settingsManager.hasFigmaCredentials()).toBe(true);
    });

    it('should get effective Figma token (PAT)', () => {
      settingsManager.setFigmaAccessToken('test-pat-token');
      expect(settingsManager.getEffectiveFigmaToken()).toBe('test-pat-token');
    });

    it('should return false for empty PAT token', () => {
      settingsManager.setFigmaAccessToken('   ');
      expect(settingsManager.hasFigmaCredentials()).toBe(false);
    });
  });

  describe('resetSettings', () => {
    it('should reset all settings to defaults', () => {
      // Set up some custom settings
      settingsManager.setActiveProvider('openai');
      settingsManager.setApiKey('claude', TEST_API_KEYS.claude);
      settingsManager.updateSettings({ acfProDetected: true });
      settingsManager.setGeminiOAuthTokens(TEST_GOOGLE_OAUTH_TOKENS);

      // Reset
      settingsManager.resetSettings();

      const settings = settingsManager.getSettings();
      expect(settings.activeProvider).toBe('claude');
      expect(settings.apiKeys).toEqual({});
      expect(settings.acfProDetected).toBe(false);
      expect(settings.geminiOAuthTokens).toBeUndefined();

      // Verify persistence
      const savedData = JSON.parse(mockFs.readFileSync(SETTINGS_FILE, 'utf-8'));
      expect(savedData.activeProvider).toBe('claude');
    });
  });

  describe('error handling', () => {
    it('should handle file system errors when saving', () => {
      // Mock writeFileSync to throw error
      const fs = require('fs');
      (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Permission denied');
      });

      expect(() => {
        settingsManager.updateSettings({ acfProDetected: true });
      }).toThrow('Failed to save settings');
    });
  });
});

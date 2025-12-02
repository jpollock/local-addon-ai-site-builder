/**
 * AI Provider Factory Tests
 *
 * Tests for provider factory and creation logic.
 * Target: 85%+ code coverage
 */

import { AIProviderFactory } from '../../../src/main/ai-providers/provider-factory';
import { AIProviderConfig } from '../../../src/common/ai-provider.types';
import { TEST_API_KEYS, TEST_GOOGLE_OAUTH_TOKENS } from '../../helpers/test-fixtures';

// Mock the provider modules
jest.mock('../../../src/main/ai-providers/claude-provider');
jest.mock('../../../src/main/ai-providers/openai-provider');
jest.mock('../../../src/main/ai-providers/gemini-provider');

import { ClaudeProvider } from '../../../src/main/ai-providers/claude-provider';
import { OpenAIProvider } from '../../../src/main/ai-providers/openai-provider';
import { GeminiProvider } from '../../../src/main/ai-providers/gemini-provider';

describe('AIProviderFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create Claude provider with API key', () => {
      const config: AIProviderConfig = {
        type: 'claude',
        apiKey: TEST_API_KEYS.claude,
      };

      AIProviderFactory.create(config);

      expect(ClaudeProvider).toHaveBeenCalledWith(config);
    });

    it('should create OpenAI provider with API key', () => {
      const config: AIProviderConfig = {
        type: 'openai',
        apiKey: TEST_API_KEYS.openai,
      };

      AIProviderFactory.create(config);

      expect(OpenAIProvider).toHaveBeenCalledWith(config);
    });

    it('should create Gemini provider with API key', () => {
      const config: AIProviderConfig = {
        type: 'gemini',
        apiKey: TEST_API_KEYS.gemini,
        geminiAuthMode: 'api-key',
      };

      AIProviderFactory.create(config);

      expect(GeminiProvider).toHaveBeenCalledWith(config);
    });

    it('should create Gemini provider with OAuth tokens', () => {
      const config: AIProviderConfig = {
        type: 'gemini',
        geminiAuthMode: 'oauth',
        oauthTokens: TEST_GOOGLE_OAUTH_TOKENS,
      };

      AIProviderFactory.create(config);

      expect(GeminiProvider).toHaveBeenCalledWith(config);
    });

    it('should throw error when API key is missing (non-OAuth)', () => {
      const config: AIProviderConfig = {
        type: 'claude',
        apiKey: '',
      };

      expect(() => AIProviderFactory.create(config)).toThrow(
        'API key is required for claude provider'
      );
    });

    it('should throw error when OAuth tokens are missing for Gemini OAuth mode', () => {
      const config: AIProviderConfig = {
        type: 'gemini',
        geminiAuthMode: 'oauth',
        // No oauthTokens provided
      };

      expect(() => AIProviderFactory.create(config)).toThrow(
        'OAuth tokens are required for Gemini OAuth mode'
      );
    });

    it('should throw error for unknown provider type', () => {
      const config: AIProviderConfig = {
        type: 'unknown' as any,
        apiKey: 'test-key',
      };

      expect(() => AIProviderFactory.create(config)).toThrow('Unknown provider type: unknown');
    });

    it('should pass custom model to provider', () => {
      const config: AIProviderConfig = {
        type: 'claude',
        apiKey: TEST_API_KEYS.claude,
        model: 'claude-3-opus-20240229',
      };

      AIProviderFactory.create(config);

      expect(ClaudeProvider).toHaveBeenCalledWith(config);
    });
  });

  describe('getSupportedProviders', () => {
    it('should return list of supported providers', () => {
      const providers = AIProviderFactory.getSupportedProviders();
      expect(providers).toContain('claude');
      expect(providers).toContain('openai');
      expect(providers).toContain('gemini');
    });
  });

  describe('isSupported', () => {
    it('should return true for supported providers', () => {
      expect(AIProviderFactory.isSupported('claude')).toBe(true);
      expect(AIProviderFactory.isSupported('openai')).toBe(true);
      expect(AIProviderFactory.isSupported('gemini')).toBe(true);
    });

    it('should return false for unsupported providers', () => {
      expect(AIProviderFactory.isSupported('unknown')).toBe(false);
      expect(AIProviderFactory.isSupported('gpt-3')).toBe(false);
    });
  });

  describe('createAndValidate', () => {
    it('should create and validate provider with valid API key', async () => {
      const config: AIProviderConfig = {
        type: 'claude',
        apiKey: TEST_API_KEYS.claude,
      };

      const mockProvider = {
        validateApiKey: jest.fn().mockResolvedValue(true),
      };
      (ClaudeProvider as jest.Mock).mockReturnValue(mockProvider);

      const provider = await AIProviderFactory.createAndValidate(config);

      expect(provider).toBe(mockProvider);
      expect(mockProvider.validateApiKey).toHaveBeenCalled();
    });

    it('should throw error when validation fails', async () => {
      const config: AIProviderConfig = {
        type: 'openai',
        apiKey: 'invalid-key',
      };

      const mockProvider = {
        validateApiKey: jest.fn().mockResolvedValue(false),
      };
      (OpenAIProvider as jest.Mock).mockReturnValue(mockProvider);

      await expect(AIProviderFactory.createAndValidate(config)).rejects.toThrow(
        'Invalid API key for openai provider'
      );
    });

    it('should propagate validation errors', async () => {
      const config: AIProviderConfig = {
        type: 'claude',
        apiKey: 'test-key',
      };

      const mockProvider = {
        validateApiKey: jest.fn().mockRejectedValue(new Error('Network error')),
      };
      (ClaudeProvider as jest.Mock).mockReturnValue(mockProvider);

      await expect(AIProviderFactory.createAndValidate(config)).rejects.toThrow('Network error');
    });
  });
});

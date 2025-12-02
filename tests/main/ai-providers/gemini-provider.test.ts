/**
 * Tests for GeminiProvider
 */

import { GeminiProvider } from '../../../src/main/ai-providers/gemini-provider';
import { AIProviderConfig } from '../../../src/common/ai-provider.types';
import {
  mockGeminiClient,
  mockGeminiModel,
  resetAIProviderMocks,
} from '../../helpers/mock-ai-providers';

// Mock GoogleGenerativeAI SDK
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => mockGeminiClient),
}));

// Mock fetch for OAuth REST calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock the utilities
jest.mock('../../../src/main/utils/circuit-breaker', () => ({
  getCircuitBreakerRegistry: jest.fn(() => ({
    getOrCreate: jest.fn(() => ({
      execute: jest.fn((fn) => fn()),
      getStats: jest.fn(() => ({ state: 'CLOSED' })),
      reset: jest.fn(),
    })),
  })),
}));

jest.mock('../../../src/main/utils/performance-monitor', () => ({
  getPerformanceMonitorRegistry: jest.fn(() => ({
    getOrCreate: jest.fn(() => ({
      record: jest.fn(),
      recordTimeout: jest.fn(),
      getMetrics: jest.fn(() => ({})),
    })),
  })),
}));

jest.mock('../../../src/main/utils/cache', () => ({
  getCacheRegistry: jest.fn(() => ({
    getOrCreate: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      getOrCompute: jest.fn(async (key, compute) => compute()),
    })),
  })),
}));

describe('GeminiProvider', () => {
  const apiKeyConfig: AIProviderConfig = {
    type: 'gemini',
    apiKey: 'test-api-key',
    geminiAuthMode: 'api-key',
  };

  const oauthConfig: AIProviderConfig = {
    type: 'gemini',
    apiKey: '',
    geminiAuthMode: 'oauth',
    oauthTokens: {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: Date.now() + 3600000,
      email: 'test@example.com',
    },
  };

  beforeEach(() => {
    resetAIProviderMocks();
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('should create provider with API key config', () => {
      const provider = new GeminiProvider(apiKeyConfig);
      expect(provider.type).toBe('gemini');
      expect(provider.displayName).toBe('Gemini (Google)');
      expect(provider.getAuthMode()).toBe('api-key');
    });

    it('should create provider with OAuth config', () => {
      const provider = new GeminiProvider(oauthConfig);
      expect(provider.type).toBe('gemini');
      expect(provider.getAuthMode()).toBe('oauth');
      expect(provider.getConnectedEmail()).toBe('test@example.com');
    });

    it('should use default model when not specified', () => {
      const provider = new GeminiProvider(apiKeyConfig);
      expect(provider.getModel()).toBe('gemini-2.5-flash');
    });

    it('should use custom model when specified', () => {
      const customProvider = new GeminiProvider({
        ...apiKeyConfig,
        model: 'gemini-1.5-pro',
      });
      expect(customProvider.getModel()).toBe('gemini-1.5-pro');
    });

    it('should throw error when OAuth mode without tokens', () => {
      expect(() => {
        new GeminiProvider({
          type: 'gemini',
          apiKey: '',
          geminiAuthMode: 'oauth',
        });
      }).toThrow('OAuth tokens required for OAuth authentication mode');
    });

    it('should throw error when API key mode without key', () => {
      expect(() => {
        new GeminiProvider({
          type: 'gemini',
          apiKey: '',
          geminiAuthMode: 'api-key',
        });
      }).toThrow('API key required for API key authentication mode');
    });
  });

  describe('getAuthMode / getConnectedEmail', () => {
    it('should return api-key mode for API key provider', () => {
      const provider = new GeminiProvider(apiKeyConfig);
      expect(provider.getAuthMode()).toBe('api-key');
      expect(provider.getConnectedEmail()).toBeUndefined();
    });

    it('should return oauth mode and email for OAuth provider', () => {
      const provider = new GeminiProvider(oauthConfig);
      expect(provider.getAuthMode()).toBe('oauth');
      expect(provider.getConnectedEmail()).toBe('test@example.com');
    });
  });

  describe('getModel / setModel', () => {
    it('should get current model', () => {
      const provider = new GeminiProvider(apiKeyConfig);
      expect(provider.getModel()).toBeDefined();
    });

    it('should set new model', () => {
      const provider = new GeminiProvider(apiKeyConfig);
      provider.setModel('gemini-1.5-pro');
      expect(provider.getModel()).toBe('gemini-1.5-pro');
    });
  });

  describe('sendMessage - API key mode', () => {
    let provider: GeminiProvider;

    beforeEach(() => {
      provider = new GeminiProvider(apiKeyConfig);
    });

    it('should send message and return response', async () => {
      // Mock the model chain
      const mockChat = {
        sendMessage: jest.fn().mockResolvedValue({
          response: {
            text: () => 'Test response',
          },
        }),
      };
      const mockModel = {
        startChat: jest.fn().mockReturnValue(mockChat),
      };
      mockGeminiClient.getGenerativeModel.mockReturnValue(mockModel as any);

      const response = await provider.sendMessage(
        [{ role: 'user', content: 'Hello' }],
        'You are a helpful assistant'
      );

      expect(response).toBe('Test response');
      expect(mockGeminiClient.getGenerativeModel).toHaveBeenCalled();
      expect(mockModel.startChat).toHaveBeenCalled();
      expect(mockChat.sendMessage).toHaveBeenCalledWith('Hello');
    });

    it('should handle empty response', async () => {
      const mockChat = {
        sendMessage: jest.fn().mockResolvedValue({
          response: {
            text: () => '',
            candidates: [],
            promptFeedback: null,
          },
        }),
      };
      const mockModel = {
        startChat: jest.fn().mockReturnValue(mockChat),
      };
      mockGeminiClient.getGenerativeModel.mockReturnValue(mockModel as any);

      const response = await provider.sendMessage(
        [{ role: 'user', content: 'Hello' }],
        'System prompt'
      );

      expect(response).toBe('');
    });

    it('should handle API errors', async () => {
      const mockChat = {
        sendMessage: jest.fn().mockRejectedValue(new Error('API Error')),
      };
      const mockModel = {
        startChat: jest.fn().mockReturnValue(mockChat),
      };
      mockGeminiClient.getGenerativeModel.mockReturnValue(mockModel as any);

      await expect(
        provider.sendMessage(
          [{ role: 'user', content: 'Hello' }],
          'System prompt'
        )
      ).rejects.toThrow('API Error');
    });

    it('should throw error if last message is not from user', async () => {
      const mockModel = {
        startChat: jest.fn().mockReturnValue({}),
      };
      mockGeminiClient.getGenerativeModel.mockReturnValue(mockModel as any);

      await expect(
        provider.sendMessage(
          [{ role: 'assistant', content: 'Hello' }],
          'System prompt'
        )
      ).rejects.toThrow('Last message must be from user');
    });
  });

  describe('sendMessage - OAuth mode', () => {
    let provider: GeminiProvider;

    beforeEach(() => {
      provider = new GeminiProvider(oauthConfig);
    });

    it('should send message via REST API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'OAuth response' }],
              },
            },
          ],
        }),
      });

      const response = await provider.sendMessage(
        [{ role: 'user', content: 'Hello' }],
        'You are helpful'
      );

      expect(response).toBe('OAuth response');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
          }),
        })
      );
    });

    it('should handle REST API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(
        provider.sendMessage(
          [{ role: 'user', content: 'Hello' }],
          'System prompt'
        )
      ).rejects.toThrow('Gemini API error: 401');
    });
  });

  describe('streamMessage - API key mode', () => {
    let provider: GeminiProvider;

    beforeEach(() => {
      provider = new GeminiProvider(apiKeyConfig);
    });

    it('should stream message with callbacks', async () => {
      const tokens: string[] = [];
      let completed = false;
      let completedText = '';

      // Create async iterator for streaming
      const mockStreamResult = {
        stream: (async function* () {
          yield { text: () => 'Hello' };
          yield { text: () => ' World' };
        })(),
      };

      const mockChat = {
        sendMessageStream: jest.fn().mockResolvedValue(mockStreamResult),
      };
      const mockModel = {
        startChat: jest.fn().mockReturnValue(mockChat),
      };
      mockGeminiClient.getGenerativeModel.mockReturnValue(mockModel as any);

      await provider.streamMessage(
        [{ role: 'user', content: 'Test' }],
        'System prompt',
        {
          onToken: (token) => tokens.push(token),
          onComplete: (text) => {
            completed = true;
            completedText = text;
          },
        }
      );

      expect(tokens).toContain('Hello');
      expect(tokens).toContain(' World');
      expect(completed).toBe(true);
      expect(completedText).toBe('Hello World');
    });

    it('should handle stream errors via callback', async () => {
      const mockChat = {
        sendMessageStream: jest.fn().mockRejectedValue(new Error('Stream error')),
      };
      const mockModel = {
        startChat: jest.fn().mockReturnValue(mockChat),
      };
      mockGeminiClient.getGenerativeModel.mockReturnValue(mockModel as any);

      let errorCaught = false;
      let caughtError: Error | undefined;

      try {
        await provider.streamMessage(
          [{ role: 'user', content: 'Test' }],
          'System prompt',
          {
            onError: (err) => {
              errorCaught = true;
              caughtError = err;
            },
          }
        );
      } catch (error) {
        // Expected - method throws after calling onError
      }

      expect(errorCaught).toBe(true);
      expect(caughtError?.message).toBe('Stream error');
    });

    it('should throw error if last message is not from user', async () => {
      const mockModel = {
        startChat: jest.fn().mockReturnValue({}),
      };
      mockGeminiClient.getGenerativeModel.mockReturnValue(mockModel as any);

      await expect(
        provider.streamMessage(
          [{ role: 'assistant', content: 'Hello' }],
          'System prompt',
          {}
        )
      ).rejects.toThrow('Last message must be from user');
    });
  });

  describe('streamMessage - OAuth mode', () => {
    let provider: GeminiProvider;

    beforeEach(() => {
      provider = new GeminiProvider(oauthConfig);
    });

    it('should fall back to non-streaming for OAuth mode', async () => {
      const tokens: string[] = [];
      let completed = false;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'OAuth streaming response' }],
              },
            },
          ],
        }),
      });

      await provider.streamMessage(
        [{ role: 'user', content: 'Test' }],
        'System prompt',
        {
          onToken: (token) => tokens.push(token),
          onComplete: () => {
            completed = true;
          },
        }
      );

      expect(tokens).toContain('OAuth streaming response');
      expect(completed).toBe(true);
    });
  });

  describe('validateApiKey - API key mode', () => {
    let provider: GeminiProvider;

    beforeEach(() => {
      provider = new GeminiProvider(apiKeyConfig);
    });

    it('should return true for valid API key', async () => {
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue({
          response: { text: () => 'Valid' },
        }),
      };
      mockGeminiClient.getGenerativeModel.mockReturnValue(mockModel as any);

      const isValid = await provider.validateApiKey();

      expect(isValid).toBe(true);
    });

    it('should return false for invalid API key', async () => {
      const mockModel = {
        generateContent: jest.fn().mockRejectedValue(new Error('API_KEY_INVALID')),
      };
      mockGeminiClient.getGenerativeModel.mockReturnValue(mockModel as any);

      const isValid = await provider.validateApiKey();

      expect(isValid).toBe(false);
    });

    it('should return false for 401 status', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).status = 401;
      const mockModel = {
        generateContent: jest.fn().mockRejectedValue(authError),
      };
      mockGeminiClient.getGenerativeModel.mockReturnValue(mockModel as any);

      const isValid = await provider.validateApiKey();

      expect(isValid).toBe(false);
    });

    it('should return false for 403 status', async () => {
      const authError = new Error('Forbidden');
      (authError as any).status = 403;
      const mockModel = {
        generateContent: jest.fn().mockRejectedValue(authError),
      };
      mockGeminiClient.getGenerativeModel.mockReturnValue(mockModel as any);

      const isValid = await provider.validateApiKey();

      expect(isValid).toBe(false);
    });
  });

  describe('validateApiKey - OAuth mode', () => {
    let provider: GeminiProvider;

    beforeEach(() => {
      provider = new GeminiProvider(oauthConfig);
    });

    it('should return true for valid OAuth credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const isValid = await provider.validateApiKey();

      expect(isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
          }),
        })
      );
    });

    it('should return false for invalid OAuth credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const isValid = await provider.validateApiKey();

      expect(isValid).toBe(false);
    });

    it('should return false when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const isValid = await provider.validateApiKey();

      expect(isValid).toBe(false);
    });
  });
});

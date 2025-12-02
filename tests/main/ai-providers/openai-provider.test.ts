/**
 * Tests for OpenAIProvider
 */

import { OpenAIProvider } from '../../../src/main/ai-providers/openai-provider';
import { AIProviderConfig } from '../../../src/common/ai-provider.types';
import {
  mockOpenAIClient,
  resetAIProviderMocks,
} from '../../helpers/mock-ai-providers';

// Mock OpenAI SDK
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAIClient);
});

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

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  const config: AIProviderConfig = {
    type: 'openai',
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    resetAIProviderMocks();
    provider = new OpenAIProvider(config);
  });

  describe('constructor', () => {
    it('should create provider with config', () => {
      expect(provider.type).toBe('openai');
      expect(provider.displayName).toBe('OpenAI (GPT)');
    });

    it('should use default model when not specified', () => {
      expect(provider.getModel()).toBe('gpt-5.1');
    });

    it('should use custom model when specified', () => {
      const customProvider = new OpenAIProvider({
        ...config,
        model: 'gpt-4o',
      });
      expect(customProvider.getModel()).toBe('gpt-4o');
    });
  });

  describe('getModel / setModel', () => {
    it('should get current model', () => {
      expect(provider.getModel()).toBeDefined();
    });

    it('should set new model', () => {
      provider.setModel('gpt-4');
      expect(provider.getModel()).toBe('gpt-4');
    });
  });

  describe('sendMessage', () => {
    it('should send message and return response', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        id: 'chatcmpl_test',
        object: 'chat.completion',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Test response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      } as any);

      const response = await provider.sendMessage(
        [{ role: 'user', content: 'Hello' }],
        'You are a helpful assistant'
      );

      expect(response).toBe('Test response');
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalled();
    });

    it('should handle empty response', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        id: 'chatcmpl_test',
        object: 'chat.completion',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
      } as any);

      const response = await provider.sendMessage(
        [{ role: 'user', content: 'Hello' }],
        'System prompt'
      );

      expect(response).toBe('');
    });

    it('should handle API errors', async () => {
      mockOpenAIClient.chat.completions.create.mockRejectedValueOnce(
        new Error('API Error')
      );

      await expect(
        provider.sendMessage(
          [{ role: 'user', content: 'Hello' }],
          'System prompt'
        )
      ).rejects.toThrow('API Error');
    });

    it('should use provided options', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        id: 'chatcmpl_test',
        object: 'chat.completion',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      } as any);

      await provider.sendMessage(
        [{ role: 'user', content: 'Hello' }],
        'System prompt',
        { maxTokens: 4096, temperature: 0.5 }
      );

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 4096,
          temperature: 0.5,
        })
      );
    });
  });

  describe('streamMessage', () => {
    it('should stream message with callbacks', async () => {
      const tokens: string[] = [];
      let completed = false;
      let completedText = '';

      // Create async iterator for streaming
      const mockStream = (async function* () {
        yield { id: 'chatcmpl_test', choices: [{ delta: { content: 'Hello' } }] };
        yield { id: 'chatcmpl_test', choices: [{ delta: { content: ' World' } }] };
      })();

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce(mockStream as any);

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

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({ stream: true })
      );
      expect(tokens).toContain('Hello');
      expect(tokens).toContain(' World');
      expect(completed).toBe(true);
      expect(completedText).toBe('Hello World');
    });

    it('should handle stream errors via callback', async () => {
      mockOpenAIClient.chat.completions.create.mockRejectedValue(new Error('Stream error'));

      let errorCaught = false;
      let caughtError: Error | undefined;

      // The method calls onError AND throws, so we need to catch the throw
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
  });

  describe('validateApiKey', () => {
    it('should return true for valid API key', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        id: 'chatcmpl_validation',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Valid' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
      } as any);

      const isValid = await provider.validateApiKey();

      expect(isValid).toBe(true);
    });

    it('should return false for invalid API key', async () => {
      mockOpenAIClient.chat.completions.create.mockRejectedValueOnce(
        new Error('Invalid API key')
      );

      const isValid = await provider.validateApiKey();

      expect(isValid).toBe(false);
    });

    it('should return false for 401 status error', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).status = 401;
      mockOpenAIClient.chat.completions.create.mockRejectedValueOnce(authError);

      const isValid = await provider.validateApiKey();

      expect(isValid).toBe(false);
    });

    it('should return false for invalid_api_key code', async () => {
      const authError = new Error('Invalid API key provided');
      (authError as any).code = 'invalid_api_key';
      mockOpenAIClient.chat.completions.create.mockRejectedValueOnce(authError);

      const isValid = await provider.validateApiKey();

      expect(isValid).toBe(false);
    });
  });
});

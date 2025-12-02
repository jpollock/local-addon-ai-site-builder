/**
 * Tests for ClaudeProvider
 */

import { ClaudeProvider } from '../../../src/main/ai-providers/claude-provider';
import { AIProviderConfig } from '../../../src/common/ai-provider.types';
import {
  mockAnthropicClient,
  resetAIProviderMocks,
} from '../../helpers/mock-ai-providers';

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => mockAnthropicClient);
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

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;
  const config: AIProviderConfig = {
    type: 'claude',
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    resetAIProviderMocks();
    provider = new ClaudeProvider(config);
  });

  describe('constructor', () => {
    it('should create provider with config', () => {
      expect(provider.type).toBe('claude');
      expect(provider.displayName).toBe('Claude (Anthropic)');
    });

    it('should use default model when not specified', () => {
      expect(provider.getModel()).toBe('claude-sonnet-4-5-20250929');
    });

    it('should use custom model when specified', () => {
      const customProvider = new ClaudeProvider({
        ...config,
        model: 'claude-3-opus-20240229',
      });
      expect(customProvider.getModel()).toBe('claude-3-opus-20240229');
    });
  });

  describe('getModel / setModel', () => {
    it('should get current model', () => {
      expect(provider.getModel()).toBeDefined();
    });

    it('should set new model', () => {
      provider.setModel('claude-3-haiku-20240307');
      expect(provider.getModel()).toBe('claude-3-haiku-20240307');
    });
  });

  describe('sendMessage', () => {
    it('should send message and return response', async () => {
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-5-20250929',
        content: [{ type: 'text', text: 'Test response' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 20 },
      } as any);

      const response = await provider.sendMessage(
        [{ role: 'user', content: 'Hello' }],
        'You are a helpful assistant'
      );

      expect(response).toBe('Test response');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalled();
    });

    it('should handle empty response', async () => {
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-5-20250929',
        content: [],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 0 },
      } as any);

      const response = await provider.sendMessage(
        [{ role: 'user', content: 'Hello' }],
        'System prompt'
      );

      expect(response).toBe('');
    });

    it('should handle API errors', async () => {
      mockAnthropicClient.messages.create.mockRejectedValueOnce(
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
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-5-20250929',
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 20 },
      } as any);

      await provider.sendMessage(
        [{ role: 'user', content: 'Hello' }],
        'System prompt',
        { maxTokens: 4096, temperature: 0.5 }
      );

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 4096,
        })
      );
    });
  });

  describe('streamMessage', () => {
    it('should stream message with callbacks', async () => {
      const tokens: string[] = [];
      let completed = false;

      // Create a mock stream with proper typing
      const mockStream: any = {
        on: jest.fn((event: string, callback: (text: string) => void) => {
          if (event === 'text') {
            callback('Hello');
            callback(' World');
          }
          return mockStream;
        }),
        finalMessage: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Hello World' }],
        }),
      };

      mockAnthropicClient.messages.stream = jest.fn().mockReturnValue(mockStream);

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

      expect(mockAnthropicClient.messages.stream).toHaveBeenCalled();
      expect(tokens).toContain('Hello');
      expect(tokens).toContain(' World');
      expect(completed).toBe(true);
    });

    it('should handle stream errors via callback', async () => {
      // Create a mock stream that fails on finalMessage
      const mockStream: any = {
        on: jest.fn().mockReturnThis(),
        finalMessage: jest.fn().mockRejectedValue(new Error('Stream error')),
      };

      mockAnthropicClient.messages.stream = jest.fn().mockReturnValue(mockStream);

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
      mockAnthropicClient.messages.create.mockResolvedValueOnce({
        id: 'msg_validation',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-5-20250929',
        content: [{ type: 'text', text: 'Valid' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 5, output_tokens: 5 },
      } as any);

      const isValid = await provider.validateApiKey();

      expect(isValid).toBe(true);
    });

    it('should return false for invalid API key', async () => {
      mockAnthropicClient.messages.create.mockRejectedValueOnce(
        new Error('Invalid API key')
      );

      const isValid = await provider.validateApiKey();

      expect(isValid).toBe(false);
    });
  });
});

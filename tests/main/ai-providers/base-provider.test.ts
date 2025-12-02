/**
 * Tests for BaseAIProvider
 */

import { AIProviderConfig, AIProviderType } from '../../../src/common/ai-provider.types';
import { BaseAIProvider } from '../../../src/main/ai-providers/base-provider';

// Create a concrete implementation for testing
class TestProvider extends BaseAIProvider {
  readonly type: AIProviderType = 'claude';
  readonly displayName = 'Test Provider';
  readonly defaultModel = 'test-model';

  async streamMessage(): Promise<void> {
    // Not implemented for testing
  }

  async sendMessage(): Promise<string> {
    return 'test response';
  }

  async validateApiKey(): Promise<boolean> {
    return true;
  }

  // Expose protected methods for testing
  public testMergeOptions(options?: any): any {
    return this.mergeOptions(options);
  }

  public testGetDefaultOptions(): any {
    return this.getDefaultOptions();
  }

  public testLog(message: string, ...args: any[]): void {
    this.log(message, ...args);
  }

  public testLogError(message: string, error?: any): void {
    this.logError(message, error);
  }
}

describe('BaseAIProvider', () => {
  describe('constructor', () => {
    it('should initialize with API key', () => {
      const config: AIProviderConfig = {
        type: 'claude',
        apiKey: 'test-api-key',
      };

      const provider = new TestProvider(config);

      expect(provider.getModel()).toBeDefined();
    });

    it('should use provided model', () => {
      const config: AIProviderConfig = {
        type: 'claude',
        apiKey: 'test-api-key',
        model: 'custom-model',
      };

      const provider = new TestProvider(config);

      expect(provider.getModel()).toBe('custom-model');
    });

    it('should handle empty API key (for OAuth)', () => {
      const config: AIProviderConfig = {
        type: 'gemini',
        apiKey: '',
        geminiAuthMode: 'oauth',
      };

      const provider = new TestProvider(config);

      expect(provider).toBeDefined();
    });
  });

  describe('getModel', () => {
    it('should return current model', () => {
      const provider = new TestProvider({
        type: 'claude',
        apiKey: 'test',
        model: 'my-model',
      });

      expect(provider.getModel()).toBe('my-model');
    });
  });

  describe('setModel', () => {
    it('should update the model', () => {
      const provider = new TestProvider({
        type: 'claude',
        apiKey: 'test',
        model: 'initial-model',
      });

      provider.setModel('new-model');

      expect(provider.getModel()).toBe('new-model');
    });
  });

  describe('getDefaultOptions', () => {
    it('should return default options', () => {
      const provider = new TestProvider({
        type: 'claude',
        apiKey: 'test',
      });

      const defaults = provider.testGetDefaultOptions();

      expect(defaults.maxTokens).toBe(2048);
      expect(defaults.temperature).toBe(0.7);
    });
  });

  describe('mergeOptions', () => {
    let provider: TestProvider;

    beforeEach(() => {
      provider = new TestProvider({
        type: 'claude',
        apiKey: 'test',
      });
    });

    it('should return defaults when no options provided', () => {
      const merged = provider.testMergeOptions();

      expect(merged.maxTokens).toBe(2048);
      expect(merged.temperature).toBe(0.7);
    });

    it('should use provided options', () => {
      const merged = provider.testMergeOptions({
        maxTokens: 4096,
        temperature: 0.5,
      });

      expect(merged.maxTokens).toBe(4096);
      expect(merged.temperature).toBe(0.5);
    });

    it('should merge partial options with defaults', () => {
      const merged = provider.testMergeOptions({
        maxTokens: 1000,
      });

      expect(merged.maxTokens).toBe(1000);
      expect(merged.temperature).toBe(0.7); // Default
    });

    it('should handle undefined values', () => {
      const merged = provider.testMergeOptions({
        maxTokens: undefined,
        temperature: undefined,
      });

      expect(merged.maxTokens).toBe(2048);
      expect(merged.temperature).toBe(0.7);
    });
  });

  describe('logging', () => {
    let provider: TestProvider;
    let consoleSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      provider = new TestProvider({
        type: 'claude',
        apiKey: 'test',
      });
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      errorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should log with provider name prefix', () => {
      provider.testLog('test message');

      expect(consoleSpy).toHaveBeenCalledWith('[Test Provider] test message');
    });

    it('should log with additional arguments', () => {
      provider.testLog('test message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Test Provider] test message',
        { key: 'value' }
      );
    });

    it('should log errors with provider name prefix', () => {
      const error = new Error('test error');
      provider.testLogError('Error occurred', error);

      expect(errorSpy).toHaveBeenCalledWith(
        '[Test Provider] Error occurred',
        error
      );
    });
  });
});

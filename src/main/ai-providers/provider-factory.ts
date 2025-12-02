/**
 * AI Provider Factory - Creates provider instances based on configuration
 *
 * Factory pattern for instantiating the correct provider based on type.
 * Centralizes provider creation and ensures proper initialization.
 */

import {
  AIProvider,
  AIProviderType,
  AIProviderConfig,
  getSupportedProviders,
} from '../../common/ai-provider.types';
import { ClaudeProvider } from './claude-provider';
import { OpenAIProvider } from './openai-provider';
import { GeminiProvider } from './gemini-provider';

/**
 * Factory for creating AI provider instances
 */
export class AIProviderFactory {
  /**
   * Create a provider instance based on configuration
   */
  static create(config: AIProviderConfig): AIProvider {
    // Gemini OAuth mode doesn't require an API key
    const isGeminiOAuth = config.type === 'gemini' && config.geminiAuthMode === 'oauth';

    if (!config.apiKey && !isGeminiOAuth) {
      throw new Error(`API key is required for ${config.type} provider`);
    }

    // For Gemini OAuth, verify we have tokens
    if (isGeminiOAuth && !config.oauthTokens?.accessToken) {
      throw new Error('OAuth tokens are required for Gemini OAuth mode');
    }

    switch (config.type) {
      case 'claude':
        return new ClaudeProvider(config);

      case 'openai':
        return new OpenAIProvider(config);

      case 'gemini':
        return new GeminiProvider(config);

      default:
        throw new Error(`Unknown provider type: ${config.type}`);
    }
  }

  /**
   * Get list of all supported provider types
   */
  static getSupportedProviders(): AIProviderType[] {
    return getSupportedProviders();
  }

  /**
   * Check if a provider type is supported
   */
  static isSupported(type: string): type is AIProviderType {
    return getSupportedProviders().includes(type as AIProviderType);
  }

  /**
   * Create a provider and validate its API key
   * Returns the provider if valid, throws if invalid
   */
  static async createAndValidate(config: AIProviderConfig): Promise<AIProvider> {
    const provider = AIProviderFactory.create(config);
    const isValid = await provider.validateApiKey();

    if (!isValid) {
      throw new Error(`Invalid API key for ${config.type} provider`);
    }

    return provider;
  }
}

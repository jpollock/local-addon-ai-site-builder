/**
 * AI Providers - Multi-provider AI support for Site Builder
 *
 * Exports all provider implementations and factory for creating instances.
 */

// Base class
export { BaseAIProvider } from './base-provider';

// Provider implementations
export { ClaudeProvider } from './claude-provider';
export { OpenAIProvider } from './openai-provider';
export { GeminiProvider } from './gemini-provider';

// Factory
export { AIProviderFactory } from './provider-factory';

// Re-export types for convenience
export type {
  AIProvider,
  AIProviderType,
  AIProviderConfig,
  AIMessage,
  AIStreamCallbacks,
  AIRequestOptions,
  ProviderMetadata,
} from '../../common/ai-provider.types';

export {
  PROVIDER_METADATA,
  getSupportedProviders,
  getProviderMetadata,
  isValidProviderType,
} from '../../common/ai-provider.types';

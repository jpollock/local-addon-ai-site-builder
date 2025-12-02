/**
 * Base AI Provider - Abstract base class for all AI provider implementations
 *
 * Provides common functionality and enforces the AIProvider contract.
 * Concrete implementations (Claude, OpenAI, Gemini) extend this class.
 */

import {
  AIProvider,
  AIProviderType,
  AIProviderConfig,
  AIMessage,
  AIStreamCallbacks,
  AIRequestOptions,
  PROVIDER_METADATA,
} from '../../common/ai-provider.types';

/**
 * Abstract base class for AI providers
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly type: AIProviderType;
  abstract readonly displayName: string;
  abstract readonly defaultModel: string;

  protected apiKey: string;
  protected model: string;

  constructor(config: AIProviderConfig) {
    // API key is optional for providers that support OAuth (like Gemini)
    this.apiKey = config.apiKey || '';
    // Use provided model or fall back to default from metadata
    this.model = config.model || PROVIDER_METADATA[config.type].defaultModel;
  }

  /**
   * Stream a message response - must be implemented by subclass
   */
  abstract streamMessage(
    messages: AIMessage[],
    systemPrompt: string,
    callbacks: AIStreamCallbacks,
    options?: AIRequestOptions
  ): Promise<void>;

  /**
   * Send a message and get complete response - must be implemented by subclass
   */
  abstract sendMessage(
    messages: AIMessage[],
    systemPrompt: string,
    options?: AIRequestOptions
  ): Promise<string>;

  /**
   * Validate API key - must be implemented by subclass
   */
  abstract validateApiKey(): Promise<boolean>;

  /**
   * Get the current model being used
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Update the model being used
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Get default request options
   */
  protected getDefaultOptions(): Required<AIRequestOptions> {
    return {
      maxTokens: 2048,
      temperature: 0.7,
    };
  }

  /**
   * Merge provided options with defaults
   */
  protected mergeOptions(options?: AIRequestOptions): Required<AIRequestOptions> {
    const defaults = this.getDefaultOptions();
    return {
      maxTokens: options?.maxTokens ?? defaults.maxTokens,
      temperature: options?.temperature ?? defaults.temperature,
    };
  }

  /**
   * Log provider activity (for debugging)
   */
  protected log(message: string, ...args: any[]): void {
    console.log(`[${this.displayName}] ${message}`, ...args);
  }

  /**
   * Log provider errors
   */
  protected logError(message: string, error?: any): void {
    console.error(`[${this.displayName}] ${message}`, error);
  }
}

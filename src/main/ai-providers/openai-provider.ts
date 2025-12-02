/**
 * OpenAI Provider - OpenAI GPT implementation
 *
 * Uses the official OpenAI SDK for GPT API access.
 * Supports streaming responses and conversation history.
 * Enhanced with timeout, retry, circuit breaker, and performance monitoring.
 */

import OpenAI from 'openai';
import { BaseAIProvider } from './base-provider';
import {
  AIProviderType,
  AIProviderConfig,
  AIMessage,
  AIStreamCallbacks,
  AIRequestOptions,
} from '../../common/ai-provider.types';
import { withTimeout } from '../utils/timeout';
import { withRetry } from '../utils/retry';
import { getCircuitBreakerRegistry } from '../utils/circuit-breaker';
import { getPerformanceMonitorRegistry } from '../utils/performance-monitor';
import { getCacheRegistry } from '../utils/cache';
import {
  API_TIMEOUTS,
  RETRY_CONFIG,
  CIRCUIT_BREAKER_CONFIG,
  CACHE_CONFIG,
} from '../../common/config';

/**
 * OpenAI GPT Provider implementation
 */
export class OpenAIProvider extends BaseAIProvider {
  readonly type: AIProviderType = 'openai';
  readonly displayName = 'OpenAI (GPT)';
  readonly defaultModel = 'gpt-5.1';

  private client: OpenAI;
  private circuitBreaker = getCircuitBreakerRegistry().getOrCreate(
    'openai',
    {
      failureThreshold: CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD,
      successThreshold: CIRCUIT_BREAKER_CONFIG.SUCCESS_THRESHOLD,
      timeout: CIRCUIT_BREAKER_CONFIG.TIMEOUT,
      monitoringWindowMs: CIRCUIT_BREAKER_CONFIG.MONITORING_WINDOW,
    },
    console
  );
  private performanceMonitor = getPerformanceMonitorRegistry().getOrCreate('openai', {}, console);
  private validationCache = getCacheRegistry().getOrCreate(
    'openai-validation',
    { defaultTtl: CACHE_CONFIG.API_KEY_VALIDATION },
    console
  );

  constructor(config: AIProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  /**
   * Stream a message response with token-by-token callbacks
   */
  async streamMessage(
    messages: AIMessage[],
    systemPrompt: string,
    callbacks: AIStreamCallbacks,
    options?: AIRequestOptions
  ): Promise<void> {
    const mergedOptions = this.mergeOptions(options);

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: mergedOptions.maxTokens,
        temperature: mergedOptions.temperature,
        messages: this.formatMessages(messages, systemPrompt),
        stream: true,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          callbacks.onToken?.(content);
        }
      }

      callbacks.onComplete?.(fullResponse);
    } catch (error) {
      this.logError('Stream error:', error);
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Send a message and get complete response (non-streaming)
   * Enhanced with timeout, retry, circuit breaker, and performance monitoring
   */
  async sendMessage(
    messages: AIMessage[],
    systemPrompt: string,
    options?: AIRequestOptions
  ): Promise<string> {
    const startTime = Date.now();
    const mergedOptions = this.mergeOptions(options);
    let retryCount = 0;

    try {
      // Execute through circuit breaker
      const result = await this.circuitBreaker.execute(async () => {
        // Execute with retry logic
        return await withRetry(
          async () => {
            // Execute with timeout
            return await withTimeout(
              this.client.chat.completions.create({
                model: this.model,
                max_tokens: mergedOptions.maxTokens,
                temperature: mergedOptions.temperature,
                messages: this.formatMessages(messages, systemPrompt),
              }),
              API_TIMEOUTS.OPENAI_MESSAGE,
              `OpenAI message generation timed out after ${API_TIMEOUTS.OPENAI_MESSAGE}ms`
            );
          },
          {
            maxAttempts: RETRY_CONFIG.MAX_ATTEMPTS,
            initialDelay: RETRY_CONFIG.INITIAL_DELAY,
            maxDelay: RETRY_CONFIG.MAX_DELAY,
            backoffMultiplier: RETRY_CONFIG.BACKOFF_MULTIPLIER,
            retryableErrors: [...RETRY_CONFIG.RETRYABLE_ERRORS],
            retryableStatusCodes: [...RETRY_CONFIG.RETRYABLE_STATUS_CODES],
          },
          {
            info: (msg: string) => {
              this.log(msg);
              retryCount++;
            },
            error: this.logError.bind(this),
          }
        );
      });

      const content = result.choices[0]?.message?.content;

      // Record success metrics
      const duration = Date.now() - startTime;
      this.performanceMonitor.record({
        operation: 'sendMessage',
        duration,
        success: true,
        provider: 'openai',
        retryCount,
      });

      return content || '';
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logError('Send message error:', error);

      // Record failure metrics
      this.performanceMonitor.record({
        operation: 'sendMessage',
        duration,
        success: false,
        provider: 'openai',
        error: error instanceof Error ? error.message : String(error),
        retryCount,
      });

      throw error;
    }
  }

  /**
   * Validate that the API key is working
   * Enhanced with caching, timeout, and performance monitoring
   */
  async validateApiKey(): Promise<boolean> {
    const cacheKey = `validation:${this.apiKey.substring(0, 10)}`;

    // Check cache first
    const cached = this.validationCache.get(cacheKey);
    if (cached !== undefined) {
      this.performanceMonitor.record({
        operation: 'validateApiKey',
        duration: 0,
        success: true,
        provider: 'openai',
        cacheHit: true,
      });
      return cached as boolean;
    }

    const startTime = Date.now();

    try {
      // Execute with timeout
      await withTimeout(
        this.client.chat.completions.create({
          model: this.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
        API_TIMEOUTS.OPENAI_VALIDATION,
        `OpenAI API key validation timed out after ${API_TIMEOUTS.OPENAI_VALIDATION}ms`
      );

      // Cache successful validation
      this.validationCache.set(cacheKey, true);

      // Record success metrics
      const duration = Date.now() - startTime;
      this.performanceMonitor.record({
        operation: 'validateApiKey',
        duration,
        success: true,
        provider: 'openai',
        cacheHit: false,
      });

      return true;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Check for auth-related errors
      const isAuthError =
        error?.status === 401 ||
        error?.code === 'invalid_api_key' ||
        error?.message?.includes('Invalid API Key') ||
        error?.message?.includes('Incorrect API key');

      // Cache auth failures (key is definitely invalid)
      if (isAuthError) {
        this.validationCache.set(cacheKey, false);
      }

      // Record failure metrics
      this.performanceMonitor.record({
        operation: 'validateApiKey',
        duration,
        success: false,
        provider: 'openai',
        error: error instanceof Error ? error.message : String(error),
        cacheHit: false,
      });

      // Other errors might be rate limits etc., key might still be valid
      if (!isAuthError) {
        this.logError('Validation error (may be transient):', error);
      }

      return false;
    }
  }

  /**
   * Format messages for OpenAI API
   * OpenAI supports system role in messages array
   */
  private formatMessages(
    messages: AIMessage[],
    systemPrompt: string
  ): Array<OpenAI.ChatCompletionMessageParam> {
    const formattedMessages: OpenAI.ChatCompletionMessageParam[] = [];

    // Add system prompt first
    if (systemPrompt) {
      formattedMessages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Add conversation messages
    for (const msg of messages) {
      if (msg.role === 'system') {
        // Additional system messages go in order
        formattedMessages.push({
          role: 'system',
          content: msg.content,
        });
      } else {
        formattedMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return formattedMessages;
  }
}

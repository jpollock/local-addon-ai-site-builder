/**
 * Claude Provider - Anthropic Claude AI implementation
 *
 * Uses the official Anthropic SDK for Claude API access.
 * Supports streaming responses and conversation history.
 * Enhanced with timeout, retry, circuit breaker, and performance monitoring.
 */

import Anthropic from '@anthropic-ai/sdk';
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
 * Claude AI Provider implementation
 */
export class ClaudeProvider extends BaseAIProvider {
  readonly type: AIProviderType = 'claude';
  readonly displayName = 'Claude (Anthropic)';
  readonly defaultModel = 'claude-sonnet-4-5-20250929';

  private client: Anthropic;
  private circuitBreaker = getCircuitBreakerRegistry().getOrCreate(
    'claude',
    {
      failureThreshold: CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD,
      successThreshold: CIRCUIT_BREAKER_CONFIG.SUCCESS_THRESHOLD,
      timeout: CIRCUIT_BREAKER_CONFIG.TIMEOUT,
      monitoringWindowMs: CIRCUIT_BREAKER_CONFIG.MONITORING_WINDOW,
    },
    console
  );
  private performanceMonitor = getPerformanceMonitorRegistry().getOrCreate('claude', {}, console);
  private validationCache = getCacheRegistry().getOrCreate(
    'claude-validation',
    { defaultTtl: CACHE_CONFIG.API_KEY_VALIDATION },
    console
  );

  constructor(config: AIProviderConfig) {
    super(config);
    this.client = new Anthropic({
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
      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: mergedOptions.maxTokens,
        system: systemPrompt,
        messages: this.formatMessages(messages),
      });

      let fullResponse = '';

      stream.on('text', (text) => {
        fullResponse += text;
        callbacks.onToken?.(text);
      });

      // Wait for the stream to complete
      const finalMessage = await stream.finalMessage();

      // Extract final text from response
      const responseText = finalMessage.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      callbacks.onComplete?.(responseText || fullResponse);
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
              this.client.messages.create({
                model: this.model,
                max_tokens: mergedOptions.maxTokens,
                system: systemPrompt,
                messages: this.formatMessages(messages),
              }),
              API_TIMEOUTS.CLAUDE_MESSAGE,
              `Claude message generation timed out after ${API_TIMEOUTS.CLAUDE_MESSAGE}ms`
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

      // Extract text from response
      const textContent = result.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      // Record success metrics
      const duration = Date.now() - startTime;
      this.performanceMonitor.record({
        operation: 'sendMessage',
        duration,
        success: true,
        provider: 'claude',
        retryCount,
      });

      return textContent;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logError('Send message error:', error);

      // Record failure metrics
      this.performanceMonitor.record({
        operation: 'sendMessage',
        duration,
        success: false,
        provider: 'claude',
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
        provider: 'claude',
        cacheHit: true,
      });
      return cached as boolean;
    }

    const startTime = Date.now();

    try {
      // Execute with timeout
      await withTimeout(
        this.client.messages.create({
          model: this.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
        API_TIMEOUTS.CLAUDE_VALIDATION,
        `Claude API key validation timed out after ${API_TIMEOUTS.CLAUDE_VALIDATION}ms`
      );

      // Cache successful validation
      this.validationCache.set(cacheKey, true);

      // Record success metrics
      const duration = Date.now() - startTime;
      this.performanceMonitor.record({
        operation: 'validateApiKey',
        duration,
        success: true,
        provider: 'claude',
        cacheHit: false,
      });

      return true;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Check for auth-related errors
      const isAuthError = error?.status === 401 || error?.message?.includes('Invalid API Key');

      // Cache auth failures (key is definitely invalid)
      if (isAuthError) {
        this.validationCache.set(cacheKey, false);
      }

      // Record failure metrics
      this.performanceMonitor.record({
        operation: 'validateApiKey',
        duration,
        success: false,
        provider: 'claude',
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
   * Format messages for Claude API
   * Claude expects {role, content} format but doesn't support 'system' role in messages
   */
  private formatMessages(
    messages: AIMessage[]
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    return messages
      .filter((msg) => msg.role !== 'system') // System messages go in system parameter
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
  }
}

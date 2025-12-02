/**
 * Gemini Provider - Google Gemini AI implementation
 *
 * Uses the official Google Generative AI SDK for Gemini API access.
 * Supports both API key and OAuth (Sign in with Google) authentication.
 * Supports streaming responses and conversation history.
 * Enhanced with timeout, retry, circuit breaker, and performance monitoring.
 */

import { GoogleGenerativeAI, Content, Part, RequestOptions } from '@google/generative-ai';
import { BaseAIProvider } from './base-provider';
import {
  AIProviderType,
  AIProviderConfig,
  AIMessage,
  AIStreamCallbacks,
  AIRequestOptions,
  GeminiAuthMode,
  GoogleOAuthTokens,
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
 * Google Gemini Provider implementation
 * Supports both OAuth and API key authentication modes
 */
export class GeminiProvider extends BaseAIProvider {
  readonly type: AIProviderType = 'gemini';
  readonly displayName = 'Gemini (Google)';
  readonly defaultModel = 'gemini-2.5-flash';

  private client: GoogleGenerativeAI;
  private authMode: GeminiAuthMode;
  private oauthTokens?: GoogleOAuthTokens;
  private requestOptions: RequestOptions;
  private circuitBreaker = getCircuitBreakerRegistry().getOrCreate(
    'gemini',
    {
      failureThreshold: CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD,
      successThreshold: CIRCUIT_BREAKER_CONFIG.SUCCESS_THRESHOLD,
      timeout: CIRCUIT_BREAKER_CONFIG.TIMEOUT,
      monitoringWindowMs: CIRCUIT_BREAKER_CONFIG.MONITORING_WINDOW,
    },
    console
  );
  private performanceMonitor = getPerformanceMonitorRegistry().getOrCreate('gemini', {}, console);
  private validationCache = getCacheRegistry().getOrCreate(
    'gemini-validation',
    { defaultTtl: CACHE_CONFIG.API_KEY_VALIDATION },
    console
  );

  constructor(config: AIProviderConfig) {
    super(config);

    this.authMode = config.geminiAuthMode || 'api-key';
    this.oauthTokens = config.oauthTokens;

    if (this.authMode === 'oauth') {
      if (!this.oauthTokens?.accessToken) {
        throw new Error('OAuth tokens required for OAuth authentication mode');
      }
      // For OAuth, we use a placeholder API key and pass the access token via headers
      // The SDK requires an API key but we override with OAuth token in requests
      this.client = new GoogleGenerativeAI('oauth-placeholder');
      this.requestOptions = {
        customHeaders: {
          Authorization: `Bearer ${this.oauthTokens.accessToken}`,
        },
      };
      console.log('[GeminiProvider] Initialized with OAuth authentication');
    } else {
      // API key mode
      if (!this.apiKey) {
        throw new Error('API key required for API key authentication mode');
      }
      this.client = new GoogleGenerativeAI(this.apiKey);
      this.requestOptions = {};
      console.log('[GeminiProvider] Initialized with API key authentication');
    }
  }

  /**
   * Get the current authentication mode
   */
  getAuthMode(): GeminiAuthMode {
    return this.authMode;
  }

  /**
   * Get connected email (for OAuth mode)
   */
  getConnectedEmail(): string | undefined {
    return this.authMode === 'oauth' ? this.oauthTokens?.email : undefined;
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

    // For OAuth mode, fall back to non-streaming (simpler implementation)
    if (this.authMode === 'oauth') {
      try {
        const response = await this.sendMessageViaRest(messages, systemPrompt, mergedOptions);
        callbacks.onToken?.(response);
        callbacks.onComplete?.(response);
      } catch (error) {
        this.logError('OAuth stream error:', error);
        callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
      return;
    }

    try {
      const model = this.client.getGenerativeModel(
        {
          model: this.model,
          systemInstruction: systemPrompt,
          generationConfig: {
            maxOutputTokens: mergedOptions.maxTokens,
            temperature: mergedOptions.temperature,
          },
        },
        this.requestOptions
      );

      // Format history (all messages except the last one)
      const history = this.formatHistory(messages.slice(0, -1));

      // Start chat with history
      const chat = model.startChat({
        history,
      });

      // Get the last user message
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new Error('Last message must be from user');
      }

      // Stream the response
      const result = await chat.sendMessageStream(lastMessage.content);

      let fullResponse = '';

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullResponse += text;
          callbacks.onToken?.(text);
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

    console.log(`[GeminiProvider] sendMessage called with model: ${this.model}`);

    // Use direct REST API for OAuth mode (SDK doesn't support OAuth)
    if (this.authMode === 'oauth') {
      try {
        const result = await this.circuitBreaker.execute(async () => {
          return await withRetry(
            async () => {
              return await withTimeout(
                this.sendMessageViaRest(messages, systemPrompt, mergedOptions),
                API_TIMEOUTS.GEMINI_MESSAGE,
                `Gemini OAuth message generation timed out after ${API_TIMEOUTS.GEMINI_MESSAGE}ms`
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

        const duration = Date.now() - startTime;
        this.performanceMonitor.record({
          operation: 'sendMessage',
          duration,
          success: true,
          provider: 'gemini',
          retryCount,
          authMode: 'oauth',
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.logError('OAuth send message error:', error);
        this.performanceMonitor.record({
          operation: 'sendMessage',
          duration,
          success: false,
          provider: 'gemini',
          error: error instanceof Error ? error.message : String(error),
          retryCount,
          authMode: 'oauth',
        });
        throw error;
      }
    }

    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await withRetry(
          async () => {
            return await withTimeout(
              (async () => {
                const modelConfig: any = {
                  model: this.model,
                  generationConfig: {
                    maxOutputTokens: mergedOptions.maxTokens,
                    temperature: mergedOptions.temperature,
                  },
                };

                // Only add systemInstruction if provided
                if (systemPrompt) {
                  modelConfig.systemInstruction = systemPrompt;
                }

                const model = this.client.getGenerativeModel(modelConfig, this.requestOptions);

                // Format history (all messages except the last one)
                const history = this.formatHistory(messages.slice(0, -1));

                // Start chat with history
                const chat = model.startChat({
                  history,
                });

                // Get the last user message
                const lastMessage = messages[messages.length - 1];
                if (!lastMessage || lastMessage.role !== 'user') {
                  throw new Error('Last message must be from user');
                }

                console.log(`[GeminiProvider] Sending message (${lastMessage.content.length} chars)`);

                // Send message and get response
                const apiResult = await chat.sendMessage(lastMessage.content);
                const response = await apiResult.response;

                // Log response details for debugging
                const text = response.text();
                console.log(`[GeminiProvider] Response received: ${text.length} chars`);
                if (text.length === 0) {
                  console.log(
                    `[GeminiProvider] Empty response! Candidates:`,
                    JSON.stringify(response.candidates)
                  );
                  console.log(`[GeminiProvider] Prompt feedback:`, JSON.stringify(response.promptFeedback));
                }

                return text;
              })(),
              API_TIMEOUTS.GEMINI_MESSAGE,
              `Gemini message generation timed out after ${API_TIMEOUTS.GEMINI_MESSAGE}ms`
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

      const duration = Date.now() - startTime;
      this.performanceMonitor.record({
        operation: 'sendMessage',
        duration,
        success: true,
        provider: 'gemini',
        retryCount,
        authMode: 'api-key',
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logError('Send message error:', error);
      this.performanceMonitor.record({
        operation: 'sendMessage',
        duration,
        success: false,
        provider: 'gemini',
        error: error instanceof Error ? error.message : String(error),
        retryCount,
        authMode: 'api-key',
      });
      throw error;
    }
  }

  /**
   * Send message via REST API (for OAuth mode)
   * The SDK doesn't support OAuth, so we make direct REST calls
   */
  private async sendMessageViaRest(
    messages: AIMessage[],
    systemPrompt: string,
    options: AIRequestOptions
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    // Format messages for REST API
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    }));

    const requestBody: any = {
      contents,
      generationConfig: {
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
      },
    };

    // Add system instruction if provided
    if (systemPrompt) {
      requestBody.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    console.log(
      `[GeminiProvider] Sending OAuth request (${JSON.stringify(requestBody).length} chars)`
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.oauthTokens?.accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GeminiProvider] OAuth REST error: ${response.status} ${errorText}`);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Extract text from response
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`[GeminiProvider] OAuth response received: ${text.length} chars`);

    return text;
  }

  /**
   * Validate credentials (works for both API key and OAuth modes)
   * Enhanced with caching, timeout, and performance monitoring
   */
  async validateApiKey(): Promise<boolean> {
    // Use REST API for OAuth mode validation
    if (this.authMode === 'oauth') {
      return this.validateOAuthCredentials();
    }

    const cacheKey = `validation:${this.apiKey.substring(0, 10)}`;

    // Check cache first
    const cached = this.validationCache.get(cacheKey);
    if (cached !== undefined) {
      this.performanceMonitor.record({
        operation: 'validateApiKey',
        duration: 0,
        success: true,
        provider: 'gemini',
        cacheHit: true,
      });
      return cached as boolean;
    }

    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel(
        {
          model: this.model,
        },
        this.requestOptions
      );

      // Execute with timeout
      await withTimeout(
        (async () => {
          const result = await model.generateContent('Hello');
          await result.response;
        })(),
        API_TIMEOUTS.GEMINI_VALIDATION,
        `Gemini API key validation timed out after ${API_TIMEOUTS.GEMINI_VALIDATION}ms`
      );

      // Cache successful validation
      this.validationCache.set(cacheKey, true);

      // Record success metrics
      const duration = Date.now() - startTime;
      this.performanceMonitor.record({
        operation: 'validateApiKey',
        duration,
        success: true,
        provider: 'gemini',
        cacheHit: false,
      });

      return true;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Check for auth-related errors
      const errorMessage = error?.message || '';
      const isAuthError =
        error?.status === 401 ||
        error?.status === 403 ||
        errorMessage.includes('API_KEY_INVALID') ||
        errorMessage.includes('API key not valid') ||
        errorMessage.includes('invalid api key') ||
        errorMessage.includes('UNAUTHENTICATED') ||
        errorMessage.includes('invalid_grant');

      // Cache auth failures (key is definitely invalid)
      if (isAuthError) {
        this.validationCache.set(cacheKey, false);
      }

      // Record failure metrics
      this.performanceMonitor.record({
        operation: 'validateApiKey',
        duration,
        success: false,
        provider: 'gemini',
        error: error instanceof Error ? error.message : String(error),
        cacheHit: false,
      });

      // Other errors might be rate limits etc., credentials might still be valid
      if (!isAuthError) {
        this.logError('Validation error (may be transient):', error);
      }

      return false;
    }
  }

  /**
   * Validate OAuth credentials via REST API
   */
  private async validateOAuthCredentials(): Promise<boolean> {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.oauthTokens?.accessToken}`,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        }),
      });

      return response.ok;
    } catch (error) {
      this.logError('OAuth validation error:', error);
      return false;
    }
  }

  /**
   * Format message history for Gemini API
   * Gemini uses 'user' and 'model' roles with Content objects
   */
  private formatHistory(messages: AIMessage[]): Content[] {
    const history: Content[] = [];

    for (const msg of messages) {
      // Skip system messages - they go in systemInstruction
      if (msg.role === 'system') {
        continue;
      }

      // Map roles: Gemini uses 'model' instead of 'assistant'
      const role = msg.role === 'assistant' ? 'model' : 'user';

      // Create content with text part
      const parts: Part[] = [{ text: msg.content }];

      history.push({
        role,
        parts,
      });
    }

    return history;
  }
}

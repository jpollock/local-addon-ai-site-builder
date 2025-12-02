/**
 * AI Provider Types - Multi-provider abstraction for AI Site Builder
 *
 * Supports Claude (Anthropic), OpenAI, and Gemini (Google) as AI backends.
 * Provides unified interface for streaming conversations and site structure generation.
 */

/**
 * Supported AI provider types
 */
export type AIProviderType = 'claude' | 'openai' | 'gemini';

/**
 * Gemini authentication mode
 * - 'oauth': Use Google OAuth (Sign in with Google)
 * - 'api-key': Use manual API key
 */
export type GeminiAuthMode = 'oauth' | 'api-key';

/**
 * OAuth tokens for Google authentication
 */
export interface GoogleOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp
  email?: string;
  idToken?: string;
}

// Note: Figma OAuth was removed - Figma doesn't properly support PKCE for desktop apps.
// Use Figma Personal Access Tokens (PAT) instead via settings.figmaAccessToken

/**
 * Configuration for creating an AI provider instance
 */
export interface AIProviderConfig {
  type: AIProviderType;
  apiKey?: string; // Required for Claude/OpenAI, optional for Gemini OAuth
  model?: string; // Optional model override
  // Gemini-specific OAuth options
  geminiAuthMode?: GeminiAuthMode;
  oauthTokens?: GoogleOAuthTokens;
}

/**
 * Message format for AI conversations
 */
export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Callbacks for streaming AI responses
 */
export interface AIStreamCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Core AI provider interface
 * All providers must implement this contract
 */
export interface AIProvider {
  readonly type: AIProviderType;
  readonly displayName: string;
  readonly defaultModel: string;

  /**
   * Stream a message response with token-by-token callbacks
   */
  streamMessage(
    messages: AIMessage[],
    systemPrompt: string,
    callbacks: AIStreamCallbacks,
    options?: AIRequestOptions
  ): Promise<void>;

  /**
   * Send a message and get complete response (non-streaming)
   */
  sendMessage(
    messages: AIMessage[],
    systemPrompt: string,
    options?: AIRequestOptions
  ): Promise<string>;

  /**
   * Validate that the API key is working
   */
  validateApiKey(): Promise<boolean>;
}

/**
 * Options for AI requests
 */
export interface AIRequestOptions {
  maxTokens?: number;
  temperature?: number;
}

/**
 * Metadata for each provider (display info, models, etc.)
 */
export interface ProviderMetadata {
  displayName: string;
  defaultModel: string;
  modelOptions: Array<{ value: string; label: string }>;
  apiKeyPlaceholder: string;
  docsUrl: string;
  apiKeyPrefix?: string; // For validation hints
}

/**
 * Provider metadata registry
 */
export const PROVIDER_METADATA: Record<AIProviderType, ProviderMetadata> = {
  claude: {
    displayName: 'Claude (Anthropic)',
    defaultModel: 'claude-sonnet-4-5-20250929',
    modelOptions: [
      { value: 'claude-sonnet-4-5-20250929', label: 'Claude 4.5 Sonnet (Recommended)' },
      { value: 'claude-opus-4-5-20250929', label: 'Claude 4.5 Opus' },
      { value: 'claude-haiku-4-5-20250929', label: 'Claude 4.5 Haiku (Faster)' },
    ],
    apiKeyPlaceholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/',
    apiKeyPrefix: 'sk-ant-',
  },
  openai: {
    displayName: 'OpenAI (GPT)',
    defaultModel: 'gpt-5.1',
    modelOptions: [
      { value: 'gpt-5.1', label: 'GPT-5.1 (Recommended)' },
      { value: 'gpt-5-pro', label: 'GPT-5 Pro' },
      { value: 'gpt-5-mini', label: 'GPT-5 Mini (Faster)' },
      { value: 'gpt-5-nano', label: 'GPT-5 Nano (Fastest)' },
    ],
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    apiKeyPrefix: 'sk-',
  },
  gemini: {
    displayName: 'Gemini (Google)',
    defaultModel: 'gemini-2.5-flash',
    modelOptions: [
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended)' },
      { value: 'gemini-3-pro', label: 'Gemini 3 Pro' },
      { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (Faster)' },
    ],
    apiKeyPlaceholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/apikey',
    apiKeyPrefix: 'AIza',
  },
};

/**
 * Get list of all supported provider types
 */
export function getSupportedProviders(): AIProviderType[] {
  return ['claude', 'openai', 'gemini'];
}

/**
 * Get metadata for a specific provider
 */
export function getProviderMetadata(type: AIProviderType): ProviderMetadata {
  return PROVIDER_METADATA[type];
}

/**
 * Check if a string is a valid provider type
 */
export function isValidProviderType(type: string): type is AIProviderType {
  return ['claude', 'openai', 'gemini'].includes(type);
}

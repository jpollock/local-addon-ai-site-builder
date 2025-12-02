/**
 * @fileoverview Central configuration file for AI Site Builder addon
 * @module config
 *
 * Contains all configuration constants, magic numbers, and default values
 * organized by category for easy maintenance and consistency.
 */

/**
 * API and network timeout configurations
 */
export const TIMEOUTS = {
  /** Timeout for Claude API calls (30 seconds) */
  CLAUDE_API: 30000,

  /** Timeout for OAuth flow (5 minutes) */
  OAUTH_FLOW: 5 * 60 * 1000,

  /** Default timeout for HTTP requests (1 hour) */
  DEFAULT_TOKEN_EXPIRY: 3600000,

  /** Figma default token expiry (2 hours) */
  FIGMA_TOKEN_EXPIRY: 7200,

  /** Progress update interval (3 seconds) */
  PROGRESS_UPDATE_INTERVAL: 3000,

  /** Site creation delay (2 seconds) */
  SITE_CREATION_DELAY: 2000,

  /** Cleanup delay after site creation (5 seconds) */
  CLEANUP_DELAY: 5000,

  /** Small retry delay (500ms) */
  RETRY_DELAY_SHORT: 500,

  /** Jest test timeout (10 seconds) */
  TEST_TIMEOUT: 10000,
} as const;

/**
 * Retry and rate limiting configurations
 */
export const RETRY = {
  /** Maximum number of retries for Figma API calls */
  FIGMA_API_MAX_RETRIES: 3,

  /** Maximum wait time for rate limit (30 seconds) */
  MAX_RATE_LIMIT_WAIT: 30,

  /** Token expiry buffer (5 minutes before expiry) */
  TOKEN_EXPIRY_BUFFER: 5 * 60 * 1000,
} as const;

/**
 * Validation limits and constraints
 */
export const VALIDATION = {
  /** Maximum site name length */
  MAX_SITE_NAME_LENGTH: 255,

  /** Maximum domain length */
  MAX_DOMAIN_LENGTH: 255,

  /** Maximum user message length */
  MAX_MESSAGE_LENGTH: 10000,

  /** Maximum label length for chip options */
  MAX_CHIP_LABEL_LENGTH: 50,

  /** Maximum context hint length */
  MAX_CONTEXT_HINT_LENGTH: 100,

  /** Maximum conversation questions */
  MAX_CONVERSATION_QUESTIONS: 8,

  /** Default maximum questions in conversation */
  DEFAULT_CONVERSATION_MAX_QUESTIONS: 8,

  /** Maximum AI-suggested options per question */
  MAX_AI_OPTIONS: 3,

  /** Minimum remaining base options after AI filtering */
  MIN_BASE_OPTIONS_REMAINING: 3,
} as const;

/**
 * AI model configurations
 */
export const AI_MODELS = {
  /** Default Claude model */
  CLAUDE_DEFAULT: 'claude-sonnet-4-5-20250929',

  /** Available Claude models */
  CLAUDE_MODELS: [
    'claude-sonnet-4-5-20250929',
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
  ],

  /** Default OpenAI model */
  OPENAI_DEFAULT: 'gpt-4-turbo-preview',

  /** Default Gemini model */
  GEMINI_DEFAULT: 'gemini-pro',

  /** Maximum tokens for chat completions */
  MAX_TOKENS_CHAT: 1024,

  /** Maximum tokens for structure generation */
  MAX_TOKENS_STRUCTURE: 2048,

  /** Default confidence for AI suggestions */
  DEFAULT_CONFIDENCE: 0.8,
} as const;

/**
 * File paths and directory names
 */
export const PATHS = {
  /** Settings directory name */
  SETTINGS_DIR: 'ai-site-builder',

  /** Settings file name */
  SETTINGS_FILE: 'settings.json',

  /** Projects directory name */
  PROJECTS_DIR: 'projects',

  /** Conversations directory name */
  CONVERSATIONS_DIR: 'conversations',
} as const;

/**
 * OAuth configurations
 */
export const OAUTH = {
  /** OAuth callback path */
  GOOGLE_CALLBACK_PATH: '/oauth/callback',

  /** OAuth callback port range start */
  PORT_RANGE_START: 49152,

  /** OAuth callback port range end */
  PORT_RANGE_END: 65535,

  /** Google OAuth scopes */
  GOOGLE_SCOPES: [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/generative-language.retriever',
  ],

  /** Figma OAuth callback path */
  FIGMA_CALLBACK_PATH: '/oauth/figma/callback',

  /** Figma OAuth scopes */
  FIGMA_SCOPES: ['file_read'],
} as const;

/**
 * Figma API configurations
 */
export const FIGMA = {
  /** Figma API base URL */
  API_BASE_URL: 'https://api.figma.com/v1',

  /** Figma OAuth URL */
  OAUTH_URL: 'https://www.figma.com/oauth',

  /** Rate limit status code */
  RATE_LIMIT_STATUS_CODE: 429,

  /** Minimum frame dimensions for processing */
  MIN_FRAME_WIDTH: 100,
  MIN_FRAME_HEIGHT: 50,

  /** Large frame threshold dimensions */
  LARGE_FRAME_WIDTH: 300,
  LARGE_FRAME_HEIGHT: 400,

  /** Hero section threshold height */
  HERO_HEIGHT_THRESHOLD: 400,

  /** CTA section max height */
  CTA_MAX_HEIGHT: 300,

  /** Minimum image dimensions for recognition */
  MIN_IMAGE_WIDTH: 200,
  MIN_IMAGE_HEIGHT: 150,
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  /** Success */
  OK: 200,

  /** Bad request */
  BAD_REQUEST: 400,

  /** Unauthorized */
  UNAUTHORIZED: 401,

  /** Forbidden */
  FORBIDDEN: 403,

  /** Not found */
  NOT_FOUND: 404,

  /** Rate limit exceeded */
  TOO_MANY_REQUESTS: 429,
} as const;

/**
 * Design token defaults
 */
export const DESIGN_DEFAULTS = {
  /** Default color palette */
  COLORS: {
    PRIMARY: '#51a351',
    SECONDARY: '#2c3e50',
    TEXT: '#333333',
    TEXT_MUTED: '#666666',
    BACKGROUND: '#ffffff',
    BLACK: '#000000',
  },

  /** Default font weights */
  FONT_WEIGHTS: {
    NORMAL: 400,
    MEDIUM: 500,
    SEMIBOLD: 600,
    BOLD: 700,
  },

  /** Font weight detection ranges */
  FONT_WEIGHT_RANGES: {
    NORMAL_MIN: 300,
    NORMAL_MAX: 500,
    MEDIUM_MIN: 500,
    MEDIUM_MAX: 600,
    SEMIBOLD_MIN: 600,
    SEMIBOLD_MAX: 700,
    BOLD_MIN: 700,
  },

  /** Default border radius values (px) */
  BORDER_RADIUS: {
    NONE: 0,
    SM: 4,
    MD: 8,
    LG: 12,
    XL: 16,
    FULL: 9999,
  },

  /** Default spacing values */
  SPACING: {
    SM: '8px',
    MD: '16px',
    LG: '32px',
  },

  /** Default font sizes */
  FONT_SIZES: {
    BASE: '16px',
    LARGE: '24px',
    HEADING_SM: '32px',
    HEADING_LG: '36px',
  },

  /** Default line heights */
  LINE_HEIGHTS: {
    BASE: '1.5',
    HEADING: '1.2',
  },

  /** RGB to luminance calculation weights */
  LUMINANCE_WEIGHTS: {
    RED: 0.299,
    GREEN: 0.587,
    BLUE: 0.114,
  },

  /** RGB scaling factor */
  RGB_SCALE: 255,

  /** Hex color parsing base */
  HEX_BASE: 16,
} as const;

/**
 * WordPress theme configurations
 */
export const WORDPRESS = {
  /** Default base themes */
  BASE_THEMES: ['frost', 'twentytwentyfive', 'custom'] as const,

  /** Default child theme name */
  DEFAULT_CHILD_THEME: 'ai-generated-theme',

  /** Default post supports */
  DEFAULT_POST_SUPPORTS: ['title', 'editor', 'thumbnail'],

  /** Default post type icon */
  DEFAULT_POST_ICON: 'admin-post',

  /** Default progress on completion */
  PROGRESS_COMPLETE: 100,

  /** CSS percentage values */
  FULL_WIDTH: 100,

  /** Box shadow focus ring opacity */
  FOCUS_RING_OPACITY: 0.1,

  /** Cover block dimRatio */
  COVER_DIM_RATIO: 50,

  /** Minimum cover height */
  MIN_COVER_HEIGHT: 500,
  MIN_HERO_HEIGHT: 600,
} as const;

/**
 * Plugin recommendations confidence levels
 */
export const PLUGIN_CONFIDENCE = {
  /** High confidence recommendation */
  HIGH: 95,

  /** Medium-high confidence */
  MEDIUM_HIGH: 90,

  /** Medium confidence */
  MEDIUM: 80,

  /** Medium-low confidence */
  MEDIUM_LOW: 70,

  /** Default mock confidence */
  MOCK_DEFAULT: 100,

  /** Calculated confidence from decimal (0.75 * 100) */
  CALCULATED_BASE: 100,
} as const;

/**
 * AI provider confidence thresholds
 */
export const AI_CONFIDENCE = {
  /** Confidence when ready to build */
  READY_TO_BUILD: 100,

  /** Confidence increment per question */
  PER_QUESTION: 15,

  /** Maximum confidence before ready */
  MAX_BEFORE_READY: 85,

  /** Default AI option confidence */
  DEFAULT_OPTION: 0.8,
} as const;

/**
 * Conversation flow configurations
 */
export const CONVERSATION = {
  /** Number of early questions */
  EARLY_QUESTIONS_THRESHOLD: 3,

  /** Number of mid questions threshold */
  MID_QUESTIONS_THRESHOLD: 6,

  /** Total wizard questions */
  WIZARD_QUESTIONS_COUNT: 5,
} as const;

/**
 * Client IDs and external service configurations
 * Note: These should be moved to environment variables in production
 */
export const EXTERNAL_SERVICES = {
  /** Google OAuth Client ID (should use env var) */
  GOOGLE_CLIENT_ID: '212814026888-os3s88el0in5ei17l6849cr7ajiehnfm.apps.googleusercontent.com',
} as const;

/**
 * Progress calculation values
 */
export const PROGRESS = {
  /** Figma wait time divisor for progress calculation */
  WAIT_TIME_DIVISOR: 1000,
} as const;

/**
 * API Timeout Configuration (in milliseconds)
 * Extended timeouts for resilience features
 */
export const API_TIMEOUTS = {
  // Claude API
  CLAUDE_MESSAGE: 60000, // 60s for message generation
  CLAUDE_VALIDATION: 30000, // 30s for API key validation
  CLAUDE_STREAM: 120000, // 120s for streaming (can be longer)

  // OpenAI API
  OPENAI_MESSAGE: 60000, // 60s for message generation
  OPENAI_VALIDATION: 30000, // 30s for API key validation
  OPENAI_STREAM: 120000, // 120s for streaming

  // Gemini API
  GEMINI_MESSAGE: 60000, // 60s for message generation
  GEMINI_VALIDATION: 30000, // 30s for API key validation
  GEMINI_STREAM: 120000, // 120s for streaming

  // Figma API
  FIGMA_API: 30000, // 30s for Figma API calls
  FIGMA_FILE_FETCH: 45000, // 45s for fetching large files

  // OAuth flows (using existing TIMEOUTS.OAUTH_FLOW)
  OAUTH_CALLBACK: 300000, // 5min for OAuth callback (user interaction)
} as const;

/**
 * Retry Configuration for API calls
 */
export const RETRY_CONFIG = {
  // Maximum retry attempts
  MAX_ATTEMPTS: 3,

  // Exponential backoff delays
  INITIAL_DELAY: 1000, // 1s
  MAX_DELAY: 8000, // 8s
  BACKOFF_MULTIPLIER: 2,

  // Retryable network error codes
  RETRYABLE_ERRORS: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'ENETUNREACH',
    'EAI_AGAIN',
  ],

  // Retryable HTTP status codes
  RETRYABLE_STATUS_CODES: [
    408, // Request Timeout
    429, // Too Many Requests (rate limit)
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ],
} as const;

/**
 * Circuit Breaker Configuration
 */
export const CIRCUIT_BREAKER_CONFIG = {
  // Failure threshold to open circuit
  FAILURE_THRESHOLD: 5,

  // Success threshold to close circuit from half-open
  SUCCESS_THRESHOLD: 2,

  // Time to wait before attempting recovery (ms)
  TIMEOUT: 30000, // 30 seconds

  // Time window to track failures (ms)
  MONITORING_WINDOW: 60000, // 60 seconds
} as const;

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
  // Maximum cache size (number of entries)
  MAX_SIZE: 100,

  // Cache TTLs (time-to-live in milliseconds)
  FIGMA_DESIGN_DATA: 3600000, // 1 hour
  FIGMA_TOKEN_VALIDATION: 300000, // 5 minutes
  API_KEY_VALIDATION: 300000, // 5 minutes
  DYNAMIC_OPTIONS: 60000, // 1 minute
} as const;

/**
 * Performance Monitoring Configuration
 */
export const PERFORMANCE_CONFIG = {
  // Maximum data points to keep in memory
  MAX_DATA_POINTS: 1000,

  // Threshold for slow operations (ms)
  SLOW_OPERATION_THRESHOLD: 5000, // 5 seconds

  // Threshold for high error rate (0-1)
  HIGH_ERROR_RATE_THRESHOLD: 0.1, // 10%
} as const;

/**
 * Get all configuration as a single object
 * Useful for debugging and logging
 */
export const CONFIG = {
  TIMEOUTS,
  RETRY,
  VALIDATION,
  AI_MODELS,
  PATHS,
  OAUTH,
  FIGMA,
  HTTP_STATUS,
  DESIGN_DEFAULTS,
  WORDPRESS,
  PLUGIN_CONFIDENCE,
  AI_CONFIDENCE,
  CONVERSATION,
  EXTERNAL_SERVICES,
  PROGRESS,
  API_TIMEOUTS,
  RETRY_CONFIG,
  CIRCUIT_BREAKER_CONFIG,
  CACHE_CONFIG,
  PERFORMANCE_CONFIG,
} as const;

export default CONFIG;

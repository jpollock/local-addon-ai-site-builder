/**
 * Constants for AI Site Builder addon
 */

/**
 * IPC channel names
 * All channels prefixed with 'ai-site-builder:' for namespacing
 */
export const IPC_CHANNELS = {
  // Configuration & settings
  GET_SETTINGS: 'ai-site-builder:get-settings',
  UPDATE_SETTINGS: 'ai-site-builder:update-settings',

  // AI provider management
  GET_PROVIDERS: 'ai-site-builder:get-providers',
  SET_ACTIVE_PROVIDER: 'ai-site-builder:set-active-provider',
  VALIDATE_API_KEY: 'ai-site-builder:validate-api-key',

  // Google OAuth for Gemini (PKCE-only, no client secret)
  START_GOOGLE_OAUTH: 'ai-site-builder:start-google-oauth',
  GET_GOOGLE_OAUTH_STATUS: 'ai-site-builder:google-oauth-status',
  DISCONNECT_GOOGLE_OAUTH: 'ai-site-builder:google-oauth-disconnect',
  SET_GEMINI_AUTH_MODE: 'ai-site-builder:set-gemini-auth-mode',

  // AI conversation flow
  START_CONVERSATION: 'ai-site-builder:start-conversation',
  SEND_MESSAGE: 'ai-site-builder:send-message',
  GET_CONVERSATION_HISTORY: 'ai-site-builder:get-conversation-history',

  // Site scaffolding
  CREATE_SITE: 'ai-site-builder:create-site',
  GENERATE_STRUCTURE: 'ai-site-builder:generate-structure',
  APPLY_STRUCTURE: 'ai-site-builder:apply-structure',
  CLEAR_PROGRESS_TRACKING: 'ai-site-builder:clear-progress-tracking',

  // Figma integration (PAT-based, OAuth removed)
  CONNECT_FIGMA: 'ai-site-builder:connect-figma',
  ANALYZE_FIGMA: 'ai-site-builder:analyze-figma',
  SYNC_FIGMA: 'ai-site-builder:sync-figma',
  GET_FIGMA_TOKEN_STATUS: 'ai-site-builder:get-figma-token-status',

  // Project management
  GET_PROJECTS: 'ai-site-builder:get-projects',
  GET_PROJECT: 'ai-site-builder:get-project',
  UPDATE_PROJECT: 'ai-site-builder:update-project',

  // AI-enhanced wizard flow
  GET_DYNAMIC_OPTIONS: 'ai-site-builder:get-dynamic-options',
  GENERATE_HYBRID_STRUCTURE: 'ai-site-builder:generate-hybrid-structure',

  // Health checks
  GET_HEALTH_STATUS: 'ai-site-builder:get-health-status',
  CHECK_SERVICE_HEALTH: 'ai-site-builder:check-service-health',

  // Error recovery
  RETRY_LAST_OPERATION: 'ai-site-builder:retry-last-operation',
  CLEAR_ERROR_STATE: 'ai-site-builder:clear-error-state',
  GET_LAST_ERROR: 'ai-site-builder:get-last-error',

  // API Resilience
  GET_CIRCUIT_BREAKER_STATUS: 'ai-site-builder:get-circuit-breaker-status',
  GET_PERFORMANCE_METRICS: 'ai-site-builder:get-performance-metrics',
  CLEAR_CACHES: 'ai-site-builder:clear-caches',
  RESET_CIRCUIT_BREAKERS: 'ai-site-builder:reset-circuit-breakers',
} as const;

/**
 * Custom flow identifier
 * Must include 'create-site/' prefix to be under CreateSite component's route
 */
export const FLOW_NAME = 'create-site/ai-builder';

/**
 * Entry pathways for site creation
 */
export const ENTRY_PATHWAYS = {
  DESCRIBE: 'describe',
  FIGMA: 'figma',
  QUICK_SETUP: 'quick-setup',
  EXAMPLES: 'examples',
  IMPROVE_EXISTING: 'improve',
  // Test pathways (hidden unless Cmd/Ctrl held on Entry screen)
  TEST_QUICK_REVIEW: 'test-quick-review',
  TEST_QUICK_BUILD: 'test-quick-build',
} as const;

/**
 * Step keys for wizard
 */
export const STEPS = {
  ENTRY: 'ai-builder',
  QUESTIONS: 'ai-builder/questions',
  CONVERSATION: 'ai-builder/conversation',
  FIGMA_CONNECT: 'ai-builder/figma',
  REVIEW_STRUCTURE: 'ai-builder/review',
  BUILDING: 'ai-builder/building',
} as const;

/**
 * Route paths for wizard steps
 * Must be under /main/create-site/ for CreateSite component to handle them
 */
export const ROUTES = {
  BASE: '/main/create-site/ai-builder',
  ENTRY: '/main/create-site/ai-builder', // First step must match flow name
  QUESTIONS: '/main/create-site/ai-builder/questions', // Structured question wizard (default)
  CONVERSATION: '/main/create-site/ai-builder/conversation', // Chat mode (advanced)
  FIGMA_CONNECT: '/main/create-site/ai-builder/figma',
  REVIEW_STRUCTURE: '/main/create-site/ai-builder/review',
  BUILDING: '/main/create-site/ai-builder/building',
} as const;

/**
 * The Three Pillars of site architecture
 */
export const PILLARS = {
  CONTENT: 'content',
  DESIGN: 'design',
  FEATURES: 'features',
} as const;

/**
 * Settings keys for user configuration
 */
export const SETTINGS_KEYS = {
  CLAUDE_API_KEY: 'claudeApiKey',
  FIGMA_TOKEN: 'figmaToken',
  ACF_PRO_DETECTED: 'acfProDetected',
  SHOW_ADVANCED_OPTIONS: 'showAdvancedOptions',
} as const;

/**
 * AI conversation constants
 */
export const CONVERSATION = {
  MAX_QUESTIONS: 5,
  MIN_QUESTIONS: 1,
  TIMEOUT_MS: 30000, // 30 seconds per API call
} as const;

/**
 * Structured questions for the wizard flow
 * Each question gathers specific information about the site
 */
export const WIZARD_QUESTIONS = [
  {
    id: 1,
    key: 'siteName',
    question: 'Give your site a name',
    subtitle: 'This will be the name of your WordPress site.',
    type: 'text' as const,
    placeholder: 'My awesome site',
    required: true,
  },
  {
    id: 2,
    key: 'contentCreators',
    question: 'Who will create content for this site?',
    subtitle: 'This helps us determine if you need user registration and content moderation.',
    type: 'chips' as const,
    multiSelect: true,
    options: [
      { id: 'cc-just-me', label: 'Just me', value: 'just-me' },
      {
        id: 'cc-small-team',
        label: 'Small team (2-5 people)',
        value: 'small-team',
        recommended: true,
      },
      { id: 'cc-multiple-authors', label: 'Multiple authors', value: 'multiple-authors' },
      { id: 'cc-user-submitted', label: 'User-submitted content', value: 'user-submitted' },
      { id: 'cc-community', label: 'Community contributions', value: 'community' },
    ],
  },
  {
    id: 3,
    key: 'visitorActions',
    question: 'What will visitors be able to do on your site?',
    subtitle:
      "Describe the key actions and interactions visitors will have. We'll figure out the structure needed to support this.",
    type: 'chips' as const,
    multiSelect: true,
    options: [
      { id: 'va-read-content', label: 'Read content', value: 'read-content' },
      { id: 'va-search', label: 'Search', value: 'search' },
      { id: 'va-browse-category', label: 'Browse by category', value: 'browse-category' },
      { id: 'va-leave-comments', label: 'Leave comments', value: 'leave-comments' },
      { id: 'va-share-social', label: 'Share on social media', value: 'share-social' },
      { id: 'va-newsletter', label: 'Subscribe to newsletter', value: 'newsletter' },
      { id: 'va-user-account', label: 'Create user account', value: 'user-account' },
      { id: 'va-save-favorites', label: 'Save favorites', value: 'save-favorites' },
    ],
  },
  {
    id: 4,
    key: 'requiredPages',
    question: 'What pages do you know you need?',
    subtitle:
      "List any static pages beyond the homepage. We'll suggest additional pages in the next step.",
    type: 'chips' as const,
    multiSelect: true,
    options: [
      { id: 'rp-about', label: 'About', value: 'about' },
      { id: 'rp-contact', label: 'Contact', value: 'contact' },
      { id: 'rp-privacy-policy', label: 'Privacy Policy', value: 'privacy-policy' },
      { id: 'rp-faq', label: 'FAQ', value: 'faq' },
      { id: 'rp-terms-of-service', label: 'Terms of Service', value: 'terms-of-service' },
      { id: 'rp-blog', label: 'Blog', value: 'blog' },
    ],
  },
  {
    id: 5,
    key: 'homepageContent',
    question: 'What content do you want on your homepage?',
    subtitle:
      "Select what you want to feature. We'll create custom fields so you can update this content easily.",
    type: 'chips' as const,
    multiSelect: true,
    options: [
      { id: 'hc-hero-section', label: 'Hero section', value: 'hero-section' },
      { id: 'hc-featured-content', label: 'Featured content', value: 'featured-content' },
      {
        id: 'hc-category-showcase',
        label: 'Category showcase',
        value: 'category-showcase',
        recommended: true,
      },
      { id: 'hc-latest-additions', label: 'Latest additions', value: 'latest-additions' },
      { id: 'hc-about-section', label: 'About section', value: 'about-section' },
      { id: 'hc-testimonials', label: 'Testimonials or reviews', value: 'testimonials' },
      { id: 'hc-call-to-action', label: 'Call-to-action', value: 'call-to-action' },
      { id: 'hc-search-feature', label: 'Search feature', value: 'search-feature' },
    ],
  },
] as const;

/**
 * File paths for data storage
 */
export const DATA_PATHS = {
  PROJECTS: 'projects.json',
  SETTINGS: 'settings.json',
  CONVERSATIONS: 'conversations',
} as const;

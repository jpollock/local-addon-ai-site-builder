/**
 * Test Fixtures
 *
 * Provides reusable test data for consistent testing across the suite.
 */

import {
  Project,
  Conversation,
  SiteStructure,
  ConversationMessage,
} from '../../src/common/types';
import { GoogleOAuthTokens } from '../../src/common/ai-provider.types';

/**
 * Test API keys
 */
export const TEST_API_KEYS = {
  claude: 'sk-ant-test-key-12345',
  openai: 'sk-test-key-67890',
  gemini: 'test-gemini-key-abcde',
};

/**
 * Test OAuth tokens
 */
export const TEST_GOOGLE_OAUTH_TOKENS: GoogleOAuthTokens = {
  accessToken: 'ya29.test-access-token',
  refreshToken: 'test-refresh-token',
  expiresAt: Date.now() + 3600000, // 1 hour from now
  email: 'test@example.com',
  idToken: 'test-id-token',
};

// Note: Figma OAuth tokens removed - Figma now uses PAT only

/**
 * Test project
 */
export const TEST_PROJECT: Project = {
  id: 'test-project-123',
  name: 'Test Project',
  entryPathway: 'describe',
  status: 'planning',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/**
 * Test conversation
 */
export const TEST_CONVERSATION: Conversation = {
  id: 'test-conversation-456',
  projectId: 'test-project-123',
  messages: [
    {
      role: 'user',
      content: 'I want to build a recipe blog',
      timestamp: '2024-01-01T00:00:00.000Z',
    },
    {
      role: 'assistant',
      content: 'Great! Let me help you plan your recipe blog.',
      timestamp: '2024-01-01T00:01:00.000Z',
    },
  ],
  understanding: {
    purpose: 'Recipe blog for sharing cooking content',
    audience: 'Home cooks and food enthusiasts',
    confidence: 80,
  },
  questionsAsked: 1,
  completed: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/**
 * Test AI messages
 */
export const TEST_MESSAGES: ConversationMessage[] = [
  {
    role: 'user',
    content: 'Hello AI',
    timestamp: '2024-01-01T00:00:00.000Z',
  },
  {
    role: 'assistant',
    content: 'Hello! How can I help you?',
    timestamp: '2024-01-01T00:00:01.000Z',
  },
];

/**
 * Test site structure
 */
export const TEST_SITE_STRUCTURE: SiteStructure = {
  content: {
    status: 'ready',
    postTypes: [
      {
        name: 'Recipe',
        slug: 'recipe',
        description: 'Custom post type for recipes',
        fields: [
          {
            name: 'ingredients',
            label: 'Ingredients',
            type: 'textarea',
          },
        ],
      },
    ],
    pages: [
      {
        title: 'Home',
        slug: 'home',
        template: 'page',
      },
      {
        title: 'About',
        slug: 'about',
        template: 'page',
      },
    ],
    menus: [
      {
        name: 'Primary Menu',
        location: 'primary',
        items: [
          {
            title: 'Home',
            url: '/',
          },
          {
            title: 'About',
            url: '/about',
          },
        ],
      },
    ],
  },
  design: {
    status: 'ready',
    theme: {
      base: 'twentytwentyfive',
      childThemeName: 'test-theme',
      designTokens: {
        colors: {
          primary: '#51a351',
          secondary: '#2c3e50',
          text: '#333333',
          background: '#ffffff',
        },
        typography: {
          fontFamilies: ['Inter', 'Roboto'],
          fontSizes: {
            base: '16px',
            lg: '18px',
            xl: '24px',
          },
          fontWeights: {
            normal: 400,
            bold: 700,
          },
          lineHeights: {
            normal: '1.5',
            tight: '1.25',
          },
        },
        spacing: {
          sm: '8px',
          md: '16px',
          lg: '24px',
        },
        borderRadius: {
          sm: '4px',
          md: '8px',
          lg: '12px',
        },
      },
    },
  },
  features: {
    status: 'ready',
    plugins: [
      {
        slug: 'advanced-custom-fields',
        name: 'Advanced Custom Fields',
        reason: 'Required for custom content types and flexible content management',
        required: true,
        confidence: 95,
      },
    ],
  },
};

/**
 * Test Figma file data
 */
export const TEST_FIGMA_FILE = {
  name: 'Test Design',
  lastModified: '2024-01-01T00:00:00.000Z',
  thumbnailUrl: 'https://example.com/thumbnail.png',
  version: '1',
  document: {
    id: '0:0',
    name: 'Document',
    type: 'DOCUMENT',
    children: [
      {
        id: '1:1',
        name: 'Page 1',
        type: 'CANVAS',
        children: [],
      },
    ],
  },
};

/**
 * Test Figma analysis
 */
export const TEST_FIGMA_ANALYSIS = {
  fileKey: 'test-file-key',
  fileName: 'Test Design',
  pages: [
    {
      id: '1:1',
      name: 'Homepage',
      type: 'homepage' as const,
    },
  ],
  designTokens: {
    colors: {
      primary: '#51a351',
      secondary: '#2c3e50',
      text: '#333333',
      background: '#ffffff',
    },
    typography: {
      fontFamilies: ['Inter', 'Roboto'],
      fontSizes: {
        base: '16px',
        lg: '18px',
        xl: '24px',
      },
      fontWeights: {
        normal: 400,
        bold: 700,
      },
      lineHeights: {
        normal: '1.5',
        tight: '1.25',
      },
    },
    spacing: {
      sm: '8px',
      md: '16px',
      lg: '24px',
    },
    borderRadius: {
      sm: '4px',
      md: '8px',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },
  },
  components: [
    {
      id: 'comp-1',
      name: 'Button',
      description: 'Primary button component',
    },
  ],
};

/**
 * Create test project with custom data
 */
export function createTestProject(overrides?: Partial<Project>): Project {
  return {
    ...TEST_PROJECT,
    id: 'test-project-' + Date.now(),
    ...overrides,
  };
}

/**
 * Create test conversation with custom data
 */
export function createTestConversation(
  overrides?: Partial<Conversation>
): Conversation {
  return {
    ...TEST_CONVERSATION,
    id: 'test-conversation-' + Date.now(),
    ...overrides,
  };
}

/**
 * Create expired OAuth tokens for testing token refresh
 */
export function createExpiredGoogleTokens(): GoogleOAuthTokens {
  return {
    ...TEST_GOOGLE_OAUTH_TOKENS,
    expiresAt: Date.now() - 1000, // Expired 1 second ago
  };
}

// Note: createExpiredFigmaTokens removed - Figma now uses PAT only

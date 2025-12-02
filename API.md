# API Reference

Complete reference for the AI Site Builder addon's IPC channels and data types.

## Table of Contents

- [IPC Channels](#ipc-channels)
  - [Configuration & Settings](#configuration--settings)
  - [AI Provider Management](#ai-provider-management)
  - [OAuth Flows](#oauth-flows)
  - [AI Conversation](#ai-conversation)
  - [Site Scaffolding](#site-scaffolding)
  - [Figma Integration](#figma-integration)
  - [Project Management](#project-management)
  - [Health & Monitoring](#health--monitoring)
- [Data Types](#data-types)
- [Response Format](#response-format)
- [Rate Limits](#rate-limits)

---

## IPC Channels

All channels are prefixed with `ai-site-builder:` for namespacing.

### Configuration & Settings

#### `GET_SETTINGS`

Retrieves addon settings for a site.

```typescript
// Request
{ siteId: string }

// Response
{
  success: true,
  settings: {
    activeProvider: 'claude' | 'openai' | 'gemini',
    showAdvancedOptions: boolean,
    // ... other settings
  }
}
```

#### `UPDATE_SETTINGS`

Updates addon settings.

```typescript
// Request
{
  siteId: string,
  settings: Partial<Settings>
}

// Response
{ success: true }
```

---

### AI Provider Management

#### `GET_PROVIDERS`

Lists all AI providers and their configuration status.

```typescript
// Request
{}

// Response
{
  success: true,
  providers: [
    {
      id: 'claude',
      name: 'Claude (Anthropic)',
      hasApiKey: boolean,
      isActive: boolean
    },
    // ... other providers
  ]
}
```

#### `SET_ACTIVE_PROVIDER`

Sets the default AI provider.

```typescript
// Request
{
  provider: 'claude' | 'openai' | 'gemini';
}

// Response
{
  success: true;
}
```

#### `VALIDATE_API_KEY`

Validates an API key with the provider.

```typescript
// Request
{
  provider: 'claude' | 'openai' | 'gemini',
  apiKey: string
}

// Response
{
  success: true,
  valid: boolean,
  error?: string
}
```

---

### OAuth Flows

#### Google OAuth (Gemini)

| Channel                   | Description                            |
| ------------------------- | -------------------------------------- |
| `START_GOOGLE_OAUTH`      | Initiates OAuth flow, returns auth URL |
| `GET_GOOGLE_OAUTH_STATUS` | Checks if authenticated                |
| `DISCONNECT_GOOGLE_OAUTH` | Revokes OAuth tokens                   |
| `SET_GEMINI_AUTH_MODE`    | Switch between 'oauth' and 'apikey'    |

```typescript
// START_GOOGLE_OAUTH Response
{
  success: true,
  authUrl: string  // Open in browser
}

// GET_GOOGLE_OAUTH_STATUS Response
{
  success: true,
  authenticated: boolean,
  email?: string
}
```

#### Figma OAuth

| Channel                  | Description                        |
| ------------------------ | ---------------------------------- |
| `START_FIGMA_OAUTH`      | Initiates Figma OAuth              |
| `GET_FIGMA_OAUTH_STATUS` | Checks Figma auth status           |
| `DISCONNECT_FIGMA_OAUTH` | Revokes Figma tokens               |
| `SET_FIGMA_AUTH_MODE`    | Switch between 'oauth' and 'token' |

---

### AI Conversation

#### `START_CONVERSATION`

Starts a new AI conversation session.

```typescript
// Request
{
  siteId: string,
  initialContext?: {
    description?: string,
    figmaData?: FigmaAnalysis
  }
}

// Response
{
  success: true,
  conversationId: string,
  initialMessage: string
}
```

#### `SEND_MESSAGE`

Sends a message in an active conversation.

```typescript
// Request
{
  conversationId: string,
  message: string
}

// Response
{
  success: true,
  response: string,
  suggestions?: string[],
  structureReady?: boolean
}
```

#### `GET_CONVERSATION_HISTORY`

Retrieves conversation history.

```typescript
// Request
{ conversationId: string }

// Response
{
  success: true,
  messages: Array<{
    role: 'user' | 'assistant',
    content: string,
    timestamp: number
  }>
}
```

---

### Site Scaffolding

#### `CREATE_SITE`

Creates a new WordPress site with generated structure.

```typescript
// Request
{
  siteId: string,
  structure: SiteStructure
}

// Response
{
  success: true,
  created: {
    pages: string[],
    menus: string[],
    options: string[]
  }
}
```

#### `GENERATE_STRUCTURE`

Generates a site structure from conversation context.

```typescript
// Request
{
  conversationId: string,
  options?: {
    includeDesign: boolean,
    includeSEO: boolean
  }
}

// Response
{
  success: true,
  structure: SiteStructure
}
```

#### `APPLY_STRUCTURE`

Applies a structure to an existing WordPress site.

```typescript
// Request
{
  siteId: string,
  structure: SiteStructure,
  options?: {
    overwrite: boolean,
    dryRun: boolean
  }
}

// Response
{
  success: true,
  applied: {
    pages: number,
    menus: number,
    options: number
  },
  skipped?: string[]
}
```

#### `CLEAR_PROGRESS_TRACKING`

Clears build progress state.

```typescript
// Request
{
  siteId: string;
}

// Response
{
  success: true;
}
```

---

### Figma Integration

#### `CONNECT_FIGMA`

Connects a Figma file or frame.

```typescript
// Request
{
  url: string  // Figma file or frame URL
}

// Response
{
  success: true,
  fileId: string,
  fileName: string,
  nodeId?: string
}
```

#### `ANALYZE_FIGMA`

Analyzes a connected Figma design.

```typescript
// Request
{
  fileId: string,
  nodeId?: string
}

// Response
{
  success: true,
  analysis: {
    colors: ColorPalette,
    typography: TypographyScale,
    components: Component[],
    layout: LayoutInfo
  }
}
```

#### `SYNC_FIGMA`

Syncs Figma design tokens to site.

```typescript
// Request
{
  siteId: string,
  analysis: FigmaAnalysis
}

// Response
{
  success: true,
  synced: {
    colors: number,
    fonts: number,
    spacing: number
  }
}
```

#### `GET_FIGMA_TOKEN_STATUS`

Checks if Figma token is valid.

```typescript
// Response
{
  success: true,
  valid: boolean,
  expiresAt?: number
}
```

---

### Project Management

#### `GET_PROJECTS`

Lists all projects for a site.

```typescript
// Request
{ siteId: string }

// Response
{
  success: true,
  projects: Project[]
}
```

#### `GET_PROJECT`

Gets a specific project.

```typescript
// Request
{
  siteId: string,
  projectId: string
}

// Response
{
  success: true,
  project: Project
}
```

#### `UPDATE_PROJECT`

Updates a project.

```typescript
// Request
{
  siteId: string,
  projectId: string,
  updates: Partial<Project>
}

// Response
{ success: true }
```

---

### Health & Monitoring

#### `GET_HEALTH_STATUS`

Gets health status for all services.

```typescript
// Response
{
  success: true,
  health: {
    claude: HealthStatus,
    openai: HealthStatus,
    gemini: HealthStatus
  }
}
```

#### `CHECK_SERVICE_HEALTH`

Checks health of a specific service.

```typescript
// Request
{ service: 'claude' | 'openai' | 'gemini' }

// Response
{
  success: true,
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy',
    responseTime: number,
    lastCheck: number
  }
}
```

#### `GET_CIRCUIT_BREAKER_STATUS`

Gets circuit breaker states.

```typescript
// Response
{
  success: true,
  circuits: {
    [service: string]: {
      state: 'closed' | 'open' | 'half-open',
      failures: number,
      lastFailure?: number
    }
  }
}
```

#### `GET_PERFORMANCE_METRICS`

Gets performance metrics.

```typescript
// Response
{
  success: true,
  metrics: {
    requestCount: number,
    averageLatency: number,
    errorRate: number,
    cacheHitRate: number
  }
}
```

#### `CLEAR_CACHES`

Clears all caches.

```typescript
// Response
{
  success: true;
}
```

#### `RESET_CIRCUIT_BREAKERS`

Resets all circuit breakers to closed state.

```typescript
// Response
{
  success: true;
}
```

---

### Error Recovery

#### `RETRY_LAST_OPERATION`

Retries the last failed operation.

```typescript
// Response
{
  success: boolean,
  error?: string
}
```

#### `CLEAR_ERROR_STATE`

Clears stored error state.

```typescript
// Response
{
  success: true;
}
```

#### `GET_LAST_ERROR`

Gets the last error details.

```typescript
// Response
{
  success: true,
  error?: {
    message: string,
    code: string,
    timestamp: number,
    retryable: boolean
  }
}
```

---

## Data Types

### SiteStructure

```typescript
interface SiteStructure {
  pages: Page[];
  navigation: NavigationMenu[];
  designTokens?: DesignTokens;
  seoSettings?: SEOSettings;
}

interface Page {
  title: string;
  slug: string;
  template?: string;
  content?: ContentBlock[];
  meta?: PageMeta;
}

interface NavigationMenu {
  name: string;
  location: string;
  items: MenuItem[];
}

interface DesignTokens {
  colors: Record<string, string>;
  typography: TypographyScale;
  spacing: Record<string, string>;
}
```

### Provider Types

```typescript
type AIProvider = 'claude' | 'openai' | 'gemini';

interface ProviderConfig {
  id: AIProvider;
  name: string;
  hasApiKey: boolean;
  isActive: boolean;
  authMode?: 'apikey' | 'oauth';
}
```

### Health Types

```typescript
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

interface HealthData {
  status: HealthStatus;
  message?: string;
  lastCheck?: number;
  responseTime?: number;
  circuitState?: 'closed' | 'open' | 'half-open';
  failureCount?: number;
}
```

---

## Response Format

All IPC responses follow this pattern:

### Success

```typescript
{
  success: true,
  // ... response data
}
```

### Error

```typescript
{
  success: false,
  error: string,
  code?: string,  // Machine-readable error code
  retryable?: boolean
}
```

### Error Codes

| Code               | Description                   |
| ------------------ | ----------------------------- |
| `INVALID_API_KEY`  | API key is invalid or expired |
| `RATE_LIMITED`     | Too many requests             |
| `TIMEOUT`          | Request timed out             |
| `NETWORK_ERROR`    | Network connectivity issue    |
| `PROVIDER_ERROR`   | AI provider returned an error |
| `VALIDATION_ERROR` | Invalid request data          |
| `NOT_FOUND`        | Resource not found            |
| `CIRCUIT_OPEN`     | Circuit breaker is open       |

---

## Rate Limits

| Channel              | Limit | Window    |
| -------------------- | ----- | --------- |
| `SEND_MESSAGE`       | 20    | 1 minute  |
| `START_CONVERSATION` | 10    | 5 minutes |
| `CREATE_SITE`        | 5     | 5 minutes |
| `GENERATE_STRUCTURE` | 10    | 5 minutes |
| `APPLY_STRUCTURE`    | 5     | 5 minutes |
| OAuth operations     | 5     | 5 minutes |
| Read operations      | 60    | 1 minute  |

When rate limited, responses include:

```typescript
{
  success: false,
  error: "Rate limit exceeded",
  code: "RATE_LIMITED",
  retryAfter: 30  // seconds
}
```

---

## Usage Examples

### Renderer Process

```typescript
import { getElectron } from '../electron-context';
import { IPC_CHANNELS } from '../../common/constants';

async function getProviders() {
  const electron = getElectron();
  const response = await electron.ipcRenderer.invoke(IPC_CHANNELS.GET_PROVIDERS);

  if (response.success) {
    return response.providers;
  } else {
    throw new Error(response.error);
  }
}
```

### Main Process Handler

```typescript
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../common/constants';

ipcMain.handle(IPC_CHANNELS.GET_PROVIDERS, async () => {
  try {
    const providers = await getProviderList();
    return { success: true, providers };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

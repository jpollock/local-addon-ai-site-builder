# AI Site Builder Developer Guide

A comprehensive guide for developers working on or extending the AI Site Builder addon.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Key Concepts](#key-concepts)
- [IPC Communication](#ipc-communication)
- [AI Provider Integration](#ai-provider-integration)
- [Security Implementation](#security-implementation)
- [Testing Strategy](#testing-strategy)
- [Build and Release](#build-and-release)
- [Contributing Guidelines](#contributing-guidelines)

---

## Architecture Overview

### Electron Process Model

AI Site Builder runs within Local's Electron environment with two separate processes:

```
┌─────────────────────────────────────────────────────────────┐
│                        Local by Flywheel                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐      IPC      ┌──────────────────┐ │
│  │    Main Process     │◄────────────►│  Renderer Process │ │
│  │    (Node.js)        │              │  (Chromium/React) │ │
│  └─────────────────────┘              └──────────────────┘ │
│           │                                    │            │
│           ▼                                    ▼            │
│  • AI API calls                       • UI Components       │
│  • Secure storage                     • User interactions   │
│  • WordPress operations               • State management    │
│  • File system access                 • Navigation          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Main Process (`src/main/`)

The main process handles:

- **AI Provider Communication**: API calls to Claude, OpenAI, Gemini
- **Secure Storage**: Keychain integration via `keytar`
- **WordPress Operations**: WP-CLI commands, content creation
- **Settings Management**: Persistent configuration
- **IPC Handlers**: Responding to renderer requests

### Renderer Process (`src/renderer/`)

The renderer process handles:

- **UI Components**: React class components (no hooks!)
- **User Workflow**: Multi-step site building wizard
- **State Management**: Component state, settings sync
- **IPC Calls**: Requesting data/actions from main process

### Important Constraints

1. **React Class Components Only**: Local uses an older React version without hooks support
2. **No Direct Node.js in Renderer**: All system operations go through IPC
3. **CommonJS Modules**: TypeScript compiles to CommonJS (not ESM)

---

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Local by Flywheel 6.0+
- Git

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/jpollock/ai-site-builder.git
cd ai-site-builder

# Install dependencies
npm install

# Build the addon
npm run build

# Install to Local (creates symlink)
npm run install-addon
```

### Development Workflow

```bash
# Watch mode - rebuilds on changes
npm run watch

# In another terminal, restart Local to pick up changes
# (or use Local's "Reload Addons" if available)
```

### Useful Commands

| Command                    | Description                        |
| -------------------------- | ---------------------------------- |
| `npm run build`            | Production build                   |
| `npm run build:dev`        | Development build (no source maps) |
| `npm run watch`            | Watch mode for development         |
| `npm test`                 | Run all tests                      |
| `npm run test:watch`       | Tests in watch mode                |
| `npm run test:coverage`    | Tests with coverage report         |
| `npm run lint`             | Run ESLint                         |
| `npm run type-check`       | TypeScript type checking           |
| `npm run validate-release` | Pre-release validation             |

---

## Project Structure

```
ai-site-builder/
├── src/
│   ├── main/                    # Main process code
│   │   ├── index.ts             # Entry point, addon registration
│   │   ├── ipc-handlers.ts      # IPC handler registration
│   │   ├── ai-service.ts        # AI provider abstraction
│   │   ├── settings-manager.ts  # Settings persistence
│   │   ├── settings-manager-secure.ts  # Secure credential storage
│   │   ├── project-manager.ts   # Project state management
│   │   ├── structure-applicator.ts     # WordPress content creation
│   │   ├── wordpress-manager.ts # WP-CLI interactions
│   │   ├── google-oauth.ts      # Google OAuth flow
│   │   ├── figma-oauth.ts       # Figma OAuth flow
│   │   └── utils/               # Utility modules
│   │       ├── secure-storage.ts    # Keychain abstraction
│   │       ├── validators.ts        # Zod schemas
│   │       ├── rate-limiter.ts      # Request rate limiting
│   │       ├── circuit-breaker.ts   # Fault tolerance
│   │       ├── retry.ts             # Retry logic
│   │       ├── cache.ts             # Response caching
│   │       ├── audit-logger.ts      # Security logging
│   │       ├── prompt-sanitizer.ts  # Injection prevention
│   │       └── health-check.ts      # Provider health monitoring
│   │
│   ├── renderer/                # Renderer process code
│   │   ├── index.tsx            # Entry point, hook registration
│   │   ├── electron-context.ts  # Electron API access
│   │   └── components/          # React components
│   │       ├── EntryScreen.tsx       # Initial entry point
│   │       ├── QuestionScreen.tsx    # Guided questions
│   │       ├── ConversationScreen.tsx # AI conversation
│   │       ├── ReviewStructure.tsx   # Structure review
│   │       ├── BuildingScreen.tsx    # Build progress
│   │       ├── PreferencesPanel.tsx  # Settings UI
│   │       └── ...
│   │
│   ├── common/                  # Shared code
│   │   ├── constants.ts         # IPC channels, routes
│   │   ├── types.ts             # TypeScript interfaces
│   │   └── config.ts            # Configuration values
│   │
│   └── prompts/                 # AI prompt templates
│       ├── site-discovery.ts    # Site analysis prompts
│       └── dynamic-options.ts   # Option generation prompts
│
├── scripts/                     # Build and utility scripts
│   ├── create-entry-points.js   # Creates lib/main.js, lib/renderer.js
│   ├── install-addon.js         # Installs addon to Local
│   ├── package-addon.js         # Creates distribution package
│   └── validate-release.js      # Pre-release checks
│
├── tests/                       # Test files
│   ├── main/                    # Main process tests
│   ├── renderer/                # Renderer tests
│   └── __mocks__/               # Mock implementations
│
├── docs/                        # Documentation
├── plans/                       # Design documents
├── lib/                         # Compiled output (generated)
└── package.json
```

---

## Key Concepts

### Entry Points

Local expects two entry points defined in `package.json`:

```json
{
  "main": "lib/main.js",
  "renderer": "lib/renderer.js"
}
```

The `scripts/create-entry-points.js` generates wrapper files that export from the compiled index files.

### Addon Registration

**Main Process** (`src/main/index.ts`):

```typescript
export default function (context: any) {
  // Register IPC handlers
  registerIpcHandlers(context);

  // Initialize services
  initializeServices();
}
```

**Renderer Process** (`src/renderer/index.tsx`):

```typescript
export default function (context: any) {
  const { React, hooks } = context;

  // Register UI hooks
  hooks.addContent('routeAddSite', (props: any) => {
    // Return React component
  });
}
```

### React Class Components

Local's React version doesn't support hooks. Use class components:

```typescript
// ❌ WRONG - Hooks don't work
const MyComponent = () => {
  const [state, setState] = useState('');
  return <div>{state}</div>;
};

// ✅ CORRECT - Class component
class MyComponent extends React.Component<Props, State> {
  state = { value: '' };

  render() {
    return <div>{this.state.value}</div>;
  }
}
```

### Creating React Elements

Use `React.createElement` for JSX-free rendering:

```typescript
render() {
  return React.createElement(
    'div',
    { className: 'container', style: { padding: '20px' } },
    React.createElement('h1', null, 'Title'),
    React.createElement('p', null, this.state.message)
  );
}
```

---

## IPC Communication

### Defining Channels

All IPC channels are defined in `src/common/constants.ts`:

```typescript
export const IPC_CHANNELS = {
  GET_SETTINGS: 'ai-site-builder:get-settings',
  UPDATE_SETTINGS: 'ai-site-builder:update-settings',
  // ... more channels
} as const;
```

### Main Process Handler

Register handlers in `src/main/ipc-handlers.ts`:

```typescript
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../common/constants';

export function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async (event, data) => {
    try {
      // Validate input
      const validated = SettingsSchema.parse(data);

      // Perform operation
      const settings = await getSettings(validated.siteId);

      return { success: true, settings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
```

### Renderer Process Call

Call handlers from renderer components:

```typescript
import { getElectron } from '../electron-context';
import { IPC_CHANNELS } from '../../common/constants';

class MyComponent extends React.Component {
  async loadSettings() {
    const electron = getElectron();

    const response = await electron.ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS, {
      siteId: this.props.site.id,
    });

    if (response.success) {
      this.setState({ settings: response.settings });
    } else {
      this.setState({ error: response.error });
    }
  }
}
```

### Response Pattern

All IPC responses follow this pattern:

```typescript
// Success
{ success: true, data: any, ... }

// Error
{ success: false, error: string, code?: string }
```

---

## AI Provider Integration

### Provider Abstraction

The `AIService` class abstracts different AI providers:

```typescript
// src/main/ai-service.ts
class AIService {
  async sendMessage(provider: string, messages: Message[]): Promise<Response> {
    switch (provider) {
      case 'claude':
        return this.sendToClaude(messages);
      case 'openai':
        return this.sendToOpenAI(messages);
      case 'gemini':
        return this.sendToGemini(messages);
    }
  }
}
```

### Adding a New Provider

1. Add provider type to `src/common/types.ts`
2. Implement API calls in `src/main/ai-service.ts`
3. Add settings fields in `src/main/settings-manager.ts`
4. Add UI in `src/renderer/components/PreferencesPanel.tsx`
5. Update health checks in `src/main/utils/health-check.ts`

### Rate Limiting

Requests are rate-limited per channel:

```typescript
// src/main/utils/rate-limiter.ts
const RATE_LIMITS = {
  [IPC_CHANNELS.SEND_MESSAGE]: { requests: 20, windowMs: 60000 },
  [IPC_CHANNELS.START_CONVERSATION]: { requests: 10, windowMs: 300000 },
};
```

### Circuit Breaker

Protects against API failures:

```typescript
// src/main/utils/circuit-breaker.ts
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000,
});

const result = await circuitBreaker.execute(() => apiCall());
```

---

## Security Implementation

### Secure Storage

API keys are stored in the OS keychain via `keytar`:

```typescript
// src/main/utils/secure-storage.ts
import keytar from 'keytar';

const SERVICE_NAME = 'ai-site-builder';

export async function setSecret(key: string, value: string): Promise<void> {
  await keytar.setPassword(SERVICE_NAME, key, value);
}

export async function getSecret(key: string): Promise<string | null> {
  return keytar.getPassword(SERVICE_NAME, key);
}
```

### Fallback Encryption

When keytar is unavailable, encrypted file storage is used:

```typescript
// AES-256-GCM encryption with PBKDF2 key derivation
const key = crypto.pbkdf2Sync(machineId, salt, 100000, 32, 'sha256');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
```

### Input Validation

All inputs are validated with Zod schemas:

```typescript
// src/main/utils/validators.ts
export const ApiKeySchema = z
  .string()
  .min(1, 'API key cannot be empty')
  .max(500, 'API key too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid characters');
```

### Prompt Injection Prevention

User inputs are sanitized before including in AI prompts:

```typescript
// src/main/utils/prompt-sanitizer.ts
export function sanitizeUserInput(input: string): string {
  // Detect injection patterns
  if (containsInjectionPatterns(input)) {
    return wrapWithBoundaries(input);
  }
  return input;
}
```

### Audit Logging

Security-relevant events are logged:

```typescript
// src/main/utils/audit-logger.ts
auditLogger.log({
  event: 'API_KEY_STORED',
  provider: 'claude',
  timestamp: Date.now(),
});
```

---

## Testing Strategy

### Test Structure

```
tests/
├── main/
│   ├── ai-service.test.ts
│   ├── ipc-handlers.test.ts
│   └── utils/
│       ├── validators.test.ts
│       ├── rate-limiter.test.ts
│       └── secure-storage.test.ts
├── renderer/
│   └── components/
│       └── EntryScreen.test.tsx
└── __mocks__/
    ├── electron.ts
    └── keytar.ts
```

### Running Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Specific file
npm test -- src/main/utils/validators.test.ts
```

### Writing Tests

```typescript
// tests/main/utils/validators.test.ts
import { ApiKeySchema } from '../../../src/main/utils/validators';

describe('ApiKeySchema', () => {
  it('accepts valid API keys', () => {
    expect(() => ApiKeySchema.parse('sk-ant-valid123')).not.toThrow();
  });

  it('rejects empty keys', () => {
    expect(() => ApiKeySchema.parse('')).toThrow();
  });
});
```

### Mocking

Mock Electron and native modules:

```typescript
// tests/__mocks__/electron.ts
export const ipcMain = {
  handle: jest.fn(),
};

export const ipcRenderer = {
  invoke: jest.fn(),
};
```

### Coverage Requirements

Minimum 80% coverage for:

- Branches
- Functions
- Lines
- Statements

---

## Build and Release

### Build Process

```bash
# Clean previous build
npm run clean

# Compile TypeScript
tsc --sourceMap

# Create entry points
node scripts/create-entry-points.js
```

### Pre-Release Validation

```bash
npm run validate-release
```

Checks:

- Version consistency
- Required package.json fields
- Build outputs exist
- No sensitive data in code
- Dependencies are secure

### Creating a Release

1. Update version:

   ```bash
   npm version patch  # or minor/major
   ```

2. Push with tags:

   ```bash
   git push origin main --tags
   ```

3. GitHub Actions builds platform-specific artifacts

### Local Packaging

```bash
npm run package
# Creates: ai-site-builder-v0.1.0-darwin-x64.zip
```

---

## Contributing Guidelines

### Code Style

- TypeScript strict mode
- ESLint + Prettier formatting
- Conventional Commits for messages

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feat/my-feature`
3. Make changes with tests
4. Run checks: `npm run lint && npm test`
5. Commit with conventional format: `feat: add feature`
6. Push and create PR

### Commit Message Format

```
<type>: <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

### Adding Features

1. Discuss in an issue first
2. Update types in `src/common/types.ts`
3. Add IPC channel if needed
4. Implement main process logic
5. Add renderer UI
6. Write tests
7. Update documentation

### Security Considerations

- Never log API keys or tokens
- Validate all IPC inputs
- Sanitize user inputs for AI prompts
- Use secure storage for credentials
- Implement rate limiting for expensive operations

---

## Debugging

### Local Logs

```bash
# macOS
tail -f ~/Library/Logs/local-by-flywheel/main.log

# Windows
type %APPDATA%\Local\logs\main.log

# Linux
tail -f ~/.config/Local/logs/main.log
```

### Developer Tools

1. In Local: View → Developer → Developer Tools
2. Check Console for errors
3. Network tab for API calls
4. React DevTools for component inspection

### Common Issues

**"Cannot find module"**: Run `npm run build`

**"IPC handler not found"**: Check channel name matches exactly

**"React hooks error"**: Convert to class component

**"Keytar load failed"**: Native module needs rebuild for platform

---

## Resources

- [Local Addon Documentation](https://localwp.com/help-docs/)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Google AI Docs](https://ai.google.dev/docs)

---

Happy coding! 🛠️

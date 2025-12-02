# feat: Externalize AI System Prompts (Simplified)

## Overview

Move inline AI system prompts from `claude-service.ts` to dedicated files for better maintainability.

## Problem

- Two prompts hardcoded in `src/main/claude-service.ts`:
  1. `SYSTEM_PROMPT` (lines 28-60) - Static string, no variables
  2. Dynamic Options Prompt (lines 414-462) - Template with variables

## Solution

Two files, simple exports:

```
src/prompts/
├── site-discovery.ts     # SITE_DISCOVERY_PROMPT constant
└── dynamic-options.ts    # buildDynamicOptionsPrompt() function
```

## Implementation

### src/prompts/site-discovery.ts

```typescript
/**
 * System prompt for WordPress site discovery conversations
 */
export const SITE_DISCOVERY_PROMPT = `You are an expert WordPress consultant...`;
```

### src/prompts/dynamic-options.ts

```typescript
/**
 * Build the dynamic options prompt for wizard question enhancement
 */
export function buildDynamicOptionsPrompt(
  contextSummary: string,
  questionIndex: number,
  currentQuestion: { question: string; subtitle: string },
  baseOptionsText: string
): string {
  return `You are helping configure a WordPress site wizard...
## USER CONTEXT
${contextSummary}
...`;
}
```

### Usage in claude-service.ts

```typescript
import { SITE_DISCOVERY_PROMPT } from '../prompts/site-discovery';
import { buildDynamicOptionsPrompt } from '../prompts/dynamic-options';

// In startConversation/sendMessage:
system: SITE_DISCOVERY_PROMPT

// In getDynamicOptions:
const prompt = buildDynamicOptionsPrompt(contextSummary, questionIndex, currentQuestion, baseOptionsText);
```

## Acceptance Criteria

- [ ] Prompts moved to `src/prompts/` directory
- [ ] `claude-service.ts` imports from new location
- [ ] Build succeeds with no errors
- [ ] AI functionality unchanged

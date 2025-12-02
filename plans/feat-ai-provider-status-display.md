# feat: Display AI Provider Configuration Status in EntryScreen

## Overview

When no AI provider is configured, show a clear empty state in EntryScreen so users understand they need to configure a provider before proceeding.

## Problem Statement

Users who haven't configured an AI provider see the normal pathway selection UI but will encounter errors when trying to use AI features. There's no proactive guidance.

## Proposed Solution

Add a simple provider status check to EntryScreen. If no provider is configured, show an empty state with a button to open settings. No new components needed.

## Implementation

### File to Modify

`src/renderer/components/EntryScreen.tsx`

### Changes

1. Add provider status to component state
2. Check provider status on mount via existing IPC channel
3. Conditionally render empty state or normal UI

```typescript
// Add to State interface
interface State {
  // ... existing fields
  hasProvider: boolean;
  checkingProvider: boolean;
}

// Initialize in constructor
this.state = {
  // ... existing
  hasProvider: true,
  checkingProvider: true,
};

// Add to componentDidMount
async componentDidMount() {
  // Check provider status
  const electron = getElectron();
  const response = await electron.ipcRenderer.invoke(IPC_CHANNELS.GET_PROVIDERS);
  const hasConfigured = response.success &&
    response.providers.some((p: { hasApiKey: boolean }) => p.hasApiKey);
  this.setState({
    hasProvider: hasConfigured,
    checkingProvider: false
  });

  // ... existing componentDidMount code
}

// Add render method for empty state
renderNoProviderState() {
  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 40px',
      textAlign: 'center',
      minHeight: '400px',
    }
  },
    React.createElement('div', {
      style: { fontSize: '64px', marginBottom: '24px' }
    }, '🔑'),

    React.createElement('h2', {
      style: { fontSize: '24px', fontWeight: 600, color: '#333', marginBottom: '12px' }
    }, 'Configure an AI Provider to Get Started'),

    React.createElement('p', {
      style: { fontSize: '15px', color: '#666', marginBottom: '32px', maxWidth: '400px' }
    }, 'Choose Claude, OpenAI, or Gemini in Settings to enable AI-powered site generation.'),

    React.createElement('button', {
      onClick: () => this.navigateToSettings(),
      style: {
        padding: '14px 28px',
        backgroundColor: '#51a351',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
      }
    }, 'Open Settings')
  );
}

// Modify render() to check provider status first
render() {
  const { checkingProvider, hasProvider } = this.state;

  if (checkingProvider) {
    return React.createElement('div', {
      style: { padding: '40px', textAlign: 'center' }
    }, 'Loading...');
  }

  if (!hasProvider) {
    return this.renderNoProviderState();
  }

  // ... existing render code (pathway selection)
}
```

### Instructions for Settings

Local preferences cannot be navigated to programmatically. The empty state displays clear instructions:

```
To configure your AI provider:
Local → Preferences → AI Site Builder
```

This guides users through the standard menu path to access addon preferences.

## Acceptance Criteria

- [x] EntryScreen shows empty state when no provider has API key configured
- [x] Empty state displays: key icon, headline, description, clear instructions box
- [x] Instructions guide user to: Local → Preferences → AI Site Builder
- [x] Normal pathway selection UI shows when any provider is configured
- [x] No loading flicker - show loading state while checking

## Files Modified

| File | Changes |
|------|---------|
| `src/renderer/components/EntryScreen.tsx` | Add ~50 lines: state fields, provider check, empty state render |

## Why This Approach

Per reviewer feedback:
- **No new component**: EntryScreen is the only place needing this check
- **No QuestionScreen warning**: Users can't reach it without passing EntryScreen
- **No PreferencesPanel changes**: Already shows provider status adequately
- **Minimal code**: ~50 lines vs ~500+ in original plan

---

*Simplified plan: 2025-11-30*

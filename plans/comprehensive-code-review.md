# Comprehensive Code Review Plan

## Overview

This plan addresses performance, security, production readiness, and code complexity issues in the AI Site Builder addon. Based on analysis of 58 source files (~24K lines), we've identified critical areas requiring attention.

## Scope

- **Performance**: API timeouts, caching, circuit breakers, retry logic
- **Security**: API key storage, input validation, prompt injection, OAuth lifecycle
- **Production Readiness**: Error handling, logging, recovery, user feedback
- **Code Complexity**: Monolithic files, global state, test coverage

---

## Phase 1: Critical Security Fixes

### 1.1 Secure API Key Storage Migration

**Problem**: API keys may be stored in plain text config files.

**Tasks**:
- [ ] Audit current storage mechanism in `settings.ts` and `ai-settings.ts`
- [ ] Implement keytar integration for OS keychain storage
- [ ] Add encryption layer for fallback storage
- [ ] Create migration path for existing keys
- [ ] Add key rotation support

**Files**:
- `src/main/ai-settings.ts`
- `src/main/ipc-handlers.ts`

### 1.2 Input Validation Hardening

**Problem**: Insufficient validation on IPC boundaries allows malicious input.

**Tasks**:
- [ ] Add Zod schemas for all IPC handlers
- [ ] Implement sanitization for WordPress content injection
- [ ] Add path traversal checks for file operations
- [ ] Validate AI response content before WordPress injection
- [ ] Add rate limiting for API calls

**Files**:
- `src/main/ipc-handlers.ts`
- `src/common/validation.ts` (may need creation)

### 1.3 Prompt Injection Prevention

**Problem**: User input flows directly into AI prompts without sanitization.

**Tasks**:
- [ ] Create prompt sanitization utilities
- [ ] Implement content boundaries in prompts
- [ ] Add output validation for AI responses
- [ ] Create allowlist for WordPress operations

**Files**:
- `src/main/ai-providers/*.ts`
- `src/main/conversation-manager.ts`

---

## Phase 2: Production Stability

### 2.1 Error Handling Standardization

**Problem**: Inconsistent error handling across providers and IPC handlers.

**Tasks**:
- [ ] Implement UserFriendlyError consistently across all handlers
- [ ] Add error categorization (network, auth, rate-limit, etc.)
- [ ] Create error recovery workflows
- [ ] Add user-actionable error messages
- [ ] Implement error reporting/telemetry foundation

**Files**:
- `src/main/utils/error-messages.ts`
- `src/main/ipc-handlers.ts`
- `src/renderer/components/*.tsx`

### 2.2 OAuth Token Lifecycle Management

**Problem**: OAuth tokens not properly refreshed; expired tokens cause failures.

**Tasks**:
- [ ] Implement token refresh before expiration
- [ ] Add token validation on app startup
- [ ] Create re-authentication flow for expired refresh tokens
- [ ] Add token status monitoring in UI
- [ ] Handle OAuth revocation gracefully

**Files**:
- `src/main/ai-providers/gemini-provider.ts`
- `src/main/google-oauth.ts`
- `src/renderer/components/SettingsScreen.tsx`

### 2.3 WordPress Hook Reliability

**Problem**: WordPress hook execution can fail silently; no rollback mechanism.

**Tasks**:
- [ ] Add pre-flight checks before WordPress modifications
- [ ] Implement transaction-like patterns for multi-step operations
- [ ] Create backup/restore mechanism for site content
- [ ] Add operation verification after WordPress changes
- [ ] Implement retry logic for transient failures

**Files**:
- `src/main/wordpress-manager.ts`
- `src/main/ipc-handlers.ts`

---

## Phase 3: Performance Optimization

### 3.1 API Call Optimization

**Problem**: No caching for repeated operations; unnecessary API calls.

**Tasks**:
- [ ] Implement response caching for idempotent operations
- [ ] Add request deduplication for concurrent calls
- [ ] Optimize conversation context management
- [ ] Implement streaming for long operations
- [ ] Add request prioritization

**Files**:
- `src/main/utils/cache.ts`
- `src/main/conversation-manager.ts`
- `src/main/ai-providers/*.ts`

### 3.2 Circuit Breaker Enhancement

**Problem**: Circuit breaker exists but not consistently applied.

**Tasks**:
- [ ] Apply circuit breaker to all providers (not just Claude)
- [ ] Add circuit state visibility in UI
- [ ] Implement fallback providers
- [ ] Add health check endpoints
- [ ] Create alerting for circuit states

**Files**:
- `src/main/utils/circuit-breaker.ts`
- `src/main/ai-providers/openai-provider.ts`
- `src/main/ai-providers/gemini-provider.ts`

### 3.3 Timeout Optimization

**Problem**: Fixed timeouts don't account for operation complexity.

**Tasks**:
- [ ] Implement adaptive timeouts based on request size
- [ ] Add user-visible progress indicators
- [ ] Create timeout configuration per operation type
- [ ] Add graceful degradation for slow responses

**Files**:
- `src/main/utils/timeout.ts`
- `src/common/config.ts`

---

## Phase 4: Code Quality & Maintainability

### 4.1 IPC Handler Decomposition

**Problem**: `ipc-handlers.ts` is 1000+ lines; difficult to test and maintain.

**Tasks**:
- [ ] Split into domain-specific handler files
  - `ipc/settings-handlers.ts`
  - `ipc/ai-handlers.ts`
  - `ipc/wordpress-handlers.ts`
  - `ipc/figma-handlers.ts`
- [ ] Create handler registration pattern
- [ ] Add per-handler tests

**Files**:
- `src/main/ipc-handlers.ts` (decompose)
- `src/main/ipc/*.ts` (new)

### 4.2 State Management Refactoring

**Problem**: Global state scattered across files; difficult to track.

**Tasks**:
- [ ] Audit all global state (singleton managers, module-level variables)
- [ ] Implement centralized state management
- [ ] Add state persistence strategy
- [ ] Create state debugging utilities

**Files**:
- `src/main/conversation-manager.ts`
- `src/main/ai-settings.ts`
- `src/main/utils/*.ts`

### 4.3 Test Coverage Foundation

**Problem**: 0% test coverage; no safety net for refactoring.

**Tasks**:
- [ ] Set up Jest testing infrastructure
- [ ] Create mocks for Local API, Electron IPC
- [ ] Write tests for critical paths:
  - API key validation
  - Provider switching
  - Error handling
  - WordPress operations
- [ ] Add CI pipeline for tests

**Files**:
- `jest.config.js` (new)
- `tests/` (new directory)

---

## Phase 5: User Experience Improvements

### 5.1 Error Recovery UI

**Problem**: Errors show but users can't easily recover.

**Tasks**:
- [ ] Add "Retry" buttons for recoverable errors
- [ ] Show error context (what failed, why)
- [ ] Provide alternative actions
- [ ] Add error history/log viewer
- [ ] Implement "Report Issue" flow

**Files**:
- `src/renderer/components/ErrorDisplay.tsx` (may need creation)
- `src/renderer/components/*.tsx`

### 5.2 Progress & Status Visibility

**Problem**: Long operations lack visibility; users don't know status.

**Tasks**:
- [ ] Add operation progress indicators
- [ ] Show API call status in UI
- [ ] Display provider health status
- [ ] Add estimated completion times
- [ ] Show operation history

**Files**:
- `src/renderer/components/BuildProgressBar.tsx`
- `src/renderer/components/ReviewScreen.tsx`

---

## Implementation Priority

### Immediate (Week 1)
1. **1.2 Input Validation** - Security critical
2. **2.2 OAuth Token Lifecycle** - Breaking user flows
3. **2.1 Error Handling** - User experience critical

### Short-term (Week 2-3)
4. **1.1 Secure API Key Storage** - Security best practice
5. **2.3 WordPress Hook Reliability** - Data integrity
6. **3.2 Circuit Breaker Enhancement** - Stability

### Medium-term (Week 4+)
7. **4.1 IPC Handler Decomposition** - Maintainability
8. **4.3 Test Coverage** - Safety net for changes
9. **5.1 Error Recovery UI** - User experience

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| API key exposure | High | Medium | Keychain storage |
| OAuth token expiry | Medium | High | Proactive refresh |
| WordPress corruption | High | Low | Backup/restore |
| Provider outage | Medium | Medium | Circuit breaker |
| Data loss | High | Low | Auto-save, recovery |

---

## Success Metrics

- [ ] Zero API key exposure vectors
- [ ] 100% of IPC handlers validated
- [ ] OAuth refresh working without user intervention
- [ ] All errors have user-actionable messages
- [ ] 80%+ test coverage on critical paths
- [ ] Average API response time under 5s
- [ ] Zero silent failures in WordPress operations

---

## Notes

- All changes should maintain backward compatibility
- Existing settings migrations should be handled gracefully
- User-facing changes should include documentation updates
- Security changes should be reviewed before deployment

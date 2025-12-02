# WordPress Rollback Mechanism

## Overview

This document outlines the design for a WordPress rollback mechanism to ensure site content integrity during AI-assisted site building. The mechanism provides backup and restore capabilities for WordPress modifications.

## Problem Statement

Current WordPress modifications made during AI site building can fail silently, leaving the site in an inconsistent state. There is no way to:

- Rollback failed changes
- Restore previous content if AI generation produces undesired results
- Recover from partial failures during multi-step operations

## Proposed Solution

### 1. Pre-Operation Snapshots

Before any WordPress modification, create a lightweight snapshot:

```typescript
interface ContentSnapshot {
  id: string;
  timestamp: number;
  siteId: string;
  operationType: 'create_page' | 'update_content' | 'install_plugin' | 'theme_change';

  // What was changed
  affectedItems: {
    type: 'post' | 'page' | 'option' | 'plugin' | 'theme';
    id: number | string;
    previousState: any;
  }[];

  // Metadata
  conversationId?: string;
  projectId?: string;
}
```

### 2. Transaction-Like Patterns

Wrap multi-step operations in transaction boundaries:

```typescript
async function executeWithRollback<T>(
  operations: Operation[],
  site: Site
): Promise<TransactionResult<T>> {
  const snapshot = await createSnapshot(site, operations);

  try {
    for (const op of operations) {
      await executeOperation(op, site);
      await verifyOperation(op, site);
    }

    await commitTransaction(snapshot);
    return { success: true, data: result };
  } catch (error) {
    await rollbackToSnapshot(snapshot);
    return { success: false, error, rolledBack: true };
  }
}
```

### 3. Snapshot Storage Strategy

**Lightweight approach (recommended):**

- Store only changed data, not full database
- Use WordPress export for affected posts/pages
- Store option values before modification
- Keep only last N snapshots per site (default: 5)

**Storage location:**

- `~/.local-ai-site-builder/snapshots/{siteId}/`
- Clean up snapshots older than 7 days automatically

### 4. Implementation Phases

#### Phase 1: Core Infrastructure

- [ ] Create `SnapshotManager` class in `src/main/utils/snapshot-manager.ts`
- [ ] Implement `ContentSnapshot` type and serialization
- [ ] Add snapshot storage and cleanup logic
- [ ] Create rollback executor

#### Phase 2: WordPress Integration

- [ ] Hook into existing WordPress operations in `wordpress-manager.ts`
- [ ] Add pre-operation snapshot creation
- [ ] Implement post-operation verification
- [ ] Add rollback triggers on failure

#### Phase 3: UI Integration

- [ ] Add "Undo" button for recent operations
- [ ] Show rollback progress indicator
- [ ] Display snapshot history in site details
- [ ] Add manual restore option

#### Phase 4: Recovery Manager Enhancement

- [ ] Integrate with existing `RecoveryManager`
- [ ] Add snapshot-based recovery as fallback
- [ ] Implement automatic recovery suggestions

### 5. API Design

```typescript
// Snapshot Manager API
interface SnapshotManager {
  // Create snapshot before operation
  createSnapshot(site: Site, operations: Operation[]): Promise<ContentSnapshot>;

  // Rollback to a snapshot
  rollbackToSnapshot(snapshotId: string): Promise<RollbackResult>;

  // List available snapshots for a site
  listSnapshots(siteId: string): Promise<ContentSnapshot[]>;

  // Delete old snapshots
  cleanupSnapshots(siteId: string, keepCount?: number): Promise<void>;

  // Verify snapshot integrity
  verifySnapshot(snapshotId: string): Promise<boolean>;
}

// IPC Channels to add
IPC_CHANNELS = {
  // ... existing channels
  CREATE_SNAPSHOT: 'ai-site-builder:create-snapshot',
  LIST_SNAPSHOTS: 'ai-site-builder:list-snapshots',
  ROLLBACK_SNAPSHOT: 'ai-site-builder:rollback-snapshot',
  DELETE_SNAPSHOT: 'ai-site-builder:delete-snapshot',
};
```

### 6. WordPress Export/Import Strategy

For content rollback, use WP-CLI's built-in export/import:

```bash
# Export affected content
wp export --post__in=123,456 --output=/path/to/snapshot.xml

# Rollback (import with force update)
wp import /path/to/snapshot.xml --authors=skip
```

For options:

```bash
# Snapshot
wp option get theme_mods_theme-name --format=json > snapshot.json

# Restore
wp option update theme_mods_theme-name "$(cat snapshot.json)" --format=json
```

### 7. Error Handling

```typescript
enum RollbackError {
  SNAPSHOT_NOT_FOUND = 'SNAPSHOT_NOT_FOUND',
  SNAPSHOT_CORRUPT = 'SNAPSHOT_CORRUPT',
  SITE_NOT_RUNNING = 'SITE_NOT_RUNNING',
  PARTIAL_ROLLBACK = 'PARTIAL_ROLLBACK',
  WP_CLI_ERROR = 'WP_CLI_ERROR',
}

interface RollbackResult {
  success: boolean;
  error?: RollbackError;
  partiallyRestored?: string[]; // Items that were restored
  failedItems?: string[]; // Items that failed to restore
  message?: string;
}
```

### 8. Testing Strategy

- Unit tests for `SnapshotManager` with mocked WP-CLI
- Integration tests with real Local sites (in CI/CD)
- Manual testing scenarios:
  - Single page rollback
  - Multi-item rollback
  - Partial failure recovery
  - Snapshot cleanup verification

### 9. User Experience

**Automatic recovery:**
When an operation fails, prompt user:

> "The operation failed. Would you like to restore your site to its previous state?"
> [Restore] [Keep Current State] [View Details]

**Manual recovery:**
In site settings, add "Snapshots" section:

- List recent snapshots with timestamps
- "Restore" button for each snapshot
- "Delete" option for cleanup

### 10. Limitations and Considerations

1. **Database only**: Snapshots cover database content, not uploaded files
2. **Plugin state**: Plugin activation state is tracked, not plugin files
3. **Theme modifications**: Code changes to themes are not tracked
4. **Performance**: Large sites with many pages may have slower snapshots
5. **Storage**: Regular cleanup required to prevent disk bloat

### 11. Future Enhancements

- Full site backup integration with Local's backup feature
- Cloud storage for snapshots (optional)
- Diff view between current state and snapshot
- Selective restoration (choose which items to restore)

## Implementation Priority

This feature is recommended for implementation after core stability is achieved. It provides:

- Data safety for users
- Confidence in AI-generated content
- Recovery from unexpected failures

Estimated effort: 2-3 weeks for full implementation
Priority: Medium (safety feature, not blocking core functionality)

## Related Files

- `src/main/wordpress-manager.ts` - WordPress operations
- `src/main/utils/recovery-manager.ts` - Existing recovery infrastructure
- `src/main/ipc/wordpress-handlers.ts` - IPC handlers for WordPress operations

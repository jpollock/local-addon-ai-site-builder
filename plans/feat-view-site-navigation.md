# feat: Enable "View Site in Local" button to navigate to site info page

## Overview

At the end of site creation, the "View Site in Local" button currently shows an alert dialog. Replace this with actual navigation to the site's info page in Local.

## Problem Statement

The current implementation in `BuildingScreen.tsx:116-133` displays an alert asking users to manually find their site in the sidebar:

```typescript
handleViewSite = () => {
  // ...
  alert(
    `✅ Site created successfully!\n\nSite ID: ${siteId}\n\nYour site should now be visible in the Local sidebar. Click on it to view details.`
  );
};
```

This is poor UX - users expect the button to navigate them directly to the site.

## Proposed Solution

Replace the alert with React Router navigation using `history.replace()`:

```typescript
handleViewSite = () => {
  const { siteId } = this.props.siteSettings;

  if (!siteId) {
    console.error('[BuildingScreen] No siteId available');
    alert('Unable to locate site. Please check the sidebar.');
    return;
  }

  try {
    // Use replace() so back button doesn't return to completion screen
    this.props.history.replace(`/site-info/${siteId}/overview`);
  } catch (error) {
    console.error('[BuildingScreen] Navigation failed:', error);
    alert('Unable to navigate to site. Please find it in the sidebar.');
  }
};
```

## Acceptance Criteria

- [ ] Clicking "View Site in Local" navigates to `/site-info/${siteId}/overview`
- [ ] Alert dialog is removed (navigation is the feedback)
- [ ] Error handling shows fallback message if navigation fails
- [ ] Back button goes to previous wizard step, not completion screen (use `replace()`)

## Technical Considerations

- **URL Format**: `/site-info/${siteId}/overview` - consistent with Local's routing patterns
- **Navigation Method**: Use `history.replace()` instead of `push()` to prevent confusing back button behavior
- **Error Handling**: Wrap in try-catch with user-friendly fallback message

## Files to Modify

### `src/renderer/components/BuildingScreen.tsx`

**Lines 116-133** - Replace `handleViewSite` method:

```typescript
handleViewSite = () => {
  console.log('[BuildingScreen] User requested to view site');
  const { siteId } = this.props.siteSettings;

  if (!siteId) {
    console.error('[BuildingScreen] No siteId available');
    alert('Unable to locate site. Please check the sidebar.');
    return;
  }

  try {
    console.log('[BuildingScreen] Navigating to site:', siteId);
    this.props.history.replace(`/site-info/${siteId}/overview`);
  } catch (error) {
    console.error('[BuildingScreen] Navigation failed:', error);
    alert('Unable to navigate to site. Please find it in the sidebar.');
  }
};
```

## References

- Current implementation: `src/renderer/components/BuildingScreen.tsx:116-133`
- Button render location: `src/renderer/components/BuildingScreen.tsx:474-489`
- React Router pattern used elsewhere: `src/renderer/components/ReviewStructure.tsx:137`
- Local routing documentation: Kitchen Sink addon docs

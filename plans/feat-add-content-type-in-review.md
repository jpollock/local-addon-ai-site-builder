# feat: Add Content Type in Review Site Structure Page

## Overview

Add the ability for users to create new custom content types (WordPress post types) directly from the Review Site Structure page. This enables users to augment AI-generated structures with manual additions before site creation.

## Problem Statement / Motivation

Currently, the Review Structure page displays content types that were either:

1. AI-generated based on wizard answers
2. Imported from Figma analysis

Users cannot add new content types manually on this page. The "Add" button exists in the UI (`SectionDetail.tsx:143-167`) but the handler is a stub (`ReviewStructure.tsx:170-173`). This limits user control over their site's content architecture.

**User Need**: "I want to add a custom content type (like 'Portfolio Item' or 'Testimonial') that the AI didn't suggest, without going back through the wizard."

## Proposed Solution

Implement a modal-based "Add Content Type" form that:

1. Opens when user clicks "+ Add content type" button
2. Allows entry of content type name, slug, description, and custom fields
3. Validates input against WordPress requirements
4. Persists to project via existing `UPDATE_PROJECT` IPC channel
5. Updates the UI to show the new content type

### Design Decision: Modal vs Inline

**Chosen: Modal Dialog** because:

- Content types require 4+ fields (name, slug, description, fields array)
- Users need focused attention to define structure correctly
- This is a one-time setup task (fits wizard pattern)
- Validation is critical (duplicate slugs, WordPress reserved words)

## Technical Approach

### Files to Modify

| File                                              | Change                                        |
| ------------------------------------------------- | --------------------------------------------- |
| `src/renderer/components/ReviewStructure.tsx:170` | Implement `handleAdd('content-types')` method |
| `src/renderer/components/AddContentTypeModal.tsx` | **NEW** - Modal component for the form        |
| `src/common/types.ts`                             | Add `AddContentTypeFormData` interface        |
| `src/common/validation.ts`                        | Add content type validation schema            |

### Component Architecture

```
ReviewStructure
├── SectionNav (left panel)
├── SectionDetail (right panel)
│   └── "+ Add content type" button
│       └── onClick: handleAdd('content-types')
└── AddContentTypeModal (conditionally rendered)
    ├── Form fields (name, slug, description)
    ├── Field editor (add/remove custom fields)
    └── Action buttons (Cancel, Save)
```

### State Flow

```typescript
// ReviewStructure state
state = {
  structure: SiteStructure | null,
  showAddContentTypeModal: boolean, // NEW
  // ...
};

// handleAdd implementation
handleAdd = (sectionKey: string) => {
  if (sectionKey === 'content-types') {
    this.setState({ showAddContentTypeModal: true });
  }
};

// handleSaveContentType
handleSaveContentType = async (contentType: ContentType) => {
  const newPostTypes = [...this.state.structure.content.postTypes, contentType];
  const newStructure = {
    ...this.state.structure,
    content: {
      ...this.state.structure.content,
      postTypes: newPostTypes,
    },
  };

  // Persist via IPC
  await electron.ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PROJECT, {
    projectId: this.props.siteSettings.projectId,
    updates: { structure: newStructure },
  });

  // Update local state
  this.setState({
    structure: newStructure,
    showAddContentTypeModal: false,
  });
};
```

### ContentType Form Fields

| Field         | Type     | Required | Validation                                                                         |
| ------------- | -------- | -------- | ---------------------------------------------------------------------------------- |
| Name          | text     | Yes      | Min 2 chars, max 50 chars                                                          |
| Slug          | text     | Yes      | Auto-generated from name, lowercase, hyphens only, max 20 chars, no reserved words |
| Description   | textarea | No       | Max 200 chars                                                                      |
| Icon          | text     | No       | Single emoji character                                                             |
| Custom Fields | array    | No       | At least name + type per field                                                     |

### Slug Validation Rules

```typescript
const WORDPRESS_RESERVED_POST_TYPES = [
  'post',
  'page',
  'attachment',
  'revision',
  'nav_menu_item',
  'custom_css',
  'customize_changeset',
  'oembed_cache',
  'user_request',
  'wp_block',
  'wp_template',
  'wp_template_part',
  'wp_global_styles',
  'wp_navigation',
  'wp_font_family',
  'wp_font_face',
];

const slugValidation = {
  pattern: /^[a-z][a-z0-9-]*$/,
  maxLength: 20,
  reserved: WORDPRESS_RESERVED_POST_TYPES,
};
```

## Acceptance Criteria

### Functional Requirements

- [ ] Clicking "+ Add content type" opens modal dialog
- [ ] Modal contains form fields: name, slug, description, icon
- [ ] Slug auto-generates from name (editable)
- [ ] Form validates against WordPress slug requirements
- [ ] Duplicate slug detection against existing content types
- [ ] "Add Field" button allows adding custom fields
- [ ] Each field has: name, type (dropdown), label, required (checkbox)
- [ ] Cancel button closes modal without saving
- [ ] Save button persists content type via IPC
- [ ] New content type appears in list after save
- [ ] Error messages display for validation failures

### Non-Functional Requirements

- [ ] Modal is keyboard accessible (Escape to close, Tab navigation)
- [ ] Focus moves to first field when modal opens
- [ ] Focus returns to Add button when modal closes
- [ ] ARIA labels for screen reader support
- [ ] Loading state shown during IPC call
- [ ] Unsaved changes warning on close attempt

## Dependencies & Risks

### Dependencies

- Existing `UPDATE_PROJECT` IPC handler works correctly
- `ContentType` and `ContentField` interfaces in `types.ts`
- No new backend changes required

### Risks

| Risk                                | Mitigation                                            |
| ----------------------------------- | ----------------------------------------------------- |
| Invalid slugs could break WordPress | Strict client-side validation against WordPress rules |
| Duplicate content types             | Check existing postTypes array before save            |
| IPC failure loses user input        | Show error with retry option, don't close modal       |
| Long forms hard to validate         | Progressive disclosure, validate on blur              |

## Implementation Phases

### Phase 1: Basic Modal (MVP)

**Files**: `AddContentTypeModal.tsx`, `ReviewStructure.tsx`

- [ ] Create modal component with name, slug, description fields
- [ ] Implement slug auto-generation from name
- [ ] Add basic validation (required fields, slug format)
- [ ] Wire up handleAdd in ReviewStructure
- [ ] Implement save and cancel actions
- [ ] Update postTypes array and persist

### Phase 2: Custom Fields Editor

**Files**: `AddContentTypeModal.tsx`

- [ ] Add "Custom Fields" section to modal
- [ ] Implement "Add Field" button
- [ ] Create field row component (name, type dropdown, label, required)
- [ ] Support adding/removing multiple fields
- [ ] Validate field names are unique

### Phase 3: Polish & Accessibility

**Files**: `AddContentTypeModal.tsx`

- [ ] Add loading state during save
- [ ] Implement unsaved changes warning
- [ ] Add keyboard navigation (Escape, Tab)
- [ ] Add ARIA labels and roles
- [ ] Focus management (trap focus in modal)
- [ ] Success feedback (highlight new item)

## MVP Implementation

### AddContentTypeModal.tsx

```typescript
import * as React from 'react';
import { ContentType, ContentField } from '../../common/types';

interface Props {
  existingSlugs: string[];
  onSave: (contentType: ContentType) => void;
  onCancel: () => void;
}

interface State {
  name: string;
  slug: string;
  description: string;
  icon: string;
  fields: ContentField[];
  errors: { [key: string]: string };
  isSaving: boolean;
}

export class AddContentTypeModal extends React.Component<Props, State> {
  state: State = {
    name: '',
    slug: '',
    description: '',
    icon: '',
    fields: [],
    errors: {},
    isSaving: false,
  };

  handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = this.generateSlug(name);
    this.setState({ name, slug }, () => this.validateField('name'));
  };

  generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 20);
  };

  validateField = (fieldName: string) => {
    const errors = { ...this.state.errors };

    switch (fieldName) {
      case 'name':
        if (!this.state.name.trim()) {
          errors.name = 'Name is required';
        } else if (this.state.name.length < 2) {
          errors.name = 'Name must be at least 2 characters';
        } else {
          delete errors.name;
        }
        break;
      case 'slug':
        if (!this.state.slug.trim()) {
          errors.slug = 'Slug is required';
        } else if (!/^[a-z][a-z0-9-]*$/.test(this.state.slug)) {
          errors.slug =
            'Slug must start with a letter and contain only lowercase letters, numbers, and hyphens';
        } else if (this.props.existingSlugs.includes(this.state.slug)) {
          errors.slug = 'A content type with this slug already exists';
        } else {
          delete errors.slug;
        }
        break;
    }

    this.setState({ errors });
  };

  handleSave = () => {
    // Validate all fields
    this.validateField('name');
    this.validateField('slug');

    if (Object.keys(this.state.errors).length > 0) return;

    const contentType: ContentType = {
      name: this.state.name.trim(),
      slug: this.state.slug,
      description: this.state.description.trim() || undefined,
      icon: this.state.icon || undefined,
      fields: this.state.fields,
      supports: ['title', 'editor', 'thumbnail'],
    };

    this.setState({ isSaving: true });
    this.props.onSave(contentType);
  };

  render() {
    const { errors, isSaving } = this.state;
    const isValid = !errors.name && !errors.slug && this.state.name && this.state.slug;

    return React.createElement(
      'div',
      {
        className: 'modal-overlay',
        style: {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        },
      },
      React.createElement(
        'div',
        {
          className: 'modal-content',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': 'modal-title',
          style: {
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxHeight: '80vh',
            overflowY: 'auto',
          },
        },
        // Header
        React.createElement(
          'h2',
          {
            id: 'modal-title',
            style: { margin: '0 0 20px', fontSize: '20px', fontWeight: 600 },
          },
          'Add Content Type'
        ),

        // Form fields here...
        // ... (full implementation)

        // Footer
        React.createElement(
          'div',
          {
            style: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' },
          },
          React.createElement(
            'button',
            {
              onClick: this.props.onCancel,
              disabled: isSaving,
              style: {
                padding: '10px 20px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                background: '#fff',
                cursor: 'pointer',
              },
            },
            'Cancel'
          ),
          React.createElement(
            'button',
            {
              onClick: this.handleSave,
              disabled: !isValid || isSaving,
              style: {
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                background: isValid && !isSaving ? '#51a351' : '#ccc',
                color: '#fff',
                cursor: isValid && !isSaving ? 'pointer' : 'not-allowed',
              },
            },
            isSaving ? 'Saving...' : 'Save'
          )
        )
      )
    );
  }
}
```

### ReviewStructure.tsx changes

```typescript
// Add to state interface
showAddContentTypeModal: boolean;

// Add to initial state
showAddContentTypeModal: (false,
  // Implement handleAdd (line 170)
  (handleAdd = (sectionKey: string) => {
    if (sectionKey === 'content-types') {
      this.setState({ showAddContentTypeModal: true });
    }
  }));

// Add handleSaveContentType
handleSaveContentType = async (contentType: ContentType) => {
  const { structure } = this.state;
  if (!structure) return;

  const newPostTypes = [...(structure.content.postTypes || []), contentType];
  const newStructure = {
    ...structure,
    content: {
      ...structure.content,
      postTypes: newPostTypes,
    },
  };

  const electron = getElectron();
  try {
    await electron.ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PROJECT, {
      projectId: this.props.siteSettings?.projectId,
      updates: { structure: newStructure },
    });

    this.setState({
      structure: newStructure,
      showAddContentTypeModal: false,
    });
  } catch (error) {
    console.error('[ReviewStructure] Error saving content type:', error);
    // Keep modal open, show error
  }
};

// Add to render method (after SectionDetail)
this.state.showAddContentTypeModal &&
  React.createElement(AddContentTypeModal, {
    existingSlugs: this.state.structure?.content.postTypes?.map((pt) => pt.slug) || [],
    onSave: this.handleSaveContentType,
    onCancel: () => this.setState({ showAddContentTypeModal: false }),
  });
```

## References

### Internal References

- `src/renderer/components/ReviewStructure.tsx:170` - handleAdd stub
- `src/renderer/components/SectionDetail.tsx:143-167` - Add button rendering
- `src/renderer/components/ChipSelector.tsx:211-276` - Custom add pattern
- `src/common/types.ts:190-210` - ContentType and ContentField interfaces
- `src/main/ipc-handlers.ts:838-855` - UPDATE_PROJECT handler

### External References

- [WordPress Post Type Registration](https://developer.wordpress.org/reference/functions/register_post_type/)
- [WCAG 2.1 Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [React Class Component Forms](https://legacy.reactjs.org/docs/forms.html)

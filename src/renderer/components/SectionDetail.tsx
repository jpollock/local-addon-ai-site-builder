/**
 * SectionDetail - Right panel detail view for Review Structure screen
 *
 * Renders the full content for the selected section (Content Types, Pages, etc.)
 * with edit/delete/add capabilities.
 */

import * as React from 'react';
import { SiteStructure, ContentType, PluginRecommendation, Taxonomy } from '../../common/types';

export type SectionKey =
  | 'content-types'
  | 'pages'
  | 'taxonomies'
  | 'navigation'
  | 'design'
  | 'plugins';

interface SectionDetailProps {
  sectionKey: SectionKey;
  structure: SiteStructure;
  pages: { title: string; slug: string }[];
  onEdit?: (type: string, item: any) => void;
  onDelete?: (type: string, item: any) => void;
  onAdd?: (type: string) => void;
}

interface SectionConfig {
  title: string;
  subtitle: string;
  icon: string;
  addLabel?: string;
}

const SECTION_CONFIGS: Record<SectionKey, SectionConfig> = {
  'content-types': {
    title: 'Content Types',
    subtitle: 'Custom post types for organizing your content',
    icon: '📝',
    addLabel: 'Add content type',
  },
  pages: {
    title: 'Pages',
    subtitle: 'Static pages for your site',
    icon: '📄',
    addLabel: 'Add page',
  },
  taxonomies: {
    title: 'Taxonomies',
    subtitle: 'Categories and tags for organizing content',
    icon: '🏷️',
    addLabel: 'Add taxonomy',
  },
  navigation: {
    title: 'Navigation',
    subtitle: 'Menu structure for your site',
    icon: '🧭',
  },
  design: {
    title: 'Design & Theme',
    subtitle: 'Visual appearance and styling',
    icon: '🎨',
  },
  plugins: {
    title: 'Features & Plugins',
    subtitle: 'Recommended based on your content structure',
    icon: '🔌',
    addLabel: 'Add plugin',
  },
};

export class SectionDetail extends React.Component<SectionDetailProps> {
  render() {
    const { sectionKey, structure, pages, onAdd } = this.props;
    const config = SECTION_CONFIGS[sectionKey];

    return React.createElement(
      'div',
      {
        style: {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      },

      // Section header
      React.createElement(
        'div',
        {
          style: {
            padding: '24px 32px',
            borderBottom: '1px solid #f0f0f0',
            backgroundColor: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          },
        },

        // Title and subtitle
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '4px',
              },
            },
            React.createElement('span', { style: { fontSize: '24px' } }, config.icon),
            React.createElement(
              'h3',
              {
                style: {
                  margin: 0,
                  fontSize: '22px',
                  fontWeight: 600,
                  color: '#333',
                },
              },
              config.title
            )
          ),
          React.createElement(
            'p',
            {
              style: {
                margin: '0 0 0 36px',
                fontSize: '14px',
                color: '#666',
              },
            },
            config.subtitle
          )
        ),

        // Add button (if applicable)
        config.addLabel &&
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => onAdd && onAdd(sectionKey),
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                color: '#51a351',
                backgroundColor: 'transparent',
                border: '1px solid #51a351',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
              },
            },
            '+ ',
            config.addLabel
          )
      ),

      // Section content - CSS Grid for consistent 900px centered content
      React.createElement(
        'div',
        {
          style: {
            flex: 1,
            overflowY: 'auto',
            backgroundColor: '#fafafa',
            display: 'grid',
            gridTemplateColumns: 'minmax(32px, 1fr) minmax(0, 900px) minmax(32px, 1fr)',
            paddingTop: '24px',
            paddingBottom: '24px',
            boxSizing: 'border-box' as const,
          },
        },
        // Inner wrapper in center column
        React.createElement(
          'div',
          {
            style: {
              gridColumn: '2',
              display: 'flex',
              flexDirection: 'column',
            },
          },
          this.renderSectionContent(sectionKey, structure, pages)
        )
      )
    );
  }

  private renderSectionContent(
    sectionKey: SectionKey,
    structure: SiteStructure,
    pages: { title: string; slug: string }[]
  ) {
    switch (sectionKey) {
      case 'content-types':
        return this.renderContentTypes(structure.content.postTypes || []);
      case 'pages':
        return this.renderPages(pages);
      case 'taxonomies':
        return this.renderTaxonomies(structure.content.postTypes || []);
      case 'navigation':
        return this.renderNavigation(structure.content.menus || []);
      case 'design':
        return this.renderDesign(structure.design);
      case 'plugins':
        return this.renderPlugins(structure.features.plugins || []);
      default:
        return null;
    }
  }

  private renderContentTypes(postTypes: ContentType[]) {
    if (postTypes.length === 0) {
      return this.renderEmptyState('No content types defined', 'Add your first custom post type');
    }

    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          width: '100%',
        },
      },
      postTypes.map((pt, i) => this.renderContentTypeCard(pt, i))
    );
  }

  private renderContentTypeCard(postType: ContentType, index: number) {
    const { onEdit, onDelete } = this.props;
    const fieldCount = postType.fields?.length || 0;

    return React.createElement(
      'div',
      {
        key: index,
        style: {
          backgroundColor: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: '10px',
          padding: '20px',
          width: '100%',
          boxSizing: 'border-box' as const,
        },
      },

      // Header row
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '8px',
          },
        },
        React.createElement(
          'div',
          null,
          React.createElement(
            'h4',
            { style: { margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600 } },
            postType.name
          ),
          React.createElement(
            'div',
            { style: { fontSize: '13px', color: '#888' } },
            `Slug: ${postType.slug}`
          )
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', gap: '8px' } },
          this.renderActionButton('Edit', () => onEdit && onEdit('content-type', postType)),
          this.renderActionButton('Delete', () => onDelete && onDelete('content-type', postType), true)
        )
      ),

      // Description
      postType.description &&
        React.createElement(
          'p',
          { style: { margin: '8px 0', fontSize: '14px', color: '#666' } },
          postType.description
        ),

      // Fields section
      fieldCount > 0 &&
        React.createElement(
          'div',
          {
            style: {
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #eee',
            },
          },
          React.createElement(
            'div',
            {
              style: {
                fontSize: '13px',
                fontWeight: 600,
                color: '#666',
                marginBottom: '12px',
              },
            },
            `Custom Fields (${fieldCount})`
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
            ...(postType.fields || []).map((field, fi) =>
              React.createElement(
                'div',
                {
                  key: fi,
                  style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '6px',
                    fontSize: '13px',
                  },
                },
                React.createElement('span', { style: { fontWeight: 500 } }, field.label || field.name),
                React.createElement(
                  'span',
                  {
                    style: {
                      fontSize: '11px',
                      color: '#888',
                      backgroundColor: '#e0e0e0',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    },
                  },
                  field.type
                ),
                field.required &&
                  React.createElement(
                    'span',
                    { style: { fontSize: '10px', color: '#d32f2f', fontWeight: 600 } },
                    'Required'
                  )
              )
            )
          )
        )
    );
  }

  private renderPages(pages: { title: string; slug: string }[]) {
    if (pages.length === 0) {
      return this.renderEmptyState('No pages defined yet', 'Add pages for your site');
    }

    return React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' } },
      pages.map((page, i) => this.renderPageCard(page, i))
    );
  }

  private renderPageCard(page: { title: string; slug: string }, index: number) {
    const { onEdit, onDelete } = this.props;

    return React.createElement(
      'div',
      {
        key: index,
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 16px',
          backgroundColor: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: '8px',
          width: '100%',
          boxSizing: 'border-box' as const,
        },
      },
      React.createElement(
        'div',
        null,
        React.createElement('span', { style: { fontWeight: 500, fontSize: '14px' } }, page.title),
        React.createElement(
          'span',
          { style: { color: '#888', fontSize: '13px', marginLeft: '12px' } },
          `/${page.slug}`
        )
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', gap: '8px' } },
        this.renderActionButton('Edit', () => onEdit && onEdit('page', page)),
        this.renderActionButton('Remove', () => onDelete && onDelete('page', page), true)
      )
    );
  }

  private renderTaxonomies(postTypes: ContentType[]) {
    const allTaxonomies = postTypes.flatMap((pt) => pt.taxonomies || []);
    const uniqueTaxonomies = allTaxonomies.filter(
      (tax, index, self) => index === self.findIndex((t) => t.slug === tax.slug)
    );

    if (uniqueTaxonomies.length === 0) {
      return this.renderEmptyState('No custom taxonomies defined', 'Built-in categories and tags will be available');
    }

    return React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' } },
      uniqueTaxonomies.map((tax, i) => this.renderTaxonomyCard(tax, i))
    );
  }

  private renderTaxonomyCard(taxonomy: Taxonomy, index: number) {
    const { onDelete } = this.props;

    return React.createElement(
      'div',
      {
        key: index,
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 16px',
          backgroundColor: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: '8px',
          width: '100%',
          boxSizing: 'border-box' as const,
        },
      },
      React.createElement(
        'div',
        null,
        React.createElement('span', { style: { fontWeight: 500, fontSize: '14px' } }, taxonomy.name),
        React.createElement(
          'span',
          {
            style: {
              fontSize: '11px',
              color: '#666',
              backgroundColor: '#f0f0f0',
              padding: '2px 8px',
              borderRadius: '10px',
              marginLeft: '10px',
            },
          },
          taxonomy.hierarchical ? 'Hierarchical' : 'Flat'
        )
      ),
      this.renderActionButton('Remove', () => onDelete && onDelete('taxonomy', taxonomy), true)
    );
  }

  private renderNavigation(menus: any[]) {
    if (menus.length === 0) {
      return this.renderEmptyState(
        'Navigation will be created based on your pages',
        'Menus are auto-generated during site build'
      );
    }

    return React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' } },
      menus.map((menu, i) =>
        React.createElement(
          'div',
          {
            key: i,
            style: {
              padding: '16px 20px',
              backgroundColor: '#fff',
              border: '1px solid #e8e8e8',
              borderRadius: '8px',
              width: '100%',
              boxSizing: 'border-box' as const,
            },
          },
          React.createElement(
            'div',
            { style: { fontWeight: 600, fontSize: '15px', marginBottom: '8px' } },
            menu.name
          ),
          React.createElement(
            'div',
            { style: { fontSize: '13px', color: '#666', marginBottom: '8px' } },
            `Location: ${menu.location}`
          ),
          menu.items &&
            React.createElement(
              'div',
              { style: { fontSize: '13px', color: '#888' } },
              `${menu.items.length} menu items`
            )
        )
      )
    );
  }

  private renderDesign(design: any) {
    const theme = design?.theme;

    return React.createElement(
      'div',
      { style: { width: '100%' } },

      // Selected theme
      React.createElement(
        'div',
        {
          style: {
            padding: '20px',
            backgroundColor: '#e8f5e9',
            border: '2px solid #51a351',
            borderRadius: '10px',
            marginBottom: '20px',
            width: '100%',
            boxSizing: 'border-box' as const,
          },
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
          },
          React.createElement(
            'div',
            null,
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px',
                },
              },
              React.createElement('span', { style: { color: '#51a351', fontSize: '18px' } }, '✓'),
              React.createElement(
                'span',
                { style: { fontWeight: 600, fontSize: '16px' } },
                theme?.base === 'frost'
                  ? 'Child theme based on Frost WP'
                  : theme?.base === 'twentytwentyfive'
                  ? 'Child theme based on Twenty Twenty-Five'
                  : 'Custom theme with Figma design tokens'
              )
            ),
            React.createElement(
              'div',
              { style: { fontSize: '14px', color: '#666', marginLeft: '26px' } },
              'Block-based theme foundation'
            )
          ),
          React.createElement(
            'span',
            {
              style: {
                padding: '6px 14px',
                backgroundColor: '#fff',
                border: '1px solid #51a351',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#51a351',
                fontWeight: 500,
              },
            },
            'Selected'
          )
        )
      ),

      // What will be generated
      React.createElement(
        'div',
        null,
        React.createElement(
          'div',
          { style: { fontSize: '13px', fontWeight: 600, color: '#666', marginBottom: '12px' } },
          'What will be generated'
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', gap: '12px', flexWrap: 'wrap' } },
          this.renderFeatureChip('Responsive layouts'),
          this.renderFeatureChip('Custom color palette'),
          this.renderFeatureChip('Block editor support'),
          this.renderFeatureChip('Design tokens from Figma')
        )
      )
    );
  }

  private renderFeatureChip(label: string) {
    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 14px',
          backgroundColor: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: '6px',
          fontSize: '14px',
        },
      },
      React.createElement('span', { style: { color: '#51a351' } }, '✓'),
      label
    );
  }

  private renderPlugins(plugins: PluginRecommendation[]) {
    if (plugins.length === 0) {
      return this.renderEmptyState('No plugins recommended', 'Plugins will be suggested based on your needs');
    }

    return React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' } },
      plugins.map((plugin, i) => this.renderPluginCard(plugin, i))
    );
  }

  private renderPluginCard(plugin: PluginRecommendation, index: number) {
    const { onDelete } = this.props;

    return React.createElement(
      'div',
      {
        key: index,
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          backgroundColor: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: '10px',
          width: '100%',
          boxSizing: 'border-box' as const,
        },
      },
      React.createElement(
        'div',
        { style: { flex: 1 } },
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '4px',
            },
          },
          React.createElement('span', { style: { fontWeight: 600, fontSize: '15px' } }, plugin.name),
          plugin.required &&
            React.createElement(
              'span',
              {
                style: {
                  padding: '2px 8px',
                  backgroundColor: '#51a351',
                  color: '#fff',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 600,
                },
              },
              'Required'
            )
        ),
        React.createElement('div', { style: { fontSize: '13px', color: '#666' } }, plugin.reason)
      ),
      this.renderActionButton('Remove', () => onDelete && onDelete('plugin', plugin))
    );
  }

  private renderActionButton(label: string, onClick: () => void, isDanger = false) {
    return React.createElement(
      'button',
      {
        type: 'button',
        onClick,
        style: {
          padding: '6px 12px',
          fontSize: '12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: '#fff',
          cursor: 'pointer',
          color: isDanger ? '#d32f2f' : '#555',
        },
      },
      label
    );
  }

  private renderEmptyState(title: string, subtitle: string) {
    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          textAlign: 'center',
          color: '#666',
        },
      },
      React.createElement(
        'div',
        {
          style: {
            fontSize: '48px',
            marginBottom: '16px',
            opacity: 0.3,
          },
        },
        '📋'
      ),
      React.createElement(
        'div',
        { style: { fontSize: '16px', fontWeight: 500, marginBottom: '8px' } },
        title
      ),
      React.createElement('div', { style: { fontSize: '14px', color: '#888' } }, subtitle)
    );
  }
}

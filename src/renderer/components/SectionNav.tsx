/**
 * SectionNav - Left panel navigation for Review Structure screen
 *
 * Displays a compact list of all sections (Content Types, Pages, etc.)
 * with icons and counts for quick navigation.
 */

import * as React from 'react';

export interface SectionItem {
  key: string;
  icon: string;
  title: string;
  count?: number;
  hasIssues?: boolean;
}

interface SectionNavProps {
  sections: SectionItem[];
  selectedSection: string;
  onSelectSection: (sectionKey: string) => void;
}

export class SectionNav extends React.Component<SectionNavProps> {
  render() {
    const { sections, selectedSection, onSelectSection } = this.props;

    return React.createElement(
      'div',
      {
        style: {
          width: '260px',
          minWidth: '260px',
          borderRight: '1px solid #e0e0e0',
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column',
        },
      },

      // Section header
      React.createElement(
        'div',
        {
          style: {
            padding: '16px 20px',
            borderBottom: '1px solid #f0f0f0',
            fontSize: '12px',
            fontWeight: 600,
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          },
        },
        'Structure'
      ),

      // Section list
      React.createElement(
        'div',
        {
          style: {
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0',
          },
        },
        sections.map((section) =>
          this.renderSectionItem(section, selectedSection === section.key, onSelectSection)
        )
      )
    );
  }

  private renderSectionItem(
    section: SectionItem,
    isSelected: boolean,
    onSelect: (key: string) => void
  ) {
    return React.createElement(
      'button',
      {
        key: section.key,
        type: 'button',
        onClick: () => onSelect(section.key),
        style: {
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '12px 20px',
          border: 'none',
          backgroundColor: isSelected ? '#f0f7f0' : 'transparent',
          borderLeft: isSelected ? '3px solid #51a351' : '3px solid transparent',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.15s ease',
        },
        onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
          if (!isSelected) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8f8f8';
          }
        },
        onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
          if (!isSelected) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }
        },
      },

      // Icon
      React.createElement(
        'span',
        {
          style: {
            fontSize: '18px',
            marginRight: '12px',
            width: '24px',
            textAlign: 'center',
          },
        },
        section.icon
      ),

      // Title
      React.createElement(
        'span',
        {
          style: {
            flex: 1,
            fontSize: '14px',
            fontWeight: isSelected ? 600 : 500,
            color: isSelected ? '#333' : '#555',
          },
        },
        section.title
      ),

      // Count badge (if applicable)
      section.count !== undefined &&
        React.createElement(
          'span',
          {
            style: {
              padding: '2px 8px',
              backgroundColor: isSelected ? '#51a351' : '#e8e8e8',
              color: isSelected ? '#fff' : '#666',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              minWidth: '20px',
              textAlign: 'center',
            },
          },
          section.count
        ),

      // Issue indicator (if applicable)
      section.hasIssues &&
        React.createElement(
          'span',
          {
            style: {
              width: '8px',
              height: '8px',
              backgroundColor: '#d32f2f',
              borderRadius: '50%',
              marginLeft: '8px',
            },
            title: 'Has issues',
          }
        )
    );
  }
}

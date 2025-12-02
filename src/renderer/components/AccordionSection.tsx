/**
 * AccordionSection - Collapsible section for the Review screen
 * Shows a header with icon, title, count, and expand/collapse arrow
 */

import * as React from 'react';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  count?: number;
  defaultExpanded?: boolean;
  headerAction?: React.ReactNode;
  children?: React.ReactNode;
}

interface State {
  isExpanded: boolean;
}

export class AccordionSection extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      isExpanded: props.defaultExpanded !== false,
    };
  }

  toggleExpanded = () => {
    this.setState(prev => ({ isExpanded: !prev.isExpanded }));
  };

  render() {
    const { icon, title, subtitle, count, headerAction, children } = this.props;
    const { isExpanded } = this.state;

    return React.createElement(
      'div',
      {
        style: {
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e0e0e0',
          marginBottom: '16px',
          overflow: 'hidden',
        },
      },

      // Header
      React.createElement(
        'div',
        {
          onClick: this.toggleExpanded,
          style: {
            display: 'flex',
            alignItems: 'center',
            padding: '16px 20px',
            cursor: 'pointer',
            userSelect: 'none',
            backgroundColor: isExpanded ? '#fafafa' : '#ffffff',
            borderBottom: isExpanded ? '1px solid #e0e0e0' : 'none',
            transition: 'background-color 0.15s ease',
          },
        },

        // Expand/collapse arrow
        React.createElement(
          'div',
          {
            style: {
              marginRight: '12px',
              transition: 'transform 0.2s ease',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              color: '#666',
              fontSize: '12px',
            },
          },
          '\u25B6' // Right-pointing triangle
        ),

        // Icon
        React.createElement(
          'div',
          {
            style: {
              width: '36px',
              height: '36px',
              backgroundColor: '#f0f4f8',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '14px',
              fontSize: '18px',
            },
          },
          icon
        ),

        // Title and subtitle
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
              },
            },
            React.createElement(
              'h3',
              {
                style: {
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#333',
                },
              },
              title
            ),
            count !== undefined && React.createElement(
              'span',
              {
                style: {
                  backgroundColor: '#e8e8e8',
                  color: '#666',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 500,
                },
              },
              count
            )
          ),
          subtitle && React.createElement(
            'p',
            {
              style: {
                margin: '4px 0 0',
                fontSize: '13px',
                color: '#888',
              },
            },
            subtitle
          )
        ),

        // Header action (e.g., "+ Add" button) - stop propagation to prevent toggle
        headerAction && React.createElement(
          'div',
          {
            onClick: (e: React.MouseEvent) => e.stopPropagation(),
          },
          headerAction
        )
      ),

      // Content
      isExpanded && React.createElement(
        'div',
        {
          style: {
            padding: '20px',
          },
        },
        children
      )
    );
  }
}

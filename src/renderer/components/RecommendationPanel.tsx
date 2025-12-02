/**
 * RecommendationPanel - Right sidebar showing "Why we recommend this"
 * Displays bullet points explaining AI recommendations
 */

import * as React from 'react';
import { SiteStructure } from '../../common/types';

interface Props {
  structure: SiteStructure;
  siteName?: string;
}

export class RecommendationPanel extends React.Component<Props> {
  render() {
    return React.createElement(
      'div',
      {
        style: {
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          padding: '24px',
          height: 'fit-content',
          position: 'sticky',
          top: '24px',
        },
      },

      // Header
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
          },
        },
        React.createElement('span', { style: { fontSize: '20px' } }, '💡'),
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
          'Why we recommend this'
        )
      ),

      // Recommendations list
      React.createElement(
        'ul',
        {
          style: {
            margin: 0,
            padding: '0 0 0 20px',
            listStyleType: 'disc',
          },
        },
        ...this.getRecommendations().map((rec, index) =>
          React.createElement(
            'li',
            {
              key: index,
              style: {
                fontSize: '14px',
                color: '#555',
                marginBottom: '12px',
                lineHeight: '1.5',
              },
            },
            rec
          )
        )
      ),

      // Divider
      React.createElement('div', {
        style: {
          height: '1px',
          backgroundColor: '#e0e0e0',
          margin: '20px 0',
        },
      }),

      // "Can edit later" note
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
          },
        },
        React.createElement(
          'span',
          {
            style: {
              fontSize: '16px',
              flexShrink: 0,
            },
          },
          'ℹ️'
        ),
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            {
              style: {
                fontSize: '13px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '4px',
              },
            },
            'You can edit this later'
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: '12px',
                color: '#666',
                lineHeight: '1.4',
              },
            },
            'Everything here can be modified after your site is created. This is just a starting point.'
          )
        )
      ),

      // Estimated build time
      React.createElement(
        'div',
        {
          style: {
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#e8f5e9',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          },
        },
        React.createElement('span', { style: { fontSize: '18px' } }, '⏱️'),
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            {
              style: {
                fontSize: '14px',
                fontWeight: 600,
                color: '#2e7d32',
              },
            },
            'Estimated build time: 2-3 minutes'
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: '12px',
                color: '#4caf50',
              },
            },
            "We'll create the structure, install plugins, generate the theme, and set up one sample content item."
          )
        )
      )
    );
  }

  private getRecommendations(): string[] {
    const { structure } = this.props;
    const recommendations: string[] = [];

    // Content type recommendations
    const postTypes = structure.content.postTypes;
    if (postTypes.length > 0) {
      const typeNames = postTypes.map((pt) => pt.name).join(', ');
      recommendations.push(
        `We've identified ${postTypes.length} content type${postTypes.length > 1 ? 's' : ''} (${typeNames}) based on your site description.`
      );
    }

    // Field recommendations
    const totalFields = postTypes.reduce((sum, pt) => sum + (pt.fields?.length || 0), 0);
    if (totalFields > 0) {
      recommendations.push(
        `${totalFields} custom field${totalFields > 1 ? 's' : ''} configured to capture your unique content needs.`
      );
    }

    // Plugin recommendations
    const requiredPlugins = structure.features.plugins.filter((p) => p.required);
    if (requiredPlugins.length > 0) {
      recommendations.push(
        `${requiredPlugins.length} essential plugin${requiredPlugins.length > 1 ? 's' : ''} recommended for your site functionality.`
      );
    }

    // Theme recommendation
    if (structure.design.theme) {
      recommendations.push(
        `Using ${structure.design.theme.base} as the base theme - it's lightweight and fully compatible with block editing.`
      );
    }

    // Add generic recommendations if we have few
    if (recommendations.length < 3) {
      recommendations.push(
        'All configurations follow WordPress best practices and coding standards.'
      );
    }

    return recommendations;
  }
}

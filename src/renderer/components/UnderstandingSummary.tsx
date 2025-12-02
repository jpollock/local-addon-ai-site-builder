/**
 * UnderstandingSummary - Right panel showing accumulated answers
 * Displays what we understand so far based on user selections
 */

import * as React from 'react';
import { WizardAnswers } from '../../common/types';
import { WIZARD_QUESTIONS } from '../../common/constants';

interface Props {
  answers: WizardAnswers;
}

export class UnderstandingSummary extends React.Component<Props> {
  render() {
    const hasAnyAnswer = this.hasAnyAnswers();

    return React.createElement(
      'div',
      {
        style: {
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          padding: '24px',
          height: '100%',
        },
      },

      // Header with icon
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
        React.createElement(
          'span',
          {
            style: {
              fontSize: '20px',
            },
          },
          '✨'
        ),
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
          'What we understand'
        )
      ),

      // Content area
      hasAnyAnswer ? this.renderAnswers() : this.renderEmptyState()
    );
  }

  private hasAnyAnswers(): boolean {
    const { answers } = this.props;
    return Object.values(answers).some((value) => {
      if (Array.isArray(value)) return value.length > 0;
      return value && value.trim() !== '';
    });
  }

  private renderEmptyState() {
    return React.createElement(
      'p',
      {
        style: {
          color: '#666',
          fontSize: '14px',
          lineHeight: '1.6',
          margin: 0,
        },
      },
      'Your answers will appear here as you progress through the questions.'
    );
  }

  private renderAnswers() {
    const { answers } = this.props;

    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        },
      },

      // Site name
      answers.siteName && this.renderAnswerSection('Give your site a name', answers.siteName),

      // Content creators
      answers.contentCreators &&
        answers.contentCreators.length > 0 &&
        this.renderAnswerSection(
          'Who will create content for this site?',
          this.formatChipValues(answers.contentCreators)
        ),

      // Visitor actions
      answers.visitorActions &&
        answers.visitorActions.length > 0 &&
        this.renderAnswerSection(
          'What will visitors be able to do on your site?',
          this.formatChipValues(answers.visitorActions)
        ),

      // Required pages
      answers.requiredPages &&
        answers.requiredPages.length > 0 &&
        this.renderAnswerSection(
          'What pages do you know you need?',
          this.formatChipValues(answers.requiredPages)
        ),

      // Homepage content
      answers.homepageContent &&
        answers.homepageContent.length > 0 &&
        this.renderAnswerSection(
          'What content do you want on your homepage?',
          this.formatChipValues(answers.homepageContent)
        )
    );
  }

  private renderAnswerSection(question: string, answer: string) {
    return React.createElement(
      'div',
      { key: question },

      // Question label
      React.createElement(
        'div',
        {
          style: {
            fontSize: '12px',
            color: '#888',
            marginBottom: '4px',
          },
        },
        question
      ),

      // Answer value
      React.createElement(
        'div',
        {
          style: {
            fontSize: '14px',
            color: '#333',
            lineHeight: '1.5',
          },
        },
        answer
      )
    );
  }

  private formatChipValues(values: string[]): string {
    // Convert slug values to readable labels
    const formatted = values.map((value) => {
      // Find the label from WIZARD_QUESTIONS if possible
      for (const q of WIZARD_QUESTIONS) {
        if ('options' in q && q.options) {
          const option = q.options.find((o: { label: string; value: string }) => o.value === value);
          if (option) return option.label;
        }
      }
      // Fall back to converting slug to readable format
      return value.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    });

    return formatted.join(', ');
  }
}

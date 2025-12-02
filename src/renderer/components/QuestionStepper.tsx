/**
 * QuestionStepper - Horizontal stepper showing Question 1-5 progress
 * Displays current question with completed/active/pending states
 */

import * as React from 'react';
import { WIZARD_QUESTIONS } from '../../common/constants';

interface Props {
  currentQuestion: number; // 1-5
  totalQuestions?: number;
}

export class QuestionStepper extends React.Component<Props> {
  render() {
    const { currentQuestion, totalQuestions = WIZARD_QUESTIONS.length } = this.props;

    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px 0',
          gap: '8px',
        }
      },
      // Render each step
      ...Array.from({ length: totalQuestions }, (_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentQuestion;
        const isActive = stepNumber === currentQuestion;
        const isPending = stepNumber > currentQuestion;

        return React.createElement(
          React.Fragment,
          { key: stepNumber },

          // Step circle and label
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '100px',
              }
            },

            // Circle indicator
            React.createElement(
              'div',
              {
                style: {
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: isActive
                    ? '3px solid #51a351'
                    : isCompleted
                      ? '2px solid #51a351'
                      : '2px solid #e0e0e0',
                  backgroundColor: isCompleted
                    ? '#51a351'
                    : isActive
                      ? '#ffffff'
                      : '#ffffff',
                  color: isCompleted
                    ? '#ffffff'
                    : isActive
                      ? '#51a351'
                      : '#999999',
                  transition: 'all 0.2s ease',
                }
              },
              isCompleted
                ? React.createElement('span', null, '✓')
                : isActive
                  ? React.createElement(
                      'div',
                      {
                        style: {
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#51a351',
                        }
                      }
                    )
                  : null
            ),

            // Label
            React.createElement(
              'span',
              {
                style: {
                  marginTop: '8px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#333' : isPending ? '#999' : '#666',
                }
              },
              `Question ${stepNumber}`
            )
          ),

          // Connector line (except for last step)
          stepNumber < totalQuestions && React.createElement(
            'div',
            {
              style: {
                flex: '1',
                height: '2px',
                maxWidth: '60px',
                marginTop: '-20px', // Align with circles
                backgroundColor: isCompleted ? '#51a351' : '#e0e0e0',
                transition: 'background-color 0.2s ease',
              }
            }
          )
        );
      })
    );
  }
}

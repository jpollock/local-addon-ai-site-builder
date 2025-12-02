/**
 * CustomStepper - A stepper component that mimics Local's native stepper
 *
 * Since Local's CreateSite component doesn't properly manage stepper state
 * for custom flows, we implement our own stepper with proper active/done states.
 */

import * as React from 'react';
import { STEPS, ROUTES } from '../../common/constants';

// Step configuration for our flow
// Note: Questions and Conversation are both part of step 2
// Figma Connect is an optional path between Entry and Questions (step 1)
// The UI stepper shows 4 steps regardless of which sub-mode is active
const STEP_CONFIG = [
  { key: STEPS.ENTRY, path: ROUTES.ENTRY, name: 'Get Started', number: 1 },
  { key: STEPS.FIGMA_CONNECT, path: ROUTES.FIGMA_CONNECT, name: 'Get Started', number: 1 }, // Figma connect (same step as entry)
  { key: STEPS.QUESTIONS, path: ROUTES.QUESTIONS, name: 'Conversation', number: 2 }, // Questions mode (default)
  { key: STEPS.CONVERSATION, path: ROUTES.CONVERSATION, name: 'Conversation', number: 2 }, // Chat mode (advanced)
  { key: STEPS.REVIEW_STRUCTURE, path: ROUTES.REVIEW_STRUCTURE, name: 'Review', number: 3 },
  { key: STEPS.BUILDING, path: ROUTES.BUILDING, name: 'Building', number: 4 },
];

// Steps to show in the UI (deduplicated by number)
const DISPLAY_STEPS = [
  { name: 'Get Started', number: 1 },
  { name: 'Conversation', number: 2 },
  { name: 'Review', number: 3 },
  { name: 'Building', number: 4 },
];

interface CustomStepperProps {
  currentPath: string;
}

interface CustomStepperState {}

/**
 * Determines the current step NUMBER based on the path
 * Uses reverse order matching so more specific paths match first
 * e.g., '/ai-builder/conversation' matches before '/ai-builder'
 * Returns the step number (1-4) for display purposes
 */
function getCurrentStepNumber(currentPath: string): number {
  // Check from most specific (last) to least specific (first)
  for (let i = STEP_CONFIG.length - 1; i >= 0; i--) {
    if (currentPath.includes(STEP_CONFIG[i].path)) {
      return STEP_CONFIG[i].number;
    }
  }
  return 1;
}

/**
 * Custom Stepper component that properly shows step states
 */
export class CustomStepper extends React.Component<CustomStepperProps, CustomStepperState> {
  render() {
    const { currentPath } = this.props;
    const currentStepNumber = getCurrentStepNumber(currentPath);

    // Container styles - positioned at bottom of screen
    const containerStyle: React.CSSProperties = {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#fff',
      borderTop: '1px solid #e0e0e0',
      padding: '16px 40px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
    };

    // Stepper container
    const stepperStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0',
      maxWidth: '800px',
      width: '100%',
    };

    return React.createElement(
      'div',
      { style: containerStyle, className: 'CustomStepper' },
      React.createElement(
        'div',
        { style: stepperStyle },
        DISPLAY_STEPS.map((step, index) => {
          const isDone = step.number < currentStepNumber;
          const isActive = step.number === currentStepNumber;
          const isPending = step.number > currentStepNumber;

          return React.createElement(StepItem, {
            key: step.number,
            number: step.number,
            name: step.name,
            isDone,
            isActive,
            isPending,
            isLast: index === DISPLAY_STEPS.length - 1,
          });
        })
      )
    );
  }
}

interface StepItemProps {
  number: number;
  name: string;
  isDone: boolean;
  isActive: boolean;
  isPending: boolean;
  isLast: boolean;
}

/**
 * Individual step item component
 */
class StepItem extends React.Component<StepItemProps> {
  render() {
    const { number, name, isDone, isActive, isPending, isLast } = this.props;

    // Step container with connector line
    const stepContainerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      flex: isLast ? '0 0 auto' : '1 1 0',
    };

    // Circle styles based on state
    const circleStyle: React.CSSProperties = {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: 500,
      flexShrink: 0,
      transition: 'all 0.2s ease',
      ...(isDone && {
        backgroundColor: '#51bb7b', // Green for done
        color: '#fff',
        border: 'none',
      }),
      ...(isActive && {
        backgroundColor: '#fff',
        color: '#51bb7b',
        border: '2px solid #51bb7b',
      }),
      ...(isPending && {
        backgroundColor: '#fff',
        color: '#9e9e9e',
        border: '2px solid #e0e0e0',
      }),
    };

    // Label styles
    const labelStyle: React.CSSProperties = {
      marginLeft: '8px',
      fontSize: '13px',
      fontWeight: isActive ? 600 : 400,
      color: isPending ? '#9e9e9e' : '#333',
      whiteSpace: 'nowrap',
    };

    // Connector line styles
    const connectorStyle: React.CSSProperties = {
      flex: 1,
      height: '2px',
      marginLeft: '12px',
      marginRight: '12px',
      backgroundColor: isDone ? '#51bb7b' : '#e0e0e0',
      minWidth: '40px',
    };

    // Checkmark SVG for completed steps
    const checkmark = React.createElement(
      'svg',
      {
        width: '14',
        height: '14',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: '3',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
      React.createElement('polyline', { points: '20 6 9 17 4 12' })
    );

    return React.createElement(
      'div',
      { style: stepContainerStyle },
      // Circle with number or checkmark
      React.createElement('div', { style: circleStyle }, isDone ? checkmark : number),
      // Step label
      React.createElement('span', { style: labelStyle }, name),
      // Connector line (except for last step)
      !isLast && React.createElement('div', { style: connectorStyle })
    );
  }
}

export default CustomStepper;

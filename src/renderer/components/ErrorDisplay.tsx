/**
 * ErrorDisplay Component - Reusable error display with retry functionality
 *
 * Displays user-friendly errors with:
 * - Clear error message and title
 * - Suggested action for the user
 * - Retry button for retryable errors
 * - Dismiss button to clear the error
 * - Optional error details for debugging
 */

import * as React from 'react';

/**
 * Error category for styling
 */
export type ErrorCategory =
  | 'network'
  | 'auth'
  | 'validation'
  | 'timeout'
  | 'rate_limit'
  | 'api_error'
  | 'internal'
  | 'file_system'
  | 'oauth';

/**
 * Error display info
 */
export interface ErrorInfo {
  category?: ErrorCategory;
  title?: string;
  message: string;
  action?: string;
  code?: string;
  technical?: string;
  recoverable?: boolean;
  retryable?: boolean;
}

interface ErrorDisplayProps {
  error: ErrorInfo | string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'banner' | 'inline' | 'overlay';
  showDetails?: boolean;
}

interface ErrorDisplayState {
  showTechnicalDetails: boolean;
}

/**
 * Get icon for error category
 */
function getErrorIcon(category?: ErrorCategory): string {
  switch (category) {
    case 'network':
      return '🌐';
    case 'auth':
    case 'oauth':
      return '🔐';
    case 'timeout':
      return '⏱️';
    case 'rate_limit':
      return '⚡';
    case 'validation':
      return '⚠️';
    case 'file_system':
      return '📁';
    default:
      return '❌';
  }
}

/**
 * Get color for error category
 */
function getErrorColor(category?: ErrorCategory): string {
  switch (category) {
    case 'rate_limit':
      return '#ff9800'; // Orange - temporary issue
    case 'validation':
      return '#2196f3'; // Blue - user input issue
    case 'network':
    case 'timeout':
      return '#9c27b0'; // Purple - connectivity
    default:
      return '#f44336'; // Red - general error
  }
}

export class ErrorDisplay extends React.Component<ErrorDisplayProps, ErrorDisplayState> {
  state: ErrorDisplayState = {
    showTechnicalDetails: false,
  };

  normalizeError(): ErrorInfo {
    const { error } = this.props;
    if (typeof error === 'string') {
      return {
        message: error,
        retryable: true,
      };
    }
    return error;
  }

  toggleDetails = () => {
    this.setState((prev) => ({ showTechnicalDetails: !prev.showTechnicalDetails }));
  };

  render() {
    const { onRetry, onDismiss, variant = 'inline', showDetails = false } = this.props;
    const { showTechnicalDetails } = this.state;
    const error = this.normalizeError();

    const icon = getErrorIcon(error.category);
    const color = getErrorColor(error.category);

    // Styles based on variant
    const containerStyles: React.CSSProperties = {
      padding: '16px',
      borderRadius: '8px',
      backgroundColor: variant === 'overlay' ? 'rgba(0, 0, 0, 0.85)' : '#fff',
      border: `1px solid ${color}`,
      color: variant === 'overlay' ? '#fff' : '#333',
      ...(variant === 'banner' && {
        position: 'relative',
        marginBottom: '16px',
      }),
      ...(variant === 'overlay' && {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '500px',
        width: '90%',
        zIndex: 1000,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }),
    };

    return React.createElement(
      'div',
      {
        className: `error-display error-display--${variant}`,
        style: containerStyles,
        role: 'alert',
        'aria-live': 'polite',
      },

      // Header with icon and title
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          },
        },
        React.createElement('span', { style: { fontSize: '20px' } }, icon),
        React.createElement(
          'strong',
          {
            style: {
              fontSize: '16px',
              color: variant === 'overlay' ? '#fff' : color,
            },
          },
          error.title || 'Error'
        ),
        // Dismiss button
        onDismiss &&
          React.createElement(
            'button',
            {
              onClick: onDismiss,
              style: {
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: variant === 'overlay' ? '#aaa' : '#666',
                padding: '4px',
              },
              'aria-label': 'Dismiss error',
            },
            '×'
          )
      ),

      // Error message
      React.createElement(
        'p',
        {
          style: {
            margin: '0 0 8px 0',
            fontSize: '14px',
            lineHeight: '1.5',
          },
        },
        error.message
      ),

      // Suggested action
      error.action &&
        React.createElement(
          'p',
          {
            style: {
              margin: '0 0 12px 0',
              fontSize: '13px',
              color: variant === 'overlay' ? '#ccc' : '#666',
              fontStyle: 'italic',
            },
          },
          '💡 ',
          error.action
        ),

      // Error code badge
      error.code &&
        React.createElement(
          'span',
          {
            style: {
              display: 'inline-block',
              padding: '2px 8px',
              backgroundColor: variant === 'overlay' ? 'rgba(255,255,255,0.1)' : '#f5f5f5',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: variant === 'overlay' ? '#aaa' : '#666',
              marginBottom: '12px',
            },
          },
          'Code: ',
          error.code
        ),

      // Technical details (collapsible)
      showDetails &&
        error.technical &&
        React.createElement(
          'div',
          { style: { marginTop: '8px' } },
          React.createElement(
            'button',
            {
              onClick: this.toggleDetails,
              style: {
                background: 'none',
                border: 'none',
                color: variant === 'overlay' ? '#aaa' : '#666',
                cursor: 'pointer',
                fontSize: '12px',
                padding: 0,
                textDecoration: 'underline',
              },
            },
            showTechnicalDetails ? '▼ Hide details' : '▶ Show details'
          ),
          showTechnicalDetails &&
            React.createElement(
              'pre',
              {
                style: {
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: variant === 'overlay' ? 'rgba(0,0,0,0.3)' : '#f5f5f5',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '100px',
                  overflow: 'auto',
                },
              },
              error.technical
            )
        ),

      // Action buttons
      (onRetry || onDismiss) &&
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              gap: '8px',
              marginTop: '12px',
            },
          },
          // Retry button
          onRetry &&
            error.retryable !== false &&
            React.createElement(
              'button',
              {
                onClick: onRetry,
                style: {
                  padding: '8px 16px',
                  backgroundColor: '#51a351',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                },
              },
              '🔄 Retry'
            ),
          // Secondary dismiss button (if no dismiss in header)
          !onDismiss &&
            onRetry &&
            React.createElement(
              'button',
              {
                onClick: () => {
                  /* no-op dismiss handled by parent */
                },
                style: {
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: variant === 'overlay' ? '#aaa' : '#666',
                  border: `1px solid ${variant === 'overlay' ? '#555' : '#ccc'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                },
              },
              'Cancel'
            )
        )
    );
  }
}

/**
 * Overlay backdrop for overlay variant
 */
export class ErrorOverlayBackdrop extends React.Component<{
  visible: boolean;
  onClick?: () => void;
}> {
  render() {
    if (!this.props.visible) {
      return null;
    }

    return React.createElement('div', {
      onClick: this.props.onClick,
      style: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 999,
      },
    });
  }
}

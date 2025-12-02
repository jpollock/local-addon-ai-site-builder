/**
 * Conversation Screen - AI-powered site discovery through conversation
 *
 * Two-panel layout:
 * - Left: Chat interface with Claude
 * - Right: Progressive understanding display
 */

import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { IPC_CHANNELS, ROUTES } from '../../common/constants';
import { ConversationMessage, SiteUnderstanding } from '../../common/types';
import { getElectron } from '../electron-context';
import { CustomStepper } from './CustomStepper';
import { ErrorDisplay } from './ErrorDisplay';

interface Props extends RouteComponentProps {
  siteSettings: any;
  updateSiteSettings?: (settings: any) => void;
  context?: any; // Local renderer context (if available)
}

interface State {
  conversationId: string | null;
  messages: ConversationMessage[];
  understanding: SiteUnderstanding;
  currentInput: string;
  suggestions: string[];
  isLoading: boolean;
  error: string | null;
  completed: boolean;
}

export class ConversationScreen extends React.Component<Props, State> {
  private inputRef: React.RefObject<HTMLTextAreaElement>;
  private messagesEndRef: React.RefObject<HTMLDivElement>;

  constructor(props: Props) {
    super(props);
    this.inputRef = React.createRef();
    this.messagesEndRef = React.createRef();

    this.state = {
      conversationId: null,
      messages: [],
      understanding: {
        confidence: 0,
      },
      currentInput: '',
      suggestions: [],
      isLoading: true,
      error: null,
      completed: false,
    };
  }

  async componentDidMount() {
    // Start conversation when component mounts
    await this.startConversation();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    // Auto-scroll to bottom when new messages arrive
    if (prevState.messages.length !== this.state.messages.length) {
      this.scrollToBottom();
    }
  }

  scrollToBottom = () => {
    if (this.messagesEndRef.current) {
      this.messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  startConversation = async () => {
    try {
      this.setState({ isLoading: true, error: null });

      const { siteSettings } = this.props;

      // Create project first (generate ID)
      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get electron from stored context
      const electron = getElectron();

      const response = await electron.ipcRenderer.invoke(IPC_CHANNELS.START_CONVERSATION, {
        projectId,
        entryPathway: siteSettings.entryPathway || 'describe',
        initialMessage: siteSettings.initialDescription,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to start conversation');
      }

      // Add first question as a message
      const firstMessage: ConversationMessage = {
        role: 'assistant',
        content: response.firstQuestion,
        timestamp: new Date().toISOString(),
        suggestions: response.suggestions,
      };

      this.setState({
        conversationId: response.conversationId,
        messages: [firstMessage],
        suggestions: response.suggestions || [],
        isLoading: false,
      });

      // Store conversation ID in site settings
      if (this.props.updateSiteSettings) {
        this.props.updateSiteSettings({
          conversationId: response.conversationId,
          projectId,
        });
      }

      // Focus input
      if (this.inputRef.current) {
        this.inputRef.current.focus();
      }
    } catch (error: any) {
      console.error('[ConversationScreen] Error starting conversation:', error);
      this.setState({
        error: error.message || 'Failed to start conversation',
        isLoading: false,
      });
    }
  };

  /**
   * Retry the last failed operation
   */
  handleRetry = async () => {
    // Clear error and try again
    this.setState({ error: null });

    // If we don't have a conversation yet, restart
    if (!this.state.conversationId) {
      await this.startConversation();
    } else {
      // If we have a conversation, the error likely occurred during message send
      // Just clear the error - user can resend their message
      this.setState({ isLoading: false });
    }
  };

  handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ currentInput: e.target.value });
  };

  handleSendMessage = async (message?: string) => {
    const messageToSend = message || this.state.currentInput.trim();

    if (!messageToSend || !this.state.conversationId) {
      return;
    }

    try {
      // Add user message to UI immediately
      const userMessage: ConversationMessage = {
        role: 'user',
        content: messageToSend,
        timestamp: new Date().toISOString(),
      };

      this.setState({
        messages: [...this.state.messages, userMessage],
        currentInput: '',
        isLoading: true,
        suggestions: [],
      });

      // Send to Claude
      const electron = getElectron();

      const response = await electron.ipcRenderer.invoke(IPC_CHANNELS.SEND_MESSAGE, {
        conversationId: this.state.conversationId,
        message: messageToSend,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to send message');
      }

      // Add Claude's response
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
        suggestions: response.suggestions,
      };

      this.setState({
        messages: [...this.state.messages, userMessage, assistantMessage],
        understanding: response.understanding,
        suggestions: response.suggestions || [],
        completed: response.completed,
        isLoading: false,
      });

      // If conversation is completed, navigate to review screen
      if (response.completed && response.structure) {
        // Store structure in site settings
        if (this.props.updateSiteSettings) {
          this.props.updateSiteSettings({
            structure: response.structure,
          });
        }

        // Navigate to review after a brief delay
        setTimeout(() => {
          this.props.history.push(ROUTES.REVIEW_STRUCTURE);
        }, 2000);
      }

      // Focus input for next message
      if (this.inputRef.current && !response.completed) {
        this.inputRef.current.focus();
      }
    } catch (error: any) {
      console.error('[ConversationScreen] Error sending message:', error);
      this.setState({
        error: error.message || 'Failed to send message',
        isLoading: false,
      });
    }
  };

  handleSuggestionClick = (suggestion: string) => {
    this.handleSendMessage(suggestion);
  };

  handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSendMessage();
    }
  };

  render() {
    const { messages, currentInput, suggestions, isLoading, error, completed } = this.state;

    return React.createElement(
      'div',
      {
        className: 'AddSiteContent',
        style: {
          display: 'flex',
          flexDirection: 'row',
          height: '100%',
          width: '100%',
          overflow: 'hidden',
        },
      },

      // Error banner with retry (if any)
      error &&
        React.createElement(
          'div',
          {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
              padding: '8px',
            },
          },
          React.createElement(ErrorDisplay, {
            error: {
              message: error,
              title: 'Communication Error',
              action: 'Check your internet connection and try again.',
              retryable: true,
            },
            variant: 'banner',
            onRetry: this.handleRetry,
            onDismiss: () => this.setState({ error: null }),
          })
        ),

      // Left panel - Chat interface
      React.createElement(
        'div',
        {
          style: {
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minWidth: 0,
          },
        },

        // Chat header
        React.createElement(
          'div',
          {
            style: {
              padding: '24px',
              borderBottom: '1px solid #e0e0e0',
              backgroundColor: '#fafafa',
            },
          },
          React.createElement(
            'h2',
            { style: { margin: 0, fontSize: '24px', fontWeight: 600 } },
            'Tell me about your project'
          ),
          React.createElement(
            'p',
            { style: { margin: '8px 0 0', color: '#666', fontSize: '14px' } },
            "I'll ask a few questions to understand what you're building"
          )
        ),

        // Messages area
        React.createElement(
          'div',
          {
            style: {
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            },
          },
          ...messages.map((msg, index) => this.renderMessage(msg, index)),

          // Loading indicator
          isLoading &&
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#666',
                  fontSize: '14px',
                },
              },
              React.createElement('span', null, '●'),
              React.createElement('span', null, '●'),
              React.createElement('span', null, '●')
            ),

          // Scroll anchor
          React.createElement('div', { ref: this.messagesEndRef })
        ),

        // Suggestions (if any)
        suggestions.length > 0 &&
          React.createElement(
            'div',
            {
              style: {
                padding: '16px 24px',
                borderTop: '1px solid #e0e0e0',
                backgroundColor: '#fafafa',
              },
            },
            React.createElement(
              'div',
              { style: { fontSize: '12px', color: '#666', marginBottom: '8px' } },
              'Quick replies:'
            ),
            React.createElement(
              'div',
              { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
              ...suggestions.map((suggestion, index) =>
                React.createElement(
                  'button',
                  {
                    key: index,
                    onClick: () => this.handleSuggestionClick(suggestion),
                    disabled: isLoading || completed,
                    className: 'Button',
                    style: {
                      padding: '8px 16px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      border: '1px solid #e0e0e0',
                      borderRadius: '20px',
                      cursor: isLoading || completed ? 'not-allowed' : 'pointer',
                      opacity: isLoading || completed ? 0.5 : 1,
                    },
                  },
                  suggestion
                )
              )
            )
          ),

        // Input area
        React.createElement(
          'div',
          {
            style: {
              padding: '24px',
              borderTop: '1px solid #e0e0e0',
              backgroundColor: 'white',
            },
          },
          React.createElement(
            'div',
            { style: { display: 'flex', gap: '12px', alignItems: 'flex-end' } },
            React.createElement('textarea', {
              ref: this.inputRef,
              value: currentInput,
              onChange: this.handleInputChange,
              onKeyDown: this.handleKeyDown,
              placeholder: completed
                ? 'Conversation complete!'
                : 'Type your answer... (Enter to send, Shift+Enter for new line)',
              disabled: isLoading || completed,
              style: {
                flex: 1,
                minHeight: '60px',
                maxHeight: '120px',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                opacity: completed ? 0.5 : 1,
              },
            }),
            React.createElement(
              'button',
              {
                onClick: () => this.handleSendMessage(),
                disabled: !currentInput.trim() || isLoading || completed,
                className: 'Button Button--primary',
                style: {
                  padding: '12px 24px',
                  opacity: !currentInput.trim() || isLoading || completed ? 0.5 : 1,
                  cursor:
                    !currentInput.trim() || isLoading || completed ? 'not-allowed' : 'pointer',
                },
              },
              'Send'
            )
          )
        )
      ),

      // Right panel - Understanding display
      React.createElement(
        'div',
        {
          style: {
            flex: '0 0 350px',
            minWidth: '300px',
            maxWidth: '400px',
            padding: '24px',
            backgroundColor: '#fafafa',
            overflowY: 'auto',
            borderLeft: '1px solid #e0e0e0',
          },
        },
        this.renderUnderstandingPanel()
      ),

      // Custom stepper with proper state management
      React.createElement(CustomStepper, {
        currentPath: this.props.history.location.pathname,
      })
    );
  }

  private renderMessage(message: ConversationMessage, index: number) {
    const isUser = message.role === 'user';

    return React.createElement(
      'div',
      {
        key: index,
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          gap: '4px',
        },
      },

      // Message bubble
      React.createElement(
        'div',
        {
          style: {
            maxWidth: '80%',
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: isUser ? '#2196F3' : 'white',
            color: isUser ? 'white' : '#333',
            border: isUser ? 'none' : '1px solid #e0e0e0',
            fontSize: '14px',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
          },
        },
        message.content
      ),

      // Timestamp
      React.createElement(
        'div',
        {
          style: {
            fontSize: '11px',
            color: '#999',
            padding: '0 4px',
          },
        },
        new Date(message.timestamp).toLocaleTimeString()
      )
    );
  }

  private renderUnderstandingPanel() {
    const { understanding, completed } = this.state;

    return React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '24px' } },

      // Header
      React.createElement(
        'div',
        null,
        React.createElement(
          'h3',
          { style: { margin: 0, fontSize: '20px', fontWeight: 600, marginBottom: '8px' } },
          'What I understand so far'
        ),
        React.createElement(
          'p',
          { style: { margin: 0, color: '#666', fontSize: '14px' } },
          completed ? 'Ready to build your site!' : "I'm learning about your project as we talk"
        )
      ),

      // Confidence meter
      React.createElement(
        'div',
        null,
        React.createElement(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' } },
          React.createElement(
            'span',
            { style: { fontSize: '14px', fontWeight: 500 } },
            'Confidence'
          ),
          React.createElement(
            'span',
            { style: { fontSize: '14px', fontWeight: 600, color: '#2196F3' } },
            `${understanding.confidence}%`
          )
        ),
        React.createElement(
          'div',
          {
            style: {
              height: '8px',
              backgroundColor: '#e0e0e0',
              borderRadius: '4px',
              overflow: 'hidden',
            },
          },
          React.createElement('div', {
            style: {
              height: '100%',
              width: `${understanding.confidence}%`,
              backgroundColor: understanding.confidence >= 100 ? '#4CAF50' : '#2196F3',
              transition: 'width 0.3s ease',
            },
          })
        )
      ),

      // Purpose
      understanding.purpose &&
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            {
              style: {
                fontSize: '12px',
                fontWeight: 600,
                color: '#666',
                marginBottom: '4px',
                textTransform: 'uppercase',
              },
            },
            'Purpose'
          ),
          React.createElement('div', { style: { fontSize: '14px' } }, understanding.purpose)
        ),

      // Audience
      understanding.audience &&
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            {
              style: {
                fontSize: '12px',
                fontWeight: 600,
                color: '#666',
                marginBottom: '4px',
                textTransform: 'uppercase',
              },
            },
            'Audience'
          ),
          React.createElement('div', { style: { fontSize: '14px' } }, understanding.audience)
        ),

      // Content Types
      understanding.contentTypes &&
        understanding.contentTypes.length > 0 &&
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            {
              style: {
                fontSize: '12px',
                fontWeight: 600,
                color: '#666',
                marginBottom: '8px',
                textTransform: 'uppercase',
              },
            },
            'Content Types'
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
            ...understanding.contentTypes.map((ct, index) =>
              React.createElement(
                'div',
                {
                  key: index,
                  style: {
                    padding: '12px',
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                  },
                },
                React.createElement(
                  'div',
                  { style: { fontWeight: 600, fontSize: '14px', marginBottom: '4px' } },
                  ct.name
                ),
                ct.description &&
                  React.createElement(
                    'div',
                    { style: { fontSize: '12px', color: '#666' } },
                    ct.description
                  )
              )
            )
          )
        ),

      // Features
      understanding.features &&
        understanding.features.length > 0 &&
        React.createElement(
          'div',
          null,
          React.createElement(
            'div',
            {
              style: {
                fontSize: '12px',
                fontWeight: 600,
                color: '#666',
                marginBottom: '8px',
                textTransform: 'uppercase',
              },
            },
            'Features'
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
            ...understanding.features.map((feature, index) =>
              React.createElement(
                'div',
                {
                  key: index,
                  style: {
                    padding: '6px 12px',
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '16px',
                    fontSize: '12px',
                  },
                },
                feature
              )
            )
          )
        ),

      // Completion message
      completed &&
        React.createElement(
          'div',
          {
            style: {
              padding: '16px',
              backgroundColor: '#e8f5e9',
              border: '1px solid #4CAF50',
              borderRadius: '8px',
              marginTop: '16px',
            },
          },
          React.createElement(
            'div',
            { style: { fontWeight: 600, color: '#2e7d32', marginBottom: '4px' } },
            '✓ Ready to build!'
          ),
          React.createElement(
            'div',
            { style: { fontSize: '14px', color: '#2e7d32' } },
            'I have everything I need. Redirecting to review...'
          )
        )
    );
  }
}

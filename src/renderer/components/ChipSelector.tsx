/**
 * ChipSelector - Multi-select chip UI component
 * Displays options as clickable chips with selected/unselected states
 *
 * AI Enhancement: Supports EnhancedChipOption with:
 * - source: 'base' | 'ai' for visual differentiation
 * - contextHint: Tooltip text for each option
 * - recommended: Shows star indicator
 */

import * as React from 'react';
import { ChipOption, EnhancedChipOption } from '../../common/types';

// Union type for both base and enhanced options
type OptionType = ChipOption | EnhancedChipOption;

interface Props {
  options: readonly OptionType[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiSelect?: boolean;
  contextHint?: string;
}

interface State {
  customValue: string;
  showCustomInput: boolean;
}

export class ChipSelector extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      customValue: '',
      showCustomInput: false,
    };
  }

  handleChipClick = (value: string) => {
    const { selected, onChange, multiSelect = true } = this.props;

    if (multiSelect) {
      // Toggle selection
      if (selected.includes(value)) {
        onChange(selected.filter((v) => v !== value));
      } else {
        onChange([...selected, value]);
      }
    } else {
      // Single select - replace selection
      onChange([value]);
    }
  };

  handleCustomSubmit = () => {
    const { customValue } = this.state;
    const { selected, onChange } = this.props;

    if (customValue.trim()) {
      const newValue = customValue.trim().toLowerCase().replace(/\s+/g, '-');
      if (!selected.includes(newValue)) {
        onChange([...selected, newValue]);
      }
      this.setState({ customValue: '', showCustomInput: false });
    }
  };

  handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.handleCustomSubmit();
    } else if (e.key === 'Escape') {
      this.setState({ customValue: '', showCustomInput: false });
    }
  };

  render() {
    const { options, selected, contextHint } = this.props;
    const { showCustomInput, customValue } = this.state;

    return React.createElement(
      'div',
      { style: { width: '100%' } },

      // Context hint
      contextHint &&
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              color: '#51a351',
              fontSize: '14px',
            },
          },
          React.createElement('span', { style: { fontSize: '16px' } }, '✨'),
          contextHint
        ),

      // Chips container
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
          },
        },

        // Render option chips
        ...options.map((option) => {
          const isAiOption = 'source' in option && option.source === 'ai';
          const isSelected = selected.includes(option.value);
          const hasHint = 'contextHint' in option && option.contextHint;

          return React.createElement(
            'button',
            {
              key: option.value,
              type: 'button',
              onClick: () => this.handleChipClick(option.value),
              title: hasHint ? option.contextHint : undefined,
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                // AI options have dashed border when unselected
                border: isSelected
                  ? '2px solid #51a351'
                  : isAiOption
                    ? '2px dashed #8b5cf6' // Purple dashed for AI options
                    : '2px solid #e0e0e0',
                backgroundColor: isSelected
                  ? '#51a351'
                  : isAiOption
                    ? '#faf5ff' // Light purple background for AI options
                    : '#ffffff',
                color: isSelected
                  ? '#ffffff'
                  : isAiOption
                    ? '#6b21a8' // Purple text for AI options
                    : '#333333',
                position: 'relative' as const,
              },
            },
            // Sparkle icon for AI-suggested options (when not selected)
            isAiOption &&
              !isSelected &&
              React.createElement(
                'span',
                {
                  style: {
                    fontSize: '12px',
                    marginRight: '-2px',
                  },
                  title: 'AI suggestion based on your context',
                },
                '✨'
              ),
            // Checkmark for selected items
            isSelected && React.createElement('span', { style: { fontSize: '14px' } }, '✓'),
            // Plus sign for unselected base items (not AI)
            !isSelected &&
              !isAiOption &&
              React.createElement('span', { style: { fontSize: '14px', color: '#999' } }, '+'),
            option.label,
            // Star indicator for recommended options
            option.recommended &&
              !isSelected &&
              React.createElement(
                'span',
                {
                  style: {
                    marginLeft: '4px',
                    color: isAiOption ? '#8b5cf6' : '#ffc107',
                    fontSize: '14px',
                  },
                  title: 'Recommended',
                },
                '★'
              ),
            // Info icon for options with context hints (when not selected)
            hasHint &&
              !isSelected &&
              !isAiOption &&
              React.createElement(
                'span',
                {
                  style: {
                    marginLeft: '4px',
                    fontSize: '12px',
                    color: '#999',
                    cursor: 'help',
                  },
                  title: option.contextHint,
                },
                'ⓘ'
              )
          );
        }),

        // Add custom option button/input
        !showCustomInput &&
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => this.setState({ showCustomInput: true }),
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                border: '2px dashed #ccc',
                backgroundColor: '#f9f9f9',
                color: '#666',
              },
            },
            React.createElement('span', null, '+'),
            'Add custom'
          ),

        // Custom input field
        showCustomInput &&
          React.createElement(
            'div',
            {
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              },
            },
            React.createElement('input', {
              type: 'text',
              value: customValue,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                this.setState({ customValue: e.target.value }),
              onKeyDown: this.handleCustomKeyDown,
              placeholder: 'Type and press Enter',
              autoFocus: true,
              style: {
                padding: '10px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                border: '2px solid #51a351',
                outline: 'none',
                minWidth: '180px',
              },
            }),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => this.setState({ showCustomInput: false, customValue: '' }),
                style: {
                  padding: '6px 10px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#f0f0f0',
                  cursor: 'pointer',
                  fontSize: '14px',
                },
              },
              '×'
            )
          )
      ),

      // Show custom entries that aren't in the original options
      this.renderCustomEntries()
    );
  }

  private renderCustomEntries() {
    const { options, selected, onChange } = this.props;
    const optionValues = options.map((o) => o.value);
    const customEntries = selected.filter((s) => !optionValues.includes(s));

    if (customEntries.length === 0) return null;

    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #eee',
        },
      },
      ...customEntries.map((entry) =>
        React.createElement(
          'button',
          {
            key: entry,
            type: 'button',
            onClick: () => onChange(selected.filter((v) => v !== entry)),
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              border: '2px solid #51a351',
              backgroundColor: '#51a351',
              color: '#ffffff',
            },
          },
          React.createElement('span', null, '✓'),
          entry.replace(/-/g, ' '),
          React.createElement(
            'span',
            {
              style: {
                marginLeft: '4px',
                fontSize: '12px',
                opacity: 0.8,
              },
            },
            '×'
          )
        )
      )
    );
  }
}

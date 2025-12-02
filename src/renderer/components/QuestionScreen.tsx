/**
 * QuestionScreen - Structured question wizard flow
 * Guides users through 5 questions to gather site requirements
 *
 * AI Enhancement: Options are dynamically enhanced based on:
 * - Entry description (what user is building)
 * - Previous answers (accumulated context)
 * - Figma analysis (if connected)
 */

import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { WIZARD_QUESTIONS, ROUTES, IPC_CHANNELS } from '../../common/constants';
import {
  WizardAnswers,
  ChipOption,
  QuestionContext,
  DynamicOptionsResponse,
  MergedQuestionOptions,
  EnhancedChipOption,
  WizardQuestion,
} from '../../common/types';
import { createStructureFromAnswers } from '../../common/mock-structure';
import { QuestionStepper } from './QuestionStepper';
import { ChipSelector } from './ChipSelector';
import { UnderstandingSummary } from './UnderstandingSummary';
import { CustomStepper } from './CustomStepper';
import { getElectron } from '../electron-context';

interface Props extends RouteComponentProps {
  siteSettings: any;
  updateSiteSettings?: (settings: any) => void;
  onSwitchToChat?: () => void;
}

interface State {
  currentQuestion: number;
  answers: WizardAnswers;
  textInputValue: string;
  // AI enhancement state
  enhancedOptions: Map<number, MergedQuestionOptions>; // Cache per question (1-indexed)
  loadingOptions: boolean;
  aiError: string | null;
  // Track which AI options were selected (for structure generation)
  selectedAiOptions: EnhancedChipOption[];
  // Accumulated plugin recommendations from all questions
  accumulatedPlugins: Array<{ slug: string; name: string; reason: string }>;
}

export class QuestionScreen extends React.Component<Props, State> {
  private textInputRef: React.RefObject<HTMLInputElement>;

  constructor(props: Props) {
    super(props);
    this.textInputRef = React.createRef();

    // Try to restore answers from siteSettings
    const savedAnswers = props.siteSettings?.wizardAnswers || {};

    this.state = {
      currentQuestion: 1,
      answers: savedAnswers,
      textInputValue: savedAnswers.siteName || '',
      // AI enhancement state
      enhancedOptions: new Map(),
      loadingOptions: false,
      aiError: null,
      selectedAiOptions: [],
      accumulatedPlugins: [],
    };
  }

  componentDidMount() {
    // Focus text input on mount if first question
    if (this.state.currentQuestion === 1 && this.textInputRef.current) {
      this.textInputRef.current.focus();
    }

    // Load enhanced options for the current question (if chip-based)
    const currentQ = this.getCurrentQuestion();
    if (currentQ?.type === 'chips') {
      this.loadEnhancedOptions(this.state.currentQuestion);
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    // Focus text input when switching to a text question
    const currentQ = WIZARD_QUESTIONS[this.state.currentQuestion - 1];
    if (currentQ?.type === 'text' && prevState.currentQuestion !== this.state.currentQuestion) {
      if (this.textInputRef.current) {
        this.textInputRef.current.focus();
      }
    }

    // Load enhanced options when switching to a chip question
    if (currentQ?.type === 'chips' && prevState.currentQuestion !== this.state.currentQuestion) {
      this.loadEnhancedOptions(this.state.currentQuestion);
    }
  }

  getCurrentQuestion() {
    return WIZARD_QUESTIONS[this.state.currentQuestion - 1];
  }

  handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ textInputValue: e.target.value });
  };

  handleTextSubmit = () => {
    const question = this.getCurrentQuestion();
    if (!question || question.type !== 'text') return;

    const { textInputValue, answers } = this.state;
    if (question.required && !textInputValue.trim()) return;

    const newAnswers = {
      ...answers,
      [question.key]: textInputValue.trim(),
    };

    this.setState({ answers: newAnswers }, () => {
      this.saveAnswers(newAnswers);
      this.goToNextQuestion();
    });
  };

  handleChipSelectionChange = (selected: string[]) => {
    const question = this.getCurrentQuestion();
    if (!question) return;

    const newAnswers = {
      ...this.state.answers,
      [question.key]: selected,
    };

    // Track AI options that were selected
    const options = this.getOptionsForQuestion();
    const newAiSelections = options.filter(
      (opt) => 'source' in opt && opt.source === 'ai' && selected.includes(opt.value)
    ) as EnhancedChipOption[];

    // Merge with existing AI selections (from other questions), avoiding duplicates
    const existingFromOtherQuestions = this.state.selectedAiOptions.filter(
      (opt) => !options.some((o) => o.value === opt.value)
    );
    const updatedAiOptions = [...existingFromOtherQuestions, ...newAiSelections];

    this.setState({ answers: newAnswers, selectedAiOptions: updatedAiOptions }, () => {
      this.saveAnswers(newAnswers);
    });
  };

  saveAnswers = (answers: WizardAnswers) => {
    if (this.props.updateSiteSettings) {
      this.props.updateSiteSettings({
        wizardAnswers: answers,
        projectName: answers.siteName || this.props.siteSettings?.projectName,
      });
    }
  };

  goToNextQuestion = () => {
    const { currentQuestion, answers } = this.state;

    if (currentQuestion >= WIZARD_QUESTIONS.length) {
      // All questions answered - generate structure and go to review
      this.generateStructureAndNavigate();
      return;
    }

    const nextQuestion = WIZARD_QUESTIONS[currentQuestion];
    this.setState({
      currentQuestion: currentQuestion + 1,
      textInputValue:
        nextQuestion?.type === 'text' ? (answers[nextQuestion.key] as string) || '' : '',
    });
  };

  generateStructureAndNavigate = () => {
    const { answers, selectedAiOptions, accumulatedPlugins } = this.state;
    const siteName = answers.siteName || 'my-site';
    const projectId = `project_${Date.now()}`;

    // Generate structure based on wizard answers + AI options + recommended plugins
    const structure = createStructureFromAnswers(answers, selectedAiOptions, accumulatedPlugins);

    console.log('[QuestionScreen] Generated structure from answers:', structure);
    if (selectedAiOptions.length > 0) {
      console.log(
        '[QuestionScreen] AI options included:',
        selectedAiOptions.map((o) => o.label)
      );
    }
    if (accumulatedPlugins.length > 0) {
      console.log(
        '[QuestionScreen] AI-recommended plugins:',
        accumulatedPlugins.map((p) => p.slug)
      );
    }

    // Save to site settings
    if (this.props.updateSiteSettings) {
      this.props.updateSiteSettings({
        projectId,
        projectName: siteName,
        structure,
        wizardAnswers: answers,
      });
    }

    // Navigate to review
    this.props.history.push(ROUTES.REVIEW_STRUCTURE);
  };

  goToPreviousQuestion = () => {
    const { currentQuestion } = this.state;

    if (currentQuestion <= 1) {
      // Go back to entry screen
      this.props.history.push(ROUTES.ENTRY);
      return;
    }

    const prevQuestion = WIZARD_QUESTIONS[currentQuestion - 2];
    this.setState({
      currentQuestion: currentQuestion - 1,
      textInputValue:
        prevQuestion?.type === 'text' ? (this.state.answers[prevQuestion.key] as string) || '' : '',
    });
  };

  skipQuestion = () => {
    this.goToNextQuestion();
  };

  handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      const question = this.getCurrentQuestion();
      if (question?.type === 'text') {
        this.handleTextSubmit();
      } else {
        this.goToNextQuestion();
      }
    }
  };

  canProceed(): boolean {
    const question = this.getCurrentQuestion();
    if (!question) return false;

    if (question.type === 'text') {
      if ('required' in question && question.required) {
        return this.state.textInputValue.trim().length > 0;
      }
      return true;
    }

    // For chip questions, allow proceeding even with no selection
    return true;
  }

  render() {
    const { currentQuestion, answers, textInputValue, loadingOptions, aiError } = this.state;
    const question = this.getCurrentQuestion();
    const isLastQuestion = currentQuestion === WIZARD_QUESTIONS.length;

    return React.createElement(
      'div',
      {
        className: 'AddSiteContent',
        style: {
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        },
        onKeyDown: this.handleKeyDown,
      },

      // Question stepper at top
      React.createElement(QuestionStepper, {
        currentQuestion,
        totalQuestions: WIZARD_QUESTIONS.length,
      }),

      // Main content area
      React.createElement(
        'div',
        {
          style: {
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            overflow: 'hidden',
          },
        },

        // Left side - Question area
        React.createElement(
          'div',
          {
            style: {
              flex: 1,
              padding: '40px 60px',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
            },
          },

          // Question title
          question &&
            React.createElement(
              'h2',
              {
                style: {
                  fontSize: '28px',
                  fontWeight: 600,
                  color: '#333',
                  marginBottom: '12px',
                },
              },
              question.question
            ),

          // Question subtitle
          question &&
            React.createElement(
              'p',
              {
                style: {
                  fontSize: '15px',
                  color: '#666',
                  marginBottom: '32px',
                  lineHeight: '1.6',
                },
              },
              question.subtitle
            ),

          // Question input area
          question?.type === 'text' &&
            React.createElement(
              'div',
              { style: { marginBottom: '24px' } },
              React.createElement('input', {
                ref: this.textInputRef,
                type: 'text',
                value: textInputValue,
                onChange: this.handleTextChange,
                placeholder: question.placeholder || '',
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleTextSubmit();
                  }
                },
                style: {
                  width: '100%',
                  maxWidth: '500px',
                  padding: '16px',
                  fontSize: '16px',
                  border: '2px solid #51a351',
                  borderRadius: '8px',
                  outline: 'none',
                },
              })
            ),

          // Chip selector for multi-choice questions
          question?.type === 'chips' &&
            'options' in question &&
            question.options &&
            React.createElement(
              'div',
              { style: { marginBottom: '24px' } },

              // Loading state
              loadingOptions &&
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px 0',
                      color: '#666',
                    },
                  },
                  React.createElement('div', {
                    style: {
                      width: '20px',
                      height: '20px',
                      border: '2px solid #e0e0e0',
                      borderTopColor: '#51a351',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    },
                  }),
                  'Enhancing options based on your context...'
                ),

              // AI error notice (non-blocking)
              aiError &&
                !loadingOptions &&
                React.createElement(
                  'div',
                  {
                    style: {
                      fontSize: '13px',
                      color: '#999',
                      marginBottom: '12px',
                      fontStyle: 'italic',
                    },
                  },
                  'Using standard options (AI enhancement unavailable)'
                ),

              // Chip selector with enhanced options
              !loadingOptions &&
                React.createElement(ChipSelector, {
                  options: this.getOptionsForQuestion(),
                  selected: (answers[question.key] as string[]) || [],
                  onChange: this.handleChipSelectionChange,
                  multiSelect: 'multiSelect' in question ? question.multiSelect : false,
                  contextHint: this.getContextHint(question.key),
                })
            )
        ),

        // Right side - Understanding summary
        React.createElement(
          'div',
          {
            style: {
              width: '320px',
              minWidth: '280px',
              padding: '40px 24px',
              borderLeft: '1px solid #e0e0e0',
              overflow: 'auto',
            },
          },
          React.createElement(UnderstandingSummary, { answers })
        )
      ),

      // Bottom navigation
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#fff',
          },
        },

        // Left buttons
        React.createElement(
          'div',
          { style: { display: 'flex', gap: '12px' } },

          // Go back button
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: this.goToPreviousQuestion,
              style: {
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: '#fff',
                color: '#333',
                cursor: 'pointer',
              },
            },
            'Go back'
          ),

          // Skip question button (only for non-required questions)
          !('required' in question && question?.required) &&
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: this.skipQuestion,
                style: {
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#666',
                  cursor: 'pointer',
                },
              },
              'Skip question'
            )
        ),

        // Right side - keyboard hint and next button
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '16px' } },

          // Keyboard hint
          React.createElement(
            'span',
            {
              style: {
                fontSize: '13px',
                color: '#999',
              },
            },
            '\u2318 + Enter to submit'
          ),

          // Next/Review button
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: question?.type === 'text' ? this.handleTextSubmit : this.goToNextQuestion,
              disabled: !this.canProceed(),
              className: 'Button Button--primary',
              style: {
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                backgroundColor: this.canProceed() ? '#51a351' : '#ccc',
                color: '#fff',
                cursor: this.canProceed() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              },
            },
            isLastQuestion ? 'Review structure' : 'Next question',
            React.createElement('span', null, '\u2192')
          )
        )
      ),

      // Custom stepper at very bottom
      React.createElement(CustomStepper, {
        currentPath: this.props.history.location.pathname,
      })
    );
  }

  /**
   * Load AI-enhanced options for a question
   * Uses IPC to call the main process Claude service
   */
  private async loadEnhancedOptions(questionIndex: number): Promise<void> {
    // Check cache first
    if (this.state.enhancedOptions.has(questionIndex)) {
      console.log('[QuestionScreen] Using cached enhanced options for question', questionIndex);
      return;
    }

    const question = WIZARD_QUESTIONS[questionIndex - 1];
    if (!question || question.type !== 'chips') {
      return;
    }

    this.setState({ loadingOptions: true, aiError: null });

    const startTime = Date.now();

    try {
      const context: QuestionContext = {
        entryDescription:
          this.props.siteSettings?.entryDescription || this.props.siteSettings?.projectDescription,
        previousAnswers: this.state.answers,
        figmaAnalysis: this.props.siteSettings?.figmaAnalysis,
        currentQuestion: question as unknown as WizardQuestion,
        questionIndex: questionIndex - 1, // 0-indexed for the API
      };

      console.log('[QuestionScreen] Loading enhanced options for question', questionIndex, context);

      // Call IPC to get dynamic options
      const electron = getElectron();
      const response = await electron.ipcRenderer.invoke(IPC_CHANNELS.GET_DYNAMIC_OPTIONS, context);

      const elapsed = Date.now() - startTime;
      console.log('[QuestionScreen] Enhanced options response:', response, `(${elapsed}ms)`);

      // Merge base options with AI enhancements
      const merged = this.mergeOptions(question.options || [], response.data);

      // Update cache and state, accumulating new plugin recommendations
      this.setState((prev) => {
        const newCache = new Map(prev.enhancedOptions);
        newCache.set(questionIndex, merged);

        // Accumulate plugin recommendations (deduped by slug)
        const existingSlugs = new Set(prev.accumulatedPlugins.map((p) => p.slug));
        const newPlugins = (merged.recommendedPlugins || []).filter(
          (p) => !existingSlugs.has(p.slug)
        );

        return {
          enhancedOptions: newCache,
          loadingOptions: false,
          aiError: response.success ? null : response.error,
          accumulatedPlugins: [...prev.accumulatedPlugins, ...newPlugins],
        };
      });

      // Apply defaults if this is the first time viewing this question
      if (merged.defaults.length > 0 && !(this.state.answers[question.key] as string[])?.length) {
        this.handleChipSelectionChange(merged.defaults);
      }
    } catch (error: any) {
      console.error('[QuestionScreen] Error loading enhanced options:', error);
      this.setState({
        loadingOptions: false,
        aiError: error.message || 'Failed to load AI suggestions',
      });
    }
  }

  /**
   * Merge base options with AI enhancements
   */
  private mergeOptions(
    baseOptions: readonly ChipOption[],
    aiResponse: DynamicOptionsResponse
  ): MergedQuestionOptions {
    // 1. Filter out removed base options
    const filteredBase = baseOptions.filter(
      (o) => !aiResponse.removedOptionIds.includes(o.id || o.value)
    );

    // 2. Enhance base options with hints and convert to EnhancedChipOption
    const enhancedBase: EnhancedChipOption[] = filteredBase.map((o) => ({
      id: o.id || o.value,
      label: o.label,
      value: o.value,
      source: 'base' as const,
      contextHint: aiResponse.hints[o.id || o.value] || o.contextHint,
      recommended: o.recommended,
    }));

    // 3. Add AI options at the end
    const aiOptions: EnhancedChipOption[] = (aiResponse.suggestedOptions || []).map((o) => ({
      ...o,
      source: 'ai' as const,
    }));

    return {
      options: [...enhancedBase, ...aiOptions],
      defaults: aiResponse.defaultSelections || [],
      aiMetadata: {
        wasEnhanced: aiOptions.length > 0 || Object.keys(aiResponse.hints || {}).length > 0,
        responseTime: Date.now(),
        error: undefined,
      },
      recommendedPlugins: aiResponse.recommendedPlugins || [],
    };
  }

  /**
   * Get the options to display for the current question
   * Returns enhanced options if available, otherwise base options
   */
  private getOptionsForQuestion(): EnhancedChipOption[] {
    const { currentQuestion, enhancedOptions } = this.state;
    const cached = enhancedOptions.get(currentQuestion);

    if (cached) {
      return cached.options;
    }

    // Fall back to base options converted to EnhancedChipOption
    const question = this.getCurrentQuestion();
    if (question?.type === 'chips' && 'options' in question && question.options) {
      return question.options.map((o: any) => ({
        id: o.id || o.value,
        label: o.label,
        value: o.value,
        source: 'base' as const,
        contextHint: o.contextHint || undefined,
        recommended: o.recommended || undefined,
      }));
    }

    return [];
  }

  private getContextHint(questionKey: string): string | undefined {
    const { answers, enhancedOptions, currentQuestion } = this.state;

    // Check if we have AI-enhanced hints
    const cached = enhancedOptions.get(currentQuestion);
    if (cached?.aiMetadata?.wasEnhanced) {
      return 'Options enhanced based on your context';
    }

    // Generate context-aware hints based on previous answers
    if (questionKey === 'contentCreators' && answers.siteName) {
      return `Based on "${answers.siteName}", here are common content authorship options`;
    }
    if (questionKey === 'visitorActions' && answers.siteName) {
      return `Based on your site, here are common visitor actions`;
    }
    if (questionKey === 'requiredPages') {
      return 'Based on your site, here are common static pages';
    }
    if (questionKey === 'homepageContent') {
      return 'Based on your site, here are common homepage sections';
    }

    return undefined;
  }
}

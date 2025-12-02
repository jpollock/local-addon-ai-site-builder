/**
 * AI Service - Multi-provider conversations for site discovery
 *
 * Uses AIProviderFactory to support Claude, OpenAI, and Gemini.
 * Guides users through site requirements discovery and generates
 * structured site architecture from conversation.
 */

import { AIProvider, AIMessage, AIProviderConfig } from '../common/ai-provider.types';
import { AIProviderFactory } from './ai-providers/provider-factory';
import {
  Conversation,
  SiteStructure,
  SiteUnderstanding,
  ConversationMessage,
  QuestionContext,
  DynamicOptionsResponse,
  EnhancedChipOption,
} from '../common/types';
import { settingsManager, projectManager } from './index';
import { SITE_DISCOVERY_PROMPT } from '../prompts/site-discovery';
import { buildDynamicOptionsPrompt } from '../prompts/dynamic-options';
import { getGoogleOAuthService } from './google-oauth';
import { sanitizeUserInput, createSafeSystemPrompt } from './utils/prompt-sanitizer';

const _MAX_QUESTIONS = 8; // Limit conversation length (reserved for future use)

export class AIService {
  private provider: AIProvider | null = null;

  /**
   * Initialize the AI provider based on user's active provider setting
   * Now async to support proactive token refresh for OAuth
   */
  private async initializeProvider(): Promise<void> {
    if (this.provider) return;

    const providerType = settingsManager.getActiveProvider();
    console.log(`[AI Service] Initializing provider: ${providerType}`);

    // Build provider config based on type
    const config: AIProviderConfig = {
      type: providerType,
      model: settingsManager.getModel(providerType),
    };

    // Handle different auth modes
    if (providerType === 'gemini') {
      const authMode = settingsManager.getGeminiAuthMode();
      console.log(`[AI Service] Gemini auth mode: ${authMode}`);
      if (authMode === 'oauth') {
        config.geminiAuthMode = 'oauth';

        // Proactively refresh tokens before they expire
        const currentTokens = settingsManager.getGeminiOAuthTokens();
        if (!currentTokens?.accessToken) {
          throw new Error('Gemini OAuth not connected. Please sign in with Google.');
        }

        // Check if tokens need refresh (refresh if expiring in next 5 minutes)
        const refreshedTokens = await this.ensureValidOAuthTokens(currentTokens);
        config.oauthTokens = refreshedTokens;
      } else {
        config.geminiAuthMode = 'api-key';
        const apiKey = settingsManager.getApiKey(providerType);
        if (!apiKey) {
          throw new Error(`${providerType} API key not configured`);
        }
        config.apiKey = apiKey;
        console.log(`[AI Service] Using API key for Gemini (key length: ${apiKey.length})`);
      }
    } else {
      const apiKey = settingsManager.getApiKey(providerType);
      if (!apiKey) {
        throw new Error(`${providerType} API key not configured`);
      }
      config.apiKey = apiKey;
    }

    this.provider = AIProviderFactory.create(config);
  }

  /**
   * Ensure OAuth tokens are valid, refreshing if needed
   * Proactively refreshes if tokens expire within 5 minutes
   */
  private async ensureValidOAuthTokens(tokens: any): Promise<any> {
    const oauthService = getGoogleOAuthService();

    // Check if tokens are expired or will expire soon (5 minute buffer)
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    const isExpiringSoon = tokens.expiresAt < Date.now() + expiryBuffer;

    if (!isExpiringSoon) {
      console.log(
        `[AI Service] OAuth tokens valid, expires in ${Math.round((tokens.expiresAt - Date.now()) / 60000)} minutes`
      );
      return tokens;
    }

    console.log('[AI Service] OAuth tokens expiring soon, attempting refresh...');

    // Try to refresh tokens
    const result = await oauthService.validateAndRefreshTokens(tokens);

    if (result.success && result.tokens) {
      console.log('[AI Service] OAuth tokens refreshed successfully');

      // Save the refreshed tokens
      settingsManager.setGeminiOAuthTokens(result.tokens);

      return result.tokens;
    }

    // Refresh failed
    if (!tokens.refreshToken) {
      throw new Error(
        'OAuth token expired and no refresh token available. Please sign in with Google again.'
      );
    }

    throw new Error('Failed to refresh OAuth token. Please sign in with Google again.');
  }

  /**
   * Reset provider (call when user changes provider settings)
   */
  resetProvider(): void {
    console.log('[AI Service] Provider reset - will reinitialize on next use');
    this.provider = null;
  }

  /**
   * Start a new conversation
   */
  async startConversation(
    projectId: string,
    initialContext?: string
  ): Promise<{ conversationId: string; firstQuestion: string; suggestions: string[] }> {
    await this.initializeProvider();

    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create initial messages array
    const messages: ConversationMessage[] = [];

    // Add user context if provided
    let firstQuestion =
      "Hi! I'd love to help you build your WordPress site. What kind of website are you thinking about creating?";
    const suggestions = [
      'A portfolio to showcase my work',
      'A blog for sharing articles',
      'A business website',
      'An online store',
    ];

    if (initialContext) {
      // Sanitize initial context to prevent prompt injection
      const sanitizedContext = sanitizeUserInput(initialContext, {
        maxLength: 5000,
        wrapWithBoundaries: false,
      });

      if (sanitizedContext.hadSuspiciousPatterns) {
        console.warn(
          `[AI Service] Detected suspicious patterns in initial context: ${sanitizedContext.detectedPatterns.join(', ')}`
        );
      }

      messages.push({
        role: 'user',
        content: sanitizedContext.sanitized,
        timestamp: new Date().toISOString(),
      });

      // Get AI's first response based on sanitized context
      const safeSystemPrompt = createSafeSystemPrompt(SITE_DISCOVERY_PROMPT);
      console.log(
        '[AI Service] Using safe SITE_DISCOVERY_PROMPT for startConversation (initial context provided)'
      );
      const aiMessages: AIMessage[] = [{ role: 'user', content: sanitizedContext.sanitized }];
      const response = await this.provider!.sendMessage(aiMessages, safeSystemPrompt, {
        maxTokens: 1024,
      });

      firstQuestion = response || firstQuestion;

      messages.push({
        role: 'assistant',
        content: firstQuestion,
        timestamp: new Date().toISOString(),
      });
    }

    // Create conversation record
    const conversation: Conversation = {
      id: conversationId,
      projectId,
      messages,
      understanding: {
        confidence: 0,
      },
      questionsAsked: 0,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    projectManager.createConversation(conversation);

    return {
      conversationId,
      firstQuestion,
      suggestions,
    };
  }

  /**
   * Send a message in an existing conversation
   */
  async sendMessage(
    conversationId: string,
    userMessage: string
  ): Promise<{
    reply: string;
    suggestions?: string[];
    understanding: SiteUnderstanding;
    completed: boolean;
    structure?: SiteStructure;
  }> {
    await this.initializeProvider();

    const conversation = projectManager.getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Sanitize user input to prevent prompt injection
    const sanitizationResult = sanitizeUserInput(userMessage, {
      maxLength: 5000,
      wrapWithBoundaries: false, // Don't wrap here, we'll use boundaries in system prompt
    });

    if (sanitizationResult.hadSuspiciousPatterns) {
      console.warn(
        `[AI Service] Detected suspicious patterns in user input: ${sanitizationResult.detectedPatterns.join(', ')}`
      );
    }

    // Add sanitized user message to history
    conversation.messages.push({
      role: 'user',
      content: sanitizationResult.sanitized,
      timestamp: new Date().toISOString(),
    });

    // Build messages array for AI (remove timestamps)
    const aiMessages: AIMessage[] = conversation.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Call AI provider with safe system prompt
    const safeSystemPrompt = createSafeSystemPrompt(SITE_DISCOVERY_PROMPT);
    console.log(
      `[AI Service] Using safe SITE_DISCOVERY_PROMPT for sendMessage (question ${conversation.questionsAsked + 1})`
    );
    const response = await this.provider!.sendMessage(aiMessages, safeSystemPrompt, {
      maxTokens: 2048,
    });

    const reply = response || '';

    // Check if AI is ready to build
    const isReadyToBuild = reply.includes('READY_TO_BUILD');
    let structure: SiteStructure | undefined;
    let cleanReply = reply;

    if (isReadyToBuild) {
      try {
        // Extract JSON from response (improved parsing for multi-provider)
        const jsonData = this.extractJsonFromResponse(reply);
        if (jsonData) {
          // Generate site structure from understanding
          structure = this.generateStructureFromUnderstanding(jsonData);

          // Clean up reply to remove JSON
          cleanReply =
            reply.split('READY_TO_BUILD')[0].trim() ||
            "Great! I have everything I need. Let me show you what I've designed for your site.";
        }
      } catch (error) {
        console.error('[AI Service] Error parsing structure:', error);
      }
    }

    // Add assistant message to history
    conversation.messages.push({
      role: 'assistant',
      content: cleanReply,
      timestamp: new Date().toISOString(),
    });

    // Update conversation state
    conversation.questionsAsked++;
    conversation.completed = isReadyToBuild;
    conversation.understanding.confidence = isReadyToBuild
      ? 100
      : Math.min(conversation.questionsAsked * 15, 85);

    projectManager.updateConversation(conversationId, {
      messages: conversation.messages,
      questionsAsked: conversation.questionsAsked,
      understanding: conversation.understanding,
      completed: conversation.completed,
    });

    // Generate suggestions for next response (if not completed)
    const suggestions = isReadyToBuild ? undefined : this.generateSuggestions(conversation);

    return {
      reply: cleanReply,
      suggestions,
      understanding: conversation.understanding,
      completed: isReadyToBuild,
      structure,
    };
  }

  /**
   * Extract JSON from AI response with multi-provider reliability
   * Handles markdown code blocks, raw JSON, and various formats
   */
  private extractJsonFromResponse(response: string): any | null {
    // 1. Try markdown code block first (preferred format)
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {
        // Continue to next method
      }
    }

    // 2. Try finding JSON after READY_TO_BUILD marker
    const markerIndex = response.indexOf('READY_TO_BUILD');
    if (markerIndex !== -1) {
      const afterMarker = response.slice(markerIndex + 'READY_TO_BUILD'.length).trim();
      // Remove any leading text before the JSON
      const jsonStart = afterMarker.indexOf('{');
      if (jsonStart !== -1) {
        try {
          // Find matching closing brace
          const jsonPart = this.extractBalancedJson(afterMarker.slice(jsonStart));
          if (jsonPart) {
            return JSON.parse(jsonPart);
          }
        } catch {
          // Continue to fallback
        }
      }
    }

    // 3. Fallback: find first balanced {...} in response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // JSON parse failed
      }
    }

    return null;
  }

  /**
   * Extract balanced JSON object from string
   */
  private extractBalancedJson(str: string): string | null {
    if (!str.startsWith('{')) return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (char === '\\' && inString) {
        escape = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') depth++;
        else if (char === '}') {
          depth--;
          if (depth === 0) {
            return str.slice(0, i + 1);
          }
        }
      }
    }

    return null;
  }

  /**
   * Generate site structure from AI's understanding
   */
  private generateStructureFromUnderstanding(understanding: any): SiteStructure {
    // Map AI's understanding to our SiteStructure format
    const contentTypes = understanding.contentTypes || [];
    const taxonomies = understanding.taxonomies || [];
    const recommendedPlugins = understanding.recommendedPlugins || [];

    return {
      content: {
        status: 'ready',
        postTypes: contentTypes.map((ct: any) => ({
          name: ct.name,
          slug: ct.slug,
          description: ct.description,
          fields: ct.fields || [],
          taxonomies: taxonomies
            .filter((t: any) => t.postTypes?.includes(ct.slug))
            .map((t: any) => ({
              name: t.name,
              slug: t.slug,
              hierarchical: t.hierarchical ?? true,
            })),
          supports: ct.supports || ['title', 'editor', 'thumbnail'],
          icon: ct.icon || 'admin-post',
        })),
      },
      design: {
        status: 'ready',
        theme: {
          base: 'twentytwentyfive' as const,
          childThemeName: 'ai-generated-theme',
          designTokens: {
            colors: {
              primary: '#2196F3',
              secondary: '#FFC107',
              text: '#333333',
              background: '#FFFFFF',
            },
            typography: {
              fontFamilies: ['Inter', 'system-ui'],
              fontSizes: {
                base: '16px',
                large: '24px',
              },
              lineHeights: {
                base: '1.5',
                heading: '1.2',
              },
            },
            spacing: {
              sm: '8px',
              md: '16px',
              lg: '32px',
            },
            borderRadius: {
              sm: '4px',
              md: '8px',
            },
          },
        },
      },
      features: {
        status: 'ready',
        plugins: this.processRecommendedPlugins(understanding.features || [], recommendedPlugins),
      },
    };
  }

  /**
   * Process recommended plugins from AI response
   */
  private processRecommendedPlugins(
    features: string[],
    aiRecommendedPlugins: any[]
  ): Array<{ slug: string; name: string; reason: string; required: boolean; confidence: number }> {
    const plugins: Array<{
      slug: string;
      name: string;
      reason: string;
      required: boolean;
      confidence: number;
    }> = [];

    // Add AI-recommended plugins
    for (const plugin of aiRecommendedPlugins) {
      if (plugin.slug && plugin.reason) {
        plugins.push({
          slug: plugin.slug,
          name: plugin.name || plugin.slug,
          reason: plugin.reason,
          required: plugin.required ?? true,
          confidence: plugin.confidence ?? 85,
        });
      }
    }

    // Add feature-based plugins if not already recommended
    const pluginSlugs = new Set(plugins.map((p) => p.slug));

    if (
      features.some((f) => f.toLowerCase().includes('contact form')) &&
      !pluginSlugs.has('contact-form-7')
    ) {
      plugins.push({
        slug: 'contact-form-7',
        name: 'Contact Form 7',
        reason: 'Handle contact form submissions',
        required: true,
        confidence: 95,
      });
    }

    if (
      features.some((f) => f.toLowerCase().includes('seo')) &&
      !pluginSlugs.has('wordpress-seo')
    ) {
      plugins.push({
        slug: 'wordpress-seo',
        name: 'Yoast SEO',
        reason: 'SEO optimization',
        required: true,
        confidence: 90,
      });
    }

    if (
      features.some((f) => f.toLowerCase().includes('social media')) &&
      !pluginSlugs.has('social-warfare')
    ) {
      plugins.push({
        slug: 'social-warfare',
        name: 'Social Warfare',
        reason: 'Social media sharing',
        required: false,
        confidence: 70,
      });
    }

    return plugins;
  }

  /**
   * Generate smart suggestions for user's next response
   */
  private generateSuggestions(conversation: Conversation): string[] {
    const questionCount = conversation.questionsAsked;

    // Early questions - broad topics
    if (questionCount < 3) {
      return [
        'A professional portfolio',
        'A blog or magazine',
        'A business website',
        'An online store',
      ];
    }

    // Mid questions - specifics
    if (questionCount < 6) {
      return [
        'Photos and videos',
        'Articles and blog posts',
        'Products for sale',
        'Team member bios',
      ];
    }

    // Later questions - features
    return [
      'Contact form',
      'Email newsletter',
      'Social media integration',
      'Customer testimonials',
    ];
  }

  /**
   * Get dynamic options for a wizard question based on context
   *
   * Uses AI to enhance question options based on:
   * - User's entry description (what they're building)
   * - Previous answers in the wizard
   * - Figma analysis (if connected)
   *
   * Returns enhanced options including:
   * - New AI-suggested options specific to their context
   * - Options to remove (irrelevant for their use case)
   * - Suggested default selections
   * - Contextual hints for each option
   */
  async getDynamicOptions(context: QuestionContext): Promise<DynamicOptionsResponse> {
    await this.initializeProvider();

    // Build the base options list for the prompt
    const baseOptions = context.currentQuestion.options || [];
    const baseOptionsText = baseOptions
      .map((opt) => `- ${opt.id}: "${opt.label}" (value: ${opt.value})`)
      .join('\n');

    // Build context summary
    const contextSummary = this.buildContextSummary(context);

    // Build the prompt using externalized template
    console.log(
      `[AI Service] Using buildDynamicOptionsPrompt for getDynamicOptions (question ${context.questionIndex + 1}: "${context.currentQuestion.question}")`
    );
    const prompt = buildDynamicOptionsPrompt(
      contextSummary,
      context.questionIndex,
      context.currentQuestion,
      baseOptionsText
    );

    try {
      const aiMessages: AIMessage[] = [{ role: 'user', content: prompt }];
      const response = await this.provider!.sendMessage(
        aiMessages,
        '', // No system prompt for this call
        { maxTokens: 4096 }
      );

      // Log raw response for debugging
      console.log(
        `[AI Service] Raw getDynamicOptions response (first 500 chars): ${response?.substring(0, 500)}`
      );

      // Extract JSON from response (handle markdown code blocks)
      const parsed = this.extractJsonFromResponse(response);
      if (!parsed) {
        console.error(
          `[AI Service] Failed to parse JSON from response: ${response?.substring(0, 1000)}`
        );
        throw new Error('Failed to parse AI response as JSON');
      }

      // Validate and sanitize the response
      return this.validateDynamicOptionsResponse(parsed, context);
    } catch (error) {
      console.error('[AI Service] Error getting dynamic options:', error);

      // Return empty enhancement on error (graceful degradation)
      return {
        suggestedOptions: [],
        removedOptionIds: [],
        defaultSelections: [],
        hints: {},
        recommendedPlugins: [],
      };
    }
  }

  /**
   * Build a summary of the user's context for the AI prompt
   */
  private buildContextSummary(context: QuestionContext): string {
    const parts: string[] = [];

    // Entry description
    if (context.entryDescription) {
      parts.push(`Site Description: "${context.entryDescription}"`);
    } else {
      parts.push('Site Description: Not provided');
    }

    // Previous answers
    const answers = context.previousAnswers;
    if (answers.siteName) {
      parts.push(`Site Name: "${answers.siteName}"`);
    }
    if (answers.contentCreators?.length) {
      parts.push(`Content Creators: ${answers.contentCreators.join(', ')}`);
    }
    if (answers.visitorActions?.length) {
      parts.push(`Visitor Actions: ${answers.visitorActions.join(', ')}`);
    }
    if (answers.requiredPages?.length) {
      parts.push(`Required Pages: ${answers.requiredPages.join(', ')}`);
    }
    if (answers.homepageContent?.length) {
      parts.push(`Homepage Content: ${answers.homepageContent.join(', ')}`);
    }

    // Figma context
    if (context.figmaAnalysis) {
      parts.push(`Figma Design: Connected (${context.figmaAnalysis.fileName})`);
      if (context.figmaAnalysis.pages?.length) {
        const pageNames = context.figmaAnalysis.pages.map((p) => p.name).join(', ');
        parts.push(`Figma Pages: ${pageNames}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Validate and sanitize the AI response for dynamic options
   */
  private validateDynamicOptionsResponse(
    parsed: any,
    context: QuestionContext
  ): DynamicOptionsResponse {
    const response: DynamicOptionsResponse = {
      suggestedOptions: [],
      removedOptionIds: [],
      defaultSelections: [],
      hints: {},
      recommendedPlugins: [],
    };

    // Validate suggested options
    if (Array.isArray(parsed.suggestedOptions)) {
      response.suggestedOptions = parsed.suggestedOptions
        .filter((opt: any) => opt && typeof opt.id === 'string' && typeof opt.label === 'string')
        .slice(0, 3) // Max 3 AI options
        .map(
          (opt: any): EnhancedChipOption => ({
            id: opt.id,
            label: String(opt.label).slice(0, 50), // Limit label length
            value: opt.value || opt.id,
            source: 'ai' as const,
            contextHint: opt.contextHint ? String(opt.contextHint).slice(0, 100) : undefined,
            confidence: typeof opt.confidence === 'number' ? opt.confidence : 0.8,
            structureMapping: opt.structureMapping || undefined,
          })
        );
    }

    // Validate removed option IDs
    const baseOptionIds = (context.currentQuestion.options || []).map((o) => o.id);
    if (Array.isArray(parsed.removedOptionIds)) {
      // Only allow removal of options that exist
      // Also ensure at least 3 base options remain visible
      const validRemovals = parsed.removedOptionIds.filter(
        (id: string) => typeof id === 'string' && baseOptionIds.includes(id)
      );
      const remainingCount = baseOptionIds.length - validRemovals.length;
      if (remainingCount >= 3) {
        response.removedOptionIds = validRemovals;
      }
    }

    // Validate default selections and convert IDs to values
    if (Array.isArray(parsed.defaultSelections)) {
      const allOptionIds = [...baseOptionIds, ...response.suggestedOptions.map((o) => o.id)];
      // Create maps from ID to value for both base and AI options
      const baseIdToValue = new Map(
        (context.currentQuestion.options || []).map((o) => [o.id || o.value, o.value])
      );
      const aiIdToValue = new Map(response.suggestedOptions.map((o) => [o.id, o.value]));
      // Filter valid IDs and convert to values
      response.defaultSelections = parsed.defaultSelections
        .filter((id: string) => typeof id === 'string' && allOptionIds.includes(id))
        .map((id: string) => baseIdToValue.get(id) || aiIdToValue.get(id) || id);
    }

    // Validate hints
    if (parsed.hints && typeof parsed.hints === 'object') {
      for (const [optionId, hint] of Object.entries(parsed.hints)) {
        if (typeof hint === 'string' && baseOptionIds.includes(optionId)) {
          response.hints[optionId] = String(hint).slice(0, 100);
        }
      }
    }

    // Validate recommended plugins
    if (Array.isArray(parsed.recommendedPlugins)) {
      response.recommendedPlugins = parsed.recommendedPlugins
        .filter(
          (plugin: any) =>
            plugin &&
            typeof plugin.slug === 'string' &&
            typeof plugin.name === 'string' &&
            typeof plugin.reason === 'string'
        )
        .slice(0, 3) // Max 3 plugin recommendations per question
        .map((plugin: any) => ({
          slug: String(plugin.slug)
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, ''),
          name: String(plugin.name).slice(0, 50),
          reason: String(plugin.reason).slice(0, 150),
        }));

      if (response.recommendedPlugins && response.recommendedPlugins.length > 0) {
        console.log(
          '[AI Service] AI recommended plugins:',
          response.recommendedPlugins.map((p) => p.slug)
        );
      }
    }

    return response;
  }
}

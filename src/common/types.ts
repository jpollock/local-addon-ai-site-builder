/**
 * Type definitions for AI Site Builder addon
 */

import { PILLARS, ENTRY_PATHWAYS } from './constants';

/**
 * Question types for wizard flow
 */
export type QuestionType = 'text' | 'chips';

export interface ChipOption {
  id?: string;
  label: string;
  value: string;
  recommended?: boolean;
  contextHint?: string;
}

/**
 * Enhanced chip option with AI metadata
 * Used when AI enhances options with context-aware suggestions
 */
export interface EnhancedChipOption {
  id: string;
  label: string;
  value: string;
  source: 'base' | 'ai'; // Distinguish origin
  contextHint?: string; // AI-generated explanation
  confidence?: number; // How confident AI is (0-1)
  recommended?: boolean; // Whether this option is recommended
  structureMapping?: {
    // For AI options: what structure they generate
    plugins?: string[];
    postTypes?: string[];
    taxonomies?: string[];
    pages?: string[];
  };
}

/**
 * Context sent to AI for each question during wizard flow
 */
export interface QuestionContext {
  entryDescription?: string; // "I'm building a recipe blog..."
  previousAnswers: Partial<WizardAnswers>; // Accumulated answers so far
  figmaAnalysis?: FigmaAnalysis; // Design context if Figma connected
  currentQuestion: WizardQuestion; // The question being asked
  questionIndex: number; // 0-4 for the 5 questions
}

/**
 * AI response for dynamic options enhancement
 */
export interface DynamicOptionsResponse {
  suggestedOptions: EnhancedChipOption[]; // New AI options to add
  removedOptionIds: string[]; // Base options to hide (by ID)
  defaultSelections: string[]; // Pre-select these option IDs
  hints: Record<string, string>; // Hints for base options (keyed by option ID)
  recommendedPlugins?: Array<{
    // AI-recommended plugins for this context
    slug: string;
    name: string;
    reason: string;
  }>;
}

/**
 * Merged result after combining base options with AI enhancements
 */
export interface MergedQuestionOptions {
  options: EnhancedChipOption[]; // Final merged list
  defaults: string[]; // Pre-selected option IDs
  aiMetadata: {
    wasEnhanced: boolean;
    responseTime: number;
    error?: string;
  };
  // AI-recommended plugins for this question's context
  recommendedPlugins?: Array<{
    slug: string;
    name: string;
    reason: string;
  }>;
}

export interface WizardQuestion {
  id: number;
  key: string;
  question: string;
  subtitle: string;
  type: QuestionType;
  placeholder?: string;
  required?: boolean;
  multiSelect?: boolean;
  options?: ChipOption[];
}

/**
 * Answers collected from the wizard questions
 */
export interface WizardAnswers {
  siteName?: string;
  contentCreators?: string[];
  visitorActions?: string[];
  requiredPages?: string[];
  homepageContent?: string[];
  [key: string]: string | string[] | undefined;
}

/**
 * Question screen mode
 */
export type QuestionMode = 'wizard' | 'chat';

/**
 * Entry pathway types
 */
export type EntryPathway = (typeof ENTRY_PATHWAYS)[keyof typeof ENTRY_PATHWAYS];

/**
 * Pillar types
 */
export type Pillar = (typeof PILLARS)[keyof typeof PILLARS];

/**
 * User settings
 */
export interface UserSettings {
  claudeApiKey?: string;
  figmaToken?: string;
  acfProDetected: boolean;
  showAdvancedOptions: boolean;
}

/**
 * Project - represents a site being built with AI assistance
 */
export interface Project {
  id: string;
  siteId?: string; // Local site ID (once created)
  name: string;
  description?: string;
  entryPathway: EntryPathway;
  conversationId?: string;
  figmaFileUrl?: string;
  structure?: SiteStructure;
  createdAt: string;
  updatedAt: string;
  status: 'planning' | 'building' | 'completed' | 'error';
}

/**
 * AI Conversation message
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[]; // Smart button suggestions for user
}

/**
 * AI Conversation session
 */
export interface Conversation {
  id: string;
  projectId: string;
  messages: ConversationMessage[];
  understanding: SiteUnderstanding; // Progressive understanding
  questionsAsked: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Site Understanding - AI's progressive understanding of what to build
 */
export interface SiteUnderstanding {
  purpose?: string; // What is this site for?
  audience?: string; // Who is it for?
  contentTypes?: ContentType[]; // What content will it have?
  features?: string[]; // What features are needed?
  design?: DesignPreferences; // Design preferences
  confidence: number; // 0-100, how confident is the AI?
}

/**
 * Content type definition (custom post type)
 */
export interface ContentType {
  name: string; // Display name
  slug: string; // Machine name
  description?: string;
  fields: ContentField[];
  taxonomies?: Taxonomy[];
  supports?: string[]; // title, editor, thumbnail, etc.
  icon?: string;
}

/**
 * Content field definition (ACF field)
 */
export interface ContentField {
  name: string;
  type: string; // text, textarea, image, wysiwyg, etc.
  label: string;
  required?: boolean;
  defaultValue?: any;
  instructions?: string;
}

/**
 * Taxonomy definition
 */
export interface Taxonomy {
  name: string;
  slug: string;
  hierarchical: boolean;
  labels?: Record<string, string>;
}

/**
 * Design preferences
 */
export interface DesignPreferences {
  colors?: {
    primary?: string;
    secondary?: string;
    text?: string;
    background?: string;
  };
  typography?: {
    headingFont?: string;
    bodyFont?: string;
  };
  style?: 'minimal' | 'modern' | 'classic' | 'bold';
}

/**
 * Figma design analysis result
 */
export interface FigmaAnalysis {
  fileKey: string;
  fileName: string;
  pages: FigmaPage[];
  designTokens: DesignTokens;
  components?: FigmaComponent[];
}

/**
 * Figma node (for page children)
 */
export interface FigmaNode {
  id: string;
  name: string;
  type: 'FRAME' | 'TEXT' | 'RECTANGLE' | 'GROUP' | 'COMPONENT' | 'INSTANCE' | 'VECTOR' | string;
  children?: FigmaNode[];
  characters?: string; // For TEXT nodes - actual content
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  fills?: any[];
  style?: any;
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
}

/**
 * Figma page
 */
export interface FigmaPage {
  id: string;
  name: string;
  type?: 'homepage' | 'content-page' | 'template' | 'component';
  children?: FigmaNode[]; // Page children for detailed page generation
}

/**
 * Figma component
 */
export interface FigmaComponent {
  id: string;
  name: string;
  description?: string;
}

/**
 * Design tokens extracted from Figma
 * Enhanced to support comprehensive CSS generation
 */
export interface DesignTokens {
  colors: {
    // Semantic colors
    primary: string;
    secondary: string;
    accent?: string;
    text: string;
    textMuted?: string;
    background: string;
    surface?: string;
    border?: string;
    // All named colors from Figma
    custom?: Record<string, string>;
    // Legacy support: allow direct string values
    [key: string]: string | Record<string, string> | undefined;
  };
  typography: {
    fontFamilies: string[];
    fontSizes: {
      xs?: string;
      sm?: string;
      base: string;
      lg?: string;
      xl?: string;
      '2xl'?: string;
      '3xl'?: string;
      '4xl'?: string;
      // Legacy support
      large?: string;
      [key: string]: string | undefined;
    };
    fontWeights?: {
      normal?: number;
      medium?: number;
      semibold?: number;
      bold?: number;
    };
    lineHeights: {
      tight?: string;
      normal?: string;
      relaxed?: string;
      // Legacy support
      base?: string;
      heading?: string;
      [key: string]: string | undefined;
    };
    letterSpacing?: {
      tight?: string;
      normal?: string;
      wide?: string;
    };
  };
  spacing: {
    xs?: string;
    sm: string;
    md: string;
    lg: string;
    xl?: string;
    '2xl'?: string;
    '3xl'?: string;
    [key: string]: string | undefined;
  };
  borderRadius: {
    none?: string;
    sm: string;
    md: string;
    lg?: string;
    xl?: string;
    full?: string;
    [key: string]: string | undefined;
  };
  shadows?: {
    sm?: string;
    md?: string;
    lg?: string;
  };
}

/**
 * Complete site structure - result of scaffolding process
 */
export interface SiteStructure {
  content: ContentPillar;
  design: DesignPillar;
  features: FeaturesPillar;
}

/**
 * Page structure - WordPress page to be created
 */
export interface PageStructure {
  title: string;
  slug: string;
  template?: string;
  content?: string;
}

/**
 * Content pillar - structure for content
 */
export interface ContentPillar {
  status: PillarStatus;
  postTypes: ContentType[];
  pages?: PageStructure[];
  menus?: MenuStructure[];
  homepage?: HomepageStructure;
}

/**
 * Design pillar - visual appearance
 */
export interface DesignPillar {
  status: PillarStatus;
  theme: ThemeConfig;
  templates?: Template[];
}

/**
 * Features pillar - functionality
 */
export interface FeaturesPillar {
  status: PillarStatus;
  plugins: PluginRecommendation[];
  customFeatures?: CustomFeature[];
}

/**
 * Pillar status
 */
export type PillarStatus = 'pending' | 'generating' | 'ready' | 'applied' | 'error';

/**
 * Menu structure
 */
export interface MenuStructure {
  name: string;
  location: string;
  items: MenuItem[];
}

/**
 * Menu item
 */
export interface MenuItem {
  title: string;
  url?: string;
  postType?: string;
  children?: MenuItem[];
}

/**
 * Homepage structure
 */
export interface HomepageStructure {
  type: 'posts' | 'page' | 'custom';
  template?: string;
  sections?: HomepageSection[];
}

/**
 * Homepage section
 */
export interface HomepageSection {
  type: 'hero' | 'features' | 'content' | 'cta' | 'custom';
  content?: string;
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  base: 'frost' | 'twentytwentyfive' | 'custom';
  childThemeName: string;
  designTokens: DesignTokens;
  customizations?: string[]; // List of customizations made
}

/**
 * Template
 */
export interface Template {
  name: string;
  type: 'single' | 'archive' | 'page' | 'front-page';
  postType?: string;
  content: string; // Template HTML/PHP code
}

/**
 * Plugin recommendation
 */
export interface PluginRecommendation {
  slug: string;
  name: string;
  reason: string; // Why AI recommends this
  required: boolean;
  confidence: number; // 0-100
}

/**
 * Custom feature (build vs plugin decision = build)
 */
export interface CustomFeature {
  name: string;
  description: string;
  implementation: 'shortcode' | 'block' | 'function';
  code?: string;
}

/**
 * IPC Request/Response types
 */

// Settings
export interface GetSettingsResponse {
  success: boolean;
  settings: UserSettings;
}

export interface UpdateSettingsRequest {
  settings: Partial<UserSettings>;
}

export interface UpdateSettingsResponse {
  success: boolean;
  error?: string;
}

// Conversation
export interface StartConversationRequest {
  projectId: string;
  entryPathway: EntryPathway;
  initialMessage?: string;
}

export interface StartConversationResponse {
  success: boolean;
  conversationId?: string;
  firstQuestion?: string;
  suggestions?: string[];
  error?: string;
}

export interface SendMessageRequest {
  conversationId: string;
  message: string;
}

export interface SendMessageResponse {
  success: boolean;
  reply?: string;
  suggestions?: string[];
  understanding?: SiteUnderstanding;
  completed?: boolean; // Is conversation complete?
  error?: string;
}

// Site creation
export interface CreateSiteRequest {
  projectId: string;
  siteName: string;
  siteDomain: string;
  structure?: SiteStructure;
  figmaAnalysis?: FigmaAnalysis; // Optional Figma analysis for enhanced design application
  adminEmail?: string;
  adminPassword?: string;
  environment?: {
    php?: string;
    webServer?: string;
    database?: string;
  };
}

export interface CreateSiteResponse {
  success: boolean;
  siteId?: string;
  error?: string;
}

// Structure generation
export interface GenerateStructureRequest {
  conversationId: string;
  figmaAnalysis?: FigmaAnalysis;
}

export interface GenerateStructureResponse {
  success: boolean;
  structure?: SiteStructure;
  error?: string;
}

export interface ApplyStructureRequest {
  siteId: string;
  structure: SiteStructure;
  pillars?: Pillar[]; // Which pillars to apply (or all if omitted)
}

export interface ApplyStructureResponse {
  success: boolean;
  results?: {
    content?: PillarResult;
    design?: PillarResult;
    features?: PillarResult;
  };
  error?: string;
}

export interface PillarResult {
  success: boolean;
  error?: string;
  details?: string;
}

// Figma
export interface ConnectFigmaRequest {
  fileUrl: string;
  token?: string; // Optional if already stored in settings
}

/**
 * Rate limit information from Figma API
 */
export interface FigmaRateLimitInfo {
  retryAfter: number; // seconds until rate limit resets
  upgradeLink?: string; // URL to upgrade Figma plan
  planTier?: string; // Current Figma plan tier
}

export interface ConnectFigmaResponse {
  success: boolean;
  fileKey?: string;
  fileName?: string;
  error?: string;
  // Rate limit info (only present when rateLimited is true)
  rateLimited?: boolean;
  rateLimitInfo?: FigmaRateLimitInfo;
}

export interface AnalyzeFigmaRequest {
  fileKey: string;
}

export interface AnalyzeFigmaResponse {
  success: boolean;
  analysis?: FigmaAnalysis;
  error?: string;
  // Rate limit info (only present when rateLimited is true)
  rateLimited?: boolean;
  rateLimitInfo?: FigmaRateLimitInfo;
}

// Projects
export interface GetProjectsResponse {
  success: boolean;
  projects: Project[];
}

export interface GetProjectRequest {
  projectId: string;
}

export interface GetProjectResponse {
  success: boolean;
  project?: Project;
  error?: string;
}

export interface UpdateProjectRequest {
  projectId: string;
  updates: Partial<Project>;
}

export interface UpdateProjectResponse {
  success: boolean;
  error?: string;
}

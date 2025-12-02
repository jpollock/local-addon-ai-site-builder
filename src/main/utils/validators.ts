/**
 * Input Validators - Zod schemas for validating all IPC handler inputs
 *
 * Provides comprehensive validation to prevent injection attacks, invalid data,
 * and path traversal vulnerabilities.
 */

import { z } from 'zod';

/**
 * UUID validator (for project IDs, conversation IDs)
 */
export const ProjectIdSchema = z.string().uuid('Invalid project ID format');

/**
 * Alternative ID schema for non-UUID IDs (like conv_timestamp_random)
 */
export const ConversationIdSchema = z.string()
  .min(1, 'Conversation ID cannot be empty')
  .max(255, 'Conversation ID too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Conversation ID contains invalid characters');

/**
 * Generic ID schema (allows both UUID and custom formats)
 */
export const GenericIdSchema = z.string()
  .min(1, 'ID cannot be empty')
  .max(255, 'ID too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'ID contains invalid characters');

/**
 * Site name validator
 */
export const SiteNameSchema = z.string()
  .min(1, 'Site name cannot be empty')
  .max(255, 'Site name too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Site name can only contain alphanumeric characters, hyphens, and underscores');

/**
 * Site domain validator
 */
export const SiteDomainSchema = z.string()
  .min(1, 'Site domain cannot be empty')
  .max(255, 'Site domain too long')
  .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/, 'Invalid domain format');

/**
 * Admin username validator
 */
export const AdminUserSchema = z.string()
  .min(1, 'Admin username cannot be empty')
  .max(100, 'Admin username too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Admin username can only contain alphanumeric characters, hyphens, and underscores');

/**
 * Admin password validator
 */
export const AdminPasswordSchema = z.string()
  .min(8, 'Admin password must be at least 8 characters')
  .max(255, 'Admin password too long');

/**
 * Email validator
 */
export const AdminEmailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email too long');

/**
 * API key validator
 */
export const ApiKeySchema = z.string()
  .min(1, 'API key cannot be empty')
  .max(500, 'API key too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'API key contains invalid characters');

/**
 * Provider type validator
 */
export const ProviderTypeSchema = z.enum(['claude', 'openai', 'gemini'], {
  errorMap: () => ({ message: 'Invalid provider type. Must be claude, openai, or gemini' }),
});

/**
 * Auth mode validators
 */
export const GeminiAuthModeSchema = z.enum(['api-key', 'oauth'], {
  errorMap: () => ({ message: 'Invalid auth mode. Must be api-key or oauth' }),
});

export const FigmaAuthModeSchema = z.enum(['pat', 'oauth'], {
  errorMap: () => ({ message: 'Invalid auth mode. Must be pat or oauth' }),
});

/**
 * Figma URL validator
 */
export const FigmaUrlSchema = z.string()
  .url('Invalid URL format')
  .refine(
    (url) => {
      const pattern = /figma\.com\/(?:file|design|proto|board)\/([a-zA-Z0-9]+)/;
      return pattern.test(url);
    },
    { message: 'Invalid Figma URL. Must be a figma.com/file or figma.com/design URL' }
  );

/**
 * Conversation message validator
 */
export const ConversationMessageSchema = z.string()
  .min(1, 'Message cannot be empty')
  .max(10000, 'Message too long (max 10000 characters)');

/**
 * File key validator (for Figma file keys)
 */
export const FileKeySchema = z.string()
  .min(1, 'File key cannot be empty')
  .max(100, 'File key too long')
  .regex(/^[a-zA-Z0-9]+$/, 'File key contains invalid characters');

/**
 * Environment configuration validator
 */
export const EnvironmentSchema = z.object({
  php: z.string().optional(),
  webServer: z.string().optional(),
  database: z.string().optional(),
}).optional();

/**
 * Request validators for IPC handlers
 */

export const StartConversationRequestSchema = z.object({
  projectId: GenericIdSchema,
  initialMessage: ConversationMessageSchema.optional(),
  entryPathway: z.enum([
    'describe',
    'figma',
    'quick-setup',
    'examples',
    'improve',
    'test-quick-review',
    'test-quick-build',
  ]).optional(),
});

export const SendMessageRequestSchema = z.object({
  conversationId: ConversationIdSchema,
  message: ConversationMessageSchema,
});

export const CreateSiteRequestSchema = z.object({
  projectId: GenericIdSchema,
  siteName: SiteNameSchema,
  siteDomain: SiteDomainSchema,
  adminEmail: AdminEmailSchema.optional(),
  adminPassword: AdminPasswordSchema.optional(),
  environment: EnvironmentSchema,
  structure: z.any().optional(), // Complex structure, validated separately
  figmaAnalysis: z.any().optional(), // Complex structure, validated separately
});

export const UpdateProjectRequestSchema = z.object({
  projectId: GenericIdSchema,
  updates: z.object({}).passthrough(), // Allow any updates, but validate projectId
});

export const ConnectFigmaRequestSchema = z.object({
  fileUrl: FigmaUrlSchema,
  token: z.string().max(500).optional(),
});

export const AnalyzeFigmaRequestSchema = z.object({
  fileKey: FileKeySchema,
});

export const ValidateApiKeyRequestSchema = z.object({
  provider: ProviderTypeSchema,
  apiKey: ApiKeySchema,
});

export const SetActiveProviderRequestSchema = z.object({
  provider: ProviderTypeSchema,
});

export const SetGeminiAuthModeRequestSchema = z.object({
  mode: GeminiAuthModeSchema,
});

export const SetFigmaAuthModeRequestSchema = z.object({
  mode: FigmaAuthModeSchema,
});

/**
 * Validation helper function
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: messages };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Path traversal prevention
 * Validates that a path doesn't contain traversal attempts
 */
export function validatePath(inputPath: string): boolean {
  // Check for path traversal patterns
  const dangerousPatterns = [
    /\.\./,  // Parent directory references
    /~\//,   // Home directory expansion
    /\/\//,  // Double slashes
    /\0/,    // Null bytes
  ];

  return !dangerousPatterns.some(pattern => pattern.test(inputPath));
}

/**
 * Sanitize path to prevent traversal
 */
export function sanitizePath(inputPath: string): string {
  // Remove any path traversal attempts
  return inputPath
    .replace(/\.\./g, '')
    .replace(/~\//g, '')
    .replace(/\/\//g, '/')
    .replace(/\0/g, '');
}

/**
 * Sanitize string for PHP code generation
 * Prevents PHP injection by escaping single quotes and removing dangerous characters
 */
export function sanitizeForPHP(input: string): string {
  if (!input) return '';

  return input
    // Escape single quotes for PHP strings
    .replace(/'/g, "\\'")
    // Remove PHP opening/closing tags
    .replace(/<\?php/gi, '')
    .replace(/<\?/g, '')
    .replace(/\?>/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove backslash sequences that could break PHP
    .replace(/\\(?=[nrtv\\])/g, '\\\\');
}

/**
 * Sanitize string for WordPress content injection
 * Removes potentially dangerous content before inserting into WordPress
 */
export function sanitizeForWordPress(input: string): string {
  if (!input) return '';

  return input
    // Remove script tags (basic XSS prevention)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/\son\w+\s*=/gi, ' data-removed=')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove data: URLs (potential XSS vector)
    .replace(/data:/gi, '')
    // Remove null bytes
    .replace(/\0/g, '');
}

/**
 * Sanitize slug for WordPress (must be alphanumeric with hyphens/underscores)
 */
export function sanitizeSlug(input: string): string {
  if (!input) return '';

  return input
    .toLowerCase()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove any character that isn't alphanumeric, hyphen, or underscore
    .replace(/[^a-z0-9-_]/g, '')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Sanitize name for display (allows more characters but still safe)
 */
export function sanitizeName(input: string): string {
  if (!input) return '';

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Limit length
    .substring(0, 200)
    .trim();
}

/**
 * Sanitize for shell command arguments
 * Escapes shell metacharacters
 */
export function sanitizeForShell(input: string): string {
  if (!input) return '';

  // For WP-CLI, we need to escape shell metacharacters
  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Escape single quotes by ending quote, adding escaped quote, starting quote again
    .replace(/'/g, "'\\''")
    // Escape double quotes
    .replace(/"/g, '\\"')
    // Escape backticks
    .replace(/`/g, '\\`')
    // Escape dollar signs
    .replace(/\$/g, '\\$')
    // Escape backslashes
    .replace(/\\/g, '\\\\');
}

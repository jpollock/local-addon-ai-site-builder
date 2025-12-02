/**
 * Tests for input validators
 */

import {
  ProjectIdSchema,
  ConversationIdSchema,
  GenericIdSchema,
  SiteNameSchema,
  SiteDomainSchema,
  AdminUserSchema,
  AdminPasswordSchema,
  AdminEmailSchema,
  ApiKeySchema,
  ProviderTypeSchema,
  FigmaUrlSchema,
  ConversationMessageSchema,
  validateInput,
  validatePath,
  sanitizePath,
} from '../../src/main/utils/validators';

describe('Input Validators', () => {
  describe('GenericIdSchema', () => {
    it('should accept valid IDs', () => {
      const result = validateInput(GenericIdSchema, 'project_123-abc');
      expect(result.success).toBe(true);
    });

    it('should reject IDs with invalid characters', () => {
      const result = validateInput(GenericIdSchema, 'project/123');
      expect(result.success).toBe(false);
    });

    it('should reject empty IDs', () => {
      const result = validateInput(GenericIdSchema, '');
      expect(result.success).toBe(false);
    });

    it('should reject IDs that are too long', () => {
      const result = validateInput(GenericIdSchema, 'a'.repeat(256));
      expect(result.success).toBe(false);
    });
  });

  describe('SiteNameSchema', () => {
    it('should accept valid site names', () => {
      const result = validateInput(SiteNameSchema, 'my-awesome-site');
      expect(result.success).toBe(true);
    });

    it('should reject site names with spaces', () => {
      const result = validateInput(SiteNameSchema, 'my site');
      expect(result.success).toBe(false);
    });

    it('should reject site names with special characters', () => {
      const result = validateInput(SiteNameSchema, 'my@site!');
      expect(result.success).toBe(false);
    });
  });

  describe('SiteDomainSchema', () => {
    it('should accept valid domains', () => {
      const result = validateInput(SiteDomainSchema, 'example.com');
      expect(result.success).toBe(true);
    });

    it('should accept subdomains', () => {
      const result = validateInput(SiteDomainSchema, 'subdomain.example.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid domains', () => {
      const result = validateInput(SiteDomainSchema, 'invalid..domain');
      expect(result.success).toBe(false);
    });
  });

  describe('AdminPasswordSchema', () => {
    it('should accept passwords with minimum length', () => {
      const result = validateInput(AdminPasswordSchema, 'password123');
      expect(result.success).toBe(true);
    });

    it('should reject passwords that are too short', () => {
      const result = validateInput(AdminPasswordSchema, 'short');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('at least 8 characters');
      }
    });
  });

  describe('AdminEmailSchema', () => {
    it('should accept valid emails', () => {
      const result = validateInput(AdminEmailSchema, 'user@example.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid emails', () => {
      const result = validateInput(AdminEmailSchema, 'invalid-email');
      expect(result.success).toBe(false);
    });
  });

  describe('ApiKeySchema', () => {
    it('should accept valid API keys', () => {
      const result = validateInput(ApiKeySchema, 'sk-ant-1234567890abcdef');
      expect(result.success).toBe(true);
    });

    it('should reject empty API keys', () => {
      const result = validateInput(ApiKeySchema, '');
      expect(result.success).toBe(false);
    });

    it('should reject API keys with invalid characters', () => {
      const result = validateInput(ApiKeySchema, 'sk-ant-!@#$%');
      expect(result.success).toBe(false);
    });
  });

  describe('ProviderTypeSchema', () => {
    it('should accept valid providers', () => {
      expect(validateInput(ProviderTypeSchema, 'claude').success).toBe(true);
      expect(validateInput(ProviderTypeSchema, 'openai').success).toBe(true);
      expect(validateInput(ProviderTypeSchema, 'gemini').success).toBe(true);
    });

    it('should reject invalid providers', () => {
      const result = validateInput(ProviderTypeSchema, 'invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('FigmaUrlSchema', () => {
    it('should accept valid Figma file URLs', () => {
      const result = validateInput(FigmaUrlSchema, 'https://www.figma.com/file/abc123/My-Design');
      expect(result.success).toBe(true);
    });

    it('should accept valid Figma design URLs', () => {
      const result = validateInput(FigmaUrlSchema, 'https://www.figma.com/design/abc123/My-Design');
      expect(result.success).toBe(true);
    });

    it('should reject invalid URLs', () => {
      const result = validateInput(FigmaUrlSchema, 'https://example.com');
      expect(result.success).toBe(false);
    });

    it('should reject Figma site URLs', () => {
      const result = validateInput(FigmaUrlSchema, 'https://www.figma.com/site/abc123');
      expect(result.success).toBe(false);
    });
  });

  describe('ConversationMessageSchema', () => {
    it('should accept valid messages', () => {
      const result = validateInput(ConversationMessageSchema, 'This is a valid message');
      expect(result.success).toBe(true);
    });

    it('should reject empty messages', () => {
      const result = validateInput(ConversationMessageSchema, '');
      expect(result.success).toBe(false);
    });

    it('should reject messages that are too long', () => {
      const result = validateInput(ConversationMessageSchema, 'a'.repeat(10001));
      expect(result.success).toBe(false);
    });
  });

  describe('Path Security', () => {
    it('should detect path traversal attempts', () => {
      expect(validatePath('../etc/passwd')).toBe(false);
      expect(validatePath('../../secret')).toBe(false);
      expect(validatePath('~/secret')).toBe(false);
    });

    it('should allow valid paths', () => {
      expect(validatePath('project-123')).toBe(true);
      expect(validatePath('folder/file.txt')).toBe(true);
    });

    it('should sanitize dangerous paths', () => {
      // sanitizePath removes '..' but keeps other path elements
      expect(sanitizePath('../etc/passwd')).toBe('/etc/passwd');
      expect(sanitizePath('../../secret')).toBe('/secret');
      expect(sanitizePath('~/secret')).toBe('secret');
    });
  });
});

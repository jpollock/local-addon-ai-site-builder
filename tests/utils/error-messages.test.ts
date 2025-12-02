/**
 * Tests for error message formatting utility
 */

import { formatError, ErrorCategory, ErrorMessages } from '../../src/main/utils/error-messages';

describe('Error Messages Utility', () => {
  describe('formatError', () => {
    it('should format network errors correctly', () => {
      const error = new Error('ECONNREFUSED connection failed');
      const result = formatError(error);

      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.title).toBe('Connection Failed');
      expect(result.recoverable).toBe(true);
      expect(result.retryable).toBe(true);
    });

    it('should format auth errors correctly', () => {
      const error = { message: 'Invalid API Key', status: 401 };
      const result = formatError(error);

      expect(result.category).toBe(ErrorCategory.AUTH);
      expect(result.title).toBe('Invalid API Key');
      expect(result.recoverable).toBe(false);
      expect(result.retryable).toBe(false);
    });

    it('should format timeout errors correctly', () => {
      const error = new Error('Request timed out');
      const result = formatError(error);

      expect(result.category).toBe(ErrorCategory.TIMEOUT);
      expect(result.title).toBe('Request Timed Out');
      expect(result.recoverable).toBe(true);
      expect(result.retryable).toBe(true);
    });

    it('should format rate limit errors correctly', () => {
      const error = { message: 'Rate limit exceeded', status: 429 };
      const result = formatError(error);

      expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(result.title).toBe('Rate Limit Exceeded');
      expect(result.recoverable).toBe(true);
      expect(result.retryable).toBe(true);
    });

    it('should format validation errors correctly', () => {
      const error = new Error('Validation failed: invalid email');
      const result = formatError(error);

      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.title).toBe('Invalid Input');
      expect(result.recoverable).toBe(false);
      expect(result.retryable).toBe(false);
    });

    it('should format OAuth errors correctly', () => {
      const error = new Error('OAuth token expired');
      const result = formatError(error);

      expect(result.category).toBe(ErrorCategory.OAUTH);
      expect(result.title).toBe('Session Expired');
      expect(result.action).toContain('sign in again');
    });

    it('should format file system errors correctly', () => {
      const error = { message: 'ENOENT: no such file or directory' };
      const result = formatError(error);

      expect(result.category).toBe(ErrorCategory.FILE_SYSTEM);
      expect(result.title).toBe('File Not Found');
    });

    it('should format API errors with status codes', () => {
      const error = { message: 'Server error', status: 503 };
      const result = formatError(error);

      expect(result.category).toBe(ErrorCategory.API_ERROR);
      expect(result.code).toBe('503');
      expect(result.recoverable).toBe(true);
      expect(result.retryable).toBe(true);
    });

    it('should handle unknown errors gracefully', () => {
      const error = new Error('Some random error');
      const result = formatError(error);

      expect(result.category).toBe(ErrorCategory.INTERNAL);
      expect(result.title).toBe('Unexpected Error');
      expect(result.technical).toBe('Some random error');
    });

    it('should handle null/undefined errors', () => {
      const result = formatError(null);

      expect(result.category).toBe(ErrorCategory.INTERNAL);
      expect(result.title).toBe('Unknown Error');
    });

    it('should include context in error messages', () => {
      const error = new Error('Invalid API Key');
      const result = formatError(error, 'Claude');

      expect(result.message).toContain('Claude');
    });
  });

  describe('ErrorMessages', () => {
    it('should provide network unavailable message', () => {
      const error = ErrorMessages.NETWORK_UNAVAILABLE;

      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.recoverable).toBe(true);
    });

    it('should provide invalid API key message for provider', () => {
      const error = ErrorMessages.INVALID_API_KEY('Claude');

      expect(error.category).toBe(ErrorCategory.AUTH);
      expect(error.message).toContain('Claude');
      expect(error.recoverable).toBe(false);
    });

    it('should provide missing API key message for provider', () => {
      const error = ErrorMessages.MISSING_API_KEY('OpenAI');

      expect(error.category).toBe(ErrorCategory.AUTH);
      expect(error.message).toContain('OpenAI');
    });

    it('should provide OAuth expired message', () => {
      const error = ErrorMessages.OAUTH_EXPIRED;

      expect(error.category).toBe(ErrorCategory.OAUTH);
      expect(error.message).toContain('expired');
    });

    it('should provide Figma invalid URL message', () => {
      const error = ErrorMessages.FIGMA_INVALID_URL;

      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.message).toContain('Figma URL');
    });

    it('should provide file not found message with path', () => {
      const error = ErrorMessages.FILE_NOT_FOUND('/path/to/file');

      expect(error.category).toBe(ErrorCategory.FILE_SYSTEM);
      expect(error.message).toContain('/path/to/file');
    });
  });
});

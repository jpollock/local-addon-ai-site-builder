/**
 * Google OAuth Service Tests
 *
 * Tests for Google OAuth flow, token management, and PKCE implementation.
 * Target: 80%+ code coverage
 */

import { GoogleOAuthService, GoogleOAuthTokens } from '../../src/main/google-oauth';
import { TEST_GOOGLE_OAUTH_TOKENS, createExpiredGoogleTokens } from '../helpers/test-fixtures';
import * as http from 'http';

// Mock dependencies
jest.mock('electron', () => ({
  shell: {
    openExternal: jest.fn(),
  },
}));

jest.mock('../../src/common/oauth-config', () => ({
  GOOGLE_OAUTH_CONFIG: {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    scopes: ['https://www.googleapis.com/auth/generative-language'],
    callbackPath: '/callback',
    callbackPortRange: { start: 8080, end: 8090 },
  },
  getCallbackUrl: jest.fn((port: number) => `http://localhost:${port}/callback`),
  isOAuthConfigured: jest.fn(() => true),
}));

jest.mock('google-auth-library');

import { OAuth2Client } from 'google-auth-library';
import { shell } from 'electron';

describe('GoogleOAuthService', () => {
  let oauthService: GoogleOAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    oauthService = new GoogleOAuthService();
  });

  describe('isConfigured', () => {
    it('should return true when OAuth is configured', () => {
      expect(oauthService.isConfigured()).toBe(true);
    });

    it('should return false when OAuth is not configured', () => {
      const { isOAuthConfigured } = require('../../src/common/oauth-config');
      isOAuthConfigured.mockReturnValueOnce(false);

      const service = new GoogleOAuthService();
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('startOAuthFlow', () => {
    it('should return error if not configured', async () => {
      const { isOAuthConfigured } = require('../../src/common/oauth-config');
      isOAuthConfigured.mockReturnValue(false);

      const service = new GoogleOAuthService();
      const result = await service.startOAuthFlow();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    // Skip: Fake timers interact poorly with async HTTP server initialization
    it.skip('should handle timeout during OAuth flow', async () => {
      // Ensure OAuth is configured for this test
      const { isOAuthConfigured } = require('../../src/common/oauth-config');
      isOAuthConfigured.mockReturnValue(true);

      jest.useFakeTimers();

      const flowPromise = oauthService.startOAuthFlow();

      // Fast-forward past the timeout
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000);

      const result = await flowPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled or timed out');

      jest.useRealTimers();
    }, 10000);
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      const mockOAuth2Client = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockResolvedValue({
          credentials: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expiry_date: Date.now() + 3600000,
          },
        }),
      };

      (OAuth2Client as unknown as jest.Mock).mockReturnValue(mockOAuth2Client);

      const result = await oauthService.refreshAccessToken('test-refresh-token');

      expect(result.success).toBe(true);
      expect(result.tokens?.accessToken).toBe('new-access-token');
      expect(result.tokens?.refreshToken).toBe('new-refresh-token');
    });

    it('should handle refresh failures', async () => {
      const mockOAuth2Client = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockRejectedValue(new Error('Invalid refresh token')),
      };

      (OAuth2Client as unknown as jest.Mock).mockReturnValue(mockOAuth2Client);

      const result = await oauthService.refreshAccessToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid refresh token');
    });

    it('should use existing refresh token if new one not provided', async () => {
      const mockOAuth2Client = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockResolvedValue({
          credentials: {
            access_token: 'new-access-token',
            expiry_date: Date.now() + 3600000,
          },
        }),
      };

      (OAuth2Client as unknown as jest.Mock).mockReturnValue(mockOAuth2Client);

      const result = await oauthService.refreshAccessToken('original-refresh-token');

      expect(result.success).toBe(true);
      expect(result.tokens?.refreshToken).toBe('original-refresh-token');
    });
  });

  describe('validateAndRefreshTokens', () => {
    it('should return tokens if not expired', async () => {
      const tokens: GoogleOAuthTokens = {
        ...TEST_GOOGLE_OAUTH_TOKENS,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes in future
      };

      const result = await oauthService.validateAndRefreshTokens(tokens);

      expect(result.success).toBe(true);
      expect(result.tokens).toEqual(tokens);
    });

    it('should refresh tokens if expiring soon', async () => {
      const tokens: GoogleOAuthTokens = {
        ...TEST_GOOGLE_OAUTH_TOKENS,
        expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes in future (within 5min buffer)
        refreshToken: 'test-refresh-token',
      };

      const mockOAuth2Client = {
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn().mockResolvedValue({
          credentials: {
            access_token: 'refreshed-access-token',
            refresh_token: 'test-refresh-token',
            expiry_date: Date.now() + 3600000,
          },
        }),
      };

      (OAuth2Client as unknown as jest.Mock).mockReturnValue(mockOAuth2Client);

      const result = await oauthService.validateAndRefreshTokens(tokens);

      expect(result.success).toBe(true);
      expect(result.tokens?.accessToken).toBe('refreshed-access-token');
    });

    it('should return error if token expired and no refresh token', async () => {
      const tokens: GoogleOAuthTokens = {
        ...TEST_GOOGLE_OAUTH_TOKENS,
        expiresAt: Date.now() - 1000, // Expired
        refreshToken: undefined,
      };

      const result = await oauthService.validateAndRefreshTokens(tokens);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no refresh token available');
    });
  });
});

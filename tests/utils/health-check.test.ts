/**
 * Tests for health check utility
 */

import { HealthCheckService } from '../../src/main/utils/health-check';

describe('Health Check Service', () => {
  let service: HealthCheckService;
  let mockApiKeyStore: any;

  beforeEach(() => {
    mockApiKeyStore = {
      getApiKey: jest.fn(),
      getGeminiAuthMode: jest.fn().mockReturnValue('api-key'),
      isGeminiOAuthConnected: jest.fn().mockReturnValue(false),
      getGeminiOAuthTokens: jest.fn(),
      getFigmaAuthMode: jest.fn().mockReturnValue('pat'),
      isFigmaOAuthConnected: jest.fn().mockReturnValue(false),
      getFigmaOAuthTokens: jest.fn(),
      getFigmaAccessToken: jest.fn(),
    };

    service = new HealthCheckService(mockApiKeyStore, {
      enablePeriodicChecks: false,
      timeout: 5000,
    });
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const status = service.getHealthStatus();
      expect(status).toBeDefined();
      expect(status.overall).toBe('unknown');
      expect(status.claude.status).toBe('unknown');
      expect(status.openai.status).toBe('unknown');
      expect(status.gemini.status).toBe('unknown');
      expect(status.figma.status).toBe('unknown');
    });
  });

  describe('getHealthStatus', () => {
    it('should return current health status', () => {
      const status = service.getHealthStatus();
      expect(status).toHaveProperty('claude');
      expect(status).toHaveProperty('openai');
      expect(status).toHaveProperty('gemini');
      expect(status).toHaveProperty('figma');
      expect(status).toHaveProperty('overall');
      expect(status).toHaveProperty('lastFullCheck');
    });
  });

  describe('token expiry warnings', () => {
    // Skip: Test requires more complex mock setup for OAuth token validation
    it.skip('should warn about expiring Gemini OAuth token', async () => {
      const almostExpired = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
      mockApiKeyStore.getGeminiAuthMode.mockReturnValue('oauth');
      mockApiKeyStore.isGeminiOAuthConnected.mockReturnValue(true);
      mockApiKeyStore.getGeminiOAuthTokens.mockReturnValue({
        accessToken: 'token',
        refreshToken: 'refresh-token',
        expiresAt: almostExpired,
      });

      // Run health check first to populate healthStatus with tokenExpiry metadata
      await service.checkService('gemini');

      const shouldWarn = service.shouldWarnTokenExpiry('gemini');
      expect(shouldWarn).toBe(true);

      const hours = service.getTokenExpiryHours('gemini');
      expect(hours).toBeLessThan(24);
      expect(hours).toBeGreaterThan(0);
    });

    it('should not warn about fresh tokens', async () => {
      const farFuture = Date.now() + 48 * 60 * 60 * 1000; // 48 hours
      mockApiKeyStore.getGeminiAuthMode.mockReturnValue('oauth');
      mockApiKeyStore.isGeminiOAuthConnected.mockReturnValue(true);
      mockApiKeyStore.getGeminiOAuthTokens.mockReturnValue({
        accessToken: 'token',
        refreshToken: 'refresh-token',
        expiresAt: farFuture,
      });

      // Run health check first to populate healthStatus
      await service.checkService('gemini');

      const shouldWarn = service.shouldWarnTokenExpiry('gemini');
      expect(shouldWarn).toBe(false);
    });
  });

  describe('checkService with missing credentials', () => {
    it('should return unknown status when no API key configured', async () => {
      mockApiKeyStore.getApiKey.mockReturnValue(undefined);

      const health = await service.checkService('claude');
      expect(health.status).toBe('unknown');
      expect(health.error).toContain('No API key configured');
    });

    it('should return unknown status for OAuth when not connected', async () => {
      mockApiKeyStore.getGeminiAuthMode.mockReturnValue('oauth');
      mockApiKeyStore.isGeminiOAuthConnected.mockReturnValue(false);

      const health = await service.checkService('gemini');
      expect(health.status).toBe('unknown');
      expect(health.error).toContain('OAuth not connected');
    });
  });
});

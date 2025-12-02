/**
 * Mock Local Services
 *
 * Provides mock implementations of Local's core services for testing.
 * Simulates the behavior of LocalMain services without actual system dependencies.
 */

/**
 * Mock logger service
 */
export const mockLocalLogger = {
  info: jest.fn((...args: any[]) => {
    // Optionally log during tests for debugging
    // console.log('[INFO]', ...args);
  }),
  warn: jest.fn((...args: any[]) => {
    // console.warn('[WARN]', ...args);
  }),
  error: jest.fn((...args: any[]) => {
    // console.error('[ERROR]', ...args);
  }),
  debug: jest.fn((...args: any[]) => {
    // console.debug('[DEBUG]', ...args);
  }),
};

/**
 * Mock addSite service
 */
export const mockAddSiteService = {
  addSite: jest.fn(async (options: any) => {
    return {
      id: 'test-site-id-' + Date.now(),
      name: options.newSiteInfo.siteName,
      path: options.newSiteInfo.sitePath,
      domain: options.newSiteInfo.siteDomain,
    };
  }),
};

/**
 * Mock userData service
 */
export const mockUserData = {
  get: jest.fn((key: string, defaultValue?: any) => {
    if (key === 'newSiteDefaults') {
      return {
        sitesPath: '/mock/local/sites',
        phpVersion: '8.2.0',
        webServer: 'nginx',
        database: '8.0.16',
      };
    }
    return defaultValue;
  }),
  set: jest.fn(),
};

/**
 * Mock service container
 */
export const mockServiceContainer = {
  cradle: {
    localLogger: mockLocalLogger,
    addSite: mockAddSiteService,
    userData: mockUserData,
  },
};

/**
 * Reset all mocks
 */
export function resetMockServices(): void {
  mockLocalLogger.info.mockClear();
  mockLocalLogger.warn.mockClear();
  mockLocalLogger.error.mockClear();
  mockLocalLogger.debug.mockClear();
  mockAddSiteService.addSite.mockClear();
  mockUserData.get.mockClear();
  mockUserData.set.mockClear();
}

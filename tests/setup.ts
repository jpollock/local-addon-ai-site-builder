/**
 * Jest Test Setup
 *
 * Configures the test environment for AI Site Builder addon tests.
 */

// Suppress console.log during tests (optional - uncomment to enable)
// global.console.log = jest.fn();

// Set a longer timeout for async tests
jest.setTimeout(10000);

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

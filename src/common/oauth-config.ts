/**
 * Google OAuth Configuration for Gemini API
 *
 * Uses PKCE (Proof Key for Code Exchange) flow for secure desktop authentication.
 * No client secret is required - PKCE provides the security.
 *
 * For production use:
 * 1. Create your own Google Cloud project
 * 2. Enable the "Generative Language API"
 * 3. Create OAuth 2.0 Client ID (Desktop app type)
 * 4. Go through Google's verification process
 * 5. Replace the Client ID below with your own
 */

/**
 * Google OAuth configuration for desktop apps
 * Uses PKCE flow (RFC 7636) - no client secret needed for public clients
 */
export const GOOGLE_OAUTH_CONFIG = {
  /**
   * OAuth 2.0 Client ID from Google Cloud Console
   * Create at: https://console.cloud.google.com/apis/credentials
   * Application type: Desktop app
   *
   * IMPORTANT: Replace with your own Client ID for production
   */
  clientId: '212814026888-os3s88el0in5ei17l6849cr7ajiehnfm.apps.googleusercontent.com',

  /**
   * OAuth scopes for Gemini API access
   * See: https://ai.google.dev/gemini-api/docs/oauth
   *
   * IMPORTANT: The "Generative Language API" must be enabled in Google Cloud Console
   * Enable at: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
   */
  scopes: [
    'https://www.googleapis.com/auth/generative-language.retriever',
    'openid',
    'email', // To display connected user's email
  ],

  /**
   * OAuth endpoints
   */
  authUri: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUri: 'https://oauth2.googleapis.com/token',

  /**
   * Localhost port range for OAuth callback
   * We'll try ports in this range to find an available one
   */
  callbackPortRange: {
    start: 49152,
    end: 65535,
  },

  /**
   * Callback path for OAuth redirect
   */
  callbackPath: '/oauth/callback',
};

/**
 * Check if OAuth is properly configured (not using placeholder)
 */
export function isOAuthConfigured(): boolean {
  return !GOOGLE_OAUTH_CONFIG.clientId.includes('PLACEHOLDER');
}

/**
 * Get the full callback URL for a given port
 */
export function getCallbackUrl(port: number): string {
  return `http://localhost:${port}${GOOGLE_OAUTH_CONFIG.callbackPath}`;
}

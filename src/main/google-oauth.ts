/**
 * Google OAuth Service - Handles OAuth 2.0 flow for Gemini API
 *
 * Implements the "Installed Applications" flow with PKCE for desktop apps.
 * Uses PKCE (RFC 7636) for security - no client secret required.
 *
 * Flow:
 * 1. Generate PKCE code verifier and challenge
 * 2. Start localhost server to receive callback
 * 3. Open browser for user to authenticate
 * 4. Receive auth code via callback
 * 5. Exchange code for tokens (using PKCE code_verifier)
 * 6. Store tokens securely
 * 7. Auto-refresh tokens before expiry
 */

import * as http from 'http';
import * as crypto from 'crypto';
import * as url from 'url';
import { shell } from 'electron';
import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import { GOOGLE_OAUTH_CONFIG, getCallbackUrl, isOAuthConfigured } from '../common/oauth-config';

/**
 * OAuth tokens with metadata
 */
export interface GoogleOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp
  email?: string;
  idToken?: string;
}

/**
 * OAuth flow result
 */
export interface OAuthFlowResult {
  success: boolean;
  tokens?: GoogleOAuthTokens;
  error?: string;
}

/**
 * Google OAuth Service
 */
export class GoogleOAuthService {
  private oauth2Client: OAuth2Client | null = null;
  private server: http.Server | null = null;
  private currentPort: number = 0;
  private codeVerifier: string = '';

  constructor() {
    // OAuth2Client will be initialized when starting the flow
  }

  /**
   * Check if OAuth is properly configured
   */
  isConfigured(): boolean {
    return isOAuthConfigured();
  }

  /**
   * Start the OAuth flow
   * Opens browser for user authentication
   */
  async startOAuthFlow(): Promise<OAuthFlowResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Google OAuth is not configured. Please set up OAuth credentials.',
      };
    }

    try {
      // Find an available port
      this.currentPort = await this.findAvailablePort();
      const redirectUri = getCallbackUrl(this.currentPort);

      // Initialize OAuth2 client (no client secret - using PKCE)
      this.oauth2Client = new OAuth2Client({
        clientId: GOOGLE_OAUTH_CONFIG.clientId,
        redirectUri,
      });

      // Generate PKCE code verifier and challenge
      this.codeVerifier = this.generateCodeVerifier();

      // Start local server to receive callback (it generates the auth URL and opens browser)
      const authCode = await this.startCallbackServer();

      if (!authCode) {
        return {
          success: false,
          error: 'OAuth flow was cancelled or timed out',
        };
      }

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(authCode);

      return {
        success: true,
        tokens,
      };
    } catch (error: any) {
      console.error('[Google OAuth] Error during OAuth flow:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete OAuth flow',
      };
    } finally {
      this.cleanup();
    }
  }

  /**
   * Refresh an access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthFlowResult> {
    try {
      const oauth2Client = new OAuth2Client({
        clientId: GOOGLE_OAUTH_CONFIG.clientId,
      });

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        return {
          success: false,
          error: 'Failed to refresh access token',
        };
      }

      return {
        success: true,
        tokens: {
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token || refreshToken,
          expiresAt: credentials.expiry_date || Date.now() + 3600000, // Default 1 hour
          idToken: credentials.id_token || undefined,
        },
      };
    } catch (error: any) {
      console.error('[Google OAuth] Error refreshing token:', error);
      return {
        success: false,
        error: error.message || 'Failed to refresh token',
      };
    }
  }

  /**
   * Validate tokens and refresh if needed
   */
  async validateAndRefreshTokens(tokens: GoogleOAuthTokens): Promise<OAuthFlowResult> {
    // Check if token is expired or will expire in 5 minutes
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    const isExpired = tokens.expiresAt < Date.now() + expiryBuffer;

    if (!isExpired) {
      return {
        success: true,
        tokens,
      };
    }

    // Token is expired, try to refresh
    if (tokens.refreshToken) {
      return this.refreshAccessToken(tokens.refreshToken);
    }

    return {
      success: false,
      error: 'Token expired and no refresh token available',
    };
  }

  /**
   * Find an available port in the configured range
   */
  private async findAvailablePort(): Promise<number> {
    const { start, end } = GOOGLE_OAUTH_CONFIG.callbackPortRange;

    for (let port = start; port <= end; port++) {
      const isAvailable = await this.isPortAvailable(port);
      if (isAvailable) {
        return port;
      }
    }

    throw new Error('No available ports found for OAuth callback');
  }

  /**
   * Check if a port is available
   */
  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = http.createServer();
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      server.on('error', () => resolve(false));
    });
  }

  /**
   * Start local HTTP server to receive OAuth callback
   */
  private startCallbackServer(): Promise<string | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(
        () => {
          console.log('[Google OAuth] OAuth flow timed out');
          this.cleanup();
          resolve(null);
        },
        5 * 60 * 1000
      ); // 5 minute timeout

      this.server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url || '', true);

        if (parsedUrl.pathname === GOOGLE_OAUTH_CONFIG.callbackPath) {
          const code = parsedUrl.query.code as string;
          const error = parsedUrl.query.error as string;

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5;">
                  <div style="text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #d32f2f;">Authentication Failed</h2>
                    <p style="color: #666;">Error: ${error}</p>
                    <p style="color: #999; font-size: 14px;">You can close this window.</p>
                  </div>
                </body>
              </html>
            `);
            clearTimeout(timeout);
            resolve(null);
          } else if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5;">
                  <div style="text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #4caf50;">Successfully Connected!</h2>
                    <p style="color: #666;">You can close this window and return to Local.</p>
                  </div>
                </body>
              </html>
            `);
            clearTimeout(timeout);
            resolve(code);
          } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing authorization code');
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        }
      });

      this.server.listen(this.currentPort, () => {
        console.log(`[Google OAuth] Callback server started on port ${this.currentPort}`);

        // Open browser for authentication
        const authUrl = this.oauth2Client!.generateAuthUrl({
          access_type: 'offline',
          scope: GOOGLE_OAUTH_CONFIG.scopes,
          code_challenge: this.generateCodeChallenge(this.codeVerifier),
          code_challenge_method: CodeChallengeMethod.S256,
          prompt: 'consent',
        });

        console.log('[Google OAuth] Opening browser for authentication');
        shell.openExternal(authUrl);
      });

      this.server.on('error', (err) => {
        console.error('[Google OAuth] Server error:', err);
        clearTimeout(timeout);
        resolve(null);
      });
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(code: string): Promise<GoogleOAuthTokens> {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    const { tokens } = await this.oauth2Client.getToken({
      code,
      codeVerifier: this.codeVerifier,
    });

    // Get user email from ID token
    let email: string | undefined;
    if (tokens.id_token) {
      try {
        const ticket = await this.oauth2Client.verifyIdToken({
          idToken: tokens.id_token,
          audience: GOOGLE_OAUTH_CONFIG.clientId,
        });
        const payload = ticket.getPayload();
        email = payload?.email;
      } catch (e) {
        console.warn('[Google OAuth] Could not decode ID token:', e);
      }
    }

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token || undefined,
      expiresAt: tokens.expiry_date || Date.now() + 3600000,
      email,
      idToken: tokens.id_token || undefined,
    };
  }

  /**
   * Generate PKCE code verifier (random string)
   */
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  private generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return hash.toString('base64url');
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.oauth2Client = null;
    this.codeVerifier = '';
    this.currentPort = 0;
  }
}

// Singleton instance
let oauthServiceInstance: GoogleOAuthService | null = null;

/**
 * Get the Google OAuth service instance
 */
export function getGoogleOAuthService(): GoogleOAuthService {
  if (!oauthServiceInstance) {
    oauthServiceInstance = new GoogleOAuthService();
  }
  return oauthServiceInstance;
}

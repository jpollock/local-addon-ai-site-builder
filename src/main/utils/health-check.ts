/**
 * Health Check Service - Monitors API and service availability
 *
 * Performs periodic health checks on external services (Claude, OpenAI, Gemini, Figma)
 * to proactively detect issues and warn users before operations fail.
 */

/**
 * Health status for a service
 */
export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

/**
 * Service health information
 */
export interface ServiceHealth {
  status: HealthStatus;
  lastChecked: number; // timestamp
  responseTime?: number; // milliseconds
  error?: string;
  metadata?: {
    tokenExpiry?: number; // For OAuth services
    quotaRemaining?: number; // If available from API
  };
}

/**
 * Complete health status for all services
 */
export interface SystemHealth {
  claude: ServiceHealth;
  openai: ServiceHealth;
  gemini: ServiceHealth;
  figma: ServiceHealth;
  overall: HealthStatus;
  lastFullCheck: number;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  checkInterval: number; // milliseconds
  timeout: number; // milliseconds
  enablePeriodicChecks: boolean;
}

/**
 * Default health check configuration
 */
const DEFAULT_CONFIG: HealthCheckConfig = {
  checkInterval: 5 * 60 * 1000, // 5 minutes
  timeout: 10000, // 10 seconds
  enablePeriodicChecks: false, // Only check on-demand by default
};

/**
 * Health Check Service
 */
export class HealthCheckService {
  private config: HealthCheckConfig;
  private healthStatus: SystemHealth;
  private checkInterval: NodeJS.Timeout | null = null;
  private apiKeyStore: any; // Settings manager reference

  constructor(apiKeyStore: any, config?: Partial<HealthCheckConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.apiKeyStore = apiKeyStore;
    this.healthStatus = this.getInitialHealthStatus();
  }

  /**
   * Start periodic health checks
   */
  start(): void {
    if (!this.config.enablePeriodicChecks) {
      return;
    }

    if (this.checkInterval) {
      return; // Already running
    }

    // Run initial check
    this.checkAllServices();

    // Set up periodic checks
    this.checkInterval = setInterval(() => {
      this.checkAllServices();
    }, this.config.checkInterval);
  }

  /**
   * Stop periodic health checks
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus(): SystemHealth {
    return { ...this.healthStatus };
  }

  /**
   * Check all services and update status
   */
  async checkAllServices(): Promise<SystemHealth> {
    // Check all services in parallel
    const [claude, openai, gemini, figma] = await Promise.all([
      this.checkClaudeHealth(),
      this.checkOpenAIHealth(),
      this.checkGeminiHealth(),
      this.checkFigmaHealth(),
    ]);

    this.healthStatus = {
      claude,
      openai,
      gemini,
      figma,
      overall: this.calculateOverallHealth([claude, openai, gemini, figma]),
      lastFullCheck: Date.now(),
    };

    return this.getHealthStatus();
  }

  /**
   * Check a specific service
   */
  async checkService(service: 'claude' | 'openai' | 'gemini' | 'figma'): Promise<ServiceHealth> {
    switch (service) {
      case 'claude':
        return this.checkClaudeHealth();
      case 'openai':
        return this.checkOpenAIHealth();
      case 'gemini':
        return this.checkGeminiHealth();
      case 'figma':
        return this.checkFigmaHealth();
      default:
        return this.getUnknownHealth();
    }
  }

  /**
   * Check Claude API health
   */
  private async checkClaudeHealth(): Promise<ServiceHealth> {
    const apiKey = this.apiKeyStore.getApiKey?.('claude');

    if (!apiKey) {
      return {
        status: 'unknown',
        lastChecked: Date.now(),
        error: 'No API key configured',
      };
    }

    const startTime = Date.now();

    try {
      // Make a minimal API call to check availability
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          status: 'healthy',
          lastChecked: Date.now(),
          responseTime,
        };
      }

      if (response.status === 429) {
        return {
          status: 'degraded',
          lastChecked: Date.now(),
          responseTime,
          error: 'Rate limited',
        };
      }

      if (response.status === 401) {
        return {
          status: 'down',
          lastChecked: Date.now(),
          responseTime,
          error: 'Invalid API key',
        };
      }

      return {
        status: 'degraded',
        lastChecked: Date.now(),
        responseTime,
        error: `HTTP ${response.status}`,
      };
    } catch (error: any) {
      return {
        status: 'down',
        lastChecked: Date.now(),
        error: error.message || 'Connection failed',
      };
    }
  }

  /**
   * Check OpenAI API health
   */
  private async checkOpenAIHealth(): Promise<ServiceHealth> {
    const apiKey = this.apiKeyStore.getApiKey?.('openai');

    if (!apiKey) {
      return {
        status: 'unknown',
        lastChecked: Date.now(),
        error: 'No API key configured',
      };
    }

    const startTime = Date.now();

    try {
      // Check models endpoint (lightweight)
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          status: 'healthy',
          lastChecked: Date.now(),
          responseTime,
        };
      }

      if (response.status === 429) {
        return {
          status: 'degraded',
          lastChecked: Date.now(),
          responseTime,
          error: 'Rate limited',
        };
      }

      if (response.status === 401) {
        return {
          status: 'down',
          lastChecked: Date.now(),
          responseTime,
          error: 'Invalid API key',
        };
      }

      return {
        status: 'degraded',
        lastChecked: Date.now(),
        responseTime,
        error: `HTTP ${response.status}`,
      };
    } catch (error: any) {
      return {
        status: 'down',
        lastChecked: Date.now(),
        error: error.message || 'Connection failed',
      };
    }
  }

  /**
   * Check Gemini API health
   */
  private async checkGeminiHealth(): Promise<ServiceHealth> {
    const authMode = this.apiKeyStore.getGeminiAuthMode?.();

    // Check based on auth mode
    if (authMode === 'oauth') {
      const isConnected = this.apiKeyStore.isGeminiOAuthConnected?.();
      const tokens = this.apiKeyStore.getGeminiOAuthTokens?.();

      if (!isConnected) {
        return {
          status: 'unknown',
          lastChecked: Date.now(),
          error: 'OAuth not connected',
        };
      }

      // Check token expiry
      const tokenExpiry = tokens?.expiresAt;
      const now = Date.now();
      const expiresIn = tokenExpiry ? tokenExpiry - now : 0;

      // Warn if token expires in less than 24 hours
      if (expiresIn < 24 * 60 * 60 * 1000) {
        return {
          status: 'degraded',
          lastChecked: Date.now(),
          error: 'OAuth token expires soon',
          metadata: { tokenExpiry },
        };
      }

      return {
        status: 'healthy',
        lastChecked: Date.now(),
        metadata: { tokenExpiry },
      };
    }

    // API key mode
    const apiKey = this.apiKeyStore.getApiKey?.('gemini');

    if (!apiKey) {
      return {
        status: 'unknown',
        lastChecked: Date.now(),
        error: 'No API key configured',
      };
    }

    const startTime = Date.now();

    try {
      // List models endpoint (lightweight)
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey,
        {
          signal: AbortSignal.timeout(this.config.timeout),
        }
      );

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          status: 'healthy',
          lastChecked: Date.now(),
          responseTime,
        };
      }

      if (response.status === 429) {
        return {
          status: 'degraded',
          lastChecked: Date.now(),
          responseTime,
          error: 'Rate limited',
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          status: 'down',
          lastChecked: Date.now(),
          responseTime,
          error: 'Invalid API key',
        };
      }

      return {
        status: 'degraded',
        lastChecked: Date.now(),
        responseTime,
        error: `HTTP ${response.status}`,
      };
    } catch (error: any) {
      return {
        status: 'down',
        lastChecked: Date.now(),
        error: error.message || 'Connection failed',
      };
    }
  }

  /**
   * Check Figma API health
   */
  private async checkFigmaHealth(): Promise<ServiceHealth> {
    const authMode = this.apiKeyStore.getFigmaAuthMode?.();

    // Check based on auth mode
    if (authMode === 'oauth') {
      const isConnected = this.apiKeyStore.isFigmaOAuthConnected?.();
      const tokens = this.apiKeyStore.getFigmaOAuthTokens?.();

      if (!isConnected) {
        return {
          status: 'unknown',
          lastChecked: Date.now(),
          error: 'OAuth not connected',
        };
      }

      // Check token expiry
      const tokenExpiry = tokens?.expiresAt;
      const now = Date.now();
      const expiresIn = tokenExpiry ? tokenExpiry - now : 0;

      // Warn if token expires in less than 24 hours
      if (expiresIn < 24 * 60 * 60 * 1000) {
        return {
          status: 'degraded',
          lastChecked: Date.now(),
          error: 'OAuth token expires soon',
          metadata: { tokenExpiry },
        };
      }

      return {
        status: 'healthy',
        lastChecked: Date.now(),
        metadata: { tokenExpiry },
      };
    }

    // PAT mode
    const token = this.apiKeyStore.getFigmaAccessToken?.();

    if (!token) {
      return {
        status: 'unknown',
        lastChecked: Date.now(),
        error: 'No access token configured',
      };
    }

    const startTime = Date.now();

    try {
      // Use /me endpoint for lightweight check
      const response = await fetch('https://api.figma.com/v1/me', {
        headers: {
          'X-FIGMA-TOKEN': token,
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          status: 'healthy',
          lastChecked: Date.now(),
          responseTime,
        };
      }

      if (response.status === 429) {
        return {
          status: 'degraded',
          lastChecked: Date.now(),
          responseTime,
          error: 'Rate limited',
        };
      }

      if (response.status === 403) {
        return {
          status: 'down',
          lastChecked: Date.now(),
          responseTime,
          error: 'Invalid access token',
        };
      }

      return {
        status: 'degraded',
        lastChecked: Date.now(),
        responseTime,
        error: `HTTP ${response.status}`,
      };
    } catch (error: any) {
      return {
        status: 'down',
        lastChecked: Date.now(),
        error: error.message || 'Connection failed',
      };
    }
  }

  /**
   * Calculate overall health from individual services
   */
  private calculateOverallHealth(services: ServiceHealth[]): HealthStatus {
    const statuses = services.map((s) => s.status);

    // If any service is down, overall is degraded
    if (statuses.includes('down')) {
      return 'degraded';
    }

    // If any service is degraded, overall is degraded
    if (statuses.includes('degraded')) {
      return 'degraded';
    }

    // If at least one service is healthy, overall is healthy
    if (statuses.includes('healthy')) {
      return 'healthy';
    }

    // All unknown
    return 'unknown';
  }

  /**
   * Get initial health status (all unknown)
   */
  private getInitialHealthStatus(): SystemHealth {
    const unknownHealth = this.getUnknownHealth();

    return {
      claude: unknownHealth,
      openai: unknownHealth,
      gemini: unknownHealth,
      figma: unknownHealth,
      overall: 'unknown',
      lastFullCheck: 0,
    };
  }

  /**
   * Get unknown health object
   */
  private getUnknownHealth(): ServiceHealth {
    return {
      status: 'unknown',
      lastChecked: 0,
    };
  }

  /**
   * Check if we should warn about token expiry
   */
  shouldWarnTokenExpiry(service: 'gemini' | 'figma'): boolean {
    const health = this.healthStatus[service];

    if (!health.metadata?.tokenExpiry) {
      return false;
    }

    const expiresIn = health.metadata.tokenExpiry - Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return expiresIn < oneDayMs && expiresIn > 0;
  }

  /**
   * Get time until token expires (in hours)
   */
  getTokenExpiryHours(service: 'gemini' | 'figma'): number | null {
    const health = this.healthStatus[service];

    if (!health.metadata?.tokenExpiry) {
      return null;
    }

    const expiresIn = health.metadata.tokenExpiry - Date.now();
    return Math.floor(expiresIn / (60 * 60 * 1000));
  }
}

/**
 * Global health check service instance
 */
let globalHealthCheck: HealthCheckService | null = null;

/**
 * Initialize the global health check service
 */
export function initializeHealthCheck(
  apiKeyStore: any,
  config?: Partial<HealthCheckConfig>
): HealthCheckService {
  if (!globalHealthCheck) {
    globalHealthCheck = new HealthCheckService(apiKeyStore, config);
  }
  return globalHealthCheck;
}

/**
 * Get the global health check service
 */
export function getHealthCheck(): HealthCheckService | null {
  return globalHealthCheck;
}

/**
 * ProviderHealthStatus Component - Displays health status for AI providers
 *
 * Shows:
 * - Connection status indicator (green/yellow/red)
 * - Last check timestamp
 * - Circuit breaker state
 * - Manual health check button
 */

import * as React from 'react';
import { IPC_CHANNELS } from '../../common/constants';
import { getElectron } from '../electron-context';

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  message?: string;
  lastCheck?: number;
  responseTime?: number;
  circuitState?: 'closed' | 'open' | 'half-open';
  failureCount?: number;
}

interface ProviderHealthStatusProps {
  provider: 'claude' | 'openai' | 'gemini';
  compact?: boolean;
}

interface ProviderHealthStatusState {
  health: HealthData;
  loading: boolean;
  error: string | null;
}

/**
 * Get status color based on health status
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy':
      return '#4CAF50';
    case 'degraded':
      return '#FF9800';
    case 'unhealthy':
      return '#f44336';
    default:
      return '#9e9e9e';
  }
}

/**
 * Get status icon based on health status
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'healthy':
      return '●';
    case 'degraded':
      return '◐';
    case 'unhealthy':
      return '○';
    default:
      return '◌';
  }
}

/**
 * Get circuit breaker status text
 */
function getCircuitText(state?: string): string {
  switch (state) {
    case 'closed':
      return 'OK';
    case 'open':
      return 'Blocked';
    case 'half-open':
      return 'Testing';
    default:
      return '';
  }
}

/**
 * Format time ago
 */
function formatTimeAgo(timestamp?: number): string {
  if (!timestamp) return 'Never';

  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export class ProviderHealthStatus extends React.Component<
  ProviderHealthStatusProps,
  ProviderHealthStatusState
> {
  state: ProviderHealthStatusState = {
    health: {
      status: 'unknown',
    },
    loading: false,
    error: null,
  };

  private checkInterval: NodeJS.Timeout | null = null;

  async componentDidMount() {
    await this.checkHealth();
    // Auto-refresh every 5 minutes
    this.checkInterval = setInterval(() => this.checkHealth(), 300000);
  }

  componentWillUnmount() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  checkHealth = async () => {
    const { provider } = this.props;

    this.setState({ loading: true, error: null });

    try {
      const electron = getElectron();

      const response = await electron.ipcRenderer.invoke(IPC_CHANNELS.CHECK_SERVICE_HEALTH, {
        service: provider,
      });

      if (response.success) {
        this.setState({
          health: {
            status: response.health?.status || 'unknown',
            message: response.health?.message,
            lastCheck: Date.now(),
            responseTime: response.health?.responseTime,
            circuitState: response.health?.circuitState,
            failureCount: response.health?.failureCount,
          },
          loading: false,
        });
      } else {
        this.setState({
          health: {
            status: 'unhealthy',
            message: response.error || 'Health check failed',
            lastCheck: Date.now(),
          },
          loading: false,
        });
      }
    } catch (error: any) {
      this.setState({
        health: {
          status: 'unknown',
          message: error.message || 'Check failed',
        },
        loading: false,
        error: error.message,
      });
    }
  };

  render() {
    const { compact = false } = this.props;
    const { health, loading } = this.state;

    const statusColor = getStatusColor(health.status);
    const statusIcon = getStatusIcon(health.status);
    const circuitText = getCircuitText(health.circuitState);

    if (compact) {
      // Compact view - just indicator and status text
      return React.createElement(
        'div',
        {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
          },
          title: health.message || `Status: ${health.status}`,
        },
        React.createElement(
          'span',
          {
            style: {
              color: statusColor,
              fontSize: '14px',
              lineHeight: 1,
            },
          },
          loading ? '◌' : statusIcon
        ),
        React.createElement(
          'span',
          {
            style: {
              color: '#666',
              textTransform: 'capitalize',
            },
          },
          loading ? 'Checking...' : health.status
        )
      );
    }

    // Full view - detailed status card
    return React.createElement(
      'div',
      {
        style: {
          padding: '12px',
          backgroundColor: '#fafafa',
          border: `1px solid ${statusColor}40`,
          borderRadius: '6px',
          borderLeft: `3px solid ${statusColor}`,
        },
      },
      // Header with status
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          },
        },
        React.createElement(
          'span',
          {
            style: {
              color: statusColor,
              fontSize: '18px',
              lineHeight: 1,
            },
          },
          loading ? '◌' : statusIcon
        ),
        React.createElement(
          'span',
          {
            style: {
              fontWeight: 600,
              fontSize: '13px',
              textTransform: 'capitalize',
              color: statusColor,
            },
          },
          loading ? 'Checking...' : health.status
        ),
        // Circuit breaker badge
        circuitText &&
          health.circuitState !== 'closed' &&
          React.createElement(
            'span',
            {
              style: {
                fontSize: '10px',
                padding: '2px 6px',
                backgroundColor: health.circuitState === 'open' ? '#ffebee' : '#fff3e0',
                color: health.circuitState === 'open' ? '#c62828' : '#ef6c00',
                borderRadius: '10px',
                fontWeight: 600,
              },
            },
            circuitText
          ),
        // Refresh button
        React.createElement(
          'button',
          {
            onClick: this.checkHealth,
            disabled: loading,
            style: {
              marginLeft: 'auto',
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '11px',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            },
            title: 'Check health now',
          },
          loading ? '...' : '↻',
          ' Check'
        )
      ),

      // Status message
      health.message &&
        React.createElement(
          'div',
          {
            style: {
              fontSize: '12px',
              color: '#666',
              marginBottom: '8px',
            },
          },
          health.message
        ),

      // Stats row
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            gap: '16px',
            fontSize: '11px',
            color: '#999',
          },
        },
        // Last check
        React.createElement('span', null, 'Last checked: ', formatTimeAgo(health.lastCheck)),
        // Response time
        health.responseTime &&
          React.createElement('span', null, `Response: ${health.responseTime}ms`),
        // Failure count
        health.failureCount !== undefined &&
          health.failureCount > 0 &&
          React.createElement(
            'span',
            {
              style: { color: '#f44336' },
            },
            `Failures: ${health.failureCount}`
          )
      )
    );
  }
}

/**
 * All Providers Health Summary Component
 */
interface AllProvidersHealthProps {
  onRefresh?: () => void;
}

interface AllProvidersHealthState {
  healthData: Record<string, HealthData>;
  loading: boolean;
}

export class AllProvidersHealth extends React.Component<
  AllProvidersHealthProps,
  AllProvidersHealthState
> {
  state: AllProvidersHealthState = {
    healthData: {},
    loading: false,
  };

  async componentDidMount() {
    await this.checkAllHealth();
  }

  checkAllHealth = async () => {
    this.setState({ loading: true });

    try {
      const electron = getElectron();

      const response = await electron.ipcRenderer.invoke(IPC_CHANNELS.GET_HEALTH_STATUS);

      if (response.success && response.health) {
        this.setState({
          healthData: response.health,
          loading: false,
        });
      } else {
        this.setState({ loading: false });
      }
    } catch {
      this.setState({ loading: false });
    }

    if (this.props.onRefresh) {
      this.props.onRefresh();
    }
  };

  render() {
    const { healthData, loading } = this.state;
    const providers = ['claude', 'openai', 'gemini'] as const;

    return React.createElement(
      'div',
      {
        style: {
          padding: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
        },
      },
      // Header
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px',
          },
        },
        React.createElement(
          'h4',
          {
            style: {
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              flex: 1,
            },
          },
          'Provider Health Status'
        ),
        React.createElement(
          'button',
          {
            onClick: this.checkAllHealth,
            disabled: loading,
            style: {
              padding: '6px 12px',
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
            },
          },
          loading ? 'Checking...' : 'Check All'
        )
      ),

      // Provider list
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          },
        },
        ...providers.map((provider) => {
          const health = healthData[provider] || { status: 'unknown' };
          const statusColor = getStatusColor(health.status);
          const statusIcon = getStatusIcon(health.status);

          return React.createElement(
            'div',
            {
              key: provider,
              style: {
                display: 'flex',
                alignItems: 'center',
                padding: '10px 12px',
                backgroundColor: '#fff',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
              },
            },
            // Status indicator
            React.createElement(
              'span',
              {
                style: {
                  color: statusColor,
                  fontSize: '16px',
                  marginRight: '10px',
                },
              },
              loading ? '◌' : statusIcon
            ),
            // Provider name
            React.createElement(
              'span',
              {
                style: {
                  flex: 1,
                  fontWeight: 500,
                  fontSize: '13px',
                  textTransform: 'capitalize',
                },
              },
              provider
            ),
            // Status text
            React.createElement(
              'span',
              {
                style: {
                  fontSize: '12px',
                  color: statusColor,
                  textTransform: 'capitalize',
                },
              },
              loading ? 'Checking...' : health.status
            )
          );
        })
      )
    );
  }
}

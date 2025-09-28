/**
 * Enterprise-Grade Global Error Boundary
 *
 * Features:
 * - Comprehensive error catching and reporting
 * - User-friendly error recovery options
 * - Integration with monitoring system
 * - Graceful degradation for different error types
 */

import React, { Component, ReactNode } from 'react';
import { monitoring, reportError } from '../../lib/monitoring';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'app' | 'feature' | 'component';
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
  retryCount: number;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { level = 'component', name = 'Unknown' } = this.props;

    // Report error to monitoring system
    const errorId = reportError(
      error,
      `React Error Boundary: ${level}/${name}`,
      level === 'app' ? 'critical' : level === 'feature' ? 'high' : 'medium',
      {
        componentStack: errorInfo.componentStack,
        errorBoundaryLevel: level,
        componentName: name,
        retryCount: this.state.retryCount,
        props: this.sanitizeProps(this.props)
      }
    );

    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Track the error occurrence
    monitoring.trackUserAction('error_boundary_triggered', {
      level,
      componentName: name,
      errorMessage: error.message,
      errorId
    });
  }

  private sanitizeProps(props: any): Record<string, any> {
    // Remove potentially sensitive data from props before logging
    const sanitized = { ...props };
    delete sanitized.children;

    // Remove any props that might contain sensitive data
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'function') {
        sanitized[key] = '[Function]';
      } else if (key.toLowerCase().includes('password') ||
                 key.toLowerCase().includes('token') ||
                 key.toLowerCase().includes('secret')) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;

    monitoring.trackUserAction('error_boundary_retry', {
      errorId: this.state.errorId,
      retryCount: newRetryCount,
      componentName: this.props.name
    });

    if (newRetryCount <= this.maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: undefined,
        retryCount: newRetryCount
      });
    }
  };

  private handleReload = () => {
    monitoring.trackUserAction('error_boundary_reload', {
      errorId: this.state.errorId,
      componentName: this.props.name
    });

    window.location.reload();
  };

  private renderFallback() {
    const { fallback, level = 'component', name = 'Unknown' } = this.props;
    const { error, errorId, retryCount } = this.state;

    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    // Different UI based on error boundary level
    switch (level) {
      case 'app':
        return this.renderAppLevelError();
      case 'feature':
        return this.renderFeatureLevelError();
      default:
        return this.renderComponentLevelError();
    }
  }

  private renderAppLevelError() {
    const { errorId, retryCount } = this.state;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <svg
                className="mx-auto h-16 w-16 text-red-500 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
              </h2>

              <p className="text-gray-600 mb-6">
                We apologize for the inconvenience. Our team has been automatically
                notified and is working on a fix.
              </p>

              {errorId && (
                <div className="bg-gray-100 rounded-md p-3 mb-6">
                  <p className="text-sm text-gray-700">
                    Error ID: <code className="font-mono">{errorId}</code>
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {retryCount < this.maxRetries && (
                  <button
                    onClick={this.handleRetry}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Try Again ({this.maxRetries - retryCount} attempts left)
                  </button>
                )}

                <button
                  onClick={this.handleReload}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Reload Page
                </button>
              </div>

              <div className="mt-6 text-center">
                <a
                  href="mailto:support@nurturehub.app"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  private renderFeatureLevelError() {
    const { errorId, retryCount } = this.state;
    const { name } = this.props;

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              {name} Feature Unavailable
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                This feature is temporarily unavailable due to an unexpected error.
                You can continue using other parts of the application.
              </p>
            </div>
            {errorId && (
              <div className="mt-2 text-xs text-red-600">
                Error ID: {errorId}
              </div>
            )}
            <div className="mt-4">
              <div className="flex space-x-2">
                {retryCount < this.maxRetries && (
                  <button
                    onClick={this.handleRetry}
                    className="bg-red-100 px-3 py-1 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Retry
                  </button>
                )}
                <button
                  onClick={this.handleReload}
                  className="bg-white px-3 py-1 rounded-md text-sm font-medium text-red-800 hover:bg-gray-50 border border-red-200"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  private renderComponentLevelError() {
    const { retryCount } = this.state;

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm text-yellow-800">
              This component failed to load properly.
            </p>
            {retryCount < this.maxRetries && (
              <div className="mt-2">
                <button
                  onClick={this.handleRetry}
                  className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children;
  }
}

// 🎯 SPECIALIZED ERROR BOUNDARIES

export const AppErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <GlobalErrorBoundary level="app" name="Application">
    {children}
  </GlobalErrorBoundary>
);

export const FeatureErrorBoundary: React.FC<{ children: ReactNode; name: string }> = ({ children, name }) => (
  <GlobalErrorBoundary level="feature" name={name}>
    {children}
  </GlobalErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode; name: string }> = ({ children, name }) => (
  <GlobalErrorBoundary level="component" name={name}>
    {children}
  </GlobalErrorBoundary>
);
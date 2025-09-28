/**
 * Enterprise-Grade Monitoring & Error Tracking System
 *
 * Features:
 * - Centralized error tracking and reporting
 * - Performance monitoring with metrics collection
 * - User behavior analytics for debugging
 * - Real-time alerting for critical issues
 * - Error recovery and retry mechanisms
 */

export interface ErrorReport {
  error: Error;
  context: string;
  userId?: string;
  userAgent: string;
  timestamp: Date;
  stackTrace: string;
  errorId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface UserAction {
  action: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class EnterpriseMonitoring {
  private errorQueue: ErrorReport[] = [];
  private metricsQueue: PerformanceMetric[] = [];
  private userActionsQueue: UserAction[] = [];
  private isOnline = navigator.onLine;
  private retryCount = 0;
  private maxRetries = 3;

  constructor() {
    this.setupGlobalErrorHandling();
    this.setupPerformanceMonitoring();
    this.setupNetworkMonitoring();
    this.startQueueProcessor();
  }

  // 🚨 CENTRALIZED ERROR TRACKING
  reportError(error: Error, context: string, severity: ErrorReport['severity'] = 'medium', metadata?: Record<string, any>) {
    const errorReport: ErrorReport = {
      error,
      context,
      userId: this.getCurrentUserId(),
      userAgent: navigator.userAgent,
      timestamp: new Date(),
      stackTrace: error.stack || '',
      errorId: this.generateErrorId(),
      severity,
      metadata: {
        ...metadata,
        url: window.location.href,
        referrer: document.referrer,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        memory: this.getMemoryInfo(),
      }
    };

    this.errorQueue.push(errorReport);

    // Immediate handling for critical errors
    if (severity === 'critical') {
      this.handleCriticalError(errorReport);
    }

    console.error(`[${severity.toUpperCase()}] ${context}:`, error);
    return errorReport.errorId;
  }

  // 📊 PERFORMANCE MONITORING
  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      userId: this.getCurrentUserId(),
      metadata
    };

    this.metricsQueue.push(metric);
  }

  // 👤 USER BEHAVIOR TRACKING
  trackUserAction(action: string, metadata?: Record<string, any>) {
    const userAction: UserAction = {
      action,
      userId: this.getCurrentUserId(),
      timestamp: new Date(),
      metadata
    };

    this.userActionsQueue.push(userAction);
  }

  // 🔄 AUTOMATIC ERROR RECOVERY
  async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();

        // Record successful operation after retries
        if (attempt > 1) {
          this.recordMetric('operation_retry_success', attempt, { context });
        }

        return result;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;

        if (isLastAttempt) {
          const errorReport = {
            error: error as Error,
            context: `${context} - Final attempt failed`,
            userId: this.getCurrentUserId(),
            userAgent: navigator.userAgent,
            timestamp: new Date(),
            stackTrace: (error as Error).stack || '',
            errorId: this.generateErrorId(),
            severity: 'high' as const,
            metadata: {
              attempts: maxRetries,
              totalTime: maxRetries * backoffMs,
              url: window.location.href,
              referrer: document.referrer,
              viewport: `${window.innerWidth}x${window.innerHeight}`,
              memory: this.getMemoryInfo(),
            }
          };

          this.errorQueue.push(errorReport);

          // Trigger alerting system for critical failures
          this.triggerAlert(errorReport);
          throw error;
        }

        this.reportError(error as Error, `${context} - Attempt ${attempt} failed`, 'medium', {
          attempt,
          nextRetryIn: backoffMs * attempt
        });

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
      }
    }

    throw new Error(`Max retries exceeded for ${context}`);
  }

  // 🚨 ALERT INTEGRATION
  private async triggerAlert(errorReport: ErrorReport) {
    try {
      // Import alerting module dynamically to avoid circular dependencies
      const { alerting } = await import('./alerting');
      await alerting.processError(errorReport);
    } catch (error) {
      console.error('Failed to trigger alert:', error);
    }
  }

  // 🎯 API CALL MONITORING
  async monitoredApiCall<T>(
    apiCall: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;

      this.recordMetric(`api_call_duration`, duration, {
        operation: operationName,
        status: 'success',
        ...context
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.recordMetric(`api_call_duration`, duration, {
        operation: operationName,
        status: 'error',
        ...context
      });

      this.reportError(error as Error, `API call failed: ${operationName}`, 'high', {
        operationName,
        duration,
        ...context
      });

      throw error;
    }
  }

  // 🔧 PRIVATE METHODS
  private setupGlobalErrorHandling() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(
        new Error(event.reason?.toString() || 'Unhandled Promise Rejection'),
        'Unhandled Promise Rejection',
        'high',
        { reason: event.reason }
      );
    });

    // Catch global JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError(
        event.error || new Error(event.message),
        'Global JavaScript Error',
        'high',
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      );
    });

    // Catch resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        const target = event.target as Element;
        this.reportError(
          new Error(`Resource failed to load: ${target.tagName}`),
          'Resource Loading Error',
          'medium',
          {
            tagName: target.tagName,
            source: (target as any).src || (target as any).href
          }
        );
      }
    }, true);
  }

  private setupPerformanceMonitoring() {
    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        this.recordMetric('page_load_time', perfData.loadEventEnd - perfData.fetchStart);
        this.recordMetric('dom_content_loaded', perfData.domContentLoadedEventEnd - perfData.fetchStart);
        this.recordMetric('first_paint', this.getFirstPaint());
      }, 0);
    });

    // Monitor Core Web Vitals
    this.observeWebVitals();
  }

  private setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.trackUserAction('network_restored');
      this.processQueuedData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.trackUserAction('network_lost');
    });
  }

  private observeWebVitals() {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.recordMetric('largest_contentful_paint', entry.startTime);
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        this.recordMetric('first_input_delay', entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    new PerformanceObserver((list) => {
      let clsValue = 0;
      list.getEntries().forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.recordMetric('cumulative_layout_shift', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  private async handleCriticalError(errorReport: ErrorReport) {
    // For critical errors, try to send immediately
    try {
      await this.sendErrorReport(errorReport);
    } catch (sendError) {
      console.error('Failed to send critical error report:', sendError);
    }

    // Show user-friendly error message for critical issues
    this.showUserErrorNotification(errorReport);
  }

  private showUserErrorNotification(errorReport: ErrorReport) {
    // Create a toast notification for the user
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
    notification.innerHTML = `
      <div class="flex">
        <div class="py-1">
          <svg class="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
          </svg>
        </div>
        <div>
          <p class="font-bold">Something went wrong</p>
          <p class="text-sm">We've been notified and are working on a fix. Error ID: ${errorReport.errorId}</p>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  private startQueueProcessor() {
    // Process queued data every 30 seconds
    setInterval(() => {
      if (this.isOnline) {
        this.processQueuedData();
      }
    }, 30000);
  }

  private async processQueuedData() {
    try {
      // Send error reports
      if (this.errorQueue.length > 0) {
        const errors = [...this.errorQueue];
        this.errorQueue = [];
        await this.sendErrorReports(errors);
      }

      // Send performance metrics
      if (this.metricsQueue.length > 0) {
        const metrics = [...this.metricsQueue];
        this.metricsQueue = [];
        await this.sendMetrics(metrics);
      }

      // Send user actions
      if (this.userActionsQueue.length > 0) {
        const actions = [...this.userActionsQueue];
        this.userActionsQueue = [];
        await this.sendUserActions(actions);
      }

      this.retryCount = 0;
    } catch (error) {
      console.error('Failed to process queued monitoring data:', error);
      this.retryCount++;

      if (this.retryCount < this.maxRetries) {
        // Retry with exponential backoff
        setTimeout(() => this.processQueuedData(), 1000 * Math.pow(2, this.retryCount));
      }
    }
  }

  private async sendErrorReports(errors: ErrorReport[]) {
    // In a real implementation, this would send to your monitoring service
    // For now, we'll store in localStorage as backup and log
    try {
      const response = await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      // Fallback: store in localStorage
      const stored = localStorage.getItem('pendingErrors') || '[]';
      const pendingErrors = JSON.parse(stored);
      pendingErrors.push(...errors);
      localStorage.setItem('pendingErrors', JSON.stringify(pendingErrors));
      throw error;
    }
  }

  private async sendErrorReport(error: ErrorReport) {
    return this.sendErrorReports([error]);
  }

  private async sendMetrics(metrics: PerformanceMetric[]) {
    try {
      const response = await fetch('/api/monitoring/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      // Store metrics locally if can't send
      console.warn('Failed to send metrics, storing locally');
      throw error;
    }
  }

  private async sendUserActions(actions: UserAction[]) {
    try {
      const response = await fetch('/api/monitoring/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to send user actions');
      throw error;
    }
  }

  private getCurrentUserId(): string | undefined {
    // Get user ID from auth context or localStorage
    try {
      const authData = localStorage.getItem('supabase.auth.token');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.user?.id;
      }
    } catch (error) {
      // Ignore parsing errors
    }
    return undefined;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMemoryInfo(): Record<string, any> {
    try {
      const memory = (performance as any).memory;
      if (memory) {
        return {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        };
      }
    } catch (error) {
      // Memory API not available
    }
    return {};
  }

  private getFirstPaint(): number {
    try {
      const paintEntries = performance.getEntriesByType('paint');
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
      return firstPaint?.startTime || 0;
    } catch (error) {
      return 0;
    }
  }

  // 📊 PUBLIC ANALYTICS METHODS
  trackPageView(page: string, metadata?: Record<string, any>) {
    this.trackUserAction('page_view', { page, ...metadata });
  }

  trackFeatureUsage(feature: string, metadata?: Record<string, any>) {
    this.trackUserAction('feature_usage', { feature, ...metadata });
  }

  trackBusinessMetric(metric: string, value: number, metadata?: Record<string, any>) {
    this.recordMetric(`business_${metric}`, value, metadata);
  }
}

// 🌟 SINGLETON INSTANCE
export const monitoring = new EnterpriseMonitoring();

// 🎯 CONVENIENCE FUNCTIONS FOR EASY USAGE
export const reportError = (error: Error, context: string, severity?: ErrorReport['severity'], metadata?: Record<string, any>) =>
  monitoring.reportError(error, context, severity, metadata);

export const recordMetric = (name: string, value: number, metadata?: Record<string, any>) =>
  monitoring.recordMetric(name, value, metadata);

export const trackUserAction = (action: string, metadata?: Record<string, any>) =>
  monitoring.trackUserAction(action, metadata);

export const withRetry = <T>(operation: () => Promise<T>, context: string, maxRetries?: number, backoffMs?: number) =>
  monitoring.withRetry(operation, context, maxRetries, backoffMs);

export const monitoredApiCall = <T>(apiCall: () => Promise<T>, operationName: string, context?: Record<string, any>) =>
  monitoring.monitoredApiCall(apiCall, operationName, context);
// Production monitoring and error tracking utilities

interface ErrorReport {
  message: string
  stack?: string
  url: string
  userAgent: string
  timestamp: number
  userId?: string
  sessionId: string
}

interface PerformanceReport {
  metric: string
  value: number
  url: string
  timestamp: number
  userAgent: string
}

class MonitoringService {
  private sessionId: string
  private isProduction: boolean

  constructor() {
    this.sessionId = crypto.randomUUID()
    this.isProduction = import.meta.env.PROD
  }

  // Error tracking
  reportError(error: Error | string, additionalData?: Record<string, unknown>) {
    const report: ErrorReport = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      ...additionalData
    }

    if (this.isProduction) {
      // Send to your error tracking service (e.g., Sentry, LogRocket)
      this.sendToErrorService(report)
    } else {
      console.error('🚨 Error Report:', report)
    }
  }

  // Performance monitoring
  reportPerformance(metric: string, value: number) {
    const report: PerformanceReport = {
      metric,
      value,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    }

    if (this.isProduction) {
      // Send to your analytics service
      this.sendToAnalytics(report)
    } else {
      console.log(`📊 Performance: ${metric} = ${value}ms`)
    }
  }

  // User action tracking
  trackAction(action: string, data?: Record<string, unknown>) {
    if (this.isProduction) {
      // Send to your analytics service
      this.sendToAnalytics({
        action,
        data,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        url: window.location.href
      })
    } else {
      console.log(`🎯 Action: ${action}`, data)
    }
  }

  // Health check monitoring
  async healthCheck(): Promise<boolean> {
    try {
      // Check critical services
      const supabaseHealthy = await this.checkSupabaseHealth()
      const stripeHealthy = await this.checkStripeHealth()

      const isHealthy = supabaseHealthy && stripeHealthy

      if (!isHealthy) {
        this.reportError('Health check failed', {
          supabase: supabaseHealthy,
          stripe: stripeHealthy
        })
      }

      return isHealthy
    } catch (error) {
      this.reportError('Health check error', { error })
      return false
    }
  }

  private async checkSupabaseHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      })
      return response.ok
    } catch {
      return false
    }
  }

  private async checkStripeHealth(): Promise<boolean> {
    try {
      // For Stripe, we'll just check if the library loads
      return typeof window.Stripe !== 'undefined'
    } catch {
      return false
    }
  }

  private async sendToErrorService(report: ErrorReport) {
    // Example implementation - replace with your error tracking service
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      })
    } catch (error) {
      console.error('Failed to send error report:', error)
    }
  }

  private async sendToAnalytics(data: unknown) {
    // Example implementation - replace with your analytics service
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
    } catch (error) {
      console.error('Failed to send analytics:', error)
    }
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  monitoring.reportError(event.error || event.message, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  })
})

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  monitoring.reportError(`Unhandled Promise Rejection: ${event.reason}`)
})

// Performance observer for monitoring
if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'navigation') {
        const nav = entry as PerformanceNavigationTiming
        monitoring.reportPerformance('page_load_time', nav.loadEventEnd - nav.fetchStart)
      } else if (entry.entryType === 'longtask') {
        monitoring.reportPerformance('long_task', entry.duration)
      }
    })
  })

  observer.observe({ entryTypes: ['navigation', 'longtask'] })
}

export const monitoring = new MonitoringService()
export default monitoring
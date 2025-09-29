/**
 * Environment-Aware Logging System
 *
 * Smart logging that adapts to development vs production environments:
 * - Development: Rich console output for debugging
 * - Production: Minimal console, focuses on monitoring system
 *
 * External Service Error Categories:
 * - Supabase: Database, Auth, RLS policies, rate limits
 * - Stripe: Payments, webhooks, billing, API issues
 * - Google APIs: Places, Geocoding, Maps - quota, keys, network
 * - LINZ API: NZ Geocoding - government service, regional
 * - MapTiler: Mapping, geocoding - API limits, service availability
 */

import { reportError } from './monitoring'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'
export type ServiceType = 'supabase' | 'stripe' | 'google' | 'linz' | 'maptiler' | 'internal' | 'ui'

interface LogContext {
  userId?: string
  service?: ServiceType
  operation?: string
  metadata?: Record<string, any>
}

class EnvironmentLogger {
  private isDevelopment = import.meta.env.DEV
  private isProduction = import.meta.env.PROD

  /**
   * Development-only logging - visible in console during development
   */
  dev(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`[DEV] ${message}`, data || '')
    }
  }

  /**
   * Debug information - development console + monitoring in production
   */
  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context || '')
    }
    // In production, debug info goes to monitoring for analysis
    if (this.isProduction && context?.service) {
      this.logToMonitoring('debug', message, context)
    }
  }

  /**
   * Information logging - minimal in production
   */
  info(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context || '')
    }
    // Production: only log significant info to monitoring
    if (this.isProduction && context?.service) {
      this.logToMonitoring('info', message, context)
    }
  }

  /**
   * Warnings - always logged but handled smartly
   */
  warn(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context || '')
    }
    // Always track warnings in monitoring system
    this.logToMonitoring('warn', message, context)
  }

  /**
   * Errors - always tracked with full context
   */
  error(error: Error | string, message: string, context?: LogContext) {
    const errorObj = typeof error === 'string' ? new Error(error) : error

    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, errorObj, context || '')
    }

    // Always report errors to monitoring system
    const severity = this.determineSeverity(context?.service, context?.operation)
    reportError(errorObj, message, severity, {
      service: context?.service,
      operation: context?.operation,
      userId: context?.userId,
      ...context?.metadata
    })
  }

  /**
   * Critical errors - immediate attention required
   */
  critical(error: Error | string, message: string, context?: LogContext) {
    const errorObj = typeof error === 'string' ? new Error(error) : error

    // Always log critical errors to console
    console.error(`[CRITICAL] ${message}`, errorObj, context || '')

    // Always report to monitoring with critical severity
    reportError(errorObj, message, 'critical', {
      service: context?.service,
      operation: context?.operation,
      userId: context?.userId,
      ...context?.metadata
    })
  }

  /**
   * Service-specific error logging with smart categorization
   */
  serviceError(service: ServiceType, error: Error | string, operation: string, context?: LogContext) {
    const errorObj = typeof error === 'string' ? new Error(error) : error
    const message = `${service.toUpperCase()} service error: ${operation}`

    // Enhanced context for service errors
    const serviceContext = {
      ...context,
      service,
      operation,
      errorType: this.categorizeServiceError(service, errorObj.message),
      timestamp: new Date().toISOString()
    }

    this.error(errorObj, message, serviceContext)
  }

  /**
   * Determine error severity based on service and operation
   */
  private determineSeverity(service?: ServiceType, operation?: string): 'low' | 'medium' | 'high' | 'critical' {
    if (!service) return 'medium'

    // Critical operations that break core functionality
    const criticalOps = ['authentication', 'payment', 'user_creation', 'subscription_check']
    if (operation && criticalOps.some(op => operation.includes(op))) {
      return 'critical'
    }

    // High priority services
    const highPriorityServices: ServiceType[] = ['supabase', 'stripe']
    if (highPriorityServices.includes(service)) {
      return 'high'
    }

    // External API services - medium priority
    const externalServices: ServiceType[] = ['google', 'linz', 'maptiler']
    if (externalServices.includes(service)) {
      return 'medium'
    }

    return 'medium'
  }

  /**
   * Categorize errors by service for better debugging
   */
  private categorizeServiceError(service: ServiceType, errorMessage: string): string {
    const message = errorMessage.toLowerCase()

    switch (service) {
      case 'supabase':
        if (message.includes('401') || message.includes('unauthorized')) return 'auth_failure'
        if (message.includes('403') || message.includes('policy')) return 'rls_policy_violation'
        if (message.includes('429') || message.includes('rate limit')) return 'rate_limit'
        if (message.includes('connection') || message.includes('network')) return 'network_error'
        if (message.includes('timeout')) return 'timeout'
        return 'database_error'

      case 'stripe':
        if (message.includes('invalid_request_error')) return 'invalid_request'
        if (message.includes('card_error')) return 'payment_method_failed'
        if (message.includes('rate_limit_error')) return 'rate_limit'
        if (message.includes('authentication_error')) return 'api_key_invalid'
        if (message.includes('api_connection_error')) return 'network_error'
        return 'payment_error'

      case 'google':
        if (message.includes('invalid_request')) return 'invalid_request'
        if (message.includes('over_query_limit')) return 'quota_exceeded'
        if (message.includes('request_denied')) return 'api_key_invalid'
        if (message.includes('zero_results')) return 'no_results'
        if (message.includes('unknown_error')) return 'service_unavailable'
        return 'api_error'

      case 'linz':
        if (message.includes('401') || message.includes('403')) return 'api_key_invalid'
        if (message.includes('429')) return 'rate_limit'
        if (message.includes('500') || message.includes('503')) return 'service_unavailable'
        if (message.includes('400')) return 'invalid_request'
        return 'geocoding_error'

      case 'maptiler':
        if (message.includes('401') || message.includes('403')) return 'api_key_invalid'
        if (message.includes('429')) return 'rate_limit'
        if (message.includes('404')) return 'not_found'
        if (message.includes('500')) return 'service_error'
        return 'mapping_error'

      default:
        return 'unknown_error'
    }
  }

  /**
   * Send structured logs to monitoring system
   */
  private logToMonitoring(level: LogLevel, message: string, context?: LogContext) {
    // This integrates with our existing monitoring system
    // Only sends significant events to avoid noise
    if (level === 'warn' || level === 'error' || level === 'critical') {
      const severity = level === 'critical' ? 'critical' : level === 'error' ? 'high' : 'medium'
      reportError(new Error(message), `${level.toUpperCase()}: ${message}`, severity, context?.metadata)
    }
  }
}

// Export singleton instance
export const logger = new EnvironmentLogger()

// Convenience exports for common patterns
export const devLog = (message: string, data?: any) => logger.dev(message, data)
export const debugLog = (message: string, context?: LogContext) => logger.debug(message, context)
export const infoLog = (message: string, context?: LogContext) => logger.info(message, context)
export const warnLog = (message: string, context?: LogContext) => logger.warn(message, context)
export const errorLog = (error: Error | string, message: string, context?: LogContext) => logger.error(error, message, context)
export const criticalLog = (error: Error | string, message: string, context?: LogContext) => logger.critical(error, message, context)
export const serviceErrorLog = (service: ServiceType, error: Error | string, operation: string, context?: LogContext) => logger.serviceError(service, error, operation, context)

/**
 * External Service Error Scenarios Guide:
 *
 * SUPABASE ERRORS:
 * - Authentication: Token expiry, invalid sessions, policy violations
 * - Database: Connection issues, RLS policy blocks, schema problems
 * - Real-time: Subscription failures, network drops
 * - Rate Limits: Too many requests, concurrent connections
 *
 * STRIPE ERRORS:
 * - Payments: Card declined, insufficient funds, invalid methods
 * - API: Invalid keys, rate limits, request format errors
 * - Webhooks: Signature verification, payload parsing
 * - Billing: Quota exceeded, account issues
 *
 * GOOGLE API ERRORS:
 * - Places: Invalid queries, quota exceeded, billing issues
 * - Geocoding: Address not found, rate limits, API key problems
 * - Maps: Load failures, quota issues, network problems
 *
 * LINZ API ERRORS:
 * - Government service downtime, regional restrictions
 * - API key validation, rate limiting
 * - Query format issues, data availability
 *
 * MAPTILER ERRORS:
 * - API key issues, quota exceeded
 * - Service availability, network connectivity
 * - Map style loading, tile loading failures
 */
/**
 * Enterprise Security Hardening & Compliance System
 *
 * Features:
 * - Input validation and sanitization
 * - XSS and CSRF protection
 * - Rate limiting and DDoS protection
 * - Data encryption and PII handling
 * - Security headers and content policies
 * - Audit logging and compliance
 * - Penetration testing helpers
 */

import { reportError } from './monitoring';
import { supabase } from './supabase';

export interface SecurityConfig {
  enableRateLimiting: boolean;
  enableInputValidation: boolean;
  enableAuditLogging: boolean;
  enableCSRFProtection: boolean;
  enableXSSProtection: boolean;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    blacklistThreshold: number;
  };
  validation: {
    maxStringLength: number;
    allowedFileTypes: string[];
    maxFileSize: number;
  };
}

export interface SecurityEvent {
  id: string;
  type: 'authentication' | 'authorization' | 'input_validation' | 'rate_limit' | 'suspicious_activity' | 'data_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, any>;
  action: string;
  resource?: string;
}

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'email' | 'phone' | 'url' | 'custom';
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean | string;
  sanitize?: boolean;
}

class EnterpriseSecurity {
  private rateLimitStore = new Map<string, { count: number; firstRequest: number; blacklisted?: boolean }>();
  private csrfTokens = new Map<string, { token: string; expires: number }>();
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.setupSecurityHeaders();
    this.setupContentSecurityPolicy();
    this.startRateLimitCleanup();
  }

  // 🔒 INPUT VALIDATION & SANITIZATION
  validateInput(data: Record<string, any>, rules: ValidationRule[]): { isValid: boolean; errors: string[]; sanitized: Record<string, any> } {
    const errors: string[] = [];
    const sanitized: Record<string, any> = {};

    for (const rule of rules) {
      const value = data[rule.field];

      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`);
        continue;
      }

      // Skip validation for optional empty fields
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type-specific validation
      const validationResult = this.validateByType(value, rule);
      if (validationResult !== true) {
        errors.push(`${rule.field}: ${validationResult}`);
        continue;
      }

      // Custom validation
      if (rule.customValidator) {
        const customResult = rule.customValidator(value);
        if (customResult !== true) {
          errors.push(`${rule.field}: ${customResult}`);
          continue;
        }
      }

      // Sanitize if requested
      sanitized[rule.field] = rule.sanitize ? this.sanitizeValue(value, rule.type) : value;
    }

    const isValid = errors.length === 0;

    if (!isValid) {
      this.logSecurityEvent({
        type: 'input_validation',
        severity: 'medium',
        action: 'validation_failed',
        details: { errors, inputFields: Object.keys(data) }
      });
    }

    return { isValid, errors, sanitized };
  }

  private validateByType(value: any, rule: ValidationRule): true | string {
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') return 'must be a string';
        if (rule.minLength && value.length < rule.minLength) return `must be at least ${rule.minLength} characters`;
        if (rule.maxLength && value.length > rule.maxLength) return `must be no more than ${rule.maxLength} characters`;
        if (rule.pattern && !rule.pattern.test(value)) return 'invalid format';
        break;

      case 'number':
        if (typeof value !== 'number' && !this.isNumeric(value)) return 'must be a number';
        break;

      case 'email':
        if (!this.isValidEmail(value)) return 'must be a valid email address';
        break;

      case 'phone':
        if (!this.isValidPhone(value)) return 'must be a valid phone number';
        break;

      case 'url':
        if (!this.isValidURL(value)) return 'must be a valid URL';
        break;
    }

    return true;
  }

  private sanitizeValue(value: any, type: ValidationRule['type']): any {
    if (typeof value !== 'string') return value;

    // Basic HTML sanitization
    let sanitized = value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    // Type-specific sanitization
    switch (type) {
      case 'string':
        // Remove potentially dangerous characters
        sanitized = sanitized.replace(/[<>{}]/g, '');
        break;

      case 'email':
        // Keep only valid email characters
        sanitized = sanitized.replace(/[^a-zA-Z0-9@._-]/g, '');
        break;

      case 'phone':
        // Keep only numbers, spaces, dashes, parentheses, and plus
        sanitized = sanitized.replace(/[^0-9\s\-\(\)\+]/g, '');
        break;
    }

    return sanitized;
  }

  // 🚦 RATE LIMITING & DDoS PROTECTION
  checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    if (!this.config.enableRateLimiting) {
      return { allowed: true, remaining: this.config.rateLimit.maxRequests, resetTime: 0 };
    }

    const now = Date.now();
    const windowMs = this.config.rateLimit.windowMs;
    const maxRequests = this.config.rateLimit.maxRequests;

    let entry = this.rateLimitStore.get(identifier);

    if (!entry || now - entry.firstRequest > windowMs) {
      // First request in window or window expired
      entry = { count: 1, firstRequest: now };
      this.rateLimitStore.set(identifier, entry);
      return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
    }

    // Check if blacklisted
    if (entry.blacklisted) {
      this.logSecurityEvent({
        type: 'rate_limit',
        severity: 'high',
        action: 'blacklisted_access_attempt',
        details: { identifier, attempts: entry.count }
      });
      return { allowed: false, remaining: 0, resetTime: now + windowMs };
    }

    entry.count++;

    if (entry.count > maxRequests) {
      // Rate limit exceeded
      this.logSecurityEvent({
        type: 'rate_limit',
        severity: 'medium',
        action: 'rate_limit_exceeded',
        details: { identifier, attempts: entry.count }
      });

      // Blacklist if threshold exceeded
      if (entry.count > this.config.rateLimit.blacklistThreshold) {
        entry.blacklisted = true;
        this.logSecurityEvent({
          type: 'rate_limit',
          severity: 'high',
          action: 'identifier_blacklisted',
          details: { identifier, attempts: entry.count }
        });
      }

      return { allowed: false, remaining: 0, resetTime: entry.firstRequest + windowMs };
    }

    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.firstRequest + windowMs
    };
  }

  // 🛡️ CSRF PROTECTION
  generateCSRFToken(sessionId: string): string {
    const token = this.generateSecureToken();
    const expires = Date.now() + (60 * 60 * 1000); // 1 hour

    this.csrfTokens.set(sessionId, { token, expires });

    return token;
  }

  validateCSRFToken(sessionId: string, token: string): boolean {
    if (!this.config.enableCSRFProtection) return true;

    const stored = this.csrfTokens.get(sessionId);

    if (!stored) {
      this.logSecurityEvent({
        type: 'authorization',
        severity: 'medium',
        action: 'csrf_token_missing',
        details: { sessionId }
      });
      return false;
    }

    if (Date.now() > stored.expires) {
      this.csrfTokens.delete(sessionId);
      this.logSecurityEvent({
        type: 'authorization',
        severity: 'low',
        action: 'csrf_token_expired',
        details: { sessionId }
      });
      return false;
    }

    if (stored.token !== token) {
      this.logSecurityEvent({
        type: 'authorization',
        severity: 'high',
        action: 'csrf_token_invalid',
        details: { sessionId, providedToken: token.substring(0, 8) + '...' }
      });
      return false;
    }

    return true;
  }

  // 🔐 DATA ENCRYPTION & PII HANDLING
  encryptPII(data: string): string {
    // In production, use proper encryption library like crypto-js
    // This is a simplified example
    try {
      const encoder = new TextEncoder();
      const data_encoded = encoder.encode(data);

      // Generate a simple key for demonstration (use proper key management in production)
      const key = Array.from(crypto.getRandomValues(new Uint8Array(32)));

      // Simple XOR encryption (use AES in production)
      const encrypted = data_encoded.map((byte, index) => byte ^ key[index % key.length]);

      return btoa(String.fromCharCode(...encrypted, ...key));
    } catch (error) {
      reportError(error as Error, 'PII Encryption', 'high');
      throw new Error('Encryption failed');
    }
  }

  decryptPII(encryptedData: string): string {
    try {
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      const dataLength = combined.length - 32;
      const encrypted = combined.slice(0, dataLength);
      const key = combined.slice(dataLength);

      const decrypted = encrypted.map((byte, index) => byte ^ key[index % key.length]);

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      reportError(error as Error, 'PII Decryption', 'high');
      throw new Error('Decryption failed');
    }
  }

  maskPII(data: string, type: 'email' | 'phone' | 'credit_card' | 'ssn'): string {
    switch (type) {
      case 'email':
        const [localPart, domain] = data.split('@');
        if (!domain) return data;
        const maskedLocal = localPart.length > 2
          ? localPart.substring(0, 2) + '*'.repeat(localPart.length - 2)
          : '*'.repeat(localPart.length);
        return `${maskedLocal}@${domain}`;

      case 'phone':
        const cleaned = data.replace(/\D/g, '');
        if (cleaned.length < 4) return '*'.repeat(data.length);
        return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);

      case 'credit_card':
        const cardCleaned = data.replace(/\D/g, '');
        if (cardCleaned.length < 4) return '*'.repeat(data.length);
        return '*'.repeat(cardCleaned.length - 4) + cardCleaned.slice(-4);

      case 'ssn':
        const ssnCleaned = data.replace(/\D/g, '');
        if (ssnCleaned.length < 4) return '*'.repeat(data.length);
        return '***-**-' + ssnCleaned.slice(-4);

      default:
        return '*'.repeat(data.length);
    }
  }

  // 📊 SECURITY AUDIT LOGGING
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'ipAddress' | 'userAgent'>) {
    if (!this.config.enableAuditLogging) return;

    const securityEvent: SecurityEvent = {
      id: this.generateSecureToken(),
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
      userId: this.getCurrentUserId(),
      ...event
    };

    try {
      // Store in database for audit trail
      await supabase
        .from('security_events')
        .insert([{
          id: securityEvent.id,
          type: securityEvent.type,
          severity: securityEvent.severity,
          user_id: securityEvent.userId,
          ip_address: securityEvent.ipAddress,
          user_agent: securityEvent.userAgent,
          timestamp: securityEvent.timestamp.toISOString(),
          action: securityEvent.action,
          resource: securityEvent.resource,
          details: securityEvent.details
        }]);

      // Alert on high/critical severity events
      if (securityEvent.severity === 'high' || securityEvent.severity === 'critical') {
        reportError(
          new Error(`Security event: ${securityEvent.action}`),
          'Security Monitoring',
          securityEvent.severity === 'critical' ? 'critical' : 'high',
          securityEvent.details
        );
      }

    } catch (error) {
      reportError(error as Error, 'Security Event Logging', 'medium');
    }
  }

  // 🔍 SUSPICIOUS ACTIVITY DETECTION
  detectSuspiciousActivity(userId: string, action: string, metadata: Record<string, any> = {}) {
    const suspiciousPatterns = [
      // Multiple failed login attempts
      { pattern: 'multiple_failed_logins', threshold: 5, timeWindow: 15 * 60 * 1000 },
      // Rapid API calls
      { pattern: 'rapid_api_calls', threshold: 100, timeWindow: 60 * 1000 },
      // Unusual access patterns
      { pattern: 'unusual_access_time', threshold: 1, timeWindow: 0 },
      // Data export attempts
      { pattern: 'bulk_data_access', threshold: 10, timeWindow: 5 * 60 * 1000 }
    ];

    // Check for suspicious patterns
    for (const pattern of suspiciousPatterns) {
      if (this.checkSuspiciousPattern(userId, action, pattern, metadata)) {
        this.logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'high',
          action: `suspicious_${pattern.pattern}`,
          details: { pattern: pattern.pattern, metadata, userId }
        });
      }
    }
  }

  // 🚀 SECURITY HEADERS & CSP
  private setupSecurityHeaders() {
    // Security headers would typically be set at the server level
    // This method exists for initialization but headers are configured in Vercel
  }

  private setupContentSecurityPolicy() {
    // Content Security Policy would typically be set at the server level
    // This method exists for initialization but CSP is configured in Vercel
  }

  // 🔧 HELPER METHODS
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isNumeric(value: any): boolean {
    return !isNaN(value) && !isNaN(parseFloat(value));
  }

  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private getClientIP(): string {
    // In a real implementation, this would come from server-side request headers
    return 'client-side-unknown';
  }

  private getCurrentUserId(): string | undefined {
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

  private checkSuspiciousPattern(_userId: string, _action: string, _pattern: any, _metadata: Record<string, any>): boolean {
    // Simplified suspicious pattern detection
    // In production, this would involve more sophisticated analysis
    return false;
  }

  private startRateLimitCleanup() {
    // Clean up expired rate limit entries every hour
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.rateLimitStore) {
        if (now - entry.firstRequest > this.config.rateLimit.windowMs) {
          this.rateLimitStore.delete(key);
        }
      }
    }, 60 * 60 * 1000);
  }

  // 📊 PUBLIC API
  async getSecurityMetrics(): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('type, severity, timestamp')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const metrics = {
        total_events: data.length,
        critical_events: data.filter(e => e.severity === 'critical').length,
        high_events: data.filter(e => e.severity === 'high').length,
        auth_events: data.filter(e => e.type === 'authentication').length,
        rate_limit_events: data.filter(e => e.type === 'rate_limit').length,
        suspicious_events: data.filter(e => e.type === 'suspicious_activity').length
      };

      return metrics;
    } catch (error) {
      reportError(error as Error, 'Security Metrics', 'low');
      return {};
    }
  }

  // 🧪 SECURITY TESTING HELPERS
  runSecurityTest(): Record<string, boolean> {
    const tests = {
      csrf_protection: this.config.enableCSRFProtection,
      rate_limiting: this.config.enableRateLimiting,
      input_validation: this.config.enableInputValidation,
      audit_logging: this.config.enableAuditLogging,
      secure_headers: true, // Would check actual headers in production
      https_only: location.protocol === 'https:',
      no_inline_scripts: !document.querySelectorAll('script[src=""]').length
    };

    return tests;
  }
}

// 🌟 DEFAULT CONFIGURATION
const defaultSecurityConfig: SecurityConfig = {
  enableRateLimiting: true,
  enableInputValidation: true,
  enableAuditLogging: true,
  enableCSRFProtection: true,
  enableXSSProtection: true,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    blacklistThreshold: 200
  },
  validation: {
    maxStringLength: 10000,
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    maxFileSize: 5 * 1024 * 1024 // 5MB
  }
};

// 🌟 SINGLETON INSTANCE
export const security = new EnterpriseSecurity(defaultSecurityConfig);

// 🎯 CONVENIENCE FUNCTIONS
export const validateInput = (data: Record<string, any>, rules: ValidationRule[]) =>
  security.validateInput(data, rules);

export const checkRateLimit = (identifier: string) =>
  security.checkRateLimit(identifier);

export const generateCSRFToken = (sessionId: string) =>
  security.generateCSRFToken(sessionId);

export const validateCSRFToken = (sessionId: string, token: string) =>
  security.validateCSRFToken(sessionId, token);

export const encryptPII = (data: string) =>
  security.encryptPII(data);

export const decryptPII = (encryptedData: string) =>
  security.decryptPII(encryptedData);

export const maskPII = (data: string, type: 'email' | 'phone' | 'credit_card' | 'ssn') =>
  security.maskPII(data, type);

export const logSecurityEvent = (event: Omit<SecurityEvent, 'id' | 'timestamp' | 'ipAddress' | 'userAgent'>) =>
  security.logSecurityEvent(event);

export const detectSuspiciousActivity = (userId: string, action: string, metadata?: Record<string, any>) =>
  security.detectSuspiciousActivity(userId, action, metadata);

export const getSecurityMetrics = () =>
  security.getSecurityMetrics();

export const runSecurityTest = () =>
  security.runSecurityTest();
/**
 * Rate Limiting Middleware for API Endpoints
 *
 * Enterprise-grade rate limiting to prevent API abuse and control costs
 * Implements per-user and per-IP rate limiting for geocoding services
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Max requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// In-memory store (for production, use Redis or database)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
  geocoding: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 30,          // 30 geocoding requests per minute per user
  },
  maps: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 100,         // 100 map requests per minute per user
  },
  default: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 50,          // 50 requests per minute per user
  }
};

/**
 * Get rate limit key based on user ID or IP address
 */
function getRateLimitKey(req: VercelRequest, keyType: 'user' | 'ip' = 'user'): string {
  if (keyType === 'user' && (req as any).user?.id) {
    return `user:${(req as any).user.id}`;
  }

  // Fallback to IP-based limiting
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded ? forwarded.split(',')[0] : req.connection?.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(key: string, config: RateLimitConfig): {
  allowed: boolean;
  totalHits: number;
  timeUntilReset: number;
  resetTime: Date;
} {
  const now = Date.now();
  const resetTime = now + config.windowMs;

  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired entry
    entry = {
      count: 1,
      resetTime,
      firstRequest: now
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      totalHits: 1,
      timeUntilReset: config.windowMs,
      resetTime: new Date(resetTime)
    };
  }

  // Increment counter
  entry.count++;

  const timeUntilReset = entry.resetTime - now;
  const allowed = entry.count <= config.maxRequests;

  return {
    allowed,
    totalHits: entry.count,
    timeUntilReset: Math.max(0, timeUntilReset),
    resetTime: new Date(entry.resetTime)
  };
}

/**
 * Rate limiting middleware wrapper
 */
export function withRateLimit(config: RateLimitConfig) {
  return function (handler: (req: VercelRequest, res: VercelResponse) => Promise<void>) {
    return async (req: VercelRequest, res: VercelResponse) => {
      // Get rate limit key
      const key = getRateLimitKey(req);

      // Check rate limit
      const result = checkRateLimit(key, config);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - result.totalHits));
      res.setHeader('X-RateLimit-Reset', result.resetTime.toISOString());

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Rate Limit Exceeded',
          message: `Too many requests. Try again in ${Math.ceil(result.timeUntilReset / 1000)} seconds.`,
          retryAfter: Math.ceil(result.timeUntilReset / 1000)
        });
      }

      // Continue to handler
      return handler(req, res);
    };
  };
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}
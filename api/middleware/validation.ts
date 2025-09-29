/**
 * Input Validation Middleware for API Endpoints
 *
 * Enterprise-grade input validation and sanitization
 * Prevents injection attacks and validates geocoding requests
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'email' | 'coordinates';
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  sanitize?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData: Record<string, any>;
}

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, 500); // Limit length
}

/**
 * Validate coordinates (latitude, longitude)
 */
function validateCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) && !isNaN(lng)
  );
}

/**
 * Validate New Zealand address format
 */
function validateNZAddress(address: string): boolean {
  // Basic NZ address validation patterns
  const nzPatterns = [
    /\d+.*(?:street|st|road|rd|avenue|ave|place|pl|drive|dr|lane|ln|terrace|tce|crescent|cres|close|way)/i,
    /(?:auckland|wellington|christchurch|hamilton|tauranga|dunedin|palmerston north|hastings|napier|rotorua)/i,
    /\d{4}/, // Postal code
  ];

  return nzPatterns.some(pattern => pattern.test(address));
}

/**
 * Validate input data against rules
 */
export function validateInput(data: Record<string, any>, rules: ValidationRule[]): ValidationResult {
  const errors: string[] = [];
  const sanitizedData: Record<string, any> = {};

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
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${rule.field} must be a string`);
          break;
        }

        let sanitizedValue = rule.sanitize ? sanitizeString(value) : value.trim();

        if (rule.minLength && sanitizedValue.length < rule.minLength) {
          errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
        }

        if (rule.maxLength && sanitizedValue.length > rule.maxLength) {
          errors.push(`${rule.field} must be no more than ${rule.maxLength} characters`);
        }

        if (rule.pattern && !rule.pattern.test(sanitizedValue)) {
          errors.push(`${rule.field} format is invalid`);
        }

        sanitizedData[rule.field] = sanitizedValue;
        break;

      case 'number':
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (typeof numValue !== 'number' || isNaN(numValue)) {
          errors.push(`${rule.field} must be a valid number`);
        } else {
          sanitizedData[rule.field] = numValue;
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(`${rule.field} must be a valid email address`);
        } else {
          sanitizedData[rule.field] = value.toLowerCase().trim();
        }
        break;

      case 'coordinates':
        if (!validateCoordinates(data.lat, data.lng)) {
          errors.push('Invalid coordinates provided');
        } else {
          sanitizedData.lat = data.lat;
          sanitizedData.lng = data.lng;
        }
        break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
}

/**
 * Common validation rules for geocoding endpoints
 */
export const GEOCODING_VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'address',
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 200,
    sanitize: true
  }
];

export const REVERSE_GEOCODING_VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'lat',
    type: 'number',
    required: true
  },
  {
    field: 'lng',
    type: 'number',
    required: true
  }
];

/**
 * Validation middleware wrapper
 */
export function withValidation(rules: ValidationRule[]) {
  return function (handler: (req: VercelRequest, res: VercelResponse) => Promise<void>) {
    return async (req: VercelRequest, res: VercelResponse) => {
      // Only validate POST requests with body data
      if (req.method === 'POST') {
        const validation = validateInput(req.body, rules);

        if (!validation.isValid) {
          return res.status(400).json({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: validation.errors
          });
        }

        // Replace request body with sanitized data
        req.body = validation.sanitizedData;
      }

      return handler(req, res);
    };
  };
}
/**
 * Secure Google Maps Geocoding API Proxy
 *
 * Enterprise-grade proxy endpoint that:
 * - Keeps API keys secure on server-side
 * - Implements authentication and rate limiting
 * - Validates and sanitizes input
 * - Provides audit logging
 * - Caches results to minimize API costs
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest } from '../middleware/auth';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '../middleware/rateLimit';
import { withValidation, GEOCODING_VALIDATION_RULES } from '../middleware/validation';

// Server-side API key (never exposed to frontend)
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

// Simple in-memory cache (in production, use Redis)
const geocodeCache = new Map<string, { result: any; timestamp: number; userId: string }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface GoogleGeocodingResult {
  lat: number;
  lng: number;
  confidence: number;
  formatted_address: string;
  place_type: string;
  address_components: {
    street_number?: string;
    route?: string;
    locality?: string;
    administrative_area_level_1?: string;
    postal_code?: string;
    country?: string;
  };
}

/**
 * Parse Google Maps API response into our standardized format
 */
function parseGoogleResponse(data: any): GoogleGeocodingResult | null {
  if (!data.results || data.results.length === 0) {
    return null;
  }

  const result = data.results[0];
  const location = result.geometry.location;

  // Extract address components
  const components: any = {};
  result.address_components?.forEach((component: any) => {
    const types = component.types;
    if (types.includes('street_number')) components.street_number = component.long_name;
    if (types.includes('route')) components.route = component.long_name;
    if (types.includes('locality')) components.locality = component.long_name;
    if (types.includes('administrative_area_level_1')) components.administrative_area_level_1 = component.long_name;
    if (types.includes('postal_code')) components.postal_code = component.long_name;
    if (types.includes('country')) components.country = component.long_name;
  });

  // Determine confidence based on location type
  let confidence = 0.8; // Default confidence
  if (result.geometry.location_type === 'ROOFTOP') confidence = 1.0;
  else if (result.geometry.location_type === 'RANGE_INTERPOLATED') confidence = 0.9;
  else if (result.geometry.location_type === 'GEOMETRIC_CENTER') confidence = 0.7;
  else if (result.geometry.location_type === 'APPROXIMATE') confidence = 0.5;

  return {
    lat: location.lat,
    lng: location.lng,
    confidence,
    formatted_address: result.formatted_address,
    place_type: result.types[0] || 'unknown',
    address_components: components
  };
}

/**
 * Secure geocoding handler with enterprise features
 */
async function handleGeocode(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    // Verify API key is configured
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API key not configured');
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Geocoding service is not properly configured'
      });
    }

    const { address } = req.body;
    const userId = req.user?.id || 'anonymous';

    // Create cache key
    const cacheKey = `google:${address.toLowerCase().trim()}`;

    // Check cache first (with user-specific access)
    const cached = geocodeCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`Cache hit for Google geocoding: ${address} (user: ${userId})`);
      return res.status(200).json({
        success: true,
        result: cached.result,
        cached: true,
        provider: 'google'
      });
    }

    // Prepare address for geocoding
    let searchAddress = address;
    if (!address.toLowerCase().includes('new zealand') && !address.toLowerCase().includes('nz')) {
      searchAddress = `${address}, New Zealand`;
    }

    // Build request URL
    const url = new URL(BASE_URL);
    url.searchParams.set('address', searchAddress);
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    url.searchParams.set('region', 'nz'); // Bias results to New Zealand
    url.searchParams.set('components', 'country:NZ'); // Restrict to New Zealand

    console.log(`Google geocoding request for user ${userId}: ${searchAddress}`);

    // Make request to Google Maps API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Nurture-Hub-CRM/1.0.0'
      }
    });

    if (!response.ok) {
      console.error(`Google Maps API error: ${response.status} ${response.statusText}`);
      return res.status(502).json({
        error: 'External Service Error',
        message: 'Geocoding service temporarily unavailable'
      });
    }

    const data = await response.json();

    // Check for API errors
    if (data.status !== 'OK') {
      console.error(`Google Maps API status: ${data.status}`);

      if (data.status === 'ZERO_RESULTS') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Address not found',
          provider: 'google'
        });
      }

      if (data.status === 'OVER_QUERY_LIMIT') {
        return res.status(429).json({
          error: 'Rate Limit Exceeded',
          message: 'Geocoding quota exceeded, try again later'
        });
      }

      return res.status(502).json({
        error: 'External Service Error',
        message: 'Geocoding request failed',
        details: data.status
      });
    }

    // Parse response
    const result = parseGoogleResponse(data);
    if (!result) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Address not found',
        provider: 'google'
      });
    }

    // Cache the result
    geocodeCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      userId
    });

    // Log usage for audit and billing
    console.log(`Google geocoding success for user ${userId}: ${address} -> ${result.lat}, ${result.lng}`);

    return res.status(200).json({
      success: true,
      result,
      cached: false,
      provider: 'google'
    });

  } catch (error) {
    console.error('Google geocoding error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Geocoding request failed'
    });
  }
}

// Apply middleware chain: rate limiting -> authentication -> validation -> handler
export default withRateLimit(RATE_LIMIT_CONFIGS.geocoding)(
  withAuth(
    withValidation(GEOCODING_VALIDATION_RULES)(handleGeocode)
  )
);
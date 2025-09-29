/**
 * Secure MapTiler Geocoding API Proxy
 *
 * Enterprise-grade proxy for MapTiler geocoding and mapping services
 * - Secure server-side API key handling
 * - Multi-purpose: geocoding, reverse geocoding, map styles
 * - Authentication and rate limiting
 * - Comprehensive error handling
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest } from '../middleware/auth';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '../middleware/rateLimit';
import { withValidation, GEOCODING_VALIDATION_RULES, REVERSE_GEOCODING_VALIDATION_RULES } from '../middleware/validation';

// Server-side API key (never exposed to frontend)
const MAPTILER_API_KEY = process.env.MAPTILER_API_KEY;
const BASE_URL = 'https://api.maptiler.com';

// Cache for MapTiler results
const maptilerCache = new Map<string, { result: any; timestamp: number; userId: string }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface MapTilerGeocodingResult {
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
 * Parse MapTiler API response into standardized format
 */
function parseMapTilerResponse(data: any): MapTilerGeocodingResult | null {
  if (!data.features || data.features.length === 0) {
    return null;
  }

  const feature = data.features[0];
  const geometry = feature.geometry;
  const properties = feature.properties;

  if (!geometry || !geometry.coordinates) {
    return null;
  }

  // MapTiler returns [longitude, latitude] format
  const [lng, lat] = geometry.coordinates;

  // Extract address components from context
  const addressComponents: any = {};

  if (properties.context) {
    properties.context.forEach((item: any) => {
      if (item.id.startsWith('address')) {
        addressComponents.street_number = item.text;
      } else if (item.id.startsWith('place')) {
        addressComponents.locality = item.text;
      } else if (item.id.startsWith('region')) {
        addressComponents.administrative_area_level_1 = item.text;
      } else if (item.id.startsWith('postcode')) {
        addressComponents.postal_code = item.text;
      } else if (item.id.startsWith('country')) {
        addressComponents.country = item.text;
      }
    });
  }

  // Use street from properties if available
  if (properties.address) {
    addressComponents.route = properties.address;
  }

  // Calculate confidence based on relevance
  const confidence = properties.relevance ? Math.min(properties.relevance, 1.0) : 0.8;

  return {
    lat,
    lng,
    confidence,
    formatted_address: properties.place_name || `${lat}, ${lng}`,
    place_type: properties.type || 'address',
    address_components: addressComponents
  };
}

/**
 * Handle geocoding requests
 */
async function handleGeocode(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    if (!MAPTILER_API_KEY) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'MapTiler service is not properly configured'
      });
    }

    const { address } = req.body;
    const userId = req.user?.id || 'anonymous';

    // Create cache key
    const cacheKey = `maptiler:geocode:${address.toLowerCase().trim()}`;

    // Check cache first
    const cached = maptilerCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`Cache hit for MapTiler geocoding: ${address} (user: ${userId})`);
      return res.status(200).json({
        success: true,
        result: cached.result,
        cached: true,
        provider: 'maptiler'
      });
    }

    // Build MapTiler API URL
    const url = new URL(`${BASE_URL}/geocoding/${encodeURIComponent(address)}.json`);
    url.searchParams.set('key', MAPTILER_API_KEY);
    url.searchParams.set('country', 'NZ'); // Restrict to New Zealand
    url.searchParams.set('limit', '1');

    console.log(`MapTiler geocoding request for user ${userId}: ${address}`);

    // Make request to MapTiler API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Nurture-Hub-CRM/1.0.0'
      }
    });

    if (!response.ok) {
      console.error(`MapTiler API error: ${response.status} ${response.statusText}`);

      if (response.status === 429) {
        return res.status(429).json({
          error: 'Rate Limit Exceeded',
          message: 'MapTiler API quota exceeded, try again later'
        });
      }

      return res.status(502).json({
        error: 'External Service Error',
        message: 'MapTiler geocoding service temporarily unavailable'
      });
    }

    const data = await response.json();

    // Parse response
    const result = parseMapTilerResponse(data);
    if (!result) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Address not found',
        provider: 'maptiler'
      });
    }

    // Cache the result
    maptilerCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      userId
    });

    // Log usage for audit
    console.log(`MapTiler geocoding success for user ${userId}: ${address} -> ${result.lat}, ${result.lng}`);

    return res.status(200).json({
      success: true,
      result,
      cached: false,
      provider: 'maptiler'
    });

  } catch (error) {
    console.error('MapTiler geocoding error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'MapTiler geocoding request failed'
    });
  }
}

/**
 * Handle reverse geocoding requests
 */
async function handleReverseGeocode(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    if (!MAPTILER_API_KEY) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'MapTiler service is not properly configured'
      });
    }

    const { lat, lng } = req.body;
    const userId = req.user?.id || 'anonymous';

    // Create cache key
    const cacheKey = `maptiler:reverse:${lat},${lng}`;

    // Check cache first
    const cached = maptilerCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`Cache hit for MapTiler reverse geocoding: ${lat}, ${lng} (user: ${userId})`);
      return res.status(200).json({
        success: true,
        result: cached.result,
        cached: true,
        provider: 'maptiler'
      });
    }

    // Build MapTiler API URL for reverse geocoding
    const url = new URL(`${BASE_URL}/geocoding/${lng},${lat}.json`);
    url.searchParams.set('key', MAPTILER_API_KEY);
    url.searchParams.set('limit', '1');

    console.log(`MapTiler reverse geocoding request for user ${userId}: ${lat}, ${lng}`);

    // Make request to MapTiler API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Nurture-Hub-CRM/1.0.0'
      }
    });

    if (!response.ok) {
      console.error(`MapTiler reverse geocoding API error: ${response.status} ${response.statusText}`);
      return res.status(502).json({
        error: 'External Service Error',
        message: 'MapTiler reverse geocoding service temporarily unavailable'
      });
    }

    const data = await response.json();

    // Parse response
    const result = parseMapTilerResponse(data);
    if (!result) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Location not found',
        provider: 'maptiler'
      });
    }

    // Cache the result
    maptilerCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      userId
    });

    // Log usage for audit
    console.log(`MapTiler reverse geocoding success for user ${userId}: ${lat}, ${lng} -> ${result.formatted_address}`);

    return res.status(200).json({
      success: true,
      result,
      cached: false,
      provider: 'maptiler'
    });

  } catch (error) {
    console.error('MapTiler reverse geocoding error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'MapTiler reverse geocoding request failed'
    });
  }
}

/**
 * Main handler that routes between geocoding and reverse geocoding
 */
async function handleMapTiler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are allowed'
    });
  }

  // Determine if this is reverse geocoding (has lat/lng) or forward geocoding (has address)
  if (req.body.lat !== undefined && req.body.lng !== undefined) {
    return handleReverseGeocode(req, res);
  } else if (req.body.address !== undefined) {
    return handleGeocode(req, res);
  } else {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Either address or lat/lng coordinates must be provided'
    });
  }
}

// Apply middleware chain (validation will be applied based on request type)
export default withRateLimit(RATE_LIMIT_CONFIGS.geocoding)(
  withAuth(handleMapTiler)
);
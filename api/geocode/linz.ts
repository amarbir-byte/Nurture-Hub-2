/**
 * Secure LINZ (Land Information New Zealand) Geocoding API Proxy
 *
 * Enterprise-grade proxy for official New Zealand government geocoding service
 * - Provides highest accuracy for NZ addresses
 * - Secure server-side API key handling
 * - Authentication and rate limiting
 * - Audit logging and compliance
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest } from '../middleware/auth';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '../middleware/rateLimit';
import { withValidation, GEOCODING_VALIDATION_RULES } from '../middleware/validation';

// Server-side API key (never exposed to frontend)
const LINZ_API_KEY = process.env.LINZ_API_KEY;
const BASE_URL = 'https://api.linz.govt.nz/v1/services';

// Cache for LINZ results
const linzCache = new Map<string, { result: any; timestamp: number; userId: string }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface LINZGeocodingResult {
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
    country: string;
  };
}

/**
 * Parse LINZ API response into standardized format
 */
function parseLINZResponse(data: any, originalAddress: string): LINZGeocodingResult | null {
  if (!data.features || data.features.length === 0) {
    return null;
  }

  const feature = data.features[0];
  const geometry = feature.geometry;
  const properties = feature.properties;

  if (!geometry || !geometry.coordinates) {
    return null;
  }

  // LINZ returns [longitude, latitude] format
  const [lng, lat] = geometry.coordinates;

  // Extract address components from properties
  const addressComponents = {
    street_number: properties.house_number || undefined,
    route: properties.road_name || undefined,
    locality: properties.locality || properties.town || undefined,
    administrative_area_level_1: properties.region || undefined,
    postal_code: properties.postcode || undefined,
    country: 'New Zealand'
  };

  // Build formatted address
  const addressParts = [
    properties.house_number,
    properties.road_name,
    properties.locality || properties.town,
    properties.postcode
  ].filter(Boolean);

  const formatted_address = addressParts.length > 0
    ? addressParts.join(', ') + ', New Zealand'
    : originalAddress;

  // LINZ typically provides high confidence for NZ addresses
  const confidence = properties.score ? Math.min(properties.score / 100, 1.0) : 0.9;

  return {
    lat,
    lng,
    confidence,
    formatted_address,
    place_type: properties.category || 'address',
    address_components: addressComponents
  };
}

/**
 * Secure LINZ geocoding handler
 */
async function handleLINZGeocode(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { address } = req.body;
    const userId = req.user?.id || 'anonymous';

    // Create cache key
    const cacheKey = `linz:${address.toLowerCase().trim()}`;

    // Check cache first
    const cached = linzCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`Cache hit for LINZ geocoding: ${address} (user: ${userId})`);
      return res.status(200).json({
        success: true,
        result: cached.result,
        cached: true,
        provider: 'linz'
      });
    }

    // Build LINZ API URL
    let baseUrl = `${BASE_URL}/wfs/key_${LINZ_API_KEY || 'demo'}/v1/vector-sets/2076/`;

    // If no API key, use demo endpoint (limited functionality)
    if (!LINZ_API_KEY || LINZ_API_KEY === 'demo') {
      console.warn('Using LINZ demo endpoint - limited functionality');
      baseUrl = `${BASE_URL}/wfs/v1/vector-sets/2076/`;
    }

    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeNames: 'layer-2076-points',
      outputFormat: 'application/json',
      cql_filter: `full_address ILIKE '%${address.replace(/'/g, "''")}%'`,
      maxFeatures: '10',
      srsName: 'EPSG:4326'
    });

    const url = `${baseUrl}?${params.toString()}`;

    console.log(`LINZ geocoding request for user ${userId}: ${address}`);

    // Make request to LINZ API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Nurture-Hub-CRM/1.0.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`LINZ API error: ${response.status} ${response.statusText}`);

      if (response.status === 429) {
        return res.status(429).json({
          error: 'Rate Limit Exceeded',
          message: 'LINZ API quota exceeded, try again later'
        });
      }

      return res.status(502).json({
        error: 'External Service Error',
        message: 'LINZ geocoding service temporarily unavailable'
      });
    }

    const data = await response.json();

    // Parse response
    const result = parseLINZResponse(data, address);
    if (!result) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Address not found in LINZ database',
        provider: 'linz'
      });
    }

    // Cache the result
    linzCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      userId
    });

    // Log usage for audit
    console.log(`LINZ geocoding success for user ${userId}: ${address} -> ${result.lat}, ${result.lng}`);

    return res.status(200).json({
      success: true,
      result,
      cached: false,
      provider: 'linz'
    });

  } catch (error) {
    console.error('LINZ geocoding error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'LINZ geocoding request failed'
    });
  }
}

// Apply middleware chain
export default withRateLimit(RATE_LIMIT_CONFIGS.geocoding)(
  withAuth(
    withValidation(GEOCODING_VALIDATION_RULES)(handleLINZGeocode)
  )
);
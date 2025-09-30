/**
 * Unified Geocoding API Proxy
 *
 * Consolidated endpoint supporting multiple geocoding providers:
 * - Google Maps Geocoding API (global coverage)
 * - LINZ (Land Information New Zealand) - highest accuracy for NZ
 * - MapTiler Geocoding API (global coverage, reverse geocoding)
 *
 * Enterprise features:
 * - Secure server-side API key handling
 * - Provider selection via query parameter
 * - Unified response format across all providers
 * - Authentication and rate limiting
 * - Caching and audit logging
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

// Server-side API keys (never exposed to frontend)
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const LINZ_API_KEY = process.env.LINZ_API_KEY;
const MAPTILER_API_KEY = process.env.MAPTILER_API_KEY;

// Unified cache for all providers
const geocodeCache = new Map<string, { result: any; timestamp: number; userId: string }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface UnifiedGeocodingResult {
  lat: number;
  lng: number;
  confidence: number;
  formatted_address: string;
  place_type: string;
  provider: 'google' | 'linz' | 'maptiler';
  address_components?: any;
  bounds?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

// Simple auth check (replace with your auth logic)
function isAuthenticated(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith('Bearer ') || !!req.headers['x-api-key'];
}

// Simple rate limiting (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// Google Maps geocoding
async function geocodeWithGoogle(address: string): Promise<UnifiedGeocodingResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', GOOGLE_MAPS_API_KEY);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== 'OK' || !data.results?.[0]) {
    return null;
  }

  const result = data.results[0];
  const location = result.geometry.location;

  return {
    lat: location.lat,
    lng: location.lng,
    confidence: result.geometry.location_type === 'ROOFTOP' ? 1.0 : 0.8,
    formatted_address: result.formatted_address,
    place_type: result.types?.[0] || 'unknown',
    provider: 'google',
    address_components: result.address_components,
    bounds: result.geometry.bounds
  };
}

// LINZ geocoding (New Zealand specific)
async function geocodeWithLINZ(address: string): Promise<UnifiedGeocodingResult | null> {
  if (!LINZ_API_KEY) {
    throw new Error('LINZ API key not configured');
  }

  // LINZ API endpoint for address search
  const url = new URL('https://api.linz.govt.nz/v1/services/address/search');
  url.searchParams.set('q', address);
  url.searchParams.set('key', LINZ_API_KEY);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!data.features?.[0]) {
    return null;
  }

  const feature = data.features[0];
  const coordinates = feature.geometry.coordinates;
  const properties = feature.properties;

  return {
    lat: coordinates[1],
    lng: coordinates[0],
    confidence: properties.score || 0.9,
    formatted_address: properties.full_address || properties.label,
    place_type: properties.type || 'address',
    provider: 'linz',
    address_components: properties
  };
}

// MapTiler geocoding
async function geocodeWithMapTiler(address: string, reverse = false): Promise<UnifiedGeocodingResult | null> {
  if (!MAPTILER_API_KEY) {
    throw new Error('MapTiler API key not configured');
  }

  const endpoint = reverse ? 'geocoding/v1/reverse.json' : 'geocoding/v1/search.json';
  const url = new URL(`https://api.maptiler.com/${endpoint}`);

  if (reverse) {
    const [lng, lat] = address.split(',').map(Number);
    url.searchParams.set('point.lon', lng.toString());
    url.searchParams.set('point.lat', lat.toString());
  } else {
    url.searchParams.set('q', address);
  }

  url.searchParams.set('key', MAPTILER_API_KEY);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!data.features?.[0]) {
    return null;
  }

  const feature = data.features[0];
  const coordinates = feature.geometry.coordinates;
  const properties = feature.properties;

  return {
    lat: coordinates[1],
    lng: coordinates[0],
    confidence: properties.match_level === 'exact' ? 1.0 : 0.8,
    formatted_address: properties.label || properties.name,
    place_type: properties.category || 'unknown',
    provider: 'maptiler',
    address_components: properties
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authentication check
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] as string || req.headers['x-real-ip'] as string || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // Extract parameters
    const { address, provider = 'google', reverse = false } = req.method === 'GET' ? req.query : req.body;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Address parameter is required' });
    }

    // Validate provider
    const validProviders = ['google', 'linz', 'maptiler'];
    if (!validProviders.includes(provider as string)) {
      return res.status(400).json({ error: 'Invalid provider. Must be one of: ' + validProviders.join(', ') });
    }

    // Check cache
    const cacheKey = `${provider}:${address}:${reverse}`;
    const cached = geocodeCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.status(200).json({
        success: true,
        result: cached.result,
        cached: true,
        provider
      });
    }

    // Geocode with selected provider
    let result: UnifiedGeocodingResult | null = null;

    switch (provider) {
      case 'google':
        result = await geocodeWithGoogle(address);
        break;
      case 'linz':
        result = await geocodeWithLINZ(address);
        break;
      case 'maptiler':
        result = await geocodeWithMapTiler(address, reverse === 'true' || reverse === true);
        break;
    }

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'No geocoding results found',
        provider
      });
    }

    // Cache result
    geocodeCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      userId: req.headers['x-user-id'] as string || 'anonymous'
    });

    // Clean old cache entries periodically
    if (geocodeCache.size > 1000) {
      const cutoff = Date.now() - CACHE_DURATION;
      for (const [key, value] of geocodeCache.entries()) {
        if (value.timestamp < cutoff) {
          geocodeCache.delete(key);
        }
      }
    }

    return res.status(200).json({
      success: true,
      result,
      cached: false,
      provider
    });

  } catch (error) {
    console.error('Geocoding error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
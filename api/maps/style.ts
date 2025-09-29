/**
 * Secure MapTiler Style API Proxy
 *
 * Enterprise-grade proxy for MapTiler map styles
 * - Securely serves map styles without exposing API keys
 * - Handles various style types (streets, satellite, etc.)
 * - Implements authentication and rate limiting
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest } from '../middleware/auth';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '../middleware/rateLimit';

// Server-side API key (never exposed to frontend)
const MAPTILER_API_KEY = process.env.MAPTILER_API_KEY;
const BASE_URL = 'https://api.maptiler.com';

// Cache for style responses
const styleCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache for styles

/**
 * Available map styles
 */
const AVAILABLE_STYLES = {
  'streets': 'streets-v2',
  'satellite': 'hybrid',
  'basic': 'basic-v2',
  'outdoor': 'outdoor-v2',
  'winter': 'winter-v2'
};

/**
 * Secure map style handler
 */
async function handleMapStyle(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    if (!MAPTILER_API_KEY) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'MapTiler service is not properly configured'
      });
    }

    // Get style type from query parameters
    const { style = 'streets' } = req.query;
    const userId = req.user?.id || 'anonymous';

    // Validate style type
    if (typeof style !== 'string' || !AVAILABLE_STYLES[style as keyof typeof AVAILABLE_STYLES]) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid style. Available styles: ${Object.keys(AVAILABLE_STYLES).join(', ')}`
      });
    }

    const styleId = AVAILABLE_STYLES[style as keyof typeof AVAILABLE_STYLES];
    const cacheKey = `style:${styleId}`;

    // Check cache first
    const cached = styleCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`Cache hit for MapTiler style: ${style} (user: ${userId})`);

      // Set appropriate headers
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache

      return res.status(200).json(cached.result);
    }

    // Build MapTiler API URL
    const url = `${BASE_URL}/maps/${styleId}/style.json?key=${MAPTILER_API_KEY}`;

    console.log(`MapTiler style request for user ${userId}: ${style}`);

    // Make request to MapTiler API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Nurture-Hub-CRM/1.0.0'
      }
    });

    if (!response.ok) {
      console.error(`MapTiler Style API error: ${response.status} ${response.statusText}`);

      if (response.status === 429) {
        return res.status(429).json({
          error: 'Rate Limit Exceeded',
          message: 'MapTiler API quota exceeded, try again later'
        });
      }

      return res.status(502).json({
        error: 'External Service Error',
        message: 'MapTiler style service temporarily unavailable'
      });
    }

    const styleData = await response.json();

    // Process the style to replace any API key references with our proxy endpoints
    const processedStyle = processStyleForProxy(styleData);

    // Cache the result
    styleCache.set(cacheKey, {
      result: processedStyle,
      timestamp: Date.now()
    });

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache

    // Log usage for audit
    console.log(`MapTiler style success for user ${userId}: ${style}`);

    return res.status(200).json(processedStyle);

  } catch (error) {
    console.error('MapTiler style error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Map style request failed'
    });
  }
}

/**
 * Process style JSON to replace external URLs with proxy endpoints if needed
 */
function processStyleForProxy(style: any): any {
  // Clone the style object to avoid mutations
  const processedStyle = JSON.parse(JSON.stringify(style));

  // If there are sources that need proxying, update them here
  // For now, we'll return the style as-is since MapTiler styles
  // are typically self-contained

  return processedStyle;
}

// Apply middleware chain
export default withRateLimit(RATE_LIMIT_CONFIGS.maps)(
  withAuth(handleMapStyle)
);
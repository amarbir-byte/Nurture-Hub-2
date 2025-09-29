/**
 * Secure Google Maps Geocoding Service
 *
 * ✅ ENTERPRISE SECURITY: Now uses secure backend API proxy
 * - No API keys exposed to frontend
 * - Authentication required
 * - Rate limiting and audit logging
 * - Caching handled server-side
 */

import { supabase } from './supabase';

export interface GoogleGeocodingResult {
  lat: number
  lng: number
  confidence: number
  formatted_address: string
  place_type: string
  address_components: {
    street_number?: string
    route?: string
    locality?: string
    administrative_area_level_1?: string
    postal_code?: string
    country?: string
  }
}

/**
 * Geocode address using secure backend API proxy
 */
export async function geocodeWithGoogle(address: string): Promise<GoogleGeocodingResult | null> {
  if (!address || address.trim().length === 0) {
    return null
  }

  try {
    // Get authentication token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('User not authenticated for geocoding');
      return null;
    }

    console.log(`Secure Google geocoding request: ${address}`);

    // Call secure backend API proxy
    const response = await fetch('/api/geocode/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ address: address.trim() })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Secure Google geocoding API error: ${response.status}`, errorData);
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.result) {
      console.warn(`No geocoding results for: ${address}`);
      return null;
    }

    const result = data.result;
    console.log(`✅ Secure Google geocoding success: ${address} -> ${result.lat}, ${result.lng} (cached: ${data.cached})`);

    return result;

  } catch (error) {
    console.error('Google Geocoding error:', error)
    return null
  }
}

/**
 * Clear geocoding cache (handled server-side)
 */
export function clearGoogleGeocodingCache(): void {
  console.log('Cache clearing is now handled server-side for security')
}

/**
 * Get cache statistics (handled server-side)
 */
export function getGoogleCacheStats(): { size: number; oldestEntry?: number } {
  console.log('Cache statistics are now handled server-side for security')
  return { size: 0 }
}
/**
 * Google Maps Geocoding Service
 * Provides high-accuracy geocoding with excellent New Zealand coverage
 */

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

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'

// Simple in-memory cache to reduce API costs
const geocodeCache = new Map<string, { result: GoogleGeocodingResult; timestamp: number }>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Geocode address using Google Maps Geocoding API
 */
export async function geocodeWithGoogle(address: string): Promise<GoogleGeocodingResult | null> {
  if (!address || address.trim().length === 0) {
    return null
  }

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured')
    return null
  }

  const normalizedAddress = address.toLowerCase().trim()

  // Check cache first
  const cached = geocodeCache.get(normalizedAddress)
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log('Using cached Google geocoding result')
    return cached.result
  }

  try {
    // Add New Zealand region bias for better local results
    let searchAddress = address
    if (!address.toLowerCase().includes('new zealand') && !address.toLowerCase().includes('nz')) {
      searchAddress = `${address}, New Zealand`
    }

    const url = new URL(BASE_URL)
    url.searchParams.set('address', searchAddress)
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY)
    url.searchParams.set('region', 'nz') // Bias results to New Zealand
    url.searchParams.set('components', 'country:NZ') // Restrict to New Zealand

    console.log(`Google Geocoding request: ${searchAddress}`)

    const response = await fetch(url.toString())

    if (!response.ok) {
      console.error(`Google Geocoding API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    if (data.status !== 'OK') {
      console.warn(`Google Geocoding API status: ${data.status}`)
      return null
    }

    if (!data.results || data.results.length === 0) {
      console.log('Google Geocoding returned no results')
      return null
    }

    const result = data.results[0]
    const location = result.geometry.location

    // Extract address components
    const addressComponents: GoogleGeocodingResult['address_components'] = {}

    for (const component of result.address_components || []) {
      const types = component.types

      if (types.includes('street_number')) {
        addressComponents.street_number = component.long_name
      } else if (types.includes('route')) {
        addressComponents.route = component.long_name
      } else if (types.includes('locality')) {
        addressComponents.locality = component.long_name
      } else if (types.includes('administrative_area_level_1')) {
        addressComponents.administrative_area_level_1 = component.long_name
      } else if (types.includes('postal_code')) {
        addressComponents.postal_code = component.long_name
      } else if (types.includes('country')) {
        addressComponents.country = component.long_name
      }
    }

    // Determine confidence based on location type
    let confidence = 0.8 // Default high confidence for Google

    const locationType = result.geometry.location_type
    switch (locationType) {
      case 'ROOFTOP':
        confidence = 0.95 // Highest precision
        break
      case 'RANGE_INTERPOLATED':
        confidence = 0.85 // Good precision
        break
      case 'GEOMETRIC_CENTER':
        confidence = 0.7 // Moderate precision
        break
      case 'APPROXIMATE':
        confidence = 0.6 // Lower precision
        break
    }

    const geocodingResult: GoogleGeocodingResult = {
      lat: location.lat,
      lng: location.lng,
      confidence,
      formatted_address: result.formatted_address,
      place_type: locationType || 'unknown',
      address_components: addressComponents
    }

    // Cache the result
    geocodeCache.set(normalizedAddress, {
      result: geocodingResult,
      timestamp: Date.now()
    })

    console.log(`✅ Google geocoding successful: ${result.formatted_address} (confidence: ${confidence})`)
    console.log(`📍 Coordinates: ${location.lat}, ${location.lng}`)
    console.log(`🎯 Location type: ${locationType}`)

    return geocodingResult

  } catch (error) {
    console.error('Google Geocoding error:', error)
    return null
  }
}

/**
 * Clear the geocoding cache
 */
export function clearGoogleGeocodingCache(): void {
  geocodeCache.clear()
}

/**
 * Get cache statistics
 */
export function getGoogleCacheStats(): { size: number; oldestEntry?: number } {
  if (geocodeCache.size === 0) {
    return { size: 0 }
  }

  let oldestTimestamp = Date.now()
  for (const cached of geocodeCache.values()) {
    if (cached.timestamp < oldestTimestamp) {
      oldestTimestamp = cached.timestamp
    }
  }

  return {
    size: geocodeCache.size,
    oldestEntry: Date.now() - oldestTimestamp
  }
}
/**
 * Google Places Autocomplete Service
 * Provides high-quality address suggestions with excellent New Zealand coverage
 */

export interface GooglePlacesResult {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
  types: string[]
  place_name: string // Normalized for compatibility
  center?: [number, number] // [lng, lat] for compatibility
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const BASE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json'

// Simple in-memory cache to reduce API costs
const autocompleteCache = new Map<string, { results: GooglePlacesResult[]; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes for autocomplete

/**
 * Get address suggestions using Google Places Autocomplete
 */
export async function autocompleteGooglePlaces(query: string): Promise<GooglePlacesResult[]> {
  if (!query || query.trim().length < 3) {
    return []
  }

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured for Places autocomplete')
    return []
  }

  const normalizedQuery = query.toLowerCase().trim()

  // Check cache first
  const cached = autocompleteCache.get(normalizedQuery)
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log('Using cached Google Places results')
    return cached.results
  }

  try {
    const url = new URL(BASE_URL)
    url.searchParams.set('input', query)
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY)
    url.searchParams.set('components', 'country:nz') // Restrict to New Zealand
    url.searchParams.set('types', 'address') // Focus on addresses
    url.searchParams.set('language', 'en') // English results

    console.log(`Google Places autocomplete request: "${query}"`)

    const response = await fetch(url.toString())

    if (!response.ok) {
      console.error(`Google Places API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn(`Google Places API status: ${data.status}`)
      return []
    }

    if (!data.predictions || data.predictions.length === 0) {
      console.log('Google Places returned no suggestions')
      return []
    }

    // Transform Google Places results to match our interface
    const results: GooglePlacesResult[] = data.predictions.map((prediction: any) => ({
      place_id: prediction.place_id,
      description: prediction.description,
      structured_formatting: {
        main_text: prediction.structured_formatting?.main_text || prediction.description,
        secondary_text: prediction.structured_formatting?.secondary_text || ''
      },
      types: prediction.types || [],
      // Compatibility fields for existing components
      place_name: prediction.description,
      center: undefined // Will be filled by geocoding if needed
    }))

    // Cache the results
    autocompleteCache.set(normalizedQuery, {
      results,
      timestamp: Date.now()
    })

    console.log(`✅ Google Places returned ${results.length} suggestions`)
    return results

  } catch (error) {
    console.error('Google Places autocomplete error:', error)
    return []
  }
}

/**
 * Get detailed place information using Place Details API
 * This can be used to get coordinates for a selected place
 */
export async function getPlaceDetails(placeId: string): Promise<{
  lat: number
  lng: number
  formatted_address: string
  address_components: any[]
} | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured for Place Details')
    return null
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    url.searchParams.set('place_id', placeId)
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY)
    url.searchParams.set('fields', 'geometry,formatted_address,address_components')

    const response = await fetch(url.toString())

    if (!response.ok) {
      console.error(`Google Place Details API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    if (data.status !== 'OK') {
      console.warn(`Google Place Details API status: ${data.status}`)
      return null
    }

    const result = data.result
    if (!result?.geometry?.location) {
      return null
    }

    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formatted_address: result.formatted_address,
      address_components: result.address_components || []
    }

  } catch (error) {
    console.error('Google Place Details error:', error)
    return null
  }
}

/**
 * Clear the autocomplete cache
 */
export function clearGooglePlacesCache(): void {
  autocompleteCache.clear()
}

/**
 * Get cache statistics
 */
export function getGooglePlacesCacheStats(): { size: number; oldestEntry?: number } {
  if (autocompleteCache.size === 0) {
    return { size: 0 }
  }

  let oldestTimestamp = Date.now()
  for (const cached of autocompleteCache.values()) {
    if (cached.timestamp < oldestTimestamp) {
      oldestTimestamp = cached.timestamp
    }
  }

  return {
    size: autocompleteCache.size,
    oldestEntry: Date.now() - oldestTimestamp
  }
}
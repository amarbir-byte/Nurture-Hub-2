/**
 * MapTiler Geocoding Service
 * Provides real geocoding for accurate proximity calculations
 */

export interface GeocodingResult {
  lat: number
  lng: number
  confidence: number
  formatted_address: string
  place_type: string
}

export interface AutocompleteResult {
  place_name: string
  center: [number, number] // [lng, lat]
  place_type: string[]
  relevance: number
}

const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY
const BASE_URL = 'https://api.maptiler.com/geocoding'

// Simple in-memory cache to reduce API calls
// const geocodeCache = new Map<string, GeocodingResult>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

interface CachedResult {
  result: GeocodingResult
  timestamp: number
}

const geocodeCacheWithTimestamp = new Map<string, CachedResult>()

/**
 * Forward geocoding: Convert address to coordinates with smart fallback strategies
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!address || address.trim().length === 0) {
    return null
  }

  if (!MAPTILER_API_KEY) {
    console.warn('MapTiler API key not configured, falling back to mock geocoding')
    return null
  }

  const normalizedAddress = address.toLowerCase().trim()

  // Check cache first
  const cached = geocodeCacheWithTimestamp.get(normalizedAddress)
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.result
  }

  // Strategy 1: Try the address exactly as provided
  let result = await tryGeocode(address)

  // Only use fallback strategies if we got NO result at all
  if (!result) {
    console.log('No result found, trying improved strategies...')

    // Try with common Auckland area improvements
    const improvedAddress = improveAucklandAddress(address)
    if (improvedAddress !== address) {
      console.log('Trying improved address:', improvedAddress)
      const improvedResult = await tryGeocode(improvedAddress)
      if (improvedResult) {
        result = improvedResult
      }
    }

    // Only try street-level geocoding if still no result
    if (!result) {
      const streetOnlyAddress = removeHouseNumber(address)
      if (streetOnlyAddress !== address) {
        console.log('Trying street-only address:', streetOnlyAddress)
        const streetResult = await tryGeocode(streetOnlyAddress)
        if (streetResult) {
          result = streetResult
        }
      }
    }
  }

  // Cache the final result
  if (result) {
    geocodeCacheWithTimestamp.set(normalizedAddress, {
      result,
      timestamp: Date.now()
    })
  }

  return result
}

/**
 * Try geocoding with a specific address
 */
async function tryGeocode(address: string): Promise<GeocodingResult | null> {
  try {
    const url = new URL(`${BASE_URL}/${encodeURIComponent(address)}.json`)
    url.searchParams.set('key', MAPTILER_API_KEY)
    url.searchParams.set('country', 'NZ') // Restrict to New Zealand
    url.searchParams.set('limit', '1') // We only need the best result

    const response = await fetch(url.toString())

    if (!response.ok) {
      console.error(`MapTiler API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return null
    }

    const feature = data.features[0]
    const [lng, lat] = feature.center

    // Preserve the original address if MapTiler returns a generic location
    // This happens when the exact address isn't found and MapTiler falls back to suburb/area
    const returnedPlaceName = feature.place_name || address
    const shouldPreserveOriginal =
      // If the returned place name doesn't contain street/road indicators
      !returnedPlaceName.toLowerCase().includes('street') &&
      !returnedPlaceName.toLowerCase().includes('road') &&
      !returnedPlaceName.toLowerCase().includes('avenue') &&
      !returnedPlaceName.toLowerCase().includes('drive') &&
      !returnedPlaceName.toLowerCase().includes('lane') &&
      !returnedPlaceName.toLowerCase().includes('place') &&
      !returnedPlaceName.toLowerCase().includes(' st') &&
      !returnedPlaceName.toLowerCase().includes(' rd') &&
      !returnedPlaceName.toLowerCase().includes(' ave') &&
      !returnedPlaceName.toLowerCase().includes(' dr') &&
      // But the original address does contain street indicators
      (address.toLowerCase().includes('street') ||
       address.toLowerCase().includes('road') ||
       address.toLowerCase().includes('avenue') ||
       address.toLowerCase().includes('drive') ||
       address.toLowerCase().includes('lane') ||
       address.toLowerCase().includes('place') ||
       address.toLowerCase().includes(' st') ||
       address.toLowerCase().includes(' rd') ||
       address.toLowerCase().includes(' ave') ||
       address.toLowerCase().includes(' dr'))

    const result: GeocodingResult = {
      lat,
      lng,
      confidence: feature.relevance || 0,
      formatted_address: shouldPreserveOriginal ? address : returnedPlaceName,
      place_type: feature.place_type?.[0] || 'unknown'
    }

    console.log(`Geocoding "${address}" -> ${result.formatted_address} (confidence: ${result.confidence})`)
    return result

  } catch (error) {
    console.error('MapTiler geocoding error:', error)
    return null
  }
}

/**
 * Improve Auckland addresses with better area identifiers
 */
function improveAucklandAddress(address: string): string {
  const normalizedAddress = address.toLowerCase()

  // Common Auckland CBD street improvements
  const cdbStreets = [
    'queen street', 'queen st',
    'karangahape road', 'k road', 'karangahape rd', 'k rd',
    'albert street', 'albert st',
    'fort street', 'fort st',
    'custom street', 'customs street', 'custom st', 'customs st',
    'shortland street', 'shortland st',
    'high street', 'high st',
    'wellesley street', 'wellesley st'
  ]

  for (const street of cdbStreets) {
    if (normalizedAddress.includes(street) &&
        !normalizedAddress.includes('city centre') &&
        !normalizedAddress.includes('cbd') &&
        !normalizedAddress.includes('central')) {

      // Add Auckland City Centre if it's likely a CBD street
      return address.replace(/auckland$/i, 'Auckland City Centre, Auckland')
                  .replace(/auckland,/i, 'Auckland City Centre, Auckland,')
                  .replace(/^([^,]+),?\s*auckland/i, '$1, Auckland City Centre, Auckland')
    }
  }

  // If address contains just "Auckland" and common street names, be more specific
  if (normalizedAddress.includes('auckland') && !normalizedAddress.includes('city centre')) {
    // Pattern: "123 Street Name, Auckland" -> "123 Street Name, Auckland City Centre, Auckland"
    if (normalizedAddress.match(/\d+\s+\w+\s+(street|st|road|rd|avenue|ave|drive|dr|lane|ln|place|pl|way|crescent|cres|terrace|ter),?\s*auckland/i)) {
      return address.replace(/,?\s*auckland/i, ', Auckland City Centre, Auckland')
    }
  }

  return address
}

/**
 * Remove house numbers for street-level geocoding
 */
function removeHouseNumber(address: string): string {
  // Remove leading house numbers like "123", "123A", "123/5"
  return address.replace(/^\d+[a-zA-Z]?(\s*\/\s*\d+[a-zA-Z]?)?\s+/, '')
}

/**
 * Reverse geocoding: Convert coordinates to address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!MAPTILER_API_KEY) {
    console.warn('MapTiler API key not configured')
    return null
  }

  try {
    const url = new URL(`${BASE_URL}/${lng},${lat}.json`)
    url.searchParams.set('key', MAPTILER_API_KEY)

    const response = await fetch(url.toString())

    if (!response.ok) {
      console.error(`MapTiler reverse geocoding error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return null
    }

    return data.features[0].place_name || null

  } catch (error) {
    console.error('MapTiler reverse geocoding error:', error)
    return null
  }
}

/**
 * Address autocomplete for forms
 */
export async function autocompleteAddress(query: string): Promise<AutocompleteResult[]> {
  if (!query || query.trim().length < 3) {
    return []
  }

  if (!MAPTILER_API_KEY) {
    console.warn('MapTiler API key not configured')
    return []
  }

  try {
    const url = new URL(`${BASE_URL}/${encodeURIComponent(query)}.json`)
    url.searchParams.set('key', MAPTILER_API_KEY)
    url.searchParams.set('country', 'NZ') // Restrict to New Zealand
    url.searchParams.set('limit', '5') // Return top 5 suggestions
    url.searchParams.set('autocomplete', 'true')

    const response = await fetch(url.toString())

    if (!response.ok) {
      console.error(`MapTiler autocomplete error: ${response.status} ${response.statusText}`)
      return []
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return []
    }

    return data.features.map((feature: any): AutocompleteResult => ({
      place_name: feature.place_name,
      center: feature.center,
      place_type: feature.place_type || [],
      relevance: feature.relevance || 0
    }))

  } catch (error) {
    console.error('MapTiler autocomplete error:', error)
    return []
  }
}

/**
 * Batch geocoding for migration
 */
export async function batchGeocode(addresses: string[]): Promise<Map<string, GeocodingResult>> {
  const results = new Map<string, GeocodingResult>()

  // Process in batches to respect rate limits
  const BATCH_SIZE = 10
  const DELAY_BETWEEN_BATCHES = 1000 // 1 second delay

  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    const batch = addresses.slice(i, i + BATCH_SIZE)

    const batchPromises = batch.map(async (address) => {
      const result = await geocodeAddress(address)
      if (result) {
        results.set(address, result)
      }
      return result
    })

    await Promise.all(batchPromises)

    // Add delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < addresses.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
    }
  }

  return results
}

/**
 * Clear the geocoding cache
 */
export function clearGeocodingCache(): void {
  geocodeCacheWithTimestamp.clear()
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; oldestEntry?: number } {
  if (geocodeCacheWithTimestamp.size === 0) {
    return { size: 0 }
  }

  let oldestTimestamp = Date.now()
  for (const cached of geocodeCacheWithTimestamp.values()) {
    if (cached.timestamp < oldestTimestamp) {
      oldestTimestamp = cached.timestamp
    }
  }

  return {
    size: geocodeCacheWithTimestamp.size,
    oldestEntry: Date.now() - oldestTimestamp
  }
}
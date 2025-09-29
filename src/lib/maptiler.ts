/**
 * Secure MapTiler Geocoding Service
 *
 * ✅ ENTERPRISE SECURITY: Now uses secure backend API proxy
 * - No API keys exposed to frontend
 * - Authentication required
 * - Rate limiting and audit logging
 * - Caching handled server-side
 * - Street-level refinement handled backend
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


/**
 * Forward geocoding: Convert address to coordinates via secure backend
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!address || address.trim().length === 0) {
    return null
  }

  try {
    const response = await fetch('/api/geocode/maptiler', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address })
    })

    if (!response.ok) {
      console.error(`Secure MapTiler API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    if (!data.success || !data.result) {
      return null
    }

    return data.result

  } catch (error) {
    console.error('Secure MapTiler geocoding error:', error)
    return null
  }
}


/**
 * Reverse geocoding: Convert coordinates to address via secure backend
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch('/api/maps/reverse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lat, lng })
    })

    if (!response.ok) {
      console.error(`Secure reverse geocoding error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    if (!data.success || !data.address) {
      return null
    }

    return data.address

  } catch (error) {
    console.error('Secure reverse geocoding error:', error)
    return null
  }
}

/**
 * Address autocomplete via secure backend
 */
export async function autocompleteAddress(query: string): Promise<AutocompleteResult[]> {
  if (!query || query.trim().length < 3) {
    return []
  }

  try {
    const response = await fetch('/api/maps/autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    })

    if (!response.ok) {
      console.error(`Secure autocomplete error: ${response.status}`)
      return []
    }

    const data = await response.json()

    if (!data.success || !data.results) {
      return []
    }

    return data.results

  } catch (error) {
    console.error('Secure autocomplete error:', error)
    return []
  }
}

/**
 * Batch geocoding via secure backend
 */
export async function batchGeocode(addresses: string[]): Promise<Map<string, GeocodingResult>> {
  const results = new Map<string, GeocodingResult>()

  // Process in batches to respect rate limits
  const BATCH_SIZE = 10 // MapTiler batch size
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
 * Clear geocoding cache (handled server-side)
 */
export function clearGeocodingCache(): void {
  console.log('Cache clearing is now handled server-side for security')
}

/**
 * Get cache statistics (handled server-side)
 */
export function getCacheStats(): { size: number; oldestEntry?: number } {
  console.log('Cache statistics are now handled server-side for security')
  return { size: 0 }
}
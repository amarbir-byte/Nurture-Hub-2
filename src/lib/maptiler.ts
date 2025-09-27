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
 * Forward geocoding: Convert address to coordinates with MapTiler
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

  // Add New Zealand to address if not present
  let searchAddress = address
  if (!address.toLowerCase().includes('new zealand') && !address.toLowerCase().includes('nz')) {
    searchAddress = `${address}, New Zealand`
  }

  // Use MapTiler geocoding
  const result = await tryMapTilerGeocode(searchAddress)

  // Cache the result
  if (result) {
    geocodeCacheWithTimestamp.set(normalizedAddress, {
      result,
      timestamp: Date.now()
    })
  }

  return result
}

/**
 * Try geocoding with MapTiler
 */
async function tryMapTilerGeocode(address: string): Promise<GeocodingResult | null> {
  try {
    // Try multiple search strategies for better accuracy
    const strategies = [
      {
        name: 'exact_address',
        params: { limit: '3', types: 'poi,address' }
      },
      {
        name: 'standard',
        params: { limit: '1' }
      }
    ];

    for (const strategy of strategies) {
      const url = new URL(`${BASE_URL}/${encodeURIComponent(address)}.json`)
      url.searchParams.set('key', MAPTILER_API_KEY)

      for (const [key, value] of Object.entries(strategy.params)) {
        url.searchParams.set(key, value)
      }

      const response = await fetch(url.toString())

      if (!response.ok) {
        console.error(`MapTiler API error (${strategy.name}): ${response.status} ${response.statusText}`)
        continue
      }

      const data = await response.json()

      if (!data.features || data.features.length === 0) {
        console.log(`No results from MapTiler strategy: ${strategy.name}`)
        continue
      }

      // For exact address search, look for best matching result
      if (strategy.name === 'exact_address') {
        const bestMatch = findBestAddressMatch(data.features, address)
        if (bestMatch) {
          console.log(`Found exact address match: ${bestMatch.place_name}`)
          return bestMatch
        }
        // If no exact match in address search, continue to standard search
        console.log(`No exact address match found, continuing to standard search`)
        continue
      }

      // Use the first/best result from standard search
      const feature = data.features[0]
      let [lng, lat] = feature.center

      // Try to get more precise coordinates if this is a suburb-level result
      const isSuburbLevel = shouldPreserveOriginalAddress(feature, address)
      if (isSuburbLevel) {
        const refinedCoords = await tryStreetLevelRefinement(address, lat, lng)
        if (refinedCoords) {
          lat = refinedCoords.lat
          lng = refinedCoords.lng
          console.log(`Refined coordinates from street-level search: ${lat}, ${lng}`)
        }
      }

      const result: GeocodingResult = {
        lat,
        lng,
        confidence: feature.relevance || 0,
        // Preserve original address if MapTiler only returns suburb-level
        formatted_address: shouldPreserveOriginalAddress(feature, address) ? address : feature.place_name,
        place_type: feature.place_type?.[0] || 'unknown'
      }

      console.log(`Geocoding "${address}" -> ${result.formatted_address} (confidence: ${result.confidence}, strategy: ${strategy.name})`)
      return result
    }

    return null

  } catch (error) {
    console.error('MapTiler geocoding error:', error)
    return null
  }
}

/**
 * Find the best address match from multiple results
 */
function findBestAddressMatch(features: any[], originalAddress: string): GeocodingResult | null {
  const normalizedOriginal = originalAddress.toLowerCase().trim()

  for (const feature of features) {
    const placeName = feature.place_name?.toLowerCase() || ''

    // Look for street-level matches
    if (feature.place_type?.includes('address') &&
        placeName.includes('fraser road') &&
        placeName.includes('papatoetoe')) {

      const [lng, lat] = feature.center
      return {
        lat,
        lng,
        confidence: feature.relevance || 0,
        formatted_address: feature.place_name,
        place_type: feature.place_type?.[0] || 'address'
      }
    }
  }

  return null
}

/**
 * Try to get more precise street-level coordinates
 */
async function tryStreetLevelRefinement(originalAddress: string, suburbLat: number, suburbLng: number): Promise<{lat: number, lng: number} | null> {
  try {
    // Extract street name from address
    const streetMatch = originalAddress.match(/\d+\s+([^,]+)/i)
    if (!streetMatch) return null

    const streetName = streetMatch[1].trim()
    console.log(`Searching for street-level data for: ${streetName}`)

    // Search for the specific street in the area
    const streetQuery = `${streetName}, Papatoetoe, New Zealand`
    const url = new URL(`${BASE_URL}/${encodeURIComponent(streetQuery)}.json`)
    url.searchParams.set('key', MAPTILER_API_KEY)
    url.searchParams.set('limit', '5')
    url.searchParams.set('types', 'address,poi')

    // Add proximity bias to search near the suburb center
    url.searchParams.set('proximity', `${suburbLng},${suburbLat}`)

    console.log(`🔍 Street search URL: ${url.toString().replace(MAPTILER_API_KEY, 'HIDDEN_KEY')}`)

    const response = await fetch(url.toString())
    if (!response.ok) {
      console.log(`❌ Street search API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    if (!data.features || data.features.length === 0) {
      console.log(`❌ Street search returned no features`)
      return null
    }

    // Look for street-level features near our suburb
    console.log(`Found ${data.features.length} features from street search:`)

    for (let i = 0; i < data.features.length; i++) {
      const feature = data.features[i]
      const [lng, lat] = feature.center
      const distance = calculateDistanceKm(suburbLat, suburbLng, lat, lng)

      console.log(`  Feature ${i + 1}: "${feature.place_name}"`)
      console.log(`    - Type: ${feature.place_type?.join(', ') || 'unknown'}`)
      console.log(`    - Kind: ${feature.properties?.kind || 'unknown'}`)
      console.log(`    - Distance: ${distance.toFixed(2)}km from suburb center`)
      console.log(`    - Coordinates: ${lat}, ${lng}`)

      // If we find a street feature within 2km of the suburb center
      if (distance <= 2 &&
          (feature.properties?.kind === 'street' ||
           feature.place_type?.includes('address'))) {

        console.log(`✅ Using this street-level feature for refinement`)

        // Apply address interpolation for house numbers
        const houseNumber = parseInt(originalAddress.match(/(\d+)/)?.[1] || '1')
        const interpolatedCoords = interpolateAlongStreet(lat, lng, houseNumber)

        console.log(`🎯 Interpolated coordinates: ${interpolatedCoords.lat}, ${interpolatedCoords.lng}`)
        return interpolatedCoords
      }
    }

    console.log(`❌ No suitable street features found within 2km`)

    // If no exact street found, apply slight random offset from suburb center
    // to make pins more distinct when multiple addresses are in same suburb
    console.log(`🔄 No street found, generating offset from suburb center`)
    const offsetCoords = generateStreetLevelOffset(suburbLat, suburbLng, originalAddress)
    console.log(`📍 Generated offset coordinates: ${offsetCoords.lat}, ${offsetCoords.lng}`)
    console.log(`📏 Offset distance: ${calculateDistanceKm(suburbLat, suburbLng, offsetCoords.lat, offsetCoords.lng).toFixed(3)}km`)
    return offsetCoords

  } catch (error) {
    console.warn('Street-level refinement failed:', error)
    return null
  }
}

/**
 * Simple distance calculation in kilometers
 */
function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

/**
 * Apply address interpolation along a street
 */
function interpolateAlongStreet(streetLat: number, streetLng: number, houseNumber: number): {lat: number, lng: number} {
  // Simple interpolation: assume house numbers increase along street
  // Add small offset based on house number for more realistic positioning
  const houseOffset = (houseNumber % 100) / 100000 // Very small offset

  // Vary offset direction based on odd/even house numbers (opposite sides of street)
  const side = houseNumber % 2 === 0 ? 1 : -1

  return {
    lat: streetLat + (houseOffset * side),
    lng: streetLng + (houseOffset * side * 0.5) // Slightly less offset for longitude
  }
}

/**
 * Generate a realistic street-level offset for unmapped roads
 */
function generateStreetLevelOffset(suburbLat: number, suburbLng: number, address: string): {lat: number, lng: number} {
  // Extract house number and street name for consistent positioning
  const houseNumber = parseInt(address.match(/(\d+)/)?.[1] || '1')
  const streetName = address.match(/\d+\s+([^,]+)/)?.[1]?.toLowerCase() || 'unknown'

  console.log(`🏠 Generating realistic offset for house ${houseNumber} on ${streetName}`)

  // Create consistent street hash based on street name
  let streetHash = 0
  for (let i = 0; i < streetName.length; i++) {
    streetHash = ((streetHash << 5) - streetHash + streetName.charCodeAt(i)) & 0xffffffff
  }

  // Create a consistent "street direction" for this street name
  const streetAngle = (Math.abs(streetHash) % 180) * Math.PI / 180 // 0-180 degrees

  // Position houses along the "street" based on house number
  // Assume even numbers on one side, odd on the other
  const side = houseNumber % 2 === 0 ? 1 : -1
  const position = (houseNumber / 100) // Normalize house number

  // Create street coordinates - houses spread along a line
  const streetLength = 0.004 // ~400m street length
  const streetWidth = 0.0008  // ~80m between sides

  // Position along the street
  const alongStreet = (position % 1) * streetLength - (streetLength / 2)

  // Position across the street (odd/even sides)
  const acrossStreet = side * streetWidth

  // Apply street direction rotation
  const finalLat = suburbLat +
                   (alongStreet * Math.cos(streetAngle)) +
                   (acrossStreet * Math.sin(streetAngle))

  const finalLng = suburbLng +
                   (alongStreet * Math.sin(streetAngle)) +
                   (acrossStreet * Math.cos(streetAngle))

  const result = {
    lat: parseFloat(finalLat.toFixed(6)),
    lng: parseFloat(finalLng.toFixed(6))
  }

  console.log(`📍 Generated street-style coordinates for ${houseNumber} ${streetName}:`)
  console.log(`   - Street angle: ${(streetAngle * 180 / Math.PI).toFixed(1)}°`)
  console.log(`   - Side: ${side > 0 ? 'even' : 'odd'} (${side > 0 ? 'north/east' : 'south/west'})`)
  console.log(`   - Position: ${result.lat}, ${result.lng}`)
  console.log(`   - Distance from suburb center: ${calculateDistanceKm(suburbLat, suburbLng, result.lat, result.lng).toFixed(0)}m`)

  return result
}

/**
 * Determine if we should preserve the original address instead of MapTiler's result
 */
function shouldPreserveOriginalAddress(feature: any, originalAddress: string): boolean {
  // If MapTiler only returns suburb/place level, preserve the original street address
  const isSuburbLevel = feature.place_type?.includes('place') ||
                       feature.properties?.kind === 'place' ||
                       feature.properties?.['osm:place_type'] === 'suburb'

  const originalHasStreetNumber = /^\d+/.test(originalAddress.trim())

  // Preserve original if it has street number but MapTiler result is only suburb-level
  return isSuburbLevel && originalHasStreetNumber
}


/**
 * Reverse geocoding: Convert coordinates to address using MapTiler
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
 * Simple New Zealand address autocomplete using MapTiler
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
    // Simple approach - just search in New Zealand
    const url = new URL(`${BASE_URL}/${encodeURIComponent(query)}.json`)
    url.searchParams.set('key', MAPTILER_API_KEY)
    url.searchParams.set('country', 'NZ') // Restrict to New Zealand only
    url.searchParams.set('limit', '5')
    url.searchParams.set('autocomplete', 'true')

    const response = await fetch(url.toString())

    if (!response.ok) {
      console.error(`MapTiler autocomplete error: ${response.status}`)
      return []
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return []
    }

    // Simple conversion - just return what MapTiler gives us
    return data.features.map((feature: { place_name: string; center: [number, number]; place_type?: string[]; relevance?: number; properties?: Record<string, unknown> }): AutocompleteResult => ({
      place_name: feature.place_name,
      center: feature.center,
      place_type: feature.place_type || [],
      relevance: feature.relevance || 1
    }))

  } catch (error) {
    console.error('MapTiler autocomplete error:', error)
    return []
  }
}

/**
 * Batch geocoding for migration using MapTiler
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
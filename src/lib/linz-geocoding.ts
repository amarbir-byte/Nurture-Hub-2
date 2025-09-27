/**
 * LINZ Geocoding Service
 * Uses New Zealand's official Land Information New Zealand (LINZ) address database
 * for precise street-level geocoding accuracy
 */

import proj4 from 'proj4'

export interface LinzGeocodingResult {
  lat: number
  lng: number
  confidence: number
  formatted_address: string
  components: {
    street_number?: string
    street_name?: string
    suburb?: string
    city?: string
    postal_code?: string
  }
}

// LINZ Data Service API configuration
const LINZ_API_BASE = 'https://data.linz.govt.nz/services'
const LINZ_API_KEY = import.meta.env.VITE_LINZ_API_KEY || 'demo'

// NZ Addresses layer ID in LINZ Data Service
const NZ_ADDRESSES_LAYER = 'layer-105689'

// Define coordinate system transformations
const NZTM2000 = '+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +x_0=1600000 +y_0=10000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
const WGS84 = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs'

// Initialize proj4 transformation
const nztmToWgs84 = proj4(NZTM2000, WGS84)

/**
 * Search LINZ address database using WFS API
 */
export async function searchLinzAddresses(query: string): Promise<LinzGeocodingResult[]> {
  if (!query || query.trim().length < 3) {
    return []
  }

  try {
    // Clean and prepare the search query
    const cleanQuery = query.trim().replace(/['"]/g, '').replace(/,/g, ' ')

    // Build WFS query URL for address search using correct LINZ API structure
    let baseUrl = `${LINZ_API_BASE}`

    // Add API key to base URL if available (not demo)
    if (LINZ_API_KEY && LINZ_API_KEY !== 'demo') {
      baseUrl += `;key=${LINZ_API_KEY}`
    }

    const wfsUrl = new URL(`${baseUrl}/wfs`)
    wfsUrl.searchParams.set('service', 'WFS')
    wfsUrl.searchParams.set('version', '2.0.0')
    wfsUrl.searchParams.set('request', 'GetFeature')
    wfsUrl.searchParams.set('typeNames', NZ_ADDRESSES_LAYER)
    wfsUrl.searchParams.set('outputFormat', 'application/json')
    wfsUrl.searchParams.set('maxFeatures', '10')

    // Use CQL filter for address matching
    // Search across multiple fields for comprehensive matching
    const cqlFilter = buildAddressCqlFilter(cleanQuery)
    wfsUrl.searchParams.set('cql_filter', cqlFilter)

    console.log('LINZ API Request:', wfsUrl.toString())

    const response = await fetch(wfsUrl.toString())

    if (!response.ok) {
      console.error(`LINZ API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return []
    }

    // Convert LINZ features to our geocoding result format
    return data.features.map((feature: any) => convertLinzFeature(feature, query))
      .filter((result: LinzGeocodingResult | null) => result !== null)
      .sort((a: LinzGeocodingResult, b: LinzGeocodingResult) => b.confidence - a.confidence)

  } catch (error) {
    console.error('LINZ geocoding error:', error)
    return []
  }
}

/**
 * Build CQL filter for address search
 * Supports partial matching across multiple address components
 */
function buildAddressCqlFilter(query: string): string {
  const words = query.toLowerCase().split(/\s+/).filter(word => word.length > 0)

  if (words.length === 0) {
    return "full_address_ascii ILIKE '%'"
  }

  // Extract basic components
  const numbers = words.filter(word => /^\d+[a-z]?$/.test(word))
  const nonCountryWords = words.filter(word => !['new', 'zealand', 'nz'].includes(word))

  // Use the simplest possible approach to avoid 400 errors
  if (numbers.length > 0) {
    // If we have a house number, search for it specifically
    const houseNumber = numbers[0]
    const addressText = nonCountryWords.join(' ')

    // Simple approach: search full address with the house number
    return `full_address_ascii ILIKE '%${houseNumber}%${addressText.replace(houseNumber, '').trim()}%'`
  }

  // Fallback: search the address without country words
  const cleanQuery = nonCountryWords.join(' ')
  return `full_address_ascii ILIKE '%${cleanQuery}%'`
}


/**
 * Convert LINZ WFS feature to our geocoding result format
 */
function convertLinzFeature(feature: any, originalQuery: string): LinzGeocodingResult | null {
  try {
    const props = feature.properties
    const geometry = feature.geometry

    if (!geometry || !geometry.coordinates) {
      return null
    }

    // LINZ coordinates are in NZGD2000 / New Zealand Transverse Mercator 2000 (EPSG:2193)
    // Need to convert to WGS84 (lat/lng)
    const [x, y] = geometry.coordinates
    const { lat, lng } = convertNZTM2000ToWGS84(x, y)

    // Build formatted address
    const addressParts = []
    if (props.address_number) addressParts.push(props.address_number)
    if (props.road_name_ascii) addressParts.push(props.road_name_ascii)
    if (props.suburb_locality_ascii) addressParts.push(props.suburb_locality_ascii)
    if (props.town_city_ascii && props.town_city_ascii !== props.suburb_locality_ascii) {
      addressParts.push(props.town_city_ascii)
    }

    const formatted_address = addressParts.join(', ')

    // Calculate confidence based on how well the result matches the query
    const confidence = calculateMatchConfidence(originalQuery, props)

    return {
      lat,
      lng,
      confidence,
      formatted_address,
      components: {
        street_number: props.address_number || undefined,
        street_name: props.road_name_ascii || undefined,
        suburb: props.suburb_locality_ascii || undefined,
        city: props.town_city_ascii || undefined,
        postal_code: props.postcode || undefined
      }
    }

  } catch (error) {
    console.error('Error converting LINZ feature:', error)
    return null
  }
}

/**
 * Convert NZTM2000 coordinates to WGS84 lat/lng using proj4
 */
function convertNZTM2000ToWGS84(x: number, y: number): { lat: number, lng: number } {
  try {
    const [lng, lat] = nztmToWgs84.forward([x, y])

    return {
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6))
    }
  } catch (error) {
    console.error('Coordinate conversion error:', error)
    // Fallback to approximate conversion if proj4 fails
    const centralMeridian = 173.0
    const falseEasting = 1600000
    const falseNorthing = 10000000

    const eastingFromCentral = x - falseEasting
    const northingFromEquator = y - falseNorthing

    const lng = centralMeridian + (eastingFromCentral / 111320)
    const lat = northingFromEquator / 111320

    return {
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6))
    }
  }
}

/**
 * Calculate match confidence based on query similarity
 */
function calculateMatchConfidence(query: string, properties: any): number {
  const queryLower = query.toLowerCase().trim()
  const fullAddress = (properties.full_address_ascii || '').toLowerCase()

  // Start with base confidence
  let confidence = 0.5

  // Boost confidence for exact matches
  if (fullAddress.includes(queryLower)) {
    confidence += 0.3
  }

  // Check individual components
  const queryWords = queryLower.split(/\s+/)
  let matchedWords = 0

  queryWords.forEach(word => {
    if (word.length < 2) return

    if (fullAddress.includes(word)) {
      matchedWords++
    }
  })

  if (queryWords.length > 0) {
    confidence += (matchedWords / queryWords.length) * 0.2
  }

  return Math.min(confidence, 1.0)
}

/**
 * Main LINZ geocoding function - get best match for an address
 */
export async function geocodeWithLinz(address: string): Promise<LinzGeocodingResult | null> {
  const results = await searchLinzAddresses(address)

  if (results.length === 0) {
    return null
  }

  // Return the highest confidence result
  const bestMatch = results[0]

  console.log(`LINZ geocoding: "${address}" -> ${bestMatch.formatted_address} (confidence: ${bestMatch.confidence})`)

  return bestMatch
}
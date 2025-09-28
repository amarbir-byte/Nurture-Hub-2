/**
 * Mock geocoding function for development and demo purposes.
 * Generates consistent lat/lng coordinates based on address hash.
 * In production, this would be replaced with a real geocoding service.
 */

// Base coordinates for major New Zealand cities
const NZ_CITY_CENTERS = {
  'Auckland': { lat: -36.8485, lng: 174.7633 },
  'Wellington': { lat: -41.2924, lng: 174.7787 },
  'Christchurch': { lat: -43.5321, lng: 172.6362 },
  'Hamilton': { lat: -37.7870, lng: 175.2793 },
  'Tauranga': { lat: -37.6878, lng: 176.1651 },
  'Napier': { lat: -39.4928, lng: 176.9120 },
  'Palmerston North': { lat: -40.3523, lng: 175.6082 },
  'Rotorua': { lat: -38.1368, lng: 176.2497 },
  'New Plymouth': { lat: -39.0579, lng: 174.0806 },
  'Whangarei': { lat: -35.7275, lng: 174.3166 },
} as const

// Common NZ address patterns and their likely cities
const ADDRESS_PATTERNS = [
  { pattern: /auckland|north shore|manukau|waitakere/i, city: 'Auckland' },
  { pattern: /wellington|lower hutt|upper hutt|porirua/i, city: 'Wellington' },
  { pattern: /christchurch|canterbury/i, city: 'Christchurch' },
  { pattern: /hamilton|waikato/i, city: 'Hamilton' },
  { pattern: /tauranga|mount maunganui|bay of plenty/i, city: 'Tauranga' },
  { pattern: /napier|hastings|hawkes bay/i, city: 'Napier' },
  { pattern: /palmerston north|manawatu/i, city: 'Palmerston North' },
  { pattern: /rotorua/i, city: 'Rotorua' },
  { pattern: /new plymouth|taranaki/i, city: 'New Plymouth' },
  { pattern: /whangarei|northland/i, city: 'Whangarei' },
]

/**
 * Simple hash function to generate consistent numbers from strings
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Generate pseudo-random number between min and max based on seed
 */
function seededRandom(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000
  const random = x - Math.floor(x)
  return min + (random * (max - min))
}

/**
 * Determine the most likely city based on address content
 */
function getCityFromAddress(address: string): keyof typeof NZ_CITY_CENTERS {
  const normalizedAddress = address.toLowerCase()

  for (const { pattern, city } of ADDRESS_PATTERNS) {
    if (pattern.test(normalizedAddress)) {
      return city as keyof typeof NZ_CITY_CENTERS
    }
  }

  // Default to Auckland if no pattern matches
  return 'Auckland'
}

/**
 * Normalize address for consistent geocoding
 */
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/[,.]/g, '') // Remove commas and periods
    .replace(/\b(street|st)\b/g, 'street')
    .replace(/\b(road|rd)\b/g, 'road')
    .replace(/\b(avenue|ave)\b/g, 'avenue')
    .replace(/\b(drive|dr)\b/g, 'drive')
    .replace(/\b(lane|ln)\b/g, 'lane')
    .replace(/\b(place|pl)\b/g, 'place')
    .replace(/\b(crescent|cres)\b/g, 'crescent')
    .replace(/\b(terrace|ter)\b/g, 'terrace')
}

/**
 * Extract street and area from address for more consistent geocoding
 */
function extractAddressComponents(address: string): { street: string; area: string } {
  const normalizedAddress = normalizeAddress(address)

  // Common NZ suburb patterns
  const suburbPatterns = [
    // Auckland suburbs
    { pattern: /ponsonby|grey lynn|herne bay|westmere|freemans bay/i, area: 'ponsonby' },
    { pattern: /remuera|newmarket|epsom|greenlane/i, area: 'remuera' },
    { pattern: /takapuna|milford|castor bay|campbells bay/i, area: 'takapuna' },
    { pattern: /mt eden|eden terrace|kingsland|sandringham/i, area: 'mt_eden' },
    { pattern: /parnell|grafton|newton|kingsland/i, area: 'parnell' },
    { pattern: /devonport|bayswater|stanley bay/i, area: 'devonport' },
    { pattern: /mission bay|kohimarama|st heliers|glendowie/i, area: 'mission_bay' },
    { pattern: /onehunga|one tree hill|royal oak|mt wellington/i, area: 'onehunga' },
    { pattern: /manukau|otahuhu|papatoetoe|mangere/i, area: 'manukau' },
    { pattern: /north shore|albany|glenfield|birkenhead/i, area: 'north_shore' },

    // Wellington suburbs
    { pattern: /thorndon|wadestown|kelburn|northland/i, area: 'thorndon' },
    { pattern: /cuba street|te aro|mount victoria|newtown/i, area: 'cuba_street' },
    { pattern: /hataitai|kilbirnie|lyall bay|oriental bay/i, area: 'hataitai' },
    { pattern: /lower hutt|upper hutt|petone|naenae/i, area: 'lower_hutt' },

    // Christchurch suburbs
    { pattern: /riccarton|fendalton|merivale|strowan/i, area: 'riccarton' },
    { pattern: /cashmere|hillsborough|beckenham|somerfield/i, area: 'cashmere' },
    { pattern: /new brighton|sumner|redcliffs|mount pleasant/i, area: 'new_brighton' },
  ]

  // Extract street name (usually the first major part of address)
  let street = ''
  const words = normalizedAddress.split(/\s+/)

  // Try to find the street name pattern (number + street name)
  for (let i = 0; i < words.length; i++) {
    if (words[i].match(/^\d+[a-z]?$/)) {
      // Found a house number, next words likely form street name
      const streetWords = []
      let j = i + 1
      while (j < words.length && j < i + 4) { // Take up to 3 words after house number
        const word = words[j]
        // Stop at common area indicators
        if (['street', 'road', 'avenue', 'drive', 'lane', 'place', 'way', 'crescent', 'terrace'].includes(word)) {
          streetWords.push(word)
          break
        }
        streetWords.push(word)
        j++
      }
      street = streetWords.join('_').replace(/[^a-z_]/g, '')
      break
    }
  }

  // If no street pattern found, use first few words
  if (!street && words.length >= 2) {
    street = words.slice(0, Math.min(3, words.length - 1)).join('_').replace(/[^a-z_]/g, '')
  }

  // Find area/suburb
  let area = 'general'
  for (const { pattern, area: patternArea } of suburbPatterns) {
    if (pattern.test(normalizedAddress)) {
      area = patternArea
      break
    }
  }

  // If no specific suburb found, use last words as area identifier
  if (area === 'general' && words.length >= 2) {
    area = words.slice(-2).join('_').replace(/[^a-z_]/g, '')
  }

  return { street, area }
}

/**
 * Mock geocoding function that generates consistent coordinates for addresses
 * Now street and suburb-aware for better proximity matching
 * Used as fallback when MapTiler API is not available
 */
export function mockGeocode(address: string): { lat: number; lng: number } {
  if (!address || address.trim().length === 0) {
    return { lat: 0, lng: 0 }
  }

  // Normalize the address first for consistent results
  const normalizedAddress = normalizeAddress(address)

  // Determine base city
  const city = getCityFromAddress(normalizedAddress)
  const baseCoords = NZ_CITY_CENTERS[city]

  // Extract street and area components
  const { street, area } = extractAddressComponents(normalizedAddress)

  // Create a combined hash for street+area to ensure addresses on same street get very close coordinates
  const streetHash = hashString(street)
  const areaHash = hashString(area)
  // const combinedHash = streetHash + areaHash

  // Generate coordinates with two levels:
  // 1. Area-level offset (within ~2km radius for same area)
  const areaMaxOffset = 0.018 // Roughly 2km in degrees
  const areaLatOffset = seededRandom(areaHash, -areaMaxOffset, areaMaxOffset)
  const areaLngOffset = seededRandom(areaHash + 1000, -areaMaxOffset, areaMaxOffset)

  // 2. Street-level offset (within ~100m radius for same street)
  const streetMaxOffset = 0.001 // Roughly 100m in degrees
  const streetLatOffset = seededRandom(streetHash, -streetMaxOffset, streetMaxOffset)
  const streetLngOffset = seededRandom(streetHash + 2000, -streetMaxOffset, streetMaxOffset)

  // Combine base coordinates with both offsets
  const finalLat = baseCoords.lat + areaLatOffset + streetLatOffset
  const finalLng = baseCoords.lng + areaLngOffset + streetLngOffset

  return {
    lat: parseFloat(finalLat.toFixed(6)),
    lng: parseFloat(finalLng.toFixed(6))
  }
}

/**
 * Main geocoding function - prioritizes LINZ (NZ official data) > Google Maps > MapTiler > mock geocoding
 */
export async function geocode(address: string): Promise<{ lat: number; lng: number; formatted_address?: string }> {
  // Import services dynamically to avoid circular dependencies
  const { geocodeWithLinz } = await import('./linz-geocoding')
  const { geocodeWithGoogle } = await import('./google-geocoding')
  const { geocodeAddress } = await import('./maptiler')

  try {
    // Try LINZ geocoding first for New Zealand addresses (highest accuracy)
    console.log('🇳🇿 Attempting LINZ geocoding for:', address)
    const linzResult = await geocodeWithLinz(address)
    if (linzResult && linzResult.confidence > 0.6) {
      console.log('✅ LINZ geocoding successful:', linzResult)
      return {
        lat: linzResult.lat,
        lng: linzResult.lng,
        formatted_address: linzResult.formatted_address
      }
    }
    console.log('LINZ returned no high-confidence results for:', address)
  } catch (error) {
    console.warn('LINZ geocoding failed, trying Google Maps:', error)
  }

  try {
    // Try Google Maps geocoding (excellent worldwide coverage)
    console.log('🌍 Attempting Google Maps geocoding for:', address)
    const googleResult = await geocodeWithGoogle(address)
    if (googleResult && googleResult.confidence > 0.7) {
      console.log('✅ Google geocoding successful:', googleResult)
      return {
        lat: googleResult.lat,
        lng: googleResult.lng,
        formatted_address: googleResult.formatted_address
      }
    }
    console.log('Google Maps returned no high-confidence results for:', address)
  } catch (error) {
    console.warn('Google geocoding failed, trying MapTiler:', error)
  }

  try {
    // Fallback to MapTiler API (mainly for map display compatibility)
    console.log('🗺️ Attempting MapTiler geocoding for:', address)
    const result = await geocodeAddress(address)
    if (result) {
      console.log('MapTiler geocoding successful:', result)
      return {
        lat: result.lat,
        lng: result.lng,
        formatted_address: result.formatted_address
      }
    }
    console.log('MapTiler returned no results for:', address)
  } catch (error) {
    console.warn('MapTiler geocoding failed, falling back to mock:', error)
  }

  // Final fallback to mock geocoding for development/offline use
  console.warn(`⚠️ Using mock geocoding for address: ${address}`)
  const mockResult = mockGeocode(address)
  return {
    ...mockResult,
    formatted_address: address // Use original address as formatted address for mock
  }
}

/**
 * Calculate distance between two coordinates in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

/**
 * Find contacts within radius of a property
 */
export function findContactsInRadius(
  propertyLat: number,
  propertyLng: number,
  contacts: Array<{ lat: number | null; lng: number | null; [key: string]: unknown }>,
  radiusKm: number
): Array<{ distance: number; [key: string]: unknown }> {
  return contacts
    .filter(contact => contact.lat !== null && contact.lng !== null)
    .map(contact => ({
      ...contact,
      distance: calculateDistance(propertyLat, propertyLng, contact.lat!, contact.lng!)
    }))
    .filter(contact => contact.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
}

/**
 * Generate sample addresses for testing
 */
export const SAMPLE_ADDRESSES = [
  '123 Queen Street, Auckland Central',
  '45 Lambton Quay, Wellington',
  '78 Cashel Street, Christchurch',
  '92 Victoria Street, Hamilton',
  '156 Cameron Road, Tauranga',
  '234 Emerson Street, Napier',
  '67 The Square, Palmerston North',
  '189 Tutanekai Street, Rotorua',
  '245 Devon Street, New Plymouth',
  '134 Bank Street, Whangarei',
  '456 Ponsonby Road, Auckland',
  '789 Oriental Parade, Wellington',
  '321 Riccarton Road, Christchurch',
  '654 Te Rapa Road, Hamilton',
  '987 Maunganui Road, Mount Maunganui',
]
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
 * Mock geocoding function that generates consistent coordinates for addresses
 */
export function mockGeocode(address: string): { lat: number; lng: number } {
  if (!address || address.trim().length === 0) {
    return { lat: 0, lng: 0 }
  }

  const normalizedAddress = address.trim().toLowerCase()
  const hash = hashString(normalizedAddress)

  // Determine base city
  const city = getCityFromAddress(address)
  const baseCoords = NZ_CITY_CENTERS[city]

  // Generate offset within ~20km radius of city center
  const maxOffset = 0.18 // Roughly 20km in degrees
  const latOffset = seededRandom(hash, -maxOffset, maxOffset)
  const lngOffset = seededRandom(hash + 1000, -maxOffset, maxOffset)

  return {
    lat: parseFloat((baseCoords.lat + latOffset).toFixed(6)),
    lng: parseFloat((baseCoords.lng + lngOffset).toFixed(6))
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
  contacts: Array<{ lat: number | null; lng: number | null; [key: string]: any }>,
  radiusKm: number
): Array<{ distance: number; [key: string]: any }> {
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
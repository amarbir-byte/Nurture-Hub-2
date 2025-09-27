// New Zealand Address Structure
// Example: "123 Main Street, Flatbush, Manukau, Auckland, 2016"
// - Street: "123 Main Street" (street_number + street)
// - Suburb: "Flatbush"
// - City/District: "Manukau" (territorial authority)
// - Region: "Auckland"
// - Postal Code: "2016"

export interface NZAddressComponents {
  street_number?: string
  street?: string
  suburb?: string
  city?: string // Territorial authority (e.g., Manukau, Waitakere)
  region?: string // Region (e.g., Auckland, Wellington)
  postal_code?: string
}

export interface AddressWithComponents extends NZAddressComponents {
  address: string // Full formatted address for backwards compatibility
}

// Helper to format NZ address components into full address
export function formatNZAddress(components: NZAddressComponents): string {
  const parts: string[] = []

  // Street address
  if (components.street_number && components.street) {
    parts.push(`${components.street_number} ${components.street}`)
  } else if (components.street) {
    parts.push(components.street)
  }

  // Suburb
  if (components.suburb) {
    parts.push(components.suburb)
  }

  // City/District
  if (components.city) {
    parts.push(components.city)
  }

  // Region (only if different from city)
  if (components.region && components.region !== components.city) {
    parts.push(components.region)
  }

  // Postal code
  if (components.postal_code) {
    parts.push(components.postal_code)
  }

  return parts.join(', ')
}

// Helper to parse NZ address into components with better logic
export function parseNZAddress(address: string): Partial<NZAddressComponents> {
  const parts = address.split(',').map(p => p.trim())
  const components: Partial<NZAddressComponents> = {}

  // Handle different NZ address formats:
  // "12 Fraser Road, Papatoetoe, Manukau, Auckland 2025"
  // "12 Fraser Road, Papatoetoe, Auckland"
  // "Fraser Road, Papatoetoe, Auckland"
  // "Papatoetoe, Auckland"

  if (parts.length >= 1 && parts[0]) {
    const firstPart = parts[0]

    // Check if first part contains street number + street name
    const streetMatch = firstPart.match(/^(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)\s+(.+)$/)
    if (streetMatch) {
      components.street_number = streetMatch[1]
      components.street = streetMatch[2]
    } else {
      // First part might be just street name or suburb
      // If it contains common street types, treat as street
      const streetTypes = ['road', 'street', 'avenue', 'drive', 'lane', 'place', 'way', 'crescent', 'terrace', 'court']
      const lowerFirst = firstPart.toLowerCase()

      if (streetTypes.some(type => lowerFirst.includes(type))) {
        components.street = firstPart
      } else {
        // Probably a suburb if no street indicators
        components.suburb = firstPart
      }
    }
  }

  // Parse remaining parts based on position and content
  const remainingParts = parts.slice(1)

  for (let i = 0; i < remainingParts.length; i++) {
    const part = remainingParts[i]

    // Check for postal code (4 digits, possibly with region)
    const postalMatch = part.match(/^(.*?)\s*(\d{4})$/)
    if (postalMatch) {
      components.postal_code = postalMatch[2]
      if (postalMatch[1].trim()) {
        // Part before postal code
        if (!components.region) {
          components.region = postalMatch[1].trim()
        }
      }
      continue
    }

    // Common NZ regions
    const nzRegions = ['auckland', 'wellington', 'christchurch', 'hamilton', 'tauranga', 'napier', 'hastings', 'palmerston north', 'rotorua', 'queenstown', 'invercargill', 'nelson', 'whangarei', 'new plymouth']
    const lowerPart = part.toLowerCase()

    if (nzRegions.some(region => lowerPart.includes(region))) {
      components.region = part
    } else if (!components.suburb && components.street) {
      // If we have street but no suburb, this is likely the suburb
      components.suburb = part
    } else if (!components.city && components.suburb) {
      // If we have suburb but no city, this is likely the city/district
      components.city = part
    } else if (!components.suburb) {
      // First non-street part is likely suburb
      components.suburb = part
    }
  }

  // Clean up: ensure we have logical assignment
  // If no street but have suburb, move suburb to street if it looks like a street
  if (!components.street && components.suburb) {
    const streetTypes = ['road', 'street', 'avenue', 'drive', 'lane', 'place', 'way', 'crescent', 'terrace', 'court']
    const lowerSuburb = components.suburb.toLowerCase()

    if (streetTypes.some(type => lowerSuburb.includes(type))) {
      components.street = components.suburb
      components.suburb = undefined
    }
  }

  return components
}

// Common NZ regions
export const NZ_REGIONS = [
  'Auckland',
  'Bay of Plenty',
  'Canterbury',
  'Gisborne',
  'Hawke\'s Bay',
  'Manawatu-Wanganui',
  'Marlborough',
  'Nelson',
  'Northland',
  'Otago',
  'Southland',
  'Taranaki',
  'Tasman',
  'Waikato',
  'Wellington',
  'West Coast'
] as const

export type NZRegion = typeof NZ_REGIONS[number]
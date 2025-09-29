/**
 * Secure LINZ Geocoding Service
 *
 * ✅ ENTERPRISE SECURITY: Now uses secure backend API proxy
 * - No API keys exposed to frontend
 * - Authentication required
 * - Rate limiting and audit logging
 * - Caching handled server-side
 */


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


/**
 * Search LINZ address database via secure backend API
 */
export async function searchLinzAddresses(query: string): Promise<LinzGeocodingResult[]> {
  if (!query || query.trim().length < 3) {
    return []
  }

  try {
    const response = await fetch('/api/geocode/linz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address: query })
    })

    if (!response.ok) {
      console.error(`Secure LINZ API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data = await response.json()

    if (!data.success || !data.results) {
      return []
    }

    return data.results

  } catch (error) {
    console.error('Secure LINZ geocoding error:', error)
    return []
  }
}


/**
 * Main LINZ geocoding function - get best match for an address via secure backend
 */
export async function geocodeWithLinz(address: string): Promise<LinzGeocodingResult | null> {
  const results = await searchLinzAddresses(address)

  if (results.length === 0) {
    return null
  }

  // Return the highest confidence result
  const bestMatch = results[0]

  console.log(`Secure LINZ geocoding: "${address}" -> ${bestMatch.formatted_address} (confidence: ${bestMatch.confidence})`)

  return bestMatch
}
import { useEffect, useRef, useState } from 'react'

// MapTiler Web SDK types (we'll use the CDN version)
declare global {
  interface Window {
    maptilersdk: any
  }
}

export interface MapMarker {
  id: string
  lat: number
  lng: number
  title: string
  type: 'property' | 'contact'
  color?: string
  onClick?: () => void
}

export interface MapProps {
  center?: [number, number] // [lng, lat]
  zoom?: number
  markers?: MapMarker[]
  height?: string
  width?: string
  showRadius?: boolean
  radiusKm?: number
  radiusCenter?: [number, number]
  className?: string
}

const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY

export function MapTilerMap({
  center = [174.7633, -36.8485], // Auckland, NZ
  zoom = 10,
  markers = [],
  height = '400px',
  width = '100%',
  showRadius = false,
  radiusKm = 5,
  radiusCenter,
  className = ''
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [mapStyleLoaded, setMapStyleLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const markersRef = useRef<any[]>([])
  const radiusCircleRef = useRef<any>(null)

  // Load MapTiler SDK
  useEffect(() => {
    if (window.maptilersdk) {
      setIsLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.maptiler.com/maptiler-sdk-js/v2.0.3/maptiler-sdk.umd.js'
    script.onload = () => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdn.maptiler.com/maptiler-sdk-js/v2.0.3/maptiler-sdk.css'
      document.head.appendChild(link)

      setIsLoaded(true)
    }
    script.onerror = () => {
      setError('Failed to load MapTiler SDK')
    }
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapContainer.current || map.current) return

    if (!MAPTILER_API_KEY) {
      setError('MapTiler API key not configured')
      return
    }

    try {
      window.maptilersdk.config.apiKey = MAPTILER_API_KEY

      map.current = new window.maptilersdk.Map({
        container: mapContainer.current,
        style: window.maptilersdk.MapStyle.STREETS,
        center: center,
        zoom: zoom,
      })

      map.current.on('load', () => {
        console.log('Map loaded successfully')
        setMapStyleLoaded(true)
      })

      map.current.on('error', (e: any) => {
        console.error('Map error:', e)
        setError('Failed to load map')
      })

    } catch (err) {
      console.error('Map initialization error:', err)
      setError('Failed to initialize map')
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
        setMapStyleLoaded(false)
      }
    }
  }, [isLoaded, center, zoom])

  // Update markers
  useEffect(() => {
    if (!map.current || !window.maptilersdk) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Add new markers
    markers.forEach(markerData => {
      try {
        const el = document.createElement('div')
        el.className = 'marker'
        el.style.cssText = `
          background-color: ${markerData.color || (markerData.type === 'property' ? '#3B82F6' : '#10B981')};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          cursor: pointer;
        `

        const marker = new window.maptilersdk.Marker({ element: el })
          .setLngLat([markerData.lng, markerData.lat])
          .addTo(map.current)

        // Add click handler
        if (markerData.onClick) {
          el.addEventListener('click', markerData.onClick)
        }

        // Add popup
        const popup = new window.maptilersdk.Popup({ offset: 25 })
          .setHTML(`
            <div class="p-2">
              <div class="font-medium text-sm">${markerData.title}</div>
              <div class="text-xs text-gray-600 mt-1 capitalize">${markerData.type}</div>
            </div>
          `)

        marker.setPopup(popup)

        markersRef.current.push(marker)
      } catch (err) {
        console.error('Error adding marker:', err)
      }
    })

    // Fit bounds to markers if there are any
    if (markers.length > 0) {
      const bounds = new window.maptilersdk.LngLatBounds()
      markers.forEach(marker => {
        bounds.extend([marker.lng, marker.lat])
      })

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      })
    }

  }, [markers])

  // Update radius circle
  useEffect(() => {
    if (!map.current || !window.maptilersdk || !showRadius || !mapStyleLoaded) return

    // Add a small delay to ensure the map is fully ready
    const addRadiusCircle = () => {
      if (!map.current?.loaded()) {
        // If map is not fully loaded, retry after a short delay
        setTimeout(addRadiusCircle, 100)
        return
      }

      try {
        // Remove existing circle
        if (radiusCircleRef.current) {
          if (map.current.getSource('radius-circle')) {
            map.current.removeLayer('radius-fill')
            map.current.removeLayer('radius-border')
            map.current.removeSource('radius-circle')
          }
          radiusCircleRef.current = null
        }

        if (!radiusCenter) return

        // Create circle geometry
        const center_point = radiusCenter
        const radius_in_km = radiusKm
        const points = 64
        const coords = []

        for (let i = 0; i < points; i++) {
          const angle = (i / points) * 2 * Math.PI
          const dx = radius_in_km * 0.009 * Math.cos(angle) // Approximate degrees per km
          const dy = radius_in_km * 0.009 * Math.sin(angle) / Math.cos(center_point[1] * Math.PI / 180)
          coords.push([center_point[0] + dx, center_point[1] + dy])
        }
        coords.push(coords[0]) // Close the polygon

        const circleGeoJSON = {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [coords]
            }
          }
        }

        map.current.addSource('radius-circle', circleGeoJSON)

        // Add fill layer
        map.current.addLayer({
          id: 'radius-fill',
          type: 'fill',
          source: 'radius-circle',
          paint: {
            'fill-color': '#3B82F6',
            'fill-opacity': 0.1
          }
        })

        // Add border layer
        map.current.addLayer({
          id: 'radius-border',
          type: 'line',
          source: 'radius-circle',
          paint: {
            'line-color': '#3B82F6',
            'line-width': 2,
            'line-opacity': 0.5
          }
        })

        radiusCircleRef.current = true

      } catch (err) {
        console.error('Error adding radius circle:', err)
      }
    }

    // Start the process
    addRadiusCircle()

  }, [showRadius, radiusKm, radiusCenter, mapStyleLoaded])

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height, width }}
      >
        <div className="text-center p-4">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-600">{error}</p>
          {!MAPTILER_API_KEY && (
            <p className="text-xs text-gray-500 mt-1">
              Configure VITE_MAPTILER_API_KEY in your .env file
            </p>
          )}
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height, width }}
      >
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={mapContainer}
      className={`rounded-lg ${className}`}
      style={{ height, width }}
    />
  )
}
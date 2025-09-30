import { useRef, useEffect, useState } from 'react';

// Lazy load heavy mapping libraries
let maplibregl: any = null;
let turfCircle: any = null;
let turfPoint: any = null;

const loadMapLibraries = async () => {
  if (!maplibregl) {
    const [maplibreModule, turfCircleModule, turfPointModule] = await Promise.all([
      import('maplibre-gl'),
      import('@turf/circle'),
      import('@turf/helpers')
    ]);

    maplibregl = maplibreModule.default;
    turfCircle = turfCircleModule.circle;
    turfPoint = turfPointModule.point;

    // Import CSS dynamically
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = '/node_modules/maplibre-gl/dist/maplibre-gl.css';
    document.head.appendChild(cssLink);
  }

  return { maplibregl, circle: turfCircle, point: turfPoint };
};

interface Marker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: 'contact' | 'property';
  color?: string;
}

interface MapTilerMapProps {
  center: [number, number]; // [lng, lat]
  zoom: number;
  markers?: Marker[];
  showRadius?: boolean;
  radiusKm?: number;
  radiusCenter?: [number, number]; // [lng, lat]
  height?: string;
  width?: string;
  className?: string;
}

export function MapTilerMap({
  center,
  zoom,
  markers = [],
  showRadius = false,
  radiusKm = 10,
  radiusCenter,
  height = '300px',
  width = '100%',
  className = '',
}: MapTilerMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [librariesLoading, setLibrariesLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeMap = async () => {
      if (map.current) return; // Initialize map only once

      try {
        setLibrariesLoading(true);
        const { maplibregl: mapLib } = await loadMapLibraries();

        if (!mounted) return;

        map.current = new mapLib.Map({
          container: mapContainer.current!,
          style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${import.meta.env.VITE_MAPTILER_API_KEY}`,
          center: center,
          zoom: zoom,
          attributionControl: false, // Disable default attribution
        });

        map.current.on('load', () => {
          if (!mounted) return;
          setMapLoaded(true);
          setLibrariesLoading(false);
          // Add custom attribution
          map.current?.addControl(new mapLib.AttributionControl({
            customAttribution: '© MapTiler © OpenStreetMap contributors',
          }), 'bottom-left');
        });
      } catch (error) {
        if (mounted) {
          setLoadError('Failed to load map libraries');
          setLibrariesLoading(false);
        }
      }
    };

    initializeMap();

    return () => {
      mounted = false;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const updateMapFeatures = async () => {
      if (!mapLoaded || !map.current) return;

      try {
        const { maplibregl: mapLib, circle, point } = await loadMapLibraries();

        // Clear existing markers and circles
        const currentMarkers = document.querySelectorAll('.map-marker');
        currentMarkers.forEach(markerEl => markerEl.remove());

        if (map.current.getSource('radius-source')) {
          map.current.removeLayer('radius-fill');
          map.current.removeLayer('radius-border');
          map.current.removeSource('radius-source');
        }

        // Add new markers
        markers.forEach(markerData => {
          const el = document.createElement('div');
          el.id = `marker-${markerData.id}`;
          el.className = 'map-marker';
          el.style.backgroundColor = markerData.color || '#FF0000';
          el.style.width = '16px';
          el.style.height = '16px';
          el.style.borderRadius = '50%';
          el.style.border = '2px solid #FFFFFF';
          el.style.cursor = 'pointer';
          el.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.2)';

          new mapLib.Marker(el)
            .setLngLat([markerData.lng, markerData.lat])
            .setPopup(
              new mapLib.Popup({ offset: 25 })
                .setHTML(
                  `<div style="padding: 8px; color: #1f2937; background: white; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">` +
                  `<strong>${markerData.title}</strong>` +
                  `</div>`
                )
            )
            .addTo(map.current!);
        });

        // Add radius circle
        if (showRadius && radiusCenter && radiusKm) {
          const centerPoint = point(radiusCenter);
          const circleFeature = circle(centerPoint, radiusKm, { steps: 64, units: 'kilometers' });

          map.current.addSource('radius-source', {
            type: 'geojson',
            data: circleFeature as GeoJSON.Feature<GeoJSON.Polygon>,
          });

          map.current.addLayer({
            id: 'radius-fill',
            type: 'fill',
            source: 'radius-source',
            paint: {
              'fill-color': '#3B82F6',
              'fill-opacity': 0.1,
            },
          });

          map.current.addLayer({
            id: 'radius-border',
            type: 'line',
            source: 'radius-source',
            paint: {
              'line-color': '#3B82F6',
              'line-width': 2,
              'line-opacity': 0.6,
            },
          });
        }

        // Center map if center prop changes
        map.current.setCenter(center);
        map.current.setZoom(zoom);
      } catch (error) {
        console.error('Error updating map features:', error);
      }
    };

    updateMapFeatures();
  }, [mapLoaded, markers, showRadius, radiusKm, radiusCenter, center, zoom]);

  if (loadError) {
    return (
      <div
        className={`rounded-lg bg-gray-100 flex items-center justify-center ${className}`}
        style={{ height, width }}
      >
        <div className="text-center text-gray-600">
          <div className="text-2xl mb-2">🗺️</div>
          <div className="text-sm">Map unavailable</div>
          <div className="text-xs text-gray-500 mt-1">{loadError}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {librariesLoading && (
        <div
          className={`absolute inset-0 bg-gray-100 flex items-center justify-center rounded-lg z-10 ${className}`}
          style={{ height, width }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent mx-auto mb-2"></div>
            <div className="text-sm text-gray-600">Loading map...</div>
          </div>
        </div>
      )}
      <div
        ref={mapContainer}
        className={`rounded-lg ${className}`}
        style={{ height, width }}
      />
    </div>
  );
}


import { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { circle } from '@turf/circle';
import { point } from '@turf/helpers';

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
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${import.meta.env.VITE_MAPTILER_API_KEY}`,
      center: center,
      zoom: zoom,
      attributionControl: false, // Disable default attribution
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      // Add custom attribution
      map.current?.addControl(new maplibregl.AttributionControl({
        customAttribution: '© MapTiler © OpenStreetMap contributors',
      }), 'bottom-left');
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    // Clear existing markers and circles
    // Note: maplibre-gl markers are not features, they are DOM elements.
    // We need to manually remove them.
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

      new maplibregl.Marker(el)
        .setLngLat([markerData.lng, markerData.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 })
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

  }, [mapLoaded, markers, showRadius, radiusKm, radiusCenter, center, zoom]);

  return (
    <div
      ref={mapContainer}
      className={`rounded-lg ${className}`}
      style={{ height, width }}
    />
  );
}


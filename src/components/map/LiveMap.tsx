import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Bus, BusStop, Route } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface LiveMapProps {
  buses?: Bus[];
  stops?: BusStop[];
  routes?: Route[];
  selectedBusId?: string | null;
  selectedStopId?: string | null;
  selectedRouteId?: string | null;
  onSelectBus?: (bus: Bus) => void;
  onSelectStop?: (stop: BusStop) => void;
  height?: string;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  buses = [],
  stops = [],
  routes = [],
  selectedBusId,
  selectedStopId,
  selectedRouteId,
  onSelectBus,
  onSelectStop,
  height = '100%',
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylinesRef = useRef<L.Polyline[]>([]);
  const { language } = useLanguage();

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Ahilyanagar Center coordinates
    const map = L.map(containerRef.current, {
      center: [19.0975, 74.7420],
      zoom: 13,
      zoomControl: false,
    });

    // CartoDB Positron - Clean civic tile theme (No neon, soft warm neutrals)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; Ahilyanagar Municipal Transport Authority & OpenStreetMap',
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Request user location and auto-pan to it so they can see nearby buses immediately
    map.locate({ setView: false, watch: true, enableHighAccuracy: true });
    
    let hasCentered = false;
    map.on('locationfound', (e) => {
      if (!hasCentered) {
        map.setView(e.latlng, 15);
        hasCentered = true;
      }
      const radius = e.accuracy / 2;
      
      const userKey = 'user-location';
      if (!markersRef.current[userKey]) {
        const userIcon = L.divIcon({
          className: 'user-location-icon',
          html: `<div style="width:14px;height:14px;background-color:#3b82f6;border-radius:50%;border:2px solid white;box-shadow:0 0 10px rgba(59,130,246,0.5);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        
        markersRef.current[userKey] = L.marker(e.latlng, { icon: userIcon }).addTo(map)
          .bindPopup(`You are here (accuracy: ${radius.toFixed(0)}m)`);
      } else {
        markersRef.current[userKey].setLatLng(e.latlng);
      }
    });

    mapRef.current = map;

    return () => {
      map.stopLocate();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Route Polylines
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing polylines
    polylinesRef.current.forEach((polyline) => polyline.remove());
    polylinesRef.current = [];

    routes.forEach((route) => {
      const pathPoints = (route.route_path && route.route_path.length > 0) 
        ? route.route_path.map((p) => [p.lat, p.lng] as [number, number])
        : (route.stops ? route.stops.map((s) => [s.lat, s.lng] as [number, number]) : []);

      if (pathPoints.length > 1) {
        const isSelected = selectedRouteId === route.id;

        const polyline = L.polyline(pathPoints, {
          color: route.color || '#0f3c5c',
          weight: isSelected ? 5 : 3,
          opacity: isSelected ? 0.9 : 0.6,
          dashArray: (!route.route_path || route.route_path.length === 0) ? '10, 10' : (route.status === 'detour' ? '6, 6' : undefined),
        }).addTo(map);

        polylinesRef.current.push(polyline);
      }
    });
  }, [routes, selectedRouteId]);

  // Update Bus Stop Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    stops.forEach((stop) => {
      const isSelected = selectedStopId === stop.id;

      const stopIcon = L.divIcon({
        className: 'custom-stop-icon',
        html: `
          <div style="
            width: ${isSelected ? '22px' : '16px'};
            height: ${isSelected ? '22px' : '16px'};
            background-color: ${isSelected ? '#e11d48' : '#ffffff'};
            border: 3px solid ${isSelected ? '#ffffff' : '#0f3c5c'};
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            transition: all 0.2s ease;
          "></div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const key = `stop-${stop.id}`;
      if (!markersRef.current[key]) {
        const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(map);
        marker.on('click', () => onSelectStop?.(stop));
        markersRef.current[key] = marker;
      } else {
        markersRef.current[key].setIcon(stopIcon);
        markersRef.current[key].setLatLng([stop.lat, stop.lng]);
      }
    });
  }, [stops, selectedStopId, onSelectStop]);

  // Update Live Bus Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    buses.forEach((bus) => {
      const isSelected = selectedBusId === bus.id;

      const busIcon = L.divIcon({
        className: 'custom-bus-icon',
        html: `
          <div style="position: relative;">
            ${isSelected ? '<div class="bus-marker-pulse" style="position: absolute; inset: -4px; border-radius: 12px; background: rgba(15,60,92,0.3);"></div>' : ''}
            <div style="
              display: flex;
              align-items: center;
              gap: 4px;
              padding: 4px 8px;
              background-color: ${isSelected ? '#0f3c5c' : '#1e293b'};
              color: white;
              font-weight: 700;
              font-size: 11px;
              border-radius: 8px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.2);
              border: 1.5px solid white;
              white-space: nowrap;
            ">
              <span style="font-size: 12px;">🚌</span>
              <span>${bus.busNumber}</span>
            </div>
          </div>
        `,
        iconSize: [60, 26],
        iconAnchor: [30, 13],
      });

      const key = `bus-${bus.id}`;
      if (!markersRef.current[key]) {
        const marker = L.marker([bus.lat, bus.lng], { icon: busIcon }).addTo(map);
        marker.on('click', () => onSelectBus?.(bus));
        marker.bindTooltip(`
          <div style="text-align: center;">
            <b style="color: #0f3c5c;">${bus.busNumber}</b><br/>
            <span style="font-size: 10px; color: #64748b;">${bus.speedKmh} km/h • ${bus.status}</span>
          </div>
        `, { direction: 'top', offset: [0, -10], className: 'custom-tooltip' });
        markersRef.current[key] = marker;
      } else {
        markersRef.current[key].setIcon(busIcon);
        markersRef.current[key].setLatLng([bus.lat, bus.lng]);
        markersRef.current[key].setTooltipContent(`
          <div style="text-align: center;">
            <b style="color: #0f3c5c;">${bus.busNumber}</b><br/>
            <span style="font-size: 10px; color: #64748b;">${bus.speedKmh} km/h • ${bus.status}</span>
          </div>
        `);
      }

      if (isSelected) {
        map.panTo([bus.lat, bus.lng], { animate: true, duration: 0.5 });
      }
    });
  }, [buses, selectedBusId, onSelectBus]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 shadow-2xs">
      <div ref={containerRef} style={{ width: '100%', height }} />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 shadow-md text-xs space-y-1.5 hidden sm:block">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#0f3c5c] inline-block" />
          <span className="font-semibold text-slate-800">
            {language === 'mr' ? 'सक्रिय बसेस' : 'Active Buses'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-[#0f3c5c] bg-white inline-block" />
          <span className="font-semibold text-slate-800">
            {language === 'mr' ? 'बस थांबे' : 'Bus Stops'}
          </span>
        </div>
      </div>
    </div>
  );
};

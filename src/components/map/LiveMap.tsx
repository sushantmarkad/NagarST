import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Bus, BusStop, Route } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { MapPin, Crosshair, Loader2, AlertCircle, X, Navigation, Flag, Target, Plus } from 'lucide-react';
import { createModernBusIcon } from './busMarkerIcon';
import { fetchOSRMRoute } from '../../utils/routing';

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
  showUserLocation?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  onUserLocationChange?: (location: { lat: number; lng: number } | null) => void;
  onLocationError?: (error: string) => void;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
  interactiveMode?: 'view' | 'mark_start_pin' | 'mark_end_pin' | 'add_stop' | 'pick_passenger_location';
  onCancelInteractive?: () => void;
  customStartPin?: { lat: number; lng: number; name?: string } | null;
  customEndPin?: { lat: number; lng: number; name?: string } | null;
  className?: string;
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
  showUserLocation = true,
  userLocation,
  onUserLocationChange,
  onLocationError,
  onMapClick,
  interactiveMode = 'view',
  onCancelInteractive,
  customStartPin,
  customEndPin,
  className = '',
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylinesRef = useRef<L.Polyline[]>([]);
  const userCircleRef = useRef<L.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const { language } = useLanguage();
  const [roadSnappedVersion, setRoadSnappedVersion] = useState(0);
  
  const [isFollowing, setIsFollowing] = useState(true);
  const isFollowingRef = useRef(true);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // High-visibility animated pulsing beacon for user's GPS position
  const createUserBeaconIcon = () => {
    return L.divIcon({
      className: 'user-beacon-wrapper',
      html: `
        <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
          <div class="user-beacon-ping" style="position:absolute;width:38px;height:38px;border-radius:50%;background:rgba(59,130,246,0.4);pointer-events:none;"></div>
          <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:rgba(37,99,235,0.25);pointer-events:none;"></div>
          <div style="position:relative;width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.35);z-index:2;"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -18],
    });
  };

  const updateUserMarker = useCallback((lat: number, lng: number, accuracy: number, center: boolean) => {
    const latlng = L.latLng(lat, lng);
    setUserCoords({ lat, lng });
    if (onUserLocationChange) {
      onUserLocationChange({ lat, lng });
    }

    const map = mapRef.current;
    if (!map) return;

    const userKey = 'user-location';
    const accuracyText = accuracy ? `±${Math.round(accuracy)}m` : 'High';
    const popupContent = `
      <div style="text-align: center; padding: 4px; font-family: system-ui, -apple-system, sans-serif;">
        <strong style="color: #2563eb; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${language === 'mr' ? 'आपले सध्याचे स्थान' : 'Your Live Location'}
        </strong><br/>
        <span style="font-size: 11px; color: #64748b;">${language === 'mr' ? 'GPS अचूकता' : 'GPS Accuracy'}: ${accuracyText}</span>
      </div>
    `;

    if (!markersRef.current[userKey]) {
      const marker = L.marker(latlng, { icon: createUserBeaconIcon(), zIndexOffset: 1000 }).addTo(map);
      marker.bindPopup(popupContent);
      markersRef.current[userKey] = marker;
    } else {
      markersRef.current[userKey].setLatLng(latlng);
      markersRef.current[userKey].setPopupContent(popupContent);
    }

    // Accuracy Circle Halo
    if (accuracy && accuracy > 0) {
      if (userCircleRef.current) {
        userCircleRef.current.setLatLng(latlng).setRadius(accuracy);
      } else {
        userCircleRef.current = L.circle(latlng, {
          radius: accuracy,
          color: '#3b82f6',
          fillColor: '#60a5fa',
          fillOpacity: 0.15,
          weight: 1.5,
        }).addTo(map);
      }
    }

    if (center) {
      map.flyTo(latlng, Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 1.0,
      });
      setIsFollowing(true);
      isFollowingRef.current = true;
    }
  }, [language, onUserLocationChange]);

  const locateUser = useCallback((centerMap = true) => {
    if (!navigator.geolocation) {
      setLocationError(language === 'mr' ? 'आपल्या ब्राउझरमध्ये स्थान सेवा उपलब्ध नाही.' : 'Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    const notifyError = (msg: string) => {
      setLocationError(msg);
      onLocationError?.(msg);
    };

    const onHighSuccess = (pos: GeolocationPosition) => {
      setIsLocating(false);
      updateUserMarker(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy || 20, centerMap);
    };

    const onHighError = (err: GeolocationPositionError) => {
      // Fallback to standard/network accuracy if high accuracy GPS timed out (crucial for indoors or weak satellite signal)
      if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setIsLocating(false);
            updateUserMarker(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy || 60, centerMap);
          },
          (fallbackErr) => {
            setIsLocating(false);
            if (fallbackErr.code === fallbackErr.PERMISSION_DENIED) {
              notifyError(
                language === 'mr'
                  ? 'स्थान परवानगी नाकारली गेली. कृपया ब्राउझर सेटिंग्जमध्ये स्थान सक्षम करा.'
                  : 'Location permission denied. Please allow GPS location in your mobile/browser settings.'
              );
            } else {
              notifyError(
                language === 'mr'
                  ? 'स्थान निश्चित करण्यात अयशस्वी. कृपया GPS तपासा.'
                  : 'Unable to acquire GPS fix. Please verify location services are enabled.'
              );
            }
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 30000 }
        );
        return;
      }

      setIsLocating(false);
      if (err.code === err.PERMISSION_DENIED) {
        notifyError(
          language === 'mr'
            ? 'स्थान परवानगी नाकारली गेली. कृपया ब्राउझर सेटिंग्जमध्ये स्थान सक्षम करा.'
            : 'Location permission denied. Please allow GPS location in your mobile/browser settings.'
        );
      } else {
        notifyError(
          language === 'mr'
            ? 'स्थान शोधता आले नाही.'
            : 'Unable to retrieve location. Please check phone GPS.'
        );
      }
    };

    navigator.geolocation.getCurrentPosition(onHighSuccess, onHighError, {
      enableHighAccuracy: true,
      timeout: 6000,
      maximumAge: 10000,
    });
  }, [language, updateUserMarker, onLocationError]);

  // Sync external userLocation prop if passed
  useEffect(() => {
    if (userLocation && userLocation.lat && userLocation.lng) {
      updateUserMarker(userLocation.lat, userLocation.lng, 20, false);
    }
  }, [userLocation, updateUserMarker]);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // City Transit Center coordinates
    const map = L.map(containerRef.current, {
      center: [19.0975, 74.7420],
      zoom: 13,
      zoomControl: false,
    });

    // OpenStreetMap - Free civic tile theme (No API key required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; NagarST Transit',
    }).addTo(map);

    map.on('dragstart', () => {
      setIsFollowing(false);
      isFollowingRef.current = false;
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;

    // Request user location if enabled
    if (showUserLocation) {
      locateUser(false);

      if (navigator.geolocation && navigator.geolocation.watchPosition) {
        try {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              updateUserMarker(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy || 20, false);
            },
            () => {},
            { enableHighAccuracy: false, maximumAge: 15000 }
          );
        } catch (_) {}
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const handleWindowResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('orientationchange', handleWindowResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
      resizeObserver.disconnect();
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (userCircleRef.current) {
        userCircleRef.current.remove();
        userCircleRef.current = null;
      }
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
      // Only draw the polyline when real road path exists (> 2 road points) to strictly keep lines on current road
      let pathPoints: [number, number][] = [];
      if (route.route_path && route.route_path.length > 2) {
        pathPoints = route.route_path.map((p) => [p.lat, p.lng] as [number, number]);
      } else if (route.stops && route.stops.length >= 2) {
        // Asynchronously snap to real road using OSRM shortest path before rendering
        fetchOSRMRoute(route.stops.map((s) => ({ lat: s.lat, lng: s.lng }))).then((snapped) => {
          if (snapped && snapped.length > 2) {
            route.route_path = snapped;
            setRoadSnappedVersion((v) => v + 1);
          }
        });
      }

      if (pathPoints.length > 1) {
        const isSelected = selectedRouteId === route.id;
        let splitIndex = -1;

        // If this route is selected, AND a specific bus is selected on this route, split the path
        if (isSelected && selectedBusId) {
          const selectedBus = buses.find((b) => b.id === selectedBusId && b.routeId === route.id);
          if (selectedBus) {
            const busLatLng = L.latLng(selectedBus.lat, selectedBus.lng);
            let minDistance = Infinity;
            for (let i = 0; i < pathPoints.length; i++) {
              const dist = busLatLng.distanceTo(L.latLng(pathPoints[i]));
              if (dist < minDistance) {
                minDistance = dist;
                splitIndex = i;
              }
            }
          }
        }

        if (splitIndex !== -1) {
          // Travelled path (greyed out)
          const travelledPoints = pathPoints.slice(0, splitIndex + 1);
          if (travelledPoints.length > 1) {
            const travelledLine = L.polyline(travelledPoints, {
              color: '#94a3b8',
              weight: 5,
              opacity: 0.6,
              dashArray: '8, 8',
            }).addTo(map);
            polylinesRef.current.push(travelledLine);
          }

          // Remaining path (bold)
          const remainingPoints = pathPoints.slice(splitIndex);
          if (remainingPoints.length > 1) {
            const remainingLine = L.polyline(remainingPoints, {
              color: route.color || '#7847CB',
              weight: 6,
              opacity: 1,
            }).addTo(map);
            polylinesRef.current.push(remainingLine);
          }
        } else {
          // Normal rendering
          const polyline = L.polyline(pathPoints, {
            color: route.color || '#7847CB',
            weight: isSelected ? 5 : 3,
            opacity: isSelected ? 0.95 : 0.7,
            dashArray: (!route.route_path || route.route_path.length === 0) ? '10, 10' : (route.status === 'detour' ? '6, 6' : undefined),
          }).addTo(map);
          polylinesRef.current.push(polyline);
        }
      }
    });
  }, [routes, selectedRouteId, selectedBusId, buses, roadSnappedVersion]);

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
            border: 3px solid ${isSelected ? '#ffffff' : '#7847CB'};
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
        marker.bindTooltip(
          `<div style="font-weight: 600; color: #7847CB;">${stop.name}</div>`, 
          { direction: 'top', offset: [0, -10], className: 'custom-tooltip' }
        );
        markersRef.current[key] = marker;
      } else {
        markersRef.current[key].setIcon(stopIcon);
        markersRef.current[key].setLatLng([stop.lat, stop.lng]);
        markersRef.current[key].setTooltipContent(
          `<div style="font-weight: 600; color: #7847CB;">${stop.name}</div>`
        );
      }
    });
  }, [stops, selectedStopId, onSelectStop]);

  // Update Route Terminal Pin Markers (Start and End Terminal Pin Anchors)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const activeTerminalKeys = new Set<string>();

    routes.forEach((route) => {
      if (!route.stops || route.stops.length < 2) return;

      const startStop = route.stops[0];
      const endStop = route.stops[route.stops.length - 1];

      // 1. START TERMINAL PIN (Origin Anchor with SVG Flag)
      const startKey = `terminal-start-${route.id}`;
      activeTerminalKeys.add(startKey);

      const startPinHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; pointer-events: auto; z-index: 600;">
          <div style="
            background: #ffffff;
            color: #065f46;
            border: 2px solid #059669;
            box-shadow: 0 4px 12px rgba(5,150,105,0.25);
            border-radius: 8px;
            padding: 2px 7px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 10px;
            font-weight: 800;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 5px;
            margin-bottom: 3px;
          ">
            <span style="background: #059669; color: #ffffff; padding: 2px 5px; border-radius: 4px; font-size: 8px; font-weight: 900; display: inline-flex; align-items: center; gap: 3px;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              START TERMINAL
            </span>
            <span style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; color: #0f172a;">
              ${startStop.stopName}
            </span>
          </div>

          <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
            <div style="
              position: absolute;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              background: #059669;
              opacity: 0.35;
              animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background: #059669;
              border: 3px solid #ffffff;
              box-shadow: 0 2px 8px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
            ">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.8"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            </div>
          </div>
        </div>
      `;

      const startIcon = L.divIcon({
        className: 'custom-terminal-pin-start',
        html: startPinHtml,
        iconSize: [140, 52],
        iconAnchor: [70, 48],
      });

      if (!markersRef.current[startKey]) {
        const marker = L.marker([startStop.lat, startStop.lng], { icon: startIcon, zIndexOffset: 700 }).addTo(map);
        marker.bindTooltip(`<b>Start Terminal Pin:</b> ${startStop.stopName}`, { direction: 'top', offset: [0, -20] });
        markersRef.current[startKey] = marker;
      } else {
        markersRef.current[startKey].setIcon(startIcon);
        markersRef.current[startKey].setLatLng([startStop.lat, startStop.lng]);
      }

      // 2. END TERMINAL PIN (Destination Anchor with SVG Target)
      const endKey = `terminal-end-${route.id}`;
      activeTerminalKeys.add(endKey);

      const endPinHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; pointer-events: auto; z-index: 600;">
          <div style="
            background: #ffffff;
            color: #9f1239;
            border: 2px solid #e11d48;
            box-shadow: 0 4px 12px rgba(225,29,72,0.25);
            border-radius: 8px;
            padding: 2px 7px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 10px;
            font-weight: 800;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 5px;
            margin-bottom: 3px;
          ">
            <span style="background: #e11d48; color: #ffffff; padding: 2px 5px; border-radius: 4px; font-size: 8px; font-weight: 900; display: inline-flex; align-items: center; gap: 3px;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              END TERMINAL
            </span>
            <span style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; color: #0f172a;">
              ${endStop.stopName}
            </span>
          </div>

          <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
            <div style="
              position: absolute;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              background: #e11d48;
              opacity: 0.35;
              animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background: #e11d48;
              border: 3px solid #ffffff;
              box-shadow: 0 2px 8px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
            ">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
          </div>
        </div>
      `;

      const endIcon = L.divIcon({
        className: 'custom-terminal-pin-end',
        html: endPinHtml,
        iconSize: [140, 52],
        iconAnchor: [70, 48],
      });

      if (!markersRef.current[endKey]) {
        const marker = L.marker([endStop.lat, endStop.lng], { icon: endIcon, zIndexOffset: 700 }).addTo(map);
        marker.bindTooltip(`<b>End Terminal Pin:</b> ${endStop.stopName}`, { direction: 'top', offset: [0, -20] });
        markersRef.current[endKey] = marker;
      } else {
        markersRef.current[endKey].setIcon(endIcon);
        markersRef.current[endKey].setLatLng([endStop.lat, endStop.lng]);
      }
    });

    // Handle Custom Start Pin if user is manually placing pin on map
    if (customStartPin) {
      const customStartKey = 'custom-start-anchor-pin';
      activeTerminalKeys.add(customStartKey);

      const customStartHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; pointer-events: auto; z-index: 750;">
          <div style="background: #059669; color: #ffffff; font-weight: 900; font-size: 9px; padding: 2px 7px; border-radius: 6px; box-shadow: 0 3px 10px rgba(0,0,0,0.25); margin-bottom: 2px; display: flex; align-items: center; gap: 3px;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            ${customStartPin.name || 'MARKED START PIN'}
          </div>
          <div style="width: 24px; height: 24px; border-radius: 50%; background: #059669; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #ffffff;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </div>
        </div>
      `;

      const startDivIcon = L.divIcon({
        className: 'custom-manual-start-pin',
        html: customStartHtml,
        iconSize: [120, 48],
        iconAnchor: [60, 44]
      });

      if (!markersRef.current[customStartKey]) {
        markersRef.current[customStartKey] = L.marker([customStartPin.lat, customStartPin.lng], { icon: startDivIcon, zIndexOffset: 850 }).addTo(map);
      } else {
        markersRef.current[customStartKey].setLatLng([customStartPin.lat, customStartPin.lng]).setIcon(startDivIcon);
      }
    }

    // Handle Custom End Pin if user is manually placing pin on map
    if (customEndPin) {
      const customEndKey = 'custom-end-anchor-pin';
      activeTerminalKeys.add(customEndKey);

      const customEndHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; pointer-events: auto; z-index: 750;">
          <div style="background: #e11d48; color: #ffffff; font-weight: 900; font-size: 9px; padding: 2px 7px; border-radius: 6px; box-shadow: 0 3px 10px rgba(0,0,0,0.25); margin-bottom: 2px; display: flex; align-items: center; gap: 3px;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            ${customEndPin.name || 'MARKED END PIN'}
          </div>
          <div style="width: 24px; height: 24px; border-radius: 50%; background: #e11d48; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #ffffff;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
        </div>
      `;

      const endDivIcon = L.divIcon({
        className: 'custom-manual-end-pin',
        html: customEndHtml,
        iconSize: [120, 48],
        iconAnchor: [60, 44]
      });

      if (!markersRef.current[customEndKey]) {
        markersRef.current[customEndKey] = L.marker([customEndPin.lat, customEndPin.lng], { icon: endDivIcon, zIndexOffset: 850 }).addTo(map);
      } else {
        markersRef.current[customEndKey].setLatLng([customEndPin.lat, customEndPin.lng]).setIcon(endDivIcon);
      }
    }

    // Cleanup inactive terminal markers
    Object.keys(markersRef.current).forEach((key) => {
      if (key.startsWith('terminal-') && !activeTerminalKeys.has(key)) {
        markersRef.current[key].remove();
        delete markersRef.current[key];
      }
    });
  }, [routes, customStartPin, customEndPin]);

  // Update Live Bus Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    buses.forEach((bus) => {
      const isSelected = selectedBusId === bus.id;
      const isDemo = Boolean(bus.isDemo || bus.id?.startsWith('demo-'));

      const busIcon = createModernBusIcon(bus.busNumber, {
        isSelected,
        speedKmh: bus.speedKmh,
        status: bus.status,
        heading: bus.heading,
        isDemo
      });

      const key = `bus-${bus.id}`;
      const destinationText = (bus.origin && bus.destination)
        ? `${bus.origin} ➔ ${bus.destination}`
        : (bus.routeName || 'In Transit');

      const tooltipHtml = `
        <div style="text-align: center; font-family: system-ui, sans-serif; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: 2px;">
            <span style="background: ${isDemo ? '#F59E0B' : '#10B981'}; color: #fff; font-size: 9px; font-weight: 800; padding: 1px 4px; border-radius: 4px;">
              ${isDemo ? 'DEMO' : 'LIVE'}
            </span>
            <b style="color: ${isDemo ? '#d97706' : '#7847CB'}; font-size: 12px;">${bus.busNumber}</b>
          </div>
          <div style="font-size: 11px; font-weight: 700; color: #0f172a; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${destinationText}
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
            Next: <b style="color: #7847CB;">${bus.nextStopName}</b> (${bus.distanceToNextMeters ? (bus.distanceToNextMeters > 1000 ? `${(bus.distanceToNextMeters / 1000).toFixed(1)}km` : `${bus.distanceToNextMeters}m`) : `${bus.etaToNextMinutes || 1}m`}) • ${bus.speedKmh} km/h
          </div>
          <div style="font-size: 10px; color: #047857; font-weight: 700; margin-top: 2px;">
            Occupancy: ${bus.passengerCount || 25}/${bus.maxCapacity || 42} Passengers (${bus.availableSeats || 17} free)
          </div>
          <div style="font-size: 9px; color: #7847CB; font-weight: 800; margin-top: 3px; border-top: 1px dashed #cbd5e1; padding-top: 2px; display: flex; align-items: center; justify-content: center; gap: 3px;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Tap bus to open live details & all stops
          </div>
        </div>
      `;

      const handleMarkerClick = () => {
        setIsFollowing(true);
        isFollowingRef.current = true;
        map.panTo([bus.lat, bus.lng], { animate: true, duration: 0.5 });
        onSelectBus?.(bus);
      };

      if (!markersRef.current[key]) {
        const marker = L.marker([bus.lat, bus.lng], { icon: busIcon }).addTo(map);
        marker.on('click', handleMarkerClick);
        marker.bindTooltip(tooltipHtml, { direction: 'top', offset: [0, -10], className: 'custom-tooltip' });
        markersRef.current[key] = marker;
      } else {
        markersRef.current[key].setIcon(busIcon);
        markersRef.current[key].setLatLng([bus.lat, bus.lng]);
        markersRef.current[key].setTooltipContent(tooltipHtml);
        markersRef.current[key].off('click');
        markersRef.current[key].on('click', handleMarkerClick);
      }

      if (isSelected && isFollowingRef.current) {
        map.panTo([bus.lat, bus.lng], { animate: true, duration: 0.5 });
      }
    });

    // Cleanup stale bus markers
    const activeBusKeys = new Set(buses.map(b => `bus-${b.id}`));
    Object.keys(markersRef.current).forEach(key => {
      if (key.startsWith('bus-') && !activeBusKeys.has(key)) {
        markersRef.current[key].remove();
        delete markersRef.current[key];
      }
    });
  }, [buses, selectedBusId, onSelectBus]);

  return (
    <div className={`relative w-full h-full min-h-0 overflow-hidden ${className ? className : 'rounded-none md:rounded-2xl md:border md:border-slate-200/90'}`}>
      <div 
        ref={containerRef} 
        style={{ width: '100%', height: height || '100%' }} 
        className="w-full h-full min-h-0" 
      />

      {/* Floating Action Controls (Thumb-friendly on mobile, top-right on desktop) */}
      <div className="absolute bottom-4 md:bottom-auto md:top-4 right-3 md:right-4 z-[400] flex flex-col gap-2">
        {/* GPS "Locate Me" Button */}
        {showUserLocation && (
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              locateUser(true);
            }}
            disabled={isLocating}
            className={`w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-white border border-slate-200/90 shadow-lg flex items-center justify-center transition-all ${
              userCoords 
                ? 'text-[#7847CB] ring-2 ring-[#7847CB]/25 bg-purple-50/50' 
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title={language === 'mr' ? 'माझे GPS स्थान शोधा' : 'Locate Me / My GPS Position'}
            aria-label="Locate my position on map"
          >
            {isLocating ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#7847CB]" />
            ) : (
              <Crosshair className={`w-5 h-5 ${userCoords ? 'text-[#7847CB]' : 'text-slate-700'}`} />
            )}
          </button>
        )}

        {/* NagarST Network Recenter Button */}
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsFollowing(true);
            isFollowingRef.current = true;
            
            if (selectedBusId && markersRef.current[`bus-${selectedBusId}`]) {
              mapRef.current?.setView(markersRef.current[`bus-${selectedBusId}`].getLatLng(), 15, { animate: true });
            } else if (userCoords && markersRef.current['user-location']) {
              mapRef.current?.setView(markersRef.current['user-location'].getLatLng(), 15, { animate: true });
            } else {
              mapRef.current?.setView([19.0975, 74.7420], 13, { animate: true });
            }
          }}
          className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-white border border-slate-200/90 shadow-lg flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all"
          title={language === 'mr' ? 'अहिल्यानगर केंद्र' : 'Recenter Network View'}
          aria-label="Recenter map"
        >
          <MapPin className="w-5 h-5 text-[#7847CB]" />
        </button>

        {/* Custom Touch-Friendly Zoom Controls */}
        <div className="flex flex-col bg-white border border-slate-200/90 rounded-2xl shadow-lg overflow-hidden divide-y divide-slate-100">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              mapRef.current?.zoomIn();
            }}
            className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-slate-700 hover:bg-slate-50 font-bold text-lg select-none transition-colors"
            title="Zoom In"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              mapRef.current?.zoomOut();
            }}
            className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-slate-700 hover:bg-slate-50 font-bold text-lg select-none transition-colors"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>
      </div>

      {/* Interactive Marking Guide Banner */}
      {interactiveMode && interactiveMode !== 'view' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[450] bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700/80 animate-in fade-in zoom-in-95 backdrop-blur-md max-w-[90%]">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="text-xs font-bold leading-tight">
            {interactiveMode === 'mark_start_pin' && 'Click anywhere on road to set Start Terminal Pin'}
            {interactiveMode === 'mark_end_pin' && 'Click anywhere on road to set End Terminal Pin'}
            {interactiveMode === 'add_stop' && 'Click on the road to place a new Bus Stop'}
            {interactiveMode === 'pick_passenger_location' && 'Click anywhere on the map to set your commuter location'}
          </span>
          {onCancelInteractive && (
            <button
              type="button"
              onClick={onCancelInteractive}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-600 transition-colors shrink-0"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Map Legend Overlay (Mobile: Bottom Left, Desktop: Top Left) */}
      <div className="absolute bottom-4 md:bottom-auto md:top-4 left-3 md:left-4 z-[390] bg-white/95 backdrop-blur-md p-2 md:p-2.5 rounded-2xl border border-slate-200/90 shadow-md text-xs space-y-1 md:space-y-1.5 pointer-events-none select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#7847CB] inline-block shadow-xs" />
          <span className="font-bold text-slate-800 text-[11px] md:text-xs">
            {language === 'mr' ? 'सक्रिय बसेस' : 'Active Buses'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-[#7847CB] bg-white inline-block shadow-xs" />
          <span className="font-semibold text-slate-700 text-[11px] md:text-xs">
            {language === 'mr' ? 'बस थांबे' : 'Bus Stops'}
          </span>
        </div>
        {showUserLocation && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-xs" />
            <span className="font-semibold text-slate-700 text-[11px] md:text-xs">
              {language === 'mr' ? 'आपले स्थान' : 'My Location'}
            </span>
          </div>
        )}
      </div>

      {/* Dismissible Geolocation Error Banner */}
      {locationError && (
        <div className="absolute bottom-4 left-3 right-16 md:bottom-4 md:left-3 md:right-auto md:max-w-md z-[450] bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2 rounded-2xl shadow-lg flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="leading-tight text-[11px]">{locationError}</span>
          </div>
          <button 
            type="button"
            onClick={() => setLocationError(null)} 
            className="p-1 hover:bg-rose-100 rounded-lg text-rose-600 shrink-0"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

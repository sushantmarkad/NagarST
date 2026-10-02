import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Bus, BusStop, Route } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { MapPin, Crosshair, Loader2, AlertCircle, X, Navigation } from 'lucide-react';

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
  onUserLocationChange?: (location: { lat: number; lng: number } | null) => void;
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
  onUserLocationChange,
  className = '',
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylinesRef = useRef<L.Polyline[]>([]);
  const userCircleRef = useRef<L.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const { language } = useLanguage();
  
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
        <strong style="color: #2563eb; font-size: 13px;">📍 ${language === 'mr' ? 'आपले सध्याचे स्थान' : 'Your Live Location'}</strong><br/>
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
              setLocationError(
                language === 'mr'
                  ? 'स्थान परवानगी नाकारली गेली. कृपया ब्राउझर सेटिंग्जमध्ये स्थान सक्षम करा.'
                  : 'Location permission denied. Please allow GPS location in your mobile/browser settings.'
              );
            } else {
              setLocationError(
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
        setLocationError(
          language === 'mr'
            ? 'स्थान परवानगी नाकारली गेली. कृपया ब्राउझर सेटिंग्जमध्ये स्थान सक्षम करा.'
            : 'Location permission denied. Please allow GPS location in your mobile/browser settings.'
        );
      } else {
        setLocationError(
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
  }, [language, updateUserMarker]);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Ahilyanagar Center coordinates
    const map = L.map(containerRef.current, {
      center: [19.0975, 74.7420],
      zoom: 13,
      zoomControl: false,
    });

    // OpenStreetMap - Free civic tile theme (No API key required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; Ahilyanagar Municipal Transport',
    }).addTo(map);

    map.on('dragstart', () => {
      setIsFollowing(false);
      isFollowingRef.current = false;
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
      const pathPoints = (route.route_path && route.route_path.length > 0) 
        ? route.route_path.map((p) => [p.lat, p.lng] as [number, number])
        : (route.stops ? route.stops.map((s) => [s.lat, s.lng] as [number, number]) : []);

      if (pathPoints.length > 1) {
        const isSelected = selectedRouteId === route.id;
        
        let splitIndex = -1;

        // If this route is selected, AND a specific bus is selected on this route, split the path
        if (isSelected && selectedBusId) {
          const selectedBus = buses.find(b => b.id === selectedBusId && b.routeId === route.id);
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
              color: '#94a3b8', // slate-400
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
            opacity: isSelected ? 0.9 : 0.6,
            dashArray: (!route.route_path || route.route_path.length === 0) ? '10, 10' : (route.status === 'detour' ? '6, 6' : undefined),
          }).addTo(map);
          polylinesRef.current.push(polyline);
        }
      }
    });
  }, [routes, selectedRouteId, selectedBusId, buses]);

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
            ${isSelected ? '<div class="bus-marker-pulse" style="position: absolute; inset: -4px; border-radius: 12px; background: rgba(120,71,203,0.3);"></div>' : ''}
            <div style="
              display: flex;
              align-items: center;
              gap: 4px;
              padding: 4px 8px;
              background-color: ${isSelected ? '#7847CB' : '#1e293b'};
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
            <b style="color: #7847CB;">${bus.busNumber}</b><br/>
            <span style="font-size: 10px; color: #64748b;">${bus.speedKmh} km/h • ${bus.status}</span>
          </div>
        `, { direction: 'top', offset: [0, -10], className: 'custom-tooltip' });
        markersRef.current[key] = marker;
      } else {
        markersRef.current[key].setIcon(busIcon);
        markersRef.current[key].setLatLng([bus.lat, bus.lng]);
        markersRef.current[key].setTooltipContent(`
          <div style="text-align: center;">
            <b style="color: #7847CB;">${bus.busNumber}</b><br/>
            <span style="font-size: 10px; color: #64748b;">${bus.speedKmh} km/h • ${bus.status}</span>
          </div>
        `);
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

        {/* Ahilyanagar Network Recenter Button */}
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

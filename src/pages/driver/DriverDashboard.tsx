import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabaseClient';
import {
  Navigation,
  AlertTriangle,
  Play,
  Square,
  LogOut,
  Radio,
  Bus as BusIcon,
  Check,
  CircleDot,
  MapPin,
  ChevronUp
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { SharedLayout } from '../../components/layout/SharedLayout';
import { getDistance, getDistanceToPolyline } from '../../utils/routing';

// Fix for default leaflet icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapAutoCenter = ({ position }: { position: { lat: number; lng: number } | null }) => {
  const map = useMap();
  const [isFollowing, setIsFollowing] = useState(true);

  useEffect(() => {
    const handleDragStart = () => setIsFollowing(false);
    map.on('dragstart', handleDragStart);
    return () => { map.off('dragstart', handleDragStart); };
  }, [map]);

  useEffect(() => {
    if (position && isFollowing) {
      map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
    }
  }, [position, map, isFollowing]);

  if (isFollowing) return null;

  return (
    <div className="leaflet-top leaflet-right mt-16 mr-4">
      <div className="leaflet-control leaflet-bar">
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsFollowing(true);
            if (position) map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
          }}
          className="bg-white flex items-center justify-center w-[40px] h-[40px] text-[#7847CB] hover:bg-slate-50 transition-colors"
          title="Recenter Map"
        >
          <MapPin className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export const DriverDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'trip'>('home');

  // Real data state
  const [busDetails, setBusDetails] = useState<any>(null);
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  
  const [tripStops, setTripStops] = useState<any[]>([]);
  const [selectedRouteDetails, setSelectedRouteDetails] = useState<any>(null);
  const [isDevOverride, setIsDevOverride] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  const [isTripActive, setIsTripActive] = useState(false);
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [isNavigatingToOrigin, setIsNavigatingToOrigin] = useState(false);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [driverPos, setDriverPos] = useState<{lat: number, lng: number} | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(true);

  const watchIdRef = useRef<number | null>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    fetchInitialData();
    
    // Connect to Socket.IO Server
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://nagarst.onrender.com';
    import('socket.io-client').then(({ io }) => {
      socketRef.current = io(SOCKET_URL);
      
      socketRef.current.on('dispatchMessage', (data: { busId: string, message: string }) => {
        if (data.busId === user?.assignedBusId) {
          alert(`🚨 MESSAGE FROM CITY ADMIN 🚨\n\n${data.message}`);
        }
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('dispatchMessage');
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  const fetchInitialData = async () => {
    if (!user?.assignedBusId) return;

    // 1. Fetch Bus
    const { data: bus } = await supabase.from('buses').select('*').eq('id', user.assignedBusId).single();
    if (bus) setBusDetails(bus);

    // 2. Fetch Routes for dropdown
    const { data: routes } = await supabase.from('routes').select('*').order('created_at', { ascending: false });
    if (routes) {
      setAvailableRoutes(routes);
      if (routes.length > 0) setSelectedRouteId(routes[0].id);
    }
  };

  // Fetch stops when route changes
  useEffect(() => {
    if (selectedRouteId) {
      fetchRouteStops(selectedRouteId);
      const details = availableRoutes.find(r => r.id === selectedRouteId);
      setSelectedRouteDetails(details || null);
    }
  }, [selectedRouteId, availableRoutes]);

  const fetchRouteStops = async (routeId: string) => {
    const { data } = await supabase
      .from('route_stops')
      .select(`
        id,
        stop_order,
        estimated_minutes_from_origin,
        stops (
          id,
          stop_name,
          lat,
          lng
        )
      `)
      .eq('route_id', routeId)
      .order('stop_order', { ascending: true });
    
    if (data) setTripStops(data);
  };

  const beginActualTrip = async (latitude: number, longitude: number, speedKmh: number) => {
    // 1. Create Trip in DB
    const { data: trip, error: tripErr } = await supabase.from('trips').insert([{
      bus_id: busDetails.id,
      route_id: selectedRouteId,
      status: 'Active',
      start_time: new Date().toISOString()
    }]).select().single();

    if (tripErr || !trip) {
      alert("Failed to start trip: " + tripErr?.message);
      setIsStartingTrip(false);
      return;
    }

    setCurrentTripId(trip.id);
    setIsTripActive(true);
    setIsNavigatingToOrigin(false);
    setActiveTab('trip');
    setCurrentStopIndex(0);
    setIsStartingTrip(false);

    const routePathCoords = selectedRouteDetails?.route_path || [];

    // 2. Start Real GPS Tracking
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, speed } = position.coords;
        const currentSpeed = speed ? Math.round(speed * 3.6) : 0;
        setDriverPos({ lat: latitude, lng: longitude });

        let currentStatus = 'on_time';
        if (routePathCoords.length > 0) {
          const distToRoute = getDistanceToPolyline({ lat: latitude, lng: longitude }, routePathCoords);
          if (distToRoute > 150) {
            currentStatus = 'off_route';
          }
        }

        if (socketRef.current) {
          socketRef.current.emit('updateLocation', {
            id: busDetails.id,
            busId: busDetails.id,
            busNumber: busDetails.bus_number,
            plateNumber: busDetails.plate_number,
            routeId: selectedRouteId,
            routeNumber: selectedRouteDetails?.route_number || '',
            routeName: selectedRouteDetails ? `${selectedRouteDetails.origin} - ${selectedRouteDetails.destination}` : '',
            lat: latitude,
            lng: longitude,
            speedKmh: currentSpeed,
            status: currentStatus,
            occupancy: 'moderate',
            nextStopName: tripStops[0]?.stops?.stop_name || 'Unknown',
            driverName: user?.name || 'Driver',
            lastUpdated: new Date().toISOString()
          });
        }
      },
      (error) => {
        console.error(`Failed to get real GPS: ${error.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 60000 }
    );
  };

  const handleStartTrip = async () => {
    if (!selectedRouteId || !busDetails) {
      alert("Please select a route first.");
      return;
    }

    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser. Cannot start trip without GPS.');
      return;
    }

    setIsStartingTrip(true);

    // Get current position first to validate distance
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const driverLatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      
      let needsNavigation = false;
      if (tripStops.length > 0 && !isDevOverride) {
        const firstStop = { lat: tripStops[0].stops.lat, lng: tripStops[0].stops.lng };
        const dist = getDistance(driverLatLng, firstStop);
        if (dist > 150) {
          needsNavigation = true;
          alert(`You are ${dist.toFixed(0)} meters from the origin stop. Tracking started. Move to the origin to begin the trip.`);
        }
      }

      if (needsNavigation) {
        setIsNavigatingToOrigin(true);
        setIsStartingTrip(false);
        
        watchIdRef.current = navigator.geolocation.watchPosition((position) => {
          const { latitude, longitude, speed } = position.coords;
          const currentSpeed = speed ? Math.round(speed * 3.6) : 0;
          setDriverPos({ lat: latitude, lng: longitude });
          
          if (socketRef.current) {
            socketRef.current.emit('updateLocation', {
              id: busDetails.id,
              busId: busDetails.id,
              busNumber: busDetails.bus_number,
              plateNumber: busDetails.plate_number,
              routeId: selectedRouteId,
              routeNumber: selectedRouteDetails?.route_number || '',
              routeName: selectedRouteDetails ? `${selectedRouteDetails.origin} - ${selectedRouteDetails.destination}` : '',
              lat: latitude,
              lng: longitude,
              speedKmh: currentSpeed,
              status: 'navigating_to_origin',
              occupancy: 'moderate',
              nextStopName: tripStops[0]?.stops?.stop_name || 'Origin',
              driverName: user?.name || 'Driver',
              lastUpdated: new Date().toISOString()
            });
          }

          const currentLatLng = { lat: latitude, lng: longitude };
          const firstStop = { lat: tripStops[0].stops.lat, lng: tripStops[0].stops.lng };
          const currentDist = getDistance(currentLatLng, firstStop);
          
          if (currentDist <= 150) {
            navigator.geolocation.clearWatch(watchIdRef.current!);
            watchIdRef.current = null;
            if (window.confirm("You are at the start destination. Start Journey?")) {
              beginActualTrip(latitude, longitude, currentSpeed);
            } else {
              setIsNavigatingToOrigin(false);
            }
          }
        }, undefined, { enableHighAccuracy: true });
      } else {
        beginActualTrip(pos.coords.latitude, pos.coords.longitude, pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0);
      }
    }, (err) => {
      alert(`Could not get your location to verify starting position: ${err.message}`);
      setIsStartingTrip(false);
    }, { enableHighAccuracy: true, maximumAge: 0 });
  };



  const getBusIcon = (busNumber: string) => {
    return L.divIcon({
      className: 'custom-bus-icon',
      html: `
        <div style="
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background-color: #7847CB;
          color: white;
          font-weight: 700;
          font-size: 11px;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          border: 1.5px solid white;
          white-space: nowrap;
        ">
          <span style="font-size: 12px;">🚌</span>
          <span>${busNumber}</span>
        </div>
      `,
      iconSize: [60, 26],
      iconAnchor: [30, 13],
    });
  };

  const updateLiveLocation = async (tripId: string, lat: number, lng: number, speed: number) => {
    if (!busDetails) return;
    
    // Check if a record exists for this bus
    const { data: existing } = await supabase.from('live_locations').select('id').eq('bus_id', busDetails.id).single();
    
    if (existing) {
      await supabase.from('live_locations').update({
        trip_id: tripId,
        lat, lng, speed_kmh: speed,
        updated_at: new Date().toISOString()
      }).eq('bus_id', busDetails.id);
    } else {
      await supabase.from('live_locations').insert([{
        trip_id: tripId,
        bus_id: busDetails.id,
        lat, lng, speed_kmh: speed
      }]);
    }

    // Emit location instantly for passenger map via persistent Socket.IO connection
    if (socketRef.current) {
      const nextStop = tripStops[currentStopIndex]?.stops?.stop_name || 'Destination Reached';
      
      socketRef.current.emit('updateLocation', {
        id: busDetails.id,
        busId: busDetails.id,
        busNumber: busDetails.bus_number,
        plateNumber: busDetails.plate_number,
        routeId: selectedRouteId,
        routeNumber: selectedRouteDetails?.route_number || '',
        routeName: selectedRouteDetails ? `${selectedRouteDetails.origin} - ${selectedRouteDetails.destination}` : '',
        lat,
        lng,
        speedKmh: speed,
        status: 'on_time',
        occupancy: 'moderate',
        nextStopName: nextStop,
        driverName: user?.name || 'Driver',
        lastUpdated: new Date().toISOString()
      });
    }
  };

  const handleEndTrip = async () => {
    if (confirm('Are you sure you want to end the current trip?')) {
      if (currentTripId) {
        await supabase.from('trips').update({
          status: 'Completed',
          end_time: new Date().toISOString()
        }).eq('id', currentTripId);
        
        if (busDetails) {
          await supabase.from('live_locations').delete().eq('bus_id', busDetails.id);
          
          if (socketRef.current) {
            socketRef.current.emit('stopTrip', busDetails.id);
          }
        }
      }

      setIsTripActive(false);
      setCurrentTripId(null);
      setActiveTab('home');

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        window.clearInterval(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        window.clearInterval(watchIdRef.current);
      }
    };
  }, []);

  const navItems = [
    {
      id: 'home',
      label: 'Dispatch',
      icon: BusIcon,
      onClick: () => setActiveTab('home'),
      isActive: activeTab === 'home'
    },
    {
      id: 'trip',
      label: 'Live Navigation',
      icon: Navigation,
      onClick: () => setActiveTab('trip'),
      isActive: activeTab === 'trip'
    }
  ];

  return (
    <SharedLayout navItems={navItems} title="Driver Dashboard" subtitle={`Bus ${busDetails?.bus_number || 'Unassigned'}`} headerIcon={CircleDot}>
      <div className="flex-1 w-full h-full flex flex-col relative overflow-hidden">
        {activeTab === 'home' && (
          <div className="flex-1 p-4 max-w-md mx-auto w-full space-y-4 overflow-y-auto">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-[#7847CB] uppercase tracking-wider block">Trip Assignment</span>
              </div>

              <div className="space-y-4 mb-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block uppercase mb-1">Assigned Bus</label>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <BusIcon className="w-4 h-4 text-[#7847CB]" /> 
                    {busDetails ? `${busDetails.bus_number} (${busDetails.plate_number})` : 'Fetching...'}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block uppercase mb-1">Select Route for Trip</label>
                  <select 
                    value={selectedRouteId} 
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    disabled={isTripActive}
                    className="w-full text-sm font-bold text-slate-900 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-[#7847CB]"
                  >
                    <option value="" disabled>Select a route...</option>
                    {availableRoutes.map(r => (
                      <option key={r.id} value={r.id}>{r.route_number} ({r.origin} - {r.destination})</option>
                    ))}
                  </select>
                </div>

                {!isTripActive && (
                  <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isDevOverride}
                      onChange={(e) => setIsDevOverride(e.target.checked)}
                      className="w-4 h-4 text-[#7847CB] rounded border-slate-300 focus:ring-[#7847CB]"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Bypass Location Enforcement (Testing)</span>
                      <span className="text-[10px] text-slate-500 block">Allows starting trip from anywhere for dev testing</span>
                    </div>
                  </label>
                )}
              </div>

              {!isTripActive && !isNavigatingToOrigin && (
                <button
                  onClick={handleStartTrip}
                  disabled={!selectedRouteId || tripStops.length === 0 || isStartingTrip}
                  className="w-full py-3.5 rounded-xl bg-[#7847CB] hover:bg-[#6339a6] disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {isStartingTrip ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-500/30 border-t-slate-500 rounded-full animate-spin" />
                      Acquiring GPS...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4" /> Start Route
                    </>
                  )}
                </button>
              )}

              {isNavigatingToOrigin && !isTripActive && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
                  <div className="flex items-center gap-2 font-bold">
                    <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                    Navigating to Origin...
                  </div>
                  <p className="text-xs">
                    Please drive to <strong>{tripStops[0]?.stops?.stop_name}</strong>. The trip will automatically start when you arrive.
                  </p>
                  <button
                    onClick={() => {
                      setIsNavigatingToOrigin(false);
                      if (watchIdRef.current !== null) {
                        navigator.geolocation.clearWatch(watchIdRef.current);
                        watchIdRef.current = null;
                      }
                    }}
                    className="w-full py-2.5 rounded-lg bg-amber-200/50 hover:bg-amber-200 text-amber-900 font-bold text-xs transition-colors"
                  >
                    Cancel Navigation
                  </button>
                </div>
              )}
              {isTripActive && (
                <button
                  onClick={() => setActiveTab('trip')}
                  className="w-full py-3 rounded-xl bg-[#7847CB] hover:bg-[#0a2a42] text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" /> View Active Trip Navigation
                </button>
              )}
              
              {!isTripActive && selectedRouteId && tripStops.length === 0 && (
                <p className="text-xs text-rose-500 mt-2 text-center font-bold">This route has no stops. Ask City Admin to add stops.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE TRIP */}
        {activeTab === 'trip' && (
          <div className="absolute inset-0 flex flex-col md:flex-row overflow-hidden bg-slate-100">
            {/* FULL SCREEN MAP */}
            <div className="absolute inset-0 z-0">
              <MapContainer 
                center={driverPos ? [driverPos.lat, driverPos.lng] : (tripStops.length > 0 ? [tripStops[0].stops.lat, tripStops[0].stops.lng] : [19.0952, 74.7396])} 
                zoom={14} 
                className="w-full h-full"
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapAutoCenter position={driverPos} />
                
                {/* Route Polyline */}
                {(() => {
                  const pathPoints = (selectedRouteDetails?.route_path && selectedRouteDetails.route_path.length > 0)
                    ? selectedRouteDetails.route_path.map((p: any) => L.latLng(p.lat, p.lng))
                    : tripStops.map(s => L.latLng(s.stops.lat, s.stops.lng));
                  
                  if (pathPoints.length < 2) return null;

                  let splitIndex = -1;
                  if (driverPos) {
                    const driverLatLng = L.latLng(driverPos.lat, driverPos.lng);
                    let minDistance = Infinity;
                    for (let i = 0; i < pathPoints.length; i++) {
                      const dist = driverLatLng.distanceTo(pathPoints[i]);
                      if (dist < minDistance) {
                        minDistance = dist;
                        splitIndex = i;
                      }
                    }
                  }

                  if (splitIndex !== -1) {
                    const travelledPoints = pathPoints.slice(0, splitIndex + 1);
                    const remainingPoints = pathPoints.slice(splitIndex);

                    return (
                      <>
                        {travelledPoints.length > 1 && (
                          <Polyline 
                            positions={travelledPoints} 
                            color="#94a3b8" 
                            weight={5} 
                            opacity={0.6}
                            dashArray="8, 8"
                          />
                        )}
                        {remainingPoints.length > 1 && (
                          <Polyline 
                            positions={remainingPoints} 
                            color="#7847CB" 
                            weight={6} 
                            opacity={1}
                          />
                        )}
                      </>
                    );
                  }

                  return (
                    <Polyline 
                      positions={pathPoints} 
                      color="#7847CB" 
                      weight={6} 
                      opacity={1}
                    />
                  );
                })()}

                {/* Stop Markers */}
                {tripStops.map((s, i) => {
                  const isPassed = i < currentStopIndex;
                  return (
                    <Marker 
                      key={s.id} 
                      position={[s.stops.lat, s.stops.lng]}
                      opacity={isPassed ? 0.4 : 1}
                    >
                      <Popup>
                        <div className="font-bold">{i + 1}. {s.stops.stop_name}</div>
                        {isPassed ? <div className="text-emerald-600 text-xs font-bold">Passed</div> : null}
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Driver Live Position Marker */}
                {driverPos && busDetails && (
                  <Marker position={[driverPos.lat, driverPos.lng]} zIndexOffset={1000} icon={getBusIcon(busDetails.bus_number)}>
                    <Popup className="font-bold">Your Bus Location</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>

            {/* FLOATING BOTTOM SHEET / SIDE PANEL */}
            <div className={`w-full md:w-[400px] bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:shadow-[-8px_0_30px_rgba(0,0,0,0.05)] flex flex-col transition-transform duration-300 ease-out z-40 ${isBottomSheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-48px)] md:translate-y-0'} absolute md:relative bottom-0 md:right-0 md:ml-auto h-auto max-h-[65vh] md:max-h-full md:h-full rounded-t-3xl md:rounded-none`}>
              
              {/* Drag Handle (Mobile) */}
              <div 
                className="w-full h-12 flex items-center justify-center cursor-pointer md:hidden active:bg-slate-50 shrink-0"
                onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
              >
                <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
                <ChevronUp className={`absolute right-4 text-slate-400 transition-transform ${isBottomSheetOpen ? 'rotate-180' : ''}`} />
              </div>
              
              {/* Desktop Header */}
              <div className="hidden md:flex p-4 border-b border-slate-200 items-center justify-between shrink-0">
                <h3 className="font-bold text-slate-900">Trip Controls</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#7847CB]" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Next Stop</span>
                  <h2 className="text-xl md:text-2xl font-extrabold text-[#7847CB] leading-tight">
                    {tripStops[currentStopIndex]?.stops?.stop_name || 'Destination Reached'}
                  </h2>
                  <p className="text-xs font-bold text-slate-500 mt-1">Route: {selectedRouteDetails?.route_number}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-white">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming Stops</h3>
                  </div>
                  <div className="bg-slate-50 p-3 space-y-2 max-h-40 overflow-y-auto">
                    {tripStops.slice(currentStopIndex, currentStopIndex + 3).map((stop, idx) => (
                      <div key={stop.id} className="flex items-center justify-between text-xs p-2 rounded-xl bg-white border border-slate-100 shadow-xs">
                        <span className={`font-bold ${idx === 0 ? 'text-[#7847CB]' : 'text-slate-700'}`}>
                          {stop.stops.stop_name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono font-medium">ETA {stop.estimated_minutes_from_origin}m</span>
                      </div>
                    ))}
                    {currentStopIndex >= tripStops.length && (
                      <div className="text-center text-xs font-bold text-emerald-600 p-2">Trip complete!</div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {currentStopIndex < tripStops.length && (
                    <button 
                      onClick={() => setCurrentStopIndex(prev => prev + 1)}
                      className="w-full py-4 rounded-xl bg-[#7847CB] hover:bg-[#6339a6] text-white font-extrabold text-sm transition-all shadow-md active:scale-[0.98]"
                    >
                      Mark Stop Reached
                    </button>
                  )}
                  
                  <button
                    onClick={handleEndTrip}
                    className="w-full py-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 flex items-center justify-center gap-2 transition active:scale-[0.98]"
                  >
                    <Square className="w-4 h-4 fill-current" /> Complete & End Trip
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SharedLayout>
  );
};

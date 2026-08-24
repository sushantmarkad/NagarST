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
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { SharedLayout } from '../../components/layout/SharedLayout';

// Fix for default leaflet icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const DriverDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'trip'>('home');

  // Real data state
  const [busDetails, setBusDetails] = useState<any>(null);
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  
  const [tripStops, setTripStops] = useState<any[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  const [isTripActive, setIsTripActive] = useState(false);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [driverPos, setDriverPos] = useState<{lat: number, lng: number} | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(true);

  const watchIdRef = useRef<number | null>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    fetchInitialData();
    
    // Connect to Socket.IO Server
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
    import('socket.io-client').then(({ io }) => {
      socketRef.current = io(SOCKET_URL);
    });

    return () => {
      if (socketRef.current) {
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
    }
  }, [selectedRouteId]);

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

  const handleStartTrip = async () => {
    if (!selectedRouteId || !busDetails) {
      alert("Please select a route first.");
      return;
    }

    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    // 1. Create Trip in DB
    const { data: trip, error: tripErr } = await supabase.from('trips').insert([{
      bus_id: busDetails.id,
      route_id: selectedRouteId,
      status: 'Active',
      start_time: new Date().toISOString()
    }]).select().single();

    if (tripErr || !trip) {
      alert("Failed to start trip: " + tripErr?.message);
      return;
    }

    setCurrentTripId(trip.id);
    setIsTripActive(true);
    setActiveTab('trip');
    setCurrentStopIndex(0);

    // 2. Start GPS Tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, speed } = position.coords;
        const speedKmh = speed ? Math.round(speed * 3.6) : 0;
        setDriverPos({ lat: latitude, lng: longitude });
        await updateLiveLocation(trip.id, latitude, longitude, speedKmh);
      },
      (error) => {
        console.warn(`Failed to get real GPS: ${error.message}. Falling back to simulator mode.`);
        
        // Fallback simulator
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        
        // Start near first stop or default
        let currentLat = tripStops.length > 0 ? tripStops[0].stops.lat : 19.0965;
        let currentLng = tripStops.length > 0 ? tripStops[0].stops.lng : 74.7435;
        
        watchIdRef.current = window.setInterval(async () => {
          currentLat += 0.0003; 
          currentLng -= 0.0002;
          setDriverPos({ lat: currentLat, lng: currentLng });
          await updateLiveLocation(trip.id, currentLat, currentLng, 35);
        }, 3000) as unknown as number;
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 60000 }
    );
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
      const routeDetails = availableRoutes.find(r => r.id === selectedRouteId);
      
      socketRef.current.emit('updateLocation', {
        id: busDetails.id,
        busId: busDetails.id,
        busNumber: busDetails.bus_number,
        plateNumber: busDetails.plate_number,
        routeId: selectedRouteId,
        routeNumber: routeDetails?.route_number || '',
        routeName: routeDetails ? `${routeDetails.origin} - ${routeDetails.destination}` : '',
        lat,
        lng,
        speedKmh: speed,
        status: 'on_time',
        occupancy: 'medium',
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

  const selectedRouteDetails = availableRoutes.find(r => r.id === selectedRouteId);

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
      <div className="w-full h-full flex flex-col relative overflow-hidden">
        {activeTab === 'home' && (
          <div className="p-4 max-w-md mx-auto w-full space-y-4 overflow-y-auto h-full">
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
              </div>

              {!isTripActive ? (
                <button
                  onClick={handleStartTrip}
                  disabled={!selectedRouteId || tripStops.length === 0}
                  className="w-full py-3.5 rounded-xl bg-[#7847CB] hover:bg-[#0a2a42] disabled:opacity-50 text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" /> Start Trip
                </button>
              ) : (
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
          <div className="flex-1 flex flex-col md:flex-row w-full h-full relative overflow-hidden">
            {/* FULL SCREEN MAP */}
            <div className="flex-1 w-full h-[50vh] md:h-full relative z-0">
              <MapContainer 
                center={driverPos ? [driverPos.lat, driverPos.lng] : (tripStops.length > 0 ? [tripStops[0].stops.lat, tripStops[0].stops.lng] : [19.0952, 74.7396])} 
                zoom={14} 
                className="w-full h-full absolute inset-0"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Route Polyline */}
                {tripStops.length > 0 && (
                  <Polyline 
                    positions={tripStops.map(s => [s.stops.lat, s.stops.lng])} 
                    color="#7847CB" 
                    weight={4} 
                    opacity={0.6}
                  />
                )}

                {/* Stop Markers */}
                {tripStops.map((s, i) => {
                  const isPassed = i < currentStopIndex;
                  return (
                    <Marker 
                      key={s.id} 
                      position={[s.stops.lat, s.stops.lng]}
                      opacity={isPassed ? 0.5 : 1}
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
            <div className={`w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] md:shadow-none flex flex-col transition-transform duration-300 z-40 ${isBottomSheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-48px)] md:translate-y-0'} absolute md:relative bottom-0`}>
              
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

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast, useConfirm } from '../../context/FeedbackContext';
import { supabase } from '../../utils/supabaseClient';
import {
  Navigation,
  AlertTriangle,
  Square,
  Bus as BusIcon,
  CircleDot,
  MapPin,
  ChevronUp,
  Calendar,
  Gauge,
  Wifi,
  WifiOff
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { SharedLayout } from '../../components/layout/SharedLayout';
import { getDistance, getDistanceToPolyline } from '../../utils/routing';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

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
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsFollowing(true);
            if (position) map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
          }}
          className="bg-white flex items-center justify-center w-[40px] h-[40px] text-[#7847CB] hover:bg-slate-50 transition-colors shadow-md rounded-xl"
          title="Recenter Map"
        >
          <MapPin className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'home' | 'trip' | 'schedule'>('home');

  // Real data state
  const [driverSchedules, setDriverSchedules] = useState<any[]>([]);
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
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(0);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(true);

  const watchIdRef = useRef<number | null>(null);
  const socketRef = useRef<any>(null);

  const fetchInitialData = useCallback(async () => {
    if (!user?.assignedBusId) return;

    // 1. Fetch Bus
    const { data: bus } = await supabase.from('buses').select('*').eq('id', user.assignedBusId).single();
    if (bus) setBusDetails(bus);

    // 2. Fetch Routes for dropdown
    const { data: routes } = await supabase.from('routes').select('*').order('created_at', { ascending: false });
    if (routes) {
      setAvailableRoutes(routes);
      if (routes.length > 0 && !selectedRouteId) setSelectedRouteId(routes[0].id);
    }
  }, [user?.assignedBusId, selectedRouteId]);

  const fetchSchedules = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('trips')
      .select(`
        id,
        status,
        start_time,
        routes (id, route_number, origin, destination),
        buses (id, bus_number, plate_number)
      `)
      .eq('driver_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setDriverSchedules(data);
  }, [user?.id]);

  useEffect(() => {
    fetchInitialData();
    fetchSchedules();
    
    // Connect to Socket.IO Server
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://nagarst.onrender.com';
    import('socket.io-client').then(({ io }) => {
      socketRef.current = io(SOCKET_URL);
      
      socketRef.current.on('connect', () => {
        setIsSocketConnected(true);
      });

      socketRef.current.on('disconnect', () => {
        setIsSocketConnected(false);
      });

      socketRef.current.on('dispatchMessage', (data: { busId: string, message: string }) => {
        if (data.busId === user?.assignedBusId) {
          toast.warning(data.message, '🚨 City Admin Dispatch Alert 🚨', 8000);
        }
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('dispatchMessage');
        socketRef.current.disconnect();
      }
    };
  }, [user?.assignedBusId, fetchInitialData, fetchSchedules, toast]);

  const fetchRouteStops = useCallback(async (routeId: string) => {
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
  }, []);

  // Fetch stops when route changes
  useEffect(() => {
    if (selectedRouteId) {
      fetchRouteStops(selectedRouteId);
      const details = availableRoutes.find(r => r.id === selectedRouteId);
      setSelectedRouteDetails(details || null);
    }
  }, [selectedRouteId, availableRoutes, fetchRouteStops]);

  const beginActualTrip = async (_latitude: number, _longitude: number, _speedKmh: number) => {
    // 1. Create Trip in DB
    const { data: trip, error: tripErr } = await supabase.from('trips').insert([{
      bus_id: busDetails.id,
      route_id: selectedRouteId,
      status: 'Active',
      start_time: new Date().toISOString()
    }]).select().single();

    if (tripErr || !trip) {
      toast.error('Failed to start trip: ' + tripErr?.message);
      setIsStartingTrip(false);
      return;
    }

    setCurrentTripId(trip.id);
    setIsTripActive(true);
    setIsNavigatingToOrigin(false);
    setActiveTab('trip');
    setCurrentStopIndex(0);
    setIsStartingTrip(false);
    toast.success('Live GPS tracking active and broadcasting to commuter map.', 'Trip Started');

    const routePathCoords = selectedRouteDetails?.route_path || [];

    // 2. Start Real GPS Tracking
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude: lat, longitude: lng, speed } = position.coords;
        const currentSpeed = speed ? Math.round(speed * 3.6) : 0;
        setDriverPos({ lat, lng });
        setCurrentSpeedKmh(currentSpeed);

        let currentStatus = 'on_time';
        if (routePathCoords.length > 0) {
          const distToRoute = getDistanceToPolyline({ lat, lng }, routePathCoords);
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
            lat,
            lng,
            speedKmh: currentSpeed,
            status: currentStatus,
            occupancy: 'moderate',
            nextStopName: tripStops[currentStopIndex]?.stops?.stop_name || 'Terminal',
            driverName: user?.name || 'Driver',
            lastUpdated: new Date().toISOString()
          });
        }
      },
      (error) => {
        console.error(`Failed to get real GPS: ${error.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleStartTrip = async () => {
    if (!selectedRouteId || !busDetails) {
      toast.error('Please select an assigned route first.');
      return;
    }

    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported by your browser. Cannot start trip without GPS.');
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
          toast.warning(`You are ${dist.toFixed(0)}m from the origin stop. Tracking started. Proceed to origin.`);
        }
      }

      if (needsNavigation) {
        setIsNavigatingToOrigin(true);
        setIsStartingTrip(false);
        
        watchIdRef.current = navigator.geolocation.watchPosition(async (position) => {
          const { latitude, longitude, speed } = position.coords;
          const currentSpeed = speed ? Math.round(speed * 3.6) : 0;
          setDriverPos({ lat: latitude, lng: longitude });
          setCurrentSpeedKmh(currentSpeed);
          
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
            const startConfirmed = await confirm({
              title: 'Arrived at Origin Stop',
              message: `You have reached ${tripStops[0]?.stops?.stop_name}. Start passengers journey now?`,
              confirmText: 'Start Journey',
            });
            if (startConfirmed) {
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
      toast.error(`Could not get GPS fix: ${err.message}`);
      setIsStartingTrip(false);
    }, { enableHighAccuracy: true });
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
          font-weight: 800;
          font-size: 11px;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          border: 2px solid white;
          white-space: nowrap;
        ">
          <span>🚌</span>
          <span>${busNumber}</span>
        </div>
      `,
      iconSize: [60, 26],
      iconAnchor: [30, 13],
    });
  };

  const handleEndTrip = async () => {
    const isConfirmed = await confirm({
      title: 'End Active Trip',
      message: 'Are you sure you want to end this trip? Real-time broadcasting to passenger maps will stop.',
      confirmText: 'Yes, End Trip',
      isDestructive: true,
    });

    if (isConfirmed) {
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
      toast.info('Trip ended successfully. Shift data saved.');

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
  };

  const handleTriggerSOS = async () => {
    const sosConfirmed = await confirm({
      title: '🚨 TRIGGER EMERGENCY SOS 🚨',
      message: 'This will instantly alert the Municipal Transit Control Room, dispatch emergency response units, and flag your bus on all administrative monitors.',
      confirmText: 'CONFIRM SOS EMERGENCY',
      isDestructive: true,
    });

    if (sosConfirmed) {
      if (socketRef.current && busDetails) {
        socketRef.current.emit('emergencyAlert', {
          busId: busDetails.id,
          busNumber: busDetails.bus_number,
          routeNumber: selectedRouteDetails?.route_number,
          driverName: user?.name,
          location: driverPos,
          timestamp: new Date().toISOString()
        });
      }
      toast.error('Emergency SOS dispatched to Central Control Room! Help is on the way.', 'SOS ACTIVE', 10000);
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const navItems = [
    {
      id: 'home',
      label: 'Dispatch Console',
      icon: BusIcon,
      onClick: () => setActiveTab('home'),
      isActive: activeTab === 'home'
    },
    {
      id: 'schedule',
      label: 'My Schedule',
      icon: Calendar,
      onClick: () => setActiveTab('schedule'),
      isActive: activeTab === 'schedule'
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
    <SharedLayout 
      navItems={navItems} 
      title="Driver Console" 
      subtitle={`Bus ${busDetails?.bus_number || 'Loading...'}`} 
      headerIcon={CircleDot}
    >
      <div className="flex-1 w-full h-full flex flex-col relative overflow-hidden bg-[#f8f9fc]">
        
        {/* OPERATIONAL STATUS BAR (High glanceability for vehicle cab) */}
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold">
              <BusIcon className="w-4 h-4 text-purple-400" />
              <span>{busDetails ? `${busDetails.bus_number}` : 'AH-BUS'}</span>
            </div>
            <span className="text-slate-500">•</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono font-bold">{currentSpeedKmh} km/h</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px]">
              {isSocketConnected ? (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <Wifi className="w-3.5 h-3.5" /> Live Radio
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1 font-semibold">
                  <WifiOff className="w-3.5 h-3.5" /> Reconnecting
                </span>
              )}
            </div>

            {/* HIGH-VISIBILITY PROTECTED SOS ACTION */}
            <button
              type="button"
              onClick={handleTriggerSOS}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] flex items-center gap-1 shadow-sm sos-beacon transition-transform active:scale-95"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SOS EMERGENCY</span>
            </button>
          </div>
        </div>

        {/* TAB 1: DISPATCH / HOME */}
        {activeTab === 'home' && (
          <div className="flex-1 p-4 md:p-6 max-w-lg mx-auto w-full space-y-4 overflow-y-auto">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-[#7847CB] uppercase tracking-wider block">
                  Trip Assignment & Shift Console
                </span>
                <Badge variant={isTripActive ? 'success' : 'neutral'} size="sm" dot>
                  {isTripActive ? 'Trip Active' : 'Idle / Standby'}
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">
                    Assigned Vehicle
                  </label>
                  <div className="text-sm font-bold text-slate-900 flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-[#7847CB] flex items-center justify-center font-bold">
                        AH
                      </div>
                      <div>
                        <span className="block text-slate-900 leading-tight">
                          {busDetails ? `${busDetails.bus_number}` : 'Fetching bus info...'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {busDetails?.plate_number}
                        </span>
                      </div>
                    </div>
                    <Badge variant="brand" size="sm">EV City Bus</Badge>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">
                    Select Assigned Route
                  </label>
                  <select 
                    value={selectedRouteId} 
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    disabled={isTripActive}
                    className="w-full text-xs md:text-sm font-bold text-slate-900 p-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20"
                  >
                    <option value="" disabled>Select route...</option>
                    {availableRoutes.map(r => (
                      <option key={r.id} value={r.id}>
                        Route {r.route_number} ({r.origin} ➔ {r.destination})
                      </option>
                    ))}
                  </select>
                </div>

                {!isTripActive && (
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isDevOverride}
                      onChange={(e) => setIsDevOverride(e.target.checked)}
                      className="w-4 h-4 text-[#7847CB] rounded border-slate-300 focus:ring-[#7847CB]"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Bypass Location Check (Testing)</span>
                      <span className="text-[10px] text-slate-500 block">Allows starting trip from anywhere for verification</span>
                    </div>
                  </label>
                )}
              </div>

              {!isTripActive && !isNavigatingToOrigin && (
                <Button
                  onClick={handleStartTrip}
                  disabled={!selectedRouteId || tripStops.length === 0 || isStartingTrip}
                  isLoading={isStartingTrip}
                  className="w-full"
                  size="lg"
                  leftIcon={<Navigation className="w-4 h-4" />}
                >
                  {isStartingTrip ? 'Acquiring GPS Fix...' : 'Start Scheduled Trip'}
                </Button>
              )}

              {isNavigatingToOrigin && !isTripActive && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                    Moving to Route Origin Stop...
                  </div>
                  <p className="text-xs">
                    Please navigate to <strong>{tripStops[0]?.stops?.stop_name}</strong>. Trip will start automatically upon arrival within 150m.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setIsNavigatingToOrigin(false);
                      if (watchIdRef.current !== null) {
                        navigator.geolocation.clearWatch(watchIdRef.current);
                        watchIdRef.current = null;
                      }
                    }}
                  >
                    Cancel Navigation
                  </Button>
                </div>
              )}

              {isTripActive && (
                <Button
                  onClick={() => setActiveTab('trip')}
                  className="w-full"
                  size="lg"
                  leftIcon={<Navigation className="w-4 h-4" />}
                >
                  Open Live Trip Cockpit
                </Button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="flex-1 p-4 md:p-6 max-w-lg mx-auto w-full space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Assigned Shift Schedule</h2>
              <Badge variant="brand" size="md">{driverSchedules.length} Trips</Badge>
            </div>

            {driverSchedules.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl shadow-2xs space-y-2">
                <Calendar className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No trips scheduled for you currently.</p>
                <p className="text-[11px] text-slate-400">The Municipal Dispatcher assigns shifts here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {driverSchedules.map(trip => (
                  <div key={trip.id} className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="brand" size="sm">
                          {trip.status}
                        </Badge>
                        <h3 className="text-sm font-bold text-slate-900 mt-2">Route {trip.routes?.route_number}</h3>
                        <p className="text-xs text-slate-500">{trip.routes?.origin} ➔ {trip.routes?.destination}</p>
                      </div>
                      <span className="text-xs font-bold text-slate-700 tabular-nums">
                        {trip.start_time ? new Date(trip.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <BusIcon className="w-3.5 h-3.5 text-slate-400" />
                      Assigned Bus: <strong className="text-slate-800">{trip.buses?.bus_number}</strong>
                    </div>

                    {trip.status === 'Scheduled' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          if (trip.routes?.id) {
                            setSelectedRouteId(trip.routes.id);
                            setActiveTab('home');
                          }
                        }}
                      >
                        Select This Route
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ACTIVE TRIP COCKPIT */}
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

                  return (
                    <Polyline 
                      positions={pathPoints} 
                      color="#7847CB" 
                      weight={5} 
                      opacity={0.9}
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
                    <Popup className="font-bold">Your Bus Location ({currentSpeedKmh} km/h)</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>

            {/* FLOATING TRIP COCKPIT PANEL */}
            <div className={`w-full md:w-[380px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out z-40 ${
              isBottomSheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-48px)] md:translate-y-0'
            } absolute md:relative bottom-0 md:right-0 md:ml-auto h-auto max-h-[70vh] md:max-h-full md:h-full rounded-t-3xl md:rounded-none border-l border-slate-200/90`}>
              
              {/* Drag Handle (Mobile) */}
              <div 
                className="w-full h-10 flex items-center justify-center cursor-pointer md:hidden active:bg-slate-50 shrink-0"
                onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
              >
                <div className="w-10 h-1 bg-slate-300 rounded-full" />
                <ChevronUp className={`absolute right-4 text-slate-400 transition-transform ${isBottomSheetOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* Panel Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="font-extrabold text-slate-900 text-sm">Trip Navigation Active</h3>
                </div>
                <Badge variant="brand" size="sm">
                  {currentSpeedKmh} km/h
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Current Next Stop Card */}
                <div className="rounded-2xl bg-purple-50/70 border border-purple-200/80 p-4 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#7847CB]" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                    Approaching Next Stop
                  </span>
                  <h2 className="text-lg md:text-xl font-black text-[#7847CB] leading-tight">
                    {tripStops[currentStopIndex]?.stops?.stop_name || 'Terminal Destination'}
                  </h2>
                  <p className="text-xs font-semibold text-slate-600 mt-1">
                    Route {selectedRouteDetails?.route_number} ({currentStopIndex + 1} of {tripStops.length} stops)
                  </p>
                </div>

                {/* Upcoming Stops List */}
                <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                  <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Next in Sequence</h4>
                    <span className="text-[10px] text-slate-400">Order</span>
                  </div>
                  <div className="p-2 space-y-1.5 max-h-44 overflow-y-auto">
                    {tripStops.slice(currentStopIndex, currentStopIndex + 4).map((stop, idx) => (
                      <div key={stop.id} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-white border border-slate-100 shadow-2xs">
                        <span className={`font-bold ${idx === 0 ? 'text-[#7847CB]' : 'text-slate-700'}`}>
                          {stop.stops.stop_name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">+{stop.estimated_minutes_from_origin}m</span>
                      </div>
                    ))}
                    {currentStopIndex >= tripStops.length && (
                      <div className="text-center text-xs font-bold text-emerald-600 p-3">
                        ✓ All scheduled route stops completed!
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="space-y-2.5 pt-2">
                  {currentStopIndex < tripStops.length && (
                    <Button
                      onClick={() => setCurrentStopIndex(prev => prev + 1)}
                      className="w-full"
                      size="lg"
                    >
                      Mark Stop Reached & Next
                    </Button>
                  )}
                  
                  <Button
                    variant="destructive"
                    onClick={handleEndTrip}
                    className="w-full"
                    size="md"
                    leftIcon={<Square className="w-4 h-4 fill-current" />}
                  >
                    Complete & End Trip
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SharedLayout>
  );
};

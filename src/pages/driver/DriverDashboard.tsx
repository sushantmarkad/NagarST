import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useToast, useConfirm } from '../../context/FeedbackContext';
import {
  updateFirebaseLiveLocation,
  getFirebaseBuses,
  getFirebaseRoutes,
  getFirebaseTrips,
  saveFirebaseTrip
} from '../../utils/firebaseService';
import { db } from '../../utils/firebaseClient';
import { doc, deleteDoc } from 'firebase/firestore';
import {
  Navigation,
  AlertTriangle,
  Radio,
  RadioTower,
  Bus as BusIcon,
  CircleDot,
  MapPin,
  ChevronUp,
  Calendar,
  Gauge,
  Wifi,
  WifiOff,
  CheckCircle2,
  Crosshair,
  Sparkles,
  Power,
  LocateFixed,
  Building2
} from 'lucide-react';
import { LiveMap } from '../../components/map/LiveMap';
import { SharedLayout } from '../../components/layout/SharedLayout';
import { getDistance, getDistanceToPolyline } from '../../utils/routing';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import type { Bus, BusStop, Route } from '../../types';

export const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const { buses: appBuses, routes: appRoutes } = useApp();
  const toast = useToast();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'cockpit' | 'route' | 'schedule'>('cockpit');

  // Master Live Location Broadcaster State (Can be turned ON/OFF independently without route requirement!)
  const [isLiveBroadcasting, setIsLiveBroadcasting] = useState<boolean>(true);

  // Real data state
  const [driverSchedules, setDriverSchedules] = useState<any[]>([]);
  const [busDetails, setBusDetails] = useState<any>(null);
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  
  const [tripStops, setTripStops] = useState<any[]>([]);
  const [selectedRouteDetails, setSelectedRouteDetails] = useState<any>(null);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  // GPS Telemetry State (Starts with null so we detect real device location!)
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(0);
  const [driverHeading, setDriverHeading] = useState<number>(0);
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'active' | 'simulated' | 'fallback'>('searching');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(true);

  // Indoor presentation / Demo drive simulation toggle
  const [isSimulatingDrive, setIsSimulatingDrive] = useState<boolean>(false);

  // Mutable refs to eliminate cascading dependency loops
  const driverPosRef = useRef<{ lat: number; lng: number } | null>(null);
  driverPosRef.current = driverPos;
  const currentSpeedRef = useRef<number>(0);
  currentSpeedRef.current = currentSpeedKmh;
  const driverHeadingRef = useRef<number>(0);
  driverHeadingRef.current = driverHeading;
  const isLiveBroadcastingRef = useRef<boolean>(true);
  isLiveBroadcastingRef.current = isLiveBroadcasting;
  const isSimulatingDriveRef = useRef<boolean>(false);
  isSimulatingDriveRef.current = isSimulatingDrive;
  const busDetailsRef = useRef<any>(null);
  busDetailsRef.current = busDetails;
  const selectedRouteRef = useRef<any>(null);
  selectedRouteRef.current = selectedRouteDetails;
  const tripStopsRef = useRef<any[]>([]);
  tripStopsRef.current = tripStops;
  const currentStopIndexRef = useRef<number>(0);
  currentStopIndexRef.current = currentStopIndex;

  const watchIdRef = useRef<number | null>(null);
  const socketRef = useRef<any>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastDbWriteRef = useRef<number>(0);
  const simulationTimerRef = useRef<any>(null);

  // 1. Initial Data Fetching & Sync with AppContext / Firebase
  const fetchInitialData = useCallback(async () => {
    try {
      const fbBuses = await getFirebaseBuses();
      const combinedBuses = (fbBuses && fbBuses.length > 0) ? fbBuses : appBuses;

      if (combinedBuses && combinedBuses.length > 0) {
        const myBus = combinedBuses.find((b: any) => 
          b.id === user?.assignedBusId || 
          b.bus_number === (user as any)?.assignedBusNumber || 
          b.busNumber === (user as any)?.assignedBusNumber
        ) || combinedBuses[0];
        setBusDetails(myBus);
      } else {
        setBusDetails({
          id: 'bus-ah24',
          bus_number: 'AH-24',
          plate_number: 'MH-16-CV-2024',
          capacity: 40,
          type: 'Standard City',
          status: 'Active'
        });
      }
    } catch (_) {
      if (appBuses && appBuses.length > 0) {
        setBusDetails(appBuses[0]);
      } else {
        setBusDetails({
          id: 'bus-ah24',
          bus_number: 'AH-24',
          plate_number: 'MH-16-CV-2024',
          capacity: 40,
          type: 'Standard City',
          status: 'Active'
        });
      }
    }

    try {
      const fbRoutes = await getFirebaseRoutes();
      const combinedRoutes = (fbRoutes && fbRoutes.length > 0) ? fbRoutes : appRoutes;

      if (combinedRoutes && combinedRoutes.length > 0) {
        setAvailableRoutes(combinedRoutes);
        if (!selectedRouteId) setSelectedRouteId(combinedRoutes[0].id);
      }
    } catch (_) {
      if (appRoutes && appRoutes.length > 0) {
        setAvailableRoutes(appRoutes);
        if (!selectedRouteId) setSelectedRouteId(appRoutes[0].id);
      }
    }
  }, [user?.assignedBusId, appBuses, appRoutes, selectedRouteId]);

  const fetchSchedules = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [allTrips, allRoutes, allBuses] = await Promise.all([
        getFirebaseTrips(),
        getFirebaseRoutes(),
        getFirebaseBuses()
      ]);
      const myTrips = allTrips
        .filter(t => t.driver_id === user.id)
        .map(t => {
          const r = allRoutes.find(x => x.id === t.route_id);
          const b = allBuses.find(x => x.id === t.bus_id);
          return {
            id: t.id,
            status: t.status || 'Scheduled',
            start_time: t.start_time || new Date().toISOString(),
            routes: r ? { id: r.id, route_number: r.route_number || r.routeNumber, origin: r.origin, destination: r.destination } : null,
            buses: b ? { id: b.id, bus_number: b.bus_number || b.busNumber, plate_number: b.plate_number || b.plateNumber } : null
          };
        });
      setDriverSchedules(myTrips);
    } catch (_) {
      setDriverSchedules([]);
    }
  }, [user?.id]);

  // Connect to Socket.IO and establish BroadcastChannel
  useEffect(() => {
    fetchInitialData();
    fetchSchedules();

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannelRef.current = new BroadcastChannel('nagarst_bus_telemetry');
      }
    } catch (_) {}

    const SOCKET_URL = (import.meta as any).env?.VITE_SOCKET_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://nagarst.onrender.com');
    import('socket.io-client').then(({ io }) => {
      socketRef.current = io(SOCKET_URL, { reconnection: true, transports: ['websocket', 'polling'] });

      socketRef.current.on('connect', () => {
        setIsSocketConnected(true);
      });

      socketRef.current.on('disconnect', () => {
        setIsSocketConnected(false);
      });

      socketRef.current.on('dispatchMessage', (data: { busId: string, message: string }) => {
        const myBusId = busDetailsRef.current?.id || user?.assignedBusId;
        if (data.busId === myBusId) {
          toast.warning(data.message, 'City Admin Dispatch Alert', 8000);
        }
      });
    }).catch(() => {});

    return () => {
      if (socketRef.current) {
        socketRef.current.off('dispatchMessage');
        socketRef.current.disconnect();
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [user?.assignedBusId, fetchInitialData, fetchSchedules, toast]);

  // Sync available routes if AppContext loads them later
  useEffect(() => {
    if (availableRoutes.length === 0 && appRoutes.length > 0) {
      setAvailableRoutes(appRoutes);
      if (!selectedRouteId) setSelectedRouteId(appRoutes[0].id);
    }
  }, [appRoutes, availableRoutes.length, selectedRouteId]);

  // Fetch stops when route changes
  const fetchRouteStops = useCallback(async (routeId: string) => {
    if (!routeId) {
      setTripStops([]);
      setSelectedRouteDetails(null);
      return;
    }
    const route = availableRoutes.find(r => r.id === routeId) || appRoutes.find(r => r.id === routeId);
    if (route && route.stops && route.stops.length > 0) {
      const formatted = route.stops.map((s: any, idx: number) => ({
        id: s.stopId || s.id || `stop-${idx}`,
        stopId: s.stopId || s.id || `stop-${idx}`,
        stopName: s.stopName || s.name || `Stop ${idx + 1}`,
        sequence: s.sequence || idx + 1,
        estimatedMinutesFromOrigin: s.estimatedMinutesFromOrigin || idx * 4,
        lat: Number(s.lat),
        lng: Number(s.lng)
      }));
      setTripStops(formatted);
      setSelectedRouteDetails(route);
      return;
    }

    try {
      const allRoutes = await getFirebaseRoutes();
      const match = allRoutes.find(r => r.id === routeId);
      if (match && match.stops) {
        const formatted = match.stops.map((s: any, idx: number) => ({
          id: s.stopId || s.id || `stop-${idx}`,
          stopId: s.stopId || s.id || `stop-${idx}`,
          stopName: s.stopName || s.name || `Stop ${idx + 1}`,
          sequence: s.sequence || idx + 1,
          estimatedMinutesFromOrigin: s.estimatedMinutesFromOrigin || idx * 4,
          lat: Number(s.lat),
          lng: Number(s.lng)
        }));
        setTripStops(formatted);
        setSelectedRouteDetails(match);
      }
    } catch (_) {}
  }, [availableRoutes, appRoutes]);

  useEffect(() => {
    if (selectedRouteId) {
      fetchRouteStops(selectedRouteId);
    } else {
      setTripStops([]);
      setSelectedRouteDetails(null);
    }
  }, [selectedRouteId, fetchRouteStops]);

  // Centralized telemetry emitter: broadcasts live GPS coordinates to Passenger and City Admin dashboards
  // Uses refs to ensure this function reference is stable and NEVER triggers effect cascades
  const sendLiveTelemetry = useCallback((
    lat: number,
    lng: number,
    speedKmh: number,
    statusOverride?: string,
    heading?: number
  ) => {
    if (!isLiveBroadcastingRef.current) return;

    const b = busDetailsRef.current;
    const bId = b?.id || user?.assignedBusId || 'bus-ah24';
    const bNumber = b?.bus_number || b?.busNumber || (user as any)?.assignedBusNumber || 'AH-24';
    const bPlate = b?.plate_number || b?.plateNumber || 'MH-16-CV-2024';

    const r = selectedRouteRef.current;
    const stops = tripStopsRef.current;
    const stopIdx = currentStopIndexRef.current;

    let currentStatus = statusOverride || 'on_time';
    const routePathCoords = r?.route_path || [];
    if (!statusOverride && routePathCoords.length > 0) {
      const distToRoute = getDistanceToPolyline({ lat, lng }, routePathCoords);
      if (distToRoute > 250) {
        currentStatus = 'off_route';
      }
    }

    const nextStopObj = stops[stopIdx] || stops[0];
    const nextStopName = nextStopObj?.stopName || (r ? r.destination : 'City Transit Corridor');

    const payload: Bus = {
      id: bId,
      busNumber: bNumber,
      plateNumber: bPlate,
      routeId: r?.id || '',
      routeNumber: r?.route_number || r?.routeNumber || 'Transit',
      routeName: r ? `${r.origin} ➔ ${r.destination}` : 'Municipal City Bus Service',
      origin: r?.origin || 'Ahilyanagar CBS',
      destination: r?.destination || 'City Transit',
      currentStopId: stops[Math.max(0, stopIdx - 1)]?.id || 'stop1',
      currentStopName: stops[Math.max(0, stopIdx - 1)]?.stopName || 'Transit Origin',
      nextStopId: nextStopObj?.id || 'stop2',
      nextStopName: nextStopName,
      etaToNextMinutes: Math.max(1, Math.round(nextStopObj?.estimatedMinutesFromOrigin || 3)),
      lat,
      lng,
      speedKmh,
      heading: heading ?? driverHeadingRef.current ?? 0,
      status: currentStatus as any,
      occupancy: 'moderate',
      driverName: user?.name || 'Duty Operator',
      conductorName: 'Duty Conductor',
      busType: (b?.type || 'Standard City') as any,
      lastUpdated: new Date().toISOString(),
      isDemo: false,
      isLiveDriver: true
    };

    // 1. Cross-tab BroadcastChannel (instant zero-latency sync to Passenger & Admin tabs)
    try {
      if (!broadcastChannelRef.current && typeof BroadcastChannel !== 'undefined') {
        broadcastChannelRef.current = new BroadcastChannel('nagarst_bus_telemetry');
      }
      broadcastChannelRef.current?.postMessage({
        type: 'locationUpdate',
        data: payload,
        bus: payload,
        isLiveDriver: true
      });
      broadcastChannelRef.current?.postMessage({
        type: 'driver_location_update',
        data: payload,
        bus: payload,
        isLiveDriver: true
      });
    } catch (_) {}

    // 2. Cross-tab localStorage
    try {
      localStorage.setItem('nagarst_live_bus_' + bId, JSON.stringify(payload));
      const existingListStr = localStorage.getItem('nagarst_active_live_drivers');
      let driverList: any[] = [];
      if (existingListStr) {
        try { driverList = JSON.parse(existingListStr); } catch (_) {}
      }
      const updatedList = [payload, ...driverList.filter((x: any) => x.id !== bId)];
      localStorage.setItem('nagarst_active_live_drivers', JSON.stringify(updatedList));
    } catch (_) {}

    // 3. In-window custom event (instant in-memory notification across all components)
    try {
      window.dispatchEvent(new CustomEvent('nagarst_driver_telemetry', { detail: payload }));
    } catch (_) {}

    // 4. Socket.IO (transmits to cloud dispatcher and external commuter devices)
    if (socketRef.current) {
      socketRef.current.emit('updateLocation', payload);
      socketRef.current.emit('driverLocation', payload);
    }

    // 5. Firebase Firestore live_locations collection (backend database: written every 3s)
    const now = Date.now();
    if (now - lastDbWriteRef.current >= 3000 || lastDbWriteRef.current === 0) {
      lastDbWriteRef.current = now;
      try {
        updateFirebaseLiveLocation({
          bus_id: bId,
          bus_number: bNumber,
          lat,
          lng,
          speed_kmh: speedKmh,
          heading: heading ?? driverHeadingRef.current ?? 0,
          route_id: r?.id || undefined,
          updated_at: new Date().toISOString()
        } as any).catch(() => {});
      } catch (_) {}
    }
  }, [user]);

  // Robust GPS Acquirer: Gets real browser device location
  const acquireRealGPS = useCallback(() => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setGpsStatus('searching');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const spd = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
        const hdg = pos.coords.heading || 0;
        const acc = pos.coords.accuracy || 10;

        setDriverPos({ lat, lng });
        setCurrentSpeedKmh(spd);
        setDriverHeading(hdg);
        setGpsAccuracy(acc);
        setGpsStatus('active');

        sendLiveTelemetry(lat, lng, spd, 'on_time', hdg);
        toast.success(`Acquired live device location (±${Math.round(acc)}m accuracy).`, 'GPS Fixed');
      },
      (err) => {
        console.warn('Real GPS acquisition warning:', err.message);
        // Fallback to route origin or Ahilyanagar CBS only if real GPS is blocked
        const fallbackPos = tripStopsRef.current.length > 0 
          ? { lat: tripStopsRef.current[0].lat, lng: tripStopsRef.current[0].lng } 
          : { lat: 19.0975, lng: 74.7420 };

        setDriverPos(fallbackPos);
        setGpsStatus('fallback');
        toast.warning('Could not get device GPS. Click "Allow" on location prompt in your browser bar, or tap a preset location.', 'Location Access');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [toast, sendLiveTelemetry]);

  // On mount: acquire real GPS and start watchPosition
  useEffect(() => {
    acquireRealGPS();

    if ('geolocation' in navigator) {
      try {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            if (isSimulatingDriveRef.current) return;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const spd = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
            const hdg = pos.coords.heading || 0;
            const acc = pos.coords.accuracy || 10;

            setDriverPos({ lat, lng });
            setCurrentSpeedKmh(spd);
            setDriverHeading(hdg);
            setGpsAccuracy(acc);
            setGpsStatus('active');

            if (isLiveBroadcastingRef.current) {
              sendLiveTelemetry(lat, lng, spd, 'on_time', hdg);
            }
          },
          (err) => {
            console.log('GPS stream info:', err.message);
          },
          { enableHighAccuracy: true, maximumAge: 0 }
        );
      } catch (_) {}
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [acquireRealGPS, sendLiveTelemetry]);

  // Heartbeat interval: Continuously rebroadcast live telemetry every 3.5s so backend and maps stay live
  useEffect(() => {
    const heartbeatTimer = setInterval(() => {
      if (isLiveBroadcastingRef.current && driverPosRef.current) {
        sendLiveTelemetry(
          driverPosRef.current.lat,
          driverPosRef.current.lng,
          currentSpeedRef.current,
          'on_time',
          driverHeadingRef.current
        );
      }
    }, 3500);

    return () => clearInterval(heartbeatTimer);
  }, [sendLiveTelemetry]);

  // Master Switch: Toggle Live Location Broadcasting
  const handleToggleLiveBroadcasting = async (checked: boolean) => {
    setIsLiveBroadcasting(checked);
    const bId = busDetails?.id || user?.assignedBusId || 'bus-ah24';

    if (checked) {
      if (driverPosRef.current) {
        sendLiveTelemetry(driverPosRef.current.lat, driverPosRef.current.lng, currentSpeedRef.current, 'on_time', driverHeadingRef.current);
      } else {
        acquireRealGPS();
      }
      toast.success('Live GPS Broadcasting is ON! Your live location is streaming to Passenger & Admin dashboards.', 'Live Location Active');
    } else {
      setIsSimulatingDrive(false);
      try { await deleteDoc(doc(db, 'live_locations', bId)); } catch (_) {}
      try { localStorage.removeItem('nagarst_live_bus_' + bId); } catch (_) {}
      broadcastChannelRef.current?.postMessage({ type: 'busOffline', busId: bId });
      socketRef.current?.emit('stopTrip', bId);
      toast.info('Live GPS Broadcasting paused. Your bus is now in standby mode.', 'Live Location Paused');
    }
  };

  // Quick preset locator: allows instant positioning at Ahilyanagar landmarks for presentation testing
  const handleSetLocationPreset = (presetLat: number, presetLng: number, presetName: string) => {
    setDriverPos({ lat: presetLat, lng: presetLng });
    setGpsStatus('active');
    setGpsAccuracy(8);
    sendLiveTelemetry(presetLat, presetLng, 25, 'on_time', 45);
    toast.success(`Position set to ${presetName} and broadcasted live!`, 'Location Updated');
  };

  // Indoor Demo / Presentation Drive Simulation (Glides along route smoothly)
  useEffect(() => {
    if (!isSimulatingDrive) {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
      return;
    }

    setGpsStatus('simulated');

    const waypoints: { lat: number; lng: number }[] = (selectedRouteDetails?.route_path && selectedRouteDetails.route_path.length > 5)
      ? selectedRouteDetails.route_path
      : (tripStops.length > 0 ? tripStops.map(s => ({ lat: s.lat, lng: s.lng })) : [
          { lat: 19.0975, lng: 74.7420 },
          { lat: 19.1025, lng: 74.7380 },
          { lat: 19.1120, lng: 74.7350 },
          { lat: 19.1235, lng: 74.7321 }
        ]);

    let step = 0;
    simulationTimerRef.current = setInterval(() => {
      if (waypoints.length < 2) return;
      step = (step + 1) % waypoints.length;

      const currentPt = waypoints[step];
      const nextPt = waypoints[(step + 1) % waypoints.length];
      const dLat = nextPt.lat - currentPt.lat;
      const dLng = nextPt.lng - currentPt.lng;
      const calculatedHeading = Math.round((Math.atan2(dLng, dLat) * 180 / Math.PI + 360) % 360);
      const simulatedSpeed = Math.floor(26 + Math.random() * 10);

      setDriverPos(currentPt);
      setCurrentSpeedKmh(simulatedSpeed);
      setDriverHeading(calculatedHeading);

      sendLiveTelemetry(currentPt.lat, currentPt.lng, simulatedSpeed, 'on_time', calculatedHeading);
    }, 1200);

    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
    };
  }, [isSimulatingDrive, selectedRouteDetails, tripStops, sendLiveTelemetry]);

  // Emergency SOS trigger
  const handleTriggerSOS = async () => {
    const sosConfirmed = await confirm({
      title: 'TRIGGER EMERGENCY SOS DISPATCH',
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

  // Format data for the unified LiveMap component (exact same structure used by Passenger and Admin)
  const mapRoute: Route | null = useMemo(() => {
    if (!selectedRouteDetails) return null;
    return {
      id: selectedRouteDetails.id,
      routeNumber: selectedRouteDetails.route_number || selectedRouteDetails.routeNumber || 'Transit',
      name: selectedRouteDetails.name || `${selectedRouteDetails.origin} ➔ ${selectedRouteDetails.destination}`,
      nameMarathi: selectedRouteDetails.nameMarathi || selectedRouteDetails.name || `${selectedRouteDetails.origin} ➔ ${selectedRouteDetails.destination}`,
      origin: selectedRouteDetails.origin || 'Depot',
      destination: selectedRouteDetails.destination || 'Depot',
      firstBus: selectedRouteDetails.firstBus || '06:00 AM',
      lastBus: selectedRouteDetails.lastBus || '10:00 PM',
      frequencyMinutes: selectedRouteDetails.frequencyMinutes || 15,
      baseFare: selectedRouteDetails.baseFare || 10,
      maxFare: selectedRouteDetails.maxFare || 30,
      totalStops: tripStops.length,
      durationMinutes: selectedRouteDetails.durationMinutes || 30,
      color: selectedRouteDetails.color || '#7847CB',
      status: 'normal',
      route_path: selectedRouteDetails.route_path,
      activeBusesCount: 1,
      stops: tripStops.map((s, idx) => ({
        stopId: s.id,
        stopName: s.stopName,
        stopNameMarathi: s.stopName,
        sequence: s.sequence || idx + 1,
        fareFromOrigin: (idx + 1) * 5,
        estimatedMinutesFromOrigin: s.estimatedMinutesFromOrigin || idx * 4,
        lat: s.lat,
        lng: s.lng
      }))
    };
  }, [selectedRouteDetails, tripStops]);

  const mapStops: BusStop[] = useMemo(() => {
    return tripStops.map((s) => ({
      id: s.id,
      name: s.stopName,
      nameMarathi: s.stopName,
      area: 'Ahilyanagar',
      lat: s.lat,
      lng: s.lng,
      lines: [mapRoute?.routeNumber || 'Route'],
      facilities: ['Shelter', 'Digital Display'],
      accessibility: true,
      shelter: true,
      digitalBoard: true,
      liveArrivals: []
    }));
  }, [tripStops, mapRoute]);

  const driverBusObject: Bus | null = useMemo(() => {
    const bId = busDetails?.id || user?.assignedBusId || 'bus-ah24';
    const bNumber = busDetails?.bus_number || busDetails?.busNumber || (user as any)?.assignedBusNumber || 'AH-24';
    const bPlate = busDetails?.plate_number || busDetails?.plateNumber || 'MH-16-CV-2024';

    return {
      id: bId,
      busNumber: bNumber,
      plateNumber: bPlate,
      routeId: selectedRouteId || '',
      routeNumber: mapRoute?.routeNumber || 'Transit',
      routeName: mapRoute?.name || 'Live City Transit',
      origin: mapRoute?.origin || 'Ahilyanagar CBS',
      destination: mapRoute?.destination || 'Depot',
      currentStopId: tripStops[Math.max(0, currentStopIndex - 1)]?.id || 'stop1',
      currentStopName: tripStops[Math.max(0, currentStopIndex - 1)]?.stopName || 'Transit Origin',
      nextStopId: tripStops[currentStopIndex]?.id || 'stop2',
      nextStopName: tripStops[currentStopIndex]?.stopName || 'En Route',
      etaToNextMinutes: 3,
      speedKmh: currentSpeedKmh,
      occupancy: 'moderate',
      status: 'on_time',
      lat: driverPos ? driverPos.lat : 19.0975,
      lng: driverPos ? driverPos.lng : 74.7420,
      heading: driverHeading || 0,
      driverName: user?.name || 'Driver',
      conductorName: 'Conductor',
      busType: (busDetails?.type || 'Standard City') as any,
      lastUpdated: new Date().toISOString(),
      isDemo: false,
      isLiveDriver: isLiveBroadcasting
    };
  }, [busDetails, user, selectedRouteId, mapRoute, tripStops, currentStopIndex, currentSpeedKmh, driverPos, driverHeading, isLiveBroadcasting]);

  const navItems = [
    {
      id: 'cockpit',
      label: 'Live GPS Console',
      icon: Navigation,
      onClick: () => setActiveTab('cockpit'),
      isActive: activeTab === 'cockpit'
    },
    {
      id: 'route',
      label: 'Route Corridor',
      icon: BusIcon,
      onClick: () => setActiveTab('route'),
      isActive: activeTab === 'route'
    },
    {
      id: 'schedule',
      label: 'My Schedule',
      icon: Calendar,
      onClick: () => setActiveTab('schedule'),
      isActive: activeTab === 'schedule'
    }
  ];

  return (
    <SharedLayout 
      navItems={navItems} 
      title="Driver Console" 
      subtitle={`Bus ${busDetails?.bus_number || busDetails?.busNumber || 'AH-24'} • ${isLiveBroadcasting ? 'Broadcasting Live Location' : 'GPS Standby'}`} 
      headerIcon={CircleDot}
    >
      <div className="flex-1 w-full h-full flex flex-col relative overflow-hidden bg-slate-100">
        
        {/* OPERATIONAL STATUS BAR (High glanceability for vehicle cab) */}
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs border-b border-slate-800 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold">
              <BusIcon className="w-4 h-4 text-purple-400" />
              <span>{busDetails ? `${busDetails.bus_number || busDetails.busNumber}` : 'AH-24'}</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono font-bold text-sm text-emerald-400">{currentSpeedKmh}</span>
              <span className="text-[10px] text-slate-400">km/h</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className={`w-2.5 h-2.5 rounded-full ${
                isLiveBroadcasting 
                  ? (gpsStatus === 'simulated' ? 'bg-amber-400 animate-bounce' : 'bg-emerald-400 animate-pulse') 
                  : 'bg-slate-500'
              }`} />
              <span className="font-semibold text-[11px]">
                {isLiveBroadcasting 
                  ? (gpsStatus === 'simulated' ? 'Demo Drive Active' : `Live GPS (${gpsAccuracy ? `±${Math.round(gpsAccuracy)}m` : 'Detecting...'})`)
                  : 'GPS Broadcasting Off'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* MASTER ONE-CLICK LIVE LOCATION BROADCAST TOGGLE */}
            <button
              type="button"
              onClick={() => handleToggleLiveBroadcasting(!isLiveBroadcasting)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 ${
                isLiveBroadcasting
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              <RadioTower className={`w-3.5 h-3.5 ${isLiveBroadcasting ? 'animate-pulse' : ''}`} />
              <span>{isLiveBroadcasting ? 'GPS BROADCASTING: ON' : 'BROADCAST GPS: OFF'}</span>
            </button>

            {/* HIGH-VISIBILITY PROTECTED SOS ACTION */}
            <button
              type="button"
              onClick={handleTriggerSOS}
              className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] flex items-center gap-1 shadow-sm sos-beacon transition-transform active:scale-95"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SOS DISPATCH</span>
            </button>
          </div>
        </div>

        {/* UNIFIED PASSENGER & CITY ADMIN SPLIT LAYOUT */}
        <div className="flex-1 flex flex-col md:flex-row h-full relative overflow-hidden">
          
          {/* PRIMARY WORKSPACE: LIVE INTERACTIVE MAP (Exact same layout as Passenger and City Admin) */}
          <div className="flex-1 h-[50vh] md:h-full w-full relative order-1 md:order-1">
            <LiveMap
              buses={driverBusObject ? [driverBusObject] : []}
              stops={mapStops}
              routes={mapRoute ? [mapRoute] : []}
              selectedBusId={driverBusObject?.id}
              selectedRouteId={mapRoute?.id}
              height="100%"
              showUserLocation={Boolean(driverPos)}
              userLocation={driverPos}
            />

            {/* Floating Live Status Overlay on Map */}
            <div className="absolute top-4 left-4 z-[500] flex flex-wrap gap-2 pointer-events-auto">
              <Badge variant={isLiveBroadcasting ? 'success' : 'neutral'} size="md" dot>
                {isLiveBroadcasting ? 'BROADCASTING LIVE TO PASSENGERS & ADMIN' : 'LOCATION BROADCASTING PAUSED'}
              </Badge>
              {mapRoute ? (
                <div className="bg-white/95 backdrop-blur-md shadow-md px-3 py-1.5 rounded-xl border border-slate-200/80 text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: mapRoute.color || '#7847CB' }} />
                  <span>Route {mapRoute.routeNumber}: {mapRoute.origin} ➔ {mapRoute.destination}</span>
                </div>
              ) : (
                <div className="bg-white/95 backdrop-blur-md shadow-md px-3 py-1.5 rounded-xl border border-slate-200/80 text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Free City Duty (No Route Filter)</span>
                </div>
              )}
            </div>
          </div>

          {/* CONTROL COCKPIT SIDE PANEL (Responsive: docked side panel on desktop, sliding drawer on mobile) */}
          <div className={`w-full md:w-[380px] lg:w-[410px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out z-30 order-2 ${
            isBottomSheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-48px)] md:translate-y-0'
          } absolute md:relative bottom-0 md:bottom-auto md:right-0 md:ml-auto h-auto max-h-[60vh] md:max-h-full md:h-full rounded-t-3xl md:rounded-none border-l border-slate-200/90`}>
            
            {/* Mobile Drag Handle */}
            <div 
              className="w-full h-9 flex items-center justify-center cursor-pointer md:hidden active:bg-slate-50 shrink-0"
              onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
            >
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
              <ChevronUp className={`absolute right-4 text-slate-400 transition-transform ${isBottomSheetOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Cockpit Sub-Header & Navigation Tabs */}
            <div className="p-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('cockpit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    activeTab === 'cockpit' ? 'bg-[#7847CB] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Live Location
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('route')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    activeTab === 'route' ? 'bg-[#7847CB] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Route ({mapRoute ? `Route ${mapRoute.routeNumber}` : 'Optional'})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('schedule')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    activeTab === 'schedule' ? 'bg-[#7847CB] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Schedule ({driverSchedules.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => acquireRealGPS()}
                className="p-1.5 rounded-lg text-slate-500 hover:text-[#7847CB] hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                title="Refresh Real Device GPS"
              >
                <LocateFixed className="w-4 h-4" />
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* TAB 1: DEDICATED LIVE LOCATION BROADCASTER */}
              {activeTab === 'cockpit' && (
                <div className="space-y-4">
                  
                  {/* MASTER BROADCAST CARD */}
                  <div className={`p-4 rounded-3xl border transition-all ${
                    isLiveBroadcasting 
                      ? 'bg-gradient-to-br from-emerald-500/10 via-purple-500/5 to-white border-emerald-500/40 shadow-sm' 
                      : 'bg-slate-50 border-slate-200/90'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                          isLiveBroadcasting ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30' : 'bg-slate-200 text-slate-500'
                        }`}>
                          <Radio className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-sm md:text-base leading-tight">
                            Live GPS Location
                          </h3>
                          <span className={`text-[11px] font-bold ${isLiveBroadcasting ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {isLiveBroadcasting ? 'Broadcasting to Passenger & Admin Maps' : 'Standby (Not Broadcasting)'}
                          </span>
                        </div>
                      </div>

                      {/* Power Switch */}
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox" 
                          checked={isLiveBroadcasting}
                          onChange={(e) => handleToggleLiveBroadcasting(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      {isLiveBroadcasting
                        ? 'Your live position, speed, and heading are broadcasting continuously to the backend Firestore, Socket.IO, Passenger Live Tracking, and City Admin Fleet Map.'
                        : 'Switch ON to instantly broadcast your vehicle location to commuters and transit authorities. No route assignment is required.'}
                    </p>

                    {/* Quick GPS Readout Pill */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-white/90 p-2.5 rounded-2xl border border-slate-200/80">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Speed</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">{currentSpeedKmh} km/h</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Detected GPS</span>
                        <span className="font-mono font-bold text-slate-900 text-[11px]">
                          {driverPos ? `${driverPos.lat.toFixed(4)}, ${driverPos.lng.toFixed(4)}` : 'Acquiring...'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* QUICK GPS FIX & LOCATION PRESETS (To test in Ahilyanagar landmarks or use Real Phone GPS) */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Location Selector / Calibration
                      </span>
                      <button
                        type="button"
                        onClick={acquireRealGPS}
                        className="text-[11px] font-bold text-[#7847CB] flex items-center gap-1 hover:underline"
                      >
                        <LocateFixed className="w-3.5 h-3.5" />
                        Detect My Device GPS
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSetLocationPreset(19.0975, 74.7420, 'Ahilyanagar CBS')}
                        className="p-2 rounded-xl bg-white border border-slate-200 hover:border-[#7847CB] text-left text-xs font-bold text-slate-800 transition-colors shadow-2xs"
                      >
                        <span className="block text-[11px] text-purple-700">Central Bus Stand</span>
                        <span className="text-[9px] text-slate-400 font-mono">19.0975, 74.7420</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetLocationPreset(19.1235, 74.7321, 'Savedi Depot')}
                        className="p-2 rounded-xl bg-white border border-slate-200 hover:border-[#7847CB] text-left text-xs font-bold text-slate-800 transition-colors shadow-2xs"
                      >
                        <span className="block text-[11px] text-purple-700">Savedi Bus Depot</span>
                        <span className="text-[9px] text-slate-400 font-mono">19.1235, 74.7321</span>
                      </button>
                    </div>
                  </div>

                  {/* Route Status Summary */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Assigned Corridor</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('route')}
                        className="text-xs font-bold text-[#7847CB] hover:underline"
                      >
                        {mapRoute ? 'Change' : 'Select Corridor'}
                      </button>
                    </div>
                    {mapRoute ? (
                      <div className="flex items-center justify-between bg-purple-50/70 p-2.5 rounded-xl border border-purple-200/60">
                        <div>
                          <strong className="text-xs font-black text-[#7847CB]">Route {mapRoute.routeNumber}</strong>
                          <p className="text-[11px] text-slate-600 font-medium">{mapRoute.origin} ➔ {mapRoute.destination}</p>
                        </div>
                        <Badge variant="brand" size="sm">{tripStops.length} stops</Badge>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        No route selected. Operating in free municipal city duty.
                      </p>
                    )}
                  </div>

                  {/* Indoor Presentation / Demo Drive Toggle */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Simulate Live Drive (For Presentation)
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Glides vehicle along the road, broadcasting to Commuter & Admin maps
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                      <input 
                        type="checkbox" 
                        checked={isSimulatingDrive}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsSimulatingDrive(checked);
                          if (checked) {
                            setIsLiveBroadcasting(true);
                            toast.info('Simulated Live Drive enabled: Bus is gliding along the road and broadcasting real telemetry.', 'Live Drive Simulator');
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#7847CB]"></div>
                    </label>
                  </div>

                  {/* Route Sequence Checklist (If Route is Assigned) */}
                  {tripStops.length > 0 && (
                    <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                      <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Route Stops Sequence</h4>
                        <span className="text-[10px] text-slate-400 font-mono">{tripStops.length} stops</span>
                      </div>
                      <div className="p-2 space-y-1.5 max-h-44 overflow-y-auto">
                        {tripStops.map((stop, idx) => {
                          const isCurrent = idx === currentStopIndex;
                          const isPassed = idx < currentStopIndex;

                          return (
                            <div 
                              key={stop.id} 
                              className={`flex items-center justify-between text-xs p-2.5 rounded-xl border transition-colors ${
                                isCurrent 
                                  ? 'bg-purple-50 border-[#7847CB]/30 text-[#7847CB] font-black' 
                                  : isPassed 
                                    ? 'bg-slate-50 border-slate-100 text-slate-400 font-medium'
                                    : 'bg-white border-slate-100 text-slate-700 font-bold'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  isCurrent ? 'bg-[#7847CB] text-white' : isPassed ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {idx + 1}
                                </span>
                                <span>{stop.stopName}</span>
                              </div>
                              <span className="text-[10px] text-slate-400">+{stop.estimatedMinutesFromOrigin}m</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: OPTIONAL ROUTE CORRIDOR SELECTION */}
              {activeTab === 'route' && (
                <div className="space-y-4">
                  {/* Assigned Vehicle Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Assigned Vehicle
                    </span>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#7847CB] flex items-center justify-center font-black text-sm">
                          AH
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base">
                            {busDetails ? (busDetails.bus_number || busDetails.busNumber) : 'AH-24'}
                          </h3>
                          <span className="text-xs text-slate-500 font-mono">
                            {busDetails?.plate_number || busDetails?.plateNumber || 'MH-16-CV-2024'}
                          </span>
                        </div>
                      </div>
                      <Badge variant="brand" size="sm">EV City Bus</Badge>
                    </div>
                  </div>

                  {/* Route Selector (Optional) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Select Assigned Route Corridor (Optional)
                    </label>
                    <select
                      value={selectedRouteId}
                      onChange={(e) => setSelectedRouteId(e.target.value)}
                      className="w-full text-xs md:text-sm font-bold text-slate-900 p-3 bg-white rounded-2xl border border-slate-200 outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20"
                    >
                      <option value="">No Route (General City Duty)</option>
                      {availableRoutes.map(r => (
                        <option key={r.id} value={r.id}>
                          Route {r.route_number || r.routeNumber} ({r.origin} ➔ {r.destination})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Route Details Card */}
                  {selectedRouteDetails && (
                    <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-2 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Origin Terminal:</span>
                        <strong className="text-slate-800">{selectedRouteDetails.origin}</strong>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Destination Terminal:</span>
                        <strong className="text-slate-800">{selectedRouteDetails.destination}</strong>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Total Scheduled Stops:</span>
                        <strong className="text-slate-800">{tripStops.length} stops</strong>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Trip Duration:</span>
                        <strong className="text-slate-800">~{selectedRouteDetails.durationMinutes || 30} mins</strong>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => setActiveTab('cockpit')}
                    className="w-full"
                    size="md"
                  >
                    Return to Live Location Console
                  </Button>
                </div>
              )}

              {/* TAB 3: SHIFT SCHEDULE */}
              {activeTab === 'schedule' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">Assigned Shift Schedule</h3>
                    <Badge variant="brand" size="sm">{driverSchedules.length} Trips</Badge>
                  </div>

                  {driverSchedules.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <Calendar className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-bold text-slate-700">No specific shift assigned.</p>
                      <p className="text-[11px] text-slate-400">Live GPS Location can broadcast anytime on duty.</p>
                    </div>
                  ) : (
                    driverSchedules.map(trip => (
                      <div key={trip.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge variant="brand" size="sm">{trip.status}</Badge>
                            <h4 className="text-xs font-bold text-slate-900 mt-1.5">Route {trip.routes?.route_number}</h4>
                            <p className="text-[11px] text-slate-500">{trip.routes?.origin} ➔ {trip.routes?.destination}</p>
                          </div>
                          <span className="text-xs font-bold text-slate-700 font-mono">
                            {trip.start_time ? new Date(trip.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:00 AM'}
                          </span>
                        </div>
                        {trip.routes?.id && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => {
                              setSelectedRouteId(trip.routes.id);
                              setActiveTab('cockpit');
                            }}
                          >
                            Select This Route
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </SharedLayout>
  );
};

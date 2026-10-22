import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { LiveMap } from '../components/map/LiveMap';
import { OccupancyBadge, BusStatusBadge } from '../components/common/StatusBadge';
import { ETAIndicator } from '../components/common/ETAIndicator';
import {
  Navigation,
  User,
  Search,
  Filter,
  Bus as BusIcon,
  ChevronRight,
  MapPin,
  Clock,
  Radio,
  Sparkles,
  ArrowRight,
  X,
  CheckCircle2,
  Gauge,
  Crosshair,
  ShieldCheck,
  Compass,
  AlertCircle,
  LocateFixed,
  Building2,
  Route as RouteIcon,
  Users,
  Zap,
  Thermometer,
  Ticket,
  Share2,
  CreditCard,
  Smartphone,
  QrCode,
  ChevronLeft,
  Plus,
  Minus,
  PartyPopper
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { BusStop, Bus, Route as RouteType } from '../types';
import { getDistance } from '../utils/routing';
import {
  DEMO_BUS_DEFINITIONS,
  AVAILABLE_DEMO_ROUTES,
  getDemoSimulatorState,
  subscribeToDemoState,
  buildBusTelemetry,
  ensureTimerRunning,
  syncSimulatorFleetWithAdminConfig,
  restoreSimRunningState,
  cleanBusKey,
  isSameBusKey,
  type DemoSimulatorState,
  type DemoStop
} from '../utils/demoSimulatorEngine';
import { io } from 'socket.io-client';
import { subscribeFirebaseLiveLocations } from '../utils/firebaseService';

// Major Ahilyanagar transit landmarks and hubs for manual location selection
const AHILYANAGAR_HUBS = [
  { id: 'cbs', name: 'Ahilyanagar Central Bus Stand (CBS)', lat: 19.0975, lng: 74.7420, hubCode: 'CBS' },
  { id: 'savedi', name: 'Savedi Bus Depot / Premdan Chowk', lat: 19.1235, lng: 74.7321, hubCode: 'SVD' },
  { id: 'delhi-gate', name: 'Delhi Gate Transit Terminal', lat: 19.1025, lng: 74.7380, hubCode: 'DLG' },
  { id: 'market-yard', name: 'Market Yard Bus Station', lat: 19.0880, lng: 74.7510, hubCode: 'MKY' },
  { id: 'swastik', name: 'Swastik Chowk Hub', lat: 19.0940, lng: 74.7350, hubCode: 'SWK' },
  { id: 'kotla', name: 'Kotla Bus Stand', lat: 19.0910, lng: 74.7290, hubCode: 'KTL' },
];

interface LiveTrackingProps {
  initialMode?: 'simulator' | 'live' | 'all';
}

export const LiveTracking: React.FC<LiveTrackingProps> = ({ initialMode }) => {
  const { t } = useLanguage();
  const { buses, stops, routes, selectedBusId, setSelectedBusId, selectedStopId, setSelectedStopId, addTicket, tickets } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlMode = (searchParams.get('mode') as 'simulator' | 'live' | 'all') || null;
  const [trackingMode, setTrackingMode] = useState<'simulator' | 'live' | 'all'>(() => urlMode || initialMode || 'all');

  const handleSetTrackingMode = (mode: 'simulator' | 'live' | 'all') => {
    setTrackingMode(mode);
    const newParams = new URLSearchParams(searchParams);
    if (mode === 'all') {
      newParams.delete('mode');
    } else {
      newParams.set('mode', mode);
    }
    setSearchParams(newParams, { replace: true });
  };

  // Real-time live simulator state subscription
  const [simState, setSimState] = useState<DemoSimulatorState>(getDemoSimulatorState);

  useEffect(() => {
    const unsub = subscribeToDemoState((newState) => {
      setSimState(newState);
    });
    return () => unsub();
  }, []);

  // Pre-select bus if navigated with ?busId=...
  useEffect(() => {
    const busParam = searchParams.get('busId');
    if (busParam) {
      setSelectedBusId(busParam);
    }
  }, [searchParams, setSelectedBusId]);

  const [filterRoute, setFilterRoute] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showListOnDesktop, setShowListOnDesktop] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'all' | 'nearby'>('all');
  const [isNearbyDrawerOpen, setIsNearbyDrawerOpen] = useState(false);

  // Digital QR Ticket Dashboard state (opened from bus popup)
  const [showTicketDashboard, setShowTicketDashboard] = useState(false);
  const [ticketStep, setTicketStep] = useState<'form' | 'payment' | 'success'>('form');
  const [tktSource, setTktSource] = useState('');
  const [tktDestination, setTktDestination] = useState('');
  const [tktPassengerCount, setTktPassengerCount] = useState(1);
  const [tktBusType, setTktBusType] = useState<'AC Express' | 'EV Metro Shuttle' | 'Standard City' | 'Mini Bus'>('EV Metro Shuttle');
  const [tktPaymentMethod, setTktPaymentMethod] = useState<'upi' | 'card' | 'counter'>('upi');
  const [tktIsProcessing, setTktIsProcessing] = useState(false);
  const [tktIssuedTicket, setTktIssuedTicket] = useState<any>(null);

  // Commuter Location State (Live GPS or Manual Station Selection)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocationLabel, setUserLocationLabel] = useState<string>('Ahilyanagar CBS (Default)');
  const [isManualLocation, setIsManualLocation] = useState<boolean>(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isPickingLocationOnMap, setIsPickingLocationOnMap] = useState<boolean>(false);
  const [locationErrorNotice, setLocationErrorNotice] = useState<string | null>(null);

  // Only configured routes from Admin / Database — NO fake or hardcoded mock routes!
  const allRoutes = routes;

  // 1. Real-time Active Buses (Live GPS Driver Telemetry ONLY — demo buses come from simState)
  const [activeLiveBuses, setActiveLiveBuses] = useState<Record<string, Bus>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      // Only load real live GPS driver buses, NOT demo buses.
      // Demo bus positions come exclusively from simState to prevent position conflicts.
      const result: Record<string, Bus> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('nagarst_live_bus_')) {
          const val = localStorage.getItem(k);
          if (val) {
            const b = JSON.parse(val);
            if (b && b.id && !b.isDemo && !String(b.id).startsWith('demo-')) {
              result[b.id] = b;
            }
          }
        }
      }
      return result;
    } catch (_) {
      return {};
    }
  });

  // Synchronize active live buses strictly with registered municipal fleet while ALWAYS preserving live drivers
  useEffect(() => {
    setActiveLiveBuses((prev) => {
      const next: Record<string, Bus> = {};
      Object.entries(prev).forEach(([k, b]) => {
        // ALWAYS retain real live drivers transmitting GPS
        if (b.isLiveDriver || !b.isDemo) {
          next[k] = b;
          return;
        }
        // For virtual simulator fleet, retain if known database bus
        const isKnown = buses.some(cb =>
          isSameBusKey(cb.id, k) ||
          isSameBusKey(cb.busNumber, k) ||
          isSameBusKey(cb.plateNumber, k) ||
          isSameBusKey(cb.id, b.id) ||
          isSameBusKey(cb.busNumber, b.busNumber) ||
          isSameBusKey(cb.plateNumber, b.plateNumber)
        );
        if (isKnown) {
          next[k] = b;
        }
      });
      return next;
    });
  }, [buses]);

  // Listen to cross-tab BroadcastChannel & storage events for live bus telemetry
  useEffect(() => {
    let ch: BroadcastChannel | null = null;
    const pendingBroadcastUpdates: Record<string, Bus> = {};
    let rafBroadcastId: number | null = null;

    const flushBroadcastUpdates = () => {
      rafBroadcastId = null;
      const updates = { ...pendingBroadcastUpdates };
      Object.keys(pendingBroadcastUpdates).forEach(k => delete pendingBroadcastUpdates[k]);
      if (Object.keys(updates).length === 0) return;
      setActiveLiveBuses(prev => ({ ...prev, ...updates }));
    };

    try {
      ch = new BroadcastChannel('nagarst_bus_telemetry');
      ch.onmessage = (event) => {
        const payload = event.data;
        if ((payload?.type === 'locationUpdate' || payload?.type === 'driver_location_update') && (payload?.data || payload?.bus)) {
          const incoming = (payload.data || payload.bus) as Bus;
          if (incoming && incoming.id) {
            // Check if bus is deleted
            try {
              const deletedRaw = localStorage.getItem('nagarst_deleted_demo_buses');
              if (deletedRaw) {
                const deletedList: string[] = JSON.parse(deletedRaw);
                const norm = (s?: string) => (s || '').trim().toUpperCase().replace(/[\s-_]/g, '');
                const bId = norm(incoming.id);
                const bNum = norm(incoming.busNumber);
                const bPlate = norm(incoming.plateNumber);
                const isDel = deletedList.some(d => {
                  const cd = norm(d);
                  return cd && (cd === bId || cd === bNum || cd === bPlate);
                });
                if (isDel) {
                  delete pendingBroadcastUpdates[incoming.id];
                  setActiveLiveBuses((prev) => {
                    const next = { ...prev };
                    delete next[incoming.id];
                    Object.keys(next).forEach(k => {
                      const b = next[k];
                      if (
                        isSameBusKey(k, incoming.id) ||
                        isSameBusKey(b?.id, incoming.id) ||
                        isSameBusKey(b?.busNumber, incoming.busNumber) ||
                        isSameBusKey(b?.plateNumber, incoming.plateNumber)
                      ) {
                        delete next[k];
                      }
                    });
                    return next;
                  });
                  return;
                }
              }
            } catch (_) { }

            const isLiveDriver = Boolean(incoming.isLiveDriver || !incoming.isDemo || payload?.type === 'driver_location_update');
            const isDemo = !isLiveDriver && Boolean(incoming.isDemo || incoming.id.startsWith('demo-'));
            const isKnown = buses.length === 0 || buses.some(b =>
              isSameBusKey(b.id, incoming.id) ||
              isSameBusKey(b.busNumber, incoming.busNumber) ||
              isSameBusKey(b.id, incoming.busNumber) ||
              isSameBusKey(b.busNumber, incoming.id) ||
              isSameBusKey(b.plateNumber, incoming.plateNumber)
            );
            // Accept if it belongs to registered municipal fleet OR is an active live driver
            if (!isKnown && !isLiveDriver) return;

            pendingBroadcastUpdates[incoming.id] = { ...incoming, isDemo, isLiveDriver };
            if (!rafBroadcastId) {
              rafBroadcastId = requestAnimationFrame(flushBroadcastUpdates);
            }
          }
        } else if (payload?.type === 'simRunningSync' || payload?.type === 'fleetSync' || payload?.type === 'resetDemo') {
          restoreSimRunningState();
          if (payload?.type === 'fleetSync' && payload?.buses) {
            setActiveLiveBuses((prev) => ({ ...prev, ...payload.buses }));
          }
          setSimState(getDemoSimulatorState());
        } else if (payload?.type === 'busOffline' && event.data?.busId) {
          const offId = event.data.busId;
          setActiveLiveBuses((prev) => {
            const next = { ...prev };
            delete next[offId];
            Object.keys(next).forEach((k) => {
              const b = next[k];
              if (
                isSameBusKey(k, offId) ||
                isSameBusKey(b?.busNumber, offId) ||
                isSameBusKey(b?.id, offId) ||
                isSameBusKey(b?.plateNumber, offId)
              ) {
                delete next[k];
              }
            });
            return next;
          });
        }
      };
    } catch (_) { }

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'nagarst_demo_buses' && e.newValue) {
        try {
          const fleet = JSON.parse(e.newValue);
          if (fleet && typeof fleet === 'object') {
            setActiveLiveBuses((prev) => ({ ...prev, ...fleet }));
          }
        } catch (_) { }
      } else if (e.key === 'nagarst_sim_running_state') {
        restoreSimRunningState();
        setSimState(getDemoSimulatorState());
      } else if (e.key?.startsWith('nagarst_live_bus_')) {
        if (e.newValue) {
          try {
            const b = JSON.parse(e.newValue);
            if (b && b.id) {
              const isDemo = Boolean(b.isDemo || b.id.startsWith('demo-'));
              setActiveLiveBuses((prev) => ({
                ...prev,
                [b.id]: { ...b, isDemo, isLiveDriver: !isDemo }
              }));
            }
          } catch (_) { }
        } else {
          const id = e.key.replace('nagarst_live_bus_', '');
          setActiveLiveBuses((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      }
    };
    const onDriverTelemetry = (e: any) => {
      const incoming = e.detail as Bus;
      if (incoming && incoming.id) {
        pendingBroadcastUpdates[incoming.id] = { ...incoming, isDemo: false, isLiveDriver: true };
        if (!rafBroadcastId) {
          rafBroadcastId = requestAnimationFrame(flushBroadcastUpdates);
        }
      }
    };
    window.addEventListener('nagarst_driver_telemetry', onDriverTelemetry);
    window.addEventListener('storage', onStorage);

    return () => {
      ch?.close();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('nagarst_driver_telemetry', onDriverTelemetry);
    };
  }, [buses]);

  // Direct Firebase Firestore real-time subscription for live driver GPS telemetry
  // Ensures instant live sync across different browsers, mobile devices, and networks
  useEffect(() => {
    const unsub = subscribeFirebaseLiveLocations((locations) => {
      if (!locations || locations.length === 0) return;
      setActiveLiveBuses((prev) => {
        const next = { ...prev };
        locations.forEach((loc) => {
          if (loc.bus_id && !loc.bus_id.startsWith('demo-') && !loc.bus_id.toLowerCase().includes('demo')) {
            const key = loc.bus_id;
            const existing = next[key] || {};
            next[key] = {
              ...existing,
              id: loc.bus_id,
              busNumber: loc.bus_number || existing.busNumber || 'Live Bus',
              plateNumber: loc.bus_number || existing.plateNumber || 'MH-16',
              lat: Number(loc.lat),
              lng: Number(loc.lng),
              speedKmh: loc.speed_kmh ?? existing.speedKmh ?? 0,
              heading: loc.heading ?? existing.heading ?? 0,
              routeId: loc.route_id || existing.routeId || '',
              isDemo: false,
              isLiveDriver: true,
              lastUpdated: loc.updated_at || new Date().toISOString()
            } as Bus;
          }
        });
        return next;
      });
    });

    return () => unsub();
  }, []);

  // Direct Socket.IO connection for live demo & real driver telemetry (ZERO Firestore reads)
  // Uses batched state updates to prevent per-bus re-render storms (critical for smooth animation)
  useEffect(() => {
    const SOCKET_URL = (import.meta as any).env?.VITE_SOCKET_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://nagarst.onrender.com');
    let socket: any = null;

    // Batching: accumulate incoming telemetry updates and flush once per animation frame
    const pendingUpdates: Record<string, Bus> = {};
    const pendingDeletes: string[] = [];
    let flushScheduled = false;

    const scheduleFlush = () => {
      if (flushScheduled) return;
      flushScheduled = true;
      requestAnimationFrame(() => {
        flushScheduled = false;
        const updates = { ...pendingUpdates };
        const deletes = [...pendingDeletes];
        // Clear buffers
        Object.keys(pendingUpdates).forEach(k => delete pendingUpdates[k]);
        pendingDeletes.length = 0;

        const hasUpdates = Object.keys(updates).length > 0;
        const hasDeletes = deletes.length > 0;
        if (!hasUpdates && !hasDeletes) return;

        setActiveLiveBuses((prev) => {
          const next = { ...prev, ...updates };
          deletes.forEach(targetId => {
            delete next[targetId];
            Object.keys(next).forEach(k => {
              const b = next[k];
              if (
                isSameBusKey(k, targetId) ||
                isSameBusKey(b?.id, targetId) ||
                isSameBusKey(b?.busNumber, targetId) ||
                isSameBusKey(b?.plateNumber, targetId)
              ) {
                delete next[k];
              }
            });
          });
          return next;
        });
      });
    };

    try {
      socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        socket.emit('joinDemoRoom');
      });

      const isBusDeleted = (busObj: any) => {
        if (!busObj) return false;
        if ((busObj as any).offline || (busObj as any).isDeleted) return true;
        try {
          const norm = (s?: string) => (s || '').trim().toUpperCase().replace(/[\s-_]/g, '');
          const bId = norm(busObj.id);
          const bNum = norm(busObj.busNumber);
          const bPlate = norm(busObj.plateNumber);

          const deletedRaw = typeof window !== 'undefined' ? localStorage.getItem('nagarst_deleted_demo_buses') : null;
          if (!deletedRaw) return false;
          const deletedList: string[] = JSON.parse(deletedRaw);
          return deletedList.some(d => {
            const cd = norm(d);
            return cd && (cd === bId || cd === bNum || cd === bPlate);
          });
        } catch (_) {
          return false;
        }
      };

      const purgeFromActive = (busObjOrId: any) => {
        const targetId = typeof busObjOrId === 'string' ? busObjOrId : busObjOrId?.id;
        const targetNum = typeof busObjOrId === 'object' ? busObjOrId?.busNumber : undefined;
        const targetPlate = typeof busObjOrId === 'object' ? busObjOrId?.plateNumber : undefined;
        if (targetId) pendingDeletes.push(targetId);
        if (targetNum) pendingDeletes.push(targetNum);
        if (targetPlate) pendingDeletes.push(targetPlate);
        scheduleFlush();
      };

      const matchesFleet = (busObj: any) => {
        if (!busObj || !buses || buses.length === 0) return false;
        return buses.some(b =>
          isSameBusKey(b.id, busObj.id) ||
          isSameBusKey(b.busNumber, busObj.busNumber) ||
          isSameBusKey(b.plateNumber, busObj.plateNumber) ||
          isSameBusKey(b.id, busObj.busNumber) ||
          isSameBusKey(b.busNumber, busObj.id)
        );
      };

      socket.on('initialDemoBuses', (demoFleet: Bus[]) => {
        if (Array.isArray(demoFleet) && demoFleet.length > 0) {
          demoFleet.forEach(b => {
            if (b && b.id && matchesFleet(b) && !isBusDeleted(b)) {
              pendingUpdates[b.id] = { ...b, isDemo: true };
            }
          });
          scheduleFlush();
        }
      });

      socket.on('demoLocationUpdate', (bus: Bus) => {
        if (!bus || !bus.id) return;
        if (!matchesFleet(bus) || isBusDeleted(bus) || (bus as any).offline || (bus as any).isDeleted) {
          purgeFromActive(bus);
          return;
        }
        pendingUpdates[bus.id] = { ...bus, isDemo: true };
        scheduleFlush();
      });

      socket.on('locationUpdate', (bus: Bus) => {
        if (!bus || !bus.id) return;
        if (isBusDeleted(bus) || (bus as any).offline || (bus as any).isDeleted) {
          purgeFromActive(bus);
          return;
        }
        const isDemo = Boolean(bus.isDemo || String(bus.id).startsWith('demo-') || (bus.routeName || '').includes('[DEMO]'));
        if (isDemo) return;
        pendingUpdates[bus.id] = { ...bus, isDemo: false, isLiveDriver: true } as any;
        scheduleFlush();
      });

      socket.on('driverLocation', (bus: Bus) => {
        if (!bus || !bus.id) return;
        pendingUpdates[bus.id] = { ...bus, isDemo: false, isLiveDriver: true } as any;
        scheduleFlush();
      });

      socket.on('busOffline', (busId: string) => {
        purgeFromActive(busId);
      });
    } catch (_) { }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  // Restore simulator state on mount without starting competing timers
  useEffect(() => {
    restoreSimRunningState();
    setSimState(getDemoSimulatorState());
  }, []);

  const busIdsKey = useMemo(() => (buses || []).map(b => b.id).sort().join(','), [buses]);
  const routeIdsKey = useMemo(() => (routes || []).map(r => r.id).sort().join(','), [routes]);

  // Synchronize simulator engine fleet whenever configured buses or routes load from AppContext
  useEffect(() => {
    if (buses && buses.length > 0 && routes && routes.length > 0) {
      syncSimulatorFleetWithAdminConfig(buses, routes);
    }
  }, [busIdsKey, routeIdsKey]);

  // Combined active fleet strictly reflecting configured municipal fleet
  const allFleetBuses = useMemo<Bus[]>(() => {
    const deletedRaw = typeof window !== 'undefined' ? localStorage.getItem('nagarst_deleted_demo_buses') : null;
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];

    const norm = (s?: string) => (s || '').trim().toUpperCase().replace(/[\s-_]/g, '');

    const isDeleted = (b: { id?: string; busNumber?: string; plateNumber?: string }) => {
      const cId = norm(b.id);
      const cB = norm(b.busNumber);
      const cP = norm(b.plateNumber);
      return deletedIds.some((d) => {
        const cD = norm(d);
        return (cId && cD === cId) || (cB && cD === cB) || (cP && cD === cP);
      });
    };

    const matchesBus = (a: { id?: string; busNumber?: string; plateNumber?: string }, b: { id?: string; busNumber?: string; plateNumber?: string }) => {
      if (!a || !b) return false;
      if (isSameBusKey(a.id, b.id)) return true;
      if (isSameBusKey(a.busNumber, b.busNumber)) return true;
      if (isSameBusKey(a.plateNumber, b.plateNumber)) return true;
      if (isSameBusKey(a.id, b.busNumber) || isSameBusKey(a.id, b.plateNumber)) return true;
      if (isSameBusKey(b.id, a.busNumber) || isSameBusKey(b.id, a.plateNumber)) return true;
      return false;
    };

    const byNumber = new Map<string, Bus>();

    // 1. Authoritative registered fleet buses from Database / AppContext ONLY
    if (buses && buses.length > 0) {
      const validConfigured = buses.filter(b => {
        if (!b || isDeleted(b)) return false;
        return true;
      });

      validConfigured.forEach(cb => {
        // Check if there is live telemetry in activeLiveBuses (from Firestore, BroadcastChannel, or driver GPS)
        const live = Object.values(activeLiveBuses).find(lb => matchesBus(cb, lb));
        const isLiveDriver = Boolean((live && (live.isLiveDriver || !live.isDemo)) || cb.isLiveDriver);

        // When a real driver is broadcasting, bypass simulator so real GPS takes full precedence
        const simRuntime = !isLiveDriver ? Object.values(simState?.buses || {}).find(r =>
          matchesBus(cb, { id: r.id, busNumber: r.def.busNumber, plateNumber: r.def.plateNumber })
        ) : null;

        const isSimRunning = Boolean(simRuntime?.isRunning);
        const simTelemetry = isSimRunning ? (simRuntime?.currentBus || buildBusTelemetry(simRuntime!)) : null;
        const activeTelemetry = isLiveDriver ? live : (live || simTelemetry);

        const targetRoute = allRoutes.find(
          r => r.id === (activeTelemetry?.routeId || cb.routeId) ||
            r.routeNumber === (activeTelemetry?.routeNumber || cb.routeNumber) ||
            r.routeNumber === cb.routeId
        );

        const merged: Bus = {
          ...cb,
          ...(activeTelemetry || {}),
          id: cb.id,
          busNumber: cb.busNumber,
          plateNumber: cb.plateNumber,
          routeId: targetRoute?.id || cb.routeId || '',
          routeNumber: targetRoute?.routeNumber || cb.routeNumber || 'Route',
          routeName: targetRoute?.name || `${cb.origin || ''} ➔ ${cb.destination || ''}`,
          origin: targetRoute?.origin || cb.origin || '',
          destination: targetRoute?.destination || cb.destination || '',
          isDemo: isLiveDriver ? false : (isSimRunning ? true : Boolean(activeTelemetry?.isDemo)),
          isLiveDriver: isLiveDriver,
          lat: Number(activeTelemetry?.lat ?? cb.lat),
          lng: Number(activeTelemetry?.lng ?? cb.lng),
          speedKmh: activeTelemetry ? (activeTelemetry.speedKmh ?? 0) : cb.speedKmh,
          heading: activeTelemetry ? (activeTelemetry.heading ?? 0) : cb.heading,
          status: activeTelemetry?.status || cb.status || 'on_time'
        };

        const key = norm(cb.busNumber) || norm(cb.id);
        byNumber.set(key, merged);
      });
    }

    // 2. Also ensure any actively broadcasting live drivers are always included on the live map
    Object.values(activeLiveBuses).forEach(lb => {
      if (!lb || !lb.lat || !lb.lng) return;
      const key = norm(lb.busNumber) || norm(lb.id);
      if (key && !byNumber.has(key)) {
        const targetRoute = allRoutes.find(
          r => r.id === lb.routeId || r.routeNumber === lb.routeNumber
        );
        byNumber.set(key, {
          ...lb,
          routeName: targetRoute?.name || lb.routeName || `${lb.origin || ''} ➔ ${lb.destination || ''}`,
          routeNumber: targetRoute?.routeNumber || lb.routeNumber || 'Route',
          origin: targetRoute?.origin || lb.origin || 'Depot',
          destination: targetRoute?.destination || lb.destination || 'Depot',
          isDemo: false,
          isLiveDriver: true
        });
      }
    });

    return Array.from(byNumber.values());
  }, [activeLiveBuses, buses, allRoutes, simState]);

  const selectedBus = useMemo(() => {
    if (!selectedBusId || allFleetBuses.length === 0) return null;
    const norm = selectedBusId.trim().toUpperCase().replace(/\s+/g, '');
    return allFleetBuses.find((b) =>
      (b.id || '').trim().toUpperCase().replace(/\s+/g, '') === norm ||
      (b.busNumber || '').trim().toUpperCase().replace(/\s+/g, '') === norm
    ) || null;
  }, [selectedBusId, allFleetBuses]);

  // Immediately clear selectedBusId if the bus is not found in active fleet
  useEffect(() => {
    if (selectedBusId && !selectedBus) {
      setSelectedBusId(null);
    }
  }, [selectedBusId, selectedBus, setSelectedBusId]);

  const liveCount = useMemo(() => allFleetBuses.filter(b => b.isLiveDriver || (!b.isDemo && !b.id.startsWith('demo-') && !(b.routeName || '').includes('[DEMO]'))).length, [allFleetBuses]);
  const simCount = useMemo(() => allFleetBuses.filter(b => !b.isLiveDriver && (b.isDemo || b.id.startsWith('demo-') || (b.routeName || '').includes('[DEMO]'))).length, [allFleetBuses]);

  // Filtered buses list based on active tracking mode (Live GPS vs Demo Simulator vs All)
  const filteredBuses = useMemo(() => {
    return allFleetBuses.filter((b) => {
      const isLive = Boolean(b.isLiveDriver || (!b.isDemo && !b.id.startsWith('demo-') && !(b.routeName || '').includes('[DEMO]')));
      const isDemo = !isLive;
      if (trackingMode === 'live' && !isLive) return false;
      if (trackingMode === 'simulator' && isLive) return false;

      const matchesRoute =
        filterRoute === 'all' ||
        b.routeId === filterRoute ||
        b.routeNumber === filterRoute ||
        (Boolean(b.routeId) && b.routeId.toLowerCase() === filterRoute.toLowerCase()) ||
        (Boolean(b.routeNumber) && b.routeNumber.toLowerCase() === filterRoute.toLowerCase()) ||
        (b.id === selectedBusId) ||
        (trackingMode === 'live' && b.isLiveDriver);
      const matchesSearch =
        !searchQuery ||
        b.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.routeName && b.routeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.nextStopName && b.nextStopName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesRoute && matchesSearch;
    });
  }, [allFleetBuses, filterRoute, searchQuery, trackingMode, selectedBusId]);

  const activeLiveDriverBus = useMemo(() => {
    return allFleetBuses.find(b => !b.isDemo && !b.id.startsWith('demo-') && (b.isLiveDriver || b.speedKmh > 0 || (b.lat && b.lng)));
  }, [allFleetBuses]);

  // Resolves complete route stops and details for the selected bus
  const selectedBusRoute = useMemo<RouteType | null>(() => {
    if (!selectedBus) return null;

    // 1. Direct configured route match from allRoutes (highest priority!)
    const matchedRoute = allRoutes.find(
      (r) => r.id === selectedBus.routeId || r.routeNumber === selectedBus.routeNumber || r.routeNumber === selectedBus.routeId
    );
    if (matchedRoute && matchedRoute.stops && matchedRoute.stops.length > 0) {
      const runtime = simState.buses[selectedBus.id] || Object.values(simState.buses).find(
        r => r.def.busNumber.trim().toUpperCase() === selectedBus.busNumber.trim().toUpperCase()
      );
      if (runtime?.def?.waypoints && runtime.def.waypoints.length > 2) {
        return {
          ...matchedRoute,
          route_path: runtime.def.waypoints,
          stops: runtime.def.stops && runtime.def.stops.length > 0
            ? runtime.def.stops.map((s: any, idx: number) => ({
              stopId: s.id,
              stopName: s.name,
              stopNameMarathi: s.name,
              sequence: idx + 1,
              fareFromOrigin: idx * 5,
              estimatedMinutesFromOrigin: idx * 5,
              isMajorHub: idx === 0 || idx === runtime.def.stops.length - 1,
              lat: s.lat,
              lng: s.lng,
            }))
            : matchedRoute.stops
        };
      }
      return matchedRoute;
    }

    return null;
  }, [selectedBus, allRoutes, simState.buses]);

  // Routes to display on map: strictly shows configured routes from City Admin Route Corridors
  const routesToDisplay = useMemo(() => {
    if (!allRoutes || allRoutes.length === 0) return [];
    if (selectedBusRoute) return [selectedBusRoute];

    const activeRouteMap = new Map<string, RouteType>();

    allFleetBuses.forEach((bus) => {
      if (!bus.routeId) return;

      // Check if configured route exists in allRoutes (Route Corridors tab)
      const dbRoute = allRoutes.find(
        (r) => r.id === bus.routeId || r.routeNumber === bus.routeNumber || r.routeNumber === bus.routeId
      );
      if (!dbRoute) return;

      activeRouteMap.set(dbRoute.id, dbRoute);
    });

    const activeList = Array.from(activeRouteMap.values());
    if (filterRoute !== 'all') {
      return activeList.filter((r) => r.id === filterRoute);
    }
    return activeList.length > 0 ? activeList : allRoutes;
  }, [selectedBusRoute, allFleetBuses, allRoutes, filterRoute]);

  // Active commuter coordinate (Live GPS or selected manual location)
  const activeCommuterPos = useMemo(() => {
    return userLocation || { lat: 19.0975, lng: 74.7420 };
  }, [userLocation]);

  // Handle Map Click (for manual location placement on map)
  const handleMapClick = (latlng: { lat: number; lng: number }) => {
    if (isPickingLocationOnMap) {
      setUserLocation(latlng);
      setUserLocationLabel(`Custom Map Pin (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`);
      setIsManualLocation(true);
      setIsPickingLocationOnMap(false);
      setLocationErrorNotice(null);
    }
  };

  // Handle Transit Hub Selection
  const handleSelectHub = (hub: typeof AHILYANAGAR_HUBS[0]) => {
    setUserLocation({ lat: hub.lat, lng: hub.lng });
    setUserLocationLabel(hub.name);
    setIsManualLocation(true);
    setIsLocationModalOpen(false);
    setIsPickingLocationOnMap(false);
    setLocationErrorNotice(null);
  };

  // Handle Configured Bus Stop Selection
  const handleSelectConfiguredStop = (stopId: string) => {
    const s = stops.find((item) => item.id === stopId);
    if (!s) return;
    setUserLocation({ lat: s.lat, lng: s.lng });
    setUserLocationLabel(s.name);
    setIsManualLocation(true);
    setIsLocationModalOpen(false);
    setIsPickingLocationOnMap(false);
    setLocationErrorNotice(null);
  };

  // Handle Switch to Device GPS
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setLocationErrorNotice('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUserLocationLabel('Live GPS Location');
        setIsManualLocation(false);
        setIsLocationModalOpen(false);
        setIsPickingLocationOnMap(false);
        setLocationErrorNotice(null);
      },
      (err) => {
        setLocationErrorNotice(
          err.code === err.PERMISSION_DENIED
            ? 'GPS permission denied. Please pick a station or click on map.'
            : 'Unable to retrieve GPS fix. Using manual station.'
        );
        if (!userLocation) {
          setUserLocation({ lat: 19.0975, lng: 74.7420 });
          setUserLocationLabel('Ahilyanagar CBS (Manual)');
          setIsManualLocation(true);
        }
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Callback when LiveMap detects GPS error/permission denial
  const handleLocationErrorFromMap = (err: string) => {
    setLocationErrorNotice(err);
    if (!userLocation) {
      setUserLocation({ lat: 19.0975, lng: 74.7420 });
      setUserLocationLabel('Ahilyanagar CBS (Default Hub)');
      setIsManualLocation(true);
    }
  };

  // Calculate nearest stop to the commuter's active location
  const nearestStopInfo = useMemo<{ stop: BusStop; distanceMeters: number } | null>(() => {
    if (stops.length === 0) return null;

    let closestStop: BusStop | null = null;
    let minDistance = Infinity;

    for (const stop of stops) {
      const dist = getDistance(activeCommuterPos, { lat: stop.lat, lng: stop.lng });
      if (dist < minDistance) {
        minDistance = dist;
        closestStop = stop;
      }
    }

    if (!closestStop || minDistance > 15000) return null;
    return {
      stop: closestStop,
      distanceMeters: Math.round(minDistance),
    };
  }, [activeCommuterPos, stops]);

  // Nearby Buses calculation: calculates distance to commuter & real-time ETA to commuter's stop
  const nearbyBuses = useMemo(() => {
    return filteredBuses.map((bus) => {
      const directDist = getDistance(activeCommuterPos, { lat: bus.lat, lng: bus.lng });

      let stopDist = directDist;
      let targetStopName = nearestStopInfo?.stop.name || bus.nextStopName || 'Your Corridor Stop';
      let etaToCommuterStopMinutes = bus.etaToNextMinutes || 1;

      if (nearestStopInfo) {
        stopDist = getDistance(
          { lat: bus.lat, lng: bus.lng },
          { lat: nearestStopInfo.stop.lat, lng: nearestStopInfo.stop.lng }
        );
        targetStopName = nearestStopInfo.stop.name;

        const effectiveSpeed = Math.max(16, bus.speedKmh || 25);
        const nominalMins = Math.max(1, Math.round((stopDist / 1000) / (effectiveSpeed / 60)));
        etaToCommuterStopMinutes = nominalMins + (bus.delayMinutes || 0);
      }

      return {
        ...bus,
        directDistanceMeters: Math.round(directDist),
        stopDistanceMeters: Math.round(stopDist),
        targetStopName,
        etaToCommuterStopMinutes,
      };
    }).sort((a, b) => a.stopDistanceMeters - b.stopDistanceMeters);
  }, [filteredBuses, activeCommuterPos, nearestStopInfo]);

  // Determine stop progress index for selected bus
  const currentStopProgressIndex = useMemo(() => {
    if (!selectedBus || !selectedBusRoute?.stops) return -1;
    const nextIdx = selectedBusRoute.stops.findIndex(
      (s) => s.stopName === selectedBus.nextStopName || s.stopId === selectedBus.nextStopId
    );
    return nextIdx !== -1 ? nextIdx : 0;
  }, [selectedBus, selectedBusRoute]);

  // Stop schedule map calculating real distance and ETA at 50 km/h transit speed for every stop
  const stopScheduleMap = useMemo(() => {
    const map = new Map<string, { distanceMeters: number; etaMinutes: number; isPassed: boolean; isNext: boolean }>();
    if (!selectedBus) return map;

    if (selectedBus.stopsSchedule && selectedBus.stopsSchedule.length > 0) {
      selectedBus.stopsSchedule.forEach((item) => {
        if (item.stopId) map.set(item.stopId, item);
        if (item.stopName) map.set(item.stopName, item);
      });
      return map;
    }

    if (selectedBusRoute?.stops && selectedBus.lat && selectedBus.lng) {
      const busPos = { lat: selectedBus.lat, lng: selectedBus.lng };
      const spd = selectedBus.speedKmh || 50;
      const nextIdx = currentStopProgressIndex >= 0 ? currentStopProgressIndex : 0;

      selectedBusRoute.stops.forEach((s, i) => {
        const isPassed = i < nextIdx;
        const isNext = i === nextIdx;
        let dMeters = 0;
        if (isNext && selectedBus.distanceToNextMeters !== undefined) {
          dMeters = selectedBus.distanceToNextMeters;
        } else if (!isPassed) {
          dMeters = Math.round(getDistance(busPos, { lat: s.lat, lng: s.lng }));
        }
        const nominalMin = (dMeters / 1000) / (spd / 60);
        const eta = dMeters < 80 ? 0 : Math.max(1, Math.round(nominalMin)) + (selectedBus.delayMinutes || 0);

        const record = { distanceMeters: dMeters, etaMinutes: eta, isPassed, isNext };
        if (s.stopId) map.set(s.stopId, record);
        if (s.stopName) map.set(s.stopName, record);
      });
    }

    return map;
  }, [selectedBus, selectedBusRoute, currentStopProgressIndex]);

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden flex flex-col md:p-4 md:gap-3 bg-[#f8f9fc]">

      {/* 1. EDGE-TO-EDGE FULL-SCREEN MAP CANVAS */}
      <div className="absolute inset-0 md:relative md:inset-auto md:flex-1 flex gap-3 w-full h-full md:rounded-2xl md:border md:border-slate-200/90 md:shadow-2xs overflow-hidden z-0">

        {/* Leaflet Live Map Canvas */}
        <div className="flex-1 relative w-full h-full min-h-0">
          <LiveMap
            buses={filteredBuses}
            stops={stops}
            routes={routesToDisplay}
            selectedBusId={selectedBusId}
            selectedStopId={selectedStopId}
            onSelectBus={(bus) => setSelectedBusId(bus.id)}
            onSelectStop={(stop) => setSelectedStopId(stop.id)}
            userLocation={userLocation}
            onUserLocationChange={(loc) => {
              if (!isManualLocation && loc) {
                setUserLocation(loc);
                setUserLocationLabel('Live GPS Location');
              }
            }}
            onLocationError={handleLocationErrorFromMap}
            onMapClick={handleMapClick}
            interactiveMode={isPickingLocationOnMap ? 'pick_passenger_location' : 'view'}
            onCancelInteractive={() => setIsPickingLocationOnMap(false)}
            className="w-full h-full rounded-none md:rounded-2xl border-0 md:border md:border-slate-200/90"
          />

          {/* Floating Live Driver GPS Active Banner */}
          {activeLiveDriverBus && (
            <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-auto z-[450] bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl border border-emerald-500/50 flex items-center justify-between sm:justify-start gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded shrink-0">
                      LIVE BUS
                    </span>
                    <span className="text-xs font-black text-slate-900 truncate">
                      {activeLiveDriverBus.busNumber}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {activeLiveDriverBus.speedKmh} km/h • {activeLiveDriverBus.routeName || `${activeLiveDriverBus.origin} ➔ ${activeLiveDriverBus.destination}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedBusId(activeLiveDriverBus.id);
                  setFilterRoute('all');
                }}
                className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors shrink-0"
              >
                Focus Bus
              </button>
            </div>
          )}

          {/* Floating Mobile Nearby Buses Quick Pill */}
          <div className="lg:hidden absolute bottom-5 left-3 z-[400]">
            <button
              type="button"
              onClick={() => setIsNearbyDrawerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl text-xs font-bold text-slate-800 active:scale-95 transition-all"
            >
              <Radio className="w-4 h-4 text-[#7847CB] animate-pulse" />
              <span>Nearby Buses ({nearbyBuses.length})</span>
            </button>
          </div>
        </div>

        {/* Desktop Side Fleet & Nearby List */}
        {showListOnDesktop && (
          <aside className="hidden lg:flex w-84 bg-white border-l border-slate-200/90 flex-col shrink-0 overflow-hidden">

            {/* Tab switch: All Vehicles vs Nearby to You */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex gap-1">
              <button
                type="button"
                onClick={() => setSidebarTab('all')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${sidebarTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                All Fleet ({filteredBuses.length})
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('nearby')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${sidebarTab === 'nearby'
                    ? 'bg-[#7847CB] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Radio className="w-3.5 h-3.5" />
                Nearby to You ({nearbyBuses.length})
              </button>
            </div>

            {/* Content for TAB: Nearby Buses */}
            {sidebarTab === 'nearby' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {nearestStopInfo && (
                  <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-200 text-xs">
                    <span className="text-[10px] font-bold text-[#7847CB] uppercase tracking-wider block">
                      Your Nearest Stop
                    </span>
                    <div className="flex items-center justify-between font-bold text-slate-900 mt-0.5">
                      <span className="truncate">{nearestStopInfo.stop.name}</span>
                      <span className="text-purple-700 font-mono text-[11px] shrink-0 ml-1">
                        {nearestStopInfo.distanceMeters > 1000
                          ? `${(nearestStopInfo.distanceMeters / 1000).toFixed(1)}km`
                          : `${nearestStopInfo.distanceMeters}m`} away
                      </span>
                    </div>
                  </div>
                )}

                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight block px-1">
                  Approaching Buses (Click to view stops)
                </span>

                {nearbyBuses.map((bus) => {
                  const isSelected = bus.id === selectedBusId;
                  const isDemo = Boolean(bus.isDemo || bus.id?.startsWith('demo-'));

                  return (
                    <div
                      key={bus.id}
                      onClick={() => setSelectedBusId(bus.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${isSelected
                          ? 'bg-purple-50/70 border-purple-300 ring-1 ring-purple-400 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-2 py-0.5 text-[11px] font-black rounded-md ${isDemo ? 'bg-amber-500 text-slate-950' : 'bg-[#7847CB] text-white'
                              }`}
                          >
                            {bus.busNumber}
                          </span>
                          {isDemo ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black uppercase">
                              DEMO
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black uppercase flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              LIVE GPS
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {bus.routeName}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>

                      <div className="mt-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Distance to Stop</span>
                          <span className="font-bold text-slate-800">
                            {bus.stopDistanceMeters > 1000
                              ? `${(bus.stopDistanceMeters / 1000).toFixed(1)} km`
                              : `${bus.stopDistanceMeters} m`}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. Arrival</span>
                          <span className="font-black text-purple-700 font-mono">
                            ~{bus.etaToCommuterStopMinutes} min
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Speed: <strong className="text-slate-700">{bus.speedKmh} km/h</strong></span>
                        <span className="font-semibold text-emerald-600 capitalize">{bus.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  );
                })}

                {nearbyBuses.length === 0 && (
                  <div className="text-center py-10 px-4 text-slate-500 text-xs space-y-1">
                    <p className="font-bold text-slate-700">No active buses approaching your stop.</p>
                    <p className="text-[11px] text-slate-400">
                      Start buses in City Admin GPS Simulator or broadcast from Driver Dashboard.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Content for TAB: All Vehicles */}
            {sidebarTab === 'all' && (
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {filteredBuses.map((bus) => {
                  const isSelected = bus.id === selectedBusId;
                  const isDemo = Boolean(bus.isDemo || bus.id?.startsWith('demo-'));

                  return (
                    <div
                      key={bus.id}
                      onClick={() => setSelectedBusId(bus.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${isSelected
                          ? 'bg-purple-50/70 border-purple-300 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-100'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-2 py-0.5 text-[11px] font-black rounded-md ${isDemo ? 'bg-amber-500 text-slate-950' : 'bg-[#7847CB] text-white'
                              }`}
                          >
                            {bus.busNumber}
                          </span>
                          {isDemo ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black uppercase tracking-wider shrink-0">
                              DEMO
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              LIVE GPS
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {bus.routeName}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Next: <strong className="text-slate-700">{bus.nextStopName}</strong></span>
                        <span className="font-semibold text-emerald-600">{bus.speedKmh} km/h</span>
                      </div>
                    </div>
                  );
                })}

                {filteredBuses.length === 0 && (
                  <div className="text-center py-10 px-4 text-slate-500 text-xs space-y-1">
                    <p className="font-bold text-slate-700">{t('No active buses online', 'कोणतीही बस सध्या सुरू नाही')}</p>
                    <p className="text-[11px] text-slate-400">
                      Run demo buses in City Admin GPS Simulator or broadcast from Driver Dashboard.
                    </p>
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* 2. FLOATING TOP CONTROLS TOOLBAR */}
      <div className="absolute top-3 left-3 right-3 md:static z-20 bg-white/95 backdrop-blur-md p-2.5 sm:p-3 md:p-3.5 rounded-2xl border border-slate-200/90 shadow-lg md:shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0 pointer-events-auto md:order-first">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#7847CB] text-white flex items-center justify-center shrink-0 shadow-xs shadow-[#7847CB]/30">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-xs md:text-sm leading-tight">
              {trackingMode === 'simulator'
                ? t('Passenger Fleet Simulator', 'प्रवासी सिम्युलेटर')
                : trackingMode === 'live'
                  ? t('Live Municipal GPS Fleet', 'थेट बस ट्रॅकिंग')
                  : t('Live Bus Telemetry & Tracking', 'सर्व बसेस व सिम्युलेटर')}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${trackingMode === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
              <span className="text-[11px] text-slate-500 font-medium">
                {filteredBuses.length} {t('buses showing', 'बसेस दिसत आहेत')}
              </span>
            </div>
          </div>
        </div>

        {/* Dedicated Mode Switcher Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/90 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => handleSetTrackingMode('all')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${trackingMode === 'all'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <span>All Fleet</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-black">
              {allFleetBuses.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSetTrackingMode('live')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${trackingMode === 'live'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <span className={`w-2 h-2 rounded-full ${trackingMode === 'live' ? 'bg-white' : 'bg-emerald-500'} animate-pulse`} />
            <span>Live GPS</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${trackingMode === 'live' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
              {liveCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSetTrackingMode('simulator')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${trackingMode === 'simulator'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Zap className={`w-3.5 h-3.5 ${trackingMode === 'simulator' ? 'text-slate-950 fill-current' : 'text-amber-500'}`} />
            <span>Simulator</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${trackingMode === 'simulator' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
              {simCount}
            </span>
          </button>
        </div>

        {/* Nearest Stop Pill */}
        {nearestStopInfo && (
          <button
            type="button"
            onClick={() => setSelectedStopId(nearestStopInfo.stop.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-[#7847CB] text-[11px] font-bold border border-purple-200 hover:bg-purple-100 transition-colors shadow-2xs"
            title="Jump to nearest bus stop"
          >
            <MapPin className="w-3.5 h-3.5 text-[#7847CB]" />
            <span className="truncate max-w-[140px] sm:max-w-none">
              {nearestStopInfo.stop.name} ({nearestStopInfo.distanceMeters > 1000 ? `${(nearestStopInfo.distanceMeters / 1000).toFixed(1)}km` : `${nearestStopInfo.distanceMeters}m`})
            </span>
          </button>
        )}

        {/* Commuter Active Location Pill / Selector Button */}
        <button
          type="button"
          onClick={() => setIsLocationModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${isManualLocation
              ? 'bg-amber-50/90 text-amber-900 border-amber-300 hover:bg-amber-100'
              : 'bg-blue-50/90 text-blue-900 border-blue-200 hover:bg-blue-100'
            }`}
          title="Select your current passenger location (GPS or manual station)"
        >
          <Crosshair className="w-3.5 h-3.5 text-[#7847CB]" />
          <span className="truncate max-w-[120px] sm:max-w-[160px]">
            {userLocationLabel}
          </span>
          <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${isManualLocation ? 'bg-amber-200 text-amber-900' : 'bg-blue-200 text-blue-900'
            }`}>
            {isManualLocation ? 'MANUAL' : 'GPS'}
          </span>
        </button>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Search bus/stop...', 'बस किंवा थांबा शोधा...')}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#7847CB] focus:ring-1 focus:ring-[#7847CB]/30 w-32 sm:w-44"
            />
          </div>

          {/* Route Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            <select
              value={filterRoute}
              onChange={(e) => setFilterRoute(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#7847CB]"
            >
              <option value="all">{t('All Routes', 'सर्व मार्ग')}</option>
              {allRoutes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.routeNumber} - {r.origin}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowListOnDesktop(!showListOnDesktop)}
            className="hidden lg:flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <BusIcon className="w-3.5 h-3.5 text-[#7847CB]" />
            <span>{showListOnDesktop ? 'Hide Fleet List' : 'Show Fleet List'}</span>
          </button>
        </div>
      </div>

      {/* Mode Status Informational Banners */}
      {trackingMode === 'live' && liveCount === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs px-3.5 py-2.5 rounded-2xl shadow-xs flex items-center justify-between gap-3 shrink-0 md:order-first animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <Radio className="w-4 h-4 text-emerald-600 shrink-0 animate-pulse" />
            <span>
              <strong>Real-Time Driver GPS Mode:</strong> No municipal bus drivers are transmitting GPS on the road right now. Tap <strong>Simulator</strong> to watch virtual transit buses gliding along their routes.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSetTrackingMode('simulator')}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shrink-0 transition-colors shadow-xs"
          >
            Switch to Simulator
          </button>
        </div>
      )}

      {trackingMode === 'simulator' && (
        <div className="bg-amber-50/90 border border-amber-200 text-amber-950 text-xs px-3.5 py-2 rounded-2xl shadow-xs flex items-center justify-between gap-3 shrink-0 md:order-first animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Passenger Simulator Active:</strong> Virtual fleet cruising smoothly at 50 km/h along Ahilyanagar road corridors with live stop distance and ETAs.
            </span>
          </div>
          <span className="text-[11px] font-mono text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-lg border border-amber-300 font-bold shrink-0">
            {simCount} Demo Buses Running
          </span>
        </div>
      )}

      {/* Dismissible GPS/Location Alert Notice */}
      {locationErrorNotice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3.5 py-2.5 rounded-2xl shadow-xs flex items-center justify-between gap-3 shrink-0 md:order-first animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">{locationErrorNotice}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-[#7847CB] text-white font-bold text-[11px] hover:bg-[#683ab7] transition-colors"
            >
              Choose Station
            </button>
            <button
              type="button"
              onClick={() => setLocationErrorNotice(null)}
              className="p-1 text-amber-700 hover:bg-amber-200/60 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          PASSENGER LOCATION SELECTION MODAL (GPS / Transit Hubs / Configured Stops / Map Pin)
          ========================================================================= */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[85vh] text-slate-900 animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#7847CB] text-white flex items-center justify-center shadow-xs">
                  <Crosshair className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    Set Your Passenger Location
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Track approaching buses & ETAs from where you are
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">

              {/* Option 1: Live Device GPS */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex items-center justify-between">
                <div>
                  <span className="font-black text-blue-900 text-xs flex items-center gap-1.5">
                    <LocateFixed className="w-4 h-4 text-blue-600" />
                    Use Device GPS
                  </span>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Acquires live latitude & longitude from your phone/browser
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUseGps}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
                >
                  Locate Me
                </button>
              </div>

              {/* Option 2: Major Ahilyanagar Transit Hubs */}
              <div className="space-y-2">
                <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#7847CB]" />
                  Major Ahilyanagar Stations & Hubs
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AHILYANAGAR_HUBS.map((hub) => (
                    <button
                      key={hub.id}
                      type="button"
                      onClick={() => handleSelectHub(hub)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${userLocationLabel === hub.name
                          ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-400 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80'
                        }`}
                    >
                      <div className="min-w-0 pr-1">
                        <span className="font-bold text-slate-900 block truncate text-xs">{hub.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Hub ID: {hub.hubCode}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 3: Select from Configured Bus Stops */}
              {stops && stops.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#7847CB]" />
                    Select from Configured Bus Stops ({stops.length})
                  </span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleSelectConfiguredStop(e.target.value);
                    }}
                    defaultValue=""
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#7847CB]"
                  >
                    <option value="" disabled>-- Choose a bus stop --</option>
                    {stops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {(s as any).code ? `(${(s as any).code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Option 4: Pick Point Directly on Map */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Set Pin Directly on Map</span>
                  <span className="text-[11px] text-slate-400">Click anywhere on the map to drop your pin</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsLocationModalOpen(false);
                    setIsPickingLocationOnMap(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors shrink-0 flex items-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Pick on Map
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FULL POPUP MODAL: BUS DETAILS & ALL ROUTE STOPS (Opens on bus icon click)
          ========================================================================= */}
      {selectedBus && (
        <div className="fixed inset-0 z-[650] flex items-center justify-center p-3 sm:p-4 bg-slate-950/45 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] text-slate-900 animate-in zoom-in-95 duration-200">

            {/* Top Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`px-3 py-1.5 rounded-xl font-black text-sm text-white shadow-xs ${selectedBus.isDemo || selectedBus.id?.startsWith('demo-')
                      ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                      : 'bg-[#7847CB] shadow-[#7847CB]/20'
                    }`}
                >
                  {selectedBus.busNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                      Bus {selectedBus.busNumber}
                    </h3>
                    {Boolean(selectedBus.isDemo || selectedBus.id?.startsWith('demo-')) ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                        DEMO SIMULATOR
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                        LIVE GPS
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedBus.plateNumber} • {selectedBus.busType}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBusId(null)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                aria-label="Close bus details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">

              {/* 1. CURRENT EXACT BUS LOCATION & REAL-TIME GPS FIX */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#7847CB]" />
                    Current Bus Location
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-700">GPS Live Telemetry</span>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                      {selectedBus.currentLocationName || selectedBus.currentStopName || 'In Transit on Corridor'}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                      GPS: {selectedBus.lat.toFixed(5)}° N, {selectedBus.lng.toFixed(5)}° E
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Speed</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {selectedBus.speedKmh} km/h
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-[#7847CB]" />
                    Heading: <strong className="text-slate-800">{selectedBus.heading}° {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(selectedBus.heading / 45) % 8]}</strong>
                  </span>
                  <span className="text-slate-400">
                    Updated just now
                  </span>
                </div>
              </div>

              {/* 2. "WHICH BUS IS GOING WHERE" (Route Corridor & Terminals) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 border border-purple-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-[#7847CB] flex items-center gap-1.5">
                    <RouteIcon className="w-4 h-4" />
                    {selectedBus.routeNumber ? `Route ${selectedBus.routeNumber}` : 'Corridor Route'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {selectedBusRoute?.stops.length || 0} Total Route Stops
                  </span>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-white/90 rounded-xl border border-purple-100 text-xs font-bold shadow-2xs">
                  <div className="min-w-0 flex-1 truncate text-purple-950">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">START TERMINAL</span>
                    {selectedBus.origin || selectedBusRoute?.origin || 'Depot'}
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#7847CB] shrink-0" />
                  <div className="min-w-0 flex-1 truncate text-emerald-950">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">GOING TO (DESTINATION)</span>
                    {selectedBus.destination || selectedBusRoute?.destination || 'Terminal'}
                  </div>
                </div>
              </div>

              {/* 3. NEXT STOP & HOW MUCH FAR IT IS */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Approaching Next Stop
                  </span>
                  <span className="font-black text-slate-900 text-sm sm:text-base mt-0.5 block truncate">
                    {selectedBus.nextStopName}
                  </span>
                  <span className="text-[11px] font-bold text-amber-900 mt-0.5 block flex items-center gap-1.5 flex-wrap">
                    <span>Distance remaining: <strong className="font-mono">{selectedBus.distanceToNextMeters !== undefined ? (selectedBus.distanceToNextMeters > 1000 ? `${(selectedBus.distanceToNextMeters / 1000).toFixed(1)} km` : `${selectedBus.distanceToNextMeters} meters`) : 'Calculating...'}</strong></span>
                    <span>•</span>
                    <span>Speed: <strong className="font-mono">{selectedBus.speedKmh || 50} km/h</strong></span>
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">Next ETA</span>
                  <div className="mt-1">
                    <ETAIndicator minutes={selectedBus.etaToNextMinutes} size="lg" />
                  </div>
                </div>
              </div>

              {/* 4. PASSENGER PROXIMITY (Distance & Arrival to Passenger's Stop) */}
              {nearestStopInfo && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block flex items-center gap-1">
                      <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
                      To Your Nearest Stop ({nearestStopInfo.stop.name})
                    </span>
                    <span className="font-extrabold text-emerald-950 text-xs sm:text-sm truncate block mt-0.5">
                      Distance to you: ~{nearestStopInfo.distanceMeters > 1000 ? `${(nearestStopInfo.distanceMeters / 1000).toFixed(1)} km` : `${nearestStopInfo.distanceMeters} m`}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Arrival for you</span>
                    <span className="font-black text-emerald-800 font-mono text-base">
                      ~{selectedBus.etaToNextMinutes || 2} min
                    </span>
                  </div>
                </div>
              )}

              {/* 5. PASSENGER COUNT & OCCUPANCY DETAILS */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#7847CB]" />
                    Live Passenger Load & Seats
                  </span>
                  <OccupancyBadge level={selectedBus.occupancy} compact />
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      {selectedBus.passengerCount || 25}
                    </span>
                    <span className="text-xs text-slate-400 font-medium ml-1">
                      / {selectedBus.maxCapacity || 42} Passengers Onboard
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {selectedBus.availableSeats || 17} Seats Free
                  </span>
                </div>

                {/* Animated Capacity Bar */}
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${(selectedBus.passengerCount || 25) > 34
                        ? 'bg-rose-500'
                        : (selectedBus.passengerCount || 25) > 20
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    style={{
                      width: `${Math.min(100, Math.round(((selectedBus.passengerCount || 25) / (selectedBus.maxCapacity || 42)) * 100))}%`
                    }}
                  />
                </div>
              </div>

              {/* 6. REAL-TIME VEHICLE SPECS & AMENITIES GRID */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" /> Battery
                  </span>
                  <span className="font-extrabold text-slate-900 font-mono text-sm mt-0.5 block">
                    {selectedBus.batteryLevel || 84}% EV
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold flex items-center justify-center gap-1">
                    <Thermometer className="w-3 h-3 text-blue-500" /> Climate
                  </span>
                  <span className="font-extrabold text-slate-900 font-mono text-sm mt-0.5 block">
                    {selectedBus.temperature || '23°C'} AC
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" /> Schedule
                  </span>
                  <div className="mt-0.5">
                    <BusStatusBadge status={selectedBus.status} delayMinutes={selectedBus.delayMinutes} />
                  </div>
                </div>
              </div>

              {/* 7. ALL STOPS IN THIS ROUTE (Sequential Corridor Timeline) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#7847CB]" />
                    All Scheduled Stops in this Route ({selectedBusRoute?.stops.length || 0})
                  </h4>
                  <span className="text-[11px] text-slate-400">Sequential Order</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 max-h-56 overflow-y-auto space-y-2 text-xs">
                  {selectedBusRoute?.stops && selectedBusRoute.stops.length > 0 ? (
                    selectedBusRoute.stops.map((stop, idx) => {
                      const sched = stopScheduleMap.get(stop.stopId) || stopScheduleMap.get(stop.stopName);
                      const isPassed = sched ? sched.isPassed : idx < currentStopProgressIndex;
                      const isNext = sched ? sched.isNext : (stop.stopName === selectedBus.nextStopName);
                      const isUserStop = nearestStopInfo?.stop.name === stop.stopName;
                      const distM = sched?.distanceMeters ?? (isNext ? selectedBus.distanceToNextMeters : 0);
                      const etaM = sched?.etaMinutes ?? (isNext ? selectedBus.etaToNextMinutes : 0);
                      const distFormatted = distM !== undefined && distM > 0
                        ? (distM > 1000 ? `${(distM / 1000).toFixed(1)} km` : `${distM}m`)
                        : '';
                      const isArriving = isNext && distM !== undefined && distM < 80;

                      return (
                        <div
                          key={stop.stopId || idx}
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${isNext
                              ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-2xs'
                              : isUserStop
                                ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold shadow-2xs'
                                : isPassed
                                  ? 'bg-white/60 border-slate-100 text-slate-400'
                                  : 'bg-white border-slate-200/70 text-slate-800'
                            }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isPassed ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </div>
                            ) : isNext ? (
                              <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-mono text-[10px] font-black flex items-center justify-center shrink-0 shadow-xs">
                                {idx + 1}
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </div>
                            )}

                            <div className="min-w-0">
                              <span className="truncate block font-semibold">{stop.stopName}</span>
                              {stop.stopNameMarathi && stop.stopNameMarathi !== stop.stopName && (
                                <span className="text-[10px] text-slate-400 block truncate">{stop.stopNameMarathi}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {isUserStop && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                                YOUR STOP
                              </span>
                            )}

                            {isArriving ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500 text-white shadow-2xs animate-pulse">
                                ARRIVING NOW
                              </span>
                            ) : isNext ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 shadow-2xs flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3" /> NEXT {distFormatted ? `(${distFormatted} • ~${etaM || 1}m)` : `(~${etaM || 1}m)`}
                              </span>
                            ) : isPassed ? (
                              <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Passed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono flex items-center gap-1">
                                {distFormatted ? `${distFormatted} • ~${etaM}m` : `~${etaM}m`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-xs">
                      Corridor stops list unavailable.
                    </div>
                  )}
                </div>
              </div>

              {/* 8. CREW & FARE DETAILS */}
              <div className="p-3 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="font-semibold text-slate-800">Operator: {selectedBus.driverName}</span>
                    <span className="text-slate-400 block text-[10px]">Conductor: {selectedBus.conductorName}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Ticket Fare</span>
                  <span className="px-2 py-0.5 bg-purple-50 text-[#7847CB] text-[11px] font-bold rounded-lg border border-purple-100 inline-block">
                    ₹10 Base Fare
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2 shrink-0">
              <Button
                onClick={() => {
                  // Pre-fill from selected bus route
                  const busOrigin = selectedBus?.origin || selectedBusRoute?.origin || '';
                  const busDest = selectedBus?.destination || selectedBusRoute?.destination || '';
                  const busBusType = (selectedBus?.busType as any) || 'EV Metro Shuttle';
                  setTktSource(busOrigin);
                  setTktDestination(busDest);
                  setTktBusType(['AC Express', 'EV Metro Shuttle', 'Standard City', 'Mini Bus'].includes(busBusType) ? busBusType : 'EV Metro Shuttle');
                  setTktPassengerCount(1);
                  setTktPaymentMethod('upi');
                  setTicketStep('form');
                  setTktIssuedTicket(null);
                  setShowTicketDashboard(true);
                }}
                variant="primary"
                size="md"
                className="flex-1 shadow-xs"
                leftIcon={<Ticket className="w-4 h-4" />}
              >
                Book Digital QR Ticket
              </Button>
              <Button
                onClick={() => setSelectedBusId(null)}
                variant="outline"
                size="md"
                className="px-4"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DIGITAL QR TICKET DASHBOARD MODAL
          ========================================================================= */}
      {showTicketDashboard && selectedBus && (() => {
        const busOrigin = selectedBus?.origin || selectedBusRoute?.origin || 'Central Bus Stand (CBS)';
        const busDest = selectedBus?.destination || selectedBusRoute?.destination || 'Savedi Bus Terminal';
        const busType = tktBusType;
        const baseRate = busType === 'AC Express' ? 20 : busType === 'EV Metro Shuttle' ? 15 : 10;
        const baseFare = baseRate * tktPassengerCount;
        const govTax = Math.round(baseFare * 0.1);
        const totalFare = baseFare + govTax;

        const handleTicketPurchase = () => {
          setTktIsProcessing(true);
          setTimeout(() => {
            const ticket = addTicket({
              sourceStop: tktSource || busOrigin,
              destinationStop: tktDestination || busDest,
              passengerCount: tktPassengerCount,
              fare: totalFare,
              fareBreakup: { baseFare, govTax, discount: 0, total: totalFare },
              busType: tktBusType,
            });
            setTktIssuedTicket(ticket);
            setTktIsProcessing(false);
            setTicketStep('success');
          }, 1200);
        };

        const routeStops = selectedBusRoute?.stops?.map((s: any) => s.stopName || s.name || s) || [];
        const stopOptions = routeStops.length > 0
          ? routeStops
          : [busOrigin, busDest];

        return (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">

              {/* Header */}
              <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#7847CB] text-white flex items-center justify-center shadow-sm shadow-[#7847CB]/30 shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-extrabold text-slate-900 text-sm leading-tight">Book Digital QR Ticket</h2>
                    <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                      Bus {selectedBus.busNumber} · {selectedBus.busType}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTicketDashboard(false)}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="shrink-0 px-5 py-3 border-b border-slate-100 flex items-center gap-1.5">
                {(['form', 'payment', 'success'] as const).map((step, idx) => {
                  const isComplete = (ticketStep === 'payment' && idx === 0) || (ticketStep === 'success' && idx < 2);
                  const isActive = ticketStep === step;
                  const isConnectorDone = (idx === 0 && (ticketStep === 'payment' || ticketStep === 'success')) || (idx === 1 && ticketStep === 'success');
                  return (
                    <React.Fragment key={step}>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${isComplete ? 'bg-emerald-500 text-white' : isActive ? 'bg-[#7847CB] text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                          {isComplete ? '✓' : idx + 1}
                        </div>
                        <span className={`text-[10px] font-semibold hidden sm:block ${isActive ? 'text-[#7847CB]' : isComplete ? 'text-emerald-600' : 'text-slate-400'
                          }`}>
                          {step === 'form' ? 'Journey' : step === 'payment' ? 'Payment' : 'Ticket'}
                        </span>
                      </div>
                      {idx < 2 && <div className={`flex-1 h-px ${isConnectorDone ? 'bg-emerald-300' : 'bg-slate-200'
                        }`} />}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1">

                {/* STEP 1: Journey Details Form */}
                {ticketStep === 'form' && (
                  <div className="p-5 space-y-5">

                    {/* Route Preview Banner */}
                    <div className="p-3 rounded-2xl bg-[#f4effc] border border-[#d8c5f5] flex items-center gap-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#7847CB] block">Route</span>
                        <span className="font-extrabold text-slate-900 truncate block">{selectedBus.routeNumber ? `Route ${selectedBus.routeNumber}` : 'City Corridor'}</span>
                      </div>
                      <div className="w-5 h-5 rounded-full bg-[#7847CB] flex items-center justify-center shrink-0">
                        <ArrowRight className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#7847CB] block">Towards</span>
                        <span className="font-extrabold text-slate-900 truncate block">{busDest}</span>
                      </div>
                    </div>

                    {/* Boarding Stop */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Boarding Stop</label>
                      <select
                        value={tktSource}
                        onChange={(e) => setTktSource(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20 transition-all"
                      >
                        <option value="">— Select boarding stop —</option>
                        {stopOptions.map((s: string, i: number) => (
                          <option key={i} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* Destination Stop */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Destination Stop</label>
                      <select
                        value={tktDestination}
                        onChange={(e) => setTktDestination(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20 transition-all"
                      >
                        <option value="">— Select destination —</option>
                        {stopOptions.map((s: string, i: number) => (
                          <option key={i} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* Passengers */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Passengers</label>
                      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setTktPassengerCount(Math.max(1, tktPassengerCount - 1))}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors shadow-2xs"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <div className="text-center">
                          <span className="text-2xl font-black text-slate-900 tabular-nums">{tktPassengerCount}</span>
                          <span className="text-[10px] text-slate-400 font-medium block">{tktPassengerCount === 1 ? 'Passenger' : 'Passengers'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTktPassengerCount(Math.min(6, tktPassengerCount + 1))}
                          className="w-8 h-8 rounded-lg bg-[#7847CB] flex items-center justify-center text-white hover:bg-[#6336b3] transition-colors shadow-xs shadow-[#7847CB]/20"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bus Category */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">Bus Category</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { val: 'EV Metro Shuttle', label: 'EV Metro Shuttle', price: '₹15/head' },
                          { val: 'AC Express', label: 'AC Express', price: '₹20/head' },
                          { val: 'Standard City', label: 'Standard City', price: '₹10/head' },
                          { val: 'Mini Bus', label: 'Mini Bus', price: '₹10/head' },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setTktBusType(opt.val as any)}
                            className={`px-3 py-2.5 rounded-xl border text-left transition-all ${tktBusType === opt.val
                                ? 'bg-[#f4effc] border-[#7847CB] shadow-xs shadow-[#7847CB]/10'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                              }`}
                          >
                            <span className={`text-xs font-bold block ${tktBusType === opt.val ? 'text-[#7847CB]' : 'text-slate-700'
                              }`}>{opt.label}</span>
                            <span className={`text-[10px] font-semibold ${tktBusType === opt.val ? 'text-purple-500' : 'text-slate-400'
                              }`}>{opt.price}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fare Summary */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Fare Breakdown</span>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-100">Govt. Approved</span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Base Fare ({tktPassengerCount}×₹{baseRate})</span>
                          <span className="font-semibold text-slate-800">₹{baseFare}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Municipal Cess (10%)</span>
                          <span className="font-semibold text-slate-800">₹{govTax}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-100">
                          <span className="font-extrabold text-slate-900">Total Payable</span>
                          <span className="font-black text-[#7847CB] text-sm tabular-nums">₹{totalFare}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTicketStep('payment')}
                      disabled={!tktSource || !tktDestination || tktSource === tktDestination}
                      className="w-full h-10 bg-[#7847CB] hover:bg-[#6336b3] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-[#7847CB]/20 flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Continue to Payment
                    </button>
                    {(!tktSource || !tktDestination || tktSource === tktDestination) && (
                      <p className="text-center text-[11px] text-slate-400">Select different boarding and destination stops</p>
                    )}
                  </div>
                )}

                {/* STEP 2: Payment */}
                {ticketStep === 'payment' && (
                  <div className="p-5 space-y-5">

                    {/* Journey Summary */}
                    <div className="p-3.5 rounded-2xl bg-[#f4effc] border border-[#d8c5f5]">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#7847CB] mb-2">Journey Summary</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">From</span>
                          <span className="font-extrabold text-slate-900 text-xs block truncate">{tktSource}</span>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[#7847CB]/10 flex items-center justify-center shrink-0">
                          <ArrowRight className="w-3.5 h-3.5 text-[#7847CB]" />
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">To</span>
                          <span className="font-extrabold text-slate-900 text-xs block truncate">{tktDestination}</span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-[#d8c5f5] flex items-center justify-between text-xs">
                        <span className="text-slate-500">{tktPassengerCount} pax · {tktBusType}</span>
                        <span className="font-black text-[#7847CB] text-sm">₹{totalFare}</span>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-2">Payment Method</label>
                      <div className="space-y-2">
                        {[
                          { id: 'upi', label: 'UPI / QR Pay', sublabel: 'PhonePe, GPay, Paytm', icon: Smartphone },
                          { id: 'card', label: 'Debit / Credit Card', sublabel: 'Visa, Mastercard, RuPay', icon: CreditCard },
                          { id: 'counter', label: 'Pay Conductor (Cash)', sublabel: 'Pay on board to conductor', icon: ShieldCheck },
                        ].map((m) => {
                          const Icon = m.icon;
                          const isSelected = tktPaymentMethod === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setTktPaymentMethod(m.id as any)}
                              className={`w-full p-3 rounded-xl border flex items-center gap-3 text-left transition-all ${isSelected
                                  ? 'bg-[#f4effc] border-[#7847CB] shadow-xs shadow-[#7847CB]/10'
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${isSelected ? 'bg-[#7847CB] border-[#7847CB]' : 'bg-white border-slate-200'
                                }`}>
                                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={`text-xs font-bold block ${isSelected ? 'text-[#7847CB]' : 'text-slate-700'
                                  }`}>{m.label}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{m.sublabel}</span>
                              </div>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-[#7847CB] bg-[#7847CB]' : 'border-slate-300'
                                }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pay Button */}
                    <button
                      type="button"
                      onClick={handleTicketPurchase}
                      disabled={tktIsProcessing}
                      className="w-full h-11 bg-[#7847CB] hover:bg-[#6336b3] disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-[#7847CB]/20 flex items-center justify-center gap-2"
                    >
                      {tktIsProcessing ? (
                        <>
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4" />
                          Pay ₹{totalFare} & Generate QR Ticket
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTicketStep('form')}
                      className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      ← Back to Journey Details
                    </button>
                  </div>
                )}

                {/* STEP 3: Success + QR */}
                {ticketStep === 'success' && tktIssuedTicket && (
                  <div className="p-5 space-y-4">

                    {/* Success Banner */}
                    <div className="text-center pt-2 pb-1">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 border-4 border-emerald-100 mb-3">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-lg">Ticket Booked! 🎉</h3>
                      <p className="text-xs text-slate-500 mt-1">Your digital QR ticket is ready. Show to the conductor.</p>
                    </div>

                    {/* Ticket Card */}
                    <div className="rounded-2xl border-2 border-[#7847CB]/30 overflow-hidden shadow-lg">
                      {/* Dark header */}
                      <div className="bg-slate-900 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-white/10">
                            <Ticket className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <span className="font-mono text-xs font-black tracking-wider text-slate-200 block">{tktIssuedTicket.ticketCode}</span>
                            <span className="text-[10px] text-slate-400">{tktIssuedTicket.busType}</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 text-xs font-black rounded-full uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ACTIVE</span>
                      </div>

                      {/* Perforated divider */}
                      <div className="relative h-4 bg-white flex items-center justify-between">
                        <div className="w-4 h-4 rounded-full bg-slate-100 border-r border-slate-200 -ml-2" />
                        <div className="w-full border-t-2 border-dashed border-slate-200 mx-1" />
                        <div className="w-4 h-4 rounded-full bg-slate-100 border-l border-slate-200 -mr-2" />
                      </div>

                      {/* QR Code */}
                      <div className="bg-white p-4 flex flex-col items-center">
                        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                          <svg className="w-40 h-40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="5" y="5" width="26" height="26" rx="3" fill="#7847CB" />
                            <rect x="9" y="9" width="18" height="18" fill="white" />
                            <rect x="13" y="13" width="10" height="10" fill="#7847CB" />
                            <rect x="69" y="5" width="26" height="26" rx="3" fill="#7847CB" />
                            <rect x="73" y="9" width="18" height="18" fill="white" />
                            <rect x="77" y="13" width="10" height="10" fill="#7847CB" />
                            <rect x="5" y="69" width="26" height="26" rx="3" fill="#7847CB" />
                            <rect x="9" y="73" width="18" height="18" fill="white" />
                            <rect x="13" y="77" width="10" height="10" fill="#7847CB" />
                            <rect x="36" y="8" width="6" height="6" fill="#7847CB" />
                            <rect x="46" y="8" width="16" height="6" fill="#7847CB" />
                            <rect x="36" y="18" width="12" height="6" fill="#7847CB" />
                            <rect x="52" y="18" width="10" height="6" fill="#7847CB" />
                            <rect x="36" y="28" width="6" height="6" fill="#7847CB" />
                            <rect x="46" y="28" width="16" height="6" fill="#7847CB" />
                            <rect x="8" y="36" width="6" height="12" fill="#7847CB" />
                            <rect x="18" y="36" width="12" height="6" fill="#7847CB" />
                            <rect x="36" y="38" width="26" height="26" rx="4" fill="#7847CB" />
                            <path d="M49 46 L53 50 L61 42" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <rect x="68" y="36" width="12" height="6" fill="#7847CB" />
                            <rect x="84" y="36" width="8" height="12" fill="#7847CB" />
                            <rect x="36" y="68" width="14" height="6" fill="#7847CB" />
                            <rect x="54" y="68" width="14" height="6" fill="#7847CB" />
                            <rect x="72" y="68" width="20" height="6" fill="#7847CB" />
                            <rect x="36" y="78" width="8" height="14" fill="#7847CB" />
                            <rect x="48" y="78" width="18" height="6" fill="#7847CB" />
                            <rect x="70" y="78" width="22" height="14" fill="#7847CB" />
                          </svg>
                        </div>
                        <div className="mt-2 font-mono font-black text-xs text-slate-700 tracking-wider">{tktIssuedTicket.ticketCode}</div>
                      </div>

                      {/* Journey info */}
                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">From</span>
                          <span className="font-extrabold text-slate-900 truncate block">{tktIssuedTicket.sourceStop}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#7847CB] shrink-0" />
                        <div className="flex-1 min-w-0 text-right">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">To</span>
                          <span className="font-extrabold text-slate-900 truncate block">{tktIssuedTicket.destinationStop}</span>
                        </div>
                      </div>

                      {/* Fare & validity */}
                      <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-black text-slate-900 text-base">₹{tktIssuedTicket.fare}</span>
                          <span className="text-slate-400 ml-1">({tktIssuedTicket.passengerCount} pax)</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Valid Until</span>
                          <span className="font-bold text-slate-700">{tktIssuedTicket.validUntil}</span>
                        </div>
                      </div>
                    </div>

                    {/* Trust badge */}
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Digitally verified by NagarST Authority</span>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTicketDashboard(false);
                          setTicketStep('form');
                        }}
                        className="h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 bg-white transition-colors shadow-2xs"
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTicketStep('form');
                          setTktIssuedTicket(null);
                          setTktPassengerCount(1);
                        }}
                        className="h-10 rounded-xl bg-[#7847CB] hover:bg-[#6336b3] text-xs font-semibold text-white transition-colors shadow-sm shadow-[#7847CB]/20 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Buy Another
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Mobile Drawer for Nearby Buses list */}
      {isNearbyDrawerOpen && (
        <div className="fixed inset-0 z-[600] flex items-end justify-center bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150 lg:hidden">
          <div className="w-full bg-white rounded-t-3xl max-h-[80vh] flex flex-col p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Nearby Buses to You</h3>
                <p className="text-xs text-slate-500">
                  {nearestStopInfo ? `Nearest: ${nearestStopInfo.stop.name}` : 'Real-time proximity'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNearbyDrawerOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1">
              {nearbyBuses.map((bus) => (
                <div
                  key={bus.id}
                  onClick={() => {
                    setSelectedBusId(bus.id);
                    setIsNearbyDrawerOpen(false);
                  }}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2 active:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-black rounded-md ${bus.isDemo || bus.id?.startsWith('demo-') ? 'bg-amber-500 text-slate-950' : 'bg-[#7847CB] text-white'
                        }`}>
                        {bus.busNumber}
                      </span>
                      {Boolean(bus.isDemo || bus.id?.startsWith('demo-')) ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black uppercase">
                          DEMO
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          LIVE GPS
                        </span>
                      )}
                      <span className="font-bold text-xs text-slate-900">{bus.routeName}</span>
                    </div>
                    <span className="font-mono font-black text-purple-700 text-xs">
                      ~{bus.etaToCommuterStopMinutes} min
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Distance: <strong className="text-slate-800">{bus.stopDistanceMeters > 1000 ? `${(bus.stopDistanceMeters / 1000).toFixed(1)} km` : `${bus.stopDistanceMeters} m`}</strong></span>
                    <span className="text-emerald-600 font-bold">{bus.speedKmh} km/h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

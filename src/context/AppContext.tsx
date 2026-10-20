import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Bus, Route, BusStop, Ticket, BusPass, NotificationItem, FavoriteItem } from '../types';
import {
  getFirebaseRoutes,
  saveFirebaseRoute,
  getFirebaseBuses,
  saveFirebaseBus,
  subscribeFirebaseLiveLocations
} from '../utils/firebaseService';
import { syncSimulatorFleetWithAdminConfig } from '../utils/demoSimulatorEngine';

interface AppContextType {
  buses: Bus[];
  setBuses: React.Dispatch<React.SetStateAction<Bus[]>>;
  routes: Route[];
  stops: BusStop[];
  tickets: Ticket[];
  passes: BusPass[];
  notifications: NotificationItem[];
  favorites: FavoriteItem[];
  selectedBusId: string | null;
  setSelectedBusId: (id: string | null) => void;
  selectedStopId: string | null;
  setSelectedStopId: (id: string | null) => void;
  selectedRouteId: string | null;
  setSelectedRouteId: (id: string | null) => void;
  addTicket: (newTicket: Omit<Ticket, 'id' | 'ticketCode' | 'purchaseTime' | 'validUntil' | 'status' | 'qrData'>) => Ticket;
  addPass: (newPass: Omit<BusPass, 'id' | 'passCode' | 'validFrom' | 'status' | 'qrData' | 'daysRemaining'>) => BusPass;
  toggleFavorite: (item: Omit<FavoriteItem, 'id'>) => void;
  isFavorite: (targetId: string) => boolean;
  markNotificationRead: (id: string) => void;
  userLocation: { lat: number; lng: number; name: string };
  refreshData: () => Promise<void>;
  clearAllAppData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<BusStop[]>([]);

  // Persist tickets, passes, favorites in localStorage
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try {
      const saved = localStorage.getItem('nagarst_tickets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [passes, setPasses] = useState<BusPass[]>(() => {
    try {
      const saved = localStorage.getItem('nagarst_passes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const saved = localStorage.getItem('nagarst_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('nagarst_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const userLocation = {
    lat: 19.0975,
    lng: 74.7420,
    name: 'Central Bus Stand',
  };

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem('nagarst_tickets', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem('nagarst_passes', JSON.stringify(passes));
  }, [passes]);

  useEffect(() => {
    localStorage.setItem('nagarst_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('nagarst_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addTicket = (data: Omit<Ticket, 'id' | 'ticketCode' | 'purchaseTime' | 'validUntil' | 'status' | 'qrData'>): Ticket => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const newTicket: Ticket = {
      ...data,
      id: `tkt-${Date.now()}-${randomId}`,
      ticketCode: `NST-2026-${randomId}`,
      purchaseTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      validUntil: 'Today, 11:59 PM',
      status: 'active',
      qrData: `NAGARST-BUS-TICKET-${randomId}-ACTIVE`,
    };
    setTickets((prev) => [newTicket, ...prev]);
    return newTicket;
  };

  const addPass = (data: Omit<BusPass, 'id' | 'passCode' | 'validFrom' | 'status' | 'qrData' | 'daysRemaining'>): BusPass => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    let daysRemaining = 30;
    if (data.passType === 'daily') daysRemaining = 1;
    if (data.passType === 'weekly') daysRemaining = 7;

    const newPass: BusPass = {
      ...data,
      id: `pass-${Date.now()}-${randomId}`,
      passCode: `NST-PASS-${randomId}`,
      validFrom: new Date().toLocaleDateString(undefined, { dateStyle: 'medium' }),
      status: 'active',
      daysRemaining,
      qrData: `NAGARST-BUS-PASS-${randomId}-ACTIVE`,
    };

    setPasses((prev) => [newPass, ...prev]);
    return newPass;
  };

  const toggleFavorite = (item: Omit<FavoriteItem, 'id'>) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.targetId === item.targetId);
      if (exists) {
        return prev.filter((f) => f.targetId !== item.targetId);
      } else {
        return [...prev, { ...item, id: `fav-${Date.now()}` }];
      }
    });
  };

  const isFavorite = (targetId: string) => {
    return favorites.some((f) => f.targetId === targetId);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAllAppData = () => {
    setTickets([]);
    setPasses([]);
    setFavorites([]);
    setNotifications([]);
    setBuses([]);
    setRoutes([]);
    setStops([]);
    setSelectedBusId(null);
    setSelectedStopId(null);
    setSelectedRouteId(null);
    try {
      localStorage.removeItem('nagarst_tickets');
      localStorage.removeItem('nagarst_passes');
      localStorage.removeItem('nagarst_favorites');
      localStorage.removeItem('nagarst_notifications');
      localStorage.removeItem('nagarst_incidents');
      localStorage.removeItem('nagarst_conductor_shift');
      localStorage.removeItem('nagarst_configured_routes');
      localStorage.removeItem('nagarst_custom_buses');
      localStorage.removeItem('nagarst_demo_buses');
      localStorage.removeItem('nagarst_demo_assignments');
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('nagarst_live_bus_') || k.startsWith('nagarst_demo_'))) {
          localStorage.removeItem(k);
        }
      }
    } catch (e) {
      console.warn('Failed clearing localStorage:', e);
    }
  };

  // --- PURE FIREBASE FIRESTORE REAL-TIME & DATABASE FETCH ---
  const refreshData = async () => {
    try {
      // Clean up legacy localStorage cache on initial load if routes were deleted
      try {
        localStorage.removeItem('nagarst_configured_routes');
        localStorage.removeItem('nagarst_custom_buses');
      } catch (_) {}

      // 1. Fetch routes strictly from Firebase Firestore
      let combinedRoutes: any[] = [];
      try {
        const fbRoutes = await getFirebaseRoutes();
        if (fbRoutes && fbRoutes.length > 0) {
          combinedRoutes = fbRoutes.map(r => ({
            id: r.id,
            routeNumber: r.route_number || r.routeNumber,
            origin: r.origin,
            destination: r.destination,
            name: r.name || `${r.origin} ↔ ${r.destination}`,
            nameMarathi: r.name || `${r.origin} ↔ ${r.destination}`,
            firstBus: '06:00 AM',
            lastBus: '10:00 PM',
            frequencyMinutes: 15,
            baseFare: 10,
            maxFare: 30,
            totalStops: r.stops?.length || 0,
            durationMinutes: 30,
            color: r.color || '#7847CB',
            activeBusesCount: 1,
            status: 'normal',
            route_path: r.route_path,
            stops: (r.stops || []).map((s: any, idx: number) => ({
              stopId: s.stopId || `stop-${idx}`,
              stopName: s.stopName,
              stopNameMarathi: s.stopName,
              lat: s.lat,
              lng: s.lng,
              sequence: s.sequence || idx + 1,
              fareFromOrigin: (idx + 1) * 5,
              estimatedMinutesFromOrigin: s.estimatedMinutesFromOrigin || idx * 4,
              isMajorHub: idx === 0
            }))
          }));
        }
      } catch (err) {
        console.warn('Firebase routes fetch error:', err);
      }

      setRoutes(combinedRoutes as unknown as Route[]);

      // Extract real stops from active routes
      const uniqueStopsMap = new Map<string, BusStop>();
      combinedRoutes.forEach(r => {
        (r.stops || []).forEach((s: any) => {
          const key = (s.stopName || '').trim().toLowerCase();
          if (key && !uniqueStopsMap.has(key)) {
            uniqueStopsMap.set(key, {
              id: s.stopId || `stop-${s.sequence}`,
              name: s.stopName,
              nameMarathi: s.stopName,
              area: 'City Center',
              lat: s.lat,
              lng: s.lng,
              lines: [r.routeNumber],
              facilities: ['Shelter', 'Bus Bay'],
              accessibility: true,
              shelter: true,
              digitalBoard: true,
              liveArrivals: []
            });
          }
        });
      });
      setStops(Array.from(uniqueStopsMap.values()));

      // 2. Fetch all buses strictly from Firebase Firestore
      let dbBuses: any[] = [];
      try {
        const fbBuses = await getFirebaseBuses();
        if (fbBuses && fbBuses.length > 0) {
          dbBuses = fbBuses;
        }
      } catch (err) {
        console.warn('Firebase buses fetch error:', err);
      }

      // Purge any stale localStorage bus keys that don't match active Firestore buses
      try {
        const validIds = new Set(dbBuses.map((b: any) => (b.id || '').trim().toUpperCase().replace(/\s+/g, '')));
        const validNumbers = new Set(dbBuses.map((b: any) => (b.bus_number || b.busNumber || '').trim().toUpperCase().replace(/\s+/g, '')));
        const validPlates = new Set(dbBuses.map((b: any) => (b.plate_number || b.plateNumber || '').trim().toUpperCase().replace(/\s+/g, '')));

        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (k.startsWith('nagarst_live_bus_')) {
            const raw = localStorage.getItem(k);
            let keep = false;
            if (raw && dbBuses.length > 0) {
              try {
                const parsed = JSON.parse(raw);
                const idNorm = (parsed.id || '').trim().toUpperCase().replace(/\s+/g, '');
                const numNorm = (parsed.busNumber || '').trim().toUpperCase().replace(/\s+/g, '');
                const plateNorm = (parsed.plateNumber || '').trim().toUpperCase().replace(/\s+/g, '');
                if (validIds.has(idNorm) || validNumbers.has(numNorm) || validPlates.has(plateNorm)) {
                  keep = true;
                }
              } catch (_) {}
            }
            if (!keep) {
              localStorage.removeItem(k);
            }
          }
        }

        if (dbBuses.length === 0) {
          localStorage.removeItem('nagarst_demo_buses');
          localStorage.removeItem('nagarst_custom_buses');
          localStorage.removeItem('nagarst_active_live_drivers');
          localStorage.removeItem('nagarst_demo_assignments');
        }
      } catch (_) {}

      if (dbBuses.length > 0) {
        const mappedBuses = dbBuses.map((b: any) => {
          const targetRouteId = b.route_id || b.routeId || '';
          const matchedRoute = combinedRoutes.find((r) => r.id === targetRouteId);
          const routeNum = matchedRoute?.routeNumber || '';
          const routeTitle = matchedRoute?.name || 'Unassigned Route';
          const originName = matchedRoute?.origin || 'Depot';
          const destName = matchedRoute?.destination || 'Depot';

          return {
            id: b.id,
            busNumber: b.bus_number || b.busNumber,
            plateNumber: b.plate_number || b.plateNumber || b.bus_number || b.busNumber,
            routeId: targetRouteId,
            routeNumber: routeNum,
            routeName: routeTitle,
            origin: originName,
            destination: destName,
            currentStopId: 'stop1',
            currentStopName: matchedRoute?.stops?.[0]?.stopName || 'Central Depot',
            nextStopId: 'stop2',
            nextStopName: matchedRoute?.stops?.[1]?.stopName || 'Approaching Corridor',
            etaToNextMinutes: 4,
            speedKmh: 0,
            occupancy: 'moderate' as Bus['occupancy'],
            status: 'on_time' as Bus['status'],
            lat: 19.0975,
            lng: 74.7420,
            heading: 0,
            driverName: 'Assigned Driver',
            conductorName: 'Duty Conductor',
            busType: b.type || 'Standard City',
            lastUpdated: b.created_at || new Date().toISOString()
          };
        });

        setBuses(mappedBuses as Bus[]);
        try {
          syncSimulatorFleetWithAdminConfig(mappedBuses as Bus[], combinedRoutes as unknown as Route[]);
        } catch (_) {}
      } else {
        setBuses([]);
      }
    } catch (err) {
      console.error('Failed to load database records:', err);
    }
  };

  // Reset selectedBusId if the bus no longer exists in configured buses
  useEffect(() => {
    if (selectedBusId) {
      if (buses.length === 0) {
        setSelectedBusId(null);
      } else {
        const norm = selectedBusId.trim().toUpperCase().replace(/\s+/g, '');
        const exists = buses.some(b => 
          (b.id || '').trim().toUpperCase().replace(/\s+/g, '') === norm ||
          (b.busNumber || '').trim().toUpperCase().replace(/\s+/g, '') === norm
        );
        if (!exists) {
          setSelectedBusId(null);
        }
      }
    }
  }, [buses, selectedBusId]);

  useEffect(() => {
    refreshData();

    // Central updater for incoming telemetry across any channel
    const handleBusUpdate = (updatedBus: Partial<Bus>) => {
      if (!updatedBus || !updatedBus.id) return;
      if (updatedBus.isDemo || updatedBus.id.startsWith('demo-') || (updatedBus as any).routeName?.includes('[DEMO]')) return;
      setBuses(prevBuses => {
        const index = prevBuses.findIndex(b => b.id === updatedBus.id);
        if (index !== -1) {
          const newBuses = [...prevBuses];
          newBuses[index] = { ...newBuses[index], ...updatedBus, lastUpdated: new Date().toISOString() };
          return newBuses;
        }
        return prevBuses;
      });
    };

    const handleBusOffline = (busId: string) => {
      setBuses(prev => prev.filter(b => b.id !== busId));
    };


    // 1. Cross-Tab Fast Channel (Zero Latency)
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannel = new BroadcastChannel('nagarst_bus_telemetry');
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'locationUpdate' && event.data?.data) {
            handleBusUpdate(event.data.data);
          } else if (event.data?.type === 'busOffline' && event.data?.busId) {
            handleBusOffline(event.data.busId);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported:', e);
      }
    }

    // 2. Storage event fallback for cross-tab updates
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('nagarst_live_bus_') && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleBusUpdate(parsed);
        } catch (_) {}
      } else if (e.key?.startsWith('nagarst_live_bus_') && !e.newValue) {
        const busId = e.key.replace('nagarst_live_bus_', '');
        handleBusOffline(busId);
      } else if (e.key === 'nagarst_demo_buses') {
        setBuses(prev => prev.filter(b => !b.isDemo && !b.id.startsWith('demo-') && !b.routeName?.includes('[DEMO]')));
      }
    };
    window.addEventListener('storage', onStorage);

    // 3. Socket.IO Real-time Connection
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://nagarst.onrender.com');
    let socketInstance: any = null;

    import('socket.io-client').then(({ io }) => {
      socketInstance = io(SOCKET_URL);

      socketInstance.on('locationUpdate', (updatedBus: Partial<Bus>) => {
        handleBusUpdate(updatedBus);
      });

      socketInstance.on('busOffline', (busId: string) => {
        handleBusOffline(busId);
      });

      socketInstance.on('initialLocations', (activeBuses: Partial<Bus>[]) => {
        setBuses(prevBuses => {
          let newBuses = [...prevBuses];
          activeBuses.forEach(updatedBus => {
            if (!updatedBus || !updatedBus.id) return;
            if (updatedBus.isDemo || updatedBus.id.startsWith('demo-') || (updatedBus as any).routeName?.includes('[DEMO]')) return;
            const index = newBuses.findIndex(b => b.id === updatedBus.id);
            if (index !== -1) {
              newBuses[index] = { ...newBuses[index], ...updatedBus };
            }
          });
          return newBuses;
        });
      });
    });

    // 4. Real-time Firebase Firestore Live Locations Subscription
    const unsubscribeFirebase = subscribeFirebaseLiveLocations((locations) => {
      if (!locations || locations.length === 0) return;
      locations.forEach(loc => {
        handleBusUpdate({
          id: loc.bus_id,
          lat: loc.lat,
          lng: loc.lng,
          speedKmh: loc.speed_kmh,
          heading: loc.heading,
          lastUpdated: loc.updated_at || new Date().toISOString()
        });
      });
    });

    return () => {
      if (broadcastChannel) broadcastChannel.close();
      window.removeEventListener('storage', onStorage);
      if (socketInstance) socketInstance.disconnect();
      unsubscribeFirebase();
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        buses,
        setBuses,
        routes,
        stops,
        tickets,
        passes,
        notifications,
        favorites,
        selectedBusId,
        setSelectedBusId,
        selectedStopId,
        setSelectedStopId,
        selectedRouteId,
        setSelectedRouteId,
        addTicket,
        addPass,
        toggleFavorite,
        isFavorite,
        markNotificationRead,
        userLocation,
        refreshData,
        clearAllAppData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

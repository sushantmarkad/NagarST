import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Bus, Route, BusStop, Ticket, BusPass, NotificationItem, FavoriteItem } from '../types';
import { supabase } from '../utils/supabaseClient';
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
    } catch (e) {
      console.warn('Failed clearing localStorage:', e);
    }
  };

  // --- COMPREHENSIVE SUPABASE REAL-TIME & DATABASE FETCH ---
  const refreshData = async () => {
    try {
      // 1. Fetch all real Stops directly from Supabase 'stops' table
      const { data: dbStops } = await supabase.from('stops').select('*').order('created_at', { ascending: false });
      if (dbStops && dbStops.length > 0) {
        const formattedStops = dbStops.map((s: any) => ({
          id: s.id,
          name: s.stop_name || 'Stop',
          nameMarathi: s.stop_name || 'थांबा',
          area: 'City Center',
          lat: s.lat || 19.0975,
          lng: s.lng || 74.7420,
          lines: [],
          facilities: ['Shelter', 'Bus Bay'],
          accessibility: true,
          shelter: true,
          digitalBoard: true,
          liveArrivals: []
        }));
        setStops(formattedStops as BusStop[]);
      } else {
        setStops([]);
      }

      // 2. Fetch all real Routes with route_stops from Supabase
      const { data: dbRoutes } = await supabase
        .from('routes')
        .select(`
          id,
          route_number,
          origin,
          destination,
          route_path,
          route_stops (
            id,
            stop_order,
            estimated_minutes_from_origin,
            stops (
              id,
              stop_name,
              lat,
              lng
            )
          )
        `);

      let combinedRoutes: any[] = [];
      if (dbRoutes && dbRoutes.length > 0) {
        combinedRoutes = dbRoutes.map((r: any) => ({
          id: r.id,
          routeNumber: r.route_number,
          origin: r.origin,
          destination: r.destination,
          name: `${r.origin} ↔ ${r.destination}`,
          nameMarathi: `${r.origin} ↔ ${r.destination}`,
          firstBus: '06:00 AM',
          lastBus: '10:00 PM',
          frequencyMinutes: 15,
          baseFare: 10,
          maxFare: 30,
          totalStops: r.route_stops?.length || 0,
          durationMinutes: 30,
          color: '#7847CB',
          activeBusesCount: 1,
          status: 'normal',
          route_path: r.route_path,
          stops: (() => {
            const rawStops = r.route_stops
              ? r.route_stops
                  .sort((a: any, b: any) => a.stop_order - b.stop_order)
                  .map((rs: any) => ({
                    stopId: rs.stops?.id,
                    stopName: rs.stops?.stop_name,
                    stopNameMarathi: rs.stops?.stop_name,
                    lat: rs.stops?.lat,
                    lng: rs.stops?.lng,
                    sequence: rs.stop_order,
                    fareFromOrigin: rs.stop_order * 5,
                    estimatedMinutesFromOrigin: rs.estimated_minutes_from_origin || rs.stop_order * 4,
                    isMajorHub: rs.stop_order === 1
                  }))
              : [];

            if (r.destination && rawStops.length > 2) {
              const destNorm = r.destination.trim().toLowerCase();
              const lastStopName = (rawStops[rawStops.length - 1]?.stopName || '').trim().toLowerCase();
              const isMatch = (a: string, b: string) => a === b || a.includes(b) || b.includes(a);
              if (!isMatch(lastStopName, destNorm)) {
                const dIdx = rawStops.findIndex((s: any) => isMatch((s.stopName || '').trim().toLowerCase(), destNorm));
                if (dIdx !== -1 && dIdx < rawStops.length - 1) {
                  const destStop = rawStops.splice(dIdx, 1)[0];
                  rawStops.push(destStop);
                  rawStops.forEach((s: any, idx: number) => {
                    s.sequence = idx + 1;
                    s.estimatedMinutesFromOrigin = idx * 4;
                  });
                }
              }
            }
            return rawStops;
          })()
        }));
      }

      // Check localStorage for offline / admin-configured routes
      try {
        const localRoutesRaw = localStorage.getItem('nagarst_configured_routes');
        if (localRoutesRaw) {
          const localRoutes = JSON.parse(localRoutesRaw);
          localRoutes.forEach((lr: any) => {
            if (lr.destination && lr.stops && lr.stops.length > 2) {
              const destNorm = lr.destination.trim().toLowerCase();
              const lastStopName = (lr.stops[lr.stops.length - 1]?.stopName || lr.stops[lr.stops.length - 1]?.name || '').trim().toLowerCase();
              const isMatch = (a: string, b: string) => a === b || a.includes(b) || b.includes(a);
              if (!isMatch(lastStopName, destNorm)) {
                const dIdx = lr.stops.findIndex((s: any) => isMatch((s.stopName || s.name || '').trim().toLowerCase(), destNorm));
                if (dIdx !== -1 && dIdx < lr.stops.length - 1) {
                  const destStop = lr.stops.splice(dIdx, 1)[0];
                  lr.stops.push(destStop);
                  lr.stops.forEach((s: any, idx: number) => {
                    s.sequence = idx + 1;
                    s.estimatedMinutesFromOrigin = idx * 4;
                  });
                }
              }
            }
            const isDairy = (lr.destination || '').toLowerCase().includes('dairy') || (lr.name || '').toLowerCase().includes('dairy');
            if (isDairy && lr.stops && lr.stops.length > 0) {
              const lastStop = lr.stops[lr.stops.length - 1];
              if (lastStop.lat > 19.10) {
                lastStop.lat = 19.0830;
                lastStop.lng = 74.7460;
              }
            }
            if (!combinedRoutes.some((cr) => cr.id === lr.id || (cr.routeNumber && cr.routeNumber === lr.routeNumber))) {
              combinedRoutes.push(lr);
            }
          });
        }
      } catch (_) {}

      setRoutes(combinedRoutes as unknown as Route[]);

      // 3. Fetch all real Buses from 'buses' table and merge with 'live_locations'
      const { data: dbBuses } = await supabase.from('buses').select('*');
      const { data: liveLocs } = await supabase
        .from('live_locations')
        .select(`
          *,
          buses ( bus_number, plate_number, type ),
          trips (
            route_id,
            routes ( route_number, origin, destination )
          )
        `);

      const liveLocMap = new Map();
      if (liveLocs) {
        liveLocs.forEach((loc: any) => {
          liveLocMap.set(loc.bus_id, loc);
        });
      }

      let allBusesList: any[] = dbBuses ? [...dbBuses] : [];

      // Also merge any custom buses registered by admin in localStorage (excluding deleted ones)
      try {
        const deletedRaw = localStorage.getItem('nagarst_deleted_demo_buses');
        const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
        const isDeleted = (id?: string, bNum?: string, pNum?: string) => {
          const norm = (s?: string) => (s || '').trim().toUpperCase().replace(/\s+/g, '');
          const cId = norm(id);
          const cB = norm(bNum);
          const cP = norm(pNum);
          return deletedIds.some((d) => {
            const cD = norm(d);
            return (cId && cD === cId) || (cB && cD === cB) || (cP && cD === cP);
          });
        };

        // Purge any deleted buses from allBusesList
        if (deletedIds.length > 0) {
          allBusesList = allBusesList.filter(
            (b) => !isDeleted(b.id, b.bus_number, b.plate_number)
          );
        }

        const customBusesRaw = localStorage.getItem('nagarst_custom_buses');
        if (customBusesRaw) {
          const customBuses = JSON.parse(customBusesRaw);
          customBuses.forEach((cb: any) => {
            if (cb.id?.startsWith('demo-')) return;
            const bNum = cb.busNumber || cb.bus_number;
            const pNum = cb.plateNumber || cb.plate_number;
            if (isDeleted(cb.id, bNum, pNum)) return;
            if (!allBusesList.some((b) => b.id === cb.id || b.bus_number?.trim().toUpperCase() === (bNum || '').trim().toUpperCase())) {
              allBusesList.push({
                id: cb.id,
                bus_number: bNum,
                plate_number: pNum || bNum,
                type: cb.busType || cb.type || 'Standard City',
                route_id: cb.routeId || cb.route_id,
                status: cb.status || 'Active',
                created_at: cb.created_at || new Date().toISOString()
              });
            }
          });
        }
      } catch (_) {}

      // If no transit routes exist, aggressively purge stale demo bus caches from localStorage
      if (combinedRoutes.length === 0) {
        try {
          localStorage.removeItem('nagarst_demo_buses');
          localStorage.removeItem('nagarst_demo_assignments');
          localStorage.removeItem('nagarst_custom_buses');
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('nagarst_live_bus_demo-') || k === 'nagarst_demo_bus')) {
              localStorage.removeItem(k);
            }
          }
        } catch (_) {}
      }

      if (allBusesList.length > 0) {
        const mappedBuses = allBusesList.map((b: any) => {
          const live = liveLocMap.get(b.id);
          let cached: any = null;
          try {
            const raw = localStorage.getItem('nagarst_live_bus_' + b.id);
            if (raw) cached = JSON.parse(raw);
          } catch (_) {}

          // Match assigned route
          const targetRouteId = b.route_id || cached?.routeId || live?.trips?.route_id || '';
          const matchedRoute = combinedRoutes.find((r) => r.id === targetRouteId);

          const routeNum = matchedRoute?.routeNumber || cached?.routeNumber || live?.trips?.routes?.route_number || '';
          const routeTitle = matchedRoute?.name || cached?.routeName || (live?.trips?.routes ? `${live.trips.routes.origin} ➔ ${live.trips.routes.destination}` : 'Unassigned Route');
          const originName = matchedRoute?.origin || live?.trips?.routes?.origin || 'Depot';
          const destName = matchedRoute?.destination || live?.trips?.routes?.destination || 'Depot';

          return {
            id: b.id,
            busNumber: b.bus_number,
            plateNumber: b.plate_number,
            routeId: targetRouteId,
            routeNumber: routeNum,
            routeName: routeTitle,
            origin: originName,
            destination: destName,
            currentStopId: 'stop1',
            currentStopName: cached?.nextStopName || matchedRoute?.stops?.[0]?.stopName || 'Central Depot',
            nextStopId: 'stop2',
            nextStopName: cached?.nextStopName || matchedRoute?.stops?.[1]?.stopName || 'Approaching Corridor',
            etaToNextMinutes: 4,
            speedKmh: cached?.speedKmh ?? (live?.speed_kmh || 0),
            occupancy: (cached?.occupancy || 'moderate') as Bus['occupancy'],
            status: (cached?.status || (live ? 'on_time' : 'on_time')) as Bus['status'],
            lat: cached?.lat ?? (live?.lat || 19.0975),
            lng: cached?.lng ?? (live?.lng || 74.7420),
            heading: cached?.heading || live?.heading || 0,
            driverName: cached?.driverName || 'Assigned Driver',
            conductorName: 'Duty Conductor',
            busType: b.type || 'Standard City',
            lastUpdated: cached?.lastUpdated || live?.updated_at || b.created_at
          };
        });
        setBuses(mappedBuses as Bus[]);
        // Synchronize simulator engine fleet immediately with mapped fleet & routes
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

  useEffect(() => {
    refreshData();

    // Central updater for incoming telemetry across any channel
    const handleBusUpdate = (updatedBus: Partial<Bus>) => {
      if (!updatedBus || !updatedBus.id) return;
      setBuses(prevBuses => {
        const index = prevBuses.findIndex(b => b.id === updatedBus.id);
        if (index !== -1) {
          const newBuses = [...prevBuses];
          newBuses[index] = { ...newBuses[index], ...updatedBus, lastUpdated: new Date().toISOString() };
          return newBuses;
        } else {
          return [...prevBuses, { ...updatedBus, lastUpdated: new Date().toISOString() } as Bus];
        }
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
      } else if (e.key === 'nagarst_demo_buses' && !e.newValue) {
        setBuses(prev => prev.filter(b => !b.isDemo && !b.id.startsWith('demo-')));
      }
    };
    window.addEventListener('storage', onStorage);

    // 3. Socket.IO Real-time Connection
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://nagarst.onrender.com';
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
            const index = newBuses.findIndex(b => b.id === updatedBus.id);
            if (index !== -1) {
              newBuses[index] = { ...newBuses[index], ...updatedBus };
            } else if (updatedBus.isDemo || updatedBus.id?.startsWith('demo-')) {
              newBuses.push(updatedBus as Bus);
            }
          });
          return newBuses;
        });
      });
    });

    // 4. Supabase Realtime Channel on live_locations table
    const dbChannel = supabase
      .channel('realtime_live_locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations' }, (payload) => {
        if (payload.new && (payload.new as any).bus_id) {
          const loc = payload.new as any;
          setBuses(prev => prev.map(bus => {
            if (bus.id === loc.bus_id) {
              return {
                ...bus,
                lat: loc.lat,
                lng: loc.lng,
                speedKmh: loc.speed_kmh || 0,
                heading: loc.heading || 0,
                lastUpdated: loc.updated_at || new Date().toISOString()
              };
            }
            return bus;
          }));
        }
      })
      .subscribe();

    // 5. Periodic polling fallback every 3.5 seconds
    const pollTimer = setInterval(async () => {
      try {
        const { data: latestLocs } = await supabase.from('live_locations').select('*');
        if (latestLocs && latestLocs.length > 0) {
          setBuses(prev => {
            let hasChanges = false;
            const updated = prev.map(b => {
              const match = latestLocs.find((l: any) => l.bus_id === b.id);
              if (match && (match.lat !== b.lat || match.lng !== b.lng || match.speed_kmh !== b.speedKmh)) {
                hasChanges = true;
                return {
                  ...b,
                  lat: match.lat,
                  lng: match.lng,
                  speedKmh: match.speed_kmh || 0,
                  heading: match.heading || 0,
                  lastUpdated: match.updated_at || new Date().toISOString()
                };
              }
              return b;
            });
            return hasChanges ? updated : prev;
          });
        }
      } catch (_) {}
    }, 3500);

    return () => {
      if (broadcastChannel) broadcastChannel.close();
      window.removeEventListener('storage', onStorage);
      if (socketInstance) socketInstance.disconnect();
      supabase.removeChannel(dbChannel);
      clearInterval(pollTimer);
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

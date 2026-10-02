import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Bus, Route, BusStop, Ticket, BusPass, NotificationItem, FavoriteItem } from '../types';
import { supabase } from '../utils/supabaseClient';

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
    name: 'Central Bus Stand, Ahilyanagar',
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
      ticketCode: `ANC-2026-${randomId}`,
      purchaseTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      validUntil: 'Today, 11:59 PM',
      status: 'active',
      qrData: `AHILYANAGAR-BUS-TICKET-${randomId}-ACTIVE`,
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
      passCode: `ANC-PASS-${randomId}`,
      validFrom: new Date().toLocaleDateString(undefined, { dateStyle: 'medium' }),
      status: 'active',
      daysRemaining,
      qrData: `AHILYANAGAR-BUS-PASS-${randomId}-ACTIVE`,
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
          area: 'Ahilyanagar',
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

      if (dbRoutes && dbRoutes.length > 0) {
        const formattedRoutes = dbRoutes.map((r: any) => ({
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
          stops: r.route_stops
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
            : []
        }));
        setRoutes(formattedRoutes as unknown as Route[]);
      }

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

      if (dbBuses) {
        const mappedBuses = dbBuses.map((b: any) => {
          const live = liveLocMap.get(b.id);
          return {
            id: b.id,
            busNumber: b.bus_number,
            plateNumber: b.plate_number,
            routeId: live?.trips?.route_id || '',
            routeNumber: live?.trips?.routes?.route_number || '',
            routeName: live?.trips?.routes ? `${live.trips.routes.origin} - ${live.trips.routes.destination}` : 'Standby / In Service',
            origin: live?.trips?.routes?.origin || 'Depot',
            destination: live?.trips?.routes?.destination || 'Depot',
            currentStopId: 'stop1',
            currentStopName: 'Ahilyanagar Depot',
            nextStopId: 'stop2',
            nextStopName: 'Approaching Corridor',
            etaToNextMinutes: 4,
            speedKmh: live?.speed_kmh || 0,
            occupancy: 'low' as const,
            status: live ? ('on_time' as const) : ('on_time' as const),
            lat: live?.lat || 19.0975,
            lng: live?.lng || 74.7420,
            heading: 0,
            driverName: 'Assigned Driver',
            conductorName: 'Duty Conductor',
            busType: b.type || 'Standard City',
            lastUpdated: live?.updated_at || b.created_at
          };
        });
        setBuses(mappedBuses as Bus[]);
      }
    } catch (err) {
      console.error('Failed to load database records:', err);
    }
  };

  useEffect(() => {
    refreshData();

    // Socket.IO Real-time Connection
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://nagarst.onrender.com';
    let socketInstance: any = null;

    import('socket.io-client').then(({ io }) => {
      socketInstance = io(SOCKET_URL);

      socketInstance.on('locationUpdate', (updatedBus: Partial<Bus>) => {
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
      });

      socketInstance.on('initialLocations', (activeBuses: Partial<Bus>[]) => {
        setBuses(prevBuses => {
          let newBuses = [...prevBuses];
          activeBuses.forEach(updatedBus => {
            const index = newBuses.findIndex(b => b.id === updatedBus.id);
            if (index !== -1) {
              newBuses[index] = { ...newBuses[index], ...updatedBus };
            }
          });
          return newBuses;
        });
      });
    });

    return () => {
      if (socketInstance) socketInstance.disconnect();
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

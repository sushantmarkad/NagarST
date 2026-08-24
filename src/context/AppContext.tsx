import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Bus, Route, BusStop, Ticket, BusPass, NotificationItem, FavoriteItem } from '../types';
import { supabase } from '../utils/supabaseClient';
import { MOCK_BUSES } from '../data/mockBuses';
import { MOCK_ROUTES } from '../data/mockRoutes';
import { MOCK_BUS_STOPS } from '../data/mockStops';
import { MOCK_TICKETS } from '../data/mockTickets';
import { MOCK_PASSES } from '../data/mockPasses';
import { MOCK_NOTIFICATIONS } from '../data/mockNotifications';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [buses, setBuses] = useState<Bus[]>(MOCK_BUSES);
  const [routes] = useState<Route[]>(MOCK_ROUTES);
  const [stops] = useState<BusStop[]>(MOCK_BUS_STOPS);
  const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);
  const [passes, setPasses] = useState<BusPass[]>(MOCK_PASSES);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([
    { id: 'fav-1', type: 'place', title: 'Home', subtitle: 'Savedi Road, Ahilyanagar', targetId: 'stop-savedi', icon: 'home', quickEta: 'Bus 12 in 5m' },
    { id: 'fav-2', type: 'place', title: 'New Arts College', subtitle: 'College Road', targetId: 'stop-new-arts', icon: 'school', quickEta: 'Bus 12 in 3m' },
    { id: 'fav-3', type: 'route', title: 'Route 12', subtitle: 'CBS ↔ Savedi Terminal', targetId: 'route-12', icon: 'bus', quickEta: 'Every 12 min' },
  ]);

  const [selectedBusId, setSelectedBusId] = useState<string | null>('bus-101');
  const [selectedStopId, setSelectedStopId] = useState<string | null>('stop-cbs');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>('route-12');

  const userLocation = {
    lat: 19.0975,
    lng: 74.7420,
    name: 'Central Bus Stand, Ahilyanagar',
  };

  const addTicket = (data: Omit<Ticket, 'id' | 'ticketCode' | 'purchaseTime' | 'validUntil' | 'status' | 'qrData'>): Ticket => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const newTicket: Ticket = {
      ...data,
      id: `tkt-${randomId}`,
      ticketCode: `ANC-2026-${randomId}`,
      purchaseTime: 'Just now',
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
      id: `pass-${randomId}`,
      passCode: `ANC-PASS-${randomId}`,
      validFrom: 'Today',
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

  // --- SOCKET.IO REAL-TIME LISTENER & SUPABASE INITIAL FETCH ---
  useEffect(() => {
    // 1. Fetch initial live locations from Supabase
    const fetchInitialLocations = async () => {
      const { data, error } = await supabase
        .from('live_locations')
        .select(`
          *,
          buses ( bus_number, plate_number, type ),
          trips (
            route_id,
            routes ( route_number, origin, destination )
          )
        `);

      if (!error && data) {
        const liveBuses = data.map((d: any) => ({
          id: d.bus_id,
          busNumber: d.buses?.bus_number || 'Unknown',
          plateNumber: d.buses?.plate_number || 'Unknown',
          routeId: d.trips?.route_id || '',
          routeNumber: d.trips?.routes?.route_number || '',
          routeName: d.trips?.routes ? `${d.trips.routes.origin} - ${d.trips.routes.destination}` : '',
          origin: d.trips?.routes?.origin || '',
          destination: d.trips?.routes?.destination || '',
          currentStopId: 'stop1',
          currentStopName: 'Unknown',
          nextStopId: 'stop2',
          nextStopName: 'Unknown',
          etaToNextMinutes: 5,
          speedKmh: d.speed_kmh,
          occupancy: 'low',
          status: 'on_time',
          lat: d.lat,
          lng: d.lng,
          heading: 0,
          driverName: 'Driver',
          conductorName: 'Conductor',
          busType: d.buses?.type || 'Standard City',
          lastUpdated: d.updated_at
        }));
        
        setBuses(liveBuses as Bus[]);
      }
    };

    fetchInitialLocations();

    // 2. Connect to Socket.IO Server for live location updates
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
    import('socket.io-client').then(({ io }) => {
      const socket = io(SOCKET_URL);

      socket.on('locationUpdate', (updatedBus: Partial<Bus>) => {
        setBuses(prevBuses => {
          const index = prevBuses.findIndex(b => b.id === updatedBus.id);
          if (index !== -1) {
            const newBuses = [...prevBuses];
            newBuses[index] = { ...newBuses[index], ...updatedBus, lastUpdated: new Date().toISOString() };
            return newBuses;
          } else {
            // Bus is new to this client (e.g. driver just started trip)
            return [...prevBuses, { ...updatedBus, lastUpdated: new Date().toISOString() } as Bus];
          }
        });
      });

      socket.on('initialLocations', (activeBuses: Partial<Bus>[]) => {
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

      return () => {
        socket.disconnect();
      };
    });

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

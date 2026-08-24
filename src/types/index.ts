export type OccupancyLevel = 'low' | 'moderate' | 'high';
export type BusStatus = 'on_time' | 'delayed' | 'early';
export type BusType = 'AC Express' | 'Standard City' | 'Mini Bus' | 'EV Metro Shuttle';

export interface LiveArrival {
  busId: string;
  busNumber: string;
  routeId: string;
  destination: string;
  etaMinutes: number;
  occupancy: OccupancyLevel;
  busType: BusType;
  status: BusStatus;
}

export interface BusStop {
  id: string;
  name: string;
  nameMarathi: string;
  area: string;
  lat: number;
  lng: number;
  lines: string[];
  facilities: string[];
  accessibility: boolean;
  shelter: boolean;
  digitalBoard: boolean;
  liveArrivals: LiveArrival[];
}

export interface RouteStop {
  stopId: string;
  stopName: string;
  stopNameMarathi: string;
  sequence: number;
  fareFromOrigin: number;
  estimatedMinutesFromOrigin: number;
  isMajorHub?: boolean;
  lat: number;
  lng: number;
}

export interface Route {
  id: string;
  routeNumber: string;
  name: string;
  nameMarathi: string;
  origin: string;
  destination: string;
  firstBus: string;
  lastBus: string;
  frequencyMinutes: number;
  baseFare: number;
  maxFare: number;
  totalStops: number;
  durationMinutes: number;
  stops: RouteStop[];
  activeBusesCount: number;
  color: string;
  status: 'normal' | 'detour' | 'high_demand';
}

export interface Bus {
  id: string;
  busNumber: string;
  plateNumber: string;
  routeId: string;
  routeNumber: string;
  routeName: string;
  origin: string;
  destination: string;
  currentStopId: string;
  currentStopName: string;
  nextStopId: string;
  nextStopName: string;
  etaToNextMinutes: number;
  speedKmh: number;
  occupancy: OccupancyLevel;
  status: BusStatus;
  delayMinutes?: number;
  lat: number;
  lng: number;
  heading: number;
  driverName: string;
  conductorName: string;
  busType: BusType;
  lastUpdated: string;
}

export interface Ticket {
  id: string;
  ticketCode: string;
  sourceStop: string;
  destinationStop: string;
  passengerCount: number;
  fare: number;
  fareBreakup: {
    baseFare: number;
    govTax: number;
    discount: number;
    total: number;
  };
  purchaseTime: string;
  validUntil: string;
  status: 'active' | 'used' | 'expired';
  qrData: string;
  busType: BusType;
}

export interface BusPass {
  id: string;
  passCode: string;
  passType: 'daily' | 'weekly' | 'monthly_general' | 'monthly_student';
  title: string;
  titleMarathi: string;
  holderName: string;
  holderId: string;
  institutionOrOrg?: string;
  validFrom: string;
  validUntil: string;
  fare: number;
  qrData: string;
  status: 'active' | 'expired' | 'pending';
  daysRemaining: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  titleMarathi: string;
  message: string;
  messageMarathi: string;
  time: string;
  category: 'service_alert' | 'delay' | 'pass_reminder' | 'general';
  severity: 'info' | 'warning' | 'alert';
  read: boolean;
  routeId?: string;
}

export interface FavoriteItem {
  id: string;
  type: 'stop' | 'route' | 'place';
  title: string;
  subtitle: string;
  targetId: string;
  icon: 'home' | 'work' | 'school' | 'bus' | 'map-pin';
  quickEta?: string;
}

export interface JourneyStep {
  mode: 'walk' | 'bus';
  description: string;
  durationMinutes: number;
  stopName?: string;
  busNumber?: string;
  distanceMeters?: number;
}

export interface JourneyOption {
  id: string;
  busNumber: string;
  routeId: string;
  routeName: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  totalStops: number;
  walkingDistanceMeters: number;
  fare: number;
  occupancy: OccupancyLevel;
  transfers: number;
  steps: JourneyStep[];
  tag?: 'Fastest' | 'Cheapest' | 'Recommended';
}

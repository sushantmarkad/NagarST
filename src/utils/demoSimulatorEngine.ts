import type { Bus, Route, RouteStop } from '../types';
import { getDistance, getBearing } from './routing';

export const DEMO_BUS_ID = 'demo-bus-sim-01';
export const DEMO_BUS_NUMBER = 'MH-16-DEMO-1';
export const DEMO_PLATE_NUMBER = 'MH-16-DM-101';
export const DEMO_TRIP_ID = 'demo-trip-sim-001';

export interface DemoStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface DemoBusDefinition {
  id: string;
  busNumber: string;
  plateNumber: string;
  tripId: string;
  routeId: string;
  routeNumber: string;
  routeName: string;
  origin: string;
  destination: string;
  color: string;
  stops: DemoStop[];
  waypoints: { lat: number; lng: number }[];
  initialIndex: number;
}

// =========================================================================
// CORRIDOR 1: Delhi Gate ↔ Dairy Chowk via Pipeline Road (Route 12)
// =========================================================================
export const DEMO_STOPS_BUS_1: DemoStop[] = [
  { id: 'stop-dg', name: 'Delhi Gate Terminal', lat: 19.109728, lng: 74.733295 },
  { id: 'stop-my', name: 'Market Yard Hub', lat: 19.121543, lng: 74.727673 },
  { id: 'stop-sv', name: 'Savedi Phata', lat: 19.135622, lng: 74.721761 },
  { id: 'stop-pc', name: 'Premdan Chowk', lat: 19.145418, lng: 74.711820 },
  { id: 'stop-pr', name: 'Pipeline Road Cross', lat: 19.157221, lng: 74.704662 },
  { id: 'stop-dc', name: 'Dairy Chowk Terminal', lat: 19.170628, lng: 74.697225 }
];

export const DEMO_WAYPOINTS_BUS_1 = [
  { lat: 19.109728, lng: 74.733295 },
  { lat: 19.111240, lng: 74.732810 },
  { lat: 19.112850, lng: 74.732200 },
  { lat: 19.114310, lng: 74.731550 },
  { lat: 19.115820, lng: 74.730820 },
  { lat: 19.117450, lng: 74.729980 },
  { lat: 19.119100, lng: 74.729050 },
  { lat: 19.120480, lng: 74.728250 },
  { lat: 19.121543, lng: 74.727673 }, // Market Yard
  { lat: 19.122530, lng: 74.727390 },
  { lat: 19.123649, lng: 74.727096 },
  { lat: 19.124992, lng: 74.726708 },
  { lat: 19.126313, lng: 74.726201 },
  { lat: 19.127429, lng: 74.725691 },
  { lat: 19.129957, lng: 74.724445 },
  { lat: 19.131650, lng: 74.723602 },
  { lat: 19.133514, lng: 74.722740 },
  { lat: 19.135622, lng: 74.721761 }, // Savedi Phata
  { lat: 19.137066, lng: 74.721085 },
  { lat: 19.138381, lng: 74.720221 },
  { lat: 19.139442, lng: 74.718728 },
  { lat: 19.139850, lng: 74.716115 },
  { lat: 19.141134, lng: 74.714988 },
  { lat: 19.142972, lng: 74.713693 },
  { lat: 19.144449, lng: 74.712558 },
  { lat: 19.145418, lng: 74.711820 }, // Premdan Chowk
  { lat: 19.146586, lng: 74.710983 },
  { lat: 19.148096, lng: 74.710042 },
  { lat: 19.150156, lng: 74.708773 },
  { lat: 19.152754, lng: 74.707187 },
  { lat: 19.155356, lng: 74.705678 },
  { lat: 19.157221, lng: 74.704662 }, // Pipeline Road
  { lat: 19.159640, lng: 74.703365 },
  { lat: 19.161970, lng: 74.702099 },
  { lat: 19.163942, lng: 74.700925 },
  { lat: 19.165847, lng: 74.699779 },
  { lat: 19.167748, lng: 74.698645 },
  { lat: 19.169497, lng: 74.697686 },
  { lat: 19.170628, lng: 74.697225 }  // Dairy Chowk
];

// Backward compatibility aliases
export const DEMO_STOPS = DEMO_STOPS_BUS_1;
export const DEMO_WAYPOINTS = DEMO_WAYPOINTS_BUS_1;

// =========================================================================
// CORRIDOR 2: Central Bus Stand ↔ MIDC Nagapur Sector 1 (Route 1)
// =========================================================================
export const DEMO_STOPS_BUS_2: DemoStop[] = [
  { id: 'stop-cbs', name: 'Central Bus Stand (CBS)', lat: 19.0975, lng: 74.7420 },
  { id: 'stop-swastik', name: 'Swastik Chowk Hub', lat: 19.0952, lng: 74.7496 },
  { id: 'stop-delhi-gate', name: 'Delhi Gate Circle', lat: 19.1020, lng: 74.7480 },
  { id: 'stop-premdan', name: 'Premdan Chowk', lat: 19.1130, lng: 74.7390 },
  { id: 'stop-savedi', name: 'Savedi Terminal', lat: 19.1220, lng: 74.7350 },
  { id: 'stop-midc', name: 'MIDC Nagapur Sector 1', lat: 19.1550, lng: 74.7180 }
];

export const DEMO_WAYPOINTS_BUS_2 = [
  { lat: 19.097296, lng: 74.741966 },
  { lat: 19.097778, lng: 74.741688 },
  { lat: 19.099816, lng: 74.743538 },
  { lat: 19.096844, lng: 74.747031 },
  { lat: 19.094805, lng: 74.748033 },
  { lat: 19.095264, lng: 74.749539 }, // Swastik Chowk Hub
  { lat: 19.096594, lng: 74.751109 },
  { lat: 19.101698, lng: 74.747546 }, // Delhi Gate Circle
  { lat: 19.105668, lng: 74.747262 },
  { lat: 19.106242, lng: 74.745002 },
  { lat: 19.110383, lng: 74.746421 },
  { lat: 19.111675, lng: 74.741089 },
  { lat: 19.112326, lng: 74.741194 },
  { lat: 19.112643, lng: 74.740112 }, // Premdan Chowk
  { lat: 19.112455, lng: 74.741212 },
  { lat: 19.118414, lng: 74.750718 },
  { lat: 19.120056, lng: 74.747278 },
  { lat: 19.121345, lng: 74.740430 },
  { lat: 19.121521, lng: 74.734993 }, // Savedi Terminal
  { lat: 19.121530, lng: 74.734282 },
  { lat: 19.129896, lng: 74.732222 },
  { lat: 19.131760, lng: 74.725053 },
  { lat: 19.155330, lng: 74.724134 },
  { lat: 19.160062, lng: 74.723041 },
  { lat: 19.164016, lng: 74.720719 },
  { lat: 19.163565, lng: 74.719399 },
  { lat: 19.161880, lng: 74.719115 },
  { lat: 19.160512, lng: 74.718222 },
  { lat: 19.160324, lng: 74.717358 },
  { lat: 19.155734, lng: 74.716725 }  // MIDC Nagapur Sector 1
];

// =========================================================================
// CORRIDOR 3: Savedi Terminal ↔ Central Railway Station (Route 4)
// =========================================================================
export const DEMO_STOPS_BUS_3: DemoStop[] = [
  { id: 'stop-savedi', name: 'Savedi Bus Terminal', lat: 19.1220, lng: 74.7350 },
  { id: 'stop-premdan', name: 'Premdan Chowk', lat: 19.1130, lng: 74.7390 },
  { id: 'stop-wadia', name: 'Wadia Park Stadium', lat: 19.0980, lng: 74.7450 },
  { id: 'stop-cbs', name: 'Central Bus Stand (CBS)', lat: 19.0975, lng: 74.7420 },
  { id: 'stop-railway', name: 'Central Railway Station', lat: 19.0810, lng: 74.7380 }
];

export const DEMO_WAYPOINTS_BUS_3 = [
  { lat: 19.121521, lng: 74.734993 }, // Savedi Bus Terminal
  { lat: 19.121530, lng: 74.734282 },
  { lat: 19.115128, lng: 74.736026 },
  { lat: 19.114957, lng: 74.737351 },
  { lat: 19.108526, lng: 74.737362 },
  { lat: 19.106599, lng: 74.743794 },
  { lat: 19.107896, lng: 74.743800 },
  { lat: 19.109077, lng: 74.743371 },
  { lat: 19.112100, lng: 74.743603 },
  { lat: 19.112643, lng: 74.740112 }, // Premdan Chowk
  { lat: 19.112326, lng: 74.741194 },
  { lat: 19.111675, lng: 74.741089 },
  { lat: 19.111310, lng: 74.743460 },
  { lat: 19.106289, lng: 74.745096 }, // Wadia Park Stadium area
  { lat: 19.099816, lng: 74.743538 },
  { lat: 19.097778, lng: 74.741688 },
  { lat: 19.097357, lng: 74.741559 },
  { lat: 19.097296, lng: 74.741966 }, // Central Bus Stand (CBS)
  { lat: 19.097243, lng: 74.742317 },
  { lat: 19.096530, lng: 74.742278 },
  { lat: 19.096416, lng: 74.742898 },
  { lat: 19.094797, lng: 74.742661 },
  { lat: 19.093492, lng: 74.742920 },
  { lat: 19.085927, lng: 74.741662 },
  { lat: 19.083573, lng: 74.740664 },
  { lat: 19.081927, lng: 74.739344 },
  { lat: 19.081350, lng: 74.738014 },
  { lat: 19.081026, lng: 74.738105 }  // Central Railway Station
];

// =========================================================================
// CORRIDOR 4: Market Yard ↔ Bolhegaon Phata via Savedi (Route 24)
// =========================================================================
export const DEMO_STOPS_BUS_24: DemoStop[] = [
  { id: 'stop-market-yard', name: 'Market Yard Hub', lat: 19.0880, lng: 74.7560 },
  { id: 'stop-swastik', name: 'Swastik Chowk Hub', lat: 19.0952, lng: 74.7496 },
  { id: 'stop-cbs', name: 'Central Bus Stand (CBS)', lat: 19.0975, lng: 74.7420 },
  { id: 'stop-savedi', name: 'Savedi Terminal', lat: 19.1220, lng: 74.7350 },
  { id: 'stop-bolhegaon', name: 'Bolhegaon Phata', lat: 19.1390, lng: 74.7250 }
];

export const DEMO_WAYPOINTS_BUS_24 = [
  { lat: 19.087566, lng: 74.756492 }, // Market Yard Hub
  { lat: 19.087157, lng: 74.756088 },
  { lat: 19.089011, lng: 74.753352 },
  { lat: 19.088895, lng: 74.752303 },
  { lat: 19.090022, lng: 74.751642 },
  { lat: 19.092579, lng: 74.746856 },
  { lat: 19.093245, lng: 74.748032 },
  { lat: 19.094738, lng: 74.747802 },
  { lat: 19.095264, lng: 74.749539 }, // Swastik Chowk Hub
  { lat: 19.096594, lng: 74.751109 },
  { lat: 19.099816, lng: 74.743538 },
  { lat: 19.097296, lng: 74.741966 }, // Central Bus Stand (CBS)
  { lat: 19.097778, lng: 74.741688 },
  { lat: 19.109057, lng: 74.745764 },
  { lat: 19.115733, lng: 74.749043 },
  { lat: 19.118414, lng: 74.750718 },
  { lat: 19.120056, lng: 74.747278 },
  { lat: 19.121345, lng: 74.740430 },
  { lat: 19.121521, lng: 74.734993 }, // Savedi Terminal
  { lat: 19.121530, lng: 74.734282 },
  { lat: 19.126740, lng: 74.732761 },
  { lat: 19.129896, lng: 74.732222 },
  { lat: 19.131760, lng: 74.725053 },
  { lat: 19.138975, lng: 74.724688 }  // Bolhegaon Phata
];

// =========================================================================
// CORRIDOR 5: Delhi Gate Circle ↔ Kedgaon Naka (Route 7)
// =========================================================================
export const DEMO_STOPS_BUS_7: DemoStop[] = [
  { id: 'stop-delhi-gate', name: 'Delhi Gate Circle', lat: 19.1020, lng: 74.7480 },
  { id: 'stop-swastik', name: 'Swastik Chowk Hub', lat: 19.0952, lng: 74.7496 },
  { id: 'stop-railway', name: 'Railway Station Junction', lat: 19.0810, lng: 74.7380 },
  { id: 'stop-kedgaon', name: 'Kedgaon Naka', lat: 19.0620, lng: 74.7290 }
];

export const DEMO_WAYPOINTS_BUS_7 = [
  { lat: 19.101698, lng: 74.747546 }, // Delhi Gate Circle
  { lat: 19.099245, lng: 74.749748 },
  { lat: 19.096594, lng: 74.751109 },
  { lat: 19.095264, lng: 74.749539 }, // Swastik Chowk Hub
  { lat: 19.094805, lng: 74.748033 },
  { lat: 19.093263, lng: 74.748295 },
  { lat: 19.092855, lng: 74.748005 },
  { lat: 19.090335, lng: 74.742222 },
  { lat: 19.086441, lng: 74.741781 },
  { lat: 19.084466, lng: 74.741138 },
  { lat: 19.082303, lng: 74.739735 },
  { lat: 19.081350, lng: 74.738014 },
  { lat: 19.081026, lng: 74.738105 }, // Railway Station Junction
  { lat: 19.080625, lng: 74.738218 },
  { lat: 19.080396, lng: 74.736893 },
  { lat: 19.081251, lng: 74.736633 },
  { lat: 19.080957, lng: 74.730326 },
  { lat: 19.080014, lng: 74.730160 },
  { lat: 19.076943, lng: 74.730913 },
  { lat: 19.076215, lng: 74.730789 },
  { lat: 19.075189, lng: 74.729422 },
  { lat: 19.073954, lng: 74.725976 },
  { lat: 19.065962, lng: 74.725058 },
  { lat: 19.065878, lng: 74.728448 },
  { lat: 19.063840, lng: 74.727955 },
  { lat: 19.063110, lng: 74.730219 },
  { lat: 19.061857, lng: 74.730023 }  // Kedgaon Naka
];

export interface DemoRoutePreset {
  id: string;
  routeNumber: string;
  routeName: string;
  origin: string;
  destination: string;
  color: string;
  description: string;
  stops: DemoStop[];
  waypoints: { lat: number; lng: number }[];
}

export const AVAILABLE_DEMO_ROUTES: DemoRoutePreset[] = [
  {
    id: 'route-12',
    routeNumber: 'Route 12',
    routeName: 'Delhi Gate ↔ Dairy Chowk via Pipeline Rd',
    origin: 'Delhi Gate Terminal',
    destination: 'Dairy Chowk Terminal',
    color: '#7847CB',
    description: 'Major arterial corridor along State Highway 10 and Pipeline Road',
    stops: DEMO_STOPS_BUS_1,
    waypoints: DEMO_WAYPOINTS_BUS_1
  },
  {
    id: 'route-1',
    routeNumber: 'Route 1',
    routeName: 'Central Bus Stand ↔ MIDC Nagapur Sector 1',
    origin: 'Central Bus Stand (CBS)',
    destination: 'MIDC Nagapur Sector 1',
    color: '#2563eb',
    description: 'Industrial commuter artery linking CBS with Nagapur MIDC manufacturing hub',
    stops: DEMO_STOPS_BUS_2,
    waypoints: DEMO_WAYPOINTS_BUS_2
  },
  {
    id: 'route-4',
    routeNumber: 'Route 4',
    routeName: 'Savedi Terminal ↔ Central Railway Station',
    origin: 'Savedi Bus Terminal',
    destination: 'Central Railway Station',
    color: '#059669',
    description: 'Transit spine connecting residential Savedi to Ahilyanagar Railway Station',
    stops: DEMO_STOPS_BUS_3,
    waypoints: DEMO_WAYPOINTS_BUS_3
  },
  {
    id: 'route-24',
    routeNumber: 'Route 24',
    routeName: 'Market Yard ↔ Bolhegaon Phata via Savedi',
    origin: 'Market Yard',
    destination: 'Bolhegaon Phata',
    color: '#d97706',
    description: 'Commercial connecting route from Market Yard via Savedi to northern Bolhegaon',
    stops: DEMO_STOPS_BUS_24,
    waypoints: DEMO_WAYPOINTS_BUS_24
  },
  {
    id: 'route-7',
    routeNumber: 'Route 7',
    routeName: 'Delhi Gate Circle ↔ Kedgaon Naka',
    origin: 'Delhi Gate Circle',
    destination: 'Kedgaon Naka',
    color: '#7c3aed',
    description: 'Cross-city corridor linking historic Delhi Gate with Kedgaon industrial belt',
    stops: DEMO_STOPS_BUS_7,
    waypoints: DEMO_WAYPOINTS_BUS_7
  }
];

// =========================================================================
// MULTI-BUS DEFINITION REGISTRY
// =========================================================================
export const DEMO_BUS_DEFINITIONS: DemoBusDefinition[] = [
  {
    id: 'demo-bus-sim-01',
    busNumber: 'MH-16-DEMO-1',
    plateNumber: 'MH-16-DM-101',
    tripId: 'demo-trip-sim-001',
    routeId: 'route-12',
    routeNumber: 'Route 12',
    routeName: 'Delhi Gate ↔ Dairy Chowk (Pipeline Rd)',
    origin: 'Delhi Gate Terminal',
    destination: 'Dairy Chowk Terminal',
    color: '#7847CB',
    stops: DEMO_STOPS_BUS_1,
    waypoints: DEMO_WAYPOINTS_BUS_1,
    initialIndex: 0
  },
  {
    id: 'demo-bus-sim-02',
    busNumber: 'MH-16-DEMO-2',
    plateNumber: 'MH-16-DM-102',
    tripId: 'demo-trip-sim-002',
    routeId: 'route-1',
    routeNumber: 'Route 1',
    routeName: 'CBS ↔ MIDC Nagapur Sector 1',
    origin: 'Central Bus Stand (CBS)',
    destination: 'MIDC Nagapur Sector 1',
    color: '#2563eb',
    stops: DEMO_STOPS_BUS_2,
    waypoints: DEMO_WAYPOINTS_BUS_2,
    initialIndex: 5
  },
  {
    id: 'demo-bus-sim-03',
    busNumber: 'MH-16-DEMO-3',
    plateNumber: 'MH-16-DM-103',
    tripId: 'demo-trip-sim-003',
    routeId: 'route-4',
    routeNumber: 'Route 4',
    routeName: 'Savedi Terminal ↔ Central Railway Station',
    origin: 'Savedi Bus Terminal',
    destination: 'Central Railway Station',
    color: '#059669',
    stops: DEMO_STOPS_BUS_3,
    waypoints: DEMO_WAYPOINTS_BUS_3,
    initialIndex: 3
  }
];

export interface BusSimRuntime {
  id: string;
  def: DemoBusDefinition;
  isRunning: boolean;
  currentIndex: number;
  direction: 1 | -1;
  speedMultiplier: number;
  delayMinutes: number;
  currentBus: Bus | null;
  progressPercent: number;
}

export interface DemoSimulatorState {
  isRunning: boolean;
  currentIndex: number;
  speedMultiplier: number;
  delayMinutes: number;
  currentBus: Bus | null;
  progressPercent: number;
  activeBusCount: number;
  buses: Record<string, BusSimRuntime>;
}

// In-memory runtime instances for each bus
const runtimeStore: Record<string, BusSimRuntime> = {};
DEMO_BUS_DEFINITIONS.forEach(def => {
  runtimeStore[def.id] = {
    id: def.id,
    def: def,
    isRunning: false,
    currentIndex: def.initialIndex,
    direction: 1,
    speedMultiplier: 1,
    delayMinutes: 0,
    currentBus: null,
    progressPercent: Math.round((def.initialIndex / (def.waypoints.length - 1)) * 100)
  };
});

let activeInterval: ReturnType<typeof setInterval> | null = null;
let broadcastChannel: BroadcastChannel | null = null;

const listeners = new Set<(state: DemoSimulatorState) => void>();

function notifyListeners() {
  const composite = getDemoSimulatorState();
  listeners.forEach(fn => fn(composite));
}

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel('nagarst_bus_telemetry');
    } catch (_) {}
  }
  return broadcastChannel;
}

/**
 * Builds realistic Bus telemetry for a specific bus runtime
 */
function buildBusTelemetry(runtime: BusSimRuntime): Bus {
  const { def, currentIndex, delayMinutes } = runtime;
  const waypoints = def.waypoints;
  const currentPt = waypoints[currentIndex];
  
  // Lookahead for bearing calculation
  const nextIdx = (currentIndex + runtime.direction + waypoints.length) % waypoints.length;
  const nextPt = waypoints[nextIdx];
  
  const heading = Math.round(getBearing(currentPt, nextPt));
  const baseSpeed = 28 + Math.floor(Math.sin(currentIndex) * 8);
  const speedKmh = Math.max(16, baseSpeed);

  // Dynamic next-stop and ETA calculation
  const progressRatio = currentIndex / (waypoints.length - 1);
  const stopIndex = Math.min(
    def.stops.length - 2,
    Math.max(0, Math.floor(progressRatio * (def.stops.length - 1)))
  );

  const curStop = def.stops[stopIndex];
  const nextStop = def.stops[stopIndex + 1] || def.stops[def.stops.length - 1];

  const distToNext = getDistance(currentPt, nextStop);
  const nominalMinutes = Math.max(1, Math.round((distToNext / 1000) / (speedKmh / 60)));
  const etaMinutes = nominalMinutes + delayMinutes;

  const status = delayMinutes > 3 ? ('delayed' as const) : ('on_time' as const);

  return {
    id: def.id,
    busNumber: def.busNumber,
    plateNumber: def.plateNumber,
    routeId: def.routeId,
    routeNumber: `${def.routeNumber} (DEMO)`,
    routeName: `${def.routeName} [DEMO]`,
    origin: def.origin,
    destination: def.destination,
    currentStopId: curStop.id,
    currentStopName: curStop.name,
    nextStopId: nextStop.id,
    nextStopName: nextStop.name,
    etaToNextMinutes: etaMinutes,
    delayMinutes: delayMinutes,
    speedKmh: speedKmh,
    occupancy: 'moderate',
    status: status,
    lat: currentPt.lat,
    lng: currentPt.lng,
    heading: heading,
    driverName: `Demo Pilot (${def.busNumber})`,
    conductorName: 'Simulated Crew',
    busType: 'EV Metro Shuttle',
    isDemo: true,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Dispatches simulated telemetry to all map listeners (BroadcastChannel, LocalStorage, Socket)
 */
function broadcastBusLocation(bus: Bus) {
  const ch = getBroadcastChannel();
  if (ch) {
    ch.postMessage({ type: 'locationUpdate', data: bus });
  }

  try {
    localStorage.setItem('nagarst_live_bus_' + bus.id, JSON.stringify(bus));
    // Also save into aggregate demo map
    const aggregate: Record<string, Bus> = {};
    Object.values(runtimeStore).forEach(r => {
      if (r.isRunning && r.currentBus) aggregate[r.id] = r.currentBus;
    });
    localStorage.setItem('nagarst_demo_buses', JSON.stringify(aggregate));
    if (bus.id === DEMO_BUS_ID) {
      localStorage.setItem('nagarst_demo_bus', JSON.stringify(bus));
    }
  } catch (_) {}
}

function broadcastBusOffline(busId: string) {
  const ch = getBroadcastChannel();
  if (ch) {
    ch.postMessage({ type: 'busOffline', busId });
  }

  try {
    localStorage.removeItem('nagarst_live_bus_' + busId);
    if (busId === DEMO_BUS_ID) {
      localStorage.removeItem('nagarst_demo_bus');
    }
    const aggregate: Record<string, Bus> = {};
    Object.values(runtimeStore).forEach(r => {
      if (r.isRunning && r.currentBus && r.id !== busId) aggregate[r.id] = r.currentBus;
    });
    localStorage.setItem('nagarst_demo_buses', JSON.stringify(aggregate));
  } catch (_) {}
}

/**
 * Single tick across all active demo buses
 */
export function tickDemoSimulation() {
  const activeBuses = Object.values(runtimeStore).filter(r => r.isRunning);
  if (activeBuses.length === 0) return;

  activeBuses.forEach(runtime => {
    const waypoints = runtime.def.waypoints;
    let nextIndex = runtime.currentIndex + runtime.direction;

    // Ping-pong reversal on route ends for realistic round trips
    if (nextIndex >= waypoints.length) {
      runtime.direction = -1;
      nextIndex = waypoints.length - 2;
    } else if (nextIndex < 0) {
      runtime.direction = 1;
      nextIndex = 1;
    }

    runtime.currentIndex = Math.max(0, Math.min(waypoints.length - 1, nextIndex));
    runtime.progressPercent = Math.round((runtime.currentIndex / (waypoints.length - 1)) * 100);

    const bus = buildBusTelemetry(runtime);
    runtime.currentBus = bus;

    broadcastBusLocation(bus);
  });

  notifyListeners();
}

/**
 * Resets or maintains the unified timer based on running buses
 */
function ensureTimerRunning() {
  const anyRunning = Object.values(runtimeStore).some(r => r.isRunning);
  if (!anyRunning) {
    if (activeInterval) {
      clearInterval(activeInterval);
      activeInterval = null;
    }
    return;
  }

  // Find max speed multiplier among running buses to set interval
  const maxSpeed = Math.max(1, ...Object.values(runtimeStore).filter(r => r.isRunning).map(r => r.speedMultiplier));
  const ms = Math.max(160, Math.round(1400 / maxSpeed));

  if (activeInterval) clearInterval(activeInterval);
  activeInterval = setInterval(tickDemoSimulation, ms);
}

/**
 * Start a specific demo bus
 */
export function startBus(busId: string, options?: { speedMultiplier?: number; delayMinutes?: number }) {
  const runtime = runtimeStore[busId];
  if (!runtime) return;

  if (options?.speedMultiplier) runtime.speedMultiplier = options.speedMultiplier;
  if (options?.delayMinutes !== undefined) runtime.delayMinutes = options.delayMinutes;

  runtime.isRunning = true;
  
  // Immediate initial packet
  const bus = buildBusTelemetry(runtime);
  runtime.currentBus = bus;
  broadcastBusLocation(bus);

  ensureTimerRunning();
  notifyListeners();
}

/**
 * Stop a specific demo bus
 */
export function stopBus(busId: string) {
  const runtime = runtimeStore[busId];
  if (!runtime) return;

  runtime.isRunning = false;
  runtime.currentBus = null;
  broadcastBusOffline(busId);

  ensureTimerRunning();
  notifyListeners();
}

/**
 * Start all available demo buses simultaneously
 */
export function startAllBuses(options?: { speedMultiplier?: number }) {
  Object.keys(runtimeStore).forEach(busId => {
    const runtime = runtimeStore[busId];
    if (options?.speedMultiplier) runtime.speedMultiplier = options.speedMultiplier;
    runtime.isRunning = true;
    const bus = buildBusTelemetry(runtime);
    runtime.currentBus = bus;
    broadcastBusLocation(bus);
  });

  ensureTimerRunning();
  notifyListeners();
}

/**
 * Stop all running demo buses
 */
export function stopAllBuses() {
  Object.keys(runtimeStore).forEach(busId => {
    const runtime = runtimeStore[busId];
    runtime.isRunning = false;
    runtime.currentBus = null;
    broadcastBusOffline(busId);
  });

  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }

  try {
    localStorage.removeItem('nagarst_demo_buses');
    localStorage.removeItem('nagarst_demo_bus');
  } catch (_) {}

  notifyListeners();
}

/**
 * Adjust speed for a specific bus
 */
export function setBusSpeed(busId: string, speedMultiplier: number) {
  const runtime = runtimeStore[busId];
  if (!runtime) return;

  runtime.speedMultiplier = Math.min(10, Math.max(1, speedMultiplier));
  ensureTimerRunning();
  notifyListeners();
}

/**
 * Adjust speed for all demo buses
 */
export function setAllBusSpeed(speedMultiplier: number) {
  const speed = Math.min(10, Math.max(1, speedMultiplier));
  Object.values(runtimeStore).forEach(r => {
    r.speedMultiplier = speed;
  });
  ensureTimerRunning();
  notifyListeners();
}

/**
 * Inject or clear traffic delay for a bus
 */
export function setBusDelay(busId: string, delayMinutes: number) {
  const runtime = runtimeStore[busId];
  if (!runtime) return;

  runtime.delayMinutes = Math.max(0, delayMinutes);
  if (runtime.isRunning && runtime.currentBus) {
    const bus = buildBusTelemetry(runtime);
    runtime.currentBus = bus;
    broadcastBusLocation(bus);
  }
  notifyListeners();
}

/**
 * Assign a specific route corridor and marked terminal pins to a demo bus
 */
export function setBusAssignedRoute(
  busId: string,
  routePresetId: string,
  isReverse = false,
  startTerminalId?: string,
  endTerminalId?: string
) {
  const runtime = runtimeStore[busId];
  const preset = AVAILABLE_DEMO_ROUTES.find(r => r.id === routePresetId);
  if (!runtime || !preset) return;

  let stops = isReverse ? [...preset.stops].reverse() : [...preset.stops];
  let waypoints = isReverse ? [...preset.waypoints].reverse() : [...preset.waypoints];

  // If specific Terminal Pins were marked, strictly trim stops & waypoints between them
  if (startTerminalId && endTerminalId && startTerminalId !== endTerminalId) {
    const sIdx = stops.findIndex(s => s.id === startTerminalId);
    const eIdx = stops.findIndex(s => s.id === endTerminalId);

    if (sIdx !== -1 && eIdx !== -1) {
      const lower = Math.min(sIdx, eIdx);
      const upper = Math.max(sIdx, eIdx);
      stops = stops.slice(lower, upper + 1);
      if (sIdx > eIdx) stops.reverse();

      // Find closest waypoints to Start and End terminal pins
      const startPt = stops[0];
      const endPt = stops[stops.length - 1];

      let wpStart = 0;
      let minStartD = Infinity;
      let wpEnd = waypoints.length - 1;
      let minEndD = Infinity;

      waypoints.forEach((wp, idx) => {
        const d1 = getDistance(wp, startPt);
        if (d1 < minStartD) {
          minStartD = d1;
          wpStart = idx;
        }
        const d2 = getDistance(wp, endPt);
        if (d2 < minEndD) {
          minEndD = d2;
          wpEnd = idx;
        }
      });

      const wpLower = Math.min(wpStart, wpEnd);
      const wpUpper = Math.max(wpStart, wpEnd);
      waypoints = waypoints.slice(wpLower, wpUpper + 1);
      if (wpStart > wpEnd) waypoints.reverse();
    }
  }

  const origin = stops[0].name;
  const destination = stops[stops.length - 1].name;

  runtime.def = {
    ...runtime.def,
    routeId: preset.id,
    routeNumber: preset.routeNumber,
    routeName: `${preset.routeNumber}: ${origin} ↔ ${destination}`,
    origin,
    destination,
    color: preset.color,
    stops,
    waypoints
  };

  runtime.currentIndex = 0;
  runtime.direction = 1;
  runtime.progressPercent = 0;

  if (runtime.isRunning) {
    const bus = buildBusTelemetry(runtime);
    runtime.currentBus = bus;
    broadcastBusLocation(bus);
  }

  notifyListeners();
}

/**
 * Assign a specific route corridor and marked terminal pins to ALL demo buses
 * so the entire fleet runs strictly on this selected corridor between the terminal pins!
 */
export function setAllBusesAssignedRoute(
  routePresetId: string,
  isReverse = false,
  startTerminalId?: string,
  endTerminalId?: string
) {
  Object.keys(runtimeStore).forEach((busId) => {
    setBusAssignedRoute(busId, routePresetId, isReverse, startTerminalId, endTerminalId);
  });
}

/**
 * Directly assign a custom road corridor (with origin, destination, road waypoints, and included stops) to a bus
 */
export function setBusCustomCorridor(
  busId: string,
  origin: DemoStop,
  destination: DemoStop,
  waypoints: { lat: number; lng: number }[],
  intermediateStops: DemoStop[] = []
) {
  const runtime = runtimeStore[busId];
  if (!runtime) return;

  const allStops = [origin, ...intermediateStops, destination];
  runtime.def = {
    ...runtime.def,
    origin: origin.name,
    destination: destination.name,
    routeName: `${runtime.def.routeNumber}: ${origin.name} ↔ ${destination.name}`,
    stops: allStops,
    waypoints: waypoints.length > 1 ? waypoints : [origin, destination]
  };

  runtime.currentIndex = 0;
  runtime.direction = 1;
  runtime.progressPercent = 0;

  if (runtime.isRunning) {
    const bus = buildBusTelemetry(runtime);
    runtime.currentBus = bus;
    broadcastBusLocation(bus);
  }

  notifyListeners();
}

/**
 * Assign a custom road corridor to ALL demo buses
 */
export function setAllBusesCustomCorridor(
  origin: DemoStop,
  destination: DemoStop,
  waypoints: { lat: number; lng: number }[],
  intermediateStops: DemoStop[] = []
) {
  Object.keys(runtimeStore).forEach((busId) => {
    setBusCustomCorridor(busId, origin, destination, waypoints, intermediateStops);
  });
}

/**
 * Add a new stop along a bus's route dynamically
 */
export function addStopToBusRoute(busId: string, newStop: DemoStop, insertIndex?: number) {
  const runtime = runtimeStore[busId];
  if (!runtime) return;

  const stops = [...runtime.def.stops];
  if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= stops.length) {
    stops.splice(insertIndex, 0, newStop);
  } else {
    stops.splice(Math.max(1, stops.length - 1), 0, newStop);
  }

  runtime.def.stops = stops;
  notifyListeners();
}

/**
 * Dynamically register a new bus into the simulator fleet
 */
export function addNewCustomBus(busData: {
  busNumber: string;
  plateNumber: string;
  routeId: string;
  busType?: 'EV Metro Shuttle' | 'AC Express' | 'Standard City' | 'Mini Bus';
  color?: string;
  driverName?: string;
}): BusSimRuntime {
  const id = `demo-bus-custom-${Date.now()}`;
  const route = AVAILABLE_DEMO_ROUTES.find((r) => r.id === busData.routeId) || AVAILABLE_DEMO_ROUTES[0];
  const def: DemoBusDefinition = {
    id,
    busNumber: busData.busNumber,
    plateNumber: busData.plateNumber,
    tripId: `trip-${id}`,
    routeId: route.id,
    routeNumber: route.routeNumber,
    routeName: route.routeName,
    origin: route.origin,
    destination: route.destination,
    color: busData.color || route.color || '#7847CB',
    stops: [...route.stops],
    waypoints: [...route.waypoints],
    initialIndex: 0
  };

  DEMO_BUS_DEFINITIONS.push(def);
  const runtime: BusSimRuntime = {
    id,
    def,
    isRunning: false,
    currentIndex: 0,
    direction: 1,
    speedMultiplier: 1,
    delayMinutes: 0,
    currentBus: null,
    progressPercent: 0
  };
  runtimeStore[id] = runtime;

  try {
    const customBuses = DEMO_BUS_DEFINITIONS.filter((b) => b.id.startsWith('demo-bus-custom-'));
    localStorage.setItem('nagarst_custom_buses', JSON.stringify(customBuses));
  } catch (_) {}

  notifyListeners();
  return runtime;
}

/**
 * Dynamically register a new custom route into the system
 */
export function addNewCustomRoute(routeData: {
  routeNumber: string;
  routeName: string;
  origin: string;
  destination: string;
  color?: string;
  stops: DemoStop[];
  waypoints: { lat: number; lng: number }[];
  description?: string;
}): DemoRoutePreset {
  const id = `custom-route-${Date.now()}`;
  const preset: DemoRoutePreset = {
    id,
    routeNumber: routeData.routeNumber,
    routeName: routeData.routeName,
    origin: routeData.origin,
    destination: routeData.destination,
    color: routeData.color || '#7847CB',
    description: routeData.description || `${routeData.origin} ↔ ${routeData.destination}`,
    stops: routeData.stops,
    waypoints: routeData.waypoints
  };

  AVAILABLE_DEMO_ROUTES.push(preset);

  try {
    const customRoutes = AVAILABLE_DEMO_ROUTES.filter((r) => r.id.startsWith('custom-route-'));
    localStorage.setItem('nagarst_custom_routes', JSON.stringify(customRoutes));
  } catch (_) {}

  notifyListeners();
  return preset;
}

// =========================================================================
// BACKWARD COMPATIBILITY EXPORTS (matches previous single-bus interface)
// =========================================================================

export function startDemoSimulation(options?: { speedMultiplier?: number; delayMinutes?: number }) {
  startAllBuses(options);
}

export function stopDemoSimulation() {
  stopAllBuses();
}

export function setDemoReplaySpeed(multiplier: number) {
  setAllBusSpeed(multiplier);
}

export function setDemoDelay(minutes: number) {
  Object.keys(runtimeStore).forEach(id => setBusDelay(id, minutes));
}

export function getDemoSimulatorState(): DemoSimulatorState {
  const bus1 = runtimeStore[DEMO_BUS_ID];
  const anyRunning = Object.values(runtimeStore).some(r => r.isRunning);
  const activeCount = Object.values(runtimeStore).filter(r => r.isRunning).length;

  return {
    isRunning: anyRunning,
    currentIndex: bus1?.currentIndex || 0,
    speedMultiplier: bus1?.speedMultiplier || 1,
    delayMinutes: bus1?.delayMinutes || 0,
    currentBus: bus1?.currentBus || null,
    progressPercent: bus1?.progressPercent || 0,
    activeBusCount: activeCount,
    buses: { ...runtimeStore }
  };
}

export function subscribeToDemoState(listener: (s: DemoSimulatorState) => void): () => void {
  listeners.add(listener);
  listener(getDemoSimulatorState());
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Synchronizes the simulator fleet and available corridors with City Admin's configured routes and fleet
 */
export function syncSimulatorFleetWithAdminConfig(buses: Bus[], routes: Route[]) {
  // 1. Add any configured routes from admin to AVAILABLE_DEMO_ROUTES if not already present
  routes.forEach((r: Route) => {
    if (!r.stops || r.stops.length < 2) return;
    const existing = AVAILABLE_DEMO_ROUTES.find(dr => dr.id === r.id);
    const waypoints = (r.route_path && r.route_path.length > 1) 
      ? r.route_path 
      : r.stops.map((s: RouteStop) => ({ lat: s.lat, lng: s.lng }));

    const stops: DemoStop[] = r.stops.map((s: RouteStop, idx: number) => ({
      id: s.stopId || `stop-${idx}`,
      name: s.stopName || `Stop ${idx + 1}`,
      lat: s.lat,
      lng: s.lng
    }));

    if (existing) {
      existing.routeNumber = r.routeNumber;
      existing.routeName = r.name;
      existing.origin = r.origin;
      existing.destination = r.destination;
      existing.waypoints = waypoints;
      existing.stops = stops;
    } else {
      AVAILABLE_DEMO_ROUTES.push({
        id: r.id,
        routeNumber: r.routeNumber,
        routeName: r.name,
        origin: r.origin,
        destination: r.destination,
        color: r.color || '#7847CB',
        description: `${r.origin} ➔ ${r.destination}`,
        stops,
        waypoints
      });
    }
  });

  // 2. Add or update registered buses into DEMO_BUS_DEFINITIONS and runtimeStore
  buses.forEach((b) => {
    if (!b.routeId) return;
    const assignedRoute = AVAILABLE_DEMO_ROUTES.find(r => r.id === b.routeId);
    if (!assignedRoute || assignedRoute.waypoints.length < 2) return;

    let existingDef = DEMO_BUS_DEFINITIONS.find(d => d.id === b.id || d.busNumber === b.busNumber);
    if (!existingDef) {
      existingDef = {
        id: b.id,
        busNumber: b.busNumber,
        plateNumber: b.plateNumber || b.busNumber,
        tripId: `trip-${b.id}`,
        routeId: assignedRoute.id,
        routeNumber: assignedRoute.routeNumber,
        routeName: assignedRoute.routeName,
        origin: assignedRoute.origin,
        destination: assignedRoute.destination,
        color: '#7847CB',
        stops: [...assignedRoute.stops],
        waypoints: [...assignedRoute.waypoints],
        initialIndex: 0
      };
      DEMO_BUS_DEFINITIONS.push(existingDef);
    } else {
      existingDef.routeId = assignedRoute.id;
      existingDef.routeNumber = assignedRoute.routeNumber;
      existingDef.routeName = assignedRoute.routeName;
      existingDef.origin = assignedRoute.origin;
      existingDef.destination = assignedRoute.destination;
      existingDef.stops = [...assignedRoute.stops];
      existingDef.waypoints = [...assignedRoute.waypoints];
    }

    if (!runtimeStore[existingDef.id]) {
      runtimeStore[existingDef.id] = {
        id: existingDef.id,
        def: existingDef,
        isRunning: false,
        currentIndex: 0,
        direction: 1,
        speedMultiplier: 1,
        delayMinutes: 0,
        currentBus: null,
        progressPercent: 0
      };
    } else {
      runtimeStore[existingDef.id].def = existingDef;
    }
  });

  notifyListeners();
}


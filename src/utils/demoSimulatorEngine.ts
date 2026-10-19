import type { Bus } from '../types';
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
  { lat: 19.0975, lng: 74.7420 }, // CBS
  { lat: 19.0971, lng: 74.7441 },
  { lat: 19.0963, lng: 74.7468 },
  { lat: 19.0952, lng: 74.7496 }, // Swastik Chowk
  { lat: 19.0970, lng: 74.7492 },
  { lat: 19.0991, lng: 74.7487 },
  { lat: 19.1020, lng: 74.7480 }, // Delhi Gate Circle
  { lat: 19.1042, lng: 74.7458 },
  { lat: 19.1068, lng: 74.7436 },
  { lat: 19.1095, lng: 74.7412 },
  { lat: 19.1130, lng: 74.7390 }, // Premdan Chowk
  { lat: 19.1158, lng: 74.7378 },
  { lat: 19.1189, lng: 74.7364 },
  { lat: 19.1220, lng: 74.7350 }, // Savedi Terminal
  { lat: 19.1265, lng: 74.7328 },
  { lat: 19.1310, lng: 74.7302 },
  { lat: 19.1360, lng: 74.7275 },
  { lat: 19.1415, lng: 74.7248 },
  { lat: 19.1470, lng: 74.7220 },
  { lat: 19.1510, lng: 74.7200 },
  { lat: 19.1550, lng: 74.7180 }  // MIDC Nagapur Sector 1
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
  { lat: 19.1220, lng: 74.7350 }, // Savedi Terminal
  { lat: 19.1192, lng: 74.7364 },
  { lat: 19.1161, lng: 74.7377 },
  { lat: 19.1130, lng: 74.7390 }, // Premdan Chowk
  { lat: 19.1090, lng: 74.7408 },
  { lat: 19.1052, lng: 74.7425 },
  { lat: 19.1018, lng: 74.7441 },
  { lat: 19.0980, lng: 74.7450 }, // Wadia Park
  { lat: 19.0977, lng: 74.7435 },
  { lat: 19.0975, lng: 74.7420 }, // Central Bus Stand
  { lat: 19.0945, lng: 74.7412 },
  { lat: 19.0912, lng: 74.7404 },
  { lat: 19.0878, lng: 74.7395 },
  { lat: 19.0845, lng: 74.7388 },
  { lat: 19.0810, lng: 74.7380 }  // Central Railway Station
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

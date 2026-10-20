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

export const DEMO_STOPS_BUS_1: DemoStop[] = [];
export const DEMO_WAYPOINTS_BUS_1: { lat: number; lng: number }[] = [];
export const DEMO_STOPS: DemoStop[] = [];
export const DEMO_WAYPOINTS: { lat: number; lng: number }[] = [];

export const DEMO_STOPS_BUS_2: DemoStop[] = [];
export const DEMO_WAYPOINTS_BUS_2: { lat: number; lng: number }[] = [];

export const DEMO_STOPS_BUS_3: DemoStop[] = [];
export const DEMO_WAYPOINTS_BUS_3: { lat: number; lng: number }[] = [];

export const DEMO_STOPS_BUS_24: DemoStop[] = [];
export const DEMO_WAYPOINTS_BUS_24: { lat: number; lng: number }[] = [];

export const DEMO_STOPS_BUS_7: DemoStop[] = [];
export const DEMO_WAYPOINTS_BUS_7: { lat: number; lng: number }[] = [];

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

// Routes are dynamically loaded from Route Corridors tab - no hardcoded routes
export let AVAILABLE_DEMO_ROUTES: DemoRoutePreset[] = [];

// =========================================================================
// MULTI-BUS DEFINITION REGISTRY
// =========================================================================
export const DEMO_BUS_DEFINITIONS: DemoBusDefinition[] = [
  {
    id: 'demo-bus-sim-01',
    busNumber: 'MH-16-DEMO-1',
    plateNumber: 'MH-16-DM-101',
    tripId: 'demo-trip-sim-001',
    routeId: '',
    routeNumber: 'Unassigned',
    routeName: 'Select Route from Corridors',
    origin: '',
    destination: '',
    color: '#7847CB',
    stops: [],
    waypoints: [],
    initialIndex: 0
  },
  {
    id: 'demo-bus-sim-02',
    busNumber: 'MH-16-DEMO-2',
    plateNumber: 'MH-16-DM-102',
    tripId: 'demo-trip-sim-002',
    routeId: '',
    routeNumber: 'Unassigned',
    routeName: 'Select Route from Corridors',
    origin: '',
    destination: '',
    color: '#2563eb',
    stops: [],
    waypoints: [],
    initialIndex: 0
  },
  {
    id: 'demo-bus-sim-03',
    busNumber: 'MH-16-DEMO-3',
    plateNumber: 'MH-16-DM-103',
    tripId: 'demo-trip-sim-003',
    routeId: '',
    routeNumber: 'Unassigned',
    routeName: 'Select Route from Corridors',
    origin: '',
    destination: '',
    color: '#059669',
    stops: [],
    waypoints: [],
    initialIndex: 0
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
    progressPercent: def.waypoints.length > 1 ? Math.round((def.initialIndex / (def.waypoints.length - 1)) * 100) : 0
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

  if (!waypoints || waypoints.length === 0) {
    return {
      id: def.id,
      busNumber: def.busNumber,
      plateNumber: def.plateNumber,
      routeId: def.routeId,
      routeNumber: def.routeNumber,
      routeName: def.routeName,
      origin: def.origin || 'Unassigned',
      destination: def.destination || 'Unassigned',
      currentStopId: 'none',
      currentStopName: 'Not Started',
      nextStopId: 'none',
      nextStopName: 'Assign Route from Corridors',
      etaToNextMinutes: 0,
      delayMinutes: delayMinutes,
      speedKmh: 0,
      occupancy: 'moderate',
      status: 'on_time',
      lat: 19.0975,
      lng: 74.7420,
      heading: 0,
      driverName: `Demo Pilot (${def.busNumber})`,
      conductorName: 'Simulated Crew',
      busType: 'EV Metro Shuttle',
      isDemo: true,
      lastUpdated: new Date().toISOString()
    };
  }

  const safeIdx = Math.max(0, Math.min(currentIndex, waypoints.length - 1));
  const currentPt = waypoints[safeIdx];
  
  // Lookahead for bearing calculation
  const nextIdx = (safeIdx + runtime.direction + waypoints.length) % waypoints.length;
  const nextPt = waypoints[nextIdx];
  
  const heading = Math.round(getBearing(currentPt, nextPt));
  const baseSpeed = 28 + Math.floor(Math.sin(safeIdx) * 8);
  const speedKmh = Math.max(16, baseSpeed);

  // Dynamic next-stop and ETA calculation
  const progressRatio = waypoints.length > 1 ? safeIdx / (waypoints.length - 1) : 0;
  
  let curStopName = def.origin || 'Origin Terminal';
  let nextStopName = def.destination || 'Destination Terminal';
  let curStopId = 'origin-stop';
  let nextStopId = 'dest-stop';
  let distToNext = 1000;

  if (def.stops && def.stops.length >= 2) {
    const stopIndex = Math.min(
      def.stops.length - 2,
      Math.max(0, Math.floor(progressRatio * (def.stops.length - 1)))
    );
    const curStop = def.stops[stopIndex];
    const nextStop = def.stops[stopIndex + 1] || def.stops[def.stops.length - 1];
    curStopId = curStop.id;
    curStopName = curStop.name;
    nextStopId = nextStop.id;
    nextStopName = nextStop.name;
    distToNext = getDistance(currentPt, nextStop);
  }

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
    currentStopId: curStopId,
    currentStopName: curStopName,
    nextStopId: nextStopId,
    nextStopName: nextStopName,
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

  const origin = stops.length > 0 ? stops[0].name : preset.origin;
  const destination = stops.length > 0 ? stops[stops.length - 1].name : preset.destination;

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
  // 1. Rebuild AVAILABLE_DEMO_ROUTES strictly from Admin Configured routes
  AVAILABLE_DEMO_ROUTES.length = 0;

  routes.forEach((r: Route) => {
    if (!r.stops || r.stops.length < 2) return;
    const waypoints = (r.route_path && r.route_path.length > 1) 
      ? r.route_path 
      : r.stops.map((s: RouteStop) => ({ lat: s.lat, lng: s.lng }));

    const stops: DemoStop[] = r.stops.map((s: RouteStop, idx: number) => ({
      id: s.stopId || `stop-${idx}`,
      name: s.stopName || `Stop ${idx + 1}`,
      lat: s.lat,
      lng: s.lng
    }));

    AVAILABLE_DEMO_ROUTES.push({
      id: r.id,
      routeNumber: r.routeNumber,
      routeName: r.name || `${r.routeNumber}: ${r.origin} ↔ ${r.destination}`,
      origin: r.origin,
      destination: r.destination,
      color: r.color || '#7847CB',
      description: `${r.origin} ➔ ${r.destination}`,
      stops,
      waypoints
    });
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


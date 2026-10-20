import type { Bus, Route, RouteStop } from '../types';
import { getDistance, getBearing, fetchOSRMRoute } from './routing';

export const DEMO_BUS_ID = 'demo-bus-1515';
export const DEMO_BUS_NUMBER = 'MH-16 BT-1515';
export const DEMO_PLATE_NUMBER = 'MH-16 BT-1515';
export const DEMO_TRIP_ID = 'demo-trip-1515';

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

/**
 * Densifies a polyline into evenly spaced sub-waypoints (~25-35m apart)
 * so buses glide smoothly along actual roads continuously without getting stuck.
 */
export function densifyPath(path: { lat: number; lng: number }[], targetPoints = 120): { lat: number; lng: number }[] {
  if (!path || path.length === 0) return [];
  if (path.length === 1) return [path[0], path[0]];
  if (path.length >= targetPoints) return path;

  let totalDist = 0;
  for (let i = 0; i < path.length - 1; i++) {
    totalDist += getDistance(path[i], path[i + 1]);
  }
  if (totalDist <= 0) return path;

  const result: { lat: number; lng: number }[] = [];
  const stepDist = totalDist / (targetPoints - 1);

  result.push({ lat: path[0].lat, lng: path[0].lng });

  for (let p = 1; p < targetPoints - 1; p++) {
    const targetDist = p * stepDist;
    let accumulated = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const segDist = getDistance(path[i], path[i + 1]);
      if (accumulated + segDist >= targetDist) {
        const remaining = targetDist - accumulated;
        const ratio = segDist > 0 ? remaining / segDist : 0;
        result.push({
          lat: Number((path[i].lat + (path[i + 1].lat - path[i].lat) * ratio).toFixed(6)),
          lng: Number((path[i].lng + (path[i + 1].lng - path[i].lng) * ratio).toFixed(6)),
        });
        break;
      }
      accumulated += segDist;
    }
  }

  result.push({ lat: path[path.length - 1].lat, lng: path[path.length - 1].lng });
  return result;
}

// =========================================================================
// AUTHORITATIVE ROUTE CORRIDORS FOR AHILYANAGAR
// =========================================================================
export const AUTHORITATIVE_R01_WAYPOINTS = [
  { lat: 19.0910, lng: 74.7290 },
  { lat: 19.0925, lng: 74.7315 },
  { lat: 19.0940, lng: 74.7350 },
  { lat: 19.0975, lng: 74.7420 },
  { lat: 19.0900, lng: 74.7440 },
  { lat: 19.0830, lng: 74.7460 },
];
export const AUTHORITATIVE_R01_STOPS: DemoStop[] = [
  { id: 'stop-mw', name: 'माळीवाडा गल्ली', lat: 19.0910, lng: 74.7290 },
  { id: 'stop-swk', name: 'Swastik Chowk', lat: 19.0940, lng: 74.7350 },
  { id: 'stop-cbs', name: 'Ahilyanagar CBS', lat: 19.0975, lng: 74.7420 },
  { id: 'stop-dairy', name: 'Dairy Chowk', lat: 19.0830, lng: 74.7460 },
];

export const AUTHORITATIVE_R02_WAYPOINTS = [
  { lat: 19.1025, lng: 74.7380 },
  { lat: 19.1060, lng: 74.7385 },
  { lat: 19.1090, lng: 74.7395 },
  { lat: 19.1150, lng: 74.7430 },
  { lat: 19.1235, lng: 74.7490 },
  { lat: 19.1320, lng: 74.7550 },
];
export const AUTHORITATIVE_R02_STOPS: DemoStop[] = [
  { id: 'stop-mg', name: 'Mahatma Gandhi Road', lat: 19.1025, lng: 74.7380 },
  { id: 'stop-gandhi-chk', name: 'Gandhi Chowk', lat: 19.1090, lng: 74.7395 },
  { id: 'stop-delhi-gate', name: 'Delhi Gate Transit', lat: 19.1150, lng: 74.7430 },
  { id: 'stop-sambhaji', name: 'Chhatrapati Sambhaji Nagar', lat: 19.1320, lng: 74.7550 },
];

export const DEFAULT_DEMO_ROUTES: DemoRoutePreset[] = [
  {
    id: 'R-01',
    routeNumber: 'R-01',
    routeName: 'R-01: माळीवाडा गल्ली ↔ Dairy Chowk',
    origin: 'माळीवाडा गल्ली',
    destination: 'Dairy Chowk',
    color: '#7847CB',
    description: 'माळीवाडा गल्ली ➔ Swastik Chowk ➔ CBS ➔ Dairy Chowk',
    stops: AUTHORITATIVE_R01_STOPS,
    waypoints: densifyPath(AUTHORITATIVE_R01_WAYPOINTS, 120),
  },
  {
    id: 'R-02',
    routeNumber: 'R-02',
    routeName: 'R-02: Mahatma Gandhi Road ↔ Chhatrapati Sambhaji Nagar',
    origin: 'Mahatma Gandhi Road',
    destination: 'Chhatrapati Sambhaji Nagar',
    color: '#d97706',
    description: 'MG Road ➔ Gandhi Chowk ➔ Delhi Gate ➔ Chhatrapati Sambhaji Nagar',
    stops: AUTHORITATIVE_R02_STOPS,
    waypoints: densifyPath(AUTHORITATIVE_R02_WAYPOINTS, 120),
  }
];

export let AVAILABLE_DEMO_ROUTES: DemoRoutePreset[] = [];

// =========================================================================
// MULTI-BUS DEFINITION REGISTRY
// =========================================================================
export const DEMO_BUS_DEFINITIONS: DemoBusDefinition[] = [];

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

// Purge any previously deleted demo buses from DEMO_BUS_DEFINITIONS
try {
  const deletedIdsRaw = typeof window !== 'undefined' ? localStorage.getItem('nagarst_deleted_demo_buses') : null;
  const deletedIds: string[] = deletedIdsRaw ? JSON.parse(deletedIdsRaw) : [];
  ['demo-bus-1516', 'MH-16 BT-1516'].forEach(legacyId => {
    if (!deletedIds.includes(legacyId)) deletedIds.push(legacyId);
  });
  if (typeof window !== 'undefined') {
    localStorage.setItem('nagarst_deleted_demo_buses', JSON.stringify(deletedIds));
    const demoRaw = localStorage.getItem('nagarst_demo_buses');
    if (demoRaw) {
      const demoBuses = JSON.parse(demoRaw);
      delete demoBuses['demo-bus-1516'];
      delete demoBuses['MH-16 BT-1516'];
      if (demoBuses['demo-bus-1515'] && demoBuses['demo-bus-1515'].routeNumber === 'Route 1-B') {
        delete demoBuses['demo-bus-1515'];
      }
      localStorage.setItem('nagarst_demo_buses', JSON.stringify(demoBuses));
    }
  }

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

  if (deletedIds.length > 0) {
    for (let i = DEMO_BUS_DEFINITIONS.length - 1; i >= 0; i--) {
      const d = DEMO_BUS_DEFINITIONS[i];
      if (isDeleted(d.id, d.busNumber, d.plateNumber)) {
        DEMO_BUS_DEFINITIONS.splice(i, 1);
      }
    }
  }

  // Restore any custom buses created by admin (filtering out any deleted ones!)
  const customBusesRaw = typeof window !== 'undefined' ? localStorage.getItem('nagarst_custom_buses') : null;
  if (customBusesRaw) {
    const customBuses: any[] = JSON.parse(customBusesRaw);
    if (customBuses.length > 0) {
      customBuses.forEach(cb => {
        const bNum = cb.busNumber || cb.bus_number;
        const pNum = cb.plateNumber || cb.plate_number;
        if (isDeleted(cb.id, bNum, pNum)) return;
        const existingIdx = DEMO_BUS_DEFINITIONS.findIndex(d => d.id === cb.id || d.busNumber.trim().toUpperCase() === (bNum || '').trim().toUpperCase());
        if (existingIdx !== -1) {
          DEMO_BUS_DEFINITIONS[existingIdx] = { ...DEMO_BUS_DEFINITIONS[existingIdx], ...cb };
        } else {
          DEMO_BUS_DEFINITIONS.push({
            id: cb.id,
            busNumber: bNum,
            plateNumber: pNum || bNum,
            tripId: `trip-${cb.id}`,
            routeId: cb.routeId || '',
            routeNumber: cb.routeNumber || '',
            routeName: cb.routeName || '',
            origin: cb.origin || 'Origin',
            destination: cb.destination || 'Destination',
            color: cb.color || '#7847CB',
            stops: cb.stops || [],
            waypoints: cb.waypoints || [],
            initialIndex: 0
          });
        }
      });
    }
  }

  // Deduplicate DEMO_BUS_DEFINITIONS by busNumber to strictly ensure NO duplicate buses exist
  const seenNumbers = new Set<string>();
  for (let i = DEMO_BUS_DEFINITIONS.length - 1; i >= 0; i--) {
    const key = DEMO_BUS_DEFINITIONS[i].busNumber.trim().toUpperCase().replace(/\s+/g, '');
    if (seenNumbers.has(key)) {
      DEMO_BUS_DEFINITIONS.splice(i, 1);
    } else {
      seenNumbers.add(key);
    }
  }
} catch (_) {}

// Restore any saved route assignments (sanitizing corrupted or mismatched coordinates)
try {
  const assignmentsRaw = typeof window !== 'undefined' ? localStorage.getItem('nagarst_demo_assignments') : null;
  if (assignmentsRaw) {
    const assignments: Record<string, Partial<DemoBusDefinition>> = JSON.parse(assignmentsRaw);
    let changed = false;
    Object.keys(assignments).forEach(busId => {
      const a = assignments[busId];
      if (a) {
        const isDairy = (a.destination || '').toLowerCase().includes('dairy') || (a.routeName || '').toLowerCase().includes('dairy');
        const endLat = a.stops && a.stops.length > 0 ? a.stops[a.stops.length - 1].lat : 0;
        const endWpLat = a.waypoints && a.waypoints.length > 0 ? a.waypoints[a.waypoints.length - 1].lat : 0;
        // If Dairy Chowk is corrupted with Savedi/MIDC coordinates (> 19.10), purge this stale assignment
        if (isDairy && (endLat > 19.10 || endWpLat > 19.10)) {
          delete assignments[busId];
          changed = true;
          return;
        }
      }
      const def = DEMO_BUS_DEFINITIONS.find(d => d.id === busId || d.busNumber === busId);
      if (def) {
        Object.assign(def, assignments[busId]);
      }
    });
    if (changed && typeof window !== 'undefined') {
      localStorage.setItem('nagarst_demo_assignments', JSON.stringify(assignments));
    }
  }
} catch (_) {}

// Sanitize any configured routes in localStorage that had Dairy Chowk with Savedi/MIDC coordinates
try {
  const confRaw = typeof window !== 'undefined' ? localStorage.getItem('nagarst_configured_routes') : null;
  if (confRaw) {
    const confRoutes = JSON.parse(confRaw);
    let modified = false;
    confRoutes.forEach((cr: any) => {
      const isDairy = (cr.destination || '').toLowerCase().includes('dairy') || (cr.name || '').toLowerCase().includes('dairy');
      if (isDairy) {
        const lastStop = cr.stops && cr.stops.length > 0 ? cr.stops[cr.stops.length - 1] : null;
        if (lastStop && lastStop.lat > 19.10) {
          lastStop.lat = 19.0830;
          lastStop.lng = 74.7460;
          cr.stops = [...AUTHORITATIVE_R01_STOPS];
          cr.route_path = densifyPath(AUTHORITATIVE_R01_WAYPOINTS, 120);
          modified = true;
        }
      }
    });
    if (modified && typeof window !== 'undefined') {
      localStorage.setItem('nagarst_configured_routes', JSON.stringify(confRoutes));
    }
  }
} catch (_) {}

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

// Ensure initial demo fleet aggregate is populated in localStorage immediately on load, strictly purged of deleted buses
try {
  const deletedIdsRaw = typeof window !== 'undefined' ? localStorage.getItem('nagarst_deleted_demo_buses') : null;
  const deletedIds: string[] = deletedIdsRaw ? JSON.parse(deletedIdsRaw) : [];
  const initAggregate: Record<string, Bus> = {};
  Object.values(runtimeStore).forEach(r => {
    if (deletedIds.includes(r.id) || deletedIds.includes(r.def.busNumber)) return;
    const b = r.currentBus || buildBusTelemetry(r);
    if (b) initAggregate[r.id] = b;
  });
  if (typeof window !== 'undefined') {
    localStorage.setItem('nagarst_demo_buses', JSON.stringify(initAggregate));
  }
} catch (_) {}

// Only snap to OSRM if waypoints are completely missing (less than 10 points), preserving dense street waypoints
if (typeof window !== 'undefined') {
  setTimeout(() => {
    DEMO_BUS_DEFINITIONS.forEach(def => {
      if ((!def.waypoints || def.waypoints.length < 10) && def.stops && def.stops.length >= 2) {
        fetchOSRMRoute(def.stops.map(s => ({ lat: s.lat, lng: s.lng }))).then(snapped => {
          if (snapped && snapped.length > 5) {
            def.waypoints = densifyPath(snapped, 120);
            if (runtimeStore[def.id]) {
              runtimeStore[def.id].def.waypoints = def.waypoints;
              const updated = buildBusTelemetry(runtimeStore[def.id]);
              runtimeStore[def.id].currentBus = updated;
              broadcastBusLocation(updated);
              notifyListeners();
            }
          }
        }).catch(() => {});
      }
    });
  }, 300);
}

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
export function buildBusTelemetry(runtime: BusSimRuntime): Bus {
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

  const maxCapacity = 42;
  const seed = (def.id || 'bus').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const cycleVal = Math.sin((safeIdx * 0.35) + seed);
  const currentPassengerCount = Math.min(
    maxCapacity,
    Math.max(12, Math.floor(25 + cycleVal * 11))
  );
  const availableSeats = Math.max(0, maxCapacity - currentPassengerCount);
  const occupancy = currentPassengerCount > 34 ? ('high' as const) : currentPassengerCount > 20 ? ('moderate' as const) : ('low' as const);

  const distanceToNextMeters = Math.round(distToNext);
  const batteryLevel = Math.max(42, Math.min(99, 94 - Math.floor(((safeIdx * 2) + seed) % 50)));
  const currentLocationName = curStopName
    ? (distToNext < 180 ? `At ${curStopName}` : `Near ${curStopName}, en route to ${nextStopName}`)
    : 'Ahilyanagar Transit Corridor';

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
    occupancy: occupancy,
    status: status,
    lat: currentPt.lat,
    lng: currentPt.lng,
    heading: heading,
    driverName: `Demo Pilot (${def.busNumber})`,
    conductorName: 'Duty Conductor',
    busType: 'EV Metro Shuttle',
    isDemo: true,
    passengerCount: currentPassengerCount,
    maxCapacity: maxCapacity,
    availableSeats: availableSeats,
    distanceToNextMeters: distanceToNextMeters,
    batteryLevel: batteryLevel,
    currentLocationName: currentLocationName,
    isAc: true,
    temperature: '23°C',
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
    // Save aggregate demo fleet with ALL demo buses (both running & standby)
    const aggregate: Record<string, Bus> = {};
    Object.values(runtimeStore).forEach(r => {
      const b = r.currentBus || buildBusTelemetry(r);
      if (b) aggregate[r.id] = b;
    });
    localStorage.setItem('nagarst_demo_buses', JSON.stringify(aggregate));
    if (bus.id === DEMO_BUS_ID) {
      localStorage.setItem('nagarst_demo_bus', JSON.stringify(bus));
    }

    if (ch) {
      ch.postMessage({ type: 'fleetSync', buses: aggregate });
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
      if (r.id !== busId) {
        const b = r.currentBus || buildBusTelemetry(r);
        if (b) aggregate[r.id] = b;
      }
    });
    localStorage.setItem('nagarst_demo_buses', JSON.stringify(aggregate));
    if (ch) {
      ch.postMessage({ type: 'fleetSync', buses: aggregate });
    }
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
    if (!waypoints || waypoints.length < 2) return;

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
export function ensureTimerRunning() {
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
  const ms = Math.max(100, Math.round(800 / maxSpeed));

  if (activeInterval) clearInterval(activeInterval);
  activeInterval = setInterval(tickDemoSimulation, ms);
}

// Keep simulation active when switching between tabs
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      ensureTimerRunning();
    }
  });
}

// Restore running simulator state from localStorage on load if previously running
try {
  const savedDemoBuses = typeof window !== 'undefined' ? localStorage.getItem('nagarst_demo_buses') : null;
  if (savedDemoBuses) {
    const parsed = JSON.parse(savedDemoBuses);
    if (parsed && typeof parsed === 'object') {
      const ids = Object.keys(parsed);
      if (ids.length > 0) {
        ids.forEach(busId => {
          if (runtimeStore[busId]) {
            runtimeStore[busId].isRunning = true;
            runtimeStore[busId].currentBus = parsed[busId];
          }
        });
        ensureTimerRunning();
      }
    }
  }
} catch (_) {}

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
  // Bus remains stationary on the corridor at its current progress
  const bus = buildBusTelemetry(runtime);
  runtime.currentBus = bus;
  broadcastBusLocation(bus);

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
 * Reset all demo buses back to their starting terminal origins and restart movement immediately
 */
export function resetAllBuses(options?: { speedMultiplier?: number }) {
  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }

  Object.values(runtimeStore).forEach(runtime => {
    // 1. Ensure waypoints are densified along the actual road corridor (minimum 120 points)
    if (!runtime.def.waypoints || runtime.def.waypoints.length < 15) {
      if (runtime.def.stops && runtime.def.stops.length >= 2) {
        runtime.def.waypoints = densifyPath(runtime.def.stops.map(s => ({ lat: s.lat, lng: s.lng })), 120);
      } else {
        runtime.def.waypoints = densifyPath([
          { lat: 19.0910, lng: 74.7290 },
          { lat: 19.0975, lng: 74.7420 },
          { lat: 19.1025, lng: 74.7380 },
          { lat: 19.1235, lng: 74.7321 }
        ], 120);
      }
    }

    // 2. Reset position to initial origin terminal
    runtime.currentIndex = 0;
    runtime.direction = 1;
    runtime.progressPercent = 0;
    runtime.isRunning = true;
    if (options?.speedMultiplier) runtime.speedMultiplier = options.speedMultiplier;

    // 3. Build fresh telemetry at origin and broadcast immediately
    const bus = buildBusTelemetry(runtime);
    runtime.currentBus = bus;
    broadcastBusLocation(bus);
  });

  // 4. Restart continuous simulation timer
  ensureTimerRunning();
  notifyListeners();

  const ch = getBroadcastChannel();
  if (ch) {
    ch.postMessage({ type: 'resetDemo' });
  }
}

/**
 * Reset a single demo bus to its starting point and run
 */
export function resetBus(busId: string) {
  const runtime = runtimeStore[busId];
  if (!runtime) return;

  if (!runtime.def.waypoints || runtime.def.waypoints.length < 15) {
    if (runtime.def.stops && runtime.def.stops.length >= 2) {
      runtime.def.waypoints = densifyPath(runtime.def.stops.map(s => ({ lat: s.lat, lng: s.lng })), 120);
    }
  }

  runtime.currentIndex = 0;
  runtime.direction = 1;
  runtime.progressPercent = 0;
  runtime.isRunning = true;

  const bus = buildBusTelemetry(runtime);
  runtime.currentBus = bus;
  broadcastBusLocation(bus);

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
    const bus = buildBusTelemetry(runtime);
    runtime.currentBus = bus;
    broadcastBusLocation(bus);
  });

  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }

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
      if (wpLower < wpUpper) {
        waypoints = waypoints.slice(wpLower, wpUpper + 1);
        if (wpStart > wpEnd) waypoints.reverse();
      }
    }
  }

  if (waypoints.length < 2 && stops.length >= 2) {
    waypoints = [{ lat: stops[0].lat, lng: stops[0].lng }, { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng }];
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
    waypoints: densifyPath(waypoints, 120)
  };

  runtime.currentIndex = 0;
  runtime.direction = 1;
  runtime.progressPercent = 0;

  const bus = buildBusTelemetry(runtime);
  runtime.currentBus = bus;
  broadcastBusLocation(bus);

  if (runtime.isRunning) {
    ensureTimerRunning();
  }

  // Persist route assignment to localStorage for cross-tab sync
  try {
    const raw = localStorage.getItem('nagarst_demo_assignments');
    const assignments = raw ? JSON.parse(raw) : {};
    assignments[busId] = {
      routeId: runtime.def.routeId,
      routeNumber: runtime.def.routeNumber,
      routeName: runtime.def.routeName,
      origin: runtime.def.origin,
      destination: runtime.def.destination,
      color: runtime.def.color,
      stops: runtime.def.stops,
      waypoints: runtime.def.waypoints
    };
    localStorage.setItem('nagarst_demo_assignments', JSON.stringify(assignments));
  } catch (_) {}

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
    waypoints: densifyPath(waypoints.length > 1 ? waypoints : [origin, destination], 150)
  };

  runtime.currentIndex = 0;
  runtime.direction = 1;
  runtime.progressPercent = 0;

  const bus = buildBusTelemetry(runtime);
  runtime.currentBus = bus;
  broadcastBusLocation(bus);

  if (runtime.isRunning) {
    ensureTimerRunning();
  }

  // Persist route assignment to localStorage for cross-tab sync
  try {
    const raw = localStorage.getItem('nagarst_demo_assignments');
    const assignments = raw ? JSON.parse(raw) : {};
    assignments[busId] = {
      routeId: runtime.def.routeId,
      routeNumber: runtime.def.routeNumber,
      routeName: runtime.def.routeName,
      origin: runtime.def.origin,
      destination: runtime.def.destination,
      color: runtime.def.color,
      stops: runtime.def.stops,
      waypoints: runtime.def.waypoints
    };
    localStorage.setItem('nagarst_demo_assignments', JSON.stringify(assignments));
  } catch (_) {}

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
  const cleanBusNum = busData.busNumber.trim().toUpperCase();

  // Remove any previous bus with the exact same busNumber to strictly prevent duplicate entries
  for (let i = DEMO_BUS_DEFINITIONS.length - 1; i >= 0; i--) {
    if (DEMO_BUS_DEFINITIONS[i].busNumber.trim().toUpperCase() === cleanBusNum) {
      const oldId = DEMO_BUS_DEFINITIONS[i].id;
      delete runtimeStore[oldId];
      DEMO_BUS_DEFINITIONS.splice(i, 1);
    }
  }

  // Remove cleanBusNum from nagarst_deleted_demo_buses if it was previously marked deleted
  try {
    const deletedIdsRaw = localStorage.getItem('nagarst_deleted_demo_buses');
    if (deletedIdsRaw) {
      const deletedIds: string[] = JSON.parse(deletedIdsRaw);
      const filtered = deletedIds.filter(id => id !== cleanBusNum && id !== busData.plateNumber);
      localStorage.setItem('nagarst_deleted_demo_buses', JSON.stringify(filtered));
    }
  } catch (_) {}

  const id = `demo-bus-custom-${Date.now()}`;
  const route = AVAILABLE_DEMO_ROUTES.find((r) => r.id === busData.routeId) || AVAILABLE_DEMO_ROUTES[0];
  const def: DemoBusDefinition = {
    id,
    busNumber: cleanBusNum,
    plateNumber: busData.plateNumber.trim().toUpperCase() || cleanBusNum,
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

  const bus = buildBusTelemetry(runtime);
  runtime.currentBus = bus;

  try {
    const customBuses = DEMO_BUS_DEFINITIONS.filter((b) => b.id.startsWith('demo-bus-custom-') || b.id.startsWith('demo-bus-'));
    localStorage.setItem('nagarst_custom_buses', JSON.stringify(customBuses));
  } catch (_) {}

  broadcastBusLocation(bus);
  notifyListeners();
  return runtime;
}

/**
 * Delete a demo bus completely from the simulator fleet
 */
export function deleteDemoBus(busId: string): boolean {
  const runtime = runtimeStore[busId];
  const busNumber = runtime?.def?.busNumber || DEMO_BUS_DEFINITIONS.find(d => d.id === busId)?.busNumber;
  const plateNumber = runtime?.def?.plateNumber || DEMO_BUS_DEFINITIONS.find(d => d.id === busId)?.plateNumber;

  // 1. Terminate runtime & broadcast offline for both ID and busNumber
  if (runtime) {
    runtime.isRunning = false;
    runtime.currentBus = null;
  }
  broadcastBusOffline(busId);
  if (busNumber && busNumber !== busId) {
    broadcastBusOffline(busNumber);
  }

  // 2. Remove from runtimeStore
  delete runtimeStore[busId];
  Object.keys(runtimeStore).forEach(k => {
    if (runtimeStore[k]?.def?.busNumber === busNumber || runtimeStore[k]?.def?.busNumber === busId) {
      delete runtimeStore[k];
    }
  });

  // 3. Remove from DEMO_BUS_DEFINITIONS
  for (let i = DEMO_BUS_DEFINITIONS.length - 1; i >= 0; i--) {
    const d = DEMO_BUS_DEFINITIONS[i];
    if (d.id === busId || d.busNumber === busId || (busNumber && d.busNumber === busNumber)) {
      DEMO_BUS_DEFINITIONS.splice(i, 1);
    }
  }

  // 4. Update localStorage
  try {
    const customBuses = DEMO_BUS_DEFINITIONS.filter((b) => b.id.startsWith('demo-bus-custom-') || b.id.startsWith('demo-bus-'));
    localStorage.setItem('nagarst_custom_buses', JSON.stringify(customBuses));

    const deletedIdsRaw = localStorage.getItem('nagarst_deleted_demo_buses');
    const deletedIds: string[] = deletedIdsRaw ? JSON.parse(deletedIdsRaw) : [];
    [busId, busNumber, plateNumber].filter(Boolean).forEach(id => {
      const clean = id!.trim();
      if (!deletedIds.includes(clean)) deletedIds.push(clean);
      if (!deletedIds.includes(clean.toUpperCase())) deletedIds.push(clean.toUpperCase());
    });
    localStorage.setItem('nagarst_deleted_demo_buses', JSON.stringify(deletedIds));

    // Remove from demo fleet aggregate in localStorage
    const demoRaw = localStorage.getItem('nagarst_demo_buses');
    const demoBuses = demoRaw ? JSON.parse(demoRaw) : {};
    delete demoBuses[busId];
    if (busNumber) delete demoBuses[busNumber];
    Object.keys(demoBuses).forEach(k => {
      if (demoBuses[k]?.busNumber === busNumber || demoBuses[k]?.id === busId) {
        delete demoBuses[k];
      }
    });
    if (Object.keys(demoBuses).length === 0) {
      localStorage.removeItem('nagarst_demo_buses');
    } else {
      localStorage.setItem('nagarst_demo_buses', JSON.stringify(demoBuses));
    }
    const ch = getBroadcastChannel();
    if (ch) ch.postMessage({ type: 'fleetSync', buses: demoBuses });

    // Remove individual live bus storage items
    localStorage.removeItem('nagarst_live_bus_' + busId);
    if (busNumber) localStorage.removeItem('nagarst_live_bus_' + busNumber);

    const assignmentsRaw = localStorage.getItem('nagarst_demo_assignments');
    if (assignmentsRaw) {
      const assignments = JSON.parse(assignmentsRaw);
      delete assignments[busId];
      if (busNumber) delete assignments[busNumber];
      localStorage.setItem('nagarst_demo_assignments', JSON.stringify(assignments));
    }
  } catch (_) {}

  // 5. Notify all components
  notifyListeners();
  return true;
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
  const bus1 = runtimeStore[DEMO_BUS_ID] || Object.values(runtimeStore)[0];
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

  if (routes && routes.length > 0) {
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
        waypoints: densifyPath(waypoints, 120)
      });
    });
  } else {
    // All routes were deleted by the admin — unassign all buses and clear ghost corridors
    DEMO_BUS_DEFINITIONS.forEach((def) => {
      def.routeId = '';
      def.routeNumber = '';
      def.routeName = '';
      def.stops = [];
      def.waypoints = [];
    });
    Object.values(runtimeStore).forEach((r) => {
      r.isRunning = false;
      if (r.def) {
        r.def.routeId = '';
        r.def.routeNumber = '';
        r.def.routeName = '';
        r.def.stops = [];
        r.def.waypoints = [];
      }
    });
    try {
      localStorage.removeItem('nagarst_demo_assignments');
    } catch (_) {}
  }

  // 2. Read deleted buses
  let deletedBusIds: string[] = [];
  try {
    const raw = localStorage.getItem('nagarst_deleted_demo_buses');
    if (raw) deletedBusIds = JSON.parse(raw);
  } catch (_) {}

  const isDeleted = (id?: string, bNum?: string, pNum?: string) => {
    const norm = (s?: string) => (s || '').trim().toUpperCase().replace(/\s+/g, '');
    const cId = norm(id);
    const cB = norm(bNum);
    const cP = norm(pNum);
    return deletedBusIds.some((d) => {
      const cD = norm(d);
      return (cId && cD === cId) || (cB && cD === cB) || (cP && cD === cP);
    });
  };

  // 3. Purge deleted buses from DEMO_BUS_DEFINITIONS and runtimeStore
  for (let i = DEMO_BUS_DEFINITIONS.length - 1; i >= 0; i--) {
    const d = DEMO_BUS_DEFINITIONS[i];
    if (isDeleted(d.id, d.busNumber, d.plateNumber)) {
      broadcastBusOffline(d.id);
      broadcastBusOffline(d.busNumber);
      delete runtimeStore[d.id];
      DEMO_BUS_DEFINITIONS.splice(i, 1);
    }
  }

  // 4. Identify configured fleet buses with assigned routes
  const assignedFleetBuses = buses.filter(b => {
    if (!b.routeId) return false;
    if (isDeleted(b.id, b.busNumber, b.plateNumber)) return false;
    return true;
  });

  // If the admin has configured assigned fleet buses (e.g. MH-16 BT-1515, MH-16 BT-1519),
  // then the simulation fleet MUST strictly contain ONLY these configured buses!
  if (assignedFleetBuses.length > 0) {
    const allowedKeys = new Set(
      assignedFleetBuses.map(b => (b.busNumber || b.id).trim().toUpperCase().replace(/\s+/g, ''))
    );

    // Purge any buses in DEMO_BUS_DEFINITIONS or runtimeStore that are not in the assigned fleet
    for (let i = DEMO_BUS_DEFINITIONS.length - 1; i >= 0; i--) {
      const d = DEMO_BUS_DEFINITIONS[i];
      const key = d.busNumber.trim().toUpperCase().replace(/\s+/g, '');
      if (!allowedKeys.has(key)) {
        broadcastBusOffline(d.id);
        broadcastBusOffline(d.busNumber);
        delete runtimeStore[d.id];
        DEMO_BUS_DEFINITIONS.splice(i, 1);
      }
    }

    Object.keys(runtimeStore).forEach(k => {
      const bNum = runtimeStore[k]?.def?.busNumber;
      const key = (bNum || k).trim().toUpperCase().replace(/\s+/g, '');
      if (!allowedKeys.has(key)) {
        broadcastBusOffline(k);
        delete runtimeStore[k];
      }
    });

    // Add or update each assigned fleet bus
    assignedFleetBuses.forEach(b => {
      const assignedRoute = AVAILABLE_DEMO_ROUTES.find(r => 
        r.id === b.routeId || 
        r.routeNumber === b.routeId || 
        (b.routeNumber && r.routeNumber === b.routeNumber)
      );
      if (!assignedRoute || assignedRoute.waypoints.length < 2) return;

      const normBusNum = b.busNumber.trim();
      let existingDef = DEMO_BUS_DEFINITIONS.find(d => 
        d.busNumber.trim().toUpperCase() === normBusNum.toUpperCase() || d.id === b.id
      );

      if (!existingDef) {
        existingDef = {
          id: b.id.startsWith('demo-bus-') ? b.id : `demo-bus-${normBusNum.toLowerCase().replace(/\s+/g, '-')}`,
          busNumber: normBusNum,
          plateNumber: b.plateNumber || normBusNum,
          tripId: `trip-${b.id}`,
          routeId: assignedRoute.id,
          routeNumber: assignedRoute.routeNumber,
          routeName: assignedRoute.routeName,
          origin: assignedRoute.origin,
          destination: assignedRoute.destination,
          color: assignedRoute.color || '#7847CB',
          stops: [...assignedRoute.stops],
          waypoints: densifyPath(assignedRoute.waypoints, 120),
          initialIndex: 0
        };
        DEMO_BUS_DEFINITIONS.push(existingDef);
      } else {
        const routeChanged = existingDef.routeId !== assignedRoute.id;
        const isDairy = (assignedRoute.destination || '').toLowerCase().includes('dairy') || (assignedRoute.routeName || '').toLowerCase().includes('dairy');
        const endWpLat = existingDef.waypoints && existingDef.waypoints.length > 0 ? existingDef.waypoints[existingDef.waypoints.length - 1].lat : 0;
        const needsWpRefresh = routeChanged || !existingDef.waypoints || existingDef.waypoints.length < 20 || (isDairy && endWpLat > 19.10);

        existingDef.routeId = assignedRoute.id;
        existingDef.routeNumber = assignedRoute.routeNumber;
        existingDef.routeName = assignedRoute.routeName;
        existingDef.origin = assignedRoute.origin;
        existingDef.destination = assignedRoute.destination;
        existingDef.color = assignedRoute.color || existingDef.color;
        existingDef.stops = [...assignedRoute.stops];
        if (needsWpRefresh) {
          existingDef.waypoints = densifyPath(assignedRoute.waypoints, 120);
          if (runtimeStore[existingDef.id]) {
            runtimeStore[existingDef.id].currentIndex = 0;
          }
        }
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

      // Generate up-to-date telemetry and broadcast
      const telemetry = buildBusTelemetry(runtimeStore[existingDef.id]);
      runtimeStore[existingDef.id].currentBus = telemetry;
      broadcastBusLocation(telemetry);

      // Persist assignment to localStorage
      try {
        const raw = localStorage.getItem('nagarst_demo_assignments');
        const assignments = raw ? JSON.parse(raw) : {};
        assignments[existingDef.id] = {
          routeId: existingDef.routeId,
          routeNumber: existingDef.routeNumber,
          routeName: existingDef.routeName,
          origin: existingDef.origin,
          destination: existingDef.destination,
          color: existingDef.color,
          stops: existingDef.stops,
          waypoints: existingDef.waypoints
        };
        localStorage.setItem('nagarst_demo_assignments', JSON.stringify(assignments));
      } catch (_) {}
    });
  }

  // Deduplicate DEMO_BUS_DEFINITIONS by busNumber
  const seenBusNums = new Set<string>();
  for (let i = DEMO_BUS_DEFINITIONS.length - 1; i >= 0; i--) {
    const key = DEMO_BUS_DEFINITIONS[i].busNumber.trim().toUpperCase().replace(/\s+/g, '');
    if (seenBusNums.has(key)) {
      DEMO_BUS_DEFINITIONS.splice(i, 1);
    } else {
      seenBusNums.add(key);
    }
  }

  // Update cross-tab aggregate in localStorage
  try {
    const aggregate: Record<string, Bus> = {};
    DEMO_BUS_DEFINITIONS.forEach(def => {
      const r = runtimeStore[def.id];
      if (r) {
        const b = r.currentBus || buildBusTelemetry(r);
        if (b) aggregate[def.id] = b;
      }
    });
    localStorage.setItem('nagarst_demo_buses', JSON.stringify(aggregate));

    const ch = getBroadcastChannel();
    if (ch) {
      ch.postMessage({ type: 'fleetSync', buses: aggregate });
    }
  } catch (_) {}

  notifyListeners();
}


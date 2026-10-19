import type { Bus } from '../types';
import { getDistance, getBearing } from './routing';

export const DEMO_BUS_ID = 'demo-bus-sim-01';
export const DEMO_BUS_NUMBER = 'MH-16-DEMO';
export const DEMO_PLATE_NUMBER = 'MH-16-DEMO-SIM';
export const DEMO_TRIP_ID = 'demo-trip-sim-001';

export interface DemoStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const DEMO_STOPS: DemoStop[] = [
  { id: 'stop-dg', name: 'Delhi Gate Terminal', lat: 19.109728, lng: 74.733295 },
  { id: 'stop-my', name: 'Market Yard Hub', lat: 19.121543, lng: 74.727673 },
  { id: 'stop-sv', name: 'Savedi Phata', lat: 19.135622, lng: 74.721761 },
  { id: 'stop-pc', name: 'Premdan Chowk', lat: 19.145418, lng: 74.711820 },
  { id: 'stop-pr', name: 'Pipeline Road Cross', lat: 19.157221, lng: 74.704662 },
  { id: 'stop-dc', name: 'Dairy Chowk Terminal', lat: 19.170628, lng: 74.697225 }
];

export const DEMO_WAYPOINTS = [
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

export interface DemoSimulatorState {
  isRunning: boolean;
  currentIndex: number;
  speedMultiplier: number;
  delayMinutes: number;
  currentBus: Bus | null;
  progressPercent: number;
}

let activeInterval: ReturnType<typeof setInterval> | null = null;
let broadcastChannel: BroadcastChannel | null = null;

const state: DemoSimulatorState = {
  isRunning: false,
  currentIndex: 0,
  speedMultiplier: 1,
  delayMinutes: 0,
  currentBus: null,
  progressPercent: 0
};

const listeners = new Set<(state: DemoSimulatorState) => void>();

function notifyListeners() {
  listeners.forEach(fn => fn({ ...state }));
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
 * Builds a realistic Bus telemetry packet for the simulated vehicle
 */
function buildDemoBusTelemetry(index: number): Bus {
  const currentPt = DEMO_WAYPOINTS[index];
  const nextPt = DEMO_WAYPOINTS[(index + 1) % DEMO_WAYPOINTS.length];
  
  const heading = Math.round(getBearing(currentPt, nextPt));
  const baseSpeed = 28 + Math.floor(Math.sin(index) * 8);
  const speedKmh = Math.max(14, baseSpeed);

  // Dynamic next-stop and ETA calculation
  const progressRatio = index / (DEMO_WAYPOINTS.length - 1);
  const stopIndex = Math.min(
    DEMO_STOPS.length - 2,
    Math.floor(progressRatio * (DEMO_STOPS.length - 1))
  );

  const curStop = DEMO_STOPS[stopIndex];
  const nextStop = DEMO_STOPS[stopIndex + 1] || DEMO_STOPS[DEMO_STOPS.length - 1];

  const distToNext = getDistance(currentPt, nextStop);
  const nominalMinutes = Math.max(1, Math.round((distToNext / 1000) / (speedKmh / 60)));
  const etaMinutes = nominalMinutes + state.delayMinutes;

  const status = state.delayMinutes > 3 ? ('delayed' as const) : ('on_time' as const);

  return {
    id: DEMO_BUS_ID,
    busNumber: DEMO_BUS_NUMBER,
    plateNumber: DEMO_PLATE_NUMBER,
    routeId: 'demo-route-delhi-dairy',
    routeNumber: 'MH-16 (DEMO)',
    routeName: 'Delhi Gate - Dairy Chowk (DEMO ROUTE)',
    origin: 'Delhi Gate Terminal',
    destination: 'Dairy Chowk Terminal',
    currentStopId: curStop.id,
    currentStopName: curStop.name,
    nextStopId: nextStop.id,
    nextStopName: nextStop.name,
    etaToNextMinutes: etaMinutes,
    delayMinutes: state.delayMinutes,
    speedKmh: speedKmh,
    occupancy: 'moderate',
    status: status,
    lat: currentPt.lat,
    lng: currentPt.lng,
    heading: heading,
    driverName: 'Demo Simulation System',
    conductorName: 'Simulated Duty',
    busType: 'EV Metro Shuttle',
    isDemo: true,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Dispatches simulated telemetry to all map listeners (BroadcastChannel, LocalStorage, Socket)
 */
function broadcastDemoLocation(bus: Bus) {
  // 1. Cross-tab BroadcastChannel
  const ch = getBroadcastChannel();
  if (ch) {
    ch.postMessage({ type: 'locationUpdate', data: bus });
  }

  // 2. Storage event
  try {
    localStorage.setItem('nagarst_demo_bus', JSON.stringify(bus));
    localStorage.setItem('nagarst_live_bus_' + DEMO_BUS_ID, JSON.stringify(bus));
  } catch (_) {}
}

export function tickDemoSimulation() {
  if (!state.isRunning) return;

  state.currentIndex = (state.currentIndex + 1) % DEMO_WAYPOINTS.length;
  state.progressPercent = Math.round((state.currentIndex / (DEMO_WAYPOINTS.length - 1)) * 100);

  const bus = buildDemoBusTelemetry(state.currentIndex);
  state.currentBus = bus;

  broadcastDemoLocation(bus);
  notifyListeners();
}

/**
 * Start the realistic GPS demo simulator
 */
export function startDemoSimulation(options?: { speedMultiplier?: number; delayMinutes?: number }) {
  if (options?.speedMultiplier) state.speedMultiplier = options.speedMultiplier;
  if (options?.delayMinutes !== undefined) state.delayMinutes = options.delayMinutes;

  state.isRunning = true;
  if (activeInterval) clearInterval(activeInterval);

  // Interval adjusts according to speedMultiplier (1x = 1400ms, 2x = 700ms, 5x = 280ms, 10x = 140ms)
  const ms = Math.max(140, Math.round(1400 / state.speedMultiplier));
  activeInterval = setInterval(tickDemoSimulation, ms);

  // Immediate first tick
  tickDemoSimulation();
}

/**
 * Stop and clean up the demo simulator
 */
export function stopDemoSimulation() {
  state.isRunning = false;
  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }

  state.currentBus = null;

  // Clean up storage & inform map
  try {
    localStorage.removeItem('nagarst_demo_bus');
    localStorage.removeItem('nagarst_live_bus_' + DEMO_BUS_ID);
  } catch (_) {}

  const ch = getBroadcastChannel();
  if (ch) {
    ch.postMessage({ type: 'busOffline', busId: DEMO_BUS_ID });
  }

  notifyListeners();
}

export function setDemoReplaySpeed(multiplier: number) {
  state.speedMultiplier = Math.min(10, Math.max(1, multiplier));
  if (state.isRunning) {
    startDemoSimulation();
  } else {
    notifyListeners();
  }
}

export function setDemoDelay(minutes: number) {
  state.delayMinutes = Math.max(0, minutes);
  if (state.isRunning && state.currentBus) {
    tickDemoSimulation();
  } else {
    notifyListeners();
  }
}

export function getDemoSimulatorState(): DemoSimulatorState {
  return { ...state };
}

export function subscribeToDemoState(listener: (s: DemoSimulatorState) => void): () => void {
  listeners.add(listener);
  listener({ ...state });
  return () => {
    listeners.delete(listener);
  };
}

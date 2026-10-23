import type { OccupancyLevel, BusType, Ticket } from '../types';
import { calculateStopToStopFare } from './fareEngine';

export interface OnBoardPassenger {
  id: string;
  ticketCode: string;
  sourceStop: string;
  destinationStop: string;
  passengerCount: number;
  fare: number;
  paymentMode: 'cash' | 'upi' | 'qr_ticket' | 'pass';
  boardedAtTime: string;
  boardedAtStop: string;
  status: 'on_board' | 'alighted';
}

export interface BusOccupancyState {
  busId: string;
  busNumber: string;
  routeId: string;
  currentStopIndex: number;
  currentStopName: string;
  nextStopName: string;
  passengerCount: number;
  maxCapacity: number;
  availableSeats: number;
  occupancy: OccupancyLevel;
  lastUpdated: string;
  totalBoardedToday: number;
  totalAlightedToday: number;
  passengers: OnBoardPassenger[];
}

export const DEFAULT_BUS_CAPACITY = 45;

/**
 * Calculates human-readable occupancy tier based on passenger count and capacity
 */
export function calculateOccupancyTier(passengerCount: number, maxCapacity = DEFAULT_BUS_CAPACITY): OccupancyLevel {
  const ratio = passengerCount / Math.max(1, maxCapacity);
  if (ratio >= 0.85) return 'high';
  if (ratio >= 0.4) return 'moderate';
  return 'low';
}

/**
 * Audio Chime: Pleasant double-tone ascending frequency when passenger boards
 */
export function playBoardingChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch (_) {}
}

/**
 * Audio Chime: Soft descending frequency when passenger alights at a stop
 */
export function playAlightingChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
    osc.frequency.exponentialRampToValueAtTime(523.25, ctx.currentTime + 0.18); // C5
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch (_) {}
}

/**
 * Normalizes stop name for robust substring matching
 */
export function normalizeStopName(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[()]/g, '');
}

/**
 * Checks if two stop names represent the same bus stop
 */
export function isSameStop(stopA: string, stopB: string): boolean {
  const a = normalizeStopName(stopA);
  const b = normalizeStopName(stopB);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Retrieves the current occupancy & manifest state for a specific bus
 */
export function getBusOccupancyState(
  busId: string,
  busNumber = 'AH-24',
  routeId = 'route-1',
  initialStop = 'Central Bus Stand (CBS)',
  nextStop = 'Delhi Gate'
): BusOccupancyState {
  try {
    const key = `nagarst_conductor_manifest_${busId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed: BusOccupancyState = JSON.parse(raw);
      // Recalculate passengerCount from on_board passengers
      const activeCount = (parsed.passengers || [])
        .filter((p) => p.status === 'on_board')
        .reduce((sum, p) => sum + (p.passengerCount || 1), 0);
      
      const maxCap = parsed.maxCapacity || DEFAULT_BUS_CAPACITY;
      return {
        ...parsed,
        passengerCount: activeCount,
        maxCapacity: maxCap,
        availableSeats: Math.max(0, maxCap - activeCount),
        occupancy: calculateOccupancyTier(activeCount, maxCap),
      };
    }
  } catch (_) {}

  // Initial clean state with default seed passengers for a realistic starting demonstration
  const seedPassengers: OnBoardPassenger[] = [
    {
      id: `pax-seed-1`,
      ticketCode: `NST-CASH-1082`,
      sourceStop: 'Central Bus Stand (CBS)',
      destinationStop: 'Swastik Chowk',
      passengerCount: 2,
      fare: 26,
      paymentMode: 'cash',
      boardedAtTime: '10:05 AM',
      boardedAtStop: 'Central Bus Stand (CBS)',
      status: 'on_board',
    },
    {
      id: `pax-seed-2`,
      ticketCode: `NST-2026-9412`,
      sourceStop: 'Central Bus Stand (CBS)',
      destinationStop: 'Savedi Bus Terminal',
      passengerCount: 1,
      fare: 20,
      paymentMode: 'qr_ticket',
      boardedAtTime: '10:08 AM',
      boardedAtStop: 'Central Bus Stand (CBS)',
      status: 'on_board',
    },
    {
      id: `pax-seed-3`,
      ticketCode: `NST-PASS-4410`,
      sourceStop: 'Delhi Gate',
      destinationStop: 'Premdan Chowk',
      passengerCount: 1,
      fare: 0,
      paymentMode: 'pass',
      boardedAtTime: '10:14 AM',
      boardedAtStop: 'Delhi Gate',
      status: 'on_board',
    },
  ];

  const initialCount = seedPassengers.reduce((sum, p) => sum + p.passengerCount, 0);

  const initial: BusOccupancyState = {
    busId,
    busNumber,
    routeId,
    currentStopIndex: 0,
    currentStopName: initialStop,
    nextStopName: nextStop,
    passengerCount: initialCount,
    maxCapacity: DEFAULT_BUS_CAPACITY,
    availableSeats: DEFAULT_BUS_CAPACITY - initialCount,
    occupancy: calculateOccupancyTier(initialCount, DEFAULT_BUS_CAPACITY),
    lastUpdated: new Date().toISOString(),
    totalBoardedToday: initialCount,
    totalAlightedToday: 0,
    passengers: seedPassengers,
  };

  saveBusOccupancyState(initial);
  return initial;
}

/**
 * Saves and broadcasts occupancy state
 */
export function saveBusOccupancyState(state: BusOccupancyState): void {
  try {
    const key = `nagarst_conductor_manifest_${state.busId}`;
    localStorage.setItem(key, JSON.stringify(state));

    // Save summary key for fast lookup by live map
    localStorage.setItem(
      `nagarst_bus_occupancy_${state.busId}`,
      JSON.stringify({
        busId: state.busId,
        busNumber: state.busNumber,
        passengerCount: state.passengerCount,
        maxCapacity: state.maxCapacity,
        availableSeats: state.availableSeats,
        occupancy: state.occupancy,
        currentStopName: state.currentStopName,
        nextStopName: state.nextStopName,
        lastUpdated: state.lastUpdated,
      })
    );

    // Broadcast across windows and tabs
    window.dispatchEvent(
      new CustomEvent('nagarst_bus_occupancy_changed', {
        detail: state,
      })
    );
  } catch (err) {
    console.warn('Failed to save bus occupancy state:', err);
  }
}

/**
 * Boards one or more passengers onto the bus
 */
export function boardPassengerOnBus(
  busId: string,
  passengerData: Omit<OnBoardPassenger, 'id' | 'status' | 'boardedAtTime'>
): { updatedState: BusOccupancyState; addedCount: number } {
  const current = getBusOccupancyState(busId);
  const count = Math.max(1, passengerData.passengerCount || 1);

  const newPassenger: OnBoardPassenger = {
    ...passengerData,
    id: `pax-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    status: 'on_board',
    boardedAtTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const updatedPassengers = [newPassenger, ...current.passengers];
  const newPassengerCount = current.passengerCount + count;
  const newCapacity = current.maxCapacity || DEFAULT_BUS_CAPACITY;

  const nextState: BusOccupancyState = {
    ...current,
    passengerCount: newPassengerCount,
    availableSeats: Math.max(0, newCapacity - newPassengerCount),
    occupancy: calculateOccupancyTier(newPassengerCount, newCapacity),
    totalBoardedToday: current.totalBoardedToday + count,
    lastUpdated: new Date().toISOString(),
    passengers: updatedPassengers,
  };

  saveBusOccupancyState(nextState);
  playBoardingChime();
  return { updatedState: nextState, addedCount: count };
}

/**
 * Deboards all passengers scheduled to alight at a specific bus stop
 */
export function deboardPassengersAtStop(
  busId: string,
  arrivedStopName: string,
  nextUpcomingStopName?: string,
  newStopIndex?: number
): {
  updatedState: BusOccupancyState;
  alightedCount: number;
  alightedPassengers: OnBoardPassenger[];
} {
  const current = getBusOccupancyState(busId);
  const alighted: OnBoardPassenger[] = [];
  let alightedCount = 0;

  const updatedPassengers = current.passengers.map((p) => {
    if (p.status === 'on_board' && isSameStop(p.destinationStop, arrivedStopName)) {
      alightedCount += p.passengerCount || 1;
      const modified = { ...p, status: 'alighted' as const };
      alighted.push(modified);
      return modified;
    }
    return p;
  });

  const remainingCount = Math.max(0, current.passengerCount - alightedCount);
  const maxCap = current.maxCapacity || DEFAULT_BUS_CAPACITY;

  const nextState: BusOccupancyState = {
    ...current,
    currentStopIndex: newStopIndex !== undefined ? newStopIndex : current.currentStopIndex,
    currentStopName: arrivedStopName,
    nextStopName: nextUpcomingStopName || current.nextStopName,
    passengerCount: remainingCount,
    availableSeats: Math.max(0, maxCap - remainingCount),
    occupancy: calculateOccupancyTier(remainingCount, maxCap),
    totalAlightedToday: current.totalAlightedToday + alightedCount,
    lastUpdated: new Date().toISOString(),
    passengers: updatedPassengers,
  };

  saveBusOccupancyState(nextState);
  if (alightedCount > 0) {
    playAlightingChime();
  }

  return {
    updatedState: nextState,
    alightedCount,
    alightedPassengers: alighted,
  };
}

/**
 * Allows manual adjustment (+1 / -1) by conductor for inspection or unrecorded exits
 */
export function manualAdjustPassengerCount(busId: string, delta: number): BusOccupancyState {
  const current = getBusOccupancyState(busId);
  const maxCap = current.maxCapacity || DEFAULT_BUS_CAPACITY;
  const newCount = Math.max(0, Math.min(maxCap + 10, current.passengerCount + delta));

  if (delta < 0 && current.passengers.some((p) => p.status === 'on_board')) {
    // Mark one passenger group or single pax as alighted
    let remainingToAlight = Math.abs(delta);
    const updated = current.passengers.map((p) => {
      if (remainingToAlight > 0 && p.status === 'on_board') {
        remainingToAlight -= p.passengerCount;
        return { ...p, status: 'alighted' as const };
      }
      return p;
    });
    current.passengers = updated;
  }

  const nextState: BusOccupancyState = {
    ...current,
    passengerCount: newCount,
    availableSeats: Math.max(0, maxCap - newCount),
    occupancy: calculateOccupancyTier(newCount, maxCap),
    lastUpdated: new Date().toISOString(),
  };

  saveBusOccupancyState(nextState);
  if (delta > 0) playBoardingChime();
  if (delta < 0) playAlightingChime();
  return nextState;
}

/**
 * Returns summary of passengers waiting to alight at each stop along a route
 */
export function getAlightingSummaryByStop(passengers: OnBoardPassenger[]): Record<string, number> {
  const summary: Record<string, number> = {};
  passengers.forEach((p) => {
    if (p.status === 'on_board' && p.destinationStop) {
      const stop = p.destinationStop.trim();
      summary[stop] = (summary[stop] || 0) + (p.passengerCount || 1);
    }
  });
  return summary;
}

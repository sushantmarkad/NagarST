import type { Route, RouteStop, BusType } from '../types';

export interface StopFareRule {
  routeId: string;
  baseFare: number; // Base fare for 1-2 stops (e.g. ₹10)
  farePerStop: number; // Additional fare per stop beyond base (e.g. ₹3)
  maxFare: number; // Maximum fare cap on route (e.g. ₹35)
  busTypeMultipliers: {
    'Standard City': number;
    'Mini Bus': number;
    'EV Metro Shuttle': number;
    'AC Express': number;
  };
  // Custom stop-to-stop overrides: key = `${stopA}__${stopB}` => price in ₹
  customPairFares?: Record<string, number>;
  // Stop stage fare overrides: key = stopName => fare from origin in ₹
  stageFaresFromOrigin?: Record<string, number>;
}

export interface FareCalculationResult {
  baseFare: number;
  govTax: number;
  totalFare: number;
  ratePerPassenger: number;
  stopsTraveled: number;
  discount: number;
  sourceStop: string;
  destinationStop: string;
  busType: BusType;
  passengerCount: number;
  isCustomOverride?: boolean;
}

const FARE_RULES_STORAGE_KEY = 'nagarst_stop_fare_rules';

// Standard Government Approved Municipal Tariff for Ahilyanagar City Bus Service
export const DEFAULT_MUNICIPAL_FARE_RULE: Omit<StopFareRule, 'routeId'> = {
  baseFare: 10, // First 1-2 stops
  farePerStop: 3, // ₹3 per additional stop
  maxFare: 35, // ₹35 maximum city route cap
  busTypeMultipliers: {
    'Standard City': 1.0,
    'Mini Bus': 1.0,
    'EV Metro Shuttle': 1.2,
    'AC Express': 1.5,
  },
  customPairFares: {},
  stageFaresFromOrigin: {},
};

/**
 * Loads all route fare rules from localStorage
 */
export function getAllFareRules(): Record<string, StopFareRule> {
  try {
    const raw = localStorage.getItem(FARE_RULES_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to parse stop fare rules from storage:', err);
  }
  return {};
}

/**
 * Gets the configured fare rule for a specific route, or returns default municipal rules
 */
export function getFareRuleForRoute(routeId?: string): StopFareRule {
  const all = getAllFareRules();
  const id = routeId || 'default';
  if (all[id]) {
    return {
      ...DEFAULT_MUNICIPAL_FARE_RULE,
      ...all[id],
      routeId: id,
      busTypeMultipliers: {
        ...DEFAULT_MUNICIPAL_FARE_RULE.busTypeMultipliers,
        ...(all[id].busTypeMultipliers || {}),
      },
      customPairFares: { ...(all[id].customPairFares || {}) },
      stageFaresFromOrigin: { ...(all[id].stageFaresFromOrigin || {}) },
    };
  }

  // Also check if 'global_default' exists
  if (all['global_default']) {
    return {
      ...DEFAULT_MUNICIPAL_FARE_RULE,
      ...all['global_default'],
      routeId: id,
    };
  }

  return {
    ...DEFAULT_MUNICIPAL_FARE_RULE,
    routeId: id,
  };
}

/**
 * Saves a fare rule for a specific route and broadcasts update event
 */
export function saveFareRuleForRoute(routeId: string, rule: Partial<StopFareRule>): StopFareRule {
  const all = getAllFareRules();
  const existing = all[routeId] || { ...DEFAULT_MUNICIPAL_FARE_RULE, routeId };

  const updated: StopFareRule = {
    ...existing,
    ...rule,
    routeId,
    busTypeMultipliers: {
      ...existing.busTypeMultipliers,
      ...(rule.busTypeMultipliers || {}),
    },
    customPairFares: {
      ...(existing.customPairFares || {}),
      ...(rule.customPairFares || {}),
    },
    stageFaresFromOrigin: {
      ...(existing.stageFaresFromOrigin || {}),
      ...(rule.stageFaresFromOrigin || {}),
    },
  };

  all[routeId] = updated;

  try {
    localStorage.setItem(FARE_RULES_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('nagarst_fare_rules_updated', { detail: { routeId, rule: updated } }));
  } catch (err) {
    console.error('Failed to save stop fare rule:', err);
  }

  return updated;
}

/**
 * Resets a route's fare rule back to default municipal tariff
 */
export function resetFareRuleForRoute(routeId: string): StopFareRule {
  const all = getAllFareRules();
  delete all[routeId];
  try {
    localStorage.setItem(FARE_RULES_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('nagarst_fare_rules_updated', { detail: { routeId } }));
  } catch (err) {
    console.error('Failed to reset fare rule:', err);
  }
  return { ...DEFAULT_MUNICIPAL_FARE_RULE, routeId };
}

/**
 * Normalized lookup key for a pair of stops
 */
export function makePairKey(stopA: string, stopB: string): string {
  const a = (stopA || '').trim().toLowerCase();
  const b = (stopB || '').trim().toLowerCase();
  return `${a}__${b}`;
}

/**
 * Calculates stop-to-stop ticket fare based on route stops, municipal rules, and bus category
 */
export function calculateStopToStopFare({
  route,
  sourceStop,
  destinationStop,
  busType = 'Standard City',
  passengerCount = 1,
}: {
  route?: Route | any | null;
  sourceStop: string;
  destinationStop: string;
  busType?: BusType;
  passengerCount?: number;
}): FareCalculationResult {
  const rule = getFareRuleForRoute(route?.id);
  const stopsList: Array<RouteStop | any> = route?.stops || [];

  const srcNorm = (sourceStop || '').trim().toLowerCase();
  const destNorm = (destinationStop || '').trim().toLowerCase();

  let stopsTraveled = 1;
  let isCustom = false;
  let singlePassengerRate = rule.baseFare;

  // 1. Check custom pair override
  const directPairKey = makePairKey(sourceStop, destinationStop);
  const reversePairKey = makePairKey(destinationStop, sourceStop);

  if (rule.customPairFares && rule.customPairFares[directPairKey] !== undefined) {
    singlePassengerRate = rule.customPairFares[directPairKey];
    isCustom = true;
  } else if (rule.customPairFares && rule.customPairFares[reversePairKey] !== undefined) {
    singlePassengerRate = rule.customPairFares[reversePairKey];
    isCustom = true;
  } else if (stopsList.length > 0) {
    // 2. Find stop indices along the route
    const srcIndex = stopsList.findIndex((s) => {
      const name = (s.stopName || s.name || '').trim().toLowerCase();
      const id = (s.stopId || s.id || '').trim().toLowerCase();
      return name === srcNorm || id === srcNorm;
    });

    const destIndex = stopsList.findIndex((s) => {
      const name = (s.stopName || s.name || '').trim().toLowerCase();
      const id = (s.stopId || s.id || '').trim().toLowerCase();
      return name === destNorm || id === destNorm;
    });

    if (srcIndex !== -1 && destIndex !== -1) {
      stopsTraveled = Math.max(1, Math.abs(destIndex - srcIndex));

      // Check if custom stage fares from origin are configured for both stops
      const srcStage = rule.stageFaresFromOrigin?.[stopsList[srcIndex].stopName || stopsList[srcIndex].name];
      const destStage = rule.stageFaresFromOrigin?.[stopsList[destIndex].stopName || stopsList[destIndex].name];

      if (srcStage !== undefined && destStage !== undefined) {
        singlePassengerRate = Math.max(rule.baseFare, Math.abs(destStage - srcStage));
        isCustom = true;
      } else {
        // Standard Distance / Stop Count Stage Calculation
        if (stopsTraveled <= 1) {
          singlePassengerRate = rule.baseFare;
        } else {
          singlePassengerRate = rule.baseFare + (stopsTraveled - 1) * rule.farePerStop;
        }
      }
    } else {
      // Fallback if stops not in list
      stopsTraveled = 1;
      singlePassengerRate = rule.baseFare;
    }
  }

  // Cap at route maximum
  singlePassengerRate = Math.min(singlePassengerRate, rule.maxFare);

  // Apply Bus Category Multiplier
  const multiplier = rule.busTypeMultipliers[busType] || 1.0;
  const adjustedRate = Math.max(5, Math.round(singlePassengerRate * multiplier));

  const count = Math.max(1, passengerCount);
  const baseFare = adjustedRate * count;
  const govTax = Math.max(1, Math.round(baseFare * 0.05)); // 5% Municipal Transit Cess
  const totalFare = baseFare + govTax;

  return {
    baseFare,
    govTax,
    totalFare,
    ratePerPassenger: adjustedRate,
    stopsTraveled,
    discount: 0,
    sourceStop,
    destinationStop,
    busType,
    passengerCount: count,
    isCustomOverride: isCustom,
  };
}

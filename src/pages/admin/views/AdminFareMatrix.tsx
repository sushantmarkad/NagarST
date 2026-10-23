import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { useToast } from '../../../context/FeedbackContext';
import {
  IndianRupee,
  Route as RouteIcon,
  Save,
  RotateCcw,
  Check,
  Calculator,
  Sliders,
  Tag,
  ArrowRight,
  Sparkles,
  MapPin,
  Bus,
  Plus,
  Trash2,
  Info,
  CheckCircle2
} from 'lucide-react';
import {
  getFareRuleForRoute,
  saveFareRuleForRoute,
  resetFareRuleForRoute,
  calculateStopToStopFare,
  makePairKey,
  type StopFareRule
} from '../../../utils/fareEngine';
import { formatCurrency } from '../../../utils/formatters';
import type { Route, BusType } from '../../../types';

const getStopName = (s: any): string => (s ? s.stopName || s.name || '' : '');

export const AdminFareMatrix: React.FC = () => {
  const { routes } = useApp();
  const toast = useToast();

  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [currentRule, setCurrentRule] = useState<StopFareRule | null>(null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Test Calculator State
  const [testSource, setTestSource] = useState<string>('');
  const [testDest, setTestDest] = useState<string>('');
  const [testBusType, setTestBusType] = useState<BusType>('Standard City');
  const [testCustomPrice, setTestCustomPrice] = useState<string>('');

  // Selected route object
  const activeRoute = useMemo(() => {
    if (!routes || routes.length === 0) return null;
    return routes.find((r) => r.id === selectedRouteId) || routes[0];
  }, [routes, selectedRouteId]);

  // Set default route on load
  useEffect(() => {
    if (routes && routes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(routes[0].id);
    }
  }, [routes, selectedRouteId]);

  // Load fare rule whenever activeRoute changes
  useEffect(() => {
    if (activeRoute) {
      const rule = getFareRuleForRoute(activeRoute.id);
      setCurrentRule(rule);
      setHasChanges(false);

      const stops = activeRoute.stops || [];
      if (stops.length >= 2) {
        setTestSource(getStopName(stops[0]));
        setTestDest(getStopName(stops[stops.length - 1]));
      }
    }
  }, [activeRoute?.id]);

  if (!activeRoute || !currentRule) {
    return (
      <div className="p-8 text-center text-slate-500">
        <RouteIcon className="w-12 h-12 mx-auto text-slate-300 animate-pulse mb-3" />
        <p className="font-bold">Loading route corridors and fare rules...</p>
      </div>
    );
  }

  const routeStops = activeRoute.stops || [];

  // Update a field in the current rule
  const handleUpdateField = (field: keyof StopFareRule, value: any) => {
    setCurrentRule((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
    setHasChanges(true);
  };

  // Update multiplier
  const handleUpdateMultiplier = (category: keyof StopFareRule['busTypeMultipliers'], val: number) => {
    setCurrentRule((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        busTypeMultipliers: {
          ...prev.busTypeMultipliers,
          [category]: val,
        },
      };
    });
    setHasChanges(true);
  };

  // Update a specific stop's stage fare from origin
  const handleUpdateStageFare = (stopName: string, fare: number) => {
    setCurrentRule((prev) => {
      if (!prev) return null;
      const updated = { ...(prev.stageFaresFromOrigin || {}) };
      updated[stopName] = Math.max(0, fare);
      return {
        ...prev,
        stageFaresFromOrigin: updated,
      };
    });
    setHasChanges(true);
  };

  // Recalculate all stage fares automatically based on formula
  const handleAutoGenerateStages = () => {
    if (!currentRule || routeStops.length === 0) return;
    const stages: Record<string, number> = {};
    routeStops.forEach((stop, idx) => {
      const name = getStopName(stop);
      if (idx === 0) {
        stages[name] = 0;
      } else if (idx === 1) {
        stages[name] = currentRule.baseFare;
      } else {
        const fare = Math.min(currentRule.maxFare, currentRule.baseFare + (idx - 1) * currentRule.farePerStop);
        stages[name] = fare;
      }
    });

    setCurrentRule((prev) => (prev ? { ...prev, stageFaresFromOrigin: stages } : null));
    setHasChanges(true);
    toast.success('Generated sequential stage fares from pricing formula!', 'Stages Auto-Calculated');
  };

  // Save changes
  const handleSave = () => {
    if (!activeRoute || !currentRule) return;
    saveFareRuleForRoute(activeRoute.id, currentRule);
    setHasChanges(false);
    toast.success(
      `Stop-to-stop fare pricing for Route ${activeRoute.routeNumber} saved successfully!`,
      'Fare Rules Published'
    );
  };

  // Reset to government standard
  const handleReset = () => {
    if (!activeRoute) return;
    const def = resetFareRuleForRoute(activeRoute.id);
    setCurrentRule(def);
    setHasChanges(false);
    toast.info(`Reset Route ${activeRoute.routeNumber} to standard municipal tariff.`, 'Reset Complete');
  };

  // Add custom pair override
  const handleAddCustomPairOverride = () => {
    if (!testSource || !testDest || testSource === testDest) {
      toast.error('Please choose two distinct stops.');
      return;
    }
    const priceNum = parseFloat(testCustomPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Please enter a valid fare price (₹).');
      return;
    }

    const key = makePairKey(testSource, testDest);
    setCurrentRule((prev) => {
      if (!prev) return null;
      const overrides = { ...(prev.customPairFares || {}) };
      overrides[key] = priceNum;
      return {
        ...prev,
        customPairFares: overrides,
      };
    });

    setHasChanges(true);
    setTestCustomPrice('');
    toast.success(`Custom price ₹${priceNum} assigned for ${testSource} ➔ ${testDest}!`, 'Stop Pair Overridden');
  };

  // Remove custom pair override
  const handleRemovePairOverride = (key: string) => {
    setCurrentRule((prev) => {
      if (!prev) return null;
      const overrides = { ...(prev.customPairFares || {}) };
      delete overrides[key];
      return {
        ...prev,
        customPairFares: overrides,
      };
    });
    setHasChanges(true);
  };

  // Test calculation result
  const testResult = useMemo(() => {
    if (!activeRoute || !testSource || !testDest) return null;
    return calculateStopToStopFare({
      route: activeRoute,
      sourceStop: testSource,
      destinationStop: testDest,
      busType: testBusType,
      passengerCount: 1,
    });
  }, [activeRoute, testSource, testDest, testBusType, currentRule]);

  const customPairsList = Object.entries(currentRule.customPairFares || {});

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. TOP HEADER BANNER */}
      <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7847CB] to-purple-600 text-white flex items-center justify-center shadow-md shadow-[#7847CB]/30 shrink-0">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-slate-900 text-lg md:text-xl leading-tight">
                Stop-to-Stop Fare Matrix & Pricing
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-300">
                Live Pricing Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Configure boarding base fares, per-stop increment rates, and custom stop-pair ticket prices for passenger bookings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Tariff</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
              hasChanges
                ? 'bg-[#7847CB] hover:bg-[#663ab3] text-white shadow-[#7847CB]/30 animate-pulse'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{hasChanges ? 'Save & Publish Fares' : 'Fares Published'}</span>
          </button>
        </div>
      </div>

      {/* 2. ROUTE CORRIDOR SELECTOR BAR */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <RouteIcon className="w-4 h-4 text-[#7847CB]" />
            Select Route Corridor ({routes.length})
          </span>
          <span className="text-[11px] text-slate-400 font-medium">Click a corridor to configure stop-level pricing</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {routes.map((r) => {
            const isSelected = r.id === activeRoute.id;
            const stopsCount = r.stops?.length || 0;
            const rule = getFareRuleForRoute(r.id);

            return (
              <div
                key={r.id}
                onClick={() => setSelectedRouteId(r.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-purple-50/70 border-[#7847CB] ring-2 ring-[#7847CB]/20 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200/90'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: r.color || '#7847CB' }}
                    />
                    <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      R{r.routeNumber}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 font-mono">
                    {stopsCount} stops
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-800 truncate">
                  {r.origin} ➔ {r.destination}
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Fare Range:</span>
                  <span className="font-extrabold text-[#7847CB] font-mono">
                    ₹{rule.baseFare} – ₹{rule.maxFare}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. CORE FARE SETTINGS & LIVE SIMULATOR SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: BASE FARE RULES & BUS MULTIPLIERS (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#7847CB]" />
                <h3 className="font-extrabold text-slate-900 text-sm">Corridor Fare Formula</h3>
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                Route {activeRoute.routeNumber}
              </span>
            </div>

            {/* Base Fare (First 1-2 stops) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700">Base Minimum Fare (Initial 1–2 Stops)</label>
                <span className="font-mono font-extrabold text-[#7847CB] text-sm">₹{currentRule.baseFare}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="5"
                  max="25"
                  step="1"
                  value={currentRule.baseFare}
                  onChange={(e) => handleUpdateField('baseFare', parseInt(e.target.value) || 10)}
                  className="flex-1 accent-[#7847CB]"
                />
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={currentRule.baseFare}
                  onChange={(e) => handleUpdateField('baseFare', parseInt(e.target.value) || 10)}
                  className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-center"
                />
              </div>
              <span className="text-[10px] text-slate-400 block">
                Standard entry tariff charged when commuter boards the bus.
              </span>
            </div>

            {/* Fare Increment per Stop */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700">Fare per Additional Stop</label>
                <span className="font-mono font-extrabold text-emerald-600 text-sm">+₹{currentRule.farePerStop} / stop</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={currentRule.farePerStop}
                  onChange={(e) => handleUpdateField('farePerStop', parseInt(e.target.value) || 3)}
                  className="flex-1 accent-emerald-500"
                />
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={currentRule.farePerStop}
                  onChange={(e) => handleUpdateField('farePerStop', parseInt(e.target.value) || 3)}
                  className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-center"
                />
              </div>
              <span className="text-[10px] text-slate-400 block">
                Added incrementally for each consecutive stop traveled.
              </span>
            </div>

            {/* Max Route Fare Cap */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700">Maximum Fare Cap (Route Ceiling)</label>
                <span className="font-mono font-extrabold text-rose-600 text-sm">₹{currentRule.maxFare}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="5"
                  value={currentRule.maxFare}
                  onChange={(e) => handleUpdateField('maxFare', parseInt(e.target.value) || 35)}
                  className="flex-1 accent-rose-500"
                />
                <input
                  type="number"
                  min="15"
                  max="80"
                  value={currentRule.maxFare}
                  onChange={(e) => handleUpdateField('maxFare', parseInt(e.target.value) || 35)}
                  className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-center"
                />
              </div>
              <span className="text-[10px] text-slate-400 block">
                Passenger will never be charged more than this amount regardless of distance.
              </span>
            </div>

            {/* Bus Category Multipliers */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block">Bus Class Pricing Multipliers</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(['Standard City', 'Mini Bus', 'EV Metro Shuttle', 'AC Express'] as BusType[]).map((type) => {
                  const mult = currentRule.busTypeMultipliers[type] || 1.0;
                  return (
                    <div key={type} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-700 text-[11px] truncate">{type}</span>
                        <span className="font-mono text-purple-700 font-bold text-[11px]">{mult}x</span>
                      </div>
                      <select
                        value={mult}
                        onChange={(e) => handleUpdateMultiplier(type, parseFloat(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold"
                      >
                        <option value={1.0}>1.0x (Standard)</option>
                        <option value={1.2}>1.2x (+20%)</option>
                        <option value={1.3}>1.3x (+30%)</option>
                        <option value={1.5}>1.5x (+50%)</option>
                        <option value={1.8}>1.8x (+80%)</option>
                        <option value={2.0}>2.0x (Double)</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* TEST FARE CALCULATOR & INSTANT OVERRIDE ASSIGNER */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-50/90 via-white to-slate-50 border border-purple-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#7847CB]" />
                <h3 className="font-extrabold text-slate-900 text-sm">Interactive Fare Simulator</h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                Live Test
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                  1. Boarding Stop (From)
                </label>
                <select
                  value={testSource}
                  onChange={(e) => setTestSource(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {routeStops.map((s, i) => {
                    const sName = getStopName(s);
                    return (
                      <option key={i} value={sName}>
                        Stop {i + 1}: {sName}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                  2. Destination Stop (To)
                </label>
                <select
                  value={testDest}
                  onChange={(e) => setTestDest(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {routeStops.map((s, i) => {
                    const sName = getStopName(s);
                    return (
                      <option key={i} value={sName}>
                        Stop {i + 1}: {sName}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                  3. Bus Category
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Standard City', 'EV Metro Shuttle', 'AC Express'] as BusType[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTestBusType(cat)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                        testBusType === cat
                          ? 'bg-[#7847CB] text-white border-[#7847CB]'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculated Result Card */}
              {testResult && (
                <div className="p-3.5 rounded-2xl bg-white border border-purple-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Stops Traveled:</span>
                    <span className="font-extrabold text-slate-800 font-mono">
                      {testResult.stopsTraveled} {testResult.stopsTraveled === 1 ? 'stop' : 'stops'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Rate per Passenger:</span>
                    <span className="font-black text-[#7847CB] font-mono text-base">
                      ₹{testResult.ratePerPassenger}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-1.5">
                    <span>Base ₹{testResult.baseFare} + Cess ₹{testResult.govTax}</span>
                    <span className="font-bold text-slate-700">Total: ₹{testResult.totalFare}</span>
                  </div>
                </div>
              )}

              {/* Set Custom Pair Override */}
              <div className="p-3 bg-white/70 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Assign Exact Custom Price for This Pair (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-2 text-slate-400 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      placeholder="e.g. 15"
                      value={testCustomPrice}
                      onChange={(e) => setTestCustomPrice(e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomPairOverride}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs shrink-0 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Set Override</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SEQUENTIAL STAGE TABLE & OVERRIDES (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* STAGE FARES FROM ORIGIN TABLE */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Sequential Stage Fares (From Origin)</h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Set the cumulative fare from {activeRoute.origin} to each stop along Route {activeRoute.routeNumber}.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAutoGenerateStages}
                className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7847CB] text-xs font-bold transition-colors flex items-center gap-1.5 border border-purple-200 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Fill from Formula</span>
              </button>
            </div>

            {routeStops.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No stops defined for this route yet. Add stops in Route Corridors.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[460px] overflow-y-auto border border-slate-200/80 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Stop Name</th>
                      <th className="py-2.5 px-3">Stage Fare (₹)</th>
                      <th className="py-2.5 px-3">Delta From Prev</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {routeStops.map((stop, idx) => {
                      const name = getStopName(stop);
                      const customStage = currentRule.stageFaresFromOrigin?.[name];
                      const computedStage = idx === 0 
                        ? 0 
                        : idx === 1 
                          ? currentRule.baseFare 
                          : Math.min(currentRule.maxFare, currentRule.baseFare + (idx - 1) * currentRule.farePerStop);
                      const currentVal = customStage !== undefined ? customStage : computedStage;

                      // Delta
                      let delta = 0;
                      if (idx > 0) {
                        const prevName = getStopName(routeStops[idx - 1]);
                        const prevVal = currentRule.stageFaresFromOrigin?.[prevName] !== undefined
                          ? currentRule.stageFaresFromOrigin[prevName]
                          : idx - 1 === 0 ? 0 : currentRule.baseFare + (idx - 2) * currentRule.farePerStop;
                        delta = Math.max(0, currentVal - prevVal);
                      }

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-800 block">{name}</span>
                            {idx === 0 && (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block mt-0.5">
                                Origin Hub
                              </span>
                            )}
                            {idx === routeStops.length - 1 && (
                              <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 inline-block mt-0.5">
                                Destination Terminus
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-400 text-xs">₹</span>
                              <input
                                type="number"
                                min="0"
                                max={currentRule.maxFare}
                                value={currentVal}
                                onChange={(e) => handleUpdateStageFare(name, parseInt(e.target.value) || 0)}
                                className={`w-18 px-2 py-1 border rounded-lg font-mono font-bold text-xs text-center ${
                                  customStage !== undefined
                                    ? 'bg-purple-50 border-purple-300 text-purple-800'
                                    : 'bg-white border-slate-200 text-slate-800'
                                }`}
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 font-medium">
                            {idx === 0 ? '—' : `+₹${delta}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ACTIVE CUSTOM PAIR OVERRIDES LIST */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#7847CB]" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Active Specific Stop-Pair Overrides ({customPairsList.length})
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Exact prices assigned directly between two stops
              </span>
            </div>

            {customPairsList.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs space-y-1">
                <p className="font-bold text-slate-600">No custom stop-pair overrides configured.</p>
                <p className="text-[11px]">
                  All stops are calculating automatically via base rate + per-stop increment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {customPairsList.map(([key, price]) => {
                  const [from, to] = key.split('__');
                  return (
                    <div
                      key={key}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 truncate">
                          <span className="truncate capitalize">{from}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate capitalize">{to}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Fixed Corridor Price</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-black text-sm text-[#7847CB] bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                          ₹{price}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePairOverride(key)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove custom override"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

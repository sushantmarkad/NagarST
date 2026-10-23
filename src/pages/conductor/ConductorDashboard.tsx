import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/FeedbackContext';
import { useApp } from '../../context/AppContext';
import { SharedLayout, type NavItem } from '../../components/layout/SharedLayout';
import { QRScanner } from '../../components/scanner/QRScanner';
import {
  QrCode,
  Ticket as TicketIcon,
  CircleDollarSign,
  UserCheck,
  CheckCircle2,
  Users,
  Smartphone,
  Banknote,
  Plus,
  Minus,
  MapPin,
  ArrowRight,
  ChevronRight,
  Bus as BusIcon,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Clock,
  Printer,
  Compass,
  Check,
  ChevronDown
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/formatters';
import { calculateStopToStopFare } from '../../utils/fareEngine';
import {
  getBusOccupancyState,
  boardPassengerOnBus,
  deboardPassengersAtStop,
  manualAdjustPassengerCount,
  getAlightingSummaryByStop,
  isSameStop,
  type BusOccupancyState,
  type OnBoardPassenger
} from '../../utils/conductorManifestService';
import type { Route, BusType } from '../../types';

export const ConductorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const { stops, routes, buses, addTicket, tickets } = useApp();

  const [activeTab, setActiveTab] = useState<'pos' | 'scan' | 'manifest' | 'shift'>('pos');

  // Selected Bus and Route Duty
  const [selectedBusId, setSelectedBusId] = useState<string>(() => user?.assignedBusId || 'bus-ah24');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');

  useEffect(() => {
    if (user?.assignedBusId) {
      setSelectedBusId(user.assignedBusId);
    }
  }, [user?.assignedBusId]);

  // Find active bus object or fallback
  const activeBus = useMemo(() => {
    return (
      buses.find(
        (b) =>
          b.id === selectedBusId ||
          b.busNumber?.toLowerCase() === selectedBusId.toLowerCase() ||
          b.plateNumber?.toLowerCase() === selectedBusId.toLowerCase()
      ) || {
        id: 'bus-ah24',
        busNumber: 'AH-24',
        plateNumber: 'MH-16-CV-2024',
        maxCapacity: 45,
        busType: 'Standard City' as BusType,
      }
    );
  }, [buses, selectedBusId]);

  // Find active route corridor or fallback
  const activeRoute = useMemo(() => {
    if (routes && routes.length > 0) {
      return routes.find((r) => r.id === selectedRouteId) || routes[0];
    }
    return {
      id: 'route-cbs-savedi',
      routeNumber: '1',
      name: 'CBS ↔ Savedi Bus Terminal',
      origin: 'Central Bus Stand (CBS)',
      destination: 'Savedi Bus Terminal',
      stops: [
        { stopId: 's-1', stopName: 'Central Bus Stand (CBS)', sequence: 1 },
        { stopId: 's-2', stopName: 'Delhi Gate', sequence: 2 },
        { stopId: 's-3', stopName: 'Swastik Chowk', sequence: 3 },
        { stopId: 's-4', stopName: 'Premdan Chowk', sequence: 4 },
        { stopId: 's-5', stopName: 'Savedi Bus Terminal', sequence: 5 },
      ],
    };
  }, [routes, selectedRouteId]);

  const routeStops = useMemo(() => {
    if (activeRoute?.stops && activeRoute.stops.length > 0) {
      return activeRoute.stops;
    }
    return [
      { stopId: 's-1', stopName: activeRoute?.origin || 'Central Bus Stand (CBS)', sequence: 1 },
      { stopId: 's-2', stopName: 'Delhi Gate', sequence: 2 },
      { stopId: 's-3', stopName: 'Swastik Chowk', sequence: 3 },
      { stopId: 's-4', stopName: 'Premdan Chowk', sequence: 4 },
      { stopId: 's-5', stopName: activeRoute?.destination || 'Savedi Bus Terminal', sequence: 5 },
    ];
  }, [activeRoute]);

  // Set default route when available
  useEffect(() => {
    if (routes && routes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(routes[0].id);
    }
  }, [routes, selectedRouteId]);

  // Real-time Occupancy & Manifest State
  const [occupancyState, setOccupancyState] = useState<BusOccupancyState>(() => {
    const orig = routeStops[0]?.stopName || 'Central Bus Stand (CBS)';
    const nxt = routeStops[1]?.stopName || 'Delhi Gate';
    return getBusOccupancyState(selectedBusId, activeBus.busNumber, activeRoute?.id, orig, nxt);
  });

  // Re-sync occupancy state when selected bus changes
  useEffect(() => {
    const orig = routeStops[0]?.stopName || 'Central Bus Stand (CBS)';
    const nxt = routeStops[1]?.stopName || 'Delhi Gate';
    const state = getBusOccupancyState(selectedBusId, activeBus.busNumber, activeRoute?.id, orig, nxt);
    setOccupancyState(state);
  }, [selectedBusId, activeBus.busNumber, activeRoute?.id]);

  // Listen to external occupancy broadcast updates
  useEffect(() => {
    const handleOccupancyUpdate = (e: any) => {
      const detail = e.detail;
      if (detail && detail.busId === selectedBusId) {
        setOccupancyState(detail);
      }
    };
    window.addEventListener('nagarst_bus_occupancy_changed', handleOccupancyUpdate);
    return () => window.removeEventListener('nagarst_bus_occupancy_changed', handleOccupancyUpdate);
  }, [selectedBusId]);

  // Current Stop and Next Stop derived from occupancyState or routeStops
  const currentStopIndex = Math.min(Math.max(0, occupancyState.currentStopIndex || 0), routeStops.length - 1);
  const currentStopName = routeStops[currentStopIndex]?.stopName || routeStops[0]?.stopName || 'Central Bus Stand (CBS)';
  const nextStopIndex = currentStopIndex < routeStops.length - 1 ? currentStopIndex + 1 : currentStopIndex;
  const nextStopName = currentStopIndex < routeStops.length - 1 ? routeStops[nextStopIndex]?.stopName : 'End of Route';

  // Fast POS Ticketing State
  const [originStop, setOriginStop] = useState<string>(currentStopName);
  const [destinationStop, setDestinationStop] = useState<string>(nextStopName);
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [lastIssuedTicket, setLastIssuedTicket] = useState<any | null>(null);

  // Synchronize origin stop when bus arrives at a new stop
  useEffect(() => {
    setOriginStop(currentStopName);
    if (currentStopIndex < routeStops.length - 1) {
      setDestinationStop(routeStops[currentStopIndex + 1]?.stopName);
    }
  }, [currentStopName, currentStopIndex, routeStops]);

  // Calculate dynamic fare using pricing engine
  const calculatedFareResult = useMemo(() => {
    if (!originStop || !destinationStop) return null;
    return calculateStopToStopFare({
      route: activeRoute,
      sourceStop: originStop,
      destinationStop: destinationStop,
      busType: activeBus.busType || 'Standard City',
      passengerCount: passengerCount,
    });
  }, [activeRoute, originStop, destinationStop, activeBus.busType, passengerCount]);

  const totalFare = calculatedFareResult?.totalFare || passengerCount * 15;

  // Breakdown of passengers scheduled to alight at each stop
  const alightingSummary = useMemo(() => {
    return getAlightingSummaryByStop(occupancyState.passengers);
  }, [occupancyState.passengers]);

  const passengersAlightingAtNextStop = alightingSummary[nextStopName] || 0;

  // ==========================================
  // HANDLERS
  // ==========================================

  // 1. Conductor issues ticket by taking cash or UPI
  const handleIssueTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originStop || !destinationStop || originStop === destinationStop) {
      toast.error('Please choose two distinct stops.');
      return;
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const code = `NST-CASH-${randomNum}`;

    // 1. Add to on-board passenger manifest (INCREASES COUNT)
    const { updatedState } = boardPassengerOnBus(selectedBusId, {
      ticketCode: code,
      sourceStop: originStop,
      destinationStop: destinationStop,
      passengerCount: passengerCount,
      fare: totalFare,
      paymentMode: paymentMode,
      boardedAtStop: originStop,
    });
    setOccupancyState(updatedState);

    // 2. Add to real app tickets for passenger record
    const created = addTicket({
      sourceStop: originStop,
      destinationStop: destinationStop,
      passengerCount: passengerCount,
      fare: totalFare,
      fareBreakup: {
        baseFare: calculatedFareResult?.baseFare || totalFare,
        govTax: calculatedFareResult?.govTax || 1,
        discount: 0,
        total: totalFare,
      },
      busType: activeBus.busType || 'Standard City',
    });

    setLastIssuedTicket({
      ...created,
      ticketCode: code,
      sourceStop: originStop,
      destinationStop: destinationStop,
      passengerCount: passengerCount,
      fare: totalFare,
      paymentMode: paymentMode,
      issuedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    // 3. Update shift ledger storage
    try {
      const prevShift = JSON.parse(localStorage.getItem('nagarst_conductor_shift') || '{}');
      const updatedShift = {
        scannedCount: (prevShift.scannedCount || 0),
        issuedCount: (prevShift.issuedCount || 0) + passengerCount,
        cashCollected: paymentMode === 'cash' ? (prevShift.cashCollected || 0) + totalFare : (prevShift.cashCollected || 0),
        upiCollected: paymentMode === 'upi' ? (prevShift.upiCollected || 0) + totalFare : (prevShift.upiCollected || 0),
      };
      localStorage.setItem('nagarst_conductor_shift', JSON.stringify(updatedShift));
    } catch (_) {}

    toast.success(
      `Collected ${formatCurrency(totalFare)} (${paymentMode.toUpperCase()}) • Boarded ${passengerCount} Passenger(s) to ${destinationStop}!`,
      'Passenger Boarded (Count +)'
    );
  };

  // 2. Bus arrives at stop -> Passengers for this stop ALIGHT (DECREASES COUNT)
  const handleArriveAtStop = (targetStopName: string) => {
    const targetIdx = routeStops.findIndex((s) => isSameStop(s.stopName, targetStopName));
    const nextIdx = targetIdx !== -1 && targetIdx < routeStops.length - 1 ? targetIdx + 1 : targetIdx;
    const nextName = routeStops[nextIdx]?.stopName || 'End of Corridor';

    const { updatedState, alightedCount } = deboardPassengersAtStop(
      selectedBusId,
      targetStopName,
      nextName,
      targetIdx !== -1 ? targetIdx : currentStopIndex + 1
    );

    setOccupancyState(updatedState);

    if (alightedCount > 0) {
      toast.success(
        `Arrived at ${targetStopName}! ${alightedCount} passenger(s) alighted. On-board load decreased to ${updatedState.passengerCount}.`,
        'Passengers Deboarded (Count -)'
      );
    } else {
      toast.info(`Arrived at ${targetStopName}. 0 passengers booked to alight here. Current load: ${updatedState.passengerCount}.`);
    }
  };

  // 3. Fast Manual Adjustment (+ / -)
  const handleAdjustCount = (delta: number) => {
    const updated = manualAdjustPassengerCount(selectedBusId, delta);
    setOccupancyState(updated);
    if (delta > 0) {
      toast.success(`Added +1 passenger manually. On-board load: ${updated.passengerCount}`);
    } else {
      toast.info(`Deboarded -1 passenger manually. On-board load: ${updated.passengerCount}`);
    }
  };

  // 4. Check in recent digital booking from tickets context
  const handleCheckInDigitalTicket = (tkt: any) => {
    const { updatedState } = boardPassengerOnBus(selectedBusId, {
      ticketCode: tkt.ticketCode || tkt.id,
      sourceStop: tkt.sourceStop || currentStopName,
      destinationStop: tkt.destinationStop || nextStopName,
      passengerCount: tkt.passengerCount || 1,
      fare: tkt.fare || 15,
      paymentMode: 'qr_ticket',
      boardedAtStop: currentStopName,
    });
    setOccupancyState(updatedState);

    toast.success(
      `QR Ticket ${tkt.ticketCode || tkt.id} verified! +${tkt.passengerCount || 1} passenger boarded (Alighting at ${tkt.destinationStop}).`,
      'Passenger Check-in Complete'
    );
  };

  // Shift collection totals
  const shiftTotals = useMemo(() => {
    try {
      const saved = localStorage.getItem('nagarst_conductor_shift');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      scannedCount: occupancyState.passengers.filter((p) => p.paymentMode === 'qr_ticket' || p.paymentMode === 'pass').length,
      issuedCount: occupancyState.totalBoardedToday,
      cashCollected: occupancyState.passengers.filter((p) => p.paymentMode === 'cash').reduce((sum, p) => sum + p.fare, 0),
      upiCollected: occupancyState.passengers.filter((p) => p.paymentMode === 'upi').reduce((sum, p) => sum + p.fare, 0),
    };
  }, [occupancyState]);

  // Navigation Items
  const navItems: NavItem[] = [
    {
      id: 'pos',
      label: 'Fast Ticketing & POS',
      icon: TicketIcon,
      onClick: () => setActiveTab('pos'),
      isActive: activeTab === 'pos',
    },
    {
      id: 'scan',
      label: 'QR Scanner & Check-in',
      icon: QrCode,
      onClick: () => setActiveTab('scan'),
      isActive: activeTab === 'scan',
    },
    {
      id: 'manifest',
      label: `On-Board Manifest (${occupancyState.passengerCount})`,
      icon: Users,
      onClick: () => setActiveTab('manifest'),
      isActive: activeTab === 'manifest',
      badge: occupancyState.passengerCount,
    },
    {
      id: 'shift',
      label: 'Trip Ledger',
      icon: CircleDollarSign,
      onClick: () => setActiveTab('shift'),
      isActive: activeTab === 'shift',
    },
  ];

  // Occupancy percentage and colors
  const occupancyPercent = Math.min(100, Math.round((occupancyState.passengerCount / occupancyState.maxCapacity) * 100));
  const occupancyColor =
    occupancyState.occupancy === 'high'
      ? 'from-rose-500 to-red-600'
      : occupancyState.occupancy === 'moderate'
        ? 'from-amber-400 to-amber-500'
        : 'from-emerald-500 to-teal-500';

  return (
    <SharedLayout
      navItems={navItems}
      title="Conductor Terminal"
      subtitle={`Staff: ${user?.name || 'Conductor'} • Bus ${activeBus.busNumber}`}
      headerIcon={UserCheck}
    >
      <div className="flex-1 p-3 md:p-6 max-w-4xl mx-auto w-full space-y-4 md:space-y-6 overflow-y-auto">
        
        {/* =========================================================================
            1. VEHICLE & ROUTE CORRIDOR SELECTION STRIP
           ========================================================================= */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7847CB] to-purple-600 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
              <BusIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm md:text-base truncate">
                  Bus {activeBus.busNumber}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                  {activeBus.plateNumber}
                </span>
              </div>
              <span className="text-xs text-slate-500 block truncate">
                Capacity: <strong>{occupancyState.maxCapacity} Seats</strong> • {activeBus.busType}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Bus Switcher */}
            <select
              value={selectedBusId}
              onChange={(e) => setSelectedBusId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              {buses.length > 0 ? (
                buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    Bus {b.busNumber} ({b.plateNumber})
                  </option>
                ))
              ) : (
                <option value="bus-ah24">Bus AH-24 (MH-16-CV-2024)</option>
              )}
            </select>

            {/* Route Switcher */}
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              {routes.length > 0 ? (
                routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    Route {r.routeNumber}: {r.origin} ➔ {r.destination}
                  </option>
                ))
              ) : (
                <option value="route-cbs-savedi">Route 1: CBS ➔ Savedi</option>
              )}
            </select>
          </div>
        </div>

        {/* =========================================================================
            2. REAL-TIME LIVE PASSENGER LOAD & OCCUPANCY HUD
           ========================================================================= */}
        <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-md relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Passenger Count Numbers */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-extrabold text-purple-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-400" />
                  Live Passenger Load Onboard
                </span>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    occupancyState.occupancy === 'high'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : occupancyState.occupancy === 'moderate'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {occupancyState.occupancy === 'high'
                    ? 'Standing Crowd / Full'
                    : occupancyState.occupancy === 'moderate'
                      ? 'Moderate Load'
                      : 'Seats Plenty'}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-black font-mono tracking-tight text-white tabular-nums">
                  {occupancyState.passengerCount}
                </span>
                <span className="text-base text-slate-400 font-semibold font-mono">
                  / {occupancyState.maxCapacity} Max Capacity
                </span>
                <span className="text-xs text-emerald-400 font-bold ml-2">
                  ({occupancyState.availableSeats} Free Seats)
                </span>
              </div>
            </div>

            {/* Quick Adjustment Buttons */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() => handleAdjustCount(-1)}
                disabled={occupancyState.passengerCount <= 0}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white rounded-xl border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
                title="Decrease passenger count by 1"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>-1 Alighted</span>
              </button>

              <button
                type="button"
                onClick={() => handleAdjustCount(1)}
                className="px-3 py-2 bg-purple-600/80 hover:bg-purple-600 text-white rounded-xl border border-purple-500 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                title="Increase passenger count by 1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+1 Boarded</span>
              </button>
            </div>
          </div>

          {/* Visual Occupancy Gauge */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between items-center text-[11px] text-slate-300 font-medium">
              <span>Bus Occupancy Level: {occupancyPercent}%</span>
              <span>
                Today's Trips: {occupancyState.totalBoardedToday} Boarded • {occupancyState.totalAlightedToday} Alighted
              </span>
            </div>
            <div className="w-full h-3 bg-slate-700/60 rounded-full overflow-hidden p-0.5 border border-slate-600/50">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${occupancyColor} transition-all duration-500`}
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. SEQUENTIAL ROUTE STOPS & DYNAMIC STOP ALIGHTING BAR
           ========================================================================= */}
        <div className="p-4 md:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#7847CB]" />
              <h3 className="font-extrabold text-slate-900 text-xs md:text-sm">
                Corridor Stop Engine • Route {activeRoute.routeNumber}
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Stop {currentStopIndex + 1} of {routeStops.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Current & Next Stop Details */}
            <div className="md:col-span-7 flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Current Bus Stop
                </span>
                <span className="text-xs md:text-sm font-extrabold text-slate-900 truncate block mt-0.5">
                  {currentStopName}
                </span>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

              <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                    Approaching Stop
                  </span>
                  {passengersAlightingAtNextStop > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[9px] font-black animate-pulse">
                      {passengersAlightingAtNextStop} Alighting
                    </span>
                  )}
                </div>
                <span className="text-xs md:text-sm font-extrabold text-purple-950 truncate block mt-0.5">
                  {nextStopName}
                </span>
              </div>
            </div>

            {/* Quick Button: Arrive at Stop & Alight Passengers */}
            <div className="md:col-span-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleArriveAtStop(nextStopName)}
                disabled={currentStopIndex >= routeStops.length - 1}
                className={`w-full py-3 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-xs ${
                  passengersAlightingAtNextStop > 0
                    ? 'bg-[#7847CB] hover:bg-[#663ab3] text-white shadow-[#7847CB]/30'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <MapPin className="w-4 h-4" />
                <span>
                  {currentStopIndex >= routeStops.length - 1
                    ? 'Terminal Stop Reached'
                    : `Arrive at ${nextStopName} ${passengersAlightingAtNextStop > 0 ? `(-${passengersAlightingAtNextStop} Pax)` : ''}`}
                </span>
              </button>
            </div>
          </div>

          {/* Mini Stop Progress Dots */}
          <div className="pt-2 flex items-center justify-between overflow-x-auto gap-2">
            {routeStops.map((stop, idx) => {
              const isPast = idx < currentStopIndex;
              const isCurr = idx === currentStopIndex;
              const willAlight = alightingSummary[stop.stopName] || 0;

              return (
                <div
                  key={stop.stopId || idx}
                  onClick={() => handleArriveAtStop(stop.stopName)}
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
                    isCurr
                      ? 'bg-purple-100 border-[#7847CB] text-[#7847CB] ring-2 ring-[#7847CB]/20'
                      : isPast
                        ? 'bg-slate-50 border-slate-200 text-slate-400'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title={`Click to set bus at ${stop.stopName}`}
                >
                  <span className="font-mono text-[10px]">{idx + 1}.</span>
                  <span className="truncate max-w-[100px]">{stop.stopName}</span>
                  {willAlight > 0 && (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-mono">
                      {willAlight}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            TAB 1: FAST CASH / UPI TICKET ISSUANCE (POS)
           ========================================================================= */}
        {activeTab === 'pos' && (
          <form onSubmit={handleIssueTicket} className="p-5 md:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm md:text-base font-bold text-slate-900">
                  On-Board Cash / UPI Ticket Issuance
                </h3>
                <p className="text-xs text-slate-500">
                  Submit ticket to automatically increase on-board passenger count
                </p>
              </div>
              <Badge variant="brand" size="sm">
                Route {activeRoute.routeNumber} Tariff
              </Badge>
            </div>

            {/* Stop Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Boarding Stop (From)
                </label>
                <select
                  value={originStop}
                  onChange={(e) => setOriginStop(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#7847CB]"
                >
                  {routeStops.map((s, i) => (
                    <option key={i} value={s.stopName}>
                      {s.stopName} {isSameStop(s.stopName, currentStopName) ? '(Current Stop)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Destination Stop (To)
                </label>
                <select
                  value={destinationStop}
                  onChange={(e) => setDestinationStop(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#7847CB]"
                >
                  {routeStops.map((s, i) => (
                    <option key={i} value={s.stopName}>
                      {s.stopName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Passenger Count Selection */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  3. Number of Passengers
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Increases bus count by {passengerCount}</span>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5, 6].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setPassengerCount(cnt)}
                    className={`flex-1 py-3 rounded-xl border text-sm font-black transition-all ${
                      passengerCount === cnt
                        ? 'bg-[#7847CB] text-white border-[#7847CB] shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Mode Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                4. Payment Received via
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMode('cash')}
                  className={`p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    paymentMode === 'cash'
                      ? 'bg-purple-50 border-[#7847CB] text-[#7847CB] ring-1 ring-[#7847CB]/20'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <Banknote className="w-4 h-4" /> Cash Currency
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('upi')}
                  className={`p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    paymentMode === 'upi'
                      ? 'bg-purple-50 border-[#7847CB] text-[#7847CB] ring-1 ring-[#7847CB]/20'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <Smartphone className="w-4 h-4" /> Conductor UPI QR
                </button>
              </div>
            </div>

            {/* Fare Summary & Submit Button */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">
                  Dynamic Tariff ({originStop} ➔ {destinationStop})
                </span>
                <span className="text-xl md:text-2xl font-black text-slate-900 tabular-nums">
                  {formatCurrency(totalFare)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {passengerCount} person(s) @ ₹{Math.round(totalFare / passengerCount)}/head
                </span>
              </div>

              <Button type="submit" size="lg" className="px-6 py-3 shadow-md shadow-[#7847CB]/20">
                <Check className="w-4 h-4 mr-1.5" />
                Collect Cash & Board Passenger (+{passengerCount})
              </Button>
            </div>
          </form>
        )}

        {/* =========================================================================
            TAB 2: QR SCANNER & DIGITAL CHECK-IN
           ========================================================================= */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
              <QRScanner />
            </div>

            {/* Quick Check-in from Recent Digital Bookings */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <TicketIcon className="w-4 h-4 text-[#7847CB]" />
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-tight">
                    Quick Check-in from Citizen Mobile Bookings
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-slate-400">Tap to board onto bus</span>
              </div>

              {tickets.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  No pending mobile passenger tickets in database.
                </p>
              ) : (
                <div className="space-y-2">
                  {tickets.slice(0, 5).map((tkt) => (
                    <div
                      key={tkt.id}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-purple-50/60 border border-slate-200/80 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <span>{tkt.sourceStop}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span>{tkt.destinationStop}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Code: <strong className="font-mono text-[#7847CB]">{tkt.ticketCode}</strong> • {tkt.passengerCount || 1} Pax • {formatCurrency(tkt.fare)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCheckInDigitalTicket(tkt)}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs shrink-0 flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Check-in & Board</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: LIVE PASSENGER MANIFEST (WHO IS ON THE BUS)
           ========================================================================= */}
        {activeTab === 'manifest' && (
          <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm md:text-base font-bold text-slate-900">
                  Active On-Board Passenger Manifest
                </h3>
                <p className="text-xs text-slate-500">
                  {occupancyState.passengerCount} passengers currently traveling inside Bus {activeBus.busNumber}
                </p>
              </div>
              <Badge variant="brand" size="sm">
                {occupancyState.passengerCount} on Board
              </Badge>
            </div>

            {/* Grouped by Destination Stop */}
            <div className="space-y-3">
              {routeStops.map((stop, sIdx) => {
                const passengersForStop = occupancyState.passengers.filter(
                  (p) => p.status === 'on_board' && isSameStop(p.destinationStop, stop.stopName)
                );
                const countForStop = passengersForStop.reduce((sum, p) => sum + (p.passengerCount || 1), 0);
                const isPassed = sIdx < currentStopIndex;
                const isCurr = sIdx === currentStopIndex;

                if (countForStop === 0) return null;

                return (
                  <div
                    key={stop.stopId || sIdx}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-100 text-[#7847CB] text-xs font-black flex items-center justify-center font-mono">
                          {sIdx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 text-xs">
                            Alighting at: <strong>{stop.stopName}</strong>
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {countForStop} Passenger(s) booked for this stop
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleArriveAtStop(stop.stopName)}
                        className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors"
                      >
                        Alight All ({countForStop})
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 text-xs">
                      {passengersForStop.map((p) => (
                        <div key={p.id} className="py-2 flex items-center justify-between text-slate-700">
                          <div>
                            <span className="font-mono font-bold text-[#7847CB]">{p.ticketCode}</span>
                            <span className="text-[11px] text-slate-400 ml-2">
                              {p.passengerCount} Person(s) • {formatCurrency(p.fare)} ({p.paymentMode.toUpperCase()})
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Boarded at: {p.boardedAtStop} ({p.boardedAtTime})
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              deboardPassengersAtStop(selectedBusId, p.destinationStop);
                              toast.info(`Deboarded passenger ${p.ticketCode}`);
                            }}
                            className="text-[11px] text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded bg-rose-50 border border-rose-200"
                          >
                            Deboard
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {occupancyState.passengerCount === 0 && (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-600">Bus is Currently Empty (0 Passengers)</p>
                  <p className="mt-0.5">Issue tickets via POS or scan citizen QR codes to board passengers.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: SHIFT / TRIP LEDGER
           ========================================================================= */}
        {activeTab === 'shift' && (
          <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm md:text-base font-bold text-slate-900">
                  Duty Shift Collection Ledger
                </h3>
                <p className="text-xs text-slate-500">
                  Reconciled cash collection and digital QR ticket counts
                </p>
              </div>
              <Badge variant="success" size="sm">Active Duty</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-500 font-medium block mb-1">Cash in Bag</span>
                <span className="text-lg md:text-xl font-black text-slate-900">
                  {formatCurrency(shiftTotals.cashCollected || 0)}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-500 font-medium block mb-1">Digital UPI / QR Fares</span>
                <span className="text-lg md:text-xl font-black text-[#7847CB]">
                  {formatCurrency(shiftTotals.upiCollected || 0)}
                </span>
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-purple-900 block">Total Shift Revenue</span>
                <span className="text-[11px] text-purple-600">Combined Cash + UPI</span>
              </div>
              <span className="text-xl md:text-2xl font-black text-[#7847CB]">
                {formatCurrency((shiftTotals.cashCollected || 0) + (shiftTotals.upiCollected || 0))}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-100">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Total Boarded</span>
                <span className="font-extrabold text-slate-800 text-sm">{occupancyState.totalBoardedToday}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Total Alighted</span>
                <span className="font-extrabold text-slate-800 text-sm">{occupancyState.totalAlightedToday}</span>
              </div>
              <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200">
                <span className="text-[10px] text-[#7847CB] block">Currently on Board</span>
                <span className="font-extrabold text-[#7847CB] text-sm">{occupancyState.passengerCount}</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="md"
              className="w-full mt-2"
              onClick={() => toast.success('Shift settlement export generated for Ahilyanagar Central Depot Archive.')}
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Export Shift Settlement to Depot
            </Button>
          </div>
        )}

      </div>
    </SharedLayout>
  );
};

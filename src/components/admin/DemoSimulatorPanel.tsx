import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/FeedbackContext';
import {
  Play,
  Square,
  FastForward,
  Clock,
  Compass,
  Gauge,
  MapPin,
  AlertTriangle,
  Activity,
  ShieldAlert,
  ExternalLink,
  Bus as BusIcon,
  CheckCircle2,
  Route,
  ArrowRight,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  startAllBuses,
  stopAllBuses,
  startBus,
  stopBus,
  setAllBusSpeed,
  setBusSpeed,
  setBusDelay,
  setBusAssignedRoute,
  subscribeToDemoState,
  getDemoSimulatorState,
  DEMO_BUS_DEFINITIONS,
  AVAILABLE_DEMO_ROUTES,
  type DemoSimulatorState,
  type BusSimRuntime,
  type DemoRoutePreset
} from '../../utils/demoSimulatorEngine';
import { Link } from 'react-router-dom';

interface DemoSimulatorPanelProps {
  onSelectBusOnMap?: (busId: string) => void;
  selectedBusId?: string;
  className?: string;
  isCompact?: boolean;
}

export const DemoSimulatorPanel: React.FC<DemoSimulatorPanelProps> = ({
  onSelectBusOnMap,
  selectedBusId: externalSelectedBusId,
  className = '',
  isCompact = false
}) => {
  const { user } = useAuth();
  const toast = useToast();

  const [simState, setSimState] = useState<DemoSimulatorState>(getDemoSimulatorState);
  const [selectedBusId, setSelectedBusId] = useState<string>(
    externalSelectedBusId || DEMO_BUS_DEFINITIONS[0].id
  );
  const [selectedRoutePresetId, setSelectedRoutePresetId] = useState<string>('route-12');
  const [isReverseDirection, setIsReverseDirection] = useState<boolean>(false);
  const [showStopsList, setShowStopsList] = useState<boolean>(true);

  // Sync external selected bus if provided
  useEffect(() => {
    if (externalSelectedBusId) {
      setSelectedBusId(externalSelectedBusId);
    }
  }, [externalSelectedBusId]);

  // Authorization Check
  const allowedRoles = ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER'];
  const isAuthorized = user?.role && allowedRoles.includes(user.role);

  useEffect(() => {
    const unsubscribe = subscribeToDemoState((newState) => {
      setSimState(newState);
    });
    return () => unsubscribe();
  }, []);

  const activeBusRuntime: BusSimRuntime | undefined = simState.buses[selectedBusId] || Object.values(simState.buses)[0];
  const isSelectedBusRunning = Boolean(activeBusRuntime?.isRunning);
  const isSelectedDelayActive = Boolean(activeBusRuntime && activeBusRuntime.delayMinutes > 0);

  // Sync route preset ID when active bus changes
  useEffect(() => {
    if (activeBusRuntime?.def.routeId) {
      setSelectedRoutePresetId(activeBusRuntime.def.routeId);
    }
  }, [selectedBusId]);

  const activePreset: DemoRoutePreset =
    AVAILABLE_DEMO_ROUTES.find((r) => r.id === selectedRoutePresetId) || AVAILABLE_DEMO_ROUTES[0];

  const handleStartAll = () => {
    if (!isAuthorized) {
      toast.error('Unauthorized: Multi-bus simulator requires Administrator authorization.');
      return;
    }
    startAllBuses({ speedMultiplier: simState.speedMultiplier });
    toast.success('All demo buses are now running simultaneously across Ahilyanagar corridors!', 'Fleet Live');
    onSelectBusOnMap?.(selectedBusId);
  };

  const handleStopAll = () => {
    if (!isAuthorized) return;
    stopAllBuses();
    toast.info('All simulated demo buses stopped and cleared from live maps.');
  };

  const handleToggleSelectedBus = () => {
    if (!isAuthorized || !activeBusRuntime) return;
    if (isSelectedBusRunning) {
      stopBus(activeBusRuntime.id);
      toast.info(`Stopped ${activeBusRuntime.def.busNumber}.`);
    } else {
      startBus(activeBusRuntime.id, { speedMultiplier: activeBusRuntime.speedMultiplier });
      toast.success(`${activeBusRuntime.def.busNumber} started on ${activeBusRuntime.def.routeNumber}.`);
      onSelectBusOnMap?.(activeBusRuntime.id);
    }
  };

  const handleRouteChange = (newRouteId: string) => {
    setSelectedRoutePresetId(newRouteId);
    if (!activeBusRuntime) return;
    setBusAssignedRoute(activeBusRuntime.id, newRouteId, isReverseDirection);
    toast.info(`Assigned ${newRouteId.toUpperCase()} to ${activeBusRuntime.def.busNumber}.`);
    onSelectBusOnMap?.(activeBusRuntime.id);
  };

  const handleToggleDirection = () => {
    const nextReverse = !isReverseDirection;
    setIsReverseDirection(nextReverse);
    if (!activeBusRuntime) return;
    setBusAssignedRoute(activeBusRuntime.id, selectedRoutePresetId, nextReverse);
    toast.info(`Reversed route direction for ${activeBusRuntime.def.busNumber}.`);
  };

  const handleSpeedChange = (mult: number) => {
    setAllBusSpeed(mult);
    toast.info(`Simulation speed adjusted to ${mult}x for all buses.`);
  };

  const handleToggleDelay = () => {
    if (!activeBusRuntime) return;
    const next = !isSelectedDelayActive;
    setBusDelay(activeBusRuntime.id, next ? 5 : 0);
    if (next) {
      toast.warning(`Injected 5-minute traffic delay into ${activeBusRuntime.def.busNumber}.`, 'Delay Active');
    } else {
      toast.success(`Cleared traffic delay for ${activeBusRuntime.def.busNumber}. Back on nominal ETA.`);
    }
  };

  if (!isAuthorized) {
    return (
      <div className={`p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm text-slate-800 ${className}`}>
        <div className="flex items-center gap-3 text-amber-600 mb-2">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <h3 className="font-bold text-sm">Demo Simulation Access Restricted</h3>
        </div>
        <p className="text-xs text-slate-500">
          Only Municipal Transit Administrators and Dispatch Managers are authorized to control live GPS simulators.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white text-slate-900 rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col ${className}`}>
      
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 text-[#7847CB] flex items-center justify-center font-bold shadow-xs">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                GPS Multi-Bus Simulator
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                SANDBOX
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Select predefined corridors, inspect route stops, and broadcast road GPS coordinates
            </p>
          </div>
        </div>

        <Badge variant={simState.isRunning ? 'brand' : 'neutral'} size="sm" dot>
          {simState.activeBusCount > 0 ? `${simState.activeBusCount} Buses Active` : 'Simulator Standby'}
        </Badge>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        
        {/* Master Start All / Stop All Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleStartAll}
            size="lg"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md shadow-emerald-600/20"
            leftIcon={<Play className="w-4 h-4 fill-white" />}
          >
            Start All Demos
          </Button>

          <Button
            onClick={handleStopAll}
            disabled={!simState.isRunning}
            size="lg"
            variant="outline"
            className="w-full border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100/70 font-bold disabled:opacity-40"
            leftIcon={<Square className="w-4 h-4 fill-rose-600 text-rose-600" />}
          >
            Stop All
          </Button>
        </div>

        {/* Global Replay Velocity Selector */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <FastForward className="w-4 h-4 text-[#7847CB]" /> Replay Speed Multiplier
            </span>
            <span className="font-mono text-purple-700 font-black">{simState.speedMultiplier}x Velocity</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 5, 10].map((mult) => (
              <button
                key={mult}
                type="button"
                onClick={() => handleSpeedChange(mult)}
                className={`py-1.5 rounded-xl font-mono text-xs font-black transition-all ${
                  simState.speedMultiplier === mult
                    ? 'bg-[#7847CB] text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {mult}x
              </button>
            ))}
          </div>
        </div>

        {/* Multi-Bus Fleet Tabs */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center gap-1.5">
              <BusIcon className="w-3.5 h-3.5 text-[#7847CB]" /> 1. Select Demo Bus ({DEMO_BUS_DEFINITIONS.length})
            </span>
            <span className="text-[11px] text-slate-400">Click to configure</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {DEMO_BUS_DEFINITIONS.map((def) => {
              const runtime = simState.buses[def.id];
              const isSelected = selectedBusId === def.id;
              const isRunning = Boolean(runtime?.isRunning);

              return (
                <div
                  key={def.id}
                  onClick={() => {
                    setSelectedBusId(def.id);
                    onSelectBusOnMap?.(def.id);
                  }}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="px-2 py-0.5 rounded-md text-[11px] font-black text-white"
                      style={{ backgroundColor: runtime?.def.color || def.color }}
                    >
                      {def.busNumber}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 truncate">
                    {runtime?.def.routeNumber || def.routeNumber}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    {runtime?.def.destination || def.destination}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. ROUTE & STOPS SELECTION BEFORE STARTING */}
        {activeBusRuntime && (
          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5 text-[#7847CB]" /> 2. Choose Route Corridor & Direction
              </span>
              <button
                type="button"
                onClick={handleToggleDirection}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white text-slate-700 hover:text-purple-700 border border-slate-200 text-[11px] font-bold shadow-2xs transition-colors"
                title="Reverse Start and End terminals"
              >
                <ArrowLeftRight className="w-3 h-3 text-[#7847CB]" />
                <span>Flip Direction</span>
              </button>
            </div>

            {/* Route Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 block">
                Assign Corridor for {activeBusRuntime.def.busNumber}:
              </label>
              <select
                value={selectedRoutePresetId}
                onChange={(e) => handleRouteChange(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#7847CB]"
              >
                {AVAILABLE_DEMO_ROUTES.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.routeNumber} — {preset.origin} ➔ {preset.destination} ({preset.stops.length} stops)
                  </option>
                ))}
              </select>
            </div>

            {/* Where to Where Banner */}
            <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-[#7847CB]">
                  {activeBusRuntime.def.routeNumber} Corridor
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {activeBusRuntime.def.stops.length} Scheduled Stops
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 bg-slate-50 p-2 rounded-lg">
                <div className="min-w-0 truncate text-purple-900">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">ORIGIN</span>
                  {activeBusRuntime.def.origin}
                </div>
                <ArrowRight className="w-4 h-4 text-[#7847CB] shrink-0" />
                <div className="min-w-0 truncate text-emerald-900">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">DESTINATION</span>
                  {activeBusRuntime.def.destination}
                </div>
              </div>
            </div>

            {/* Stops along this route preview */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setShowStopsList(!showStopsList)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-700 py-1"
              >
                <span>Stops on this Route ({activeBusRuntime.def.stops.length})</span>
                {showStopsList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showStopsList && (
                <div className="p-2 bg-white rounded-xl border border-slate-200/80 max-h-40 overflow-y-auto space-y-1.5 text-xs">
                  {activeBusRuntime.def.stops.map((stop, i) => (
                    <div
                      key={stop.id}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 text-slate-700"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-[#7847CB] font-mono text-[10px] font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-semibold truncate">{stop.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {i === 0 ? 'Depot Start' : i === activeBusRuntime.def.stops.length - 1 ? 'Terminal Hub' : 'Way Stop'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Bus Live HUD Card */}
        {activeBusRuntime && (
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900">
                    {activeBusRuntime.def.busNumber}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    ({activeBusRuntime.def.plateNumber})
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">{activeBusRuntime.def.routeName}</p>
              </div>

              <button
                type="button"
                onClick={handleToggleSelectedBus}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  isSelectedBusRunning
                    ? 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-200'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs'
                }`}
              >
                {isSelectedBusRunning ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-rose-800" /> Stop Bus
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" /> Start Bus on Route
                  </>
                )}
              </button>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center justify-center gap-1">
                  <Gauge className="w-3 h-3 text-[#7847CB]" /> Velocity
                </span>
                <span className="font-mono font-black text-sm text-slate-900">
                  {activeBusRuntime.currentBus?.speedKmh || 30} <span className="text-[10px] text-slate-500 font-normal">km/h</span>
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center justify-center gap-1">
                  <Compass className="w-3 h-3 text-blue-500" /> Heading
                </span>
                <span className="font-mono font-black text-sm text-slate-900">
                  {activeBusRuntime.currentBus?.heading || 0}°
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500" /> Stop ETA
                </span>
                <span className="font-mono font-black text-sm text-purple-700">
                  {activeBusRuntime.currentBus?.etaToNextMinutes || 1} <span className="text-[10px] font-normal">min</span>
                </span>
              </div>
            </div>

            {/* Approaching stop & delay injector */}
            <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Approaching Next Stop</span>
                <span className="font-bold text-slate-800 truncate block">
                  {activeBusRuntime.currentBus?.nextStopName || activeBusRuntime.def.stops[1]?.name || 'Depot'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleDelay}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelectedDelayActive
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Inject 5-minute simulated traffic delay"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                {isSelectedDelayActive ? '+5m Active' : 'Inject Delay'}
              </button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                <span>Route Progress</span>
                <span className="font-mono">{activeBusRuntime.progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7847CB] to-purple-500 transition-all duration-300"
                  style={{ width: `${Math.max(5, activeBusRuntime.progressPercent)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Quick Link to Commuter Tracking Map */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">View on Passenger Tracking Map:</span>
          <Link
            to="/tracking"
            className="flex items-center gap-1 text-[#7847CB] hover:text-purple-800 font-bold hover:underline"
          >
            <span>Open Commuter Map</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

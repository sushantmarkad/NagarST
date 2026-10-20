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
  Sparkles,
  Lock,
  RotateCcw,
  Layers,
  Flag,
  Target,
  Plus,
  Loader2,
  X,
  Crosshair,
  Check,
  Trash2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  startAllBuses,
  stopAllBuses,
  resetAllBuses,
  resetBus,
  startBus,
  stopBus,
  setAllBusSpeed,
  setBusSpeed,
  setBusDelay,
  setBusAssignedRoute,
  setAllBusesAssignedRoute,
  subscribeToDemoState,
  getDemoSimulatorState,
  addNewCustomBus,
  deleteDemoBus,
  addNewCustomRoute,
  setBusCustomCorridor,
  DEMO_BUS_DEFINITIONS,
  AVAILABLE_DEMO_ROUTES,
  type DemoSimulatorState,
  type BusSimRuntime,
  type DemoRoutePreset,
  type DemoStop
} from '../../utils/demoSimulatorEngine';
import { fetchShortestRoadCorridor, findStopsAlongRoad } from '../../utils/routing';
import { MOCK_BUS_STOPS } from '../../data/mockStops';
import { Link } from 'react-router-dom';

import { useApp } from '../../context/AppContext';

interface DemoSimulatorPanelProps {
  onSelectBusOnMap?: (busId: string) => void;
  selectedBusId?: string;
  className?: string;
  isCompact?: boolean;
  interactiveMode?: 'view' | 'mark_start_pin' | 'mark_end_pin' | 'add_stop';
  onSetInteractiveMode?: (mode: 'view' | 'mark_start_pin' | 'mark_end_pin' | 'add_stop') => void;
  customStartPin?: { lat: number; lng: number; name?: string } | null;
  customEndPin?: { lat: number; lng: number; name?: string } | null;
  onClearCustomPins?: () => void;
}

export const DemoSimulatorPanel: React.FC<DemoSimulatorPanelProps> = ({
  onSelectBusOnMap,
  selectedBusId: externalSelectedBusId,
  className = '',
  isCompact = false,
  interactiveMode = 'view',
  onSetInteractiveMode,
  customStartPin,
  customEndPin,
  onClearCustomPins
}) => {
  const { user } = useAuth();
  const { routes, stops: appStops } = useApp();
  const toast = useToast();

  const [simState, setSimState] = useState<DemoSimulatorState>(getDemoSimulatorState);
  const [selectedBusId, setSelectedBusId] = useState<string>(
    externalSelectedBusId || DEMO_BUS_DEFINITIONS[0]?.id || ''
  );

  // Dynamically compute corridors strictly from Route Corridors tab
  const availableCorridors: DemoRoutePreset[] = React.useMemo(() => {
    const list: DemoRoutePreset[] = [];
    routes.forEach((r) => {
      const waypoints = (r.route_path && r.route_path.length > 1) 
        ? r.route_path 
        : (r.stops || []).map((s) => ({ lat: s.lat, lng: s.lng }));

      const stops: DemoStop[] = (r.stops || []).map((s, idx) => ({
        id: s.stopId || `stop-${idx}`,
        name: s.stopName || `Stop ${idx + 1}`,
        lat: s.lat,
        lng: s.lng
      }));

      list.push({
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

    AVAILABLE_DEMO_ROUTES.forEach((dr) => {
      if (!list.some((item) => item.id === dr.id)) {
        list.push(dr);
      }
    });

    return list;
  }, [routes, AVAILABLE_DEMO_ROUTES]);

  const [selectedRoutePresetId, setSelectedRoutePresetId] = useState<string>('');
  const [isReverseDirection, setIsReverseDirection] = useState<boolean>(false);
  const [showStopsList, setShowStopsList] = useState<boolean>(true);
  const [startTerminalPinId, setStartTerminalPinId] = useState<string>('');
  const [endTerminalPinId, setEndTerminalPinId] = useState<string>('');

  // Road snapping & route computation states
  const [isComputingCorridor, setIsComputingCorridor] = useState<boolean>(false);
  const [showAddBusModal, setShowAddBusModal] = useState<boolean>(false);
  const [showSaveRouteModal, setShowSaveRouteModal] = useState<boolean>(false);

  // Add Bus Form State
  const [newBusNumber, setNewBusNumber] = useState<string>('MH-16 BT-');
  const [newBusPlate, setNewBusPlate] = useState<string>('MH-16 BT-');
  const [newBusColor, setNewBusColor] = useState<string>('#7847CB');
  const [newBusRouteId, setNewBusRouteId] = useState<string>('');
  const [newBusType, setNewBusType] = useState<'EV Metro Shuttle' | 'AC Express' | 'Standard City'>('Standard City');

  // Save Route Form State
  const [newRouteNumber, setNewRouteNumber] = useState<string>('Route 99');
  const [newRouteName, setNewRouteName] = useState<string>('Custom Shortest Corridor');

  // Sync external selected bus if provided
  useEffect(() => {
    if (externalSelectedBusId) {
      setSelectedBusId(externalSelectedBusId);
    }
  }, [externalSelectedBusId]);

  // Simulator is accessible for evaluation and demo control
  const isAuthorized = true;

  useEffect(() => {
    const unsubscribe = subscribeToDemoState((newState) => {
      setSimState(newState);
    });
    return () => unsubscribe();
  }, []);

  const activeBusRuntime: BusSimRuntime | undefined = simState.buses[selectedBusId] || Object.values(simState.buses)[0];
  const isSelectedBusRunning = Boolean(activeBusRuntime?.isRunning);
  const isSelectedDelayActive = Boolean(activeBusRuntime && activeBusRuntime.delayMinutes > 0);

  const activePreset: DemoRoutePreset =
    availableCorridors.find((r) => r.id === selectedRoutePresetId) ||
    availableCorridors[0] || {
      id: '',
      routeNumber: 'Unassigned',
      routeName: 'No Corridor Assigned',
      origin: 'Unassigned',
      destination: 'Unassigned',
      color: '#7847CB',
      description: '',
      stops: [],
      waypoints: [],
    };

  // Keep selectedBusId valid if buses change
  useEffect(() => {
    const availableBusIds = Object.keys(simState.buses);
    if (availableBusIds.length > 0 && !simState.buses[selectedBusId]) {
      setSelectedBusId(availableBusIds[0]);
    }
  }, [simState.buses, selectedBusId]);

  // Sync route preset ID and terminal pins when active bus changes or corridors change
  useEffect(() => {
    if (activeBusRuntime?.def?.routeId) {
      setSelectedRoutePresetId(activeBusRuntime.def.routeId);
    } else if (availableCorridors.length > 0 && !selectedRoutePresetId) {
      setSelectedRoutePresetId(availableCorridors[0].id);
    }
    if (activeBusRuntime?.def?.stops && activeBusRuntime.def.stops.length > 0) {
      setStartTerminalPinId(activeBusRuntime.def.stops[0].id);
      setEndTerminalPinId(activeBusRuntime.def.stops[activeBusRuntime.def.stops.length - 1].id);
    } else if (activePreset?.stops && activePreset.stops.length > 0) {
      setStartTerminalPinId(activePreset.stops[0].id);
      setEndTerminalPinId(activePreset.stops[activePreset.stops.length - 1].id);
    }
  }, [selectedBusId, activeBusRuntime, availableCorridors]);

  const handleStartAll = () => {
    if (!isAuthorized) {
      toast.error('Unauthorized: Multi-bus simulator requires Administrator authorization.');
      return;
    }
    startAllBuses({ speedMultiplier: simState.speedMultiplier });
    toast.success('All demo buses are now running simultaneously across Ahilyanagar corridors!', 'Fleet Live');
    onSelectBusOnMap?.(selectedBusId);
  };

  const handleResetAll = () => {
    resetAllBuses({ speedMultiplier: simState.speedMultiplier });
    toast.success('Demo reset! All buses have moved back to start terminals and are advancing forward.', 'Demo Restarted');
    onSelectBusOnMap?.(selectedBusId);
  };

  const handleResetSelectedBus = () => {
    if (!activeBusRuntime) return;
    resetBus(activeBusRuntime.id);
    toast.success(`${activeBusRuntime.def.busNumber} reset to start terminal and advancing forward.`);
    onSelectBusOnMap?.(activeBusRuntime.id);
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
    const preset = availableCorridors.find((r) => r.id === newRouteId) || activePreset;
    const startPin = preset.stops[0]?.id || '';
    const endPin = preset.stops[preset.stops.length - 1]?.id || '';
    setStartTerminalPinId(startPin);
    setEndTerminalPinId(endPin);
    if (!activeBusRuntime) return;
    setBusAssignedRoute(activeBusRuntime.id, newRouteId, isReverseDirection, startPin, endPin);
    toast.info(`Assigned ${preset.routeNumber} (${preset.origin} ↔ ${preset.destination}) to ${activeBusRuntime.def.busNumber}.`);
    onSelectBusOnMap?.(activeBusRuntime.id);
  };

  const handleStartTerminalPinChange = (newStartPin: string) => {
    setStartTerminalPinId(newStartPin);
    if (!activeBusRuntime) return;
    setBusAssignedRoute(activeBusRuntime.id, selectedRoutePresetId, isReverseDirection, newStartPin, endTerminalPinId);
    const stopObj = activePreset.stops.find((s) => s.id === newStartPin);
    toast.info(`Start Terminal Pin set to ${stopObj?.name || newStartPin}`);
    onSelectBusOnMap?.(activeBusRuntime.id);
  };

  const handleEndTerminalPinChange = (newEndPin: string) => {
    setEndTerminalPinId(newEndPin);
    if (!activeBusRuntime) return;
    setBusAssignedRoute(activeBusRuntime.id, selectedRoutePresetId, isReverseDirection, startTerminalPinId, newEndPin);
    const stopObj = activePreset.stops.find((s) => s.id === newEndPin);
    toast.info(`End Terminal Pin set to ${stopObj?.name || newEndPin}`);
    onSelectBusOnMap?.(activeBusRuntime.id);
  };

  const handleToggleDirection = () => {
    const nextReverse = !isReverseDirection;
    setIsReverseDirection(nextReverse);
    const prevStart = startTerminalPinId;
    const prevEnd = endTerminalPinId;
    setStartTerminalPinId(prevEnd);
    setEndTerminalPinId(prevStart);
    if (!activeBusRuntime) return;
    setBusAssignedRoute(activeBusRuntime.id, selectedRoutePresetId, nextReverse, prevEnd, prevStart);
    toast.info(`Reversed route direction for ${activeBusRuntime.def.busNumber}.`);
  };

  const handleDeleteBus = (busId: string, busNumber: string) => {
    if (!isAuthorized) {
      toast.error('Unauthorized: Multi-bus simulator requires Administrator authorization.');
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to delete demo bus "${busNumber}" from the fleet?`);
    if (!confirmed) return;

    deleteDemoBus(busId);
    toast.success(`Demo bus "${busNumber}" deleted from fleet.`, 'Bus Deleted');

    // Switch selection to remaining bus if any
    const remaining = Object.keys(simState.buses).filter(id => id !== busId);
    if (remaining.length > 0) {
      setSelectedBusId(remaining[0]);
      onSelectBusOnMap?.(remaining[0]);
    }
  };

  const handleResetTerminals = () => {
    const startPin = activePreset.stops[0]?.id || '';
    const endPin = activePreset.stops[activePreset.stops.length - 1]?.id || '';
    setStartTerminalPinId(startPin);
    setEndTerminalPinId(endPin);
    onClearCustomPins?.();
    if (!activeBusRuntime) return;
    setBusAssignedRoute(activeBusRuntime.id, selectedRoutePresetId, isReverseDirection, startPin, endPin);
    toast.success(`Reset terminal pins to full corridor (${activePreset.origin} to ${activePreset.destination}).`);
  };

  const handleApplyTerminalsToAllBuses = () => {
    setAllBusesAssignedRoute(selectedRoutePresetId, isReverseDirection, startTerminalPinId, endTerminalPinId);
    const sName = activePreset?.stops?.find((s) => s.id === startTerminalPinId)?.name || activePreset?.origin || 'Start';
    const eName = activePreset?.stops?.find((s) => s.id === endTerminalPinId)?.name || activePreset?.destination || 'End';
    toast.success(
      `All demo buses locked to ${activePreset.routeNumber} between ${sName} and ${eName}!`,
      'Fleet Synchronized'
    );
    onSelectBusOnMap?.(selectedBusId);
  };

  // Compute Shortest Road Corridor between marked pins via OSRM
  const handleAutoComputeShortestCorridor = async () => {
    if (!activeBusRuntime) return;

    let originCoords: { lat: number; lng: number; name: string };
    let destCoords: { lat: number; lng: number; name: string };

    if (customStartPin) {
      originCoords = { lat: customStartPin.lat, lng: customStartPin.lng, name: customStartPin.name || 'Custom Origin' };
    } else if (activeBusRuntime?.def?.stops && activeBusRuntime.def.stops.length > 0) {
      const startStop = activeBusRuntime.def.stops[0];
      originCoords = { lat: startStop.lat, lng: startStop.lng, name: startStop.name };
    } else {
      originCoords = { lat: 19.0975, lng: 74.7420, name: 'Ahilyanagar Center' };
    }

    if (customEndPin) {
      destCoords = { lat: customEndPin.lat, lng: customEndPin.lng, name: customEndPin.name || 'Custom Destination' };
    } else if (activeBusRuntime?.def?.stops && activeBusRuntime.def.stops.length > 0) {
      const endStop = activeBusRuntime.def.stops[activeBusRuntime.def.stops.length - 1];
      destCoords = { lat: endStop.lat, lng: endStop.lng, name: endStop.name };
    } else {
      destCoords = { lat: 19.0830, lng: 74.7460, name: 'Dairy Chowk' };
    }

    try {
      setIsComputingCorridor(true);
      toast.info('Calculating shortest road path and detecting transit stops along street corridor...');

      const result = await fetchShortestRoadCorridor(originCoords, destCoords);
      if (!result.path || result.path.length < 2) {
        toast.error('Could not compute road path between marked points.');
        return;
      }

      // Collect candidate stops from active database stops & corridors
      const allCandidateStops: DemoStop[] = [
        ...appStops.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng })),
        ...availableCorridors.flatMap((r) => r.stops)
      ];

      // Remove duplicate stop IDs
      const uniqueCandidateStops = Array.from(
        new Map(allCandidateStops.map((item) => [item.id, item])).values()
      );

      // Detect and sequence stops situated along this road corridor (within 250m)
      const detectedIntermediateStops = findStopsAlongRoad(result.path, uniqueCandidateStops, 300);

      // Create sequence with origin at start, destination at end
      const originStop: DemoStop = {
        id: `stop-start-${Date.now()}`,
        name: originCoords.name,
        lat: originCoords.lat,
        lng: originCoords.lng
      };
      const destStop: DemoStop = {
        id: `stop-dest-${Date.now()}`,
        name: destCoords.name,
        lat: destCoords.lat,
        lng: destCoords.lng
      };

      const finalStopSequence: DemoStop[] = [
        originStop,
        ...detectedIntermediateStops.filter(
          (s) => s.id !== originStop.id && s.id !== destStop.id
        ),
        destStop
      ];

      // Lock selected bus to this shortest road corridor
      setBusCustomCorridor(
        activeBusRuntime.id,
        originStop,
        destStop,
        result.path,
        detectedIntermediateStops.filter((s) => s.id !== originStop.id && s.id !== destStop.id)
      );

      toast.success(
        `Shortest road route snapped! ${finalStopSequence.length} stops included along ${(result.distanceMeters / 1000).toFixed(1)} km road corridor.`,
        'Road Snapped'
      );
      onSelectBusOnMap?.(activeBusRuntime.id);
    } catch (err) {
      console.error('Error computing shortest road corridor:', err);
      toast.error('Failed to compute road route.');
    } finally {
      setIsComputingCorridor(false);
    }
  };

  // Add new bus submit
  const handleAddNewBusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusNumber.trim()) {
      toast.error('Please enter a valid Bus Number.');
      return;
    }

    const assignedId = newBusRouteId || (availableCorridors[0]?.id || '');
    const created = addNewCustomBus({
      busNumber: newBusNumber.trim(),
      plateNumber: newBusPlate.trim() || newBusNumber.trim(),
      routeId: assignedId,
      color: newBusColor,
      busType: newBusType
    });

    setSelectedBusId(created.id);
    setShowAddBusModal(false);
    toast.success(`Bus ${created.def.busNumber} added to fleet and assigned to ${created.def.routeNumber}!`, 'Bus Created');
    onSelectBusOnMap?.(created.id);
  };

  // Save custom route submit
  const handleSaveRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusRuntime) return;

    const preset = addNewCustomRoute({
      routeNumber: newRouteNumber.trim() || 'Custom Route',
      routeName: newRouteName.trim() || `${activeBusRuntime.def.origin} to ${activeBusRuntime.def.destination}`,
      origin: activeBusRuntime.def.origin,
      destination: activeBusRuntime.def.destination,
      color: activeBusRuntime.def.color,
      stops: [...activeBusRuntime.def.stops],
      waypoints: [...activeBusRuntime.def.waypoints]
    });

    setSelectedRoutePresetId(preset.id);
    setShowSaveRouteModal(false);
    toast.success(`Route ${preset.routeNumber} saved! Available to all buses in fleet.`, 'Route Created');
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
      toast.success(`Cleared traffic delay for ${activeBusRuntime.def.busNumber}. Nominal ETA restored.`);
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
              Select road corridors, mark terminal pins, snap shortest routes & broadcast real GPS
            </p>
          </div>
        </div>

        <Badge variant={simState.isRunning ? 'brand' : 'neutral'} size="sm" dot>
          {simState.activeBusCount > 0 ? `${simState.activeBusCount} Buses Active` : 'Simulator Standby'}
        </Badge>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        
        {/* Master Start All / Reset / Stop All Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Button
            onClick={handleStartAll}
            size="lg"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md shadow-emerald-600/20"
            leftIcon={<Play className="w-4 h-4 fill-white" />}
          >
            Start All Demos
          </Button>

          <Button
            onClick={handleResetAll}
            size="lg"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black shadow-md shadow-amber-500/20"
            leftIcon={<RotateCcw className="w-4 h-4 text-white" />}
          >
            Reset Demo
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

        {/* 1. Multi-Bus Fleet Tabs & Add Bus Option */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center gap-1.5">
              <BusIcon className="w-3.5 h-3.5 text-[#7847CB]" /> 1. Fleet Buses ({DEMO_BUS_DEFINITIONS.length})
            </span>
            <button
              type="button"
              onClick={() => setShowAddBusModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7847CB] text-[11px] font-bold border border-purple-200/80 transition-colors shadow-2xs"
            >
              <Plus className="w-3 h-3 text-[#7847CB]" />
              <span>Add New Bus</span>
            </button>
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
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBus(def.id, def.busNumber);
                        }}
                        title={`Delete ${def.busNumber} from fleet`}
                        className="p-1 -mr-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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

        {/* 2. ROUTE CORRIDOR SELECTION & FLIP */}
        {activeBusRuntime && (
          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5 text-[#7847CB]" /> 2. Assign Route to {activeBusRuntime.def.busNumber}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetSelectedBus}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-[11px] font-bold shadow-2xs transition-colors"
                  title="Reset this bus back to starting terminal and run"
                >
                  <RotateCcw className="w-3 h-3 text-amber-700" />
                  <span>Reset Bus</span>
                </button>
                <button
                  type="button"
                  onClick={handleToggleDirection}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white text-slate-700 hover:text-purple-700 border border-slate-200 text-[11px] font-bold shadow-2xs transition-colors"
                  title="Reverse Start and End terminals"
                >
                  <ArrowLeftRight className="w-3 h-3 text-[#7847CB]" />
                  <span>Flip Direction</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteBus(activeBusRuntime.id, activeBusRuntime.def.busNumber)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[11px] font-bold shadow-2xs transition-colors"
                  title={`Delete ${activeBusRuntime.def.busNumber} from simulator`}
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span>Delete Bus</span>
                </button>
              </div>
            </div>

            {/* Route Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 block">
                Corridor:
              </label>
              {availableCorridors.length === 0 ? (
                <div className="space-y-2">
                  <select
                    disabled
                    value=""
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-400 italic"
                  >
                    <option value="">No corridors created yet (Add in Route Corridors tab)</option>
                  </select>
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-[11px]">Configure a route corridor to run buses.</span>
                    </div>
                    <Link
                      to="/admin/routes"
                      className="px-2 py-0.5 rounded-lg bg-[#7847CB] text-white text-[10px] font-bold hover:bg-[#683bb5] transition-colors shrink-0"
                    >
                      Route Corridors
                    </Link>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedRoutePresetId}
                  onChange={(e) => handleRouteChange(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#7847CB]"
                >
                  <option value="" disabled>-- Select Route Corridor --</option>
                  {availableCorridors.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.routeNumber} — {preset.origin} to {preset.destination} ({preset.stops.length} stops)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 3. MANUALLY MARK START & END TERMINAL PINS ON MAP */}
            <div className="p-3.5 bg-white rounded-xl border border-purple-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-purple-600" /> Manual Terminal Pins & Road Snapping
                </span>
                <button
                  type="button"
                  onClick={handleResetTerminals}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-purple-700 transition-colors"
                  title="Reset to default corridor ends"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Click map buttons below to mark Start and End pins anywhere on the road. NagarST will auto-select the shortest street path and include all transit stops along the road corridor.
              </p>

              {/* Interactive Map Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSetInteractiveMode?.(interactiveMode === 'mark_start_pin' ? 'view' : 'mark_start_pin')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    interactiveMode === 'mark_start_pin'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>{customStartPin ? 'Change Start Pin' : 'Mark Start on Map'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSetInteractiveMode?.(interactiveMode === 'mark_end_pin' ? 'view' : 'mark_end_pin')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    interactiveMode === 'mark_end_pin'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                      : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>{customEndPin ? 'Change End Pin' : 'Mark End on Map'}</span>
                </button>
              </div>

              {/* Currently Marked Pins Status */}
              {(customStartPin || customEndPin) && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  {customStartPin && (
                    <div className="flex items-center justify-between text-emerald-900 font-medium">
                      <span className="flex items-center gap-1 font-bold">
                        <Flag className="w-3.5 h-3.5 text-emerald-600" /> Start Pin:
                      </span>
                      <span className="truncate max-w-[180px]">{customStartPin.name || `${customStartPin.lat.toFixed(4)}, ${customStartPin.lng.toFixed(4)}`}</span>
                    </div>
                  )}
                  {customEndPin && (
                    <div className="flex items-center justify-between text-rose-900 font-medium">
                      <span className="flex items-center gap-1 font-bold">
                        <Target className="w-3.5 h-3.5 text-rose-600" /> End Pin:
                      </span>
                      <span className="truncate max-w-[180px]">{customEndPin.name || `${customEndPin.lat.toFixed(4)}, ${customEndPin.lng.toFixed(4)}`}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Auto-Compute Shortest Road Route & Include Stops */}
              <button
                type="button"
                onClick={handleAutoComputeShortestCorridor}
                disabled={isComputingCorridor}
                className="w-full py-2.5 px-3 rounded-xl bg-[#7847CB] hover:bg-[#6839b8] text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
              >
                {isComputingCorridor ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-300" />
                )}
                <span>Auto-Select Shortest Road Corridor & Stops</span>
              </button>

              {/* Add Intermediate Stop & Save Route Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSetInteractiveMode?.(interactiveMode === 'add_stop' ? 'view' : 'add_stop')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    interactiveMode === 'add_stop'
                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Click anywhere along the road to place a new stop"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-600" />
                  <span>Add Stop on Map</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSaveRouteModal(true)}
                  className="py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-2xs transition-all"
                  title="Save current road corridor and stops as a new route"
                >
                  <Route className="w-3.5 h-3.5 text-[#7847CB]" />
                  <span>Save as Route</span>
                </button>
              </div>

              {/* Apply Route to ALL Demo Buses Button */}
              <button
                type="button"
                onClick={handleApplyTerminalsToAllBuses}
                className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7847CB] text-xs font-black transition-all flex items-center justify-center gap-2 border border-purple-200/90 shadow-2xs"
              >
                <Layers className="w-4 h-4 text-[#7847CB]" />
                <span>Apply Current Route to ALL Fleet Buses</span>
              </button>
            </div>

            {/* Where to Where Banner */}
            <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-[#7847CB] flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Locked Road Corridor
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {activeBusRuntime.def.stops.length} Stops along Streets
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 bg-slate-50 p-2 rounded-lg">
                <div className="min-w-0 truncate text-emerald-800 flex items-center gap-1">
                  <Flag className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">{activeBusRuntime.def.origin}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-[#7847CB] shrink-0" />
                <div className="min-w-0 truncate text-rose-800 flex items-center gap-1">
                  <Target className="w-3 h-3 text-rose-600 shrink-0" />
                  <span className="truncate">{activeBusRuntime.def.destination}</span>
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
                <span>Stops on this Locked Route ({activeBusRuntime.def.stops.length})</span>
                {showStopsList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showStopsList && (
                <div className="p-2 bg-white rounded-xl border border-slate-200/80 max-h-40 overflow-y-auto space-y-1.5 text-xs">
                  {activeBusRuntime.def.stops.map((stop, i) => {
                    const isStartPin = i === 0;
                    const isEndPin = i === activeBusRuntime.def.stops.length - 1;

                    return (
                      <div
                        key={stop.id}
                        className={`flex items-center justify-between p-1.5 rounded-lg ${
                          isStartPin
                            ? 'bg-emerald-50/60 text-emerald-900 border border-emerald-200/70'
                            : isEndPin
                            ? 'bg-rose-50/60 text-rose-900 border border-rose-200/70'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-full font-mono text-[10px] font-black flex items-center justify-center shrink-0 ${
                              isStartPin
                                ? 'bg-emerald-600 text-white'
                                : isEndPin
                                ? 'bg-rose-600 text-white'
                                : 'bg-purple-100 text-[#7847CB]'
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="font-semibold truncate">{stop.name}</span>
                        </div>
                        <span className="text-[10px] font-bold font-mono">
                          {isStartPin ? 'START PIN' : isEndPin ? 'END PIN' : 'Way Stop'}
                        </span>
                      </div>
                    );
                  })}
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

      {/* Modal: Add New Bus to Fleet */}
      {showAddBusModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BusIcon className="w-5 h-5 text-[#7847CB]" />
                <h3 className="font-black text-slate-900 text-base">Add New Bus to Fleet</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBusModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewBusSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Bus Number (e.g. MH-16 BT-4500)</label>
                <input
                  type="text"
                  required
                  value={newBusNumber}
                  onChange={(e) => setNewBusNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#7847CB]"
                  placeholder="e.g. MH-16 BT-4500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Plate Number</label>
                <input
                  type="text"
                  value={newBusPlate}
                  onChange={(e) => setNewBusPlate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#7847CB]"
                  placeholder="e.g. MH-16 BT-4500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bus Type</label>
                <select
                  value={newBusType}
                  onChange={(e) => setNewBusType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#7847CB]"
                >
                  <option value="Standard City">Standard City Transit</option>
                  <option value="AC Express">AC Express</option>
                  <option value="EV Metro Shuttle">EV Metro Shuttle</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign Route Corridor</label>
                <select
                  value={newBusRouteId}
                  onChange={(e) => setNewBusRouteId(e.target.value)}
                  disabled={availableCorridors.length === 0}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#7847CB]"
                >
                  {availableCorridors.length === 0 ? (
                    <option value="">No corridors created yet (Add in Route Corridors tab)</option>
                  ) : (
                    <>
                      <option value="" disabled>-- Select Route Corridor --</option>
                      {availableCorridors.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.routeNumber} — {r.origin} to {r.destination}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bus Marker Color</label>
                <div className="flex items-center gap-2">
                  {['#7847CB', '#059669', '#2563eb', '#d97706', '#e11d48', '#0891b2'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewBusColor(col)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        newBusColor === col ? 'scale-110 border-slate-900 shadow-xs' : 'border-white'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddBusModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#7847CB] text-white hover:bg-[#6839b8] font-bold"
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Add Bus to Fleet
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Save Corridor as New Route */}
      {showSaveRouteModal && activeBusRuntime && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-[#7847CB]" />
                <h3 className="font-black text-slate-900 text-base">Save as New Route</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveRouteModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRouteSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Route Identifier (e.g. Route 99)</label>
                <input
                  type="text"
                  required
                  value={newRouteNumber}
                  onChange={(e) => setNewRouteNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#7847CB]"
                  placeholder="e.g. Route 99"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Route Name</label>
                <input
                  type="text"
                  required
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#7847CB]"
                  placeholder="e.g. Savedi - MIDC Direct Corridor"
                />
              </div>

              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 text-slate-700 space-y-1">
                <div className="font-bold text-purple-900">Corridor Details</div>
                <div>Origin: <b>{activeBusRuntime.def?.origin || 'Origin'}</b></div>
                <div>Destination: <b>{activeBusRuntime.def?.destination || 'Destination'}</b></div>
                <div>Total Stops: <b>{activeBusRuntime.def?.stops?.length || 0} stops</b></div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveRouteModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#7847CB] text-white hover:bg-[#6839b8] font-bold"
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Save Route
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

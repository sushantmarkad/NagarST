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
  Sparkles,
  ShieldAlert,
  Navigation,
  ExternalLink
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  startDemoSimulation,
  stopDemoSimulation,
  setDemoReplaySpeed,
  setDemoDelay,
  subscribeToDemoState,
  getDemoSimulatorState,
  DEMO_BUS_NUMBER,
  DEMO_STOPS,
  type DemoSimulatorState
} from '../../utils/demoSimulatorEngine';
import { Link } from 'react-router-dom';

interface DemoSimulatorPanelProps {
  onSelectBusOnMap?: (busId: string) => void;
  className?: string;
  isCompact?: boolean;
}

export const DemoSimulatorPanel: React.FC<DemoSimulatorPanelProps> = ({
  onSelectBusOnMap,
  className = '',
  isCompact = false
}) => {
  const { user } = useAuth();
  const toast = useToast();

  const [simState, setSimState] = useState<DemoSimulatorState>(getDemoSimulatorState);
  const [isDelayActive, setIsDelayActive] = useState<boolean>(simState.delayMinutes > 0);

  // Authorization Check
  const allowedRoles = ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER'];
  const isAuthorized = user?.role && allowedRoles.includes(user.role);

  useEffect(() => {
    const unsubscribe = subscribeToDemoState((newState) => {
      setSimState(newState);
      setIsDelayActive(newState.delayMinutes > 0);
    });
    return () => unsubscribe();
  }, []);

  const handleStart = () => {
    if (!isAuthorized) {
      toast.error('Unauthorized: Demo simulator requires Administrator authorization.');
      return;
    }
    startDemoSimulation({ speedMultiplier: simState.speedMultiplier, delayMinutes: isDelayActive ? 5 : 0 });
    toast.success('GPS Demo Simulator is now live! Broadcasting realistic road telemetry.', 'Demo Active');
    onSelectBusOnMap?.('demo-bus-sim-01');
  };

  const handleStop = () => {
    if (!isAuthorized) return;
    stopDemoSimulation();
    toast.info('Demo simulation stopped and simulated bus cleared from all maps.');
  };

  const handleSpeedChange = (mult: number) => {
    setDemoReplaySpeed(mult);
    toast.info(`Simulation replay speed adjusted to ${mult}x.`);
  };

  const handleToggleDelay = () => {
    const next = !isDelayActive;
    setIsDelayActive(next);
    setDemoDelay(next ? 5 : 0);
    if (next) {
      toast.warning('Injected 5-minute traffic delay into demo bus schedule.', 'Traffic Delay Active');
    } else {
      toast.success('Removed traffic delay. Demo bus back on scheduled corridor ETA.');
    }
  };

  if (!isAuthorized) {
    return (
      <div className={`p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl ${className}`}>
        <div className="flex items-center gap-3 text-amber-400 mb-2">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <h3 className="font-bold text-sm">Demo Simulation Access Restricted</h3>
        </div>
        <p className="text-xs text-slate-400">
          Only Municipal Transit Administrators and Dispatch Managers are authorized to control live GPS simulators.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col ${className}`}>
      {/* Top Banner / Status */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-white tracking-wide">
                GPS Demo Simulator
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Sandbox
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Replays real Ahilyanagar road coordinates to commuter & admin maps
            </p>
          </div>
        </div>

        <Badge variant={simState.isRunning ? 'brand' : 'neutral'} size="sm" dot>
          {simState.isRunning ? 'Broadcasting Live' : 'Simulator Standby'}
        </Badge>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Primary Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleStart}
            disabled={simState.isRunning}
            size="lg"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold shadow-lg shadow-emerald-950/50 disabled:opacity-40"
            leftIcon={<Play className="w-4 h-4 fill-white" />}
          >
            Start Demo
          </Button>

          <Button
            onClick={handleStop}
            disabled={!simState.isRunning}
            size="lg"
            variant="outline"
            className="w-full border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 font-extrabold disabled:opacity-40"
            leftIcon={<Square className="w-4 h-4 fill-rose-300" />}
          >
            Stop Demo
          </Button>
        </div>

        {/* Speed Multipliers & Scenario Toggles */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span className="flex items-center gap-1.5">
              <FastForward className="w-3.5 h-3.5 text-amber-400" /> Replay Speed
            </span>
            <span className="text-amber-400 font-mono">{simState.speedMultiplier}x Normal Velocity</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 5, 10].map((mult) => (
              <button
                key={mult}
                type="button"
                onClick={() => handleSpeedChange(mult)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center border ${
                  simState.speedMultiplier === mult
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                {mult}x
              </button>
            ))}
          </div>
        </div>

        {/* Traffic Delay Simulator Injection */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className={`w-4 h-4 ${isDelayActive ? 'text-rose-400 animate-spin' : 'text-slate-400'}`} />
            <div>
              <span className="text-xs font-bold text-slate-200 block">Traffic Delay Scenario</span>
              <span className="text-[10px] text-slate-400 block">+5 min ETA congestion delay</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleDelay}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              isDelayActive
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {isDelayActive ? 'Delay Active' : 'Inject Delay'}
          </button>
        </div>

        {/* Live Telemetry HUD */}
        {simState.isRunning && simState.currentBus && (
          <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-extrabold text-amber-300">{DEMO_BUS_NUMBER}</span>
                <span className="text-slate-500 text-[10px]">({simState.currentBus.plateNumber})</span>
              </div>
              <Badge variant={isDelayActive ? 'danger' : 'success'} size="sm">
                {isDelayActive ? 'Traffic Delayed' : 'On Schedule'}
              </Badge>
            </div>

            {/* Route Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                <span>Route Progress</span>
                <span className="text-amber-400 font-mono font-bold">{simState.progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300 ease-out"
                  style={{ width: `${simState.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Telemetry Stats Matrix */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase font-sans font-bold">
                  <Gauge className="w-3 h-3 text-emerald-400" /> Speed
                </div>
                <div className="text-xs font-bold text-white mt-0.5">{simState.currentBus.speedKmh} km/h</div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase font-sans font-bold">
                  <Compass className="w-3 h-3 text-cyan-400" /> Bearing
                </div>
                <div className="text-xs font-bold text-white mt-0.5">{simState.currentBus.heading}°</div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 uppercase font-sans font-bold">
                  <Clock className="w-3 h-3 text-amber-400" /> Next ETA
                </div>
                <div className="text-xs font-bold text-amber-300 mt-0.5">{simState.currentBus.etaToNextMinutes} min</div>
              </div>
            </div>

            {/* Current & Next Stop details */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" /> Passing Stop:
                </span>
                <span className="text-slate-200 font-bold">{simState.currentBus.currentStopName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-amber-400" /> Approaching:
                </span>
                <span className="text-amber-300 font-bold">{simState.currentBus.nextStopName}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Link to Commuter Live Map */}
        <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px]">View on Passenger Map:</span>
          <Link
            to="/app/tracking"
            className="flex items-center gap-1 text-[#a855f7] hover:text-[#c084fc] font-bold transition-colors"
          >
            <span>Open Commuter Map</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

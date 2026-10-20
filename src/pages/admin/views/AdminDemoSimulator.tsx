import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { useToast } from '../../../context/FeedbackContext';
import { LiveMap } from '../../../components/map/LiveMap';
import { DemoSimulatorPanel } from '../../../components/admin/DemoSimulatorPanel';
import { Badge } from '../../../components/ui/Badge';
import {
  DEMO_BUS_DEFINITIONS,
  getDemoSimulatorState,
  subscribeToDemoState,
  addStopToBusRoute,
  syncSimulatorFleetWithAdminConfig,
  type DemoBusDefinition,
  type DemoSimulatorState
} from '../../../utils/demoSimulatorEngine';
import { reverseGeocodeLatLng } from '../../../utils/routing';
import { Route, Layers, ShieldCheck, Bus as BusIcon, MapPin, Clock, Flag, Target } from 'lucide-react';

export const AdminDemoSimulator: React.FC = () => {
  const { buses, stops, routes } = useApp();
  const toast = useToast();
  const [selectedBusId, setSelectedBusId] = useState<string>(DEMO_BUS_DEFINITIONS[0].id);
  const [simState, setSimState] = useState<DemoSimulatorState>(getDemoSimulatorState);

  // Sync simulator whenever admin configures routes or registers fleet vehicles
  React.useEffect(() => {
    syncSimulatorFleetWithAdminConfig(buses, routes);
  }, [buses, routes]);

  // Interactive Pin & Stop Placement Mode
  const [interactiveMode, setInteractiveMode] = useState<'view' | 'mark_start_pin' | 'mark_end_pin' | 'add_stop'>('view');
  const [customStartPin, setCustomStartPin] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [customEndPin, setCustomEndPin] = useState<{ lat: number; lng: number; name?: string } | null>(null);

  React.useEffect(() => {
    const unsub = subscribeToDemoState((newState) => {
      setSimState(newState);
    });
    return () => unsub();
  }, []);

  const currentRuntime = simState.buses[selectedBusId];
  const selectedDef = currentRuntime?.def || DEMO_BUS_DEFINITIONS.find(d => d.id === selectedBusId) || DEMO_BUS_DEFINITIONS[0];
  const selectedBus = buses.find(b => b.id === selectedBusId);
  const activeDemoBuses = buses.filter(b => b.isDemo || b.id?.startsWith('demo-'));

  // Handle clicks directly on the Leaflet map in interactive mode
  const handleMapClick = async (coords: { lat: number; lng: number }) => {
    if (interactiveMode === 'mark_start_pin') {
      const name = await reverseGeocodeLatLng(coords.lat, coords.lng);
      setCustomStartPin({ lat: coords.lat, lng: coords.lng, name });
      toast.success(`Start Terminal Pin placed at "${name}". Now mark End Pin or compute corridor!`, 'Start Pin Set');
      setInteractiveMode('view');
    } else if (interactiveMode === 'mark_end_pin') {
      const name = await reverseGeocodeLatLng(coords.lat, coords.lng);
      setCustomEndPin({ lat: coords.lat, lng: coords.lng, name });
      toast.success(`End Terminal Pin placed at "${name}". Click "Auto-Select Shortest Road Corridor" to snap!`, 'End Pin Set');
      setInteractiveMode('view');
    } else if (interactiveMode === 'add_stop') {
      const name = await reverseGeocodeLatLng(coords.lat, coords.lng);
      const newStop = {
        id: `stop-custom-${Date.now()}`,
        name,
        lat: coords.lat,
        lng: coords.lng
      };
      addStopToBusRoute(selectedBusId, newStop);
      toast.success(`Added new stop "${name}" along route corridor!`, 'Stop Created');
      setInteractiveMode('view');
    }
  };

  const handleClearCustomPins = () => {
    setCustomStartPin(null);
    setCustomEndPin(null);
    setInteractiveMode('view');
  };

  // Combine loaded routes or fallback to mock routes for demo paths, augmented with active simulator corridor definitions & marked terminal pins
  const demoRoutes = React.useMemo(() => {
    return Object.values(simState.buses).map((b) => ({
      id: b.def.routeId,
      routeNumber: b.def.routeNumber,
      name: b.def.routeName,
      nameMarathi: b.def.routeName,
      origin: b.def.origin,
      destination: b.def.destination,
      firstBus: '06:00 AM',
      lastBus: '10:00 PM',
      frequencyMinutes: 15,
      baseFare: 10,
      maxFare: 25,
      totalStops: b.def.stops.length,
      durationMinutes: 30,
      color: b.def.color,
      activeBusesCount: 1,
      status: 'normal' as const,
      stops: b.def.stops.map((s, idx) => ({
        stopId: s.id,
        stopName: s.name,
        stopNameMarathi: s.name,
        sequence: idx + 1,
        fareFromOrigin: idx * 5,
        estimatedMinutesFromOrigin: idx * 5,
        isMajorHub: idx === 0 || idx === b.def.stops.length - 1,
        lat: s.lat,
        lng: s.lng,
      })),
      route_path: b.def.waypoints,
    }));
  }, [simState]);

  const allRoutes = [...demoRoutes, ...routes.filter((r) => !demoRoutes.some((dr) => dr.id === r.id))];

  return (
    <div className="flex-1 w-full h-full flex flex-col p-4 md:p-6 gap-6 bg-[#f8f9fc] text-slate-900 overflow-y-auto">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/90 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-[#7847CB] border border-purple-200">
              Admin Multi-Bus Simulator
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Ahilyanagar Corridor Testbed
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Realistic GPS Multi-Bus Simulator
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Simulate and monitor multiple autonomous transit buses concurrently along real Ahilyanagar road routes with independent velocities, dynamic ETAs, and segregated telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-slate-700 font-bold">Production Data Isolated</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Controls on Left, Live Simulation Map on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[620px]">
        
        {/* Left Column: Multi-Bus Controls & Stops HUD */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <DemoSimulatorPanel
            selectedBusId={selectedBusId}
            onSelectBusOnMap={(id) => setSelectedBusId(id)}
            interactiveMode={interactiveMode}
            onSetInteractiveMode={(mode) => setInteractiveMode(mode)}
            customStartPin={customStartPin}
            customEndPin={customEndPin}
            onClearCustomPins={handleClearCustomPins}
          />

          {/* Planned Corridor Stops Summary for Selected Bus */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Route className="w-4 h-4 text-[#7847CB]" />
                {selectedDef.routeName}
              </span>
              <span className="text-[11px] text-slate-500 font-mono font-medium">
                {selectedDef.stops.length} Scheduled Stops
              </span>
            </div>

            <div className="space-y-2">
              {selectedDef.stops.map((st, i) => {
                const isNext = selectedBus?.nextStopId === st.id;
                const isCurrent = selectedBus?.currentStopId === st.id;

                return (
                  <div
                    key={st.id}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                      isNext
                        ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs font-bold'
                        : isCurrent
                        ? 'bg-purple-50/70 border-purple-200 text-purple-900 font-semibold'
                        : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-xl flex items-center justify-center font-mono text-[11px] font-black shrink-0 ${
                          isNext
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : isCurrent
                            ? 'bg-[#7847CB] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span className="truncate">{st.name}</span>
                    </div>

                    {isNext && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500 text-slate-950 shadow-2xs shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> NEXT ({selectedBus?.etaToNextMinutes || 1}m)
                      </span>
                    )}

                    {!isNext && isCurrent && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                        AT STOP
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Map Canvas */}
        <div className="lg:col-span-7 flex flex-col rounded-3xl overflow-hidden border border-slate-200/90 bg-white shadow-sm relative min-h-[500px]">
          <div className="p-3.5 px-4 bg-slate-50/90 border-b border-slate-200/90 flex items-center justify-between z-20 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#7847CB]" />
              <span className="text-xs font-bold text-slate-900">Live Multi-Bus Fleet Radar</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={activeDemoBuses.length > 0 ? 'brand' : 'neutral'} size="sm" dot>
                {activeDemoBuses.length} Demo Buses Active
              </Badge>
              {selectedBus && (
                <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                  {selectedBus.busNumber} • {selectedBus.speedKmh} km/h
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 w-full h-full relative min-h-[440px]">
            <LiveMap
              buses={buses}
              stops={stops}
              routes={allRoutes}
              selectedBusId={selectedBusId}
              onSelectBus={(bus) => setSelectedBusId(bus.id)}
              interactiveMode={interactiveMode}
              onCancelInteractive={() => setInteractiveMode('view')}
              onMapClick={handleMapClick}
              customStartPin={customStartPin}
              customEndPin={customEndPin}
              className="w-full h-full rounded-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { LiveMap } from '../../../components/map/LiveMap';
import { DemoSimulatorPanel } from '../../../components/admin/DemoSimulatorPanel';
import { Badge } from '../../../components/ui/Badge';
import { DEMO_BUS_ID, DEMO_STOPS } from '../../../utils/demoSimulatorEngine';
import { Sparkles, MapPin, Layers, Route, ShieldCheck } from 'lucide-react';

export const AdminDemoSimulator: React.FC = () => {
  const { buses, stops, routes } = useApp();
  const [selectedBusId, setSelectedBusId] = useState<string | null>(DEMO_BUS_ID);

  const demoBus = buses.find(b => b.id === DEMO_BUS_ID);

  return (
    <div className="flex-1 w-full h-full flex flex-col p-4 md:p-6 gap-6 bg-[#090d16] text-white overflow-y-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Admin Simulator Suite
            </span>
            <Badge variant="brand" size="sm">
              Ahilyanagar Corridor Testbed
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Realistic GPS Demo Simulator
          </h1>
          <p className="text-xs text-slate-400">
            Simulate realistic vehicle movement along real road coordinates with configurable velocities, dynamic ETAs, and segregated telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-semibold">Production Data Isolated</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Controls on Left, Live Simulation Map on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[620px]">
        {/* Left Column: Demo Controls & Live HUD */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <DemoSimulatorPanel onSelectBusOnMap={(id) => setSelectedBusId(id)} />

          {/* Planned Corridor Stops Summary */}
          <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Route className="w-4 h-4 text-amber-400" /> Delhi Gate ➔ Dairy Chowk Stops
              </span>
              <span className="text-[11px] text-slate-500 font-mono">{DEMO_STOPS.length} Scheduled Stops</span>
            </div>

            <div className="space-y-2">
              {DEMO_STOPS.map((st, i) => {
                const isNext = demoBus?.nextStopId === st.id;
                const isCurrent = demoBus?.currentStopId === st.id;

                return (
                  <div
                    key={st.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isNext
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                        : isCurrent
                        ? 'bg-slate-900 border-slate-700 text-slate-200'
                        : 'bg-slate-950/60 border-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[11px] font-bold ${
                          isNext
                            ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span className="font-semibold">{st.name}</span>
                    </div>

                    {isNext && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        NEXT STOP ({demoBus?.etaToNextMinutes || 1}m)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Map Canvas */}
        <div className="lg:col-span-7 flex flex-col rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl relative min-h-[480px]">
          <div className="p-3.5 px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#a855f7]" />
              <span className="text-xs font-bold text-white">Live Road Corridor Radar</span>
            </div>
            {demoBus && (
              <Badge variant="brand" size="sm" dot>
                Simulated Bus Active ({demoBus.speedKmh} km/h)
              </Badge>
            )}
          </div>

          <div className="flex-1 w-full h-full relative">
            <LiveMap
              buses={buses}
              stops={stops}
              routes={routes}
              selectedBusId={selectedBusId}
              onSelectBus={(bus) => setSelectedBusId(bus.id)}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

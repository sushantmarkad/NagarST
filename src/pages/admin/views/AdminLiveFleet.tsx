import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { type Bus as BusType } from '../../../types';
import { LiveMap } from '../../../components/map/LiveMap';
import {
  Bus,
  MapPin,
  Clock,
  X,
  Gauge,
  Users
} from 'lucide-react';

export const AdminLiveFleet: React.FC = () => {
  const { buses, stops, routes } = useApp();
  const [selectedBus, setSelectedBus] = useState<BusType | null>(buses.length > 0 ? buses[0] : null);

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-slate-500 uppercase tracking-wider font-bold">Active Buses:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
            {buses.length} Live On Map
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600">On Time</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-600">Delayed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-600">Breakdown</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 relative">
        <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-xs relative z-10">
          <LiveMap
            buses={buses}
            stops={stops}
            routes={routes}
            selectedBusId={selectedBus?.id || null}
            selectedRouteId={selectedBus?.routeId || null}
            onSelectBus={(bus) => setSelectedBus(bus)}
            showUserLocation={false}
          />
        </div>

        {selectedBus && (
          <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-2xl p-5 shadow-lg flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Bus className="w-5 h-5 text-[#7847CB]" /> Bus {selectedBus.busNumber}
                  </h3>
                  <span className="text-xs font-medium text-slate-500">{selectedBus.plateNumber}</span>
                </div>
                <button
                  onClick={() => setSelectedBus(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned Route</span>
                  <span className="font-bold text-slate-900 text-sm block">Route {selectedBus.routeNumber}</span>
                  <span className="text-[#7847CB] font-bold block">{selectedBus.routeName}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Driver</span>
                    <span className="font-bold text-slate-900">{selectedBus.driverName}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Conductor</span>
                    <span className="font-bold text-slate-900">{selectedBus.conductorName}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-slate-400" /> Speed:
                    </span>
                    <span className="font-mono font-bold text-slate-900">{selectedBus.speedKmh} km/h</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Next Stop:
                    </span>
                    <span className="font-bold text-slate-900">{selectedBus.nextStopName}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> ETA to Stop:
                    </span>
                    <span className="font-bold text-[#7847CB]">{selectedBus.etaToNextMinutes} min</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" /> Occupancy:
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold capitalize">
                      {selectedBus.occupancy}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Status:</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      {selectedBus.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => alert(`Direct dispatch instruction sent to Bus ${selectedBus.busNumber}`)}
              className="w-full mt-4 py-3 rounded-xl bg-[#7847CB] text-white font-bold text-xs hover:bg-[#0a2a42] transition shadow-xs"
            >
              Send Dispatch Broadcast
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

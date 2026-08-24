import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { LiveMap } from '../components/map/LiveMap';
import { BottomSheet } from '../components/common/BottomSheet';
import { OccupancyBadge, BusStatusBadge } from '../components/common/StatusBadge';
import { ETAIndicator } from '../components/common/ETAIndicator';
import { Navigation, User } from 'lucide-react';

export const LiveTracking: React.FC = () => {
  const { t } = useLanguage();
  const { buses, stops, routes, selectedBusId, setSelectedBusId, selectedStopId, setSelectedStopId } = useApp();

  const [filterRoute, setFilterRoute] = useState<string>('all');
  const selectedBus = buses.find((b) => b.id === selectedBusId) || buses[0];
  const selectedRoute = routes.find((r) => r.id === selectedBus?.routeId);

  const filteredBuses = filterRoute === 'all' ? buses : buses.filter((b) => b.routeId === filterRoute);

  return (
    <div className="h-full flex flex-col space-y-3 relative">
      {/* Map Control Header Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0f3c5c] text-white flex items-center justify-center">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-sm">{t('Live Bus Tracking', 'लाइव्ह बस ट्रॅकिंग')}</h2>
            <span className="text-[11px] text-slate-500 font-medium">
              {buses.length} {t('buses active on Ahilyanagar roads', 'बसेस अहिल्यानगरमध्ये धावत आहेत')}
            </span>
          </div>
        </div>

        {/* Route Filter Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={filterRoute}
            onChange={(e) => setFilterRoute(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f3c5c]"
          >
            <option value="all">{t('All Routes', 'सर्व मार्ग')}</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.routeNumber} - {r.origin}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Map Canvas Box */}
      <div className="flex-1 relative rounded-2xl overflow-hidden min-h-[350px]">
        <LiveMap
          buses={filteredBuses}
          stops={stops}
          routes={routes}
          selectedBusId={selectedBusId}
          selectedStopId={selectedStopId}
          onSelectBus={(bus) => setSelectedBusId(bus.id)}
          onSelectStop={(stop) => setSelectedStopId(stop.id)}
        />

        {/* Selected Bus Floating Quick Card for Desktop */}
        {selectedBus && (
          <div className="hidden lg:block absolute top-4 right-4 z-20 w-80 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-md bg-[#0f3c5c] text-white font-extrabold text-xs">
                  {selectedBus.busNumber}
                </span>
                <h4 className="font-bold text-slate-900 text-sm mt-1">{selectedBus.routeName}</h4>
                <p className="text-xs text-slate-500 font-mono">{selectedBus.plateNumber}</p>
              </div>
              <ETAIndicator minutes={selectedBus.etaToNextMinutes} size="sm" />
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Next Stop</span>
                <span className="font-bold text-slate-900">{selectedBus.nextStopName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Speed & Status</span>
                <span className="font-bold text-slate-900">{selectedBus.speedKmh} km/h • {selectedBus.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <OccupancyBadge level={selectedBus.occupancy} compact />
              <span className="text-[10px] text-slate-400">Driver: {selectedBus.driverName}</span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Bus Bottom Sheet Panel (Mobile & Tablet) */}
      <BottomSheet
        isOpen={!!selectedBus}
        onClose={() => setSelectedBusId(null)}
        title={`${selectedBus?.busNumber} (${selectedBus?.plateNumber})`}
        subtitle={selectedBus?.routeName}
      >
        {selectedBus && (
          <div className="space-y-4">
            {/* ETA Highlights */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {t('Arriving At Next Stop', 'पुढील थांब्यावर आगमन')}
                </span>
                <span className="font-extrabold text-slate-900 text-base">{selectedBus.nextStopName}</span>
              </div>
              <ETAIndicator minutes={selectedBus.etaToNextMinutes} size="lg" />
            </div>

            {/* Status grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Speed</span>
                <span className="font-bold text-slate-900 text-sm">{selectedBus.speedKmh} km/h</span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Occupancy</span>
                <div className="mt-0.5">
                  <OccupancyBadge level={selectedBus.occupancy} compact />
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Status</span>
                <div className="mt-0.5">
                  <BusStatusBadge status={selectedBus.status} delayMinutes={selectedBus.delayMinutes} />
                </div>
              </div>
            </div>

            {/* Crew Details */}
            <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="font-semibold text-slate-800">Driver: {selectedBus.driverName}</span>
                  <span className="text-slate-400 block text-[10px]">Conductor: {selectedBus.conductorName}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">
                {selectedBus.busType}
              </span>
            </div>

            {/* Route Stops Checklist */}
            {selectedRoute && (
              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  {t('Route Progress', 'प्रवास प्रगती')}
                </h5>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-36 overflow-y-auto space-y-2 text-xs">
                  {selectedRoute.stops.map((stop) => (
                    <div key={stop.stopId} className="flex items-center justify-between font-medium">
                      <span className="flex items-center gap-2 text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0f3c5c]" />
                        {stop.stopName}
                      </span>
                      <span className="text-slate-400 text-[10px]">{stop.estimatedMinutesFromOrigin} min</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
};

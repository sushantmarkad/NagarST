import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { LiveMap } from '../components/map/LiveMap';
import { BottomSheet } from '../components/common/BottomSheet';
import { OccupancyBadge, BusStatusBadge } from '../components/common/StatusBadge';
import { ETAIndicator } from '../components/common/ETAIndicator';
import { Navigation, User, Search, Filter, Bus as BusIcon, ChevronRight } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const LiveTracking: React.FC = () => {
  const { t } = useLanguage();
  const { buses, stops, routes, selectedBusId, setSelectedBusId, selectedStopId, setSelectedStopId } = useApp();

  const [filterRoute, setFilterRoute] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showListOnDesktop, setShowListOnDesktop] = useState(true);

  const selectedBus = selectedBusId ? buses.find((b) => b.id === selectedBusId) : null;
  const selectedRoute = routes.find((r) => r.id === selectedBus?.routeId);

  const filteredBuses = buses.filter((b) => {
    const matchesRoute = filterRoute === 'all' || b.routeId === filterRoute;
    const matchesSearch =
      !searchQuery ||
      b.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.routeName && b.routeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.nextStopName && b.nextStopName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRoute && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#f8f9fc] p-3 md:p-4 gap-3">
      
      {/* Top Controls Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#7847CB] text-white flex items-center justify-center shrink-0 shadow-xs shadow-[#7847CB]/30">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-xs md:text-sm leading-tight">
              {t('Live Bus Telemetry & Tracking', 'थेट बस ट्रॅकिंग')}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-slate-500 font-medium">
                {buses.length} {t('buses online', 'बसेस सुरू आहेत')}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Search bus/stop...', 'बस किंवा थांबा शोधा...')}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#7847CB] focus:ring-1 focus:ring-[#7847CB]/30 w-36 sm:w-44"
            />
          </div>

          {/* Route Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            <select
              value={filterRoute}
              onChange={(e) => setFilterRoute(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#7847CB]"
            >
              <option value="all">{t('All Routes', 'सर्व मार्ग')}</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.routeNumber} - {r.origin}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowListOnDesktop(!showListOnDesktop)}
            className="hidden lg:flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <BusIcon className="w-3.5 h-3.5 text-[#7847CB]" />
            <span>{showListOnDesktop ? 'Hide Fleet List' : 'Show Fleet List'}</span>
          </button>
        </div>
      </div>

      {/* Main Map & Fleet List Container */}
      <div className="flex-1 flex gap-3 min-h-0 relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-2xs">
        
        {/* Leaflet Live Map Canvas */}
        <div className="flex-1 relative h-full">
          <LiveMap
            buses={filteredBuses}
            stops={stops}
            routes={selectedRoute ? [selectedRoute] : filterRoute !== 'all' ? routes.filter(r => r.id === filterRoute) : []}
            selectedBusId={selectedBusId}
            selectedStopId={selectedStopId}
            onSelectBus={(bus) => setSelectedBusId(bus.id)}
            onSelectStop={(stop) => setSelectedStopId(stop.id)}
          />

          {/* Floating Selected Bus Quick Card (Desktop) */}
          {selectedBus && (
            <div className="hidden lg:block absolute top-4 left-4 z-20 w-80 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 shadow-xl space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#7847CB] text-white font-black text-xs">
                    {selectedBus.busNumber}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm mt-1.5">{selectedBus.routeName}</h4>
                  <p className="text-xs text-slate-500 font-mono">{selectedBus.plateNumber}</p>
                </div>
                <ETAIndicator minutes={selectedBus.etaToNextMinutes} size="sm" />
              </div>

              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Next Stop</span>
                  <span className="font-bold text-slate-900 truncate block">{selectedBus.nextStopName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Speed & Status</span>
                  <span className="font-bold text-slate-900 block">{selectedBus.speedKmh} km/h • {selectedBus.status}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <OccupancyBadge level={selectedBus.occupancy} compact />
                <span className="text-[11px] text-slate-500">Driver: {selectedBus.driverName}</span>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Side Fleet List */}
        {showListOnDesktop && (
          <aside className="hidden lg:flex w-80 bg-white border-l border-slate-200/90 flex-col shrink-0 overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                {t('Vehicles in Service', 'कार्यरत बसेस')} ({filteredBuses.length})
              </span>
              <Badge variant="brand" size="sm">Live GPS</Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filteredBuses.map((bus) => {
                const isSelected = bus.id === selectedBusId;
                return (
                  <div
                    key={bus.id}
                    onClick={() => setSelectedBusId(bus.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50/70 border-purple-300 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 bg-[#7847CB] text-white text-[11px] font-black rounded-md">
                          {bus.busNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {bus.routeName}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Next: <strong className="text-slate-700">{bus.nextStopName}</strong></span>
                      <span className="font-semibold text-emerald-600">{bus.speedKmh} km/h</span>
                    </div>
                  </div>
                );
              })}

              {filteredBuses.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs">
                  {t('No buses match current filter', 'कोणतीही बस सापडली नाही')}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Selected Bus Mobile Bottom Sheet */}
      <BottomSheet
        isOpen={!!selectedBus}
        onClose={() => setSelectedBusId(null)}
        title={`${selectedBus?.busNumber} (${selectedBus?.plateNumber})`}
        subtitle={selectedBus?.routeName}
      >
        {selectedBus && (
          <div className="space-y-4">
            <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  {t('Arriving At Next Stop', 'पुढील थांब्यावर आगमन')}
                </span>
                <span className="font-extrabold text-slate-900 text-base">{selectedBus.nextStopName}</span>
              </div>
              <ETAIndicator minutes={selectedBus.etaToNextMinutes} size="lg" />
            </div>

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

            <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="font-semibold text-slate-800">Driver: {selectedBus.driverName}</span>
                  <span className="text-slate-400 block text-[10px]">Conductor: {selectedBus.conductorName}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-purple-50 text-[#7847CB] text-[10px] font-bold rounded">
                {selectedBus.busType}
              </span>
            </div>

            {selectedRoute && (
              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  {t('Route Progress', 'प्रवास प्रगती')}
                </h5>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-36 overflow-y-auto space-y-2 text-xs">
                  {selectedRoute.stops.map((stop) => (
                    <div key={stop.stopId} className="flex items-center justify-between font-medium">
                      <span className="flex items-center gap-2 text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7847CB]" />
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

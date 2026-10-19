import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { LiveMap } from '../components/map/LiveMap';
import { BottomSheet } from '../components/common/BottomSheet';
import { OccupancyBadge, BusStatusBadge } from '../components/common/StatusBadge';
import { ETAIndicator } from '../components/common/ETAIndicator';
import {
  Navigation,
  User,
  Search,
  Filter,
  Bus as BusIcon,
  ChevronRight,
  MapPin,
  Clock,
  Compass,
  Radio,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import type { BusStop, Bus } from '../types';
import { getDistance } from '../utils/routing';
import { MOCK_ROUTES } from '../data/mockRoutes';

export const LiveTracking: React.FC = () => {
  const { t } = useLanguage();
  const { buses, stops, routes, selectedBusId, setSelectedBusId, selectedStopId, setSelectedStopId } = useApp();

  const [filterRoute, setFilterRoute] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showListOnDesktop, setShowListOnDesktop] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'all' | 'nearby'>('all');
  const [isNearbyDrawerOpen, setIsNearbyDrawerOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const allRoutes = routes.length > 0 ? routes : MOCK_ROUTES;

  const selectedBus = selectedBusId ? buses.find((b) => b.id === selectedBusId) : null;
  const selectedRoute = allRoutes.find((r) => r.id === selectedBus?.routeId);

  // Filtered buses list
  const filteredBuses = useMemo(() => {
    return buses.filter((b) => {
      const matchesRoute = filterRoute === 'all' || b.routeId === filterRoute;
      const matchesSearch =
        !searchQuery ||
        b.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.routeName && b.routeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.nextStopName && b.nextStopName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesRoute && matchesSearch;
    });
  }, [buses, filterRoute, searchQuery]);

  // Routes to display on map: shows all active corridor paths
  const routesToDisplay = useMemo(() => {
    if (selectedRoute) return [selectedRoute];
    if (filterRoute !== 'all') return allRoutes.filter((r) => r.id === filterRoute);
    
    // Display route lines for all buses active in service
    const activeRouteIds = new Set(filteredBuses.map((b) => b.routeId).filter(Boolean));
    const matched = allRoutes.filter((r) => activeRouteIds.has(r.id));
    return matched.length > 0 ? matched : allRoutes;
  }, [selectedRoute, filterRoute, allRoutes, filteredBuses]);

  // Calculate nearest stop to the commuter's live location
  const nearestStopInfo = useMemo<{ stop: BusStop; distanceMeters: number } | null>(() => {
    const commuterPos = userLocation || { lat: 19.0975, lng: 74.7420 }; // GPS or CBS Central Depot
    if (stops.length === 0) return null;

    let closestStop: BusStop | null = null;
    let minDistance = Infinity;

    for (const stop of stops) {
      const dist = getDistance(commuterPos, { lat: stop.lat, lng: stop.lng });
      if (dist < minDistance) {
        minDistance = dist;
        closestStop = stop;
      }
    }

    if (!closestStop || minDistance > 10000) return null;
    return {
      stop: closestStop,
      distanceMeters: Math.round(minDistance),
    };
  }, [userLocation, stops]);

  // Nearby Buses calculation: calculates distance to commuter & real-time ETA to commuter's stop
  const nearbyBuses = useMemo(() => {
    const commuterPos = userLocation || { lat: 19.0975, lng: 74.7420 };

    return filteredBuses.map((bus) => {
      // Direct geometric distance to commuter
      const directDist = getDistance(commuterPos, { lat: bus.lat, lng: bus.lng });

      // Target reference stop: commuter's nearest stop if found, or the bus's approaching stop
      let stopDist = directDist;
      let targetStopName = nearestStopInfo?.stop.name || bus.nextStopName || 'Your Corridor Stop';
      let etaToCommuterStopMinutes = bus.etaToNextMinutes || 1;

      if (nearestStopInfo) {
        stopDist = getDistance(
          { lat: bus.lat, lng: bus.lng },
          { lat: nearestStopInfo.stop.lat, lng: nearestStopInfo.stop.lng }
        );
        targetStopName = nearestStopInfo.stop.name;

        const effectiveSpeed = Math.max(16, bus.speedKmh || 25);
        const nominalMins = Math.max(1, Math.round((stopDist / 1000) / (effectiveSpeed / 60)));
        etaToCommuterStopMinutes = nominalMins + (bus.delayMinutes || 0);
      }

      return {
        ...bus,
        directDistanceMeters: Math.round(directDist),
        stopDistanceMeters: Math.round(stopDist),
        targetStopName,
        etaToCommuterStopMinutes
      };
    }).sort((a, b) => a.stopDistanceMeters - b.stopDistanceMeters);
  }, [filteredBuses, userLocation, nearestStopInfo]);

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden flex flex-col md:p-4 md:gap-3 bg-[#f8f9fc]">
      
      {/* 1. EDGE-TO-EDGE FULL-SCREEN MAP CANVAS (Mobile: 100% full viewport background, Desktop: embedded flex card) */}
      <div className="absolute inset-0 md:relative md:inset-auto md:flex-1 flex gap-3 w-full h-full md:rounded-2xl md:border md:border-slate-200/90 md:shadow-2xs overflow-hidden z-0">
        
        {/* Leaflet Live Map Canvas */}
        <div className="flex-1 relative w-full h-full min-h-0">
          <LiveMap
            buses={filteredBuses}
            stops={stops}
            routes={routesToDisplay}
            selectedBusId={selectedBusId}
            selectedStopId={selectedStopId}
            onSelectBus={(bus) => setSelectedBusId(bus.id)}
            onSelectStop={(stop) => setSelectedStopId(stop.id)}
            onUserLocationChange={setUserLocation}
            className="w-full h-full rounded-none md:rounded-2xl border-0 md:border md:border-slate-200/90"
          />

          {/* Floating Selected Bus Quick Card (Desktop) */}
          {selectedBus && (
            <div className="hidden lg:block absolute top-4 left-4 z-20 w-84 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 shadow-xl space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-0.5 rounded-lg text-white font-black text-xs ${
                      selectedBus.isDemo || selectedBus.id?.startsWith('demo-') ? 'bg-amber-500 text-slate-950' : 'bg-[#7847CB]'
                    }`}>
                      {selectedBus.busNumber}
                    </span>
                    {Boolean(selectedBus.isDemo || selectedBus.id?.startsWith('demo-')) && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black uppercase">
                        DEMO
                      </span>
                    )}
                  </div>
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

          {/* Floating Mobile Nearby Buses Quick Pill */}
          <div className="lg:hidden absolute bottom-5 left-3 z-[400]">
            <button
              type="button"
              onClick={() => setIsNearbyDrawerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl text-xs font-bold text-slate-800 active:scale-95 transition-all"
            >
              <Radio className="w-4 h-4 text-[#7847CB] animate-pulse" />
              <span>Nearby Buses ({nearbyBuses.length})</span>
            </button>
          </div>
        </div>

        {/* Desktop Side Fleet & Nearby List */}
        {showListOnDesktop && (
          <aside className="hidden lg:flex w-84 bg-white border-l border-slate-200/90 flex-col shrink-0 overflow-hidden">
            
            {/* Tab switch: All Vehicles vs Nearby to You */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex gap-1">
              <button
                type="button"
                onClick={() => setSidebarTab('all')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  sidebarTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                All Fleet ({filteredBuses.length})
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('nearby')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                  sidebarTab === 'nearby'
                    ? 'bg-[#7847CB] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                Nearby to You ({nearbyBuses.length})
              </button>
            </div>

            {/* Content for TAB: Nearby Buses */}
            {sidebarTab === 'nearby' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {nearestStopInfo && (
                  <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-200 text-xs">
                    <span className="text-[10px] font-bold text-[#7847CB] uppercase tracking-wider block">
                      Your Nearest Stop
                    </span>
                    <div className="flex items-center justify-between font-bold text-slate-900 mt-0.5">
                      <span className="truncate">{nearestStopInfo.stop.name}</span>
                      <span className="text-purple-700 font-mono text-[11px] shrink-0 ml-1">
                        {nearestStopInfo.distanceMeters > 1000
                          ? `${(nearestStopInfo.distanceMeters / 1000).toFixed(1)}km`
                          : `${nearestStopInfo.distanceMeters}m`} away
                      </span>
                    </div>
                  </div>
                )}

                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight block px-1">
                  Approaching Buses (Sorted by ETA)
                </span>

                {nearbyBuses.map((bus) => {
                  const isSelected = bus.id === selectedBusId;
                  const isDemo = Boolean(bus.isDemo || bus.id?.startsWith('demo-'));

                  return (
                    <div
                      key={bus.id}
                      onClick={() => setSelectedBusId(bus.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-50/70 border-purple-300 ring-1 ring-purple-400 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-2 py-0.5 text-[11px] font-black rounded-md ${
                              isDemo ? 'bg-amber-500 text-slate-950' : 'bg-[#7847CB] text-white'
                            }`}
                          >
                            {bus.busNumber}
                          </span>
                          {isDemo && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black uppercase">
                              DEMO
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {bus.routeName}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>

                      {/* Real-time Distance & ETA */}
                      <div className="mt-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Distance to Stop</span>
                          <span className="font-bold text-slate-800">
                            {bus.stopDistanceMeters > 1000
                              ? `${(bus.stopDistanceMeters / 1000).toFixed(1)} km`
                              : `${bus.stopDistanceMeters} m`}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. Arrival</span>
                          <span className="font-black text-purple-700 font-mono">
                            ~{bus.etaToCommuterStopMinutes} min
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Speed: <strong className="text-slate-700">{bus.speedKmh} km/h</strong></span>
                        <span className="font-semibold text-emerald-600 capitalize">{bus.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  );
                })}

                {nearbyBuses.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No active buses currently in range.
                  </div>
                )}
              </div>
            )}

            {/* Content for TAB: All Vehicles */}
            {sidebarTab === 'all' && (
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {filteredBuses.map((bus) => {
                  const isSelected = bus.id === selectedBusId;
                  const isDemo = Boolean(bus.isDemo || bus.id?.startsWith('demo-'));

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
                          <span
                            className={`px-2 py-0.5 text-[11px] font-black rounded-md ${
                              isDemo ? 'bg-amber-500 text-slate-950' : 'bg-[#7847CB] text-white'
                            }`}
                          >
                            {bus.busNumber}
                          </span>
                          {isDemo && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black uppercase tracking-wider shrink-0">
                              DEMO
                            </span>
                          )}
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
            )}
          </aside>
        )}
      </div>

      {/* 2. FLOATING TOP CONTROLS TOOLBAR */}
      <div className="absolute top-3 left-3 right-3 md:static z-20 bg-white/95 backdrop-blur-md p-2.5 sm:p-3 md:p-3.5 rounded-2xl border border-slate-200/90 shadow-lg md:shadow-2xs flex flex-wrap items-center justify-between gap-2 shrink-0 pointer-events-auto md:order-first">
        <div className="flex items-center gap-2 sm:gap-2.5">
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

        {/* Nearest Stop Pill (if user location is active) */}
        {nearestStopInfo && (
          <button
            type="button"
            onClick={() => setSelectedStopId(nearestStopInfo.stop.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-[#7847CB] text-[11px] font-bold border border-purple-200 hover:bg-purple-100 transition-colors shadow-2xs"
            title="Jump to nearest bus stop"
          >
            <MapPin className="w-3.5 h-3.5 text-[#7847CB]" />
            <span className="truncate max-w-[140px] sm:max-w-none">
              {nearestStopInfo.stop.name} ({nearestStopInfo.distanceMeters > 1000 ? `${(nearestStopInfo.distanceMeters / 1000).toFixed(1)}km` : `${nearestStopInfo.distanceMeters}m`})
            </span>
          </button>
        )}

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
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#7847CB] focus:ring-1 focus:ring-[#7847CB]/30 w-32 sm:w-44"
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
              {allRoutes.map((r) => (
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

      {/* Mobile Drawer for Nearby Buses */}
      <BottomSheet
        isOpen={isNearbyDrawerOpen}
        onClose={() => setIsNearbyDrawerOpen(false)}
        title="Nearby Buses to Your Stop"
        subtitle={nearestStopInfo ? `Nearest: ${nearestStopInfo.stop.name} (${nearestStopInfo.distanceMeters}m)` : 'Real-time transit proximity'}
      >
        <div className="space-y-3 p-1">
          {nearbyBuses.map((bus) => (
            <div
              key={bus.id}
              onClick={() => {
                setSelectedBusId(bus.id);
                setIsNearbyDrawerOpen(false);
              }}
              className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2 active:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-black rounded-md ${
                    bus.isDemo || bus.id?.startsWith('demo-') ? 'bg-amber-500 text-slate-950' : 'bg-[#7847CB] text-white'
                  }`}>
                    {bus.busNumber}
                  </span>
                  {Boolean(bus.isDemo || bus.id?.startsWith('demo-')) && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black uppercase">
                      DEMO
                    </span>
                  )}
                  <span className="font-bold text-xs text-slate-900">{bus.routeName}</span>
                </div>
                <span className="font-mono font-black text-purple-700 text-xs">
                  ~{bus.etaToCommuterStopMinutes} min
                </span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Distance: <strong className="text-slate-800">{bus.stopDistanceMeters > 1000 ? `${(bus.stopDistanceMeters / 1000).toFixed(1)} km` : `${bus.stopDistanceMeters} m`}</strong></span>
                <span className="text-emerald-600 font-bold">{bus.speedKmh} km/h</span>
              </div>
            </div>
          ))}
        </div>
      </BottomSheet>

      {/* Selected Bus Mobile Bottom Sheet */}
      <BottomSheet
        isOpen={!!selectedBus}
        onClose={() => setSelectedBusId(null)}
        title={`${selectedBus?.busNumber} (${selectedBus?.plateNumber})`}
        subtitle={selectedBus?.routeName}
      >
        {selectedBus && (
          <div className="space-y-4">
            {Boolean(selectedBus.isDemo || selectedBus.id?.startsWith('demo-')) && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-900 text-xs font-bold">
                <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider shrink-0">
                  SIMULATION
                </span>
                <span>Predefined road route replay for testing. Not in passenger revenue service.</span>
              </div>
            )}
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

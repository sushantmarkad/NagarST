import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { LiveMap } from '../components/map/LiveMap';
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
  Radio,
  Sparkles,
  ArrowRight,
  X,
  CheckCircle2,
  Gauge,
  Crosshair,
  ShieldCheck,
  Compass,
  Route as RouteIcon
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { BusStop, Bus, Route as RouteType } from '../types';
import { getDistance } from '../utils/routing';
import { MOCK_ROUTES } from '../data/mockRoutes';
import { AVAILABLE_DEMO_ROUTES } from '../utils/demoSimulatorEngine';

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

  // Resolves complete route stops and details for the selected bus (from routes, mock routes, or demo presets)
  const selectedBusRoute = useMemo<RouteType | null>(() => {
    if (!selectedBus) return null;

    // 1. Direct DB or mock route match
    const directRoute = allRoutes.find((r) => r.id === selectedBus.routeId);
    if (directRoute && directRoute.stops && directRoute.stops.length > 0) {
      return directRoute;
    }

    // 2. Demo Route Presets match
    const preset = AVAILABLE_DEMO_ROUTES.find(
      (p) => p.id === selectedBus.routeId || selectedBus.routeName?.includes(p.routeNumber)
    );
    if (preset) {
      return {
        id: preset.id,
        routeNumber: preset.routeNumber,
        name: preset.routeName,
        nameMarathi: preset.routeName,
        origin: preset.origin,
        destination: preset.destination,
        firstBus: '06:00 AM',
        lastBus: '10:00 PM',
        frequencyMinutes: 15,
        baseFare: 10,
        maxFare: 25,
        totalStops: preset.stops.length,
        durationMinutes: 30,
        color: preset.color,
        activeBusesCount: 1,
        status: 'normal' as const,
        stops: preset.stops.map((s, idx) => ({
          stopId: s.id,
          stopName: s.name,
          stopNameMarathi: s.name,
          sequence: idx + 1,
          fareFromOrigin: idx * 5,
          estimatedMinutesFromOrigin: idx * 5,
          isMajorHub: idx === 0 || idx === preset.stops.length - 1,
          lat: s.lat,
          lng: s.lng,
        })),
      };
    }

    return directRoute || null;
  }, [selectedBus, allRoutes]);

  // Routes to display on map: shows all active corridor paths
  const routesToDisplay = useMemo(() => {
    if (selectedBusRoute) return [selectedBusRoute];
    if (filterRoute !== 'all') return allRoutes.filter((r) => r.id === filterRoute);

    const activeRouteIds = new Set(filteredBuses.map((b) => b.routeId).filter(Boolean));
    const matched = allRoutes.filter((r) => activeRouteIds.has(r.id));
    return matched.length > 0 ? matched : allRoutes;
  }, [selectedBusRoute, filterRoute, allRoutes, filteredBuses]);

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
      const directDist = getDistance(commuterPos, { lat: bus.lat, lng: bus.lng });

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
        etaToCommuterStopMinutes,
      };
    }).sort((a, b) => a.stopDistanceMeters - b.stopDistanceMeters);
  }, [filteredBuses, userLocation, nearestStopInfo]);

  // Determine stop progress index for selected bus
  const currentStopProgressIndex = useMemo(() => {
    if (!selectedBus || !selectedBusRoute?.stops) return -1;
    const nextIdx = selectedBusRoute.stops.findIndex(
      (s) => s.stopName === selectedBus.nextStopName || s.stopId === selectedBus.nextStopId
    );
    return nextIdx !== -1 ? nextIdx : 0;
  }, [selectedBus, selectedBusRoute]);

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden flex flex-col md:p-4 md:gap-3 bg-[#f8f9fc]">
      
      {/* 1. EDGE-TO-EDGE FULL-SCREEN MAP CANVAS */}
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
                  Approaching Buses (Click to view stops)
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

        {/* Nearest Stop Pill */}
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

      {/* =========================================================================
          FULL POPUP MODAL: BUS DETAILS & ALL ROUTE STOPS (Opens on bus icon click)
          ========================================================================= */}
      {selectedBus && (
        <div className="fixed inset-0 z-[650] flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh] text-slate-900 animate-in zoom-in-95 duration-200">
            
            {/* Top Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`px-3 py-1.5 rounded-xl font-black text-sm text-white shadow-xs ${
                    selectedBus.isDemo || selectedBus.id?.startsWith('demo-')
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-[#7847CB]'
                  }`}
                >
                  {selectedBus.busNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                      Bus {selectedBus.busNumber}
                    </h3>
                    {Boolean(selectedBus.isDemo || selectedBus.id?.startsWith('demo-')) ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                        DEMO SIMULATOR
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                        LIVE GPS
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedBus.plateNumber} • {selectedBus.busType}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBusId(null)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                aria-label="Close bus details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              
              {/* "Which bus is going where" (Corridor & Direction Banner) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 border border-purple-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-[#7847CB] flex items-center gap-1.5">
                    <RouteIcon className="w-4 h-4" />
                    {selectedBus.routeNumber ? `Route ${selectedBus.routeNumber}` : 'Corridor Route'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {selectedBusRoute?.stops.length || 0} Total Route Stops
                  </span>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-white/90 rounded-xl border border-purple-100 text-xs font-bold shadow-2xs">
                  <div className="min-w-0 flex-1 truncate text-purple-950">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">START TERMINAL</span>
                    {selectedBus.origin || selectedBusRoute?.origin || 'Depot'}
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#7847CB] shrink-0" />
                  <div className="min-w-0 flex-1 truncate text-emerald-950">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">GOING TO (DESTINATION)</span>
                    {selectedBus.destination || selectedBusRoute?.destination || 'Terminal'}
                  </div>
                </div>
              </div>

              {/* Next Approaching Stop & ETA Alert */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#7847CB]" /> Approaching Next Stop
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base mt-0.5 block truncate max-w-[200px] sm:max-w-none">
                    {selectedBus.nextStopName}
                  </span>
                </div>
                <ETAIndicator minutes={selectedBus.etaToNextMinutes} size="lg" />
              </div>

              {/* Proximity to Passenger's Stop (if commuter location is known) */}
              {nearestStopInfo && (
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                      To Your Nearest Stop ({nearestStopInfo.stop.name})
                    </span>
                    <span className="font-bold text-emerald-950 truncate block">
                      Distance: ~{nearestStopInfo.distanceMeters > 1000 ? `${(nearestStopInfo.distanceMeters / 1000).toFixed(1)} km` : `${nearestStopInfo.distanceMeters} m`}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Arrival</span>
                    <span className="font-black text-emerald-700 font-mono text-sm">
                      ~{selectedBus.etaToNextMinutes || 3} min
                    </span>
                  </div>
                </div>
              )}

              {/* Real-time Telemetry Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Velocity</span>
                  <span className="font-extrabold text-slate-900 font-mono text-sm">
                    {selectedBus.speedKmh} km/h
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Passenger Load</span>
                  <div className="mt-0.5">
                    <OccupancyBadge level={selectedBus.occupancy} compact />
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Schedule</span>
                  <div className="mt-0.5">
                    <BusStatusBadge status={selectedBus.status} delayMinutes={selectedBus.delayMinutes} />
                  </div>
                </div>
              </div>

              {/* "Which are the stops there in those routes" (Complete Route Stop Timeline) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#7847CB]" />
                    All Scheduled Stops in this Route ({selectedBusRoute?.stops.length || 0})
                  </h4>
                  <span className="text-[11px] text-slate-400">Sequential Corridor Order</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 max-h-56 overflow-y-auto space-y-2 text-xs">
                  {selectedBusRoute?.stops && selectedBusRoute.stops.length > 0 ? (
                    selectedBusRoute.stops.map((stop, idx) => {
                      const isNext = stop.stopName === selectedBus.nextStopName;
                      const isPassed = idx < currentStopProgressIndex;
                      const isUserStop = nearestStopInfo?.stop.name === stop.stopName;

                      return (
                        <div
                          key={stop.stopId || idx}
                          className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
                            isNext
                              ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-2xs'
                              : isUserStop
                              ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold shadow-2xs'
                              : isPassed
                              ? 'bg-white/60 border-slate-100 text-slate-400'
                              : 'bg-white border-slate-200/70 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isPassed ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </div>
                            ) : isNext ? (
                              <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-mono text-[10px] font-black flex items-center justify-center shrink-0 shadow-xs">
                                {idx + 1}
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </div>
                            )}

                            <div className="min-w-0">
                              <span className="truncate block font-semibold">{stop.stopName}</span>
                              {stop.stopNameMarathi && stop.stopNameMarathi !== stop.stopName && (
                                <span className="text-[10px] text-slate-400 block truncate">{stop.stopNameMarathi}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {isUserStop && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                                YOUR STOP
                              </span>
                            )}

                            {isNext ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 shadow-2xs flex items-center gap-1">
                                <Clock className="w-3 h-3" /> NEXT ({selectedBus.etaToNextMinutes || 1}m)
                              </span>
                            ) : isPassed ? (
                              <span className="text-[10px] font-semibold text-emerald-600">Passed</span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">
                                +{Math.max(1, (idx - currentStopProgressIndex) * 4)}m
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-xs">
                      Corridor stops list unavailable.
                    </div>
                  )}
                </div>
              </div>

              {/* Crew & Transponder Info */}
              <div className="p-3 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="font-semibold text-slate-800">Operator: {selectedBus.driverName}</span>
                    <span className="text-slate-400 block text-[10px]">Conductor: {selectedBus.conductorName}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-purple-50 text-[#7847CB] text-[10px] font-bold rounded-lg border border-purple-100">
                  {selectedBus.busType}
                </span>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2 shrink-0">
              <Button
                onClick={() => setSelectedBusId(null)}
                variant="outline"
                size="md"
                className="flex-1"
              >
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer for Nearby Buses list */}
      {isNearbyDrawerOpen && (
        <div className="fixed inset-0 z-[600] flex items-end justify-center bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150 lg:hidden">
          <div className="w-full bg-white rounded-t-3xl max-h-[80vh] flex flex-col p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Nearby Buses to You</h3>
                <p className="text-xs text-slate-500">
                  {nearestStopInfo ? `Nearest: ${nearestStopInfo.stop.name}` : 'Real-time proximity'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNearbyDrawerOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1">
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
          </div>
        </div>
      )}

    </div>
  );
};

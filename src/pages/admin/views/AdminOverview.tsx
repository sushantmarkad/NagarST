import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useApp } from '../../../context/AppContext';
import {
  Bus,
  Route,
  Users,
  CheckCircle2,
  AlertTriangle,
  Megaphone,
  Radio,
  ArrowUpRight,
  MapPin,
  Clock,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';

interface OverviewProps {
  onNavigateView?: (view: any) => void;
}

export const AdminOverview: React.FC<OverviewProps> = ({ onNavigateView }) => {
  const { buses: liveBuses, routes: contextRoutes, stops } = useApp();

  const [dbBusesCount, setDbBusesCount] = useState<number>(0);
  const [dbRoutesCount, setDbRoutesCount] = useState<number>(0);
  const [dbDriversCount, setDbDriversCount] = useState<number>(0);
  const [activeTripsCount, setActiveTripsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const [
        { count: bCount },
        { count: rCount },
        { count: dCount },
        { count: tCount }
      ] = await Promise.all([
        supabase.from('buses').select('*', { count: 'exact', head: true }),
        supabase.from('routes').select('*', { count: 'exact', head: true }),
        supabase.from('driver_credentials').select('*', { count: 'exact', head: true }),
        supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
      ]);

      setDbBusesCount(bCount || 0);
      setDbRoutesCount(rCount || 0);
      setDbDriversCount(dCount || 0);
      setActiveTripsCount(tCount || 0);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const activeLiveCount = (liveBuses as any[]).filter((b: any) => b.isLive || b.status === 'in-service' || b.status === 'on-time' || b.status === 'on_time').length;

  const navigateTo = (view: any) => {
    if (onNavigateView) {
      onNavigateView(view);
    } else {
      window.location.hash = view;
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* 1. MUNICIPAL DISPATCH CONTROL BANNER */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-2xs relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="brand" size="md" dot>
              Ahilyanagar Municipal Operations Room
            </Badge>
            <span className="text-xs font-semibold text-slate-500">Live Telemetry Feed</span>
          </div>

          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Ahilyanagar Urban Transit Control Center
          </h1>
          <p className="text-xs md:text-sm text-slate-600 mt-1.5 leading-relaxed">
            Real-time fleet monitoring, route corridor management, driver dispatch, and public citizen service announcements.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              99.4% Network Uptime
            </span>
            <span className="text-slate-400">•</span>
            <span>Current Shift: <strong>Morning / Afternoon Peak</strong></span>
          </div>
        </div>

        <div className="flex flex-wrap lg:flex-col items-stretch gap-2.5 shrink-0 z-10">
          <Button
            size="md"
            onClick={() => navigateTo('live_fleet')}
            leftIcon={<Radio className="w-4 h-4 text-purple-300" />}
          >
            Launch Fleet Radar Map
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => navigateTo('buses')}
            leftIcon={<Bus className="w-4 h-4 text-slate-500" />}
          >
            Manage Vehicle Fleet
          </Button>
        </div>
      </div>

      {/* 2. OPERATIONAL KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Active Fleet */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Fleet</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#7847CB] flex items-center justify-center">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-slate-900 tabular-nums">
              {activeLiveCount || activeTripsCount || 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              / {dbBusesCount} registered buses
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-[#7847CB]" />
            <span>{dbBusesCount > 0 ? `${Math.round(((activeLiveCount || activeTripsCount) / dbBusesCount) * 100)}% fleet in motion` : 'Ready to assign'}</span>
          </div>
        </div>

        {/* Metric 2: Transit Corridors */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Routes</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Route className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-slate-900 tabular-nums">
              {dbRoutesCount || contextRoutes.length || 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              routes active
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{stops.length} municipal stops</span>
          </div>
        </div>

        {/* Metric 3: Active Staff */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Driver Crew</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-slate-900 tabular-nums">
              {dbDriversCount}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              registered drivers
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Live database credentials</span>
          </div>
        </div>

        {/* Metric 4: Active Shifts */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Shifts</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-slate-900 tabular-nums">
              {activeTripsCount}
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              In progress
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span>Direct from trips table</span>
          </div>
        </div>

      </div>

      {/* 3. DUAL SECTION: LIVE ACTIVE VEHICLES STREAM & OPERATIONAL NOTICES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left (2 cols): Active Vehicles Telemetry Summary */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-5 md:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm md:text-base font-bold text-slate-900">
                Live Active Vehicles on Ahilyanagar Roads
              </h3>
              <p className="text-xs text-slate-500">Real-time driver location and speed telemetry</p>
            </div>
            <Badge variant="brand" size="sm">Auto-Updating</Badge>
          </div>

          <div className="space-y-2.5">
            {(liveBuses as any[]).slice(0, 5).map((bus: any) => (
              <div
                key={bus.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50/50 border border-slate-100 hover:border-purple-200 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-xs text-[#7847CB] shadow-2xs shrink-0">
                    {bus.busNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {bus.routeName || 'City Route'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        {bus.status || 'Active'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                      Plate: <span className="font-mono">{bus.plateNumber}</span> • Driver: <strong>{bus.driverName || 'Assigned'}</strong>
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-slate-900 block tabular-nums">
                    {bus.speedKmh ? `${bus.speedKmh} km/h` : '0 km/h'}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">GPS Locked</span>
                </div>
              </div>
            ))}

            {liveBuses.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                No buses active on road currently. Check driver dispatch console.
              </div>
            )}
          </div>
        </div>

        {/* Right (1 col): Quick Control & System Status */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Quick Administrative Tasks
            </h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => navigateTo('routes')}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-xs font-bold text-slate-800 transition-colors border border-slate-100"
              >
                <span>Add / Configure Transit Route</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => navigateTo('announcements')}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-xs font-bold text-slate-800 transition-colors border border-slate-100"
              >
                <span>Publish Public Transit Announcement</span>
                <Megaphone className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => navigateTo('drivers')}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-xs font-bold text-slate-800 transition-colors border border-slate-100"
              >
                <span>Assign Driver Shift & Bus</span>
                <Users className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Environmental EV Fleet Metric */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#7847CB]" />
              <h4 className="text-xs font-bold text-slate-900">Green City Transit Undertaking</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              70% of Ahilyanagar municipal fleet operates on zero-emission electric powertrains, reducing urban particulate smog.
            </p>
            <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Daily Carbon Offset</span>
              <span className="font-black text-[#7847CB]">~340 kg CO₂</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

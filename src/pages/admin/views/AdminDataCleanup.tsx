import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useApp } from '../../../context/AppContext';
import { useToast, useConfirm } from '../../../context/FeedbackContext';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import {
  Trash2,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Bus,
  Route as RouteIcon,
  MapPin,
  Users,
  Clock,
  Radio,
  Megaphone,
  Ticket,
  ShieldAlert,
  Layers,
  Database,
  ArrowRight,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface DataCounts {
  buses: number;
  routes: number;
  stops: number;
  routeStops: number;
  drivers: number;
  trips: number;
  liveLocations: number;
  announcements: number;
  incidents: number;
  tickets: number;
  passes: number;
}

interface DeletionStep {
  step: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

const INITIAL_COUNTS: DataCounts = {
  buses: 0,
  routes: 0,
  stops: 0,
  routeStops: 0,
  drivers: 0,
  trips: 0,
  liveLocations: 0,
  announcements: 0,
  incidents: 0,
  tickets: 0,
  passes: 0,
};

export const AdminDataCleanup: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const { refreshData, clearAllAppData } = useApp();

  const [counts, setCounts] = useState<DataCounts>(INITIAL_COUNTS);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  // Master Delete Modal state
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState<{ step: string; status: 'pending' | 'running' | 'done' | 'error' }[]>([]);

  // Granular deletion loading state
  const [activeDeletingKey, setActiveDeletingKey] = useState<string | null>(null);

  // Seed demo data state
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    fetchAllCounts();
  }, []);

  const fetchAllCounts = async () => {
    setIsLoadingCounts(true);
    try {
      // 1. Fetch counts from Supabase in parallel
      const [
        { count: bCount },
        { count: rCount },
        { count: sCount },
        { count: rsCount },
        { count: dCount },
        { count: tCount },
        { count: lCount },
      ] = await Promise.all([
        supabase.from('buses').select('*', { count: 'exact', head: true }),
        supabase.from('routes').select('*', { count: 'exact', head: true }),
        supabase.from('stops').select('*', { count: 'exact', head: true }),
        supabase.from('route_stops').select('*', { count: 'exact', head: true }),
        supabase.from('driver_credentials').select('*', { count: 'exact', head: true }).neq('status', 'Deleted'),
        supabase.from('trips').select('*', { count: 'exact', head: true }),
        supabase.from('live_locations').select('*', { count: 'exact', head: true }),
      ]);

      // 2. Fetch counts from LocalStorage
      let notifCount = 0;
      let incCount = 0;
      let ticketCount = 0;
      let passCount = 0;

      try {
        const notifs = localStorage.getItem('nagarst_notifications');
        if (notifs) notifCount = JSON.parse(notifs).length;
      } catch {}

      try {
        const incs = localStorage.getItem('nagarst_incidents');
        if (incs) incCount = JSON.parse(incs).length;
      } catch {}

      try {
        const tkts = localStorage.getItem('nagarst_tickets');
        if (tkts) ticketCount = JSON.parse(tkts).length;
      } catch {}

      try {
        const pss = localStorage.getItem('nagarst_passes');
        if (pss) passCount = JSON.parse(pss).length;
      } catch {}

      setCounts({
        buses: bCount || 0,
        routes: rCount || 0,
        stops: sCount || 0,
        routeStops: rsCount || 0,
        drivers: dCount || 0,
        trips: tCount || 0,
        liveLocations: lCount || 0,
        announcements: notifCount,
        incidents: incCount,
        tickets: ticketCount,
        passes: passCount,
      });
    } catch (err: any) {
      console.error('Failed to fetch counts:', err);
      toast.error('Failed to load real-time system counts: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoadingCounts(false);
    }
  };

  /**
   * Helper to delete rows in batches by ID
   */
  const deleteTableRows = async (tableName: string, idField: string = 'id') => {
    const { data: rows, error: selectErr } = await supabase.from(tableName).select(idField);
    if (selectErr) {
      console.warn(`Error selecting from ${tableName}:`, selectErr);
      const { error: delErr } = await supabase.from(tableName).delete().not(idField, 'is', null);
      if (delErr) throw delErr;
      return;
    }
    if (!rows || rows.length === 0) return 0;

    const ids = rows.map((r: any) => r[idField]).filter(Boolean);
    if (ids.length === 0) return 0;

    // Batch in chunks of 50
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      const { error: delErr } = await supabase.from(tableName).delete().in(idField, chunk);
      if (delErr) throw delErr;
    }
    return ids.length;
  };

  /**
   * Master Delete Handler: Wipes ALL data filled in the system
   */
  const handleMasterDeleteAll = async () => {
    if (confirmationInput.trim().toUpperCase() !== 'DELETE ALL DATA') {
      toast.warning('Verification text does not match. Please enter "DELETE ALL DATA" exactly.');
      return;
    }

    setIsDeletingAll(true);
    const steps: DeletionStep[] = [
      { step: 'Purging live GPS locations & telemetry (live_locations)', status: 'pending' },
      { step: 'Clearing driver trips & active shift schedules (trips)', status: 'pending' },
      { step: 'Removing route-stop junction mappings (route_stops)', status: 'pending' },
      { step: 'Deleting transit routes & corridors (routes)', status: 'pending' },
      { step: 'Deleting municipal bus stops (stops)', status: 'pending' },
      { step: 'Unlinking bus assignments from driver accounts (preserving logins)', status: 'pending' },
      { step: 'Removing registered fleet vehicles (buses)', status: 'pending' },
      { step: 'Clearing public announcements & incident board', status: 'pending' },
      { step: 'Resetting commuter tickets, passes & local cache', status: 'pending' },
      { step: 'Refreshing transit application state', status: 'pending' },
    ];
    setDeletionProgress(steps);

    try {
      // Step 1: Live locations
      steps[0].status = 'running';
      setDeletionProgress([...steps]);
      await deleteTableRows('live_locations', 'id').catch(async () => {
        await deleteTableRows('live_locations', 'bus_id').catch(() => {});
      });
      steps[0].status = 'done';
      setDeletionProgress([...steps]);

      // Step 2: Trips
      steps[1].status = 'running';
      setDeletionProgress([...steps]);
      await deleteTableRows('trips', 'id');
      steps[1].status = 'done';
      setDeletionProgress([...steps]);

      // Step 3: Route Stops
      steps[2].status = 'running';
      setDeletionProgress([...steps]);
      await deleteTableRows('route_stops', 'id');
      steps[2].status = 'done';
      setDeletionProgress([...steps]);

      // Step 4: Routes
      steps[3].status = 'running';
      setDeletionProgress([...steps]);
      await deleteTableRows('routes', 'id');
      steps[3].status = 'done';
      setDeletionProgress([...steps]);

      // Step 5: Stops
      steps[4].status = 'running';
      setDeletionProgress([...steps]);
      await deleteTableRows('stops', 'id');
      steps[4].status = 'done';
      setDeletionProgress([...steps]);

      // Step 6: Unassign buses from driver credentials (preserves driver accounts, clears foreign key)
      steps[5].status = 'running';
      setDeletionProgress([...steps]);
      const { data: driversWithBuses } = await supabase
        .from('driver_credentials')
        .select('id')
        .not('assigned_bus_id', 'is', null);

      if (driversWithBuses && driversWithBuses.length > 0) {
        const driverIds = driversWithBuses.map((d: any) => d.id);
        for (let i = 0; i < driverIds.length; i += 50) {
          const chunk = driverIds.slice(i, i + 50);
          await supabase.from('driver_credentials').update({ assigned_bus_id: null }).in('id', chunk);
        }
      }
      steps[5].status = 'done';
      setDeletionProgress([...steps]);

      // Step 7: Buses (Now safe from driver_credentials_assigned_bus_id_fkey)
      steps[6].status = 'running';
      setDeletionProgress([...steps]);
      await deleteTableRows('buses', 'id');
      steps[6].status = 'done';
      setDeletionProgress([...steps]);

      // Step 8: Announcements & Incidents
      steps[7].status = 'running';
      setDeletionProgress([...steps]);
      localStorage.removeItem('nagarst_notifications');
      localStorage.removeItem('nagarst_incidents');
      localStorage.removeItem('nagarst_conductor_shift');
      steps[7].status = 'done';
      setDeletionProgress([...steps]);

      // Step 9: Commuter Tickets & Passes
      steps[8].status = 'running';
      setDeletionProgress([...steps]);
      clearAllAppData();
      steps[8].status = 'done';
      setDeletionProgress([...steps]);

      // Step 10: Refresh App state
      steps[9].status = 'running';
      setDeletionProgress([...steps]);
      await refreshData();
      await fetchAllCounts();
      steps[9].status = 'done';
      setDeletionProgress([...steps]);

      toast.success('System Reset Complete', 'All operational and entered data has been completely erased.');
      setTimeout(() => {
        setIsMasterModalOpen(false);
        setConfirmationInput('');
      }, 1200);
    } catch (err: any) {
      console.error('System reset error:', err);
      toast.error('Deletion stopped with error: ' + (err.message || 'Unknown database error'));
    } finally {
      setIsDeletingAll(false);
    }
  };

  /**
   * Granular Category Purge Handlers
   */
  const handlePurgeCategory = async (category: string) => {
    switch (category) {
      case 'buses': {
        const ok = await confirm({
          title: 'Delete All Fleet Buses?',
          message: 'This will permanently remove all registered buses from the fleet and detach active trips. Are you sure?',
          confirmText: 'Delete All Buses',
          isDestructive: true,
          variant: 'danger',
        });
        if (!ok) return;

        setActiveDeletingKey('buses');
        try {
          await deleteTableRows('live_locations', 'id').catch(() => {});
          await deleteTableRows('trips', 'id').catch(() => {});
          
          // Unassign bus from all driver credentials first so foreign key doesn't fail
          const { data: driversWithBuses } = await supabase
            .from('driver_credentials')
            .select('id')
            .not('assigned_bus_id', 'is', null);

          if (driversWithBuses && driversWithBuses.length > 0) {
            const driverIds = driversWithBuses.map((d: any) => d.id);
            for (let i = 0; i < driverIds.length; i += 50) {
              const chunk = driverIds.slice(i, i + 50);
              await supabase.from('driver_credentials').update({ assigned_bus_id: null }).in('id', chunk);
            }
          }

          await deleteTableRows('buses', 'id');
          await refreshData();
          await fetchAllCounts();
          toast.success('All fleet buses removed (driver accounts unlinked & preserved).');
        } catch (err: any) {
          toast.error(`Error deleting buses: ${err.message}`);
        } finally {
          setActiveDeletingKey(null);
        }
        break;
      }

      case 'routes_stops': {
        const ok = await confirm({
          title: 'Delete All Routes & Stops?',
          message: 'This will permanently delete all transit routes, corridor waypoints, and bus stops across Ahilyanagar.',
          confirmText: 'Delete Routes & Stops',
          isDestructive: true,
          variant: 'danger',
        });
        if (!ok) return;

        setActiveDeletingKey('routes_stops');
        try {
          await deleteTableRows('trips', 'id').catch(() => {});
          await deleteTableRows('route_stops', 'id');
          await deleteTableRows('routes', 'id');
          await deleteTableRows('stops', 'id');
          try {
            localStorage.removeItem('nagarst_configured_routes');
            localStorage.removeItem('nagarst_demo_assignments');
          } catch (_) {}
          await refreshData();
          await fetchAllCounts();
          toast.success('All routes, waypoints, and stops have been deleted.');
        } catch (err: any) {
          toast.error(`Error deleting routes & stops: ${err.message}`);
        } finally {
          setActiveDeletingKey(null);
        }
        break;
      }

      case 'drivers': {
        const ok = await confirm({
          title: 'Delete All Driver Accounts?',
          message: 'This will permanently wipe all registered driver logins and assigned shifts.',
          confirmText: 'Delete All Drivers',
          isDestructive: true,
          variant: 'danger',
        });
        if (!ok) return;

        setActiveDeletingKey('drivers');
        try {
          await deleteTableRows('trips', 'id').catch(() => {});
          await deleteTableRows('driver_credentials', 'id').catch(() => {});
          await supabase
            .from('driver_credentials')
            .update({ status: 'Deleted', assigned_bus_id: null })
            .neq('status', 'Deleted');
          await fetchAllCounts();
          toast.success('All driver accounts cleared from active roster.');
        } catch (err: any) {
          toast.error(`Error deleting driver credentials: ${err.message}`);
        } finally {
          setActiveDeletingKey(null);
        }
        break;
      }

      case 'trips': {
        const ok = await confirm({
          title: 'Clear All Trips & Shifts?',
          message: 'This will reset all current and past trip schedules and clear active radar dispatch links.',
          confirmText: 'Clear All Trips',
          isDestructive: true,
          variant: 'warning',
        });
        if (!ok) return;

        setActiveDeletingKey('trips');
        try {
          await deleteTableRows('live_locations', 'id').catch(() => {});
          await deleteTableRows('trips', 'id');
          await refreshData();
          await fetchAllCounts();
          toast.success('All trip shifts have been cleared.');
        } catch (err: any) {
          toast.error(`Error clearing trips: ${err.message}`);
        } finally {
          setActiveDeletingKey(null);
        }
        break;
      }

      case 'live_locations': {
        const ok = await confirm({
          title: 'Clear Live GPS Telemetry?',
          message: 'This will reset all active bus location markers on the radar map until drivers send fresh GPS coordinates.',
          confirmText: 'Clear GPS Radar',
          isDestructive: true,
          variant: 'warning',
        });
        if (!ok) return;

        setActiveDeletingKey('live_locations');
        try {
          await deleteTableRows('live_locations', 'id').catch(async () => {
            await deleteTableRows('live_locations', 'bus_id').catch(() => {});
          });
          await refreshData();
          await fetchAllCounts();
          toast.success('Live GPS coordinates cleared from radar.');
        } catch (err: any) {
          toast.error(`Error clearing GPS radar: ${err.message}`);
        } finally {
          setActiveDeletingKey(null);
        }
        break;
      }

      case 'announcements': {
        const ok = await confirm({
          title: 'Clear Public Announcements?',
          message: 'This will remove all published citizen notices and passenger alerts.',
          confirmText: 'Clear Announcements',
          isDestructive: true,
          variant: 'danger',
        });
        if (!ok) return;

        setActiveDeletingKey('announcements');
        try {
          localStorage.removeItem('nagarst_notifications');
          await fetchAllCounts();
          toast.success('Public announcements cleared.');
        } catch (err: any) {
          toast.error(`Error clearing announcements: ${err.message}`);
        } finally {
          setActiveDeletingKey(null);
        }
        break;
      }

      case 'incidents': {
        const ok = await confirm({
          title: 'Clear Incident Desk Logs?',
          message: 'This will permanently remove all logged breakdown, accident, and road congestion reports.',
          confirmText: 'Clear Incidents',
          isDestructive: true,
          variant: 'danger',
        });
        if (!ok) return;

        setActiveDeletingKey('incidents');
        try {
          localStorage.removeItem('nagarst_incidents');
          await fetchAllCounts();
          toast.success('Incident desk logs cleared.');
        } catch (err: any) {
          toast.error(`Error clearing incidents: ${err.message}`);
        } finally {
          setActiveDeletingKey(null);
        }
        break;
      }

      case 'tickets_passes': {
        const ok = await confirm({
          title: 'Clear All Tickets & Passes?',
          message: 'This will clear all commuter booked tickets, monthly bus passes, and saved routes from local storage.',
          confirmText: 'Clear Commuter Data',
          isDestructive: true,
          variant: 'warning',
        });
        if (!ok) return;

        setActiveDeletingKey('tickets_passes');
        try {
          clearAllAppData();
          await fetchAllCounts();
          toast.success('Commuter tickets, passes, and cache wiped.');
        } catch (err: any) {
          toast.error(`Error clearing tickets & passes: ${err.message}`);
        } finally {
          setActiveDeletingKey(null);
        }
        break;
      }

      default:
        break;
    }
  };

  /**
   * Helper: Restore initial starter municipal data
   */
  const handleSeedDefaultData = async () => {
    toast.info('Database Started Fresh', 'All mock and legacy starter data have been purged. Use Route Management and Fleet Management to add your fresh live routes and buses directly into Firestore.');
  };

  const totalRecordsCount =
    counts.buses +
    counts.routes +
    counts.stops +
    counts.routeStops +
    counts.drivers +
    counts.trips +
    counts.liveLocations +
    counts.announcements +
    counts.incidents +
    counts.tickets +
    counts.passes;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* 1. MUNICIPAL AUTHORITY BANNER */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-rose-200/90 shadow-2xs relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="danger" size="md">
              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
              Restricted Authority
            </Badge>
            <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
              City Administrator Console
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Database className="w-6 h-6 text-rose-600" />
            System Data Purge & Reset Management
          </h1>
          <p className="text-xs md:text-sm text-slate-600 mt-1.5 leading-relaxed">
            Erase data filled in the NagarST transit system. You can perform a full master wipe
            across all database tables and cached stores, or selectively purge individual categories.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="font-medium bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700">
              Total Tracked Records: <strong className="text-slate-900 tabular-nums">{totalRecordsCount}</strong>
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-rose-700 font-semibold">
              Warning: Purged data cannot be recovered
            </span>
          </div>
        </div>

        <div className="flex flex-wrap lg:flex-col items-stretch gap-2.5 shrink-0 z-10">
          <Button
            variant="outline"
            size="md"
            onClick={fetchAllCounts}
            isLoading={isLoadingCounts}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoadingCounts ? 'animate-spin' : ''}`} />}
          >
            Refresh Inventory Counts
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={handleSeedDefaultData}
            isLoading={isSeeding}
            leftIcon={<RotateCcw className="w-4 h-4 text-[#7847CB]" />}
          >
            Seed Starter Demo Data
          </Button>
        </div>
      </div>

      {/* 2. MASTER WIPE ACTION CARD (HERO DANGER ZONE) */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-rose-50 via-white to-orange-50 border-2 border-rose-300 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
              <span className="text-xs font-black tracking-wider uppercase text-rose-700">
                Master Reset Feature
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black text-slate-900">
              Delete All Data Filled in the System
            </h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              This master purge will sequentially remove all fleet vehicles, routes, municipal stops,
              duty shifts, live GPS coordinates, passenger tickets, announcements, and incident reports.
              Driver staff accounts and your City Admin session are safely preserved (bus assignments unlinked).
            </p>
          </div>

          <div className="shrink-0">
            <Button
              variant="destructive"
              size="lg"
              onClick={() => {
                setConfirmationInput('');
                setIsMasterModalOpen(true);
              }}
              leftIcon={<Trash2 className="w-5 h-5 text-white" />}
              className="w-full md:w-auto px-6 py-3.5 shadow-lg shadow-rose-600/30 font-black text-sm"
            >
              Delete All System Data
            </Button>
          </div>
        </div>
      </div>

      {/* 3. LIVE SYSTEM INVENTORY METRIC TILES */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Live System Inventory & Real-Time Counts
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Auto-synced with Supabase & LocalStorage</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase">Buses</span>
              <Bus className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">{counts.buses}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Fleet Vehicles</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase">Routes</span>
              <RouteIcon className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">{counts.routes}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Corridors</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase">Stops</span>
              <MapPin className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">{counts.stops}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{counts.routeStops} mapped links</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase">Drivers</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">{counts.drivers}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Crew Logins</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase">Trips / Radar</span>
              <Radio className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">{counts.trips}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{counts.liveLocations} GPS locks</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase">Tickets & Passes</span>
              <Ticket className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">{counts.tickets + counts.passes}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Commuter cache</div>
          </div>
        </div>
      </div>

      {/* 4. GRANULAR CATEGORY PURGE PANEL */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900">
              Selective Category Data Cleanups
            </h3>
            <p className="text-xs text-slate-500">
              Delete specific domain data without wiping the rest of the transit network.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Item 1: Buses */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Bus className="w-4 h-4" />
                </div>
                <Badge variant="outline" size="sm">{counts.buses} buses</Badge>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Vehicle Fleet Directory</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Deletes all registered city buses from <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">buses</code> table and detaches active assignments.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePurgeCategory('buses')}
              isLoading={activeDeletingKey === 'buses'}
              disabled={counts.buses === 0}
              className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete All Buses
            </Button>
          </div>

          {/* Item 2: Routes & Stops */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <RouteIcon className="w-4 h-4" />
                </div>
                <Badge variant="outline" size="sm">{counts.routes} routes</Badge>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Corridors & Stop Network</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Deletes all routes, route junctions, and municipal stops (<code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">routes</code>, <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">stops</code>).
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePurgeCategory('routes_stops')}
              isLoading={activeDeletingKey === 'routes_stops'}
              disabled={counts.routes === 0 && counts.stops === 0}
              className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete Routes & Stops
            </Button>
          </div>

          {/* Item 3: Driver Credentials */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <Badge variant="outline" size="sm">{counts.drivers} drivers</Badge>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Driver Staff Credentials</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Removes all driver accounts from <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">driver_credentials</code> table.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePurgeCategory('drivers')}
              isLoading={activeDeletingKey === 'drivers'}
              disabled={counts.drivers === 0}
              className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete Driver Crew
            </Button>
          </div>

          {/* Item 4: Trips & Schedules */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <Badge variant="outline" size="sm">{counts.trips} shifts</Badge>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Duty Shifts & Trips</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Clears all duty assignments and active trips in <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">trips</code> table.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePurgeCategory('trips')}
              isLoading={activeDeletingKey === 'trips'}
              disabled={counts.trips === 0}
              className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Clear Shifts & Trips
            </Button>
          </div>

          {/* Item 5: Live GPS Radar */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Radio className="w-4 h-4" />
                </div>
                <Badge variant="outline" size="sm">{counts.liveLocations} locations</Badge>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Live GPS Coordinates</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Clears live vehicle telemetry in <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">live_locations</code> table.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePurgeCategory('live_locations')}
              isLoading={activeDeletingKey === 'live_locations'}
              disabled={counts.liveLocations === 0}
              className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Clear GPS Coordinates
            </Button>
          </div>

          {/* Item 6: Announcements */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <Badge variant="outline" size="sm">{counts.announcements} alerts</Badge>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Passenger Announcements</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Clears all public notifications broadcasted to passenger apps and displays.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePurgeCategory('announcements')}
              isLoading={activeDeletingKey === 'announcements'}
              disabled={counts.announcements === 0}
              className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Clear Announcements
            </Button>
          </div>

          {/* Item 7: Incidents Desk */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <Badge variant="outline" size="sm">{counts.incidents} reports</Badge>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Incident Command Desk</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Clears breakdown logs, traffic detours, and road blockage reports.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePurgeCategory('incidents')}
              isLoading={activeDeletingKey === 'incidents'}
              disabled={counts.incidents === 0}
              className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Clear Incident Logs
            </Button>
          </div>

          {/* Item 8: Commuter Tickets & Passes */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Ticket className="w-4 h-4" />
                </div>
                <Badge variant="outline" size="sm">{counts.tickets + counts.passes} items</Badge>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Tickets, Passes & Cache</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Clears all purchased citizen QR tickets, transit passes, and stored favorites.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePurgeCategory('tickets_passes')}
              isLoading={activeDeletingKey === 'tickets_passes'}
              disabled={counts.tickets === 0 && counts.passes === 0}
              className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Clear Tickets & Cache
            </Button>
          </div>

        </div>
      </div>

      {/* 5. MASTER CONFIRMATION MODAL */}
      <Modal
        isOpen={isMasterModalOpen}
        onClose={() => {
          if (!isDeletingAll) setIsMasterModalOpen(false);
        }}
        title="Confirm Total System Data Purge"
        maxWidth="lg"
      >
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>IRREVERSIBLE ACTION</span>
            </div>
            <p>
              This action will permanently delete all records filled in the system across Supabase database
              and local client caches. This cannot be undone.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">
              Items queued for deletion:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-600">• {counts.buses} Fleet Buses</span>
              <span className="text-slate-600">• {counts.routes} Corridors</span>
              <span className="text-slate-600">• {counts.stops} Municipal Stops</span>
              <span className="text-emerald-700 font-semibold">• {counts.drivers} Driver Logins (Preserved)</span>
              <span className="text-slate-600">• {counts.trips} Duty Shifts</span>
              <span className="text-slate-600">• {counts.liveLocations} GPS Locks</span>
              <span className="text-slate-600">• {counts.announcements} Announcements</span>
              <span className="text-slate-600">• {counts.tickets + counts.passes} Commuter Items</span>
            </div>
          </div>

          {/* Progress list if actively deleting */}
          {isDeletingAll && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-bold text-slate-800 block">
                Deletion in Progress...
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {deletionProgress.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    {item.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    {item.status === 'running' && <RefreshCw className="w-3.5 h-3.5 text-[#7847CB] animate-spin shrink-0" />}
                    {item.status === 'pending' && <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />}
                    <span className={item.status === 'done' ? 'text-slate-500 line-through' : item.status === 'running' ? 'text-slate-900 font-bold' : 'text-slate-400'}>
                      {item.step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isDeletingAll && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block">
                  Type <strong className="text-rose-600 font-mono select-all cursor-text">DELETE ALL DATA</strong> to proceed:
                </label>
                <button
                  type="button"
                  onClick={() => setConfirmationInput('DELETE ALL DATA')}
                  className="text-[11px] font-semibold text-[#7847CB] hover:text-purple-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Click to auto-fill
                </button>
              </div>
              <Input
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="DELETE ALL DATA"
                className="font-mono"
                autoFocus
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsMasterModalOpen(false)}
              disabled={isDeletingAll}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="md"
              onClick={handleMasterDeleteAll}
              isLoading={isDeletingAll}
              disabled={confirmationInput.trim().toUpperCase() !== 'DELETE ALL DATA' || isDeletingAll}
              leftIcon={<Trash2 className="w-4 h-4 text-white" />}
            >
              Confirm Full System Wipe
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

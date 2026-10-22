import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { useToast, usePrompt } from '../../../context/FeedbackContext';
import { type Bus as BusType } from '../../../types';
import { LiveMap } from '../../../components/map/LiveMap';
import {
  Bus,
  MapPin,
  Clock,
  X,
  Gauge,
  Users,
  Radio,
  Send,
  Sparkles,
  Play
} from 'lucide-react';
import { io } from 'socket.io-client';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { DemoSimulatorPanel } from '../../../components/admin/DemoSimulatorPanel';
import {
  getDemoSimulatorState,
  subscribeToDemoState,
  buildBusTelemetry,
  isSameBusKey,
  type DemoSimulatorState
} from '../../../utils/demoSimulatorEngine';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://nagarst.onrender.com';

export const AdminLiveFleet: React.FC = () => {
  const { buses, stops, routes } = useApp();
  const toast = useToast();
  const prompt = usePrompt();
  const [selectedBus, setSelectedBus] = useState<BusType | null>(buses.length > 0 ? buses[0] : null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);

  // Subscribe to live simulation telemetry
  const [simState, setSimState] = useState<DemoSimulatorState>(getDemoSimulatorState);
  const [activeLiveBuses, setActiveLiveBuses] = useState<Record<string, BusType>>({});

  useEffect(() => {
    const unsub = subscribeToDemoState((newState) => {
      setSimState(newState);
    });
    return () => unsub();
  }, []);

  // Listen to BroadcastChannel & Socket.IO so fleet tracking reflects real-time moving buses concurrently
  useEffect(() => {
    let ch: BroadcastChannel | null = null;
    let socket: any = null;

    try {
      ch = new BroadcastChannel('nagarst_bus_telemetry');
      ch.onmessage = (event) => {
        const payload = event.data;
        if ((payload?.type === 'locationUpdate' || payload?.type === 'driver_location_update') && (payload?.data || payload?.bus)) {
          const incoming = (payload.data || payload.bus) as BusType;
          if (incoming && incoming.id) {
            setActiveLiveBuses((prev) => ({
              ...prev,
              [incoming.id]: incoming
            }));
          }
        } else if (payload?.type === 'busOffline' && payload?.busId) {
          const offId = payload.busId;
          setActiveLiveBuses((prev) => {
            const next = { ...prev };
            delete next[offId];
            return next;
          });
        }
      };
    } catch (_) {}

    try {
      socket = io(SOCKET_URL, { reconnection: true, transports: ['websocket', 'polling'] });
      socket.on('demoLocationUpdate', (bus: BusType) => {
        if (bus && bus.id) {
          setActiveLiveBuses((prev) => ({ ...prev, [bus.id]: bus }));
        }
      });
      socket.on('locationUpdate', (bus: BusType) => {
        if (bus && bus.id) {
          setActiveLiveBuses((prev) => ({ ...prev, [bus.id]: bus }));
        }
      });
      socket.on('busOffline', (busId: string) => {
        if (busId) {
          setActiveLiveBuses((prev) => {
            const next = { ...prev };
            delete next[busId];
            return next;
          });
        }
      });
    } catch (_) {}

    return () => {
      ch?.close();
      if (socket) socket.disconnect();
    };
  }, []);

  const norm = (s?: string) => (s || '').trim().toUpperCase().replace(/[\s-_]/g, '');

  const matchesBus = (a: { id?: string; busNumber?: string; plateNumber?: string }, b: { id?: string; busNumber?: string; plateNumber?: string }) => {
    if (!a || !b) return false;
    if (isSameBusKey(a.id, b.id)) return true;
    if (isSameBusKey(a.busNumber, b.busNumber)) return true;
    if (isSameBusKey(a.plateNumber, b.plateNumber)) return true;
    if (isSameBusKey(a.id, b.busNumber) || isSameBusKey(a.id, b.plateNumber)) return true;
    if (isSameBusKey(b.id, a.busNumber) || isSameBusKey(b.id, a.plateNumber)) return true;
    return false;
  };

  // Combined fleet strictly containing registered vehicles + active moving simulator coordinates
  const displayBuses = React.useMemo(() => {
    const byNumber = new Map<string, BusType>();

    // 1. Configured fleet buses from DB / AppContext
    buses.forEach((b) => {
      const simRuntime = Object.values(simState?.buses || {}).find((r) =>
        matchesBus(b, { id: r.id, busNumber: r.def.busNumber, plateNumber: r.def.plateNumber })
      );

      const live = Object.values(activeLiveBuses).find((lb) => matchesBus(b, lb));

      const isSimRunning = Boolean(simRuntime?.isRunning);
      const simTelemetry = isSimRunning ? (simRuntime?.currentBus || buildBusTelemetry(simRuntime!)) : null;
      const activeTelemetry = live || simTelemetry;

      const merged: BusType = {
        ...b,
        ...(activeTelemetry || {}),
        id: b.id,
        busNumber: b.busNumber,
        plateNumber: b.plateNumber,
        isDemo: isSimRunning ? true : Boolean(activeTelemetry?.isDemo || b.isDemo),
        lat: Number(activeTelemetry?.lat ?? b.lat),
        lng: Number(activeTelemetry?.lng ?? b.lng),
        speedKmh: activeTelemetry ? (activeTelemetry.speedKmh ?? 0) : b.speedKmh,
        heading: activeTelemetry ? (activeTelemetry.heading ?? 0) : b.heading,
        status: activeTelemetry?.status || b.status || 'on_time'
      };

      const key = norm(b.busNumber) || norm(b.id);
      byNumber.set(key, merged);
    });

    return Array.from(byNumber.values());
  }, [buses, simState, activeLiveBuses]);

  const allRoutes = routes;
  const liveCount = displayBuses.filter(b => !b.isDemo && !b.id?.startsWith('demo-')).length;
  const demoCount = displayBuses.filter(b => b.isDemo || b.id?.startsWith('demo-')).length;

  const handleSendDispatch = async () => {
    if (!selectedBus) return;

    const message = await prompt({
      title: `Dispatch Radio: Bus ${selectedBus.busNumber}`,
      message: `Enter an urgent dispatch instruction or detour notice to broadcast directly to Driver ${selectedBus.driverName || ''}:`,
      placeholder: 'e.g. Divert via bypass due to heavy procession at Maliwada Chowk',
      confirmText: 'Broadcast Message',
      inputType: 'textarea',
      required: true,
    });

    if (message) {
      const socket = io(SOCKET_URL);
      socket.emit('sendDispatchMessage', {
        busId: selectedBus.id,
        message: message,
      });
      toast.success(
        `Dispatch broadcast transmitted to Bus ${selectedBus.busNumber} in-cab display.`,
        'Broadcast Dispatched'
      );
    }
  };

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden flex flex-col md:p-6 md:space-y-4 md:max-w-7xl md:mx-auto">
      
      {/* 1. EDGE-TO-EDGE FULL SCREEN MAP (Mobile: 100% full screen background, Desktop: sleek dashboard card) */}
      <div className="absolute inset-0 md:relative md:inset-auto md:flex-1 w-full h-full md:rounded-3xl md:border md:border-slate-200/90 md:shadow-xs overflow-hidden z-0">
        <LiveMap
          buses={displayBuses}
          stops={stops}
          routes={allRoutes}
          selectedBusId={selectedBus?.id || null}
          selectedRouteId={selectedBus?.routeId || null}
          onSelectBus={(bus) => setSelectedBus(bus)}
          showUserLocation={true}
          height="100%"
          className="w-full h-full rounded-none md:rounded-3xl border-0 md:border md:border-slate-200/90"
        />
      </div>

      {/* 2. FLOATING TELEMETRY HEADER OVERLAY (Mobile: Floating glass bar, Desktop: Top dashboard card) */}
      <div className="absolute top-3 left-3 right-3 md:static z-20 bg-white/95 backdrop-blur-md p-3 md:p-4 rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-lg md:shadow-2xs flex flex-wrap items-center justify-between gap-2.5 shrink-0 pointer-events-auto">
        <div className="flex items-center gap-2.5 text-xs font-semibold">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#7847CB] flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <span className="text-slate-900 font-bold block text-xs md:text-sm leading-tight">Live Urban Fleet Radar</span>
            <span className="text-[11px] text-slate-500 font-normal">
              {buses.length} active vehicle{buses.length === 1 ? '' : 's'} ({liveCount} Live GPS Drivers, {demoCount} Demo Buses)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 md:gap-4 text-[11px] md:text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-700">On Time</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-700">Delay</span>
          </div>

          <button
            type="button"
            onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7847CB] hover:bg-purple-800 text-white font-black text-xs shadow-sm transition-all active:scale-95 ml-1"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>GPS Simulator</span>
          </button>
        </div>
      </div>

      {/* FLOATING DEMO SIMULATOR MODAL / DRAWER */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsSimulatorOpen(false)}
              className="absolute top-3 right-3 z-30 p-2 rounded-full bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-md border border-slate-200 transition-all"
              title="Close Simulator"
            >
              <X className="w-4 h-4" />
            </button>
            <DemoSimulatorPanel onSelectBusOnMap={(id) => {
              const b = buses.find(x => x.id === id);
              if (b) setSelectedBus(b);
            }} />
          </div>
        </div>
      )}

      {/* 3. FLOATING BUS INFO DRAWER (Mobile: Bottom Drawer with handle, Desktop: Top-Right Floating Card) */}
      {selectedBus && (
        <div className="fixed bottom-3 left-3 right-3 md:fixed-none md:absolute md:top-4 md:right-4 z-[450] md:w-[350px] max-h-[75vh] md:max-h-[calc(100%-2rem)] bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl p-4 md:p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`px-2.5 py-1.5 min-w-[42px] rounded-xl flex items-center justify-center font-black text-xs shadow-xs shrink-0 whitespace-nowrap ${
                    selectedBus.isDemo || selectedBus.id?.startsWith('demo-')
                      ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                      : 'bg-[#7847CB] text-white shadow-[#7847CB]/30'
                  }`}>
                    {selectedBus.busNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        Bus {selectedBus.busNumber}
                      </h3>
                      {Boolean(selectedBus.isDemo || selectedBus.id?.startsWith('demo-')) ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                          DEMO
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          LIVE
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">{selectedBus.plateNumber}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBus(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  aria-label="Close bus details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1">
                  <span className="text-[10px] font-bold text-[#7847CB] uppercase tracking-wider block">
                    Assigned Corridor
                  </span>
                  <span className="font-bold text-slate-900 block text-xs">
                    {selectedBus.routeNumber ? `Route ${selectedBus.routeNumber}` : 'City Transit Route'}
                  </span>
                  <span className="text-slate-600 font-medium block">
                    {selectedBus.routeName || 'Municipal Urban Corridor'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Driver</span>
                    <span className="font-bold text-slate-900 truncate block">{selectedBus.driverName || 'Depot Driver'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Conductor</span>
                    <span className="font-bold text-slate-900 truncate block">{selectedBus.conductorName || 'Depot Staff'}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1 font-medium">
                      <Gauge className="w-3.5 h-3.5 text-slate-400" /> Current Speed:
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedBus.speedKmh != null ? `${selectedBus.speedKmh} km/h` : '0 km/h'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Approaching:
                    </span>
                    <span className="font-bold text-slate-900 truncate max-w-[150px]">
                      {selectedBus.nextStopName || 'En route'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Stop ETA:
                    </span>
                    <span className="font-bold text-[#7847CB]">
                      {selectedBus.etaToNextMinutes != null && !isNaN(Number(selectedBus.etaToNextMinutes))
                        ? `${selectedBus.etaToNextMinutes} mins`
                        : 'Approaching'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5 text-slate-400" /> Passenger Load:
                    </span>
                    <Badge
                      variant={selectedBus.occupancy === 'high' ? 'danger' : selectedBus.occupancy === 'moderate' ? 'warning' : 'success'}
                      size="sm"
                      className="capitalize"
                    >
                      {selectedBus.occupancy || 'Low'}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500 font-medium">Status:</span>
                    <Badge
                      variant={
                        selectedBus.status === 'on_time'
                          ? 'success'
                          : selectedBus.status === 'delayed'
                          ? 'warning'
                          : 'brand'
                      }
                      size="sm"
                    >
                      {(selectedBus.status || 'Active').replace(/[-_]/g, ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSendDispatch}
              size="md"
              className="w-full mt-4"
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send Dispatch Message
            </Button>
          </div>
        )}
    </div>
  );
};

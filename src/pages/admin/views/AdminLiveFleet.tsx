import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { io } from 'socket.io-client';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://nagarst.onrender.com';

export const AdminLiveFleet: React.FC = () => {
  const { buses, stops, routes } = useApp();
  const toast = useToast();
  const prompt = usePrompt();
  const [selectedBus, setSelectedBus] = useState<BusType | null>(buses.length > 0 ? buses[0] : null);

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
    <div className="p-4 md:p-6 space-y-4 w-full max-w-7xl mx-auto flex-1 flex flex-col min-h-[calc(100dvh-85px)]">
      
      {/* Top Telemetry Header */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2.5 text-xs font-semibold">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#7847CB] flex items-center justify-center">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <span className="text-slate-900 font-bold block text-sm">Live Urban Fleet Radar</span>
            <span className="text-[11px] text-slate-500 font-normal">
              {buses.length} active GPS transponder{buses.length === 1 ? '' : 's'} broadcasting in Ahilyanagar
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-700">On Time</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-700">Minor Delay</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-700">Off Route</span>
          </div>
        </div>
      </div>

      {/* Map & Floating Telemetry Overlay Container */}
      <div className="flex-1 w-full min-h-[520px] rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs relative">
        <LiveMap
          buses={buses}
          stops={stops}
          routes={routes}
          selectedBusId={selectedBus?.id || null}
          selectedRouteId={selectedBus?.routeId || null}
          onSelectBus={(bus) => setSelectedBus(bus)}
          showUserLocation={false}
          height="100%"
        />

        {/* Floating Bus Info Card */}
        {selectedBus && (
          <div className="absolute top-4 right-4 z-[450] w-[350px] max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="px-2.5 py-1.5 min-w-[42px] rounded-xl bg-[#7847CB] text-white flex items-center justify-center font-black text-xs shadow-xs shadow-[#7847CB]/30 shrink-0 whitespace-nowrap">
                    {selectedBus.busNumber}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      Bus {selectedBus.busNumber}
                    </h3>
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

    </div>
  );
};

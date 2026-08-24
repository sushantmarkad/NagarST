import React from 'react';
import type { RouteStop, Bus } from '../../types';
import { MapPin, Bus as BusIcon, Clock } from 'lucide-react';
import { formatCurrency, formatDuration } from '../../utils/formatters';
import { useLanguage } from '../../context/LanguageContext';

interface RouteTimelineProps {
  stops: RouteStop[];
  activeBuses?: Bus[];
  onStopClick?: (stopId: string) => void;
}

export const RouteTimeline: React.FC<RouteTimelineProps> = ({ stops, activeBuses = [], onStopClick }) => {
  const { language } = useLanguage();

  return (
    <div className="relative pl-6 pr-2 py-4 space-y-6">
      {/* Vertical Connecting Line */}
      <div className="absolute left-[15px] top-6 bottom-6 w-1 bg-[#0f3c5c]/20 rounded-full" />

      {stops.map((stop, index) => {
        const isFirst = index === 0;
        const isLast = index === stops.length - 1;
        const busesAtStop = activeBuses.filter((b) => b.currentStopId === stop.stopId);

        return (
          <div
            key={stop.stopId}
            onClick={() => onStopClick?.(stop.stopId)}
            className="relative flex items-start gap-4 group cursor-pointer"
          >
            {/* Timeline Dot */}
            <div
              className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-white transition-all -ml-[23px] ${
                isFirst || isLast
                  ? 'border-[#0f3c5c] bg-[#0f3c5c] text-white shadow-xs'
                  : stop.isMajorHub
                  ? 'border-[#0f3c5c] text-[#0f3c5c]'
                  : 'border-slate-300 text-slate-400 group-hover:border-slate-500'
              }`}
            >
              {isFirst || isLast ? (
                <MapPin className="w-3.5 h-3.5" />
              ) : (
                <div className={`w-2 h-2 rounded-full ${stop.isMajorHub ? 'bg-[#0f3c5c]' : 'bg-slate-400'}`} />
              )}
            </div>

            {/* Content Details */}
            <div className="flex-1 bg-white p-3.5 rounded-xl border border-slate-200 group-hover:border-slate-300 transition-all shadow-2xs">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="font-bold text-slate-900 text-sm">
                      {language === 'mr' ? stop.stopNameMarathi : stop.stopName}
                    </h5>
                    {stop.isMajorHub && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                        Hub
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {formatDuration(stop.estimatedMinutesFromOrigin)} from origin
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-bold text-slate-900 text-xs">
                    {stop.fareFromOrigin === 0 ? 'Start' : formatCurrency(stop.fareFromOrigin)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">Stage Fare</span>
                </div>
              </div>

              {/* Active Buses Live at this stop */}
              {busesAtStop.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-[#0f3c5c] bg-blue-50/70 p-2 rounded-lg border border-blue-100">
                  <BusIcon className="w-4 h-4 text-[#0f3c5c] animate-bounce" />
                  <span>
                    Bus {busesAtStop.map((b) => b.busNumber).join(', ')} currently at stop ({busesAtStop[0].status})
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

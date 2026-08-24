import React from 'react';
import type { BusStop } from '../../types';
import { MapPin, Accessibility } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { ETAIndicator } from '../common/ETAIndicator';

interface BusStopCardProps {
  stop: BusStop;
  onSelect?: (stop: BusStop) => void;
  isSelected?: boolean;
}

export const BusStopCard: React.FC<BusStopCardProps> = ({ stop, onSelect, isSelected }) => {
  const { language } = useLanguage();
  const nextArrival = stop.liveArrivals[0];

  return (
    <div
      onClick={() => onSelect?.(stop)}
      className={`p-4 rounded-xl border bg-white transition-all cursor-pointer ${
        isSelected
          ? 'border-[#0f3c5c] ring-2 ring-[#0f3c5c]/10 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-2xs'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">
              {language === 'mr' ? stop.nameMarathi : stop.name}
            </h4>
            <p className="text-xs text-slate-500 font-medium">{stop.area}</p>
          </div>
        </div>

        {nextArrival && (
          <ETAIndicator minutes={nextArrival.etaMinutes} label={nextArrival.busNumber} size="sm" />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {stop.lines.map((line) => (
          <span
            key={line}
            className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
          >
            {line}
          </span>
        ))}
        {stop.accessibility && (
          <span
            title="Wheelchair Accessible"
            className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1"
          >
            <Accessibility className="w-3 h-3" />
          </span>
        )}
      </div>

      {stop.liveArrivals.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            {language === 'mr' ? 'येणाऱ्या पुढील बसेस' : 'Next Arrivals'}
          </span>
          <div className="space-y-1">
            {stop.liveArrivals.slice(0, 2).map((arr, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-700">
                  <strong className="text-slate-900">{arr.busNumber}</strong> → {arr.destination}
                </span>
                <span className="text-slate-900 font-bold">{arr.etaMinutes} min</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import type { Bus } from '../../types';
import { OccupancyBadge, BusStatusBadge } from '../common/StatusBadge';
import { ETAIndicator } from '../common/ETAIndicator';
import { Bus as BusIcon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface BusCardProps {
  bus: Bus;
  onSelect?: (bus: Bus) => void;
  isSelected?: boolean;
}

export const BusCard: React.FC<BusCardProps> = ({ bus, onSelect, isSelected }) => {
  const { language } = useLanguage();

  return (
    <div
      onClick={() => onSelect?.(bus)}
      className={`p-4 rounded-xl border bg-white transition-all cursor-pointer ${
        isSelected
          ? 'border-[#0f3c5c] ring-2 ring-[#0f3c5c]/10 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-2xs'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#0f3c5c]/10 border border-[#0f3c5c]/20 flex items-center justify-center text-[#0f3c5c]">
            <BusIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base">{bus.busNumber}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-600">
                {bus.plateNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{bus.routeName}</p>
          </div>
        </div>

        <ETAIndicator minutes={bus.etaToNextMinutes} label={language === 'mr' ? 'येत आहे' : 'Next stop'} size="sm" />
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">
            {language === 'mr' ? 'पुढील थांबा' : 'Next Stop'}
          </span>
          <span className="font-semibold text-slate-800 truncate block">{bus.nextStopName}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">
            {language === 'mr' ? 'वेग & स्थिती' : 'Speed & Status'}
          </span>
          <span className="font-semibold text-slate-800 flex items-center gap-1">
            {bus.speedKmh} km/h • <BusStatusBadge status={bus.status} delayMinutes={bus.delayMinutes} />
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <OccupancyBadge level={bus.occupancy} compact />
        <span className="text-[11px] text-slate-400 font-medium">
          {language === 'mr' ? `अपडेट: ${bus.lastUpdated}` : `Updated ${bus.lastUpdated}`}
        </span>
      </div>
    </div>
  );
};

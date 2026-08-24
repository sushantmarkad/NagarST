import React from 'react';
import type { Route } from '../../types';
import { formatCurrency, formatDuration } from '../../utils/formatters';
import { Clock, MapPin, ChevronRight, Bus as BusIcon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface RouteCardProps {
  route: Route;
  onSelect?: (route: Route) => void;
  onViewLive?: (route: Route) => void;
}

export const RouteCard: React.FC<RouteCardProps> = ({ route, onSelect, onViewLive }) => {
  const { language } = useLanguage();

  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs transition-all">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-1 text-xs font-bold text-white rounded-lg shadow-2xs"
              style={{ backgroundColor: route.color || '#0f3c5c' }}
            >
              {route.routeNumber}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {route.activeBusesCount} {language === 'mr' ? 'सक्रिय बसेस' : 'buses live'}
            </span>
          </div>
          <h4 className="font-bold text-slate-900 text-sm mt-2">
            {language === 'mr' ? route.nameMarathi : route.name}
          </h4>
        </div>
        <div className="text-right">
          <span className="font-bold text-slate-900 text-base">
            {formatCurrency(route.baseFare)} - {formatCurrency(route.maxFare)}
          </span>
          <span className="text-[10px] text-slate-400 block font-medium">
            {language === 'mr' ? 'प्रवास भाडे' : 'Fare Range'}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {route.totalStops} {language === 'mr' ? 'थांबे' : 'stops'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatDuration(route.durationMinutes)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BusIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {language === 'mr' ? `दर ${route.frequencyMinutes} मि.` : `Every ${route.frequencyMinutes}m`}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={() => onSelect?.(route)}
          className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-center"
        >
          {language === 'mr' ? 'थांब्याची यादी पहा' : 'View Stop List'}
        </button>
        <button
          onClick={() => onViewLive?.(route)}
          className="flex-1 py-2 text-xs font-semibold text-white bg-[#0f3c5c] hover:bg-[#0a2a42] rounded-lg transition-colors text-center flex items-center justify-center gap-1"
        >
          <span>{language === 'mr' ? 'लाइव्ह ट्रॅक करा' : 'Live Track'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

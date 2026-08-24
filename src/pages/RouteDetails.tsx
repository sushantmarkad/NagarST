import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { RouteTimeline } from '../components/timeline/RouteTimeline';
import { formatCurrency, formatDuration } from '../utils/formatters';
import { Bus as BusIcon, Ticket as TicketIcon } from 'lucide-react';

export const RouteDetails: React.FC = () => {
  const { language, t } = useLanguage();
  const { routes, buses } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialRouteId = searchParams.get('id') || 'route-12';
  const [selectedRouteId, setSelectedRouteId] = useState(initialRouteId);

  const currentRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const routeBuses = buses.filter((b) => b.routeId === currentRoute.id);

  return (
    <div className="space-y-6">
      {/* Route Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {routes.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRouteId(r.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
              r.id === currentRoute.id
                ? 'bg-[#0f3c5c] text-white border-[#0f3c5c] shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: r.color || '#0f3c5c' }}
            />
            <span>{r.routeNumber}</span>
          </button>
        ))}
      </div>

      {/* Main Route Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                className="px-3 py-1 rounded-lg text-white font-extrabold text-sm"
                style={{ backgroundColor: currentRoute.color }}
              >
                {currentRoute.routeNumber}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {currentRoute.activeBusesCount} Buses Active
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-2">
              {language === 'mr' ? currentRoute.nameMarathi : currentRoute.name}
            </h2>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium block">Fare Range</span>
            <span className="text-xl font-extrabold text-slate-900">
              {formatCurrency(currentRoute.baseFare)} - {formatCurrency(currentRoute.maxFare)}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Stops</span>
            <span className="font-bold text-slate-900 text-sm">{currentRoute.totalStops} stops</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Estimated Travel Time</span>
            <span className="font-bold text-slate-900 text-sm">{formatDuration(currentRoute.durationMinutes)}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Frequency</span>
            <span className="font-bold text-slate-900 text-sm">Every {currentRoute.frequencyMinutes} min</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Operating Hours</span>
            <span className="font-bold text-slate-900 text-sm">
              {currentRoute.firstBus} - {currentRoute.lastBus}
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={() => navigate(`/app/live?route=${currentRoute.id}`)}
            className="px-5 py-2.5 bg-[#0f3c5c] text-white font-bold text-xs rounded-xl hover:bg-[#0a2a42] transition-colors shadow-2xs flex items-center gap-2"
          >
            <BusIcon className="w-4 h-4" />
            <span>{t('Track Route Live on Map', 'नकाशावर थेट बसेस पहा')}</span>
          </button>
          <button
            onClick={() =>
              navigate(
                `/app/tickets?source=${encodeURIComponent(currentRoute.origin)}&dest=${encodeURIComponent(currentRoute.destination)}`
              )
            }
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <TicketIcon className="w-4 h-4" />
            <span>{t('Buy Ticket for Route', 'मार्ग तिकीट खरेदी करा')}</span>
          </button>
        </div>
      </div>

      {/* Interactive Vertical Timeline */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">
              {t('Complete Route Stop Sequence', 'संपूर्ण मार्ग थांबे क्रम')}
            </h3>
            <p className="text-xs text-slate-500">
              {t('Live bus positions marked along the timeline', 'वेळापत्रकावर थेट बसेसची स्थिती')}
            </p>
          </div>
          <span className="text-xs font-semibold text-[#0f3c5c]">
            {currentRoute.stops.length} Stops
          </span>
        </div>

        <RouteTimeline
          stops={currentRoute.stops}
          activeBuses={routeBuses}
          onStopClick={(stopId) => navigate(`/app/stops?id=${stopId}`)}
        />
      </div>
    </div>
  );
};

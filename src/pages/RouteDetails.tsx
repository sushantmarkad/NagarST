import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { RouteTimeline } from '../components/timeline/RouteTimeline';
import { formatCurrency, formatDuration } from '../utils/formatters';
import { Bus as BusIcon, Ticket as TicketIcon, Clock, Route as RouteIcon, MapPin } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const RouteDetails: React.FC = () => {
  const { language, t } = useLanguage();
  const { routes, buses } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialRouteId = searchParams.get('id') || (routes[0]?.id || 'route-12');
  const [selectedRouteId, setSelectedRouteId] = useState(initialRouteId);

  const currentRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const routeBuses = currentRoute ? buses.filter((b) => b.routeId === currentRoute.id) : [];

  if (!currentRoute) {
    return (
      <div className="p-8 text-center text-slate-500">
        {t('Loading routes...', 'मार्ग लोड होत आहेत...')}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      
      {/* 1. ROUTE SELECTOR TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {routes.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedRouteId(r.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
              r.id === currentRoute.id
                ? 'bg-[#7847CB] text-white border-[#7847CB] shadow-sm shadow-[#7847CB]/25'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: r.color || '#7847CB' }}
            />
            <span>Route {r.routeNumber}</span>
          </button>
        ))}
      </div>

      {/* 2. MAIN ROUTE OVERVIEW CARD */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className="px-3 py-1 rounded-xl text-white font-black text-sm shadow-xs"
                style={{ backgroundColor: currentRoute.color || '#7847CB' }}
              >
                {currentRoute.routeNumber}
              </span>
              <Badge variant="success" size="md" dot>
                {currentRoute.activeBusesCount || routeBuses.length} {t('Buses Live', 'बसेस कार्यरत')}
              </Badge>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-2 tracking-tight">
              {language === 'mr' ? currentRoute.nameMarathi : currentRoute.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentRoute.origin} ➔ {currentRoute.destination}
            </p>
          </div>

          <div className="sm:text-right">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
              {t('Ticket Fare', 'तिकीट दर')}
            </span>
            <span className="text-xl md:text-2xl font-black text-slate-900 tabular-nums">
              {formatCurrency(currentRoute.baseFare)} - {formatCurrency(currentRoute.maxFare)}
            </span>
          </div>
        </div>

        {/* Operational Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Total Stops</span>
            <span className="font-extrabold text-slate-900 text-sm md:text-base mt-0.5 block">{currentRoute.totalStops} stops</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Trip Time</span>
            <span className="font-extrabold text-slate-900 text-sm md:text-base mt-0.5 block">{formatDuration(currentRoute.durationMinutes)}</span>
          </div>
          <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100/70">
            <span className="text-[#7847CB] block text-[10px] uppercase font-bold tracking-wider">Frequency</span>
            <span className="font-extrabold text-[#7847CB] text-sm md:text-base mt-0.5 block">Every {currentRoute.frequencyMinutes}m</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Hours</span>
            <span className="font-extrabold text-slate-900 text-sm md:text-base mt-0.5 block">
              {currentRoute.firstBus} - {currentRoute.lastBus}
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <Button
            size="md"
            onClick={() => navigate(`/app/live?route=${currentRoute.id}`)}
            leftIcon={<BusIcon className="w-4 h-4" />}
          >
            {t('Track Route Live on Map', 'नकाशावर थेट बसेस पहा')}
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() =>
              navigate(
                `/app/tickets?source=${encodeURIComponent(currentRoute.origin)}&dest=${encodeURIComponent(currentRoute.destination)}`
              )
            }
            leftIcon={<TicketIcon className="w-4 h-4 text-[#7847CB]" />}
          >
            {t('Buy Ticket for Route', 'मार्ग तिकीट खरेदी करा')}
          </Button>
        </div>
      </div>

      {/* 3. STOP SEQUENCE TIMELINE */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">
              {t('Complete Route Stop Sequence', 'संपूर्ण मार्ग थांबे क्रम')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('Live bus positions marked along the Ahilyanagar transit corridor', 'वेळापत्रकावर थेट बसेसची स्थिती')}
            </p>
          </div>
          <Badge variant="brand" size="md">
            {currentRoute.stops.length} Stops
          </Badge>
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

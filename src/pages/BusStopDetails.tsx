import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { BusStopCard } from '../components/cards/BusStopCard';
import { ETAIndicator } from '../components/common/ETAIndicator';
import { OccupancyBadge, BusStatusBadge } from '../components/common/StatusBadge';
import { MapPin, Search } from 'lucide-react';

export const BusStopDetails: React.FC = () => {
  const { language, t } = useLanguage();
  const { stops } = useApp();
  const [searchParams] = useSearchParams();

  const initialStopId = searchParams.get('id') || 'stop-cbs';
  const [selectedStopId, setSelectedStopId] = useState(initialStopId);
  const [searchQuery, setSearchQuery] = useState('');

  const currentStop = stops.find((s) => s.id === selectedStopId) || stops[0];

  const filteredStops = stops.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nameMarathi.includes(searchQuery) ||
      s.area.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search Stop Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-rose-500" />
          <h2 className="font-extrabold text-slate-900 text-lg">
            {t('Ahilyanagar Bus Stops', 'अहिल्यानगर बस थांबे')}
          </h2>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('Search bus stop name or area...', 'थांब्याचे नाव किंवा परिसर शोधा...')}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0f3c5c]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stop Selector List */}
        <div className="space-y-3 lg:col-span-1 max-h-[600px] overflow-y-auto pr-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t('All Bus Stops', 'सर्व थांबे')} ({filteredStops.length})
          </h3>
          {filteredStops.map((stop) => (
            <BusStopCard
              key={stop.id}
              stop={stop}
              isSelected={stop.id === currentStop.id}
              onSelect={(s) => setSelectedStopId(s.id)}
            />
          ))}
        </div>

        {/* Selected Stop Details Main View */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header Banner */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                  {currentStop.area}
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                  {language === 'mr' ? currentStop.nameMarathi : currentStop.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {language === 'mr' ? currentStop.name : currentStop.nameMarathi}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-[#0f3c5c] block">
                  {currentStop.lines.length} Routes Served
                </span>
                <div className="flex items-center gap-1 mt-1 justify-end">
                  {currentStop.lines.map((l) => (
                    <span key={l} className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Facilities Badges */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="text-slate-400 font-semibold uppercase text-[10px] mr-1">
                Facilities:
              </span>
              {currentStop.facilities.map((fac) => (
                <span key={fac} className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                  ✓ {fac}
                </span>
              ))}
            </div>
          </div>

          {/* Live Arrival Countdown Board */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">
                  {t('Live Arrival Board', 'थेट आगमन वेळापत्रक')}
                </h4>
                <p className="text-xs text-slate-500">
                  {t('Upcoming buses reaching this stop', 'या थांब्यावर येणाऱ्या पुढील बसेस')}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Feed
              </span>
            </div>

            <div className="space-y-3">
              {currentStop.liveArrivals.map((arr, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between flex-wrap gap-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0f3c5c] text-white font-extrabold text-sm flex items-center justify-center shadow-2xs">
                      {arr.busNumber}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        → {arr.destination}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{arr.busType}</span>
                        <span>•</span>
                        <BusStatusBadge status={arr.status} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <OccupancyBadge level={arr.occupancy} compact />
                    <ETAIndicator minutes={arr.etaMinutes} size="md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

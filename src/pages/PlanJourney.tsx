import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { LocationSelector } from '../components/common/LocationSelector';
import { OccupancyBadge } from '../components/common/StatusBadge';
import { formatCurrency, formatDuration } from '../utils/formatters';
import type { JourneyOption } from '../types';
import {
  Compass,
  ArrowRightLeft,
  Clock,
  Navigation,
  ChevronDown,
  ChevronUp,
  Ticket as TicketIcon,
  ArrowRight,
  Bus as BusIcon,
  Sparkles
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const PlanJourney: React.FC = () => {
  const { language, t } = useLanguage();
  const { routes, buses, stops } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [fromLocation, setFromLocation] = useState(
    searchParams.get('from') || (language === 'mr' ? 'मध्यवर्ती बस स्थानक (CBS)' : 'Central Bus Stand (CBS)')
  );
  const [toLocation, setToLocation] = useState(
    searchParams.get('to') || (language === 'mr' ? 'सावेडी बस टर्मिनस' : 'Savedi Bus Terminal')
  );
  const [journeyDate, setJourneyDate] = useState('2026-10-02');
  const [journeyTime, setJourneyTime] = useState('14:30');
  const [sortBy, setSortBy] = useState<'fastest' | 'cheapest' | 'fewer_transfers'>('fastest');
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>(null);

  const handleSwap = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  const journeyOptions: JourneyOption[] = React.useMemo(() => {
    if (!routes || routes.length === 0) return [];

    const normalizedFrom = fromLocation.toLowerCase();
    const normalizedTo = toLocation.toLowerCase();

    // Find routes where origin/dest or intermediate stops match
    const matching = routes.filter((r) => {
      const matchOrigin = r.origin?.toLowerCase().includes(normalizedFrom) || 
        normalizedFrom.includes(r.origin?.toLowerCase()) ||
        r.stops?.some(s => s.stopName?.toLowerCase().includes(normalizedFrom));

      const matchDest = r.destination?.toLowerCase().includes(normalizedTo) || 
        normalizedTo.includes(r.destination?.toLowerCase()) ||
        r.stops?.some(s => s.stopName?.toLowerCase().includes(normalizedTo));

      return matchOrigin && matchDest;
    });

    const activeList = matching.length > 0 ? matching : routes;

    return activeList.map((route, idx) => {
      const assignedBus = buses.find((b: any) => b.routeId === route.id);
      const busNum = assignedBus?.busNumber || `MSRTC-R${route.routeNumber || idx + 1}`;
      const duration = route.durationMinutes || 25 + idx * 4;
      const fare = route.baseFare || 15;

      const departHour = parseInt(journeyTime.split(':')[0] || '14', 10);
      const departMin = parseInt(journeyTime.split(':')[1] || '30', 10);
      const totalArrivalMin = departHour * 60 + departMin + duration;
      const arrivalHour = Math.floor(totalArrivalMin / 60) % 24;
      const arrivalMin = totalArrivalMin % 60;
      const arrivalTimeStr = `${String(arrivalHour).padStart(2, '0')}:${String(arrivalMin).padStart(2, '0')}`;

      return {
        id: `journey-${route.id}-${idx}`,
        busNumber: busNum,
        routeId: route.id,
        routeName: `${route.origin} ➔ ${route.destination}`,
        departureTime: journeyTime,
        arrivalTime: arrivalTimeStr,
        durationMinutes: duration,
        fare: fare,
        walkingDistanceMeters: 150 + idx * 50,
        totalStops: route.stops?.length || route.totalStops || 8,
        transfers: 0,
        occupancy: idx === 0 ? 'moderate' : 'low',
        tag: idx === 0 ? 'Fastest' : idx === 1 ? 'Recommended' : undefined,
        steps: [
          { mode: 'walk', description: `Walk to ${route.origin || fromLocation}`, durationMinutes: 3 },
          { mode: 'bus', description: `Board Bus ${busNum} towards ${route.destination || toLocation}`, durationMinutes: Math.max(5, duration - 5), busNumber: busNum },
          { mode: 'walk', description: `Alight at ${route.destination || toLocation}`, durationMinutes: 2 },
        ],
      };
    });
  }, [routes, buses, fromLocation, toLocation, journeyTime]);

  const sortedOptions = [...journeyOptions].sort((a, b) => {
    if (sortBy === 'fastest') return a.durationMinutes - b.durationMinutes;
    if (sortBy === 'cheapest') return a.fare - b.fare;
    if (sortBy === 'fewer_transfers') return a.transfers - b.transfers;
    return 0;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      
      {/* 1. JOURNEY SEARCH HEADER CARD */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#7847CB] flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base md:text-lg">
                {t('Plan Your Bus Journey', 'तुमच्या प्रवासाचे नियोजन करा')}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {t('Intelligent routing across Ahilyanagar municipal transit corridors', 'अहिल्यानगर परिवहन जाळे')}
              </p>
            </div>
          </div>
          <Badge variant="brand" size="md">
            MSRTC Routing Engine
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          <LocationSelector
            label={t('From Origin', 'कुठून')}
            value={fromLocation}
            onChange={setFromLocation}
            iconType="origin"
          />

          <button
            type="button"
            onClick={handleSwap}
            className="absolute left-1/2 top-[58px] -translate-x-1/2 z-10 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:text-[#7847CB] hover:border-[#7847CB] transition-all hidden md:flex active:scale-95"
            title="Swap Origin and Destination"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>

          <LocationSelector
            label={t('To Destination', 'कुठे')}
            value={toLocation}
            onChange={setToLocation}
            iconType="destination"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t('Date of Journey', 'प्रवासाची तारीख')}
            </label>
            <input
              type="date"
              value={journeyDate}
              onChange={(e) => setJourneyDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {t('Departure Time', 'निघण्याची वेळ')}
            </label>
            <input
              type="time"
              value={journeyTime}
              onChange={(e) => setJourneyTime(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20"
            />
          </div>
        </div>
      </div>

      {/* 2. SORTING & ROUTE OPTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSortBy('fastest')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              sortBy === 'fastest'
                ? 'bg-white text-[#7847CB] shadow-xs shadow-[#7847CB]/10'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚡ {t('Fastest', 'सर्वात जलद')}
          </button>
          <button
            type="button"
            onClick={() => setSortBy('cheapest')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              sortBy === 'cheapest'
                ? 'bg-white text-[#7847CB] shadow-xs shadow-[#7847CB]/10'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💰 {t('Cheapest', 'सर्वात स्वस्त')}
          </button>
          <button
            type="button"
            onClick={() => setSortBy('fewer_transfers')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              sortBy === 'fewer_transfers'
                ? 'bg-white text-[#7847CB] shadow-xs shadow-[#7847CB]/10'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🚌 {t('Direct Bus', 'थेट बस')}
          </button>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          Showing {sortedOptions.length} optimal routes
        </span>
      </div>

      {/* 3. JOURNEY RESULTS */}
      <div className="space-y-4">
        {sortedOptions.length === 0 && (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-[#7847CB] flex items-center justify-center mx-auto">
              <BusIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Direct Transit Corridors Available</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Currently no active routes connect "{fromLocation}" and "{toLocation}" directly. Try selecting major hubs like Central Bus Stand (CBS) or check configured routes.
            </p>
          </div>
        )}
        {sortedOptions.map((opt) => {
          const isExpanded = expandedOptionId === opt.id;

          return (
            <div
              key={opt.id}
              className={`rounded-3xl border bg-white shadow-2xs transition-all overflow-hidden ${
                isExpanded ? 'border-[#7847CB]/40 ring-4 ring-[#7847CB]/5' : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              {/* Card Summary Header */}
              <div
                onClick={() => setExpandedOptionId(isExpanded ? null : opt.id)}
                className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 bg-[#7847CB] text-white font-black text-sm rounded-xl shadow-xs shadow-[#7847CB]/25 shrink-0">
                      {opt.busNumber}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm md:text-base">{opt.routeName}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {opt.departureTime} ➔ {opt.arrivalTime} ({formatDuration(opt.durationMinutes)})
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1">
                    <span className="font-black text-slate-900 text-lg tabular-nums">
                      {formatCurrency(opt.fare)}
                    </span>
                    {opt.tag && (
                      <Badge variant="success" size="sm">
                        {opt.tag}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {opt.totalStops} stops
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Navigation className="w-3.5 h-3.5 text-slate-400" />
                      {opt.walkingDistanceMeters}m walk
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <OccupancyBadge level={opt.occupancy} compact />
                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                      aria-label="Expand route details"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Detailed Steps */}
              {isExpanded && (
                <div className="p-5 bg-slate-50/70 border-t border-slate-100 space-y-4 animate-in fade-in">
                  <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    {t('Step-by-Step Itinerary', 'टप्प्याटप्प्याने प्रवास मार्ग')}
                  </h5>

                  <div className="space-y-4 pl-3 border-l-2 border-purple-200 ml-2">
                    {opt.steps.map((step, idx) => (
                      <div key={idx} className="relative pl-4 text-xs">
                        <span className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-[#7847CB] ring-4 ring-purple-100" />
                        <div className="font-bold text-slate-900">{step.description}</div>
                        <div className="text-slate-500 font-medium mt-0.5">
                          Approx. {step.durationMinutes} mins
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => navigate(`/app/live?bus=${opt.busNumber}`)}
                      leftIcon={<BusIcon className="w-4 h-4 text-[#7847CB]" />}
                    >
                      {t('Track Bus Live', 'बस ट्रॅक करा')}
                    </Button>

                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        navigate(
                          `/app/tickets?source=${encodeURIComponent(fromLocation)}&dest=${encodeURIComponent(toLocation)}`
                        )
                      }
                      leftIcon={<TicketIcon className="w-4 h-4" />}
                    >
                      {t('Buy Ticket (₹' + opt.fare + ')', 'तिकीट घ्या (₹' + opt.fare + ')')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

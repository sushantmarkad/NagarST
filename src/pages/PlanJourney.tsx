import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LocationSelector } from '../components/common/LocationSelector';
import { OccupancyBadge } from '../components/common/StatusBadge';
import { formatCurrency, formatDuration } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import type { JourneyOption } from '../types';
import {
  Compass,
  ArrowRightLeft,
  Clock,
  ChevronDown,
  ChevronUp,
  Ticket as TicketIcon,
  Navigation,
} from 'lucide-react';

const MOCK_JOURNEY_RESULTS: JourneyOption[] = [
  {
    id: 'opt-1',
    busNumber: 'Bus 12',
    routeId: 'route-12',
    routeName: 'Central Bus Stand ↔ Savedi Terminal',
    departureTime: '08:35 AM',
    arrivalTime: '09:07 AM',
    durationMinutes: 32,
    totalStops: 8,
    walkingDistanceMeters: 250,
    fare: 20,
    occupancy: 'moderate',
    transfers: 0,
    tag: 'Fastest',
    steps: [
      { mode: 'walk', description: 'Walk 250m (3 min) to Central Bus Stand (CBS)', durationMinutes: 3, distanceMeters: 250 },
      { mode: 'bus', description: 'Board Bus 12 towards Savedi Terminal (8 stops)', durationMinutes: 27, busNumber: 'Bus 12', stopName: 'Savedi Bus Terminal' },
      { mode: 'walk', description: 'Arrive at destination', durationMinutes: 2, distanceMeters: 50 },
    ],
  },
  {
    id: 'opt-2',
    busNumber: 'Bus 1',
    routeId: 'route-1',
    routeName: 'Central Bus Stand ↔ MIDC Nagapur',
    departureTime: '08:42 AM',
    arrivalTime: '09:22 AM',
    durationMinutes: 40,
    totalStops: 10,
    walkingDistanceMeters: 180,
    fare: 15,
    occupancy: 'high',
    transfers: 0,
    tag: 'Cheapest',
    steps: [
      { mode: 'walk', description: 'Walk 180m (2 min) to Central Bus Stand', durationMinutes: 2, distanceMeters: 180 },
      { mode: 'bus', description: 'Board Bus 1 towards MIDC (Get off at Premdan Chowk)', durationMinutes: 25, busNumber: 'Bus 1', stopName: 'Premdan Chowk' },
      { mode: 'bus', description: 'Transfer to Bus 24 to Savedi Terminal', durationMinutes: 10, busNumber: 'Bus 24', stopName: 'Savedi Terminal' },
    ],
  },
  {
    id: 'opt-3',
    busNumber: 'Bus 4',
    routeId: 'route-4',
    routeName: 'Savedi Terminal ↔ Railway Station',
    departureTime: '08:50 AM',
    arrivalTime: '09:25 AM',
    durationMinutes: 35,
    totalStops: 6,
    walkingDistanceMeters: 100,
    fare: 20,
    occupancy: 'low',
    transfers: 0,
    tag: 'Recommended',
    steps: [
      { mode: 'walk', description: 'Walk 100m to Railway Station Stop', durationMinutes: 2, distanceMeters: 100 },
      { mode: 'bus', description: 'Board Bus 4 EV Express Shuttle directly to Savedi Terminal', durationMinutes: 31, busNumber: 'Bus 4', stopName: 'Savedi Bus Terminal' },
    ],
  },
];

export const PlanJourney: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialFrom = searchParams.get('from') || (language === 'mr' ? 'मध्यवर्ती बस स्थानक (CBS)' : 'Central Bus Stand (CBS)');
  const initialTo = searchParams.get('to') || (language === 'mr' ? 'सावेडी बस टर्मिनस' : 'Savedi Bus Terminal');

  const [fromLocation, setFromLocation] = useState(initialFrom);
  const [toLocation, setToLocation] = useState(initialTo);
  const [journeyDate, setJourneyDate] = useState('2026-08-20');
  const [journeyTime, setJourneyTime] = useState('08:30');
  const [sortBy, setSortBy] = useState<'fastest' | 'cheapest' | 'fewer_transfers'>('fastest');
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>('opt-1');

  const handleSwap = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  const sortedOptions = [...MOCK_JOURNEY_RESULTS].sort((a, b) => {
    if (sortBy === 'fastest') return a.durationMinutes - b.durationMinutes;
    if (sortBy === 'cheapest') return a.fare - b.fare;
    if (sortBy === 'fewer_transfers') return a.transfers - b.transfers;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Search Header Form */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#0f3c5c]" />
            <h2 className="font-extrabold text-slate-900 text-lg">
              {t('Plan Your Bus Journey', 'तुमच्या प्रवासाचे नियोजन करा')}
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {t('Ahilyanagar Transit Network', 'अहिल्यानगर परिवहन जाळे')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          <LocationSelector
            label={t('From', 'कुठून')}
            value={fromLocation}
            onChange={setFromLocation}
            iconType="origin"
          />

          <button
            type="button"
            onClick={handleSwap}
            className="absolute left-1/2 top-[58px] -translate-x-1/2 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors hidden md:flex"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {t('Date of Journey', 'प्रवासाची तारीख')}
            </label>
            <input
              type="date"
              value={journeyDate}
              onChange={(e) => setJourneyDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f3c5c] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              {t('Departure Time', 'निघण्याची वेळ')}
            </label>
            <input
              type="time"
              value={journeyTime}
              onChange={(e) => setJourneyTime(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f3c5c] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Sorting Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
          <button
            onClick={() => setSortBy('fastest')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              sortBy === 'fastest'
                ? 'bg-white text-[#0f3c5c] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚡ {t('Fastest', 'सर्वात जलद')}
          </button>
          <button
            onClick={() => setSortBy('cheapest')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              sortBy === 'cheapest'
                ? 'bg-white text-[#0f3c5c] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💰 {t('Cheapest', 'सर्वात स्वस्त')}
          </button>
          <button
            onClick={() => setSortBy('fewer_transfers')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              sortBy === 'fewer_transfers'
                ? 'bg-white text-[#0f3c5c] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🚌 {t('Direct / Fewer Transfers', 'थेट बस')}
          </button>
        </div>

        <span className="text-xs font-medium text-slate-500">
          Showing {sortedOptions.length} routes found
        </span>
      </div>

      {/* Journey Result Cards */}
      <div className="space-y-4">
        {sortedOptions.map((opt) => {
          const isExpanded = expandedOptionId === opt.id;

          return (
            <div
              key={opt.id}
              className={`rounded-2xl border bg-white shadow-2xs transition-all overflow-hidden ${
                isExpanded ? 'border-[#0f3c5c] ring-1 ring-[#0f3c5c]/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Summary Header */}
              <div
                onClick={() => setExpandedOptionId(isExpanded ? null : opt.id)}
                className="p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="px-3 py-1 bg-[#0f3c5c] text-white font-extrabold text-sm rounded-lg shadow-2xs">
                      {opt.busNumber}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{opt.routeName}</h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {opt.departureTime} → {opt.arrivalTime} ({formatDuration(opt.durationMinutes)})
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 text-lg">{formatCurrency(opt.fare)}</span>
                    {opt.tag && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 block mt-0.5">
                        {opt.tag}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {opt.totalStops} stops
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Navigation className="w-3.5 h-3.5 text-slate-400" />
                      {opt.walkingDistanceMeters}m walk
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <OccupancyBadge level={opt.occupancy} compact />
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Detailed Steps */}
              {isExpanded && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                  <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    {t('Step-by-Step Itinerary', 'टप्प्याटप्प्याने प्रवास मार्ग')}
                  </h5>

                  <div className="space-y-3 pl-2 border-l-2 border-slate-300">
                    {opt.steps.map((step, idx) => (
                      <div key={idx} className="relative pl-4 text-xs">
                        <span className="absolute -left-[21px] top-0 w-2.5 h-2.5 rounded-full bg-[#0f3c5c] ring-4 ring-slate-50" />
                        <div className="font-semibold text-slate-900">{step.description}</div>
                        <div className="text-slate-500 font-medium mt-0.5">
                          Duration: {step.durationMinutes} mins
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                    <button
                      onClick={() => navigate(`/app/live?bus=${opt.busNumber}`)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors text-center"
                    >
                      {t('Track Bus Live', 'बस ट्रॅक करा')}
                    </button>
                    <button
                      onClick={() =>
                        navigate(
                          `/app/tickets?source=${encodeURIComponent(fromLocation)}&dest=${encodeURIComponent(toLocation)}`
                        )
                      }
                      className="flex-1 py-2 bg-[#0f3c5c] hover:bg-[#0a2a42] text-white font-bold text-xs rounded-xl transition-colors text-center flex items-center justify-center gap-1.5"
                    >
                      <TicketIcon className="w-3.5 h-3.5" />
                      <span>{t('Buy Ticket (₹' + opt.fare + ')', 'तिकीट घ्या (₹' + opt.fare + ')')}</span>
                    </button>
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

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Navigation,
  Route as RouteIcon,
  Ticket,
  CreditCard,
  Heart,
  Search,
  ArrowRight,
  Clock,
  Radio,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Crosshair,
  Phone,
  Sparkles,
  Bus as BusIcon,
  Zap,
  Info,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LiveMap } from '../components/map/LiveMap';
import { ETAIndicator } from '../components/common/ETAIndicator';
import { OccupancyBadge, BusStatusBadge } from '../components/common/StatusBadge';
import type { Bus } from '../types';

export const Home: React.FC = () => {
  const { buses, routes, stops, notifications, setSelectedBusId } = useApp();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/app/plan?to=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/app/plan');
    }
  };

  const handleQuickDestination = (destination: string) => {
    navigate(`/app/plan?to=${encodeURIComponent(destination)}`);
  };

  const handleSelectBus = (bus: Bus) => {
    setSelectedBusId(bus.id);
    navigate(`/app/live?busId=${bus.id}`);
  };

  const popularDestinations = [
    { nameEn: 'Savedi', nameMr: 'सावेडी' },
    { nameEn: 'Maliwada', nameMr: 'माळीवाडा' },
    { nameEn: 'Railway Station', nameMr: 'रेल्वे स्टेशन' },
    { nameEn: 'Tarakpur', nameMr: 'तारकपूर' },
    { nameEn: 'Kedgaon', nameMr: 'केडगाव' },
    { nameEn: 'Market Yard', nameMr: 'मार्केट यार्ड' },
    { nameEn: 'MIDC', nameMr: 'एमआयडीसी' },
  ];

  return (
    <div className="w-full flex-1 bg-[#f8f9fc] p-3.5 sm:p-5 md:p-8 space-y-5 md:space-y-7 max-w-7xl mx-auto pb-24 md:pb-10">
      
      {/* 1. CIVIC HERO & QUICK JOURNEY FINDER BANNER */}
      <section className="bg-gradient-to-br from-white via-white to-purple-50/50 rounded-3xl border border-slate-200/90 p-4 sm:p-6 md:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle Background Radial Pattern */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-purple-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-blue-100/30 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-3xl relative z-10 space-y-4">
          
          {/* Municipal Authority Badge & Network Telemetry Pill */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100/80 text-[#7847CB] text-xs font-bold border border-purple-200 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#7847CB]" />
              <span>{t('Ahilyanagar Municipal City Transit', 'अहिल्यानगर महानगरपालिका शहर बस')}</span>
            </span>

            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {buses.length} {t('buses online live', 'बसेस थेट जीपीएसवर')}
              </span>
            </div>
          </div>

          {/* Hero Title */}
          <div>
            <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {t('Smart, Reliable Urban Transit Across Ahilyanagar', 'अहिल्यानगर शहरात सुलभ, जलद व सुरक्षित प्रवास')}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl font-medium">
              {t(
                'Track real-time GPS telemetry, book instant cashless QR tickets, check corridor timetables, and navigate city routes effortlessly.',
                'रिअल-टाइम जीपीएस बस ट्रॅकिंग, कॅशलेस डिजिटल क्यूआर तिकीट आणि अहिल्यानगर शहर बस वेळापत्रक एकाच ठिकाणी.'
              )}
            </p>
          </div>

          {/* Quick Destination Search Form */}
          <form onSubmit={handleSearch} className="pt-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-2xl bg-white p-2 rounded-2xl border border-slate-200/90 shadow-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#7847CB] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('Where do you want to go? e.g. Savedi, Maliwada, Station...', 'कुठे जायचे आहे? उदा. सावेडी, माळीवाडा, स्टेशन...')}
                  className="w-full pl-10 pr-3 py-2.5 bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button 
                  type="submit" 
                  size="md" 
                  className="flex-1 sm:flex-none shadow-xs shadow-[#7847CB]/30" 
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {t('Find Route', 'मार्ग शोधा')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => navigate('/app/live')}
                  className="flex-1 sm:flex-none border-purple-200 text-[#7847CB] hover:bg-purple-50"
                  leftIcon={<Crosshair className="w-4 h-4" />}
                >
                  {t('Live Map', 'थेट नकाशा')}
                </Button>
              </div>
            </div>

            {/* Popular Destination Quick Chips */}
            <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                {t('Popular:', 'लोकप्रिय:')}
              </span>
              {popularDestinations.map((dest) => (
                <button
                  key={dest.nameEn}
                  type="button"
                  onClick={() => handleQuickDestination(dest.nameEn)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100/90 hover:bg-purple-100 hover:text-[#7847CB] text-slate-700 transition-colors border border-slate-200/80"
                >
                  {language === 'mr' ? dest.nameMr : dest.nameEn}
                </button>
              ))}
            </div>
          </form>

        </div>

        {/* Decorative Modern Transit Vector Backdrop */}
        <div className="hidden lg:block absolute -right-6 -bottom-8 opacity-10 pointer-events-none">
          <RouteIcon className="w-72 h-72 text-[#7847CB]" />
        </div>
      </section>

      {/* 2. PRIMARY TRANSIT SERVICES (Fast 1-Tap Navigation) */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#7847CB]" />
            <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight uppercase">
              {t('Transit Services', 'नागरी वाहतूक सेवा')}
            </h2>
          </div>
          <span 
            className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer" 
            onClick={() => navigate('/app/routes')}
          >
            {t('All Routes', 'सर्व मार्ग')} →
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
          {/* 1. Live Map */}
          <button
            type="button"
            onClick={() => navigate('/app/live')}
            className="flex flex-col items-start p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-purple-300 hover:shadow-md transition-all text-left group active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#7847CB] flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:bg-[#7847CB] group-hover:text-white transition-all shadow-2xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {t('Live Tracking', 'लाईव्ह ट्रॅकिंग')}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-1">
              {t('Moving buses radar', 'चालू बसेस नकाशा')}
            </span>
          </button>

          {/* 2. Plan Trip */}
          <button
            type="button"
            onClick={() => navigate('/app/plan')}
            className="flex flex-col items-start p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all text-left group active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
              <Navigation className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {t('Plan Trip', 'प्रवास नियोजन')}
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-1">
              {t('Fares & shortest route', 'भाडे व जलद मार्ग')}
            </span>
          </button>

          {/* 3. Routes & Stops */}
          <button
            type="button"
            onClick={() => navigate('/app/routes')}
            className="flex flex-col items-start p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all text-left group active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
              <RouteIcon className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {t('Bus Routes', 'बस मार्ग')}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {routes.length}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-1">
              {t('City corridors', 'मार्ग व वेळापत्रक')}
            </span>
          </button>

          {/* 4. Instant Ticket */}
          <button
            type="button"
            onClick={() => navigate('/app/tickets')}
            className="flex flex-col items-start p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-amber-300 hover:shadow-md transition-all text-left group active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-2xs">
              <Ticket className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {t('Instant Ticket', 'झटपट तिकीट')}
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-1">
              {t('Cashless QR pass', 'कॅशलेस क्यूआर')}
            </span>
          </button>

          {/* 5. Bus Passes */}
          <button
            type="button"
            onClick={() => navigate('/app/passes')}
            className="flex flex-col items-start p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all text-left group active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {t('Monthly Pass', 'मासिक पास')}
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-1">
              {t('Student & Senior', 'सवलत व मासिक पास')}
            </span>
          </button>

          {/* 6. Saved Places */}
          <button
            type="button"
            onClick={() => navigate('/app/favorites')}
            className="flex flex-col items-start p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-rose-300 hover:shadow-md transition-all text-left group active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-2xs">
              <Heart className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {t('Saved Stops', 'जतन केलेले')}
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-1">
              {t('1-Tap favorites', '१-क्लिक आवडते')}
            </span>
          </button>
        </div>
      </section>

      {/* 3. DUAL COLUMN: LIVE ACTIVE BUSES & MAP SNAPSHOT + CIVIC HUBS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        
        {/* Left Column (2 cols): Live Active Buses Telemetry Stream */}
        <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  {t('Live Buses in Service', 'सध्या कार्यरत बसेस')}
                </h3>
                <span className="text-xs text-slate-400 font-medium">({buses.length})</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/app/live')}
                className="text-xs font-bold text-[#7847CB] hover:underline flex items-center gap-1 group"
              >
                <span>{t('Full Live Map', 'पूर्ण नकाशा')}</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Active Bus Cards List */}
            <div className="space-y-3">
              {buses.slice(0, 5).map((bus) => (
                <div
                  key={bus.id}
                  onClick={() => handleSelectBus(bus)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-purple-50/60 border border-slate-100 hover:border-purple-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Bus Route Pill */}
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center shrink-0 shadow-2xs group-hover:border-[#7847CB] transition-colors">
                      <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Bus</span>
                      <span className="text-xs font-black text-[#7847CB] mt-0.5">{bus.busNumber}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {bus.routeName || `Corridor ${bus.routeNumber || 'Transit'}`}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700">
                          {bus.plateNumber}
                        </span>
                        {bus.speedKmh > 0 ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            {bus.speedKmh} km/h
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            At Stop
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-1">
                        {t('Next:', 'पुढील:')} <strong className="text-slate-800 font-semibold">{bus.nextStopName || 'Approaching Stop'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2 space-y-1">
                    <ETAIndicator minutes={bus.etaToNextMinutes || 3} size="sm" />
                    <div className="block">
                      <OccupancyBadge level={bus.occupancy || 'low'} compact />
                    </div>
                  </div>
                </div>
              ))}

              {buses.length === 0 && (
                <div className="text-center py-10 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs space-y-2">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-[#7847CB] flex items-center justify-center mx-auto">
                    <BusIcon className="w-5 h-5 animate-pulse" />
                  </div>
                  <p className="font-semibold text-slate-700">
                    {t('Connecting to live dispatch stream...', 'लाईव्ह डिस्पॅच स्ट्रीमशी जोडत आहे...')}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {t('Fetching GPS transponder telemetry from municipal vehicles', 'महानगरपालिका बसेसकडून जीपीएस डेटा लोड होत आहे')}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('Live 10-second transponder auto-sync', 'थेट १०-सेकंद जीपीएस सिंक')}</span>
            </span>
            <button
              type="button"
              onClick={() => navigate('/app/live')}
              className="font-bold text-[#7847CB] hover:underline"
            >
              {t('Open Fleet Radar Map', 'फ्लीट रडार नकाशा उघडा')} →
            </button>
          </div>
        </section>

        {/* Right Column (1 col): Live Radar Mini Map & Transit Hubs */}
        <div className="space-y-5 md:space-y-6">
          
          {/* Interactive Live Mini-Map Preview Card */}
          <section className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#7847CB] animate-pulse" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                  {t('City Radar Snapshot', 'शहर बस रडार')}
                </h3>
              </div>
              <Badge variant="brand" size="sm">Live</Badge>
            </div>

            {/* Embedded Live Map Widget */}
            <div 
              onClick={() => navigate('/app/live')} 
              className="w-full h-44 rounded-2xl overflow-hidden border border-slate-200 relative cursor-pointer group shadow-2xs"
            >
              <LiveMap
                buses={buses}
                stops={stops.slice(0, 8)}
                height="100%"
                showUserLocation={false}
                className="w-full h-full pointer-events-none"
              />
              <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                <span className="px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md text-[#7847CB] font-bold text-xs shadow-md flex items-center gap-1.5 group-hover:scale-105 transition-transform">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t('Tap for Fullscreen Map', 'पूर्ण नकाशा उघडा')}</span>
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium text-center">
              {t('Click map to track bus locations & find nearby stops', 'बसचे स्थान व नजीकचे थांबे पाहण्यासाठी क्लिक करा')}
            </p>
          </section>

          {/* Major Ahilyanagar Transit Hubs */}
          <section className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>{t('Major Transit Hubs', 'प्रमुख बस थांबे')}</span>
              <span className="text-[11px] text-slate-400 font-normal">{stops.length} Total</span>
            </h3>

            <div className="space-y-2">
              {stops.slice(0, 4).map((stop) => (
                <div
                  key={stop.id}
                  onClick={() => navigate(`/app/routes`)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-purple-50/60 transition-colors cursor-pointer border border-transparent hover:border-purple-200/80 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-[#7847CB] group-hover:text-white text-slate-600 flex items-center justify-center shrink-0 transition-colors">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-[#7847CB] transition-colors">
                        {stop.name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {stop.nameMarathi || stop.area || 'Ahilyanagar Municipal Area'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#7847CB] group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              ))}
            </div>
          </section>

          {/* 24x7 Control Room & Helpline Assurance */}
          <section className="bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/60 rounded-3xl border border-purple-200/90 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#7847CB] text-white flex items-center justify-center shrink-0 shadow-xs shadow-[#7847CB]/30">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  {t('24x7 Municipal Transit Helpline', '२४x७ प्रवासी मदत कक्ष')}
                </h4>
                <span className="text-[10px] text-slate-500">
                  {t('Toll-free dispatch support & emergency assistance', 'नियंत्रण कक्ष मदत व तातडीची सेवा')}
                </span>
              </div>
            </div>

            <div className="p-3 bg-white/90 rounded-2xl border border-purple-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  {t('Hotline Number', 'हेल्पलाईन नंबर')}
                </span>
                <a 
                  href="tel:02412345678" 
                  className="text-sm font-black text-[#7847CB] hover:underline font-mono"
                >
                  0241-2345678
                </a>
              </div>
              <a
                href="tel:02412345678"
                className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-[#7847CB] font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{t('Call Now', 'कॉल करा')}</span>
              </a>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[11px] text-slate-500">
                {t('Lost & Found, Route inquiries', 'हरवलेल्या वस्तू, चौकशी')}
              </span>
              <button
                type="button"
                onClick={() => navigate('/app/help')}
                className="text-xs font-bold text-purple-700 hover:underline"
              >
                {t('Help & FAQs', 'मदत व प्रश्न')} →
              </button>
            </div>
          </section>

        </div>
      </div>

    </div>
  );
};

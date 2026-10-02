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
  Crosshair
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const Home: React.FC = () => {
  const { buses, routes, stops, notifications } = useApp();
  const { t } = useLanguage();
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

  const activeBusesCount = (buses as any[]).filter((b: any) => b.isLive || b.status === 'in-service' || b.status === 'on-time' || b.status === 'on_time').length;

  return (
    <div className="w-full flex-1 bg-[#f8f9fc] p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* 1. MUNICIPAL TRANSIT BANNER & JOURNEY SEARCH */}
      <section className="bg-white rounded-3xl border border-slate-200/90 p-5 md:p-8 shadow-xs relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="brand" size="md" dot>
              {t('Live Transit Network', 'थेट वाहतूक नेटवर्क')}
            </Badge>
            <span className="text-xs text-slate-500 font-medium">
              {activeBusesCount} {t('buses running live in Ahilyanagar', 'बसेस अहिल्यानगरमध्ये सुरू आहेत')}
            </span>
          </div>

          <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {t('Smart, Reliable City Travel Across Ahilyanagar', 'अहिल्यानगर शहरात सुलभ आणि जलद प्रवास')}
          </h1>
          <p className="mt-2 text-xs md:text-sm text-slate-600 leading-relaxed">
            {t(
              'Track MSRTC municipal electric and city buses in real-time, purchase cashless QR tickets, and plan everyday routes.',
              'रिअल-टाइममध्ये शहर बसेस ट्रॅक करा, कॅशलेस क्यूआर तिकीट खरेदी करा आणि आपल्या प्रवासाचे नियोजन करा.'
            )}
          </p>

          {/* Quick Destination Search Form */}
          <form onSubmit={handleSearch} className="mt-5 flex flex-col sm:flex-row items-center gap-2 max-w-xl">
            <div className="relative w-full flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('Search destination e.g. Savedi, Maliwada, Station...', 'कुठे जायचे आहे? उदा. सावेडी, माळीवाडा, स्टेशन...')}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs md:text-sm focus:outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <Button type="submit" size="md" className="flex-1 sm:flex-none" rightIcon={<ArrowRight className="w-4 h-4" />}>
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
          </form>
        </div>

        {/* Subtle Decorative Graphic */}
        <div className="hidden lg:block absolute -right-4 -bottom-6 opacity-10 pointer-events-none">
          <RouteIcon className="w-64 h-64 text-[#7847CB]" />
        </div>
      </section>

      {/* 2. FAST ACTION SHORTCUTS (Primary Commuter Functions) */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs md:text-sm font-bold text-slate-900 tracking-tight uppercase">
            {t('Transit Services', 'वाहतूक सेवा')}
          </h2>
          <span className="text-[11px] font-semibold text-purple-700 hover:underline cursor-pointer" onClick={() => navigate('/app/routes')}>
            {t('All Routes', 'सर्व मार्ग')} →
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Live Map */}
          <button
            type="button"
            onClick={() => navigate('/app/live')}
            className="flex flex-col items-start p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-purple-200 hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#7847CB] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">{t('Live Tracking', 'लाईव्ह ट्रॅकिंग')}</span>
            <span className="text-[10px] text-slate-500 mt-0.5">{t('View moving buses', 'चालू बसेस पहा')}</span>
          </button>

          {/* Plan Journey */}
          <button
            type="button"
            onClick={() => navigate('/app/plan')}
            className="flex flex-col items-start p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-purple-200 hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Navigation className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">{t('Plan Trip', 'प्रवास नियोजन')}</span>
            <span className="text-[10px] text-slate-500 mt-0.5">{t('Fares & shortest route', 'भाडे व जलद मार्ग')}</span>
          </button>

          {/* Routes & Stops */}
          <button
            type="button"
            onClick={() => navigate('/app/routes')}
            className="flex flex-col items-start p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-purple-200 hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <RouteIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">{t('Bus Routes', 'बस मार्ग')}</span>
            <span className="text-[10px] text-slate-500 mt-0.5">{routes.length} {t('Active lines', 'मार्ग उपलब्ध')}</span>
          </button>

          {/* Tickets */}
          <button
            type="button"
            onClick={() => navigate('/app/tickets')}
            className="flex flex-col items-start p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-purple-200 hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Ticket className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">{t('Instant Ticket', 'झटपट तिकीट')}</span>
            <span className="text-[10px] text-slate-500 mt-0.5">{t('Cashless QR pass', 'कॅशलेस क्यूआर')}</span>
          </button>

          {/* Bus Passes */}
          <button
            type="button"
            onClick={() => navigate('/app/passes')}
            className="flex flex-col items-start p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-purple-200 hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">{t('Monthly Pass', 'मासिक पास')}</span>
            <span className="text-[10px] text-slate-500 mt-0.5">{t('Daily & Student pass', 'सवलत पास')}</span>
          </button>

          {/* Saved Places */}
          <button
            type="button"
            onClick={() => navigate('/app/favorites')}
            className="flex flex-col items-start p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-purple-200 hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">{t('Saved Stops', 'जतन केलेले थांबे')}</span>
            <span className="text-[10px] text-slate-500 mt-0.5">{t('Fast 1-tap route', '१-क्लिक मार्ग')}</span>
          </button>
        </div>
      </section>

      {/* 3. DUAL COLUMN: LIVE ACTIVE BUSES & POPULAR CITY ROUTES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left (2 cols): Live Bus Fleet Departures */}
        <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-900">{t('Live Buses in Service', 'सध्या कार्यरत बसेस')}</h3>
            </div>
            <button
              onClick={() => navigate('/app/live')}
              className="text-xs font-bold text-[#7847CB] hover:underline flex items-center gap-1"
            >
              {t('Full Live Map', 'पूर्ण नकाशा')} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {(buses as any[]).slice(0, 4).map((bus: any) => (
              <div
                key={bus.id}
                onClick={() => navigate('/app/live')}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50/50 border border-slate-100 hover:border-purple-200/80 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center shrink-0 shadow-2xs group-hover:border-[#7847CB]">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Route</span>
                    <span className="text-xs font-black text-[#7847CB]">{bus.routeNumber || 'AH'}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">{bus.busNumber}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        {bus.speed ? `${bus.speed} km/h` : 'Moving'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      Next: <strong className="text-slate-700">{bus.nextStop || 'Approaching Stop'}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-slate-900 block tabular-nums">
                    {bus.estimatedArrival || 'In 4m'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {bus.occupancy || 'Medium Seats'}
                  </span>
                </div>
              </div>
            ))}

            {buses.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                {t('Connecting to live dispatch stream...', 'लाईव्ह डिस्पॅच स्ट्रीमशी जोडत आहे...')}
              </div>
            )}
          </div>
        </section>

        {/* Right (1 col): Key Transit Hubs & Active Bulletins */}
        <div className="space-y-6">
          
          {/* Key Stops */}
          <section className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>{t('Major Transit Hubs', 'प्रमुख बस थांबे')}</span>
              <span className="text-[11px] text-slate-400 font-normal">{stops.length} Total</span>
            </h3>

            <div className="space-y-2.5">
              {(stops as any[]).slice(0, 4).map((stop: any) => (
                <div
                  key={stop.id}
                  onClick={() => navigate('/app/routes')}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{stop.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{stop.nameMarathi || stop.location}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          </section>

          {/* Passenger Safety & Support Assurance */}
          <section className="bg-gradient-to-br from-purple-50 to-indigo-50/60 rounded-3xl border border-purple-100 p-5 shadow-xs">
            <div className="flex items-center gap-2.5 mb-2">
              <ShieldCheck className="w-5 h-5 text-[#7847CB]" />
              <h4 className="text-xs font-bold text-slate-900">{t('Ahilyanagar Transit Helpline', 'प्रवासी मदत कक्ष')}</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('Toll-free 24x7 control room dispatch support for lost items, queries, and schedule assistance.', '२४x७ नियंत्रण कक्ष मदत: हरवलेल्या वस्तू, तक्रार व चौकशी.')}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#7847CB]">0241-2345678</span>
              <button
                type="button"
                onClick={() => navigate('/app/help')}
                className="text-xs font-bold text-purple-700 hover:underline"
              >
                {t('Help & FAQs', 'मदत')} →
              </button>
            </div>
          </section>

        </div>
      </div>

    </div>
  );
};

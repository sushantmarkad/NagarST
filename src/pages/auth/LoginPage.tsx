import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { type UserRole, ROLE_START_ROUTES } from '../../data/mockAuth';
import {
  Bus,
  MapPin,
  QrCode,
  Compass,
  Bell,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  KeyRound,
  Building2,
  Ticket,
  User,
  CircleDot,
  Star,
  Check,
  Navigation,
  Shield,
  Sparkles,
  Menu,
  X
} from 'lucide-react';

interface LoginPageProps {
  initialMode?: 'login' | 'register';
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialMode = 'login' }) => {
  const { user, isAuthenticated, login, register, switchRole, getRoleStartRoute } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole>('PASSENGER');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isRequestingAdmin, setIsRequestingAdmin] = useState(false);

  // If user is already authenticated and visits public landing/login page, redirect to their role start route
  useEffect(() => {
    if (isAuthenticated && user) {
      const startRoute = getRoleStartRoute(user.role);
      navigate(startRoute, { replace: true });
    }
  }, [isAuthenticated, user, getRoleStartRoute, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      let loggedUser;
      if (mode === 'register') {
        loggedUser = await register(name, emailOrPhone, password, isRequestingAdmin);
      } else {
        loggedUser = await login(selectedDemoRole, { email: emailOrPhone, password });
      }
      
      const targetRoute = from || ROLE_START_ROUTES[loggedUser.role] || getRoleStartRoute(loggedUser.role);
      navigate(targetRoute, { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (role: UserRole) => {
    setSelectedDemoRole(role);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8F8FA] font-sans text-neutral-900 antialiased selection:bg-[#7847CB] selection:text-white">
      {/* PART 2 — GLASS NAVIGATION */}
      <nav className="glass-nav fixed top-0 left-0 right-0 z-50 border-b border-neutral-200/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* LEFT: Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7847CB] text-white flex items-center justify-center font-black text-xl shadow-md shadow-[#7847CB]/25">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-neutral-900 block leading-tight">
                Ahilyanagar City Bus
              </span>
              <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider block">
                Municipal Transit Undertaking
              </span>
            </div>
          </div>

          {/* CENTER: Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-neutral-600">
            <button onClick={() => scrollToSection('hero')} className="hover:text-[#7847CB] transition-colors">
              Home
            </button>
            <button onClick={() => scrollToSection('features')} className="hover:text-[#7847CB] transition-colors">
              Routes & Features
            </button>
            <button onClick={() => scrollToSection('live-map')} className="hover:text-[#7847CB] transition-colors">
              Live Tracking
            </button>
            <button onClick={() => scrollToSection('smart-transit')} className="hover:text-[#7847CB] transition-colors">
              Smart Transit
            </button>
          </div>

          {/* RIGHT: Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => {
                setMode('login');
                setAuthModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-2xl text-sm font-bold text-neutral-700 hover:text-[#7847CB] hover:bg-neutral-100/80 transition"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('register');
                setAuthModalOpen(true);
              }}
              className="px-6 py-2.5 rounded-2xl text-sm font-bold bg-[#7847CB] hover:bg-[#6436ab] text-white shadow-md shadow-[#7847CB]/20 transition duration-300"
            >
              Get Started
            </button>
          </div>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-neutral-700 hover:bg-neutral-100"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-neutral-200 px-4 py-4 space-y-3">
            <button
              onClick={() => {
                scrollToSection('hero');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left text-sm font-semibold text-neutral-700 py-2"
            >
              Home
            </button>
            <button
              onClick={() => {
                scrollToSection('features');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left text-sm font-semibold text-neutral-700 py-2"
            >
              Routes & Features
            </button>
            <button
              onClick={() => {
                scrollToSection('live-map');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left text-sm font-semibold text-neutral-700 py-2"
            >
              Live Tracking
            </button>
            <div className="pt-2 border-t border-neutral-100 flex gap-2">
              <button
                onClick={() => {
                  setMode('login');
                  setAuthModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-800"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setMode('register');
                  setAuthModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#7847CB] text-white text-sm font-bold"
              >
                Register
              </button>
            </div>
          </div>
        )}
      </nav>

      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
        {/* PART 3 — HERO DESIGN */}
        <section
          id="hero"
          className="relative bg-[#7847CB] rounded-[2.5rem] text-white overflow-hidden p-8 sm:p-12 lg:p-16 min-h-[640px] flex flex-col justify-between shadow-xl shadow-[#7847CB]/15"
        >
          {/* Subtle white circular background overlay */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white opacity-[0.05] blur-3xl rounded-full pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white opacity-[0.03] blur-3xl rounded-full pointer-events-none -ml-20 -mb-20" />

          {/* Top Hero Pill Badge */}
          <div className="relative z-10 flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-white tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Ahilyanagar Official Smart City Transit
            </span>
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-8">
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-white">
                Your city. <br />
                Your route. <br />
                <span className="text-amber-300">Your ride.</span>
              </h1>

              <p className="text-lg text-purple-100/90 max-w-xl font-normal leading-relaxed">
                Plan your journey, track buses in real time, manage digital tickets and stay updated with Ahilyanagar’s city bus network.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => {
                    setMode('register');
                    setIsRequestingAdmin(false);
                    setAuthModalOpen(true);
                  }}
                  className="px-8 py-4 rounded-2xl bg-white hover:bg-neutral-100 text-[#7847CB] font-extrabold text-base transition duration-300 shadow-lg shadow-black/10 flex items-center gap-2 group"
                >
                  <span>Find Your Bus</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => scrollToSection('features')}
                  className="px-7 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white font-bold text-base transition duration-300"
                >
                  Explore Routes
                </button>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => {
                    setMode('register');
                    setIsRequestingAdmin(true);
                    setAuthModalOpen(true);
                  }}
                  className="text-sm font-semibold text-white/80 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Transport official? Request City Admin access
                </button>
              </div>
            </div>

            {/* Right Visual Composition — DUAL-PHONE MOCKUPS */}
            <div className="lg:col-span-6 relative min-h-[420px] flex items-center justify-center pt-8 lg:pt-0">
              {/* BACK PHONE: Rotated -12deg */}
              <div className="absolute right-4 sm:right-12 top-4 w-72 sm:w-80 h-[460px] bg-slate-900 rounded-[2.8rem] border-4 border-slate-800 p-3 shadow-2xl rotate-[-12deg] z-0 opacity-90 hidden sm:block pointer-events-none">
                <div className="w-full h-full bg-[#f4effc] rounded-[2.2rem] overflow-hidden flex flex-col p-4 relative">
                  {/* SVG Live Bus Route Mockup */}
                  <div className="text-[11px] font-bold text-[#7847CB] flex items-center justify-between mb-2">
                    <span>LIVE BUS RADAR</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <div className="flex-1 bg-white rounded-xl border border-purple-100 p-3 relative overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 200 240" fill="none">
                      <path d="M20 30 C 80 40, 120 100, 60 160 C 20 200, 150 210, 180 220" stroke="#7847CB" strokeWidth="4" strokeDasharray="6 6" />
                      <circle cx="60" cy="160" r="10" fill="#7847CB" fillOpacity="0.2" className="animate-ping" />
                      <circle cx="60" cy="160" r="6" fill="#7847CB" />
                      <circle cx="180" cy="220" r="5" fill="#10b981" />
                    </svg>
                    <div className="absolute top-12 left-4 bg-white/95 backdrop-blur-xs p-2 rounded-lg border border-purple-100 shadow-sm text-[10px]">
                      <span className="font-bold text-neutral-900 block">BUS AH-24</span>
                      <span className="text-emerald-600 font-semibold">ETA: 4 mins</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FRONT PHONE: Relative z-10 with DYNAMIC ISLAND */}
              <div className="relative z-10 w-72 sm:w-80 bg-white rounded-[2.8rem] border-8 border-slate-900 p-3 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] text-neutral-900">
                {/* DYNAMIC ISLAND NOTCH */}
                <div className="w-28 h-5 bg-slate-900 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-800 mr-2" />
                  <div className="w-2 h-2 rounded-full bg-indigo-900" />
                </div>

                {/* Phone Interior Header */}
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#7847CB] text-white flex items-center justify-center font-bold text-xs">
                      <Bus className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-extrabold text-neutral-900">Ahilyanagar Bus</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                    Live Updates
                  </span>
                </div>

                {/* Filter Pills */}
                <div className="flex gap-1.5 my-3">
                  <span className="px-3 py-1 rounded-full bg-[#7847CB] text-white text-[10px] font-bold">All</span>
                  <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-semibold">Nearby</span>
                  <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-semibold">On Route</span>
                </div>

                {/* Realistic Passenger Bus Cards */}
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-2xl bg-[#F8F8FA] border border-neutral-200/60 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-neutral-900">AH-24</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-[#7847CB] font-bold">Express</span>
                      </div>
                      <span className="text-[11px] text-neutral-500 block mt-0.5">Central Bus Stand ➔ Savedi</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-[#7847CB]">4 min</span>
                      <span className="text-[9px] text-emerald-600 font-bold block">Arriving</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#F8F8FA] border border-neutral-200/60 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-neutral-900">AH-07</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">Local</span>
                      </div>
                      <span className="text-[11px] text-neutral-500 block mt-0.5">CIDCO ➔ Market Yard</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-neutral-900">8 min</span>
                      <span className="text-[9px] text-neutral-500 block">On Time</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#F8F8FA] border border-neutral-200/60 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-neutral-900">AH-12</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">Shuttle</span>
                      </div>
                      <span className="text-[11px] text-neutral-500 block mt-0.5">Nehru Arts College ➔ CBS</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-neutral-900">11 min</span>
                      <span className="text-[9px] text-neutral-500 block">On Time</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PART 5 — TRANSPORTATION STATS */}
        <section className="bg-white rounded-[2.5rem] p-8 border border-neutral-200/80 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x-0 md:divide-x divide-neutral-100">
            <div className="p-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 block tracking-tight">2L+</span>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mt-1 block">Daily Passengers</span>
            </div>
            <div className="p-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#7847CB] block tracking-tight">150+</span>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mt-1 block">Active City Buses</span>
            </div>
            <div className="p-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 block tracking-tight">25+</span>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mt-1 block">Operational Routes</span>
            </div>
            <div className="p-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 block tracking-tight">98%</span>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mt-1 block">On-Time Service</span>
            </div>
          </div>
        </section>

        {/* PART 6 — FEATURE GRID */}
        <section id="features" className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#7847CB] bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
              City Transit Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
              Designed for modern urban commuters
            </h2>
            <p className="text-sm text-neutral-500">
              Everything you need for seamless bus travel across Ahilyanagar in one intuitive app.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group bg-white p-8 rounded-[2.5rem] border border-neutral-200/80 hover:bg-[#F8F8FA] transition duration-300 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#7847CB] flex items-center justify-center group-hover:scale-110 transition duration-300">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Live Bus Tracking</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Track bus locations in real time with high precision GPS telemetry and accurate ETAs for every stop.
              </p>
            </div>

            <div className="group bg-white p-8 rounded-[2.5rem] border border-neutral-200/80 hover:bg-[#F8F8FA] transition duration-300 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition duration-300">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Smart Routes</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Find optimal multi-stop journey options, transfers, schedules, and route timings across Ahilyanagar.
              </p>
            </div>

            <div className="group bg-white p-8 rounded-[2.5rem] border border-neutral-200/80 hover:bg-[#F8F8FA] transition duration-300 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition duration-300">
                <Ticket className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Digital Tickets</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Purchase instant single tickets or multi-ride passes digitally via UPI and cash-free payment options.
              </p>
            </div>

            <div className="group bg-white p-8 rounded-[2.5rem] border border-neutral-200/80 hover:bg-[#F8F8FA] transition duration-300 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition duration-300">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Bus Passes</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Apply for monthly student, senior citizen, or regular commuter passes with digital QR verification.
              </p>
            </div>

            <div className="group bg-white p-8 rounded-[2.5rem] border border-neutral-200/80 hover:bg-[#F8F8FA] transition duration-300 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#7847CB] flex items-center justify-center group-hover:scale-110 transition duration-300">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">Real-Time Alerts</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Get immediate notifications on service delays, traffic detours, and municipal transport announcements.
              </p>
            </div>

            <div className="group bg-white p-8 rounded-[2.5rem] border border-neutral-200/80 hover:bg-[#F8F8FA] transition duration-300 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#7847CB] text-white flex items-center justify-center group-hover:scale-110 transition duration-300">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">QR Verification</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Conductor optical QR scanner for instant ticket and bus pass verification on board every bus.
              </p>
            </div>
          </div>
        </section>

        {/* PART 7 — DARK FEATURE SECTION (SMART TRANSIT JOURNEY PLANNER) */}
        <section
          id="smart-transit"
          className="relative bg-neutral-900 bg-gradient-to-br from-neutral-800/50 to-transparent rounded-[2.5rem] p-8 sm:p-12 lg:p-16 text-white overflow-hidden shadow-2xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Description */}
            <div className="lg:col-span-6 space-y-6">
              <span className="px-3.5 py-1 rounded-full bg-[#7847CB]/20 border border-[#7847CB]/40 text-purple-300 text-xs font-bold uppercase tracking-wider inline-block">
                Smart Journey Tools
              </span>

              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Plan trips effortlessly with intelligent schedule matching
              </h2>

              <p className="text-neutral-400 text-base leading-relaxed">
                Enter your starting point and destination to compare direct routes, departure times, fares, and total travel durations across all active municipal buses.
              </p>

              <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Direct Bus Routes
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Live Traffic Adjustment
                </span>
              </div>
            </div>

            {/* Right Interactive Journey Planner Widget */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-md bg-white rounded-3xl p-6 text-neutral-900 shadow-2xl rotate-3 hover:rotate-0 transition duration-300 border border-neutral-100">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-4">
                  <span className="text-xs font-bold text-[#7847CB] uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-4 h-4" /> Journey Planner
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                    Fastest Connection
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-neutral-500 font-bold mb-1">From Boarding Stop</label>
                    <div className="p-3 rounded-xl bg-[#F8F8FA] border border-neutral-200 font-bold text-neutral-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#7847CB]" /> Central Bus Stand (CBS)
                    </div>
                  </div>

                  <div>
                    <label className="block text-neutral-500 font-bold mb-1">To Destination Stop</label>
                    <div className="p-3 rounded-xl bg-[#F8F8FA] border border-neutral-200 font-bold text-neutral-900 flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-emerald-600" /> Savedi Terminal
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-center">
                      <span className="text-[9px] text-purple-700 font-bold block">DURATION</span>
                      <span className="text-sm font-black text-neutral-900">12 min</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-center">
                      <span className="text-[9px] text-purple-700 font-bold block">FARE</span>
                      <span className="text-sm font-black text-neutral-900">₹20</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-center">
                      <span className="text-[9px] text-purple-700 font-bold block">TYPE</span>
                      <span className="text-sm font-black text-neutral-900">Direct</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="w-full py-3.5 rounded-xl bg-[#7847CB] hover:bg-[#6436ab] text-white font-bold text-xs transition shadow-md mt-2 flex items-center justify-center gap-1.5"
                  >
                    <span>View Scheduled Departures</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PART 8 — LIVE MAP FEATURE */}
        <section id="live-map" className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Large Map Visual */}
          <div className="lg:col-span-7">
            <div className="aspect-[4/3] w-full rounded-[2.5rem] bg-white border border-neutral-200 shadow-xl overflow-hidden relative p-4 flex flex-col justify-between">
              {/* Map Canvas Background Simulation */}
              <div className="absolute inset-0 bg-[#f1f5f9] pointer-events-none">
                <svg className="w-full h-full opacity-60" viewBox="0 0 600 450">
                  <path d="M-50 100 Q 250 50, 300 220 T 650 350" fill="none" stroke="#cbd5e1" strokeWidth="12" />
                  <path d="M100 450 Q 200 200, 450 150 T 650 50" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <path d="M-50 100 Q 250 50, 300 220 T 650 350" fill="none" stroke="#7847CB" strokeWidth="5" strokeDasharray="8 8" />
                  
                  {/* Active bus marker */}
                  <circle cx="300" cy="220" r="18" fill="#7847CB" fillOpacity="0.25" className="animate-ping" />
                  <circle cx="300" cy="220" r="10" fill="#7847CB" />
                  <circle cx="300" cy="220" r="4" fill="#ffffff" />

                  {/* Stops */}
                  <circle cx="120" cy="80" r="6" fill="#171717" />
                  <circle cx="480" cy="300" r="6" fill="#171717" />
                </svg>
              </div>

              {/* Floating Map Tooltip: "Bus Arriving" */}
              <div className="relative z-10 self-center bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-neutral-200 shadow-lg flex items-center gap-3 animate-bounce">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">Bus AH-24 Arriving</span>
                  <span className="text-[10px] text-neutral-500">Savedi Stop • 350 meters away</span>
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-between text-xs bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-neutral-200">
                <span className="font-bold text-neutral-800">Live GPS Radar Sync</span>
                <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Operational
                </span>
              </div>
            </div>
          </div>

          {/* Right Text Content */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-[#7847CB] bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
              Live Fleet Telemetry
            </span>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight leading-tight">
              Know where your bus is before you leave home
            </h2>

            <p className="text-neutral-500 text-sm leading-relaxed">
              No more waiting uncertainly at bus stops. Access live location updates, vehicle occupancy status, and actual arrival predictions.
            </p>

            <div className="space-y-3 pt-2">
              {[
                'Real-time GPS vehicle locations',
                'Accurate ETAs adjusted for city traffic',
                'Complete route stop visibility',
                'Nearby stop locator with walking directions',
                'Instant detour and emergency service alerts',
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm font-semibold text-neutral-800">
                  <div className="w-5 h-5 rounded-full bg-purple-100 text-[#7847CB] flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PART 9 — TESTIMONIALS */}
        <section className="space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-3xl font-extrabold text-neutral-900 tracking-tight">Trusted by daily commuters</h2>
            <p className="text-sm text-neutral-500">Hear from commuters travelling across Ahilyanagar daily.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-50 p-8 rounded-[2.5rem] border border-neutral-200/80 space-y-4">
              <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-neutral-700 leading-relaxed italic">
                “Live tracking has completely changed my daily morning commute from Savedi to Central Stand. I know exactly when to step out of my house!”
              </p>
              <div className="flex items-center gap-3 pt-2">
                <div className="w-10 h-10 rounded-full bg-[#7847CB] text-white font-bold flex items-center justify-center text-sm">
                  AP
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">Aniket Patil</h4>
                  <span className="text-xs text-neutral-500">Daily Commuter • Student</span>
                </div>
              </div>
            </div>

            <div className="bg-[#7847CB]/5 p-8 rounded-[2.5rem] border border-[#7847CB]/20 space-y-4">
              <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-neutral-700 leading-relaxed italic">
                “Digital bus pass verification makes boarding so smooth. The conductor just scans my pass QR code in seconds!”
              </p>
              <div className="flex items-center gap-3 pt-2">
                <div className="w-10 h-10 rounded-full bg-[#7847CB] text-white font-bold flex items-center justify-center text-sm">
                  SK
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">Sunita Kulkarni</h4>
                  <span className="text-xs text-neutral-500">Monthly Pass Holder</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PART 10 — FINAL CTA BANNER */}
        <section className="bg-[#7847CB] rounded-[2.5rem] text-white p-8 sm:p-12 lg:p-16 text-center space-y-6 shadow-xl shadow-[#7847CB]/20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 600 300">
              <path d="M-50 150 C 150 50, 450 250, 650 150" stroke="#ffffff" strokeWidth="6" strokeDasharray="10 10" />
            </svg>
          </div>

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Start Your Journey Today
            </h2>
            <p className="text-purple-100 text-base">
              Experience fast, reliable, and modern digital public transportation in Ahilyanagar.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <button
                onClick={() => {
                  setMode('register');
                  setIsRequestingAdmin(false);
                  setAuthModalOpen(true);
                }}
                className="px-8 py-4 rounded-2xl bg-white hover:bg-neutral-100 text-[#7847CB] font-extrabold text-base transition duration-300 shadow-lg"
              >
                Create Account
              </button>
              <button
                onClick={() => {
                  setMode('login');
                  setAuthModalOpen(true);
                }}
                className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-base transition duration-300"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setMode('register');
                  setIsRequestingAdmin(true);
                  setAuthModalOpen(true);
                }}
                className="px-8 py-4 rounded-2xl bg-[#7847CB] text-white hover:bg-[#6436ab] font-bold text-base transition duration-300 shadow-lg border border-[#6436ab] mt-2 sm:mt-0"
              >
                Apply for City Admin Partner
              </button>
            </div>
          </div>
        </section>

        {/* PART 11 — FOOTER */}
        <footer className="border-t border-neutral-200/80 pt-10 pb-16 text-xs text-neutral-500 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#7847CB] text-white flex items-center justify-center font-bold text-xs">
                <Bus className="w-4 h-4" />
              </div>
              <span className="font-bold text-neutral-900 text-sm">Ahilyanagar City Bus</span>
            </div>

            <div className="flex gap-6 font-medium text-neutral-600">
              <button onClick={() => scrollToSection('hero')} className="hover:text-[#7847CB]">Home</button>
              <button onClick={() => scrollToSection('features')} className="hover:text-[#7847CB]">Routes</button>
              <button onClick={() => scrollToSection('live-map')} className="hover:text-[#7847CB]">Live Tracking</button>
              <button onClick={() => setAuthModalOpen(true)} className="hover:text-[#7847CB]">Tickets & Passes</button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-neutral-100 pt-6">
            <span>© {new Date().getFullYear()} Ahilyanagar Municipal Transport Undertaking. All rights reserved.</span>
            <span>Official Smart City Transit Infrastructure v2.4</span>
          </div>
        </footer>
      </div>

      {/* AUTHENTICATION & DEMO ROLE MODAL */}
      {authModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-neutral-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-2xl font-extrabold text-neutral-900">
                {isRequestingAdmin 
                  ? 'City Admin Partner Request'
                  : mode === 'login' 
                  ? 'Sign in to Ahilyanagar City Bus' 
                  : 'Create Commuter Account'}
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                {isRequestingAdmin
                  ? 'Partner with us to manage municipal transit operations.'
                  : 'Access tickets, live tracking, and role-based transit tools.'}
              </p>
            </div>

            {/* Role Selection Tabs */}
            {!isRequestingAdmin && (
              <div className="flex bg-[#F8F8FA] p-1 rounded-xl border border-neutral-200">
                {(['PASSENGER', 'DRIVER', 'ADMIN'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedDemoRole(r)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      selectedDemoRole === r
                        ? 'bg-[#7847CB] text-white shadow-md'
                        : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4 text-xs mt-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#F8F8FA] border border-neutral-300 rounded-xl text-sm font-medium focus:outline-none focus:border-[#7847CB]"
                  />
                </div>
              )}

              <div>
                <label className="block text-neutral-700 font-bold mb-1">Email or Phone</label>
                <input
                  type="text"
                  required
                  placeholder="Enter email or phone"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  className="w-full px-3.5 py-3 bg-[#F8F8FA] border border-neutral-300 rounded-xl text-sm font-medium focus:outline-none focus:border-[#7847CB]"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1 flex items-center justify-between">
                  <span>Password</span>
                  {mode === 'login' && (
                    <span className="text-[#7847CB] cursor-pointer hover:underline">Forgot?</span>
                  )}
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-3 bg-[#F8F8FA] border border-neutral-300 rounded-xl text-sm font-medium focus:outline-none focus:border-[#7847CB]"
                />
              </div>



              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100">
                  {errorMsg}
                </div>
              )}

              {mode === 'login' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-[#7847CB] focus:ring-[#7847CB]"
                  />
                  <label htmlFor="remember" className="text-neutral-500 font-medium">
                    Remember me
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#7847CB] hover:bg-[#6436ab] text-white font-bold text-sm transition shadow-md shadow-[#7847CB]/20 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : mode === 'login' ? (
                  'Sign In to Dashboard'
                ) : isRequestingAdmin ? (
                  'Submit Application'
                ) : (
                  'Create Free Account'
                )}
              </button>
            </form>

            <div className="text-center text-xs text-neutral-500 border-t border-neutral-100 pt-3">
              {mode === 'login' ? (
                <p>
                  Don’t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setIsRequestingAdmin(false);
                    }}
                    className="text-[#7847CB] font-bold hover:underline"
                  >
                    Register as Commuter
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setIsRequestingAdmin(false);
                    }}
                    className="text-[#7847CB] font-bold hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;

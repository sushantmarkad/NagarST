import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { LanguageToggle } from '../components/common/LanguageToggle';
import {
  Phone,
  Mail,
  CreditCard,
  Ticket as TicketIcon,
  Heart,
  HelpCircle,
  LogOut,
  ChevronRight,
  Leaf,
  ShieldAlert,
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { t } = useLanguage();
  const { tickets, passes, favorites } = useApp();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [requestStatus, setRequestStatus] = useState<string>('NONE');
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      checkRequestStatus();
    }
  }, [user]);

  const checkRequestStatus = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('admin_request_status')
      .eq('id', user?.id)
      .single();
    if (data) {
      setRequestStatus(data.admin_request_status || 'NONE');
    }
  };

  const handleRequestAdmin = async () => {
    setIsRequesting(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ admin_request_status: 'PENDING' })
        .eq('id', user?.id);
        
      if (error) throw error;
      setRequestStatus('PENDING');
      alert('Request sent successfully! A Super Admin will review it shortly.');
    } catch (err: any) {
      alert(`Error requesting access: ${err.message}`);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Summary */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0f3c5c] text-white font-extrabold text-2xl flex items-center justify-center shadow-md">
            AP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900">{user?.name || 'Passenger'}</h2>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role === 'CITY_ADMIN' ? 'City Admin' : 'Verified Citizen'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> {user?.email}
              </span>
            </p>
            <span className="text-[11px] font-mono text-slate-400 block mt-1 truncate max-w-[200px]">
              ID: {user?.id}
            </span>
          </div>
        </div>

        {/* Travel Stats Metrics */}
        {user?.role === 'CITY_ADMIN' ? (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Managed Fleet</span>
              <span className="font-extrabold text-slate-900 text-lg">Active</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Live Routes</span>
              <span className="font-extrabold text-[#7847CB] text-lg">Active</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">City Scope</span>
              <span className="font-extrabold text-emerald-700 text-lg">Full</span>
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Trips Taken</span>
              <span className="font-extrabold text-slate-900 text-lg">48</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Pass Savings</span>
              <span className="font-extrabold text-emerald-700 text-lg">₹420</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">CO₂ Reduced</span>
              <span className="font-extrabold text-[#0f3c5c] text-lg flex items-center justify-center gap-1">
                <Leaf className="w-4 h-4 text-emerald-600" />
                14.2 kg
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Menu Options List */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
        <h3 className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          {user?.role === 'CITY_ADMIN' ? 'Administrative Access' : 'Account & Transit Shortcuts'}
        </h3>

        {user?.role === 'CITY_ADMIN' ? (
          [
            { label: 'Admin Dashboard', icon: ShieldAlert, path: '/admin/dashboard' },
            { label: 'Manage Routes', icon: ChevronRight, path: '/admin/dashboard' },
            { label: 'Manage Fleet', icon: ChevronRight, path: '/admin/dashboard' },
          ].map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <button
                key={idx}
                onClick={() => navigate(item.path)}
                className="w-full p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between transition-colors text-left text-xs font-semibold text-slate-800 border-b border-slate-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 text-[#7847CB]">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            );
          })
        ) : (
          [
            { label: t('My Active Digital Tickets', 'माझे सक्रिय तिकिटे'), icon: TicketIcon, path: '/app/tickets', count: tickets.length },
            { label: t('My Bus Passes', 'माझे बस पास'), icon: CreditCard, path: '/app/passes', count: passes.length },
            { label: t('Saved Favorite Stops', 'आवडते थांबे'), icon: Heart, path: '/app/favorites', count: favorites.length },
            { label: t('Help & Feedback Support', 'मदत आणि तक्रार निवारण'), icon: HelpCircle, path: '/app/help' },
          ].map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <button
                key={idx}
                onClick={() => navigate(item.path)}
                className="w-full p-3 rounded-xl hover:bg-slate-50 flex items-center justify-between transition-colors text-left text-xs font-semibold text-slate-800 border-b border-slate-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.count !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                      {item.count}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Preferences & Language */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          App Settings & Language
        </h3>

        <div className="flex items-center justify-between text-xs font-semibold text-slate-800 pt-1">
          <span>{t('Dashboard Display Language', 'अ‍ॅप भाषा बदल')}</span>
          <LanguageToggle />
        </div>
      </div>



      {/* Role Portal Access Link */}
      <button
        onClick={() => navigate('/login')}
        className="w-full py-3 bg-[#0f3c5c] hover:bg-[#0c314b] text-white font-bold text-xs rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-xs"
      >
        <LogOut className="w-4 h-4" />
        <span>Switch Role / Official Staff Login Portal</span>
      </button>

      {/* Logout button */}
      <button
        onClick={logout}
        className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-2xl border border-rose-200 transition-colors flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        <span>{t('Log Out Account', 'खात्यातून बाहेर पडा')}</span>
      </button>
    </div>
  );
};

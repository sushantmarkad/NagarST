import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { useToast, useConfirm } from '../context/FeedbackContext';
import { supabase } from '../utils/supabaseClient';
import {
  User as UserIcon,
  Mail,
  ShieldCheck,
  CreditCard,
  Ticket as TicketIcon,
  Heart,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Leaf,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { tickets, passes, favorites } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const [requestStatus, setRequestStatus] = useState<string>('NONE');
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  useEffect(() => {
    if (user?.id) {
      checkRequestStatus();
    }
  }, [user]);

  const checkRequestStatus = async () => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('admin_request_status')
        .eq('id', user?.id)
        .single();
      if (data) {
        setRequestStatus(data.admin_request_status || 'NONE');
      }
    } catch {
      // Ignored for demo users
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
      toast.success(
        t(
          'Request sent successfully! A Super Admin will review your application shortly.',
          'विनंती पाठवली आहे! सुपर अ‍ॅडमीन लवकरच पडताळणी करतील.'
        ),
        t('Application Submitted', 'अर्ज सादर झाला')
      );
    } catch (err: any) {
      toast.error(err.message || 'Error requesting administrative access.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSignOut = async () => {
    const isConfirmed = await confirm({
      title: t('Sign Out Account', 'खात्यातून बाहेर पडा'),
      message: t('Are you sure you want to sign out?', 'तुम्हाला खात्यातून बाहेर पडायचे आहे का?'),
      confirmText: t('Sign Out', 'बाहेर पडा'),
      isDestructive: false,
    });
    if (isConfirmed) {
      logout();
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      
      {/* 1. PROFILE HEADER CARD */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#7847CB] text-white font-black text-2xl flex items-center justify-center shadow-md shadow-[#7847CB]/25 shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AP'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg md:text-xl font-extrabold text-slate-900 truncate">
                  {user?.name || 'Ahilyanagar Passenger'}
                </h2>
                <Badge variant={user?.role === 'SUPER_ADMIN' ? 'danger' : user?.role === 'CITY_ADMIN' ? 'brand' : 'success'} size="sm">
                  {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role === 'CITY_ADMIN' ? 'City Admin' : 'Verified Citizen'}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{user?.email || 'citizen@ahilyanagar.gov.in'}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                ID: {user?.id}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <LanguageToggle />
          </div>
        </div>

        {/* Impact / Commute Statistics */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              {t('Trips Taken', 'एकूण प्रवास')}
            </span>
            <span className="font-black text-slate-900 text-base md:text-lg tabular-nums">48</span>
          </div>

          <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100/80">
            <span className="text-[#7847CB] block text-[10px] uppercase font-bold tracking-wider">
              {t('Pass Savings', 'बचत')}
            </span>
            <span className="font-black text-[#7847CB] text-base md:text-lg tabular-nums">₹420</span>
          </div>

          <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/80">
            <span className="text-emerald-700 block text-[10px] uppercase font-bold tracking-wider">
              {t('CO₂ Offset', 'पर्यावरण बचत')}
            </span>
            <span className="font-black text-emerald-700 text-base md:text-lg flex items-center justify-center gap-1">
              <Leaf className="w-3.5 h-3.5" /> 14.2 kg
            </span>
          </div>
        </div>
      </div>

      {/* 2. ADMIN ROLE REQUEST BANNER (If Passenger) */}
      {user?.role === 'PASSENGER' && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#7847CB]" />
              <h4 className="text-xs font-bold text-slate-900">
                {t('Transit Official / Staff Portal Access', 'अधिकारी व कर्मचारी प्रवेश')}
              </h4>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-md">
              {requestStatus === 'PENDING'
                ? t('Your official administrative access application is currently pending review by System Root.', 'तुमचा प्रशासकीय अर्ज तपासणीसाठी प्रलंबित आहे.')
                : t('Request verified municipal administrator privileges to manage routes, buses, and schedules.', 'मार्ग, बसेस व वेळापत्रक व्यवस्थापनासाठी प्रशासक अधिकारांची विनंती करा.')}
            </p>
          </div>

          <div className="shrink-0">
            {requestStatus === 'PENDING' ? (
              <Badge variant="warning" size="md">
                {t('Pending Approval', 'तपासणी प्रलंबित')}
              </Badge>
            ) : (
              <Button
                size="sm"
                variant="primary"
                onClick={handleRequestAdmin}
                isLoading={isRequesting}
              >
                {t('Request Admin Role', 'प्रशासक विनंती करा')}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 3. TRANSIT SHORTCUTS LIST */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
        <h3 className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          {t('Transit & Account Shortcuts', 'वाहतूक व खाते पर्याय')}
        </h3>

        {[
          { label: t('My Active Digital Tickets', 'माझे सक्रिय तिकिटे'), icon: TicketIcon, path: '/app/tickets', count: tickets.length },
          { label: t('My Bus Passes', 'माझे बस पास'), icon: CreditCard, path: '/app/passes', count: passes.length },
          { label: t('Saved Favorite Stops', 'आवडते थांबे'), icon: Heart, path: '/app/favorites', count: favorites.length },
          { label: t('Help & Feedback Support', 'मदत आणि तक्रार निवारण'), icon: HelpCircle, path: '/app/help' },
        ].map((item, idx) => {
          const IconComponent = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => navigate(item.path)}
              className="w-full p-3 rounded-2xl hover:bg-slate-50 flex items-center justify-between transition-colors text-left text-xs font-semibold text-slate-800 border-b border-slate-50 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-50 text-[#7847CB]">
                  <IconComponent className="w-4 h-4" />
                </div>
                <span>{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.count !== undefined && item.count > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-[#7847CB] font-bold text-[11px]">
                    {item.count}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          );
        })}
      </div>

      {/* 4. ACTIONS */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/login')}
          leftIcon={<LogOut className="w-4 h-4 text-[#7847CB]" />}
        >
          {t('Switch Role / Staff Portal', 'भूमिका बदला / कर्मचारी पोर्टल')}
        </Button>

        <Button
          variant="destructive"
          className="w-full"
          onClick={handleSignOut}
          leftIcon={<LogOut className="w-4 h-4" />}
        >
          {t('Log Out Account', 'खात्यातून बाहेर पडा')}
        </Button>
      </div>

    </div>
  );
};

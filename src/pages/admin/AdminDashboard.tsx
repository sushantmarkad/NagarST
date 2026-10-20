import React, { useState, useEffect } from 'react';
import { AdminDashboardLayout, type AdminView } from './AdminDashboardLayout';
import { AdminOverview } from './views/AdminOverview';
import { AdminLiveFleet } from './views/AdminLiveFleet';
import { AdminRouteMgmt } from './views/AdminRouteMgmt';
import { AdminBuses } from './views/AdminBuses';
import { AdminFleetStaffMgmt } from './views/AdminFleetStaffMgmt';
import { AdminAnalytics } from './views/AdminAnalytics';
import { AdminAIInsights } from './views/AdminAIInsights';
import { AdminIncidentsAnnouncements } from './views/AdminIncidentsAnnouncements';
import { AdminDataCleanup } from './views/AdminDataCleanup';
import { AdminDemoSimulator } from './views/AdminDemoSimulator';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';

interface AdminDashboardProps {
  defaultView?: AdminView;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ defaultView = 'overview' }) => {
  const getInitialView = (): AdminView => {
    const hash = window.location.hash.replace('#', '') as AdminView;
    return hash || defaultView;
  };

  const [currentView, setCurrentView] = useState<AdminView>(getInitialView);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as AdminView;
      if (hash && hash !== currentView) {
        setCurrentView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentView]);

  const handleSelectView = (view: AdminView) => {
    setCurrentView(view);
    window.location.hash = view;
  };

  const renderViewContent = () => {
    switch (currentView) {
      case 'overview':
        return <AdminOverview onNavigateView={handleSelectView} />;
      case 'live_fleet':
        return <AdminLiveFleet />;
      case 'demo_simulator':
        return <AdminDemoSimulator />;
      case 'routes':
        return <AdminRouteMgmt />;
      case 'buses':
        return <AdminBuses />;
      case 'drivers':
        return <AdminFleetStaffMgmt viewType="drivers" />;
      case 'conductors':
        return <AdminFleetStaffMgmt viewType="conductors" />;
      case 'schedules':
        return <AdminFleetStaffMgmt viewType="schedules" />;
      case 'tickets_passes':
        return <AdminFleetStaffMgmt viewType="tickets_passes" />;
      case 'analytics':
        return <AdminAnalytics />;
      case 'ai_insights':
        return <AdminAIInsights />;
      case 'incidents':
        return <AdminIncidentsAnnouncements modeType="incidents" />;
      case 'announcements':
        return <AdminIncidentsAnnouncements modeType="announcements" />;
      case 'data_cleanup':
        return <AdminDataCleanup />;
      default:
        return <AdminOverview onNavigateView={handleSelectView} />;
    }
  };

  const { user } = useAuth();

  return (
    <AdminDashboardLayout currentView={currentView} onSelectView={handleSelectView}>
      {user?.role === 'SUPER_ADMIN' && (
        <div className="bg-[#7847CB] text-white px-4 py-2.5 flex items-center justify-between text-xs font-semibold shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-200" />
            <span>Root Super Admin Session Active • Currently viewing Fleet Admin</span>
          </div>
          <Link
            to="/super-admin"
            className="bg-white text-[#7847CB] px-3 py-1 rounded-lg text-xs font-bold hover:bg-purple-50 transition flex items-center gap-1.5 shadow-xs"
          >
            <span>Open Super Admin Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
      {renderViewContent()}
    </AdminDashboardLayout>
  );
};

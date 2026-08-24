import React, { useState } from 'react';
import { AdminDashboardLayout, type AdminView } from './AdminDashboardLayout';
import { AdminOverview } from './views/AdminOverview';
import { AdminLiveFleet } from './views/AdminLiveFleet';
import { AdminRouteMgmt } from './views/AdminRouteMgmt';
import { AdminBuses } from './views/AdminBuses';
import { AdminFleetStaffMgmt } from './views/AdminFleetStaffMgmt';
import { AdminAnalytics } from './views/AdminAnalytics';
import { AdminAIInsights } from './views/AdminAIInsights';
import { AdminIncidentsAnnouncements } from './views/AdminIncidentsAnnouncements';

interface AdminDashboardProps {
  defaultView?: AdminView;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ defaultView = 'overview' }) => {
  const [currentView, setCurrentView] = useState<AdminView>(defaultView);

  const renderViewContent = () => {
    switch (currentView) {
      case 'overview':
        return <AdminOverview />;
      case 'live_fleet':
        return <AdminLiveFleet />;
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
      default:
        return <AdminOverview />;
    }
  };

  return (
    <AdminDashboardLayout currentView={currentView} onSelectView={setCurrentView}>
      {renderViewContent()}
    </AdminDashboardLayout>
  );
};

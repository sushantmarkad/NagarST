import React, { type ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { type UserRole } from '../../data/mockAuth';
import { SharedLayout, type NavItem } from '../../components/layout/SharedLayout';
import {
  LayoutDashboard,
  MapPin,
  Bus,
  Route,
  Calendar,
  Users,
  UserCheck,
  Building,
  AlertTriangle,
  Megaphone,
  BarChart3,
  Sparkles
} from 'lucide-react';

export type AdminView =
  | 'overview'
  | 'live_fleet'
  | 'buses'
  | 'routes'
  | 'schedules'
  | 'drivers'
  | 'conductors'
  | 'passengers'
  | 'tickets_passes'
  | 'incidents'
  | 'analytics'
  | 'ai_insights'
  | 'announcements'
  | 'settings';

interface AdminLayoutProps {
  currentView: AdminView;
  onSelectView: (view: AdminView) => void;
  children: ReactNode;
}

export const AdminDashboardLayout: React.FC<AdminLayoutProps> = ({ currentView, onSelectView, children }) => {
  const { user } = useAuth();

  const getRoleTitle = (role?: UserRole) => {
    switch (role) {
      case 'CITY_ADMIN': return 'Ahilyanagar Municipal City Admin';
      case 'SUPER_ADMIN': return 'System Root Super Admin';
      case 'OPERATIONS_MANAGER': return 'Operations Dispatch Manager';
      default: return 'Transit Undertaking Authority';
    }
  };

  const allNavItems: { view: AdminView; label: string; icon: any; allowedRoles?: UserRole[] }[] = [
    { view: 'overview', label: 'Operations Overview', icon: LayoutDashboard },
    { view: 'live_fleet', label: 'Live Fleet Radar', icon: MapPin },
    { view: 'buses', label: 'Vehicle Fleet', icon: Bus, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN'] },
    { view: 'routes', label: 'Route Corridors', icon: Route, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN'] },
    { view: 'schedules', label: 'Timetables & Shifts', icon: Calendar, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER'] },
    { view: 'drivers', label: 'Driver Crew', icon: Users, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN'] },
    { view: 'conductors', label: 'Conductor Staff', icon: UserCheck, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN'] },
    { view: 'incidents', label: 'Incident Desk', icon: AlertTriangle },
    { view: 'announcements', label: 'Passenger Alerts', icon: Megaphone },
    { view: 'analytics', label: 'Transit Analytics', icon: BarChart3 },
    { view: 'ai_insights', label: 'AI Optimization', icon: Sparkles },
  ];

  const filteredNav = allNavItems.filter((item) => {
    if (!item.allowedRoles) return true;
    return user?.role && item.allowedRoles.includes(user.role);
  });

  const navItems: NavItem[] = filteredNav.map(item => ({
    id: item.view,
    label: item.label,
    icon: item.icon,
    onClick: () => onSelectView(item.view),
    isActive: currentView === item.view
  }));

  return (
    <SharedLayout
      navItems={navItems}
      title="Municipal Admin Workspace"
      subtitle={getRoleTitle(user?.role)}
      headerIcon={Building}
    >
      <div className="flex-1 w-full h-full flex flex-col min-h-0 relative overflow-hidden">
        {children}
      </div>
    </SharedLayout>
  );
};

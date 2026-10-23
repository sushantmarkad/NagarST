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
  Sparkles,
  Play,
  Trash2,
  ShieldCheck,
  IndianRupee
} from 'lucide-react';

export type AdminView =
  | 'overview'
  | 'live_fleet'
  | 'buses'
  | 'routes'
  | 'fare_matrix'
  | 'schedules'
  | 'drivers'
  | 'conductors'
  | 'passengers'
  | 'tickets_passes'
  | 'incidents'
  | 'analytics'
  | 'ai_insights'
  | 'announcements'
  | 'settings'
  | 'demo_simulator'
  | 'data_cleanup';

interface AdminLayoutProps {
  currentView: AdminView;
  onSelectView: (view: AdminView) => void;
  children: ReactNode;
}

export const AdminDashboardLayout: React.FC<AdminLayoutProps> = ({ currentView, onSelectView, children }) => {
  const { user } = useAuth();

  const getRoleTitle = (role?: UserRole) => {
    switch (role) {
      case 'CITY_ADMIN': return 'NagarST City Admin';
      case 'SUPER_ADMIN': return 'System Root Super Admin';
      case 'OPERATIONS_MANAGER': return 'Operations Dispatch Manager';
      default: return 'Transit Undertaking Authority';
    }
  };

  const allNavItems: { view: AdminView; label: string; icon: any; allowedRoles?: UserRole[] }[] = [
    { view: 'overview', label: 'Operations Overview', icon: LayoutDashboard },
    { view: 'live_fleet', label: 'Live Fleet Radar', icon: MapPin },
    { view: 'demo_simulator', label: 'GPS Demo Simulator', icon: Play, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER'] },
    { view: 'buses', label: 'Vehicle Fleet', icon: Bus, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN'] },
    { view: 'routes', label: 'Route Corridors', icon: Route, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN'] },
    { view: 'fare_matrix', label: 'Stop Fares & Pricing', icon: IndianRupee, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER', 'FINANCE_MANAGER', 'CONTROL_ROOM'] },
    { view: 'schedules', label: 'Timetables & Shifts', icon: Calendar, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER'] },
    { view: 'drivers', label: 'Driver Crew', icon: Users, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN'] },
    { view: 'conductors', label: 'Conductor Staff', icon: UserCheck, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN'] },
    { view: 'incidents', label: 'Incident Desk', icon: AlertTriangle },
    { view: 'announcements', label: 'Passenger Alerts', icon: Megaphone },
    { view: 'analytics', label: 'Transit Analytics', icon: BarChart3 },
    { view: 'ai_insights', label: 'AI Optimization', icon: Sparkles },
    { view: 'data_cleanup', label: 'System Data Reset', icon: Trash2, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN'] },
  ];

  const filteredNav = allNavItems.filter((item) => {
    if (!item.allowedRoles) return true;
    if (!user?.role) return true;
    return item.allowedRoles.includes(user.role);
  });

  const navItems: NavItem[] = filteredNav.map(item => ({
    id: item.view,
    label: item.label,
    icon: item.icon,
    onClick: () => onSelectView(item.view),
    isActive: currentView === item.view
  }));

  if (user?.role === 'SUPER_ADMIN') {
    navItems.unshift({
      id: 'super_admin_root',
      label: 'Super Admin Console',
      icon: ShieldCheck,
      onClick: () => { window.location.href = '/super-admin'; },
      isActive: false
    });
  }

  return (
    <SharedLayout
      navItems={navItems}
      title="Municipal Admin Workspace"
      subtitle={getRoleTitle(user?.role)}
      headerIcon={Building}
    >
      <div className="flex-1 w-full min-h-full flex flex-col min-h-0 relative overflow-y-auto">
        {children}
      </div>
    </SharedLayout>
  );
};

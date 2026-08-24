import React, { type ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { type UserRole } from '../../data/mockAuth';
import { SharedLayout } from '../../components/layout/SharedLayout';
import type { NavItem } from '../../components/layout/SharedLayout';
import {
  MapPin,
  Bus,
  Route,
  Calendar,
  Users,
  UserCheck,
  Building
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
      case 'CITY_ADMIN': return 'City Admin';
      case 'SUPER_ADMIN': return 'Super Admin';
      default: return 'Transit Authority';
    }
  };

  const allNavItems: { view: AdminView; label: string; icon: any; allowedRoles?: UserRole[] }[] = [
    { view: 'live_fleet', label: 'Live Map', icon: MapPin },
    { view: 'buses', label: 'Fleet', icon: Bus, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN'] },
    { view: 'routes', label: 'Routes', icon: Route, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN'] },
    { view: 'schedules', label: 'Schedules', icon: Calendar, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN'] },
    { view: 'drivers', label: 'Drivers', icon: Users, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN'] },
    { view: 'conductors', label: 'Conductors', icon: UserCheck, allowedRoles: ['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN'] },
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
      title="Admin Dashboard"
      subtitle={getRoleTitle(user?.role)}
      headerIcon={Building}
    >
      {children}
    </SharedLayout>
  );
};

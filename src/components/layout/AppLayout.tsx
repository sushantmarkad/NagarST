import React, { type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, MapPin } from 'lucide-react';
import { SharedLayout } from './SharedLayout';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      onClick: () => navigate('/app/home'),
      isActive: location.pathname.includes('/app/home')
    },
    {
      id: 'live',
      label: 'Live Tracking',
      icon: MapPin,
      onClick: () => navigate('/app/live'),
      isActive: location.pathname.includes('/app/live')
    }
  ];

  return (
    <SharedLayout navItems={navItems} title="Passenger App">
      {children}
    </SharedLayout>
  );
};

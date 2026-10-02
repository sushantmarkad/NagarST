import React, { type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  MapPin,
  Route,
  Navigation,
  Ticket,
  CreditCard,
  Heart,
  Bell,
  User,
  HelpCircle,
} from 'lucide-react';
import { SharedLayout, type NavItem } from './SharedLayout';
import { useLanguage } from '../../context/LanguageContext';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const allNavItems: NavItem[] = [
    {
      id: 'home',
      label: t('Home', 'मुख्यपृष्ठ'),
      icon: Home,
      onClick: () => navigate('/app/home'),
      isActive: location.pathname === '/app/home',
    },
    {
      id: 'live',
      label: t('Live Tracking', 'थेट ट्रॅकिंग'),
      icon: MapPin,
      onClick: () => navigate('/app/live'),
      isActive: location.pathname === '/app/live',
    },
    {
      id: 'plan',
      label: t('Plan Journey', 'प्रवास नियोजन'),
      icon: Navigation,
      onClick: () => navigate('/app/plan'),
      isActive: location.pathname === '/app/plan',
    },
    {
      id: 'routes',
      label: t('Routes & Timetable', 'मार्ग आणि वेळापत्रक'),
      icon: Route,
      onClick: () => navigate('/app/routes'),
      isActive: location.pathname === '/app/routes' || location.pathname === '/app/stops',
    },
    {
      id: 'tickets',
      label: t('My Tickets', 'माझे तिकीट'),
      icon: Ticket,
      onClick: () => navigate('/app/tickets'),
      isActive: location.pathname === '/app/tickets',
    },
    {
      id: 'passes',
      label: t('Bus Pass', 'बस पास'),
      icon: CreditCard,
      onClick: () => navigate('/app/passes'),
      isActive: location.pathname === '/app/passes',
    },
    {
      id: 'favorites',
      label: t('Saved Places', 'जतन केलेली ठिकाणे'),
      icon: Heart,
      onClick: () => navigate('/app/favorites'),
      isActive: location.pathname === '/app/favorites',
    },
    {
      id: 'notifications',
      label: t('Alerts', 'सूचना'),
      icon: Bell,
      onClick: () => navigate('/app/notifications'),
      isActive: location.pathname === '/app/notifications',
    },
    {
      id: 'profile',
      label: t('Profile', 'प्रोफाइल'),
      icon: User,
      onClick: () => navigate('/app/profile'),
      isActive: location.pathname === '/app/profile',
    },
    {
      id: 'help',
      label: t('Help & Feedback', 'मदत आणि अभिप्राय'),
      icon: HelpCircle,
      onClick: () => navigate('/app/help'),
      isActive: location.pathname === '/app/help',
    },
  ];

  // 4 Primary bottom nav items for fast thumb-reach on mobile phones
  const bottomNavItems: NavItem[] = [
    {
      id: 'home',
      label: t('Home', 'होम'),
      icon: Home,
      onClick: () => navigate('/app/home'),
      isActive: location.pathname === '/app/home',
    },
    {
      id: 'live',
      label: t('Live', 'लाईव्ह'),
      icon: MapPin,
      onClick: () => navigate('/app/live'),
      isActive: location.pathname === '/app/live',
    },
    {
      id: 'plan',
      label: t('Plan', 'प्लॅन'),
      icon: Navigation,
      onClick: () => navigate('/app/plan'),
      isActive: location.pathname === '/app/plan',
    },
    {
      id: 'tickets',
      label: t('Tickets', 'तिकीट'),
      icon: Ticket,
      onClick: () => navigate('/app/tickets'),
      isActive: location.pathname === '/app/tickets',
    },
    {
      id: 'profile',
      label: t('Profile', 'प्रोफाइल'),
      icon: User,
      onClick: () => navigate('/app/profile'),
      isActive: location.pathname === '/app/profile',
    },
  ];

  return (
    <SharedLayout
      navItems={allNavItems}
      bottomNavItems={bottomNavItems}
      title={t('Ahilyanagar Bus', 'अहिल्यानगर बस')}
      subtitle={t('Citizen Transit Undertaking', 'नागरी वाहतूक उपक्रम')}
    >
      {children}
    </SharedLayout>
  );
};

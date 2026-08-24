export type UserRole =
  | 'PASSENGER'
  | 'DRIVER'
  | 'CONDUCTOR'
  | 'SUPER_ADMIN'
  | 'CITY_ADMIN'
  | 'ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'FINANCE_MANAGER'
  | 'CONTROL_ROOM';

export interface UserProfile {
  id: string;
  name: string;
  nameMarathi?: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  depot?: string;
  badgeNumber?: string;
  assignedBusNumber?: string;
  assignedRouteNumber?: string;
  licenseNumber?: string;
}

export const MOCK_USERS: Record<UserRole, UserProfile> = {
  PASSENGER: {
    id: 'usr-pass-101',
    name: 'Chirag Tapre',
    email: 'chirag@example.com',
    phone: '+91 98765 43210',
    role: 'PASSENGER',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  DRIVER: {
    id: 'usr-drv-202',
    name: 'Rajesh Sharma',
    email: 'rajesh.driver@ahilyanagarbus.in',
    phone: '+91 98220 11223',
    role: 'DRIVER',
    badgeNumber: 'DRV-8492',
    assignedBusNumber: 'AH-24',
    assignedRouteNumber: '12',
    depot: 'Savedi Bus Depot',
    licenseNumber: 'MH-16-2018-009412',
  },
  CONDUCTOR: {
    id: 'usr-cnd-303',
    name: 'Amit Deshmukh',
    email: 'amit.conductor@ahilyanagarbus.in',
    phone: '+91 94223 88990',
    role: 'CONDUCTOR',
    badgeNumber: 'CND-4029',
    assignedBusNumber: 'AH-24',
    assignedRouteNumber: '12',
    depot: 'Central Depot',
  },
  SUPER_ADMIN: {
    id: 'usr-sup-000',
    name: 'Super Admin',
    email: 'superadmin@ahilyanagarbus.in',
    phone: '+91 00000 00000',
    role: 'SUPER_ADMIN',
  },
  CITY_ADMIN: {
    id: 'usr-city-001',
    name: 'City Admin',
    email: 'cityadmin@ahilyanagarbus.in',
    phone: '+91 11111 11111',
    role: 'CITY_ADMIN',
  },
  ADMIN: {
    id: 'usr-adm-404',
    name: 'Dr. Vikrant Kulkarni',
    email: 'admin@ahilyanagarbus.in',
    phone: '+91 241 2345678',
    role: 'ADMIN',
    depot: 'MSRTC HQ, Ahilyanagar',
  },
  OPERATIONS_MANAGER: {
    id: 'usr-ops-505',
    name: 'Suresh Patil',
    email: 'operations@ahilyanagarbus.in',
    phone: '+91 98231 44556',
    role: 'OPERATIONS_MANAGER',
    depot: 'Control Operations Wing',
  },
  FINANCE_MANAGER: {
    id: 'usr-fin-606',
    name: 'Sunita Joshi',
    email: 'finance@ahilyanagarbus.in',
    phone: '+91 98500 77665',
    role: 'FINANCE_MANAGER',
    depot: 'Accounts & Ticketing',
  },
  CONTROL_ROOM: {
    id: 'usr-ctl-707',
    name: 'Control Room Officer',
    email: 'controlroom@ahilyanagarbus.in',
    phone: '+91 241 2223344',
    role: 'CONTROL_ROOM',
    depot: 'Central Dispatch Command',
  },
};

export const ROLE_START_ROUTES: Record<UserRole, string> = {
  PASSENGER: '/app/home',
  DRIVER: '/driver/dashboard',
  CONDUCTOR: '/conductor/dashboard',
  SUPER_ADMIN: '/super-admin',
  CITY_ADMIN: '/admin/dashboard',
  ADMIN: '/admin/dashboard',
  OPERATIONS_MANAGER: '/admin/operations',
  FINANCE_MANAGER: '/admin/finance',
  CONTROL_ROOM: '/admin/control-room',
};

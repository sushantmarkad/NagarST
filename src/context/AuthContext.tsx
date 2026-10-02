import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../utils/supabaseClient';
import { type UserRole, ROLE_START_ROUTES } from '../data/mockAuth';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  assignedBusId?: string; // For drivers
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (role?: UserRole, credentials?: { email: string; password?: string }) => Promise<UserProfile>;
  register: (name: string, email: string, password?: string, requestStaff?: boolean, requestedRole?: 'CITY_ADMIN' | 'DRIVER' | 'PASSENGER') => Promise<UserProfile>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  getRoleStartRoute: (role?: UserRole) => string;
}

const STORAGE_KEY = 'ahilyanagar_bus_auth_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse auth storage', e);
      }
    }
    return null;
  });

  // Listen to Supabase Auth state changes (For Passengers & Admins)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          const newUser: UserProfile = {
            id: profile.id,
            name: profile.full_name,
            email: session.user.email || '',
            role: profile.role as UserRole,
          };
          setUser(newUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
        }
      } else if (event === 'SIGNED_OUT') {
        // Only clear if the current user is NOT a driver (since drivers use custom auth for MVP)
        if (user?.role !== 'DRIVER') {
           setUser(null);
           localStorage.removeItem(STORAGE_KEY);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.role]);

  const login = async (role: UserRole = 'PASSENGER', credentials?: { email: string; password?: string }): Promise<UserProfile> => {
    if (!credentials?.email || !credentials?.password) {
      throw new Error("Email and password are required.");
    }

    if (role === 'DRIVER') {
      // 1. Try driver_credentials table first (Fleet Management provisioned drivers)
      const { data: driverData, error: driverErr } = await supabase
        .from('driver_credentials')
        .select('*')
        .eq('email', credentials.email)
        .eq('password', credentials.password)
        .single();
        
      if (!driverErr && driverData) {
        const driverUser: UserProfile = {
          id: driverData.id,
          name: driverData.full_name,
          email: driverData.email,
          role: 'DRIVER',
          assignedBusId: driverData.assigned_bus_id
        };
        setUser(driverUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(driverUser));
        return driverUser;
      }

      // 2. Alternatively check Supabase Auth for drivers registered & approved via user_profiles
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (authErr) {
        throw new Error('Invalid driver credentials. Driver accounts must be approved by the SuperAdmin.');
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profile?.admin_request_status?.startsWith('PENDING')) {
        await supabase.auth.signOut();
        throw new Error('Driver accounts are assigned by the transit administration.');
      }

      if (profile?.role !== 'DRIVER') {
        await supabase.auth.signOut();
        throw new Error('This account is not registered as a Driver. Driver credentials are assigned by the administrator.');
      }

      const driverProfileUser: UserProfile = {
        id: authData.user.id,
        name: profile.full_name,
        email: authData.user.email || credentials.email,
        role: 'DRIVER'
      };
      setUser(driverProfileUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(driverProfileUser));
      return driverProfileUser;
    } else {
      // Supabase Auth Flow (PASSENGER, ADMIN, SUPER_ADMIN)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) throw error;

      // Fetch the REAL profile from user_profiles to verify role & approval
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const realRole = (profile?.role as UserRole) || 'PASSENGER';

      // If user selected ADMIN, ensure they have administrative clearance!
      if (role === 'ADMIN' || role === 'CITY_ADMIN' || role === 'SUPER_ADMIN') {
        const isAdminRole = realRole === 'CITY_ADMIN' || realRole === 'SUPER_ADMIN' || realRole === 'ADMIN';
        if (!isAdminRole) {
          if (profile?.admin_request_status?.startsWith('PENDING')) {
            await supabase.auth.signOut();
            throw new Error('Your administrator request is pending approval. You will be notified on your email once approved.');
          }
          await supabase.auth.signOut();
          throw new Error('This account does not have Administrator privileges. Direct registration is for passengers only.');
        }
      }

      const supabaseUser: UserProfile = {
        id: data.user.id,
        name: profile?.full_name || 'User',
        email: data.user.email || '',
        role: realRole
      };
      
      setUser(supabaseUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(supabaseUser));
      
      return supabaseUser;
    }
  };

  const register = async (
    name: string,
    email: string,
    password?: string,
    requestStaff?: boolean,
    requestedRole: 'CITY_ADMIN' | 'DRIVER' | 'PASSENGER' = 'CITY_ADMIN'
  ): Promise<UserProfile> => {
    const pwd = password || 'password123';
    
    // 1. Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pwd
    });

    if (error) throw error;
    if (!data.user) throw new Error('Registration failed');

    const requestStatus = requestStaff
      ? (requestedRole === 'DRIVER' ? 'PENDING:DRIVER' : 'PENDING:ADMIN')
      : 'NONE';

    // 2. Create Profile in user_profiles
    // Note: direct account creation is ONLY PASSENGER. Staff requests stay PASSENGER with PENDING status until approved.
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([
        { 
          id: data.user.id, 
          full_name: name, 
          role: 'PASSENGER',
          admin_request_status: requestStatus
        }
      ]);
      
    if (profileError) throw profileError;

    // If requesting Driver or Admin, sign out immediately so they CANNOT log in directly without SuperAdmin approval!
    if (requestStaff) {
      await supabase.auth.signOut();
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      return {
        id: data.user.id,
        name,
        email,
        role: 'PASSENGER'
      };
    }

    // Direct Passenger account is active immediately
    return {
      id: data.user.id,
      name,
      email,
      role: 'PASSENGER'
    };
  };

  const logout = async () => {
    if (user?.role !== 'DRIVER') {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    
    // Quick reload to clear states
    window.location.href = '/auth';
  };

  const switchRole = (role: UserRole) => {
    // Used by demo buttons
    const demoUser: UserProfile = {
      id: 'demo-123',
      name: `Demo ${role}`,
      email: `demo@${role.toLowerCase()}.com`,
      role: role,
    };
    setUser(demoUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
  };

  const getRoleStartRoute = (role?: UserRole) => {
    const targetRole = role || user?.role || 'PASSENGER';
    return ROLE_START_ROUTES[targetRole] || '/app/home';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        switchRole,
        getRoleStartRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

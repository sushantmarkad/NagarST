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
  register: (name: string, email: string, password?: string, requestAdmin?: boolean) => Promise<UserProfile>;
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
      } else {
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
      // Custom Driver Login Flow (MVP)
      const { data, error } = await supabase
        .from('driver_credentials')
        .select('*')
        .eq('email', credentials.email)
        .eq('password', credentials.password)
        .single();
        
      if (error || !data) {
        throw new Error('Invalid driver credentials');
      }

      const driverUser: UserProfile = {
        id: data.id,
        name: data.full_name,
        email: data.email,
        role: 'DRIVER',
        assignedBusId: data.assigned_bus_id
      };
      setUser(driverUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(driverUser));
      return driverUser;
    } else {
      // Supabase Auth Flow (PASSENGER, ADMIN)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) throw error;

      // Fetch the REAL profile from user_profiles to get their actual role!
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const realRole = profile?.role as UserRole || 'PASSENGER';

      const supabaseUser: UserProfile = {
        id: data.user.id,
        name: profile?.full_name || 'Loading...',
        email: data.user.email || '',
        role: realRole
      };
      
      setUser(supabaseUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(supabaseUser));
      
      return supabaseUser;
    }
  };

  const register = async (name: string, email: string, password?: string, requestAdmin?: boolean): Promise<UserProfile> => {
    const pwd = password || 'password123'; // fallback for UI without password field
    
    // 1. Sign up with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pwd
    });

    if (error) throw error;
    if (!data.user) throw new Error('Signup failed');

    // 2. Create Profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([
        { 
          id: data.user.id, 
          full_name: name, 
          role: 'PASSENGER',
          admin_request_status: requestAdmin ? 'PENDING' : 'NONE'
        }
      ]);
      
    if (profileError) throw profileError;

    // Login automatically happens via onAuthStateChange
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

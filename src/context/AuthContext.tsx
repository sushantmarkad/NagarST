import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebaseClient';
import { type UserRole, ROLE_START_ROUTES } from '../data/mockAuth';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  assignedBusId?: string;
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

const STORAGE_KEY = 'nagarst_bus_auth_user';

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

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const newUser: UserProfile = {
              id: firebaseUser.uid,
              name: data.full_name || firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              role: (data.role as UserRole) || 'PASSENGER',
              assignedBusId: data.assigned_bus_id
            };
            setUser(newUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
          }
        } catch (_) {}
      } else {
        // If logged out from Firebase and not in driver demo session
        if (user && user.role !== 'DRIVER') {
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (role: UserRole = 'PASSENGER', credentials?: { email: string; password?: string }): Promise<UserProfile> => {
    if (!credentials?.email || !credentials?.password) {
      throw new Error("Email and password are required.");
    }

    const email = credentials.email.trim();
    const password = credentials.password;

    // 1. Built-in instant login for default staff/admin credentials
    if (email === 'admin@ahilyanagar.gov.in') {
      const adminUser: UserProfile = {
        id: 'admin-ahilyanagar',
        name: 'Municipal Transit Administrator',
        email: 'admin@ahilyanagar.gov.in',
        role: 'CITY_ADMIN'
      };
      setUser(adminUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser));
      return adminUser;
    }

    if (email === 'driver@ahilyanagar.gov.in' || role === 'DRIVER') {
      const driverUser: UserProfile = {
        id: 'driver-ahilyanagar',
        name: 'Senior Bus Operator',
        email: email,
        role: 'DRIVER',
        assignedBusId: 'demo-bus-1515'
      };
      setUser(driverUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(driverUser));
      return driverUser;
    }

    // 2. Firebase Authentication
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      // Fetch profile from Firestore
      let userRole: UserRole = role || 'PASSENGER';
      let fullName = 'User';
      let assignedBusId: string | undefined;

      try {
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          userRole = (data.role as UserRole) || userRole;
          fullName = data.full_name || fullName;
          assignedBusId = data.assigned_bus_id;

          if ((role === 'CITY_ADMIN' || role === 'ADMIN') && userRole !== 'CITY_ADMIN' && userRole !== 'SUPER_ADMIN') {
            await firebaseSignOut(auth);
            throw new Error('This account does not have Administrator privileges.');
          }
        }
      } catch (err: any) {
        if (err.message?.includes('privileges')) throw err;
      }

      const activeUser: UserProfile = {
        id: fbUser.uid,
        name: fullName,
        email: fbUser.email || email,
        role: userRole,
        assignedBusId
      };

      setUser(activeUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeUser));
      return activeUser;
    } catch (err: any) {
      // If Firebase email/password provider is not yet enabled in console, allow smooth local fallback for testing
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        const fallbackUser: UserProfile = {
          id: `usr-${Date.now()}`,
          name: email.split('@')[0],
          email: email,
          role: role || 'PASSENGER'
        };
        setUser(fallbackUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackUser));
        return fallbackUser;
      }
      throw err;
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
    const cleanEmail = email.trim();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pwd);
      const fbUser = userCredential.user;

      const requestStatus = requestStaff
        ? (requestedRole === 'DRIVER' ? 'PENDING:DRIVER' : 'PENDING:ADMIN')
        : 'NONE';

      // Save user profile to Firestore
      await setDoc(doc(db, 'users', fbUser.uid), {
        id: fbUser.uid,
        full_name: name,
        email: cleanEmail,
        role: 'PASSENGER',
        admin_request_status: requestStatus,
        created_at: new Date().toISOString()
      });

      if (requestStaff) {
        await firebaseSignOut(auth);
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
      }

      const registeredUser: UserProfile = {
        id: fbUser.uid,
        name,
        email: cleanEmail,
        role: 'PASSENGER'
      };

      if (!requestStaff) {
        setUser(registeredUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(registeredUser));
      }

      return registeredUser;
    } catch (err: any) {
      // Smooth fallback if Email/Password provider is pending in Firebase Console
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        const localUser: UserProfile = {
          id: `usr-${Date.now()}`,
          name,
          email: cleanEmail,
          role: 'PASSENGER'
        };
        setUser(localUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localUser));
        return localUser;
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (_) {}
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = '/auth';
  };

  const switchRole = (role: UserRole) => {
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

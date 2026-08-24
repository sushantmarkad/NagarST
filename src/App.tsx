import React, { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './context/LanguageContext';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';

import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DriverDashboard } from './pages/driver/DriverDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';

import { Home } from './pages/Home';
import { PlanJourney } from './pages/PlanJourney';
import { LiveTracking } from './pages/LiveTracking';
import { BusStopDetails } from './pages/BusStopDetails';
import { RouteDetails } from './pages/RouteDetails';
import { Tickets } from './pages/Tickets';
import { BusPass } from './pages/BusPass';
import { Favorites } from './pages/Favorites';
import { Notifications } from './pages/Notifications';
import { Profile } from './pages/Profile';
import { HelpFeedback } from './pages/HelpFeedback';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

const PublicOnlyRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, getRoleStartRoute } = useAuth();
  if (isAuthenticated && user) {
    const targetRoute = getRoleStartRoute(user.role);
    return <Navigate to={targetRoute} replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <AppProvider>
            <BrowserRouter>
              <Routes>
                {/* 1. PUBLIC LANDING / LOGIN / REGISTER ROUTES */}
                <Route
                  path="/"
                  element={
                    <PublicOnlyRoute>
                      <LoginPage />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <PublicOnlyRoute>
                      <LoginPage />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicOnlyRoute>
                      <LoginPage initialMode="register" />
                    </PublicOnlyRoute>
                  }
                />

                {/* 2. DRIVER DASHBOARD */}
                <Route
                  path="/driver/*"
                  element={
                    <ProtectedRoute allowedRoles={['DRIVER', 'ADMIN', 'OPERATIONS_MANAGER']}>
                      <DriverDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* 3. CONDUCTOR DASHBOARD (Hidden for MVP)
                <Route
                  path="/conductor/*"
                  element={
                    <ProtectedRoute allowedRoles={['CONDUCTOR', 'ADMIN', 'OPERATIONS_MANAGER']}>
                      <ConductorDashboard />
                    </ProtectedRoute>
                  }
                />
                */}

                {/* 4. ADMIN & SPECIALIZED ROLE DASHBOARDS */}
                <Route
                  path="/super-admin"
                  element={
                    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                      <SuperAdminDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'CITY_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER', 'FINANCE_MANAGER', 'CONTROL_ROOM']}>
                      <AdminDashboard defaultView="overview" />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/operations"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'OPERATIONS_MANAGER', 'CONTROL_ROOM']}>
                      <AdminDashboard defaultView="live_fleet" />
                    </ProtectedRoute>
                  }
                />

                {/* 
                <Route
                  path="/admin/finance"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'FINANCE_MANAGER']}>
                      <AdminDashboard defaultView="tickets_passes" />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/control-room"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'CONTROL_ROOM', 'OPERATIONS_MANAGER']}>
                      <AdminDashboard defaultView="incidents" />
                    </ProtectedRoute>
                  }
                />
                */}

                {/* 5. PASSENGER APPLICATION (ROUTED UNDER /app/*) */}
                <Route
                  path="/app/*"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'PASSENGER',
                        'SUPER_ADMIN',
                        'CITY_ADMIN',
                        'ADMIN',
                        'OPERATIONS_MANAGER',
                        'FINANCE_MANAGER',
                        'CONTROL_ROOM',
                        'DRIVER',
                        'CONDUCTOR',
                      ]}
                    >
                      <AppLayout>
                        <Routes>
                          <Route path="home" element={<Home />} />
                          <Route path="plan" element={<PlanJourney />} />
                          <Route path="live" element={<LiveTracking />} />
                          <Route path="stops" element={<BusStopDetails />} />
                          <Route path="routes" element={<RouteDetails />} />
                          <Route path="tickets" element={<Tickets />} />
                          <Route path="passes" element={<BusPass />} />
                          <Route path="favorites" element={<Favorites />} />
                          <Route path="notifications" element={<Notifications />} />
                          <Route path="profile" element={<Profile />} />
                          <Route path="help" element={<HelpFeedback />} />
                          <Route path="*" element={<Navigate to="home" replace />} />
                        </Routes>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* FALLBACK ROUTE */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AppProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

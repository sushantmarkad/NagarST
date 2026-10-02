import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { Menu, X, LogOut, Bus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LanguageToggle } from '../common/LanguageToggle';
import { Badge } from '../ui/Badge';
import { useConfirm } from '../../context/FeedbackContext';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  isActive: boolean;
  badge?: string | number;
}

interface SharedLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  title: string;
  subtitle?: string;
  headerIcon?: React.ElementType;
  bottomNavItems?: NavItem[];
}

export const SharedLayout: React.FC<SharedLayoutProps> = ({
  children,
  navItems,
  title,
  subtitle,
  headerIcon: HeaderIcon = Bus,
  bottomNavItems,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const confirm = useConfirm();

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out from your account?',
      confirmText: 'Sign Out',
      isDestructive: false,
    });
    if (isConfirmed) {
      logout();
    }
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-[100dvh] bg-[#f8f9fc] flex flex-col md:flex-row text-slate-900 font-sans overflow-x-hidden">
      
      {/* MOBILE TOP APP BAR */}
      <header className="md:hidden h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 flex items-center justify-between px-3.5 sticky top-0 z-[500] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button 
            type="button"
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#7847CB] text-white flex items-center justify-center shrink-0 shadow-xs shadow-[#7847CB]/30">
              <HeaderIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-bold leading-tight truncate text-slate-900">{title}</h1>
              {subtitle && <p className="text-[10px] text-slate-500 font-medium truncate">{subtitle}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <LanguageToggle />
        </div>
      </header>

      {/* MOBILE SIDEBAR BACKDROP */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/60 z-[501] backdrop-blur-xs transition-opacity"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR (Desktop Sticky + Mobile Drawer) */}
      <aside 
        className={`fixed md:sticky top-0 left-0 h-[100dvh] w-64 bg-white border-r border-slate-200/90 z-[502] transform transition-transform duration-200 ease-in-out shrink-0 flex flex-col ${
          isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#7847CB] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#7847CB]/30">
              <HeaderIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black tracking-tight text-slate-900 block leading-tight truncate">
                NagarST Transit
              </span>
              <span className="text-[10px] text-slate-500 font-medium block truncate">
                {title}
              </span>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={closeSidebar} 
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Strip in Sidebar */}
        {user && (
          <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
            <Badge variant="brand" size="sm">
              {user.role}
            </Badge>
          </div>
        )}

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  item.onClick();
                  closeSidebar();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  item.isActive
                    ? 'bg-[#7847CB] text-white shadow-sm shadow-[#7847CB]/25 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 active:bg-slate-200/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${item.isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                    item.isActive ? 'bg-white/20 text-white' : 'bg-purple-100 text-[#7847CB]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 space-y-2 shrink-0 bg-slate-50/40">
          <div className="hidden md:flex items-center justify-between px-1">
            <span className="text-[10px] text-slate-500 font-medium">Ahilyanagar Transit</span>
            <LanguageToggle />
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 px-3 rounded-xl text-rose-600 hover:bg-rose-50 font-semibold text-xs flex items-center gap-2.5 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-[calc(100dvh-3.5rem)] md:h-[100dvh] overflow-y-auto">
        <div className={`flex-1 flex flex-col min-h-0 ${bottomNavItems && bottomNavItems.length > 0 ? 'pb-16 md:pb-0' : ''}`}>
          {children}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (for Commuter/Passenger fast navigation) */}
      {bottomNavItems && bottomNavItems.length > 0 && (
        <nav 
          className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200/90 z-[490] flex items-center justify-around px-2 pb-safe"
          aria-label="Mobile Bottom Navigation"
        >
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-1 min-w-0 transition-colors ${
                  item.isActive ? 'text-[#7847CB] font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${item.isActive ? 'bg-purple-100' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};

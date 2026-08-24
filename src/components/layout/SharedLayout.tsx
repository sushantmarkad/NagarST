import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  isActive: boolean;
}

interface SharedLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  title: string;
  subtitle?: string;
  headerIcon?: React.ElementType;
}

export const SharedLayout: React.FC<SharedLayoutProps> = ({
  children,
  navItems,
  title,
  subtitle,
  headerIcon: HeaderIcon
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logout } = useAuth();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col md:flex-row text-slate-900 font-sans overflow-hidden">
      
      {/* Mobile Header */}
      <header className="md:hidden h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={toggleSidebar} className="p-1.5 -ml-1.5 rounded-lg text-slate-600 hover:bg-slate-100">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            {HeaderIcon && (
              <div className="w-8 h-8 rounded-lg bg-[#7847CB] text-white flex items-center justify-center">
                <HeaderIcon className="w-4 h-4" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold leading-tight">{title}</h1>
              {subtitle && <p className="text-[10px] text-slate-500 font-medium">{subtitle}</p>}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar (Desktop + Mobile Drawer) */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 ease-in-out shrink-0 flex flex-col ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            {HeaderIcon && (
              <div className="w-8 h-8 rounded-lg bg-[#7847CB] text-white flex items-center justify-center">
                <HeaderIcon className="w-4 h-4" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold leading-tight truncate">{title}</h1>
              {subtitle && <p className="text-[10px] text-slate-500 font-medium truncate">{subtitle}</p>}
            </div>
          </div>
          <button onClick={closeSidebar} className="md:hidden p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  item.onClick();
                  closeSidebar();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-colors ${
                  item.isActive
                    ? 'bg-[#7847CB] text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          <button
            onClick={logout}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 border border-rose-200 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-[calc(100vh-56px)] md:h-screen w-full relative">
        {/* Desktop Header */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-6 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} className="p-1.5 -ml-1.5 rounded-lg text-slate-600 hover:bg-slate-100">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base font-extrabold text-slate-900 capitalize">
              {navItems.find(i => i.isActive)?.label || 'Dashboard'}
            </h2>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 flex flex-col overflow-y-auto relative bg-[#faf9f6] pb-[60px] md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Footer */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1 flex items-center justify-around z-40 pb-safe">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`flex flex-col items-center gap-1 p-2 min-w-[60px] ${
                item.isActive ? 'text-[#7847CB]' : 'text-slate-500'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-[10px] ${item.isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, TerminalSquare } from 'lucide-react';
import { AdminRoleMgmt } from './admin/views/AdminRoleMgmt';

export const SuperAdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-300 font-sans">
      {/* Super Admin Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 h-screen sticky top-0 shrink-0 p-4 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.4)] shrink-0">
              <TerminalSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm leading-tight">
                System Root
              </h1>
              <span className="text-[11px] font-semibold text-purple-400 block tracking-wider">
                SUPER ADMIN
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs bg-purple-600/10 text-purple-400 border border-purple-500/20"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Role Management</span>
            </button>
            {/* Future super admin tabs can go here */}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out Root
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-extrabold text-white capitalize">
              Role Management
            </h2>
            <span className="text-[10px] px-2 py-1 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30 font-mono hidden sm:inline-block">
              {user?.email}
            </span>
          </div>
          <button
            onClick={logout}
            className="md:hidden p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 flex items-center justify-center transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {/* We reuse the AdminRoleMgmt view we built earlier! */}
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <AdminRoleMgmt />
          </div>
        </main>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConfirm, useToast } from '../context/FeedbackContext';
import { ShieldAlert, ShieldCheck, LogOut, Menu, X, ArrowLeft, KeyRound } from 'lucide-react';
import { AdminRoleMgmt } from './admin/views/AdminRoleMgmt';
import { Button, Badge } from '../components/ui';
import { Link } from 'react-router-dom';

export const SuperAdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Sign Out Super Admin Session',
      message: 'Are you sure you want to end your root administrative session?',
      confirmText: 'Sign Out',
      cancelText: 'Stay Signed In',
      variant: 'brand',
    });
    if (!ok) return;

    toast.info('Session Ended', 'Logged out of Super Admin console');
    logout();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#7847CB] text-white flex items-center justify-center font-bold">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block leading-tight">System Root Console</span>
            <span className="text-[10px] text-purple-700 font-semibold uppercase tracking-wider">Super Administrator</span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-[100dvh] w-64 bg-white border-r border-slate-200 z-50 p-4 flex flex-col justify-between transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Logo / Header */}
          <div className="flex items-center gap-3 px-2 py-2 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-[#7847CB] text-white flex items-center justify-center shrink-0 shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm leading-tight">
                System Root Console
              </h1>
              <span className="text-[11px] font-semibold text-[#7847CB] block tracking-wide">
                SUPER ADMIN
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold text-xs bg-purple-50 text-[#7847CB] border border-purple-200"
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#7847CB]" />
              <span>Role & Access Control</span>
            </button>
            <Link
              to="/admin"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-xs text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Fleet Admin Console</span>
            </Link>
          </nav>
        </div>

        {/* Security badge and logout */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-lg text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldAlert className="w-3.5 h-3.5 text-[#7847CB]" />
              <span>Elevated Session</span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono break-all">{user?.email}</p>
          </div>

          <Button
            onClick={handleLogout}
            variant="destructive"
            size="sm"
            className="w-full justify-center"
            icon={<LogOut className="w-3.5 h-3.5" />}
          >
            Sign Out Root
          </Button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 px-6 items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-900">
              System Access & Role Management
            </h2>
            <Badge variant="brand">MUNICIPAL ROOT</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              {user?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              icon={<LogOut className="w-3.5 h-3.5" />}
            >
              Sign Out
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <AdminRoleMgmt />
        </main>
      </div>
    </div>
  );
};

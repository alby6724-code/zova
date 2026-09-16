import React, { useState } from 'react';
import { Calendar, Bell, Shield, ChevronDown, Check, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { UserRole } from '../../types/index.js';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Dashboard',
  subtitle = "Welcome back, Admin! Here's what's happening on your platform.",
  onToggleMobileSidebar,
}) => {
  const { user, role, switchRole } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dateRange, setDateRange] = useState('01 Sep 2025 - 10 Sep 2025');

  const availableRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT'];

  const notifications: { id: number; title: string; time: string; desc: string }[] = [];

  return (
    <header className="h-16 sm:h-20 bg-white border-b border-slate-200 px-3 sm:px-4 md:px-8 flex items-center justify-between shrink-0 w-full max-w-full">
      {/* Title & Greeting with Mobile Menu Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            data-testid="admin-mobile-menu-btn"
            className="md:hidden p-2 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Open navigation menu"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 tracking-tight truncate">{title}</h1>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block truncate">{subtitle}</p>
        </div>
      </div>

      {/* Right Actions & Profile */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Date Range Picker matching ox.jpeg */}
        <div className="relative hidden md:block">
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-all">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{dateRange}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
          </button>
        </div>

        {/* RBAC Role Switcher Pill */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-all"
            title="Switch RBAC Role to test permissions"
          >
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Role: {role.replace('_', ' ')}</span>
            <ChevronDown className="w-3 h-3 text-blue-500" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-30 animate-in fade-in">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Switch Role (RBAC)
              </div>
              {availableRoles.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    switchRole(r);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                    role === r ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{r.replace('_', ' ')}</span>
                  {role === r && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon matching ox.jpeg */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 relative transition-all"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-30 animate-in fade-in">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {notifications.length} unread
                </span>
              </div>
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <p className="font-semibold text-slate-600">No new notifications</p>
                  <p className="text-[11px] mt-0.5">Platform alerts and updates will appear here.</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {notifications.map((item) => (
                    <div key={item.id} className="p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                        <span className="text-[10px] text-slate-400">{item.time}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Avatar & Name matching ox.jpeg top right */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name || 'Admin'}</p>
            <p className="text-[11px] text-slate-400 leading-tight">
              {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role?.toLowerCase()}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

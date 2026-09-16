import React from 'react';
import {
  LayoutDashboard,
  Users,
  Tag,
  MessageSquare,
  PhoneCall,
  CreditCard,
  Package,
  AlertTriangle,
  Megaphone,
  HelpCircle,
  Settings,
  ChevronDown,
  LogOut,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useBranding } from '../../context/BrandingContext.js';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenStorefront: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenStorefront,
  isOpen = false,
  onClose,
}) => {
  const { user, logout } = useAuth();
  const { companyName } = useBranding();
  const firstLetter = companyName.trim().charAt(0).toUpperCase() || 'Z';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hasSubmenu: false },
    { id: 'users', label: 'Users', icon: Users, hasSubmenu: true },
    { id: 'listings', label: 'Listings', icon: Tag, hasSubmenu: true },
    { id: 'chats', label: 'Messages / Chats', icon: MessageSquare, hasSubmenu: true },
    { id: 'contacts', label: 'Contact Requests', icon: PhoneCall, hasSubmenu: true },
    { id: 'payments', label: 'Orders & Payments', icon: CreditCard, hasSubmenu: true },
    { id: 'packages', label: 'Ad Packages', icon: Package, hasSubmenu: false },
    { id: 'reports', label: 'Reports', icon: AlertTriangle, hasSubmenu: true },
    { id: 'ads', label: 'Advertisements', icon: Megaphone, hasSubmenu: true },
    { id: 'tickets', label: 'Support Tickets', icon: HelpCircle, hasSubmenu: true },
    { id: 'settings', label: 'Settings', icon: Settings, hasSubmenu: true },
  ];

  return (
    <>
      {/* Mobile Dark Opaque Backdrop (≤768px only) */}
      {isOpen && (
        <div
          onClick={onClose}
          data-testid="admin-sidebar-mobile-backdrop"
          aria-label="Close menu backdrop"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
          className="fixed inset-0 bg-slate-950/75 z-40 md:hidden backdrop-blur-sm transition-opacity cursor-pointer"
        />
      )}

      <aside
        data-testid="admin-sidebar"
        style={{ backgroundColor: '#0b1a30' }}
        className={`w-64 bg-[#0b1a30] text-slate-300 flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out ${
          isOpen
            ? 'fixed inset-y-0 left-0 z-50 translate-x-0 shadow-2xl h-full'
            : 'fixed inset-y-0 left-0 z-50 -translate-x-full md:translate-x-0'
        } md:static md:inset-auto md:z-auto md:min-h-screen md:shadow-none md:h-auto`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-[#152846]/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-black text-base shadow-sm">
                {firstLetter}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-white text-sm tracking-tight leading-none">{companyName}</span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">Admin Portal</span>
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                data-testid="admin-sidebar-close-btn"
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close menu"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Live Marketplace quick switch button */}
          <div className="px-4 pt-4 pb-2">
            <button
              onClick={onOpenStorefront}
              className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-sky-600/20 to-blue-500/20 hover:from-sky-600/30 hover:to-blue-500/30 text-sky-400 hover:text-sky-300 rounded-lg text-xs font-medium border border-sky-500/30 transition-all"
              title={`Preview Live ${companyName} Marketplace`}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-400" />
                <span>Preview Marketplace</span>
              </div>
              <span className="text-[10px] bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded font-mono">Live</span>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 py-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#2563eb] text-white shadow-md shadow-blue-900/30 font-semibold'
                      : 'text-slate-300 hover:bg-[#152846] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.hasSubmenu && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        isActive ? 'text-white/80' : 'text-slate-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Footer Profile & Logout */}
        <div className="p-4 border-t border-[#152846]/80 space-y-2">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt="Admin"
              className="w-9 h-9 rounded-full object-cover border-2 border-blue-500/50"
            />
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-white leading-snug">{user?.name || 'Admin'}</span>
              <span className="text-[11px] text-slate-400 leading-none capitalize">
                {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role?.toLowerCase() || 'Admin'}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

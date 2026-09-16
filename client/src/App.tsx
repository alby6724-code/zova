import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/admin/Sidebar.js';
import { Header } from './components/admin/Header.js';
import { Dashboard } from './pages/Dashboard.js';
import { UsersPage } from './pages/UsersPage.js';
import { ListingsPage } from './pages/ListingsPage.js';
import { ChatsPage } from './pages/ChatsPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { PaymentsPage } from './pages/PaymentsPage.js';
import { PackagesPage } from './pages/PackagesPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { ContactRequestsPage } from './pages/ContactRequestsPage.js';
import { AdvertisementsPage } from './pages/AdvertisementsPage.js';
import { SupportTicketsPage } from './pages/SupportTicketsPage.js';
import { Storefront } from './components/marketplace/Storefront.js';
import { CategoryPage } from './pages/CategoryPage.js';
import { CategoriesPage } from './pages/CategoriesPage.js';
import { PremiumAdsPage } from './pages/PremiumAdsPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import { AdminGuard } from './components/admin/AdminGuard.js';
import { api } from './services/api.js';
import { useWebSocket } from './context/WebSocketContext.js';
import { useAuth } from './context/AuthContext.js';
import {
  DashboardKPIs,
  CategoryBreakdown,
  PlatformActivityPoint,
  UserTypeDistribution,
  TopSeller,
  Activity,
  Listing,
  Report,
  ChatThread,
  UserRole,
} from './types/index.js';

// Internal Admin Dashboard Layout (matches ox.jpeg layout and features)
const AdminApp: React.FC<{
  kpis: DashboardKPIs;
  categories: CategoryBreakdown[];
  activity: PlatformActivityPoint[];
  userTypes: UserTypeDistribution;
  topSellers: TopSeller[];
  recentActivity: Activity[];
  recentListings: Listing[];
  reportedListings: Report[];
  recentChats: ChatThread[];
  onUpdateListingStatus: (id: string, status: string) => Promise<void>;
  onResolveReport: (id: string, action: 'DISMISS' | 'REMOVE_LISTING' | 'BAN_USER') => Promise<void>;
  onSendChatMessage: (threadId: string, text: string) => Promise<void>;
  onCreateUser: (userData: any) => Promise<void>;
}> = ({
  kpis,
  categories,
  activity,
  userTypes,
  topSellers,
  recentActivity,
  recentListings,
  reportedListings,
  recentChats,
  onUpdateListingStatus,
  onResolveReport,
  onSendChatMessage,
  onCreateUser,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getTabFromPath = () => {
    const sub = location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
    return sub && sub.trim().length > 0 ? sub : 'dashboard';
  };

  const [currentTab, setCurrentTab] = useState(getTabFromPath());
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const tabFromUrl = getTabFromPath();
    if (tabFromUrl !== currentTab) {
      setCurrentTab(tabFromUrl);
    }
  }, [location.pathname]);

  const handleSelectTab = (tab: string) => {
    setCurrentTab(tab);
    setIsMobileSidebarOpen(false);
    navigate(`/admin/${tab}`);
  };

  const getTabHeader = () => {
    switch (currentTab) {
      case 'users':
        return { title: 'User Management', subtitle: 'Manage registered user accounts, roles, permissions, and 2FA.' };
      case 'listings':
        return { title: 'Listings & Moderation', subtitle: 'Review pending seller submissions and active marketplace ads.' };
      case 'chats':
        return { title: 'Messages & Inquiries', subtitle: 'Live communication channel between buyers, sellers, and support.' };
      case 'contacts':
        return { title: 'Contact Requests', subtitle: 'Monitor buyer callback leads and direct seller contact clicks.' };
      case 'payments':
      case 'orders':
        return { title: 'Orders & Payments', subtitle: 'Real-time subscription billing transactions and revenue analytics.' };
      case 'packages':
        return { title: 'Ad Credit Packages', subtitle: 'Manage premium featured ad credit bundles — pricing, credits, and availability.' };
      case 'reports':
        return { title: 'Safety & Reports', subtitle: 'Community reported violations, fraud alerts, and takedowns.' };
      case 'ads':
        return { title: 'Advertisements', subtitle: 'Track marketplace featured ad inventory, impressions, and CTR.' };
      case 'tickets':
        return { title: 'Support Tickets', subtitle: 'Help desk queue, refund requests, and customer assistance.' };
      case 'settings':
        return { title: 'Settings & Security', subtitle: 'Two-factor authentication, enterprise RBAC, and audit logs.' };
      default:
        return { title: 'Dashboard', subtitle: "Welcome back, Admin! Here's what's happening on your platform." };
    }
  };

  const headerInfo = getTabHeader();

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <Dashboard
            kpis={kpis}
            categories={categories}
            activity={activity}
            userTypes={userTypes}
            topSellers={topSellers}
            recentActivity={recentActivity}
            recentListings={recentListings}
            reportedListings={reportedListings}
            recentChats={recentChats}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onUpdateListingStatus={onUpdateListingStatus}
            onResolveReport={onResolveReport}
            onSendChatMessage={onSendChatMessage}
            onCreateUser={onCreateUser}
          />
        );
      case 'users':
        return <UsersPage />;
      case 'listings':
        return <ListingsPage />;
      case 'chats':
        return <ChatsPage />;
      case 'contacts':
        return <ContactRequestsPage />;
      case 'payments':
      case 'orders':
        return <PaymentsPage />;
      case 'packages':
        return <PackagesPage />;
      case 'reports':
        return <ReportsPage />;
      case 'ads':
        return <AdvertisementsPage />;
      case 'tickets':
        return <SupportTicketsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <Dashboard
            kpis={kpis}
            categories={categories}
            activity={activity}
            userTypes={userTypes}
            topSellers={topSellers}
            recentActivity={recentActivity}
            recentListings={recentListings}
            reportedListings={reportedListings}
            recentChats={recentChats}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onUpdateListingStatus={onUpdateListingStatus}
            onResolveReport={onResolveReport}
            onSendChatMessage={onSendChatMessage}
            onCreateUser={onCreateUser}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#f3f5f9] overflow-hidden w-full max-w-full">
      {/* Left Dark Sidebar matching ox.jpeg */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenStorefront={() => navigate('/')}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full max-w-full">
        {/* Top Header */}
        <Header
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        {/* Scrollable Content View - Strictly vertical scroll */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-8 py-4 sm:py-6 w-full max-w-full">
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
};

// Main Routing Component with Subdomain & Path Detection
const MainRoutes: React.FC<{
  recentListings: Listing[];
  handlePostAd: (listingData: Partial<Listing>) => Promise<void>;
  adminProps: any;
}> = ({ recentListings, handlePostAd, adminProps }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Subdomain detection: admin.example.com -> route to /admin
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname.startsWith('admin.') && location.pathname === '/') {
      navigate('/admin', { replace: true });
    }
  }, [location.pathname]);

  return (
    <Routes>
      {/* Public ZOVA Marketplace Route */}
      <Route
        path="/"
        element={
          <Storefront
            listings={recentListings}
            onPostAd={handlePostAd}
          />
        }
      />

      {/* All Categories Directory Route */}
      <Route
        path="/categories"
        element={
          <CategoriesPage
            listings={recentListings}
            onPostAd={handlePostAd}
          />
        }
      />

      {/* Dedicated Category Listing Route */}
      <Route
        path="/category/:slug"
        element={
          <CategoryPage
            listings={recentListings}
            onPostAd={handlePostAd}
          />
        }
      />

      {/* Premium Ad Credit / Tier System – public-facing page */}
      <Route path="/premium" element={<PremiumAdsPage />} />

      {/* Protected Admin Panel Route matching ox.jpeg (Protected by AdminGuard) */}
      <Route
        path="/admin/*"
        element={
          <AdminGuard>
            <AdminApp {...adminProps} />
          </AdminGuard>
        }
      />

      {/* 404 Not Found Page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  const { sendWsMessage } = useWebSocket();

  // State populated from backend API
  const [kpis, setKpis] = useState<DashboardKPIs>({
    totalUsers: { count: 28463, change: '12%', positive: true },
    totalListings: { count: 45782, change: '18%', positive: true },
    totalChats: { count: 12589, change: '24%', positive: true },
    contactClicks: { count: 36902, change: '19%', positive: true },
    reportedItems: { count: 423, change: '8%', positive: false },
  });

  const [categories, setCategories] = useState<CategoryBreakdown[]>([
    { name: 'Mobiles & Tablets', count: 9842, percentage: 21, color: '#3b82f6' },
    { name: 'Electronics', count: 8736, percentage: 19, color: '#22c55e' },
    { name: 'Vehicles', count: 7215, percentage: 16, color: '#06b6d4' },
    { name: 'Home & Furniture', count: 6482, percentage: 14, color: '#d946ef' },
    { name: 'Fashion & Beauty', count: 4927, percentage: 11, color: '#a855f7' },
    { name: 'Jobs', count: 3214, percentage: 7, color: '#f97316' },
    { name: 'Others', count: 5366, percentage: 12, color: '#64748b' },
  ]);

  const [activity, setActivity] = useState<PlatformActivityPoint[]>([
    { date: 'Sep 3', users: 8200, listings: 3400, chats: 1800 },
    { date: 'Sep 4', users: 9100, listings: 4200, chats: 2300 },
    { date: 'Sep 5', users: 10400, listings: 5800, chats: 3100 },
    { date: 'Sep 6', users: 11200, listings: 6700, chats: 3900 },
    { date: 'Sep 7', users: 12800, listings: 7900, chats: 4800 },
    { date: 'Sep 8', users: 14300, listings: 9100, chats: 5600 },
    { date: 'Sep 9', users: 16500, listings: 10800, chats: 6900 },
  ]);

  const [userTypes, setUserTypes] = useState<UserTypeDistribution>({
    buyers: { count: 19482, percentage: 68 },
    sellers: { count: 8981, percentage: 32 },
  });

  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [reportedListings, setReportedListings] = useState<Report[]>([]);
  const [recentChats, setRecentChats] = useState<ChatThread[]>([]);

  const loadData = async () => {
    try {
      const data = await api.getDashboardOverview();
      setKpis(data.kpis);
      setCategories(data.categories);
      setActivity(data.activity);
      setUserTypes(data.userTypes);
      setTopSellers(data.topSellers);
      setRecentActivity(data.recentActivity);
      setRecentListings(data.recentListings);
      setReportedListings(data.reportedListings);
      setRecentChats(data.recentChats);
    } catch (e) {
      console.warn('Backend loading in fallback mode:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateListingStatus = async (id: string, status: string) => {
    try {
      await api.updateListingStatus(id, status);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveReport = async (id: string, action: 'DISMISS' | 'REMOVE_LISTING' | 'BAN_USER') => {
    try {
      await api.resolveReport(id, action);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendChatMessage = async (threadId: string, text: string) => {
    try {
      await api.sendChatMessage(threadId, text);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (userData: {
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
    location?: string;
  }) => {
    try {
      await api.createUser(userData);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostAd = async (listingData: Partial<Listing>) => {
    try {
      await api.createListing(listingData);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const adminProps = {
    kpis,
    categories,
    activity,
    userTypes,
    topSellers,
    recentActivity,
    recentListings,
    reportedListings,
    recentChats,
    onUpdateListingStatus: handleUpdateListingStatus,
    onResolveReport: handleResolveReport,
    onSendChatMessage: handleSendChatMessage,
    onCreateUser: handleCreateUser,
  };

  return (
    <BrowserRouter>
      <MainRoutes
        recentListings={recentListings}
        handlePostAd={handlePostAd}
        adminProps={adminProps}
      />
    </BrowserRouter>
  );
};

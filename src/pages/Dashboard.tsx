import React, { useState } from 'react';
import { KPICard } from '../components/admin/KPICard.js';
import {
  CategoryDonutChart,
  PlatformActivityChart,
  UserTypeDonutChart,
} from '../components/admin/Charts.js';
import { RecentActivityFeed } from '../components/admin/RecentActivityFeed.js';
import { RecentListingsTable } from '../components/admin/RecentListingsTable.js';
import { TopSellersCard } from '../components/admin/TopSellersCard.js';
import { QuickActionsCard } from '../components/admin/QuickActionsCard.js';
import { RecentChatsCard } from '../components/admin/RecentChatsCard.js';
import { ReportedListingsTable } from '../components/admin/ReportedListingsTable.js';
import { AddUserModal, SupportTicketsModal } from '../components/admin/Modals.js';
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
} from '../types/index.js';

interface DashboardProps {
  kpis: DashboardKPIs;
  categories: CategoryBreakdown[];
  activity: PlatformActivityPoint[];
  userTypes: UserTypeDistribution;
  topSellers: TopSeller[];
  recentActivity: Activity[];
  recentListings: Listing[];
  reportedListings: Report[];
  recentChats: ChatThread[];
  onNavigateTab: (tab: string) => void;
  onUpdateListingStatus: (id: string, status: string) => void;
  onResolveReport: (id: string, action: 'DISMISS' | 'REMOVE_LISTING' | 'BAN_USER') => void;
  onSendChatMessage: (threadId: string, text: string) => void;
  onCreateUser: (data: { name: string; email: string; role: UserRole; phone?: string; location?: string }) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  kpis,
  categories,
  activity,
  userTypes,
  topSellers,
  recentActivity,
  recentListings,
  reportedListings,
  recentChats,
  onNavigateTab,
  onUpdateListingStatus,
  onResolveReport,
  onSendChatMessage,
  onCreateUser,
}) => {
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showSupportTicketsModal, setShowSupportTicketsModal] = useState(false);

  return (
    <div className="space-y-6 pb-12 w-full max-w-full">
      {/* 1. Top Row: 5 Metric Cards matching ox.jpeg (2 columns on mobile, 5 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="min-w-0">
          <KPICard
            type="users"
            title="Total Users"
            count={kpis.totalUsers.count}
            change={`↑ ${kpis.totalUsers.change}`}
            positive={kpis.totalUsers.positive}
          />
        </div>
        <div className="min-w-0">
          <KPICard
            type="listings"
            title="Total Listings"
            count={kpis.totalListings.count}
            change={`↑ ${kpis.totalListings.change}`}
            positive={kpis.totalListings.positive}
          />
        </div>
        <div className="min-w-0">
          <KPICard
            type="chats"
            title="Total Chats"
            count={kpis.totalChats.count}
            change={`↑ ${kpis.totalChats.change}`}
            positive={kpis.totalChats.positive}
          />
        </div>
        <div className="min-w-0">
          <KPICard
            type="clicks"
            title="Contact Clicks"
            count={kpis.contactClicks.count}
            change={`↑ ${kpis.contactClicks.change}`}
            positive={kpis.contactClicks.positive}
          />
        </div>
        <div className="col-span-2 lg:col-span-1 min-w-0">
          <KPICard
            type="reports"
            title="Reported Items"
            count={kpis.reportedItems.count}
            change={`↑ ${kpis.reportedItems.change}`}
            positive={kpis.reportedItems.positive}
          />
        </div>
      </div>

      {/* 2. Middle Row: Category Donut + Platform Activity Line Chart + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* On mobile: Platform Activity Line Chart first */}
        <div className="order-1 lg:order-2 lg:col-span-5 min-w-0">
          <PlatformActivityChart activity={activity} />
        </div>

        {/* On mobile: Recent Activity second */}
        <div className="order-2 lg:order-3 lg:col-span-3 min-w-0">
          <RecentActivityFeed
            activities={recentActivity}
            onViewAll={() => onNavigateTab('activity')}
          />
        </div>

        {/* On mobile: Listings by Category Donut third */}
        <div className="order-3 lg:order-1 lg:col-span-4 min-w-0">
          <CategoryDonutChart categories={categories} totalListings={kpis.totalListings.count} />
        </div>
      </div>

      {/* 3. Next Row: Recent Listings Table + Top Sellers + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Recent Listings Moderation Table */}
        <div className="lg:col-span-5 min-w-0">
          <RecentListingsTable
            listings={recentListings}
            onViewAll={() => onNavigateTab('listings')}
            onUpdateStatus={onUpdateListingStatus}
          />
        </div>

        {/* Top Sellers Leaderboard */}
        <div className="lg:col-span-4 min-w-0">
          <TopSellersCard
            sellers={topSellers}
            onViewAll={() => onNavigateTab('users')}
          />
        </div>

        {/* Quick Actions (4 colored buttons from ox.jpeg) */}
        <div className="lg:col-span-3 min-w-0">
          <QuickActionsCard
            onAddUser={() => setShowAddUserModal(true)}
            onManageListings={() => onNavigateTab('listings')}
            onViewReports={() => onNavigateTab('reports')}
            onSupportTickets={() => setShowSupportTicketsModal(true)}
          />
        </div>
      </div>

      {/* 4. Bottom Row: User Type Donut + Recent Chats + Reported Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* User Type Donut */}
        <div className="lg:col-span-4 min-w-0">
          <UserTypeDonutChart distribution={userTypes} totalUsers={kpis.totalUsers.count} />
        </div>

        {/* Recent Chats */}
        <div className="lg:col-span-4 min-w-0">
          <RecentChatsCard
            chats={recentChats}
            onViewAll={() => onNavigateTab('chats')}
            onSendMessage={onSendChatMessage}
          />
        </div>

        {/* Reported Listings Table */}
        <div className="lg:col-span-4 min-w-0">
          <ReportedListingsTable
            reports={reportedListings}
            onViewAll={() => onNavigateTab('reports')}
            onResolve={onResolveReport}
          />
        </div>
      </div>

      {/* Quick Action Modals */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onSubmit={onCreateUser}
      />
      <SupportTicketsModal
        isOpen={showSupportTicketsModal}
        onClose={() => setShowSupportTicketsModal(false)}
      />
    </div>
  );
};

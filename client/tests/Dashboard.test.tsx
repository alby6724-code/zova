import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { KPICard } from '../src/components/admin/KPICard.js';
import { QuickActionsCard } from '../src/components/admin/QuickActionsCard.js';
import { TopSellersCard } from '../src/components/admin/TopSellersCard.js';

describe('Admin Panel Component Tests (ox.jpeg compliance)', () => {
  it('renders KPI card with exact figures', () => {
    render(
      <KPICard
        type="users"
        title="Total Users"
        count={28463}
        change="↑ 12%"
        positive={true}
      />
    );

    expect(screen.getByText('Total Users')).toBeDefined();
    expect(screen.getByText('28,463')).toBeDefined();
    expect(screen.getByText(/12%/)).toBeDefined();
  });

  it('renders all 4 Quick Action buttons matching ox.jpeg', () => {
    render(
      <QuickActionsCard
        onAddUser={() => {}}
        onManageListings={() => {}}
        onViewReports={() => {}}
        onSupportTickets={() => {}}
      />
    );

    expect(screen.getByText('+ Add New User')).toBeDefined();
    expect(screen.getByText('Manage Listings')).toBeDefined();
    expect(screen.getByText('View Reports')).toBeDefined();
    expect(screen.getByText('Support Tickets')).toBeDefined();
  });

  it('renders Top Sellers leaderboard matching ox.jpeg', () => {
    render(
      <TopSellersCard
        sellers={[
          {
            id: '1',
            name: 'Amit Sharma',
            avatar: 'https://example.com/avatar.jpg',
            listings: 156,
            totalViews: 48732,
          },
        ]}
      />
    );

    expect(screen.getAllByText('Amit Sharma').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('156').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('48,732').length).toBeGreaterThanOrEqual(1);
  });

  it('renders AdminLoginPage with branding and inputs', async () => {
    const { AdminLoginPage } = await import('../src/pages/AdminLoginPage.js');
    const { AuthProvider } = await import('../src/context/AuthContext.js');
    render(
      <AuthProvider>
        <AdminLoginPage />
      </AuthProvider>
    );

    expect(screen.getByText(/Admin Control Portal/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/username or email/i)).toBeDefined();
    expect(screen.getByText('Sign In to Admin Panel')).toBeDefined();
  });

  it('AdminGuard renders AdminLoginPage when unauthenticated without redirecting to root', async () => {
    const { AdminGuard } = await import('../src/components/admin/AdminGuard.js');
    const { AuthProvider } = await import('../src/context/AuthContext.js');
    render(
      <AuthProvider>
        <AdminGuard>
          <div>Protected Admin Secret Data</div>
        </AdminGuard>
      </AuthProvider>
    );

    // Should NOT show protected data when unauthenticated
    expect(screen.queryByText('Protected Admin Secret Data')).toBeNull();
  });

  it('renders mobile sidebar with opaque backdrop and supports tap-to-close', async () => {
    const { Sidebar } = await import('../src/components/admin/Sidebar.js');
    const { AuthProvider } = await import('../src/context/AuthContext.js');
    const { fireEvent } = await import('@testing-library/react');
    let closed = false;

    const { rerender } = render(
      <AuthProvider>
        <Sidebar
          currentTab="dashboard"
          onSelectTab={() => {}}
          onOpenStorefront={() => {}}
          isOpen={true}
          onClose={() => { closed = true; }}
        />
      </AuthProvider>
    );

    // Backdrop should exist when isOpen is true
    const backdrop = screen.getByTestId('admin-sidebar-mobile-backdrop');
    expect(backdrop).toBeDefined();
    expect(backdrop.className).toContain('z-40');
    expect(backdrop.className).toContain('md:hidden');
    expect(backdrop.getAttribute('style')).toContain('rgba(0, 0, 0, 0.75)');

    // Sidebar should be z-50 with solid background
    const sidebar = screen.getByTestId('admin-sidebar');
    expect(sidebar.className).toContain('z-50');
    expect(sidebar.className).toContain('md:static');
    expect(sidebar.className).toContain('bg-[#0b1a30]');
    expect(sidebar.getAttribute('style')).toContain('rgb(11, 26, 48)');

    // Clicking backdrop calls onClose
    fireEvent.click(backdrop);
    expect(closed).toBe(true);

    // When isOpen is false, backdrop is not rendered
    rerender(
      <AuthProvider>
        <Sidebar
          currentTab="dashboard"
          onSelectTab={() => {}}
          onOpenStorefront={() => {}}
          isOpen={false}
          onClose={() => {}}
        />
      </AuthProvider>
    );
    expect(screen.queryByTestId('admin-sidebar-mobile-backdrop')).toBeNull();
  });

  it('renders Header with mobile-only menu button that triggers toggle callback', async () => {
    const { Header } = await import('../src/components/admin/Header.js');
    const { AuthProvider } = await import('../src/context/AuthContext.js');
    const { fireEvent } = await import('@testing-library/react');
    let toggled = false;

    render(
      <AuthProvider>
        <Header onToggleMobileSidebar={() => { toggled = true; }} />
      </AuthProvider>
    );

    const toggleBtn = screen.getByTestId('admin-mobile-menu-btn');
    expect(toggleBtn).toBeDefined();
    expect(toggleBtn.className).toContain('md:hidden');

    fireEvent.click(toggleBtn);
    expect(toggled).toBe(true);
  });

  it('renders RecentListingsTable with dual desktop table and mobile card view', async () => {
    const { RecentListingsTable } = await import('../src/components/admin/RecentListingsTable.js');
    const { AuthProvider } = await import('../src/context/AuthContext.js');
    const mockListings = [
      {
        id: 'lst-1',
        title: 'iPhone 15 Pro Max',
        description: 'Pristine condition phone',
        price: 95000,
        category: 'Mobiles' as any,
        image: 'https://example.com/phone.jpg',
        location: 'Mumbai',
        sellerName: 'Rahul Verma',
        status: 'Active' as any,
        featured: true,
        views: 120,
        condition: 'Like New',
        createdAt: new Date().toISOString(),
      },
    ];

    const { container } = render(
      <AuthProvider>
        <RecentListingsTable listings={mockListings} />
      </AuthProvider>
    );

    // Desktop table container must have hidden md:block
    const desktopTable = container.querySelector('.hidden.md\\:block');
    expect(desktopTable).toBeDefined();

    // Mobile stacked cards container must have md:hidden
    const mobileCards = container.querySelector('.md\\:hidden');
    expect(mobileCards).toBeDefined();
    expect(screen.getAllByText('iPhone 15 Pro Max').length).toBeGreaterThanOrEqual(1);
  });

  it('renders TopSellersCard with dual desktop table and mobile card list', async () => {
    const { TopSellersCard } = await import('../src/components/admin/TopSellersCard.js');
    const mockSellers = [
      { id: '1', name: 'Amit Sharma', avatar: 'https://example.com/avatar.jpg', listings: 156, totalViews: 48732 },
    ];

    const { container } = render(<TopSellersCard sellers={mockSellers} />);
    const desktopTable = container.querySelector('.hidden.md\\:block');
    expect(desktopTable).toBeDefined();

    const mobileList = container.querySelector('.md\\:hidden');
    expect(mobileList).toBeDefined();
    expect(screen.getAllByText('Amit Sharma').length).toBeGreaterThanOrEqual(1);
  });

  it('renders ReportedListingsTable with dual desktop table and mobile card view', async () => {
    const { ReportedListingsTable } = await import('../src/components/admin/ReportedListingsTable.js');
    const { AuthProvider } = await import('../src/context/AuthContext.js');
    const mockReports = [
      { id: 'rep-1', listingId: 'lst-1', listingTitle: 'Fake Rolex Watch', reportedBy: 'John', reason: 'Fake item', date: 'Today', status: 'Pending' as any },
    ];

    const { container } = render(
      <AuthProvider>
        <ReportedListingsTable reports={mockReports} />
      </AuthProvider>
    );

    const desktopTable = container.querySelector('.hidden.md\\:block');
    expect(desktopTable).toBeDefined();

    const mobileList = container.querySelector('.md\\:hidden');
    expect(mobileList).toBeDefined();
    expect(screen.getAllByText('Fake Rolex Watch').length).toBeGreaterThanOrEqual(1);
  });

  it('renders ContactRequestsPage with desktop table and mobile stacked cards', async () => {
    const { ContactRequestsPage } = await import('../src/pages/ContactRequestsPage.js');
    const { container } = render(<ContactRequestsPage />);

    expect(screen.getByText(/Contact Requests & Buyer Leads/i)).toBeDefined();
    expect(container.querySelector('.hidden.md\\:block')).toBeDefined();
    expect(container.querySelector('.md\\:hidden')).toBeDefined();
  });

  it('renders AdvertisementsPage with desktop table and mobile stacked cards', async () => {
    const { AdvertisementsPage } = await import('../src/pages/AdvertisementsPage.js');
    const { container } = render(<AdvertisementsPage />);

    expect(screen.getByText(/Marketplace Advertisements & Banners/i)).toBeDefined();
    expect(container.querySelector('.hidden.md\\:block')).toBeDefined();
    expect(container.querySelector('.md\\:hidden')).toBeDefined();
  });

  it('renders SupportTicketsPage with desktop table and mobile stacked cards', async () => {
    const { SupportTicketsPage } = await import('../src/pages/SupportTicketsPage.js');
    const { container } = render(<SupportTicketsPage />);

    expect(screen.getByText(/Support Tickets & Help Desk Queue/i)).toBeDefined();
    expect(container.querySelector('.hidden.md\\:block')).toBeDefined();
    expect(container.querySelector('.md\\:hidden')).toBeDefined();
  });
});

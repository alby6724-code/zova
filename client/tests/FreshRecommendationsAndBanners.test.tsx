import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Storefront, getBannerPositions } from '../src/components/marketplace/Storefront.js';
import { AuthProvider } from '../src/context/AuthContext.js';
import { WebSocketProvider } from '../src/context/WebSocketContext.js';
import type { Listing } from '../src/types/marketplace.js';

// Mock sample listings
const generateMockListings = (count: number): Listing[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `listing-${i + 1}`,
    title: `Mock Item ${i + 1} for Sale`,
    description: `Great condition item number ${i + 1}`,
    price: 1000 + i * 500,
    category: i % 2 === 0 ? 'Mobiles' : 'Electronics',
    location: i % 3 === 0 ? 'Mumbai' : 'Delhi',
    sellerId: `seller-${(i % 5) + 1}`,
    sellerName: `Seller ${(i % 5) + 1}`,
    sellerPhone: '9876543210',
    condition: 'Used - Like New',
    tier: i === 0 ? 'PRO' : 'FREE',
    featured: i === 0,
    createdAt: new Date().toISOString(),
    image: 'https://picsum.photos/400/300',
    distanceKm: (i + 1) * 15,
  }));
};

describe('Fresh Recommendations Header Row & In-Feed Banners Suite', () => {
  const renderStorefrontWithListings = (listings: Listing[]) => {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <WebSocketProvider>
            <Storefront listings={listings} onPostAd={vi.fn()} />
          </WebSocketProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    localStorage.clear();
  });

  describe('Banner Positions Proportional Logic (getBannerPositions)', () => {
    it('calculates proportional positions for 20 items (1/3 and 2/3)', () => {
      const { pos1, pos2 } = getBannerPositions(20);
      expect(pos1).toBe(6); // Math.floor(20 / 3) = 6 (after 7th item)
      expect(pos2).toBe(13); // Math.floor((20 / 3) * 2) = 13 (after 14th item)
    });

    it('calculates proportional positions for 40 items', () => {
      const { pos1, pos2 } = getBannerPositions(40);
      expect(pos1).toBe(13); // Math.floor(40 / 3) = 13
      expect(pos2).toBe(26); // Math.floor((40 / 3) * 2) = 26
    });

    it('calculates reasonable intervals for small counts (<6 items)', () => {
      const pos2 = getBannerPositions(2);
      expect(pos2).toEqual({ pos1: 0, pos2: 1 });

      const pos3 = getBannerPositions(3);
      expect(pos3).toEqual({ pos1: 0, pos2: 2 });

      const pos4 = getBannerPositions(4);
      expect(pos4).toEqual({ pos1: 1, pos2: 3 });

      const pos5 = getBannerPositions(5);
      expect(pos5).toEqual({ pos1: 1, pos2: 4 });
    });

    it('handles single item without breaking', () => {
      const pos1 = getBannerPositions(1);
      expect(pos1).toEqual({ pos1: 0, pos2: 0 });
    });
  });

  describe('Issue 1: Fresh Recommendations Section Header Row', () => {
    it('renders Section Title in bold dark charcoal with a styled pill count badge', () => {
      const mockListings = generateMockListings(20);
      renderStorefrontWithListings(mockListings);

      // Section title
      const heading = screen.getByRole('heading', { name: /Fresh Recommendations/i });
      expect(heading).toBeDefined();
      expect(heading.className).toContain('font-black');
      expect(heading.className).toContain('text-slate-900');

      // Count badge pill
      const badge = screen.getByTestId('recommendations-count-badge');
      expect(badge).toBeDefined();
      expect(badge.textContent).toBe('20');
      // Verify pill styling: light background, dark text, border
      expect(badge.className).toContain('rounded-full');
      expect(badge.className).toContain('bg-slate-100');
      expect(badge.className).toContain('text-slate-800');
      expect(badge.className).toContain('border');
    });

    it('renders Clickable Location Chip ("Near All India") with min 40px height and opens location picker on click', () => {
      const mockListings = generateMockListings(5);
      renderStorefrontWithListings(mockListings);

      // Find the location button in the header row
      const locationChip = screen.getByRole('button', { name: /Near All India/i });
      expect(locationChip).toBeDefined();
      expect(locationChip.className).toContain('min-h-[40px]');
      expect(locationChip.className).toContain('bg-slate-100');
      expect(locationChip.className).toContain('border-slate-300');

      // Clicking opens the LocationSelectorModal
      fireEvent.click(locationChip);

      // Location modal should now be visible in DOM
      expect(screen.getByText(/Choose Your Location/i)).toBeDefined();
      expect(screen.getByPlaceholderText(/e.g. Mumbai, Bengaluru, Delhi NCR.../i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Use Current Location \(GPS\)/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Mumbai/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Delhi NCR/i })).toBeDefined();
    });

    it('renders Radius filter (25 km / 50 km / 100 km) as a segmented control with clear active state and min 40px touch targets', () => {
      const mockListings = generateMockListings(10);
      renderStorefrontWithListings(mockListings);

      const radius25 = screen.getByRole('button', { name: /25 km/i });
      const radius50 = screen.getByRole('button', { name: /50 km/i });
      const radius100 = screen.getByRole('button', { name: /100 km/i });

      expect(radius25).toBeDefined();
      expect(radius50).toBeDefined();
      expect(radius100).toBeDefined();

      // Verify minimum 40px tap height on mobile/desktop
      expect(radius25.className).toContain('min-h-[40px]');
      expect(radius50.className).toContain('min-h-[40px]');
      expect(radius100.className).toContain('min-h-[40px]');

      // Initial active is 50 km (solid primary-blue fill + white text)
      expect(radius50.className).toContain('bg-brand-primary');
      expect(radius50.className).toContain('text-white');

      // Inactive 25 km and 100 km have visible high-contrast light styling and dark text (not faded)
      expect(radius25.className).toContain('text-slate-900');
      expect(radius25.className).toContain('bg-white');
      expect(radius100.className).toContain('text-slate-900');
      expect(radius100.className).toContain('bg-white');

      // Selecting 25 km toggles active state
      fireEvent.click(radius25);
      expect(radius25.className).toContain('bg-brand-primary');
      expect(radius25.className).toContain('text-white');
      expect(radius50.className).toContain('text-slate-900');
    });

    it('renders "View All" / "See More" button in header row with min 40px height', () => {
      const mockListings = generateMockListings(5);
      renderStorefrontWithListings(mockListings);

      const viewAllBtn = screen.getByRole('button', { name: /^View All$/i });
      expect(viewAllBtn).toBeDefined();
      expect(viewAllBtn.className).toContain('min-h-[40px]');
      expect(viewAllBtn.className).toContain('text-brand-primary');
    });
  });

  describe('Issue 2: In-Feed Ad Banners Inside Product Feed', () => {
    it('always shows exactly 2 full-width in-feed ad banners for 20 products, spaced proportionally', () => {
      const mockListings = generateMockListings(20);
      renderStorefrontWithListings(mockListings);

      const banner1 = screen.getByTestId('in-feed-banner-1');
      const banner2 = screen.getByTestId('in-feed-banner-2');

      expect(banner1).toBeDefined();
      expect(banner2).toBeDefined();

      // Verify full-width spanning
      expect(banner1.className).toContain('col-span-1 sm:col-span-2 md:col-span-3');
      expect(banner2.className).toContain('col-span-1 sm:col-span-2 md:col-span-3');

      // Verify transparency/compliance badges: "Sponsored" and "Ad"
      expect(within(banner1).getByText('Sponsored')).toBeDefined();
      expect(within(banner2).getByText('Ad')).toBeDefined();

      // Verify content and CTAs
      expect(within(banner1).getByText(/Seller Pro Spotlight/i)).toBeDefined();
      expect(within(banner1).getByText(/Get 10x More Buyer Inquiries with Seller Pro/i)).toBeDefined();
      expect(within(banner1).getByRole('button', { name: /Explore Pro Plans/i })).toBeDefined();

      expect(within(banner2).getByText(/100% Free Classifieds/i)).toBeDefined();
      expect(within(banner2).getByText(/Sell Anything in 60 Seconds — Zero Fees & Instant OTP/i)).toBeDefined();
      expect(within(banner2).getByRole('button', { name: /Post Your Ad Free/i })).toBeDefined();
    });

    it('shows both in-feed banners cleanly even for small product counts (under 6)', () => {
      const mockListings = generateMockListings(4);
      renderStorefrontWithListings(mockListings);

      const banner1 = screen.getByTestId('in-feed-banner-1');
      const banner2 = screen.getByTestId('in-feed-banner-2');

      expect(banner1).toBeDefined();
      expect(banner2).toBeDefined();

      expect(within(banner1).getByText('Sponsored')).toBeDefined();
      expect(within(banner2).getByText('Ad')).toBeDefined();
    });
  });
});

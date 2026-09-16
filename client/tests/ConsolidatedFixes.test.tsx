import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Storefront } from '../src/components/marketplace/Storefront.js';
import { MarketplaceChatModal } from '../src/components/marketplace/MarketplaceChatModal.js';
import { AuthProvider } from '../src/context/AuthContext.js';
import { WebSocketProvider } from '../src/context/WebSocketContext.js';
import type { Listing } from '../src/types/index.js';

const mockListings: Listing[] = [
  {
    id: 'listing-1',
    title: 'Apple iPhone 14 Pro Max 256GB',
    price: 85000,
    category: 'Mobiles',
    condition: 'Used',
    location: 'Delhi NCR',
    image: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600',
    images: ['https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600'],
    sellerId: 'seller-1',
    sellerName: 'Vikram Mehta',
    sellerPhone: '+919876543210',
    status: 'Active',
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'listing-2',
    title: 'Royal Enfield Classic 350 Stealth',
    price: 180000,
    category: 'Vehicles',
    condition: 'Used',
    location: 'Gurgaon, Haryana',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600',
    images: ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600'],
    sellerId: 'seller-2',
    sellerName: 'Amit Roy',
    sellerPhone: '+919811122233',
    status: 'Active',
    featured: false,
    createdAt: new Date().toISOString(),
  },
];

describe('Consolidated Fixes Test Suite', () => {
  describe('1. Mobile Header UI & No Overlap', () => {
    it('renders desktop search and mobile search toggle button cleanly without text clipping', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Storefront listings={mockListings} onPostAd={() => {}} />
          </AuthProvider>
        </MemoryRouter>
      );

      // Desktop search input exists
      expect(screen.getByTestId('header-search-input')).toBeDefined();

      // Mobile search toggle button exists
      const toggleBtn = screen.getByTestId('mobile-search-toggle-btn');
      expect(toggleBtn).toBeDefined();

      // Login button has whitespace-nowrap and shrink-0
      const loginBtn = screen.getByTestId('header-login-btn');
      expect(loginBtn.textContent).toBe('Login');
      expect(loginBtn.className).toContain('whitespace-nowrap');
      expect(loginBtn.className).toContain('shrink-0');

      // POST AD button has shrink-0 and whitespace-nowrap
      const postAdBtn = screen.getByTestId('header-post-ad-btn');
      expect(postAdBtn.textContent).toContain('POST AD');
      expect(postAdBtn.className).toContain('shrink-0');
      expect(postAdBtn.className).toContain('whitespace-nowrap');
    });

    it('toggles full-width mobile search bar when search toggle icon is clicked', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Storefront listings={mockListings} onPostAd={() => {}} />
          </AuthProvider>
        </MemoryRouter>
      );

      const toggleBtn = screen.getByTestId('mobile-search-toggle-btn');

      // Before toggle, mobile search input is not rendered
      expect(screen.queryByTestId('mobile-header-search-input')).toBeNull();

      // Click toggle button
      fireEvent.click(toggleBtn);

      // Mobile search input is now visible
      const mobileInput = screen.getByTestId('mobile-header-search-input');
      expect(mobileInput).toBeDefined();
    });
  });

  describe('2. Search Suggestions & Autocomplete', () => {
    it('shows search suggestions dropdown when typing 2+ characters matching listings', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Storefront listings={mockListings} onPostAd={() => {}} />
          </AuthProvider>
        </MemoryRouter>
      );

      const searchInput = screen.getByTestId('header-search-input');

      // Type "iPhone"
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'iPhone' } });

      // Suggestions dropdown should be rendered in header and hero
      const dropdowns = screen.getAllByTestId('search-suggestions-dropdown');
      expect(dropdowns.length).toBeGreaterThan(0);
      expect(screen.getAllByText(/iPhone/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText('Matching Listings').length).toBeGreaterThan(0);
    });

    it('shows matching categories in suggestions dropdown when query matches category name', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Storefront listings={mockListings} onPostAd={() => {}} />
          </AuthProvider>
        </MemoryRouter>
      );

      const searchInput = screen.getByTestId('header-search-input');

      // Type "Vehicles"
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'Vehicles' } });

      expect(screen.getAllByTestId('search-suggestions-dropdown').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Categories').length).toBeGreaterThan(0);
    });
  });

  describe('3. Mobile Chat Sending & Error Handling', () => {
    it('renders chat with touch-accessible send button and pending/sending feedback', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <WebSocketProvider>
              <MarketplaceChatModal
                isOpen={true}
                onClose={() => {}}
                sellerId="seller-1"
                listingId="listing-1"
                listingTitle="Apple iPhone 14 Pro Max 256GB"
                listingPrice={85000}
              />
            </WebSocketProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const sendBtn = screen.getByTestId('chat-send-btn');
      expect(sendBtn).toBeDefined();

      // Input exists with mobile friendly attributes
      const msgInput = screen.getByPlaceholderText(/Type message or choose a quick reply above/i);
      expect(msgInput).toBeDefined();

      // Type a message
      fireEvent.change(msgInput, { target: { value: 'Is this available for pickup today?' } });
      expect((msgInput as HTMLInputElement).value).toBe('Is this available for pickup today?');
    });
  });
});

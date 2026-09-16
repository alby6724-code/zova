import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Button } from '../src/components/common/Button.js';
import { Storefront } from '../src/components/marketplace/Storefront.js';
import { AdDetailModal } from '../src/components/marketplace/AdDetailModal.js';
import { MarketplaceChatModal } from '../src/components/marketplace/MarketplaceChatModal.js';
import { RecentListingsTable } from '../src/components/admin/RecentListingsTable.js';
import { AuthProvider } from '../src/context/AuthContext.js';
import { WebSocketProvider } from '../src/context/WebSocketContext.js';
import { api } from '../src/services/api.js';
import type { Listing } from '../src/types/index.js';

describe('Button Visibility & Hierarchy Suite', () => {
  describe('Centralized Reusable Button Component', () => {
    it('renders primary variant with high-contrast coral accent, white text, and 44px min tap target', () => {
      render(<Button variant="primary">Primary Action</Button>);
      const btn = screen.getByRole('button', { name: /Primary Action/i });
      expect(btn.className).toContain('bg-brand-accent');
      expect(btn.className).toContain('text-white');
      expect(btn.className).toContain('shadow-cta');
      expect(btn.className).toContain('min-h-[44px]');
      expect(btn.className).toContain('font-bold');
    });

    it('renders secondary variant with deep blue background and white text', () => {
      render(<Button variant="secondary">Secondary Action</Button>);
      const btn = screen.getByRole('button', { name: /Secondary Action/i });
      expect(btn.className).toContain('bg-brand-primary');
      expect(btn.className).toContain('text-white');
      expect(btn.className).toContain('shadow-primary');
      expect(btn.className).toContain('min-h-[44px]');
    });

    it('renders semantic success (green) and danger (red) variants with solid fills and white text', () => {
      const { rerender } = render(<Button variant="success">Approve</Button>);
      let btn = screen.getByRole('button', { name: /Approve/i });
      expect(btn.className).toContain('bg-emerald-600');
      expect(btn.className).toContain('text-white');
      expect(btn.className).toContain('shadow-md');

      rerender(<Button variant="danger">Reject</Button>);
      btn = screen.getByRole('button', { name: /Reject/i });
      expect(btn.className).toContain('bg-rose-600');
      expect(btn.className).toContain('text-white');
      expect(btn.className).toContain('shadow-md');
    });

    it('renders loading spinner and disables button during submission', () => {
      render(<Button isLoading={true}>Saving</Button>);
      const btn = screen.getByRole('button') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
      expect(screen.getByText('Saving')).toBeDefined();
    });
  });

  describe('Marketplace Storefront Header & Bottom Nav Buttons', () => {
    it('verifies header SELL button has maximum visual weight and min-h-[44px]', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Storefront listings={[]} onPostAd={() => {}} />
          </AuthProvider>
        </MemoryRouter>
      );

      const sellBtn = screen.getByText('SELL').closest('button');
      expect(sellBtn).not.toBeNull();
      expect(sellBtn?.className).toContain('bg-brand-accent');
      expect(sellBtn?.className).toContain('text-white');
      expect(sellBtn?.className).toContain('font-black');
      expect(sellBtn?.className).toContain('min-h-[44px]');
      expect(sellBtn?.className).toContain('shadow-cta');
    });
  });

  describe('Ad Detail Modal Action Buttons', () => {
    const mockListing: Listing = {
      id: 'lst-test-1',
      title: 'iPhone 14 Pro Max 256GB',
      description: 'Excellent condition smartphone with original bill and box.',
      price: 75000,
      currency: '₹',
      category: 'Mobiles',
      subcategory: 'Smartphones',
      condition: 'Used',
      sellerId: 'usr-seller-1',
      sellerName: 'Rahul Sharma',
      sellerPhone: '+91 9000000001',
      sellerEmail: 'rahul@demo.zioee.com',
      location: 'Delhi NCR',
      coordinates: { lat: 28.6139, lng: 77.209 },
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab',
      images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab'],
      status: 'Active',
      featured: true,
      tier: 'PRO',
      views: 120,
      createdAt: new Date().toISOString(),
    };

    it('verifies Make Offer, Chat, and Call buttons have high contrast and 44px min touch targets', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <AdDetailModal
              listing={mockListing}
              isOpen={true}
              onClose={() => {}}
              isFavorited={false}
              onToggleFavorite={() => {}}
              onOpenChat={() => {}}
            />
          </AuthProvider>
        </MemoryRouter>
      );

      // Make Offer (Primary CTA - Coral)
      const makeOfferBtn = screen.getByRole('button', { name: /Make Offer/i });
      expect(makeOfferBtn.className).toContain('bg-brand-accent');
      expect(makeOfferBtn.className).toContain('text-white');
      expect(makeOfferBtn.className).toContain('min-h-[44px]');
      expect(makeOfferBtn.className).toContain('shadow-cta');

      // Chat (Secondary CTA - Deep Blue Outline or Fill)
      const chatBtn = screen.getByRole('button', { name: /Chat/i });
      expect(chatBtn.className).toMatch(/(bg-brand-primary|border-brand-primary)/);
      expect(chatBtn.className).toMatch(/(text-white|text-brand-primary)/);
      expect(chatBtn.className).toContain('min-h-[44px]');

      // Show Phone Number button
      const showPhoneBtn = screen.getByRole('button', { name: /Show Phone Number/i });
      expect(showPhoneBtn.className).toContain('min-h-[44px]');
      expect(showPhoneBtn.className).toContain('border-2');
    });
  });

  describe('Chat Input & Offer Action Buttons', () => {
    it('verifies Send button and Voice/Location controls have 44x44px touch targets and high contrast', () => {
      const { container } = render(
        <AuthProvider>
          <WebSocketProvider>
            <MarketplaceChatModal
              isOpen={true}
              onClose={() => {}}
              sellerId="seller_1"
              listingId="listing_1"
              listingTitle="Sony Headphones"
              listingPrice={20000}
            />
          </WebSocketProvider>
        </AuthProvider>
      );

      // Send button
      const sendBtn = container.querySelector('#chat-send-btn');
      expect(sendBtn).not.toBeNull();
      expect(sendBtn?.className).toContain('min-w-[44px]');
      expect(sendBtn?.className).toContain('min-h-[44px]');
      expect(sendBtn?.className).toContain('bg-brand-primary');
      expect(sendBtn?.className).toContain('text-white');

      // Voice note button
      const voiceBtn = screen.getByTitle(/Record Voice Note/i);
      expect(voiceBtn.className).toContain('min-w-[44px]');
      expect(voiceBtn.className).toContain('min-h-[44px]');

      // Location button
      const locBtn = screen.getByTitle(/Share Location/i);
      expect(locBtn.className).toContain('min-w-[44px]');
      expect(locBtn.className).toContain('min-h-[44px]');
    });
  });

  describe('Admin Moderation High-Contrast Controls', () => {
    it('verifies RecentListingsTable modal uses solid high-contrast buttons for Approve, Flag, and Remove', async () => {
      vi.spyOn(api, 'getToken').mockReturnValue('mock-token');
      vi.spyOn(api, 'getCurrentUser').mockResolvedValue({
        id: 'usr-admin',
        name: 'Admin',
        username: 'marketplace',
        email: 'marketplace@zioeemarket.com',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      });

      const mockListing = {
        id: 'lst-admin-1',
        title: 'MacBook Air M2',
        price: 85000,
        seller: 'Ananya Iyer',
        location: 'Bengaluru',
        status: 'Active' as const,
        date: '2026-09-10',
        views: 45,
      };

      render(
        <AuthProvider>
          <RecentListingsTable
            listings={[mockListing]}
            onViewAll={() => {}}
            onUpdateStatus={() => {}}
          />
        </AuthProvider>
      );

      // Click "View" button to open moderation details modal
      const viewBtns = await screen.findAllByRole('button', { name: /^View$/i });
      viewBtns[0].click();

      // Approve button must be solid emerald-600 with white text (not pastel bg-emerald-50)
      const approveBtn = await screen.findByRole('button', { name: /Approve/i });
      expect(approveBtn.className).toContain('bg-emerald-600');
      expect(approveBtn.className).toContain('text-white');
      expect(approveBtn.className).toContain('min-h-[38px]');

      // Flag button must be solid amber-600 with white text (not pastel bg-amber-50)
      const flagBtn = screen.getByRole('button', { name: /Flag/i });
      expect(flagBtn.className).toContain('bg-amber-600');
      expect(flagBtn.className).toContain('text-white');

      // Remove button must be solid rose-600 with white text (not pastel bg-red-50)
      const removeBtn = screen.getByRole('button', { name: /Remove/i });
      expect(removeBtn.className).toContain('bg-rose-600');
      expect(removeBtn.className).toContain('text-white');
    });
  });
});

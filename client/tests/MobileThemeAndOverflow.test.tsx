import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Storefront } from '../src/components/marketplace/Storefront.js';
import { MarketplaceChatModal } from '../src/components/marketplace/MarketplaceChatModal.js';
import { SubscriptionModal } from '../src/components/marketplace/SubscriptionModal.js';
import { AuthProvider } from '../src/context/AuthContext.js';
import { WebSocketProvider } from '../src/context/WebSocketContext.js';

describe('Mobile Scroll Lock & Brand Theme Token Tests', () => {
  it('verifies Storefront applies horizontal scroll containment and brand tokens', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <Storefront listings={[]} onPostAd={() => {}} />
        </AuthProvider>
      </MemoryRouter>
    );

    // 1. Root container must have overflow-x-hidden, max-w-full, and brand background
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('overflow-x-hidden');
    expect(root.className).toContain('max-w-full');
    expect(root.className).toContain('bg-brand-bg');

    // 2. Search container has min-w-0 to prevent 360px flex blowouts
    const searchInput = screen.getByPlaceholderText(/Find Cars, Mobiles, Laptops/i);
    const searchWrapper = searchInput.closest('.flex-1');
    expect(searchWrapper?.className).toContain('min-w-0');

    // 3. Category chips container must use horizontal-scroll-container
    const categoryChipsRow = container.querySelector('.horizontal-scroll-container');
    expect(categoryChipsRow).not.toBeNull();
    expect(categoryChipsRow?.closest('section')?.className).toContain('overflow-hidden');

    // 4. + SELL button uses brand accent (Coral #FF5A5F) with shadow-cta
    const sellButton = screen.getByText('SELL').closest('button');
    expect(sellButton?.className).toContain('bg-brand-accent');
    expect(sellButton?.className).toContain('shadow-cta');
  });

  it('verifies MarketplaceChatModal prevents viewport overflow and uses brand theme', () => {
    const { container } = render(
      <AuthProvider>
        <WebSocketProvider>
          <MarketplaceChatModal
            isOpen={true}
            onClose={() => {}}
            sellerId="seller_999"
            listingId="listing_999"
            listingTitle="MacBook Pro M2"
            listingPrice={120000}
          />
        </WebSocketProvider>
      </AuthProvider>
    );

    // Modal dialog must be w-full max-w-full, not w-screen (which causes scrollbar overflow)
    const modalDialog = container.querySelector('.bg-white.w-full.max-w-full');
    expect(modalDialog).not.toBeNull();
    expect(container.querySelector('.w-screen')).toBeNull();

    // Safety banner uses brand-danger theme
    const safetyBanner = screen.getByText(/Stay Safe:/i).closest('div');
    expect(safetyBanner?.className).toContain('bg-brand-danger-light');
    expect(safetyBanner?.className).toContain('text-brand-danger');

    // Make an Offer CTA uses brand accent
    const offerButton = screen.getByTitle('Make an Offer');
    expect(offerButton.className).toContain('bg-brand-accent');
    expect(offerButton.className).toContain('shadow-cta');
  });

  it('verifies SubscriptionModal prevents horizontal overflow and uses brand palette', () => {
    const { container } = render(
      <AuthProvider>
        <SubscriptionModal isOpen={true} onClose={() => {}} onUpgrade={() => {}} />
      </AuthProvider>
    );

    // Modal container must not use w-screen
    expect(container.querySelector('.w-screen')).toBeNull();

    // Header uses brand-primary gradient
    const header = container.querySelector('.bg-gradient-to-r');
    expect(header?.className).toContain('from-brand-primary');

    // Pro tier "Most Popular" badge uses brand accent
    const popularBadge = screen.getByText('Most Popular');
    expect(popularBadge.className).toContain('bg-brand-accent');
  });
});

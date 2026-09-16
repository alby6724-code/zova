import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MarketplaceChatModal } from '../src/components/marketplace/MarketplaceChatModal.js';
import { Storefront } from '../src/components/marketplace/Storefront.js';
import { AuthProvider } from '../src/context/AuthContext.js';
import { WebSocketProvider } from '../src/context/WebSocketContext.js';

describe('Multi-Fix Feature Tests: Chat Overhaul & Homepage Redesign', () => {
  it('renders MarketplaceChatModal with safety warning banner, quick reply chips, voice and offer buttons', () => {
    render(
      <AuthProvider>
        <WebSocketProvider>
          <MarketplaceChatModal
            isOpen={true}
            onClose={() => {}}
            sellerId="seller_123"
            listingId="listing_456"
            listingTitle="Apple iPhone 14"
            listingPrice={45000}
          />
        </WebSocketProvider>
      </AuthProvider>
    );

    // Verify Persistent Safety Warning Banner
    expect(screen.getByText(/Stay Safe:/i)).toBeDefined();
    expect(screen.getByText(/Never pay in advance or share OTPs/i)).toBeDefined();

    // Verify Quick-Reply Chips
    expect(screen.getByText('Is this still available?')).toBeDefined();
    expect(screen.getByText("What's your best price?")).toBeDefined();
    expect(screen.getByText('Can we meet today?')).toBeDefined();

    // Verify Make an Offer CTA button in chat
    expect(screen.getByTitle('Make an Offer')).toBeDefined();

    // Verify Input controls (Voice, Location, Send)
    expect(screen.getByPlaceholderText(/Type message or choose a quick reply above/i)).toBeDefined();
    expect(screen.getByTitle('Record Voice Note')).toBeDefined();
    expect(screen.getByTitle('Share Location')).toBeDefined();
  });

  it('renders Storefront with OLX-style header, "+ SELL" button, category chips row, and hero banner', () => {
    const mockListings = [
      {
        id: '1',
        title: 'Honda City 2021 V MT',
        price: 850000,
        category: 'Vehicles',
        condition: 'Used',
        location: 'Delhi NCR',
        image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600',
        images: ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600'],
        sellerId: 'user1',
        sellerName: 'Rahul Verma',
        sellerPhone: '+919876543210',
        status: 'Active',
        featured: true,
        createdAt: new Date().toISOString(),
      },
    ];

    render(
      <MemoryRouter>
        <AuthProvider>
          <Storefront
            listings={mockListings as any}
            onPostAd={() => {}}
          />
        </AuthProvider>
      </MemoryRouter>
    );

    // Verify Logo & Header Elements
    expect(screen.getAllByText(/(Zioee|ZOVA)/i).length).toBeGreaterThan(0);
    expect(screen.getByText('POST AD')).toBeDefined();
    expect(screen.getByText('Wishlist')).toBeDefined();

    // Verify Horizontal Scrollable Category Chips
    expect(screen.getByText('All Categories')).toBeDefined();
    expect(screen.getAllByText('Mobiles').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vehicles').length).toBeGreaterThan(0);

    // Verify Hero Banner matching Reference Image 1
    expect(screen.getByText(/Buy & Sell Anything,/i)).toBeDefined();
    expect(screen.getByText('Anytime.')).toBeDefined();

    // Verify 4 Trust Badges
    expect(screen.getByText('100% Verified')).toBeDefined();
    expect(screen.getByText('Free To Post')).toBeDefined();
    expect(screen.getByText('Live Chat & Offer')).toBeDefined();
    expect(screen.getAllByText('Admin Moderated').length).toBeGreaterThan(0);

    // Verify App Download Promo Banner is completely removed
    expect(screen.queryByText('TRY THE ZIOEEMARKET APP')).toBeNull();
    expect(screen.queryByText('Google Play Store')).toBeNull();
    expect(screen.queryByText('Apple App Store')).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Storefront } from '../src/components/marketplace/Storefront.js';
import { ChatInboxModal } from '../src/components/marketplace/ChatInboxModal.js';
import { AuthProvider } from '../src/context/AuthContext.js';
import { WebSocketProvider } from '../src/context/WebSocketContext.js';
import { api } from '../src/services/api.js';
import type { ChatThread, Listing } from '../src/types/index.js';

const mockListings: Listing[] = [
  {
    id: 'lst-1',
    title: 'iPhone 14 Pro Max 256GB',
    description: 'Mint condition smartphone',
    price: 75000,
    currency: '₹',
    category: 'Mobiles',
    condition: 'Used',
    sellerId: 'usr-seller-1',
    sellerName: 'Rahul Sharma',
    sellerPhone: '+91 90000 00001',
    location: 'Delhi NCR',
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab',
    images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab'],
    status: 'Active',
    views: 50,
    createdAt: new Date().toISOString(),
  },
];

const mockChatThreads: ChatThread[] = [
  {
    id: 'chat-buying-1',
    listingId: 'lst-1',
    listingTitle: 'iPhone 14 Pro Max 256GB',
    listingImage: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab',
    listingPrice: 75000,
    sellerId: 'usr-seller-1',
    sellerName: 'Rahul Sharma',
    sellerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
    buyerId: 'usr-1',
    buyerName: 'Priya Sharma',
    buyerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
    user: {
      id: 'usr-1',
      name: 'Priya Sharma',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
      email: 'priya@example.com',
    },
    lastMessage: 'Is this available for pickup today?',
    timeAgo: '10m ago',
    unread: true,
    messages: [
      {
        id: 'm1',
        senderId: 'usr-1',
        senderName: 'Priya Sharma',
        text: 'Is this available for pickup today?',
        timestamp: '10:00 AM',
      },
    ],
  },
  {
    id: 'chat-selling-1',
    listingId: 'lst-2',
    listingTitle: 'Sony PlayStation 5 Console',
    listingImage: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db',
    listingPrice: 42000,
    sellerId: 'usr-1',
    sellerName: 'Priya Sharma',
    sellerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
    buyerId: 'usr-buyer-2',
    buyerName: 'Vikram Singh',
    buyerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    user: {
      id: 'usr-buyer-2',
      name: 'Vikram Singh',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      email: 'vikram@example.com',
    },
    lastMessage: '🏷️ Offer: ₹39,000 for Sony PlayStation 5 Console',
    timeAgo: '1h ago',
    unread: false,
    messages: [
      {
        id: 'm2',
        senderId: 'usr-buyer-2',
        senderName: 'Vikram Singh',
        text: '🏷️ Offer: ₹39,000 for Sony PlayStation 5 Console',
        type: 'offer',
        offerData: {
          amount: 39000,
          originalPrice: 42000,
          status: 'PENDING',
        },
        timestamp: '09:30 AM',
      },
    ],
  },
];

describe('Chat Inbox & App Promo Banner Removal Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Part 1: Permanent Removal of "Try the Zioeemarket App" Promo Banner', () => {
    it('confirms the App Download Promo Banner and Store buttons are 100% removed from the Storefront', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Storefront listings={mockListings} onPostAd={() => {}} />
          </AuthProvider>
        </MemoryRouter>
      );

      // Verify the banner text is completely absent from DOM
      expect(screen.queryByText(/TRY THE ZIOEEMARKET APP/i)).toBeNull();
      expect(screen.queryByText(/Google Play Store/i)).toBeNull();
      expect(screen.queryByText(/Apple App Store/i)).toBeNull();
      expect(screen.queryByText(/Buy, sell and find anything using the app on your mobile/i)).toBeNull();
    });
  });

  describe('Part 2: Chat Tab Opens Conversation List (Not a Random Chat)', () => {
    it('verifies clicking Mobile Nav Chat opens the Chat Inbox modal rather than jumping straight into a chat', async () => {
      vi.spyOn(api, 'getChats').mockResolvedValue(mockChatThreads);

      render(
        <MemoryRouter>
          <AuthProvider>
            <WebSocketProvider>
              <Storefront listings={mockListings} onPostAd={() => {}} />
            </WebSocketProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      // 1. Initially no individual chat modal is open
      expect(screen.queryByTestId('chat-header-make-offer-btn')).toBeNull();

      // 2. Click the mobile nav chat button
      const mobileChatBtn = screen.getByTestId('mobile-nav-chat-btn');
      fireEvent.click(mobileChatBtn);

      // 3. It must open the "Messages & Offers" inbox modal header
      await waitFor(() => {
        expect(screen.getByText('Messages & Offers')).toBeDefined();
      });

      // 4. Buying and Selling tabs are present
      expect(screen.getByTestId('inbox-tab-buying')).toBeDefined();
      expect(screen.getByTestId('inbox-tab-selling')).toBeDefined();

      // 5. Still NOT inside an individual conversation window
      expect(screen.queryByTestId('chat-header-make-offer-btn')).toBeNull();
    });

    it('verifies clicking Desktop Header Chat button opens the Chat Inbox', async () => {
      vi.spyOn(api, 'getChats').mockResolvedValue(mockChatThreads);

      render(
        <MemoryRouter>
          <AuthProvider>
            <WebSocketProvider>
              <Storefront listings={mockListings} onPostAd={() => {}} />
            </WebSocketProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      const desktopChatBtn = screen.getByTestId('header-chat-btn');
      fireEvent.click(desktopChatBtn);

      await waitFor(() => {
        expect(screen.getByText('Messages & Offers')).toBeDefined();
      });
    });
  });

  describe('Part 3: ChatInboxModal Tabs, Conversation Selection & Empty State', () => {
    it('renders Buying tab with seller name and Selling tab with buyer name', async () => {
      vi.spyOn(api, 'getChats').mockResolvedValue(mockChatThreads);

      render(
        <AuthProvider>
          <ChatInboxModal
            isOpen={true}
            onClose={() => {}}
            onSelectThread={() => {}}
          />
        </AuthProvider>
      );

      // Wait for threads to load
      await waitFor(() => {
        // In Buying tab, seller "Rahul Sharma" should be displayed
        expect(screen.getByText('Rahul Sharma')).toBeDefined();
        expect(screen.getByText(/Is this available for pickup today/i)).toBeDefined();
      });

      // Switch to Selling tab
      const sellingTab = screen.getByTestId('inbox-tab-selling');
      fireEvent.click(sellingTab);

      // In Selling tab, buyer "Vikram Singh" and the offer pill should be displayed
      await waitFor(() => {
        expect(screen.getByText('Vikram Singh')).toBeDefined();
        expect(screen.getAllByText(/Offer: ₹39,000/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('triggers onSelectThread when a conversation item is clicked', async () => {
      vi.spyOn(api, 'getChats').mockResolvedValue(mockChatThreads);
      const onSelectSpy = vi.fn();
      const onCloseSpy = vi.fn();

      render(
        <AuthProvider>
          <ChatInboxModal
            isOpen={true}
            onClose={onCloseSpy}
            onSelectThread={onSelectSpy}
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Rahul Sharma')).toBeDefined();
      });

      const threadRow = screen.getByTestId('inbox-thread-row-chat-buying-1');
      fireEvent.click(threadRow);

      expect(onCloseSpy).toHaveBeenCalledTimes(1);
      expect(onSelectSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'chat-buying-1' })
      );
    });

    it('displays the exact required empty state when there are no conversations', async () => {
      vi.spyOn(api, 'getChats').mockResolvedValue([]);

      render(
        <AuthProvider>
          <ChatInboxModal
            isOpen={true}
            onClose={() => {}}
            onSelectThread={() => {}}
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            'No conversations yet — start by messaging a seller or checking offers on your ads'
          )
        ).toBeDefined();
      });

      expect(screen.getByText('Browse Ads')).toBeDefined();
      expect(screen.getByText('Post Your Ad')).toBeDefined();
    });
  });
});
